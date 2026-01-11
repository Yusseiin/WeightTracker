import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { getTodayWater, getWaterEntry, getWaterEntries, addWater, resetTodayWater, setWaterAmount } from '@/lib/water';
import { ApiResponse, WaterEntry } from '@/lib/types';

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

    let data: WaterEntry | WaterEntry[] | null;

    if (all === 'true') {
      // Return all water entries
      data = await getWaterEntries(user.username);
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
    const { amount } = body;

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const entry = await addWater(user.username, amount);

    const response: ApiResponse<WaterEntry> = {
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

// DELETE /api/water - Reset today's water to 0
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

    const entry = await resetTodayWater(user.username);

    const response: ApiResponse<WaterEntry> = {
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

// PATCH /api/water - Set water amount for a specific date
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

    const entry = await setWaterAmount(user.username, date, amount);

    const response: ApiResponse<WaterEntry> = {
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
