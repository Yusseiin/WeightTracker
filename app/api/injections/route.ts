import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { getTodayInjections, getInjectionEntriesForDate, getInjectionEntries, createInjectionEntry, updateInjectionById, deleteInjectionById, getLastInjection } from '@/lib/injections';
import { ApiResponse, InjectionEntry } from '@/lib/types';

// GET /api/injections - Get injection entries (today, specific date, all, or last)
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
    const last = searchParams.get('last');

    if (last === 'true') {
      // Return the most recent injection entry
      const data = await getLastInjection(user.username);
      const response: ApiResponse<InjectionEntry | null> = {
        success: true,
        data
      };
      return NextResponse.json(response);
    }

    let data: InjectionEntry[];

    if (all === 'true') {
      // Return all injection entries
      data = await getInjectionEntries(user.username);
    } else if (date) {
      // Return entries for specific date
      data = await getInjectionEntriesForDate(user.username, date);
    } else {
      // Return today's injections
      data = await getTodayInjections(user.username);
    }

    const response: ApiResponse<typeof data> = {
      success: true,
      data
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch injection data';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// POST /api/injections - Create new injection entry
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
    const { medicationId, dose, siteId, date, timestamp, notes } = body;

    // Validate medicationId
    if (!medicationId || typeof medicationId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'medicationId is required' },
        { status: 400 }
      );
    }

    // Validate dose
    if (typeof dose !== 'number' || dose <= 0) {
      return NextResponse.json(
        { success: false, error: 'dose must be a positive number' },
        { status: 400 }
      );
    }

    // Validate siteId
    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'siteId is required' },
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

    // Validate notes (optional)
    if (notes !== undefined && typeof notes !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Notes must be a string' },
        { status: 400 }
      );
    }

    const entry = await createInjectionEntry(user.username, medicationId, dose, siteId, date, timestamp, notes);

    const response: ApiResponse<InjectionEntry> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create injection entry';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// PATCH /api/injections - Update injection entry by ID
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
    const { id, dose, siteId, timestamp, date, notes } = body;

    // Validate id
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    // Validate dose (optional)
    if (dose !== undefined && (typeof dose !== 'number' || dose <= 0)) {
      return NextResponse.json(
        { success: false, error: 'dose must be a positive number' },
        { status: 400 }
      );
    }

    // Validate siteId (optional)
    if (siteId !== undefined && typeof siteId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'siteId must be a string' },
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

    // Validate notes (optional)
    if (notes !== undefined && typeof notes !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Notes must be a string' },
        { status: 400 }
      );
    }

    const entry = await updateInjectionById(user.username, id, { dose, siteId, timestamp, date, notes });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<InjectionEntry> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update injection';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// DELETE /api/injections - Delete injection entry by ID
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

    const deleted = await deleteInjectionById(user.username, id);

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
    const message = error instanceof Error ? error.message : 'Failed to delete injection entry';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}
