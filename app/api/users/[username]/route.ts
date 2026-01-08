import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateUser, deleteUser, getUserByUsername } from '@/lib/auth';
import { ApiResponse, User, UserRole } from '@/lib/types';

interface RouteParams {
  params: Promise<{ username: string }>;
}

// GET /api/users/[username] - Get a specific user (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { username } = await params;
    const user = await getUserByUsername(username);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<typeof user> = {
      success: true,
      data: user
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// PATCH /api/users/[username] - Update a user (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { username } = await params;
    const body = await request.json();
    const { nickname, role } = body as { nickname?: string; role?: UserRole };

    // Prevent admin from changing their own role
    if (session.username === username && role && role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    // Validate role if provided
    if (role && !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be "admin" or "user"' },
        { status: 400 }
      );
    }

    const updatedUser = await updateUser(username, { nickname, role });

    // Return user without password
    const { password: _, ...userWithoutPassword } = updatedUser;

    const response: ApiResponse<Omit<User, 'password'>> = {
      success: true,
      data: userWithoutPassword
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user'
    };
    return NextResponse.json(response, { status: 400 });
  }
}

// DELETE /api/users/[username] - Delete a user (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { username } = await params;

    // Prevent admin from deleting themselves
    if (session.username === username) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    await deleteUser(username);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'User deleted successfully' }
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user'
    };
    return NextResponse.json(response, { status: 400 });
  }
}
