import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser, getUserByUsername, getProvidedApiKey } from './auth';
import { verifyToken, hasAccess, TOKEN_PREFIX, type TokenResource, type TokenAccess } from './api-tokens';
import type { SessionUser } from './types';

export type AuthResult =
  | { user: SessionUser; error?: undefined }
  | { user?: undefined; error: NextResponse };

const deny = (status: 401 | 403, error: string): AuthResult => ({
  error: NextResponse.json({ success: false, error }, { status }),
});

// GET/HEAD only read; every other method writes.
export function accessFor(method: string): TokenAccess {
  return method === 'GET' || method === 'HEAD' ? 'read' : 'write';
}

// Authenticate a request for one data set. Accepts, in order:
//  1. a logged-in session - full access to the user's own data
//  2. a scoped API token  - bound to its user, limited to its granted scopes
//  3. the legacy API_KEY  - unscoped, honours X-API-User (unchanged behaviour)
export async function authorize(
  request: NextRequest,
  resource: TokenResource,
  access: TokenAccess
): Promise<AuthResult> {
  const session = await getSession();
  if (session) return { user: session };

  const key = getProvidedApiKey(request);
  if (!key) return deny(401, 'Not authenticated');

  const token = key.startsWith(TOKEN_PREFIX) ? await verifyToken(key) : null;
  if (token) {
    // A scoped token only ever acts as its own user.
    const requestedUser = request.headers.get('x-api-user');
    if (requestedUser && requestedUser !== token.username) {
      return deny(403, `This API token can only access user '${token.username}'`);
    }
    if (!hasAccess(token.scopes, resource, access)) {
      return deny(403, `This API token does not have ${access} access to ${resource}`);
    }
    const user = await getUserByUsername(token.username);
    if (!user) return deny(401, 'The user this API token belongs to no longer exists');
    return { user };
  }

  const legacyUser = await getApiKeyUser(request);
  if (legacyUser) return { user: legacyUser };

  return deny(401, key.startsWith(TOKEN_PREFIX) ? 'Invalid or disabled API token' : 'Not authenticated');
}
