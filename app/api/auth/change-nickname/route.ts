import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, updateUser, createSessionValue, getUsers } from '@/lib/auth';
import { SESSION_COOKIE_NAME } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nickname } = body;

    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Nickname is required' },
        { status: 400 }
      );
    }

    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length < 1 || trimmedNickname.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Nickname must be between 1 and 50 characters' },
        { status: 400 }
      );
    }

    // Update user nickname
    const updatedUser = await updateUser(session.username, { nickname: trimmedNickname });

    // Get full user data to create new session
    const users = await getUsers();
    const fullUser = users.find(u => u.username === session.username);

    if (!fullUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update session cookie with new nickname
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, createSessionValue(fullUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    return NextResponse.json({
      success: true,
      data: { nickname: updatedUser.nickname }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to change nickname' },
      { status: 500 }
    );
  }
}
