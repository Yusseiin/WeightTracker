import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { getTodayMedications, getMedicationEntriesForDate, getMedicationEntries, createMedicationEntry, updateMedicationById, deleteMedicationById } from '@/lib/medication';
import { ApiResponse, MedicationEntry } from '@/lib/types';

// GET /api/medications - Get medication entries (today or specific date)
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

    let data: MedicationEntry[];

    if (all === 'true') {
      // Return all medication entries
      data = await getMedicationEntries(user.username);
    } else if (date) {
      // Return entries for specific date
      data = await getMedicationEntriesForDate(user.username, date);
    } else {
      // Return today's medications
      data = await getTodayMedications(user.username);
    }

    const response: ApiResponse<typeof data> = {
      success: true,
      data
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch medication data';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// POST /api/medications - Create or update medication entry
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
    const { medicationId, taken, date, timestamp } = body;

    // Validate medicationId
    if (!medicationId || typeof medicationId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'medicationId is required' },
        { status: 400 }
      );
    }

    // Validate taken
    if (typeof taken !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'taken must be a boolean' },
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

    const entry = await createMedicationEntry(user.username, medicationId, taken, date, timestamp);

    const response: ApiResponse<MedicationEntry> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create medication entry';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// PATCH /api/medications - Update medication entry by ID
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
    const { id, taken, timestamp, date } = body;

    // Validate id
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    // Validate taken
    if (typeof taken !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'taken must be a boolean' },
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

    // Validate date (optional)
    if (date !== undefined && typeof date !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Date must be a string' },
        { status: 400 }
      );
    }

    const entry = await updateMedicationById(user.username, id, taken, timestamp, date);

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<MedicationEntry> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update medication';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// DELETE /api/medications - Delete medication entry by ID
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

    const deleted = await deleteMedicationById(user.username, id);

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
    const message = error instanceof Error ? error.message : 'Failed to delete medication entry';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}
