import { promises as fs } from 'fs';
import path from 'path';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { SessionUser, UserRole } from './types';

// Signed session cookies. The cookie used to be plain JSON, so anyone could
// write {"role":"admin"} into it and be trusted. Now it is
//   v1.<base64url(JSON payload)>.<base64url(HMAC-SHA256 of the first two parts)>
// and the payload carries its own expiry. No next/headers import, so the proxy
// can verify cookies too.

const CONFIG_PATH = process.env.CONFIG_PATH || '/config';
const SECRET_FILE = path.join(CONFIG_PATH, '.session-secret');
const VERSION = 'v1';

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface SessionPayload {
  username: string;
  nickname: string;
  role: UserRole;
  exp: number; // unix seconds
}

let secretPromise: Promise<Buffer> | null = null;

// SESSION_SECRET if set; otherwise a random secret generated once and kept in
// the config volume so sessions survive restarts. 'wx' makes the first writer
// win if two requests race on a fresh install.
function getSecret(): Promise<Buffer> {
  if (!secretPromise) {
    secretPromise = (async () => {
      const fromEnv = process.env.SESSION_SECRET?.trim();
      if (fromEnv) return Buffer.from(fromEnv, 'utf-8');
      try {
        await fs.writeFile(SECRET_FILE, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
      const stored = (await fs.readFile(SECRET_FILE, 'utf-8')).trim();
      if (stored.length < 32) throw new Error(`Session secret in ${SECRET_FILE} is too short`);
      return Buffer.from(stored, 'utf-8');
    })().catch((error) => {
      secretPromise = null; // retry on the next request rather than caching a failure
      throw error;
    });
  }
  return secretPromise;
}

const b64 = (data: Buffer | string) => Buffer.from(data).toString('base64url');

async function sign(data: string): Promise<Buffer> {
  return createHmac('sha256', await getSecret()).update(data).digest();
}

export async function signSession(user: SessionUser): Promise<string> {
  const payload: SessionPayload = {
    username: user.username,
    nickname: user.nickname,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = `${VERSION}.${b64(JSON.stringify(payload))}`;
  return `${body}.${b64(await sign(body))}`;
}

// Returns the signed user, or null for anything forged, tampered, malformed,
// expired, or in the old unsigned format.
export async function verifySession(value: string): Promise<SessionUser | null> {
  const parts = value.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) return null;

  const body = `${parts[0]}.${parts[1]}`;
  let expected: Buffer;
  try {
    expected = await sign(body);
  } catch {
    return null;
  }
  const given = Buffer.from(parts[2], 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now() / 1000) return null;
    if (typeof payload.username !== 'string' || !payload.username) return null;
    return { username: payload.username, nickname: payload.nickname, role: payload.role };
  } catch {
    return null;
  }
}
