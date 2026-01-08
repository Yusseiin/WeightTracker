import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateUser, createSessionValue } from '@/lib/auth';
import { SESSION_COOKIE_NAME, ApiResponse, SessionUser } from '@/lib/types';

// POST /api/auth/login - Authenticate user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const user = await validateUser(username, password);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create session user (without password, with role)
    const sessionUser: SessionUser = {
      username: user.username,
      nickname: user.nickname,
      role: user.role
    };

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, createSessionValue(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    const response: ApiResponse<SessionUser> = {
      success: true,
      data: sessionUser
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
