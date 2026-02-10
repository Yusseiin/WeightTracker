import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { getTodaySteps, getStepsEntriesForDate, getStepsEntries, createStepsEntry, updateStepsById, deleteStepsById } from '@/lib/steps';
import { ApiResponse, StepsEntry } from '@/lib/types';

// GET /api/steps - Get steps entry (today or specific date)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session || await getApiKeyUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const all = searchParams.get('all');

    let data: StepsEntry[];

    if (all === 'true') {
      // Return all steps entries
      data = await getStepsEntries(user.username);
    } else if (date) {
      // Return entries for specific date (can be multiple)
      data = await getStepsEntriesForDate(user.username, date);
    } else {
      // Return today's steps (can be multiple)
      data = await getTodaySteps(user.username);
    }

    const response: ApiResponse<typeof data> = {
      success: true,
      data
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch steps data';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// POST /api/steps - Create new steps entry (always creates new)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session || await getApiKeyUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { steps, date, timestamp, notes } = body;

    // Validate steps
    if (typeof steps !== 'number' || steps < 0 || steps > 99999) {
      return NextResponse.json(
        { success: false, error: 'Steps must be a number between 0 and 99999' },
        { status: 400 }
      );
    }

    // Validate date (optional)
    if (date !== undefined && typeof date !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Date must be a string' },
        { status: 400 }
      );
    }

    // Validate timestamp (optional)
    if (timestamp !== undefined && typeof timestamp !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Timestamp must be a string' },
        { status: 400 }
      );
    }

    const entry = await createStepsEntry(user.username, steps, date, timestamp, notes);

    const response: ApiResponse<StepsEntry> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create steps entry';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// PATCH /api/steps - Update steps entry by ID
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session || await getApiKeyUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, steps, timestamp, notes } = body;

    // Validate id
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    // Validate steps
    if (typeof steps !== 'number' || steps < 0 || steps > 99999) {
      return NextResponse.json(
        { success: false, error: 'Steps must be a number between 0 and 99999' },
        { status: 400 }
      );
    }

    // Validate timestamp (optional)
    if (timestamp !== undefined && typeof timestamp !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Timestamp must be a string' },
        { status: 400 }
      );
    }

    const entry = await updateStepsById(user.username, id, steps, timestamp, notes);

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<StepsEntry> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update steps';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// DELETE /api/steps - Delete steps entry by ID
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session || await getApiKeyUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate id
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteStepsById(user.username, id);

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
    const message = error instanceof Error ? error.message : 'Failed to delete steps entry';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}
