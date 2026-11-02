import { NextResponse } from 'next/server';
import { getSession, getUserByUsername } from './auth';
import { parseScopes, MAX_TOKEN_NAME, type TokenScopes } from './api-tokens';
import type { SessionUser } from './types';

// Token management is for logged-in admins only. It deliberately ignores API
// keys and tokens, so a token can never be used to mint or widen tokens.
export async function requireAdmin(): Promise<{ admin: SessionUser } | { error: NextResponse }> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 }) };
  }
  if (session.role !== 'admin') {
    return { error: NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 }) };
  }
  return { admin: session };
}

export const badRequest = (error: string) =>
  NextResponse.json({ success: false, error }, { status: 400 });

export function validateName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  return name.length >= 1 && name.length <= MAX_TOKEN_NAME ? name : null;
}

// Scopes must be well-formed and grant at least one data set.
export function validateScopes(raw: unknown): TokenScopes | null {
  const scopes = parseScopes(raw);
  return scopes && Object.keys(scopes).length > 0 ? scopes : null;
}

export async function userExists(username: unknown): Promise<boolean> {
  return typeof username === 'string' && (await getUserByUsername(username)) !== null;
}
