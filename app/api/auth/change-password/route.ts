import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateUserPassword } from '@/lib/auth';
import { ApiResponse, ChangePasswordRequest } from '@/lib/types';

// POST /api/auth/change-password - Change user password
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body: ChangePasswordRequest = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Update password
    await updateUserPassword(session.username, currentPassword, newPassword);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Password changed successfully' }
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change password'
    };
    return NextResponse.json(response, { status: 400 });
  }
}
