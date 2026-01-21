import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { getTodayPressure, getPressureEntriesForDate, getPressureEntries, createPressureEntry, updatePressureById, deletePressureById } from '@/lib/pressure';
import { ApiResponse, PressureEntry } from '@/lib/types';

// GET /api/pressure - Get pressure entry (today or specific date)
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

    let data: PressureEntry[];

    if (all === 'true') {
      // Return all pressure entries
      data = await getPressureEntries(user.username);
    } else if (date) {
      // Return entries for specific date (can be multiple)
      data = await getPressureEntriesForDate(user.username, date);
    } else {
      // Return today's pressure (can be multiple)
      data = await getTodayPressure(user.username);
    }

    const response: ApiResponse<typeof data> = {
      success: true,
      data
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch pressure data';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// POST /api/pressure - Create new pressure entry (always creates new)
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
    const { systolic, diastolic, date, timestamp } = body;

    // Validate systolic
    if (typeof systolic !== 'number' || systolic < 50 || systolic > 300) {
      return NextResponse.json(
        { success: false, error: 'Systolic must be a number between 50 and 300' },
        { status: 400 }
      );
    }

    // Validate diastolic
    if (typeof diastolic !== 'number' || diastolic < 30 || diastolic > 200) {
      return NextResponse.json(
        { success: false, error: 'Diastolic must be a number between 30 and 200' },
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

    const entry = await createPressureEntry(user.username, systolic, diastolic, date, timestamp);

    const response: ApiResponse<PressureEntry> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create pressure entry';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// PATCH /api/pressure - Update pressure entry by ID
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
    const { id, systolic, diastolic, timestamp } = body;

    // Validate id
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    // Validate systolic
    if (typeof systolic !== 'number' || systolic < 50 || systolic > 300) {
      return NextResponse.json(
        { success: false, error: 'Systolic must be a number between 50 and 300' },
        { status: 400 }
      );
    }

    // Validate diastolic
    if (typeof diastolic !== 'number' || diastolic < 30 || diastolic > 200) {
      return NextResponse.json(
        { success: false, error: 'Diastolic must be a number between 30 and 200' },
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

    const entry = await updatePressureById(user.username, id, systolic, diastolic, timestamp);

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<PressureEntry> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update pressure';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// DELETE /api/pressure - Delete pressure entry by ID
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

    const deleted = await deletePressureById(user.username, id);

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
    const message = error instanceof Error ? error.message : 'Failed to delete pressure entry';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}
