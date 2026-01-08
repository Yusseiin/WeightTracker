import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUsersWithoutPasswords, createUser } from '@/lib/auth';
import { ApiResponse, CreateUserRequest, User } from '@/lib/types';

// GET /api/users - List all users (admin only)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const users = await getUsersWithoutPasswords();

    const response: ApiResponse<Omit<User, 'password'>[]> = {
      success: true,
      data: users
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body: CreateUserRequest = await request.json();
    const { username, password, nickname, role } = body;

    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (role && !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be "admin" or "user"' },
        { status: 400 }
      );
    }

    const newUser = await createUser({
      username,
      password,
      nickname: nickname || username,
      role: role || 'user'
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;

    const response: ApiResponse<Omit<User, 'password'>> = {
      success: true,
      data: userWithoutPassword
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user'
    };
    return NextResponse.json(response, { status: 400 });
  }
}
