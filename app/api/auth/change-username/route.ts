import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, renameUser, createSessionValue } from '@/lib/auth';
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
    const { username } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    // Rename the current user (migrates all of their data). renameUser returns
    // the full updated user record (including the hashed password).
    const updatedUser = await renameUser(session.username, username.trim());

    // Re-issue the session cookie so the new username is used for every
    // subsequent request (otherwise the session would point at data that has moved).
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, createSessionValue(updatedUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    return NextResponse.json({
      success: true,
      data: { username: updatedUser.username }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to change username' },
      { status: 500 }
    );
  }
}
