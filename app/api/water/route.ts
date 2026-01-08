import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTodayWater, getWaterEntry, getWaterEntries, addWater, resetTodayWater, setWaterAmount } from '@/lib/water';
import { ApiResponse, WaterEntry } from '@/lib/types';

// GET /api/water - Get water entry (today or specific date)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const all = searchParams.get('all');

    let data: WaterEntry | WaterEntry[] | null;

    if (all === 'true') {
      // Return all water entries
      data = await getWaterEntries(session.username);
    } else if (date) {
      // Return specific date
      data = await getWaterEntry(session.username, date);
    } else {
      // Return today's water
      data = await getTodayWater(session.username);
    }

    const response: ApiResponse<typeof data> = {
      success: true,
      data
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch water data'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/water - Add water to today's total
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
    const { amount } = body;

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const entry = await addWater(session.username, amount);

    const response: ApiResponse<WaterEntry> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add water'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/water - Reset today's water to 0
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const entry = await resetTodayWater(session.username);

    const response: ApiResponse<WaterEntry> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset water'
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// PATCH /api/water - Set water amount for a specific date
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { date, amount } = body;

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

    const entry = await setWaterAmount(session.username, date, amount);

    const response: ApiResponse<WaterEntry> = {
      success: true,
      data: entry
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update water'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
