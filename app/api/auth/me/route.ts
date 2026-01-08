import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ApiResponse, SessionUser } from '@/lib/types';

// GET /api/auth/me - Get current user from session
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const response: ApiResponse<SessionUser> = {
      success: true,
      data: session
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get session'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
