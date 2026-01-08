import { NextRequest, NextResponse } from 'next/server';
import { deleteEntry, updateEntry } from '@/lib/data';
import { getSession } from '@/lib/auth';
import { ApiResponse, WeightEntry } from '@/lib/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// DELETE /api/entries/[id] - Delete entry
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const deleted = await deleteEntry(id, session.username);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<{ deleted: boolean }> = {
      success: true,
      data: { deleted: true }
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete entry'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// PATCH /api/entries/[id] - Update entry
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const updated = await updateEntry(id, body, session.username);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<WeightEntry> = {
      success: true,
      data: updated
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update entry'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
