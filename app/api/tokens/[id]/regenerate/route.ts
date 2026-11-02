import { NextRequest, NextResponse } from 'next/server';
import { regenerateToken } from '@/lib/api-tokens';
import { requireAdmin } from '@/lib/token-admin';

// POST /api/tokens/:id/regenerate - issue a new secret; the old one stops
// working immediately. The new secret is returned once. (admin only)
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await context.params;
  const result = await regenerateToken(id);
  return result
    ? NextResponse.json({ success: true, data: result })
    : NextResponse.json({ success: false, error: 'Token not found' }, { status: 404 });
}
