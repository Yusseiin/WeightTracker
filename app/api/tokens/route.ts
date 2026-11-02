import { NextRequest, NextResponse } from 'next/server';
import { getUsersWithoutPasswords } from '@/lib/auth';
import { listTokens, createToken, MAX_TOKEN_NAME } from '@/lib/api-tokens';
import { requireAdmin, badRequest, validateName, validateScopes, userExists } from '@/lib/token-admin';

// GET /api/tokens - list scoped API tokens (admin only)
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const [tokens, users] = await Promise.all([listTokens(), getUsersWithoutPasswords()]);
  return NextResponse.json({
    success: true,
    data: {
      tokens,
      users: users.map(({ username, nickname, role }) => ({ username, nickname, role })),
      legacyKeyConfigured: !!process.env.API_KEY,
    },
  });
}

// POST /api/tokens - create a token; the secret is returned once (admin only)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const name = validateName(body.name);
    if (!name) return badRequest(`Name is required (max ${MAX_TOKEN_NAME} characters)`);
    if (!(await userExists(body.username))) return badRequest('User not found');
    const scopes = validateScopes(body.scopes);
    if (!scopes) return badRequest('Grant read or write access to at least one data set');

    const { token, secret } = await createToken({
      name,
      username: body.username,
      scopes,
      createdBy: auth.admin.username,
    });
    return NextResponse.json({ success: true, data: { token, secret } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create token';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
