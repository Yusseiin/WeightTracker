import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { getTodayWater, getWaterEntry, getWaterDailyTotals, getWaterInserts, addWater, addWaterEntry, updateWaterEntry, deleteWaterEntry, resetTodayWater, setWaterAmount } from '@/lib/water';
import { ApiResponse, WaterDayTotal, WaterEntry } from '@/lib/types';

// GET /api/water - Get water entry (today or specific date)
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
    const entries = searchParams.get('entries');

    let data: WaterDayTotal | WaterDayTotal[] | WaterEntry[] | null;

    if (entries === 'true') {
      // Return individual water inserts (history table)
      data = await getWaterInserts(user.username);
    } else if (all === 'true') {
      // Return daily totals for all days
      data = await getWaterDailyTotals(user.username);
    } else if (date) {
      // Return specific date
      data = await getWaterEntry(user.username, date);
    } else {
      // Return today's water
      data = await getTodayWater(user.username);
    }

    const response: ApiResponse<typeof data> = {
      success: true,
      data
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch water data';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// POST /api/water - Add water to today's total
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
    const { amount, date, timestamp } = body;

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // If a date/timestamp is supplied (history mode), create a timestamped
    // insert; otherwise fall back to the simple "add to today" behavior.
    const entry = (date || timestamp)
      ? await addWaterEntry(user.username, amount, date, timestamp)
      : await addWater(user.username, amount);

    const response: ApiResponse<WaterDayTotal> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add water';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// DELETE /api/water - Delete a single insert (?id=...) or reset today's water to 0
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

    // History mode: delete a single insert by id
    if (id) {
      const deleted = await deleteWaterEntry(user.username, id);
      if (!deleted) {
        return NextResponse.json(
          { success: false, error: 'Water entry not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: { id } });
    }

    // Daily mode: reset today's total to 0
    const entry = await resetTodayWater(user.username);

    const response: ApiResponse<WaterDayTotal> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset water';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}

// PATCH /api/water - Update a single insert ({id,...}) or set a day's total ({date, amount})
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
    const { id, date, amount, timestamp } = body;

    // History mode: update a single insert by id
    if (id && typeof id === 'string') {
      if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
        return NextResponse.json(
          { success: false, error: 'Amount must be a positive number' },
          { status: 400 }
        );
      }
      const updated = await updateWaterEntry(user.username, id, { amount, date, timestamp });
      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'Water entry not found' },
          { status: 404 }
        );
      }
      const response: ApiResponse<WaterEntry> = { success: true, data: updated };
      return NextResponse.json(response);
    }

    // Daily mode: set a specific date's total

    // Validate date
    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a non-negative number' },
        { status: 400 }
      );
    }

    const entry = await setWaterAmount(user.username, date, amount);

    const response: ApiResponse<WaterDayTotal> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update water';
    const status = message.includes('not found') ? 404 : 500;
    const response: ApiResponse<null> = {
      success: false,
      error: message
    };
    return NextResponse.json(response, { status });
  }
}
