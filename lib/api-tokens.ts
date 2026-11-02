import { promises as fs } from 'fs';
import path from 'path';
import { createHash, randomBytes } from 'crypto';
import { withFileLock, writeJsonAtomic } from './storage';
import type { PhotoEntryType } from './photos';
import {
  TOKEN_PREFIX,
  type TokenResource,
  type TokenScopes,
  type ApiTokenInfo,
} from './api-token-scopes';

export * from './api-token-scopes';

// Scoped API tokens (issue #22). Unlike the legacy global API_KEY, each token
// is bound to a single user and only reaches the data sets it was granted.
// Only a SHA-256 hash of the secret is stored; the secret is shown once.

const CONFIG_PATH = process.env.CONFIG_PATH || '/config';
const TOKENS_FILE = path.join(CONFIG_PATH, 'api-tokens.json');

interface StoredToken extends ApiTokenInfo {
  tokenHash: string;     // sha256 of the secret, hex
}
const LAST_USED_THROTTLE_MS = 60_000;

const toInfo = ({ tokenHash: _hash, ...info }: StoredToken): ApiTokenInfo => info;
const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

function newSecret(): { secret: string; tokenHash: string; prefix: string } {
  const secret = TOKEN_PREFIX + randomBytes(32).toString('base64url');
  return { secret, tokenHash: hashSecret(secret), prefix: secret.slice(0, 10) };
}

// Photos belong to the data set of the entry they're attached to.
const PHOTO_RESOURCE: Record<PhotoEntryType, TokenResource> = {
  weight: 'weight',
  medication: 'medications',
  injection: 'injections',
  steps: 'steps',
  pressure: 'pressure',
  'body-measurement': 'body-measurements',
};

export function photoResource(entryType: PhotoEntryType): TokenResource {
  return PHOTO_RESOURCE[entryType];
}

// ---------- storage (with an mtime-checked cache for per-request lookups) ----------

let cache: { mtimeMs: number; tokens: StoredToken[] } | null = null;

async function readTokens(): Promise<StoredToken[]> {
  let mtimeMs: number;
  try {
    mtimeMs = (await fs.stat(TOKENS_FILE)).mtimeMs;
  } catch {
    cache = { mtimeMs: 0, tokens: [] };
    return [];
  }
  if (cache && cache.mtimeMs === mtimeMs) return cache.tokens;
  try {
    const parsed = JSON.parse(await fs.readFile(TOKENS_FILE, 'utf-8'));
    const tokens: StoredToken[] = Array.isArray(parsed) ? parsed : [];
    cache = { mtimeMs, tokens };
    return tokens;
  } catch {
    return [];
  }
}

async function saveTokens(tokens: StoredToken[]): Promise<void> {
  await writeJsonAtomic(TOKENS_FILE, tokens);
  cache = null; // re-read on next lookup
}

// Run a read-modify-write on the token file under the file lock.
function mutate<T>(task: (tokens: StoredToken[]) => Promise<T> | T): Promise<T> {
  return withFileLock(TOKENS_FILE, async () => {
    const tokens = (await readTokens()).map((t) => ({ ...t, scopes: { ...t.scopes } }));
    const result = await task(tokens);
    await saveTokens(tokens);
    return result;
  });
}

// ---------- management ----------

export async function listTokens(): Promise<ApiTokenInfo[]> {
  return (await readTokens()).map(toInfo);
}

export async function createToken(input: {
  name: string;
  username: string;
  scopes: TokenScopes;
  createdBy: string;
}): Promise<{ token: ApiTokenInfo; secret: string }> {
  return mutate((tokens) => {
    const now = new Date().toISOString();
    const { secret, tokenHash, prefix } = newSecret();
    const stored: StoredToken = {
      id: `tok_${randomBytes(8).toString('hex')}`,
      name: input.name,
      username: input.username,
      scopes: input.scopes,
      tokenHash,
      prefix,
      enabled: true,
      createdAt: now,
      createdBy: input.createdBy,
      updatedAt: now,
    };
    tokens.push(stored);
    return { token: toInfo(stored), secret };
  });
}

export async function updateToken(
  id: string,
  changes: { name?: string; username?: string; scopes?: TokenScopes; enabled?: boolean }
): Promise<ApiTokenInfo | null> {
  return mutate((tokens) => {
    const token = tokens.find((t) => t.id === id);
    if (!token) return null;
    if (changes.name !== undefined) token.name = changes.name;
    if (changes.username !== undefined) token.username = changes.username;
    if (changes.scopes !== undefined) token.scopes = changes.scopes;
    if (changes.enabled !== undefined) token.enabled = changes.enabled;
    token.updatedAt = new Date().toISOString();
    return toInfo(token);
  });
}

// Issue a new secret; the old one stops working immediately.
export async function regenerateToken(id: string): Promise<{ token: ApiTokenInfo; secret: string } | null> {
  return mutate((tokens) => {
    const token = tokens.find((t) => t.id === id);
    if (!token) return null;
    const { secret, tokenHash, prefix } = newSecret();
    token.tokenHash = tokenHash;
    token.prefix = prefix;
    token.updatedAt = new Date().toISOString();
    delete token.lastUsedAt;
    return { token: toInfo(token), secret };
  });
}

export async function deleteToken(id: string): Promise<boolean> {
  return mutate((tokens) => {
    const index = tokens.findIndex((t) => t.id === id);
    if (index === -1) return false;
    tokens.splice(index, 1);
    return true;
  });
}

// ---------- user lifecycle ----------

export async function renameTokenOwner(oldUsername: string, newUsername: string): Promise<void> {
  if (!(await readTokens()).some((t) => t.username === oldUsername)) return;
  await mutate((tokens) => {
    for (const t of tokens) if (t.username === oldUsername) t.username = newUsername;
  });
}

export async function deleteTokensForUser(username: string): Promise<number> {
  if (!(await readTokens()).some((t) => t.username === username)) return 0;
  return mutate((tokens) => {
    const before = tokens.length;
    for (let i = tokens.length - 1; i >= 0; i--) if (tokens[i].username === username) tokens.splice(i, 1);
    return before - tokens.length;
  });
}

// ---------- verification ----------

// Resolve a presented secret to its token. Disabled tokens don't match.
// `touch` records last use; the proxy pre-check passes false.
export async function verifyToken(secret: string, { touch = true } = {}): Promise<ApiTokenInfo | null> {
  if (!secret.startsWith(TOKEN_PREFIX)) return null;
  const tokenHash = hashSecret(secret);
  const token = (await readTokens()).find((t) => t.tokenHash === tokenHash);
  if (!token || !token.enabled) return null;
  if (touch) void touchLastUsed(token.id, token.lastUsedAt);
  return toInfo(token);
}

// Record use, at most once a minute per token to avoid a write on every call.
async function touchLastUsed(id: string, lastUsedAt?: string): Promise<void> {
  if (lastUsedAt && Date.now() - Date.parse(lastUsedAt) < LAST_USED_THROTTLE_MS) return;
  try {
    await mutate((tokens) => {
      const token = tokens.find((t) => t.id === id);
      if (token) token.lastUsedAt = new Date().toISOString();
    });
  } catch {
    // Best effort - a failed timestamp update must never fail the request.
  }
}
