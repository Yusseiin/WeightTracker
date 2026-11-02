import { NextRequest, NextResponse } from 'next/server';
import { updateToken, deleteToken, MAX_TOKEN_NAME } from '@/lib/api-tokens';
import { requireAdmin, badRequest, validateName, validateScopes, userExists } from '@/lib/token-admin';

type Context = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ success: false, error: 'Token not found' }, { status: 404 });

// PATCH /api/tokens/:id - rename, reassign, re-scope or enable/disable (admin only)
export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const changes: Parameters<typeof updateToken>[1] = {};

    if (body.name !== undefined) {
      const name = validateName(body.name);
      if (!name) return badRequest(`Name is required (max ${MAX_TOKEN_NAME} characters)`);
      changes.name = name;
    }
    if (body.username !== undefined) {
      if (!(await userExists(body.username))) return badRequest('User not found');
      changes.username = body.username;
    }
    if (body.scopes !== undefined) {
      const scopes = validateScopes(body.scopes);
      if (!scopes) return badRequest('Grant read or write access to at least one data set');
      changes.scopes = scopes;
    }
    if (body.enabled !== undefined) {
      if (typeof body.enabled !== 'boolean') return badRequest('enabled must be true or false');
      changes.enabled = body.enabled;
    }

    const token = await updateToken(id, changes);
    return token ? NextResponse.json({ success: true, data: token }) : notFound();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update token';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/tokens/:id - revoke permanently (admin only)
export async function DELETE(_request: NextRequest, context: Context) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  return (await deleteToken(id)) ? NextResponse.json({ success: true, data: { id } }) : notFound();
}
