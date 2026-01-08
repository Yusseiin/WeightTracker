import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, ApiResponse } from '@/lib/types';

// POST /api/auth/logout - Clear session
export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    const response: ApiResponse<{ loggedOut: boolean }> = {
      success: true,
      data: { loggedOut: true }
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
