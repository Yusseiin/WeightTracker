import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { getTodayWater, getWaterEntry, getWaterDailyTotals, getWaterInserts, addWater, addWaterEntry, updateWaterEntry, deleteWaterEntry, resetTodayWater, setWaterAmount } from '@/lib/water';
import { ApiResponse, WaterDayTotal, WaterEntry, WaterUnit } from '@/lib/types';
import { ozToMl, mlToOz } from '@/lib/water-utils';

// Water amounts are always STORED in millilitres. Callers can opt into ounces by
// passing a `unit` of "oz" (in the JSON body for writes, as ?unit=oz for reads).
// Omitting it keeps the original ml-only behaviour, so existing clients are unaffected.
const INVALID_UNIT = 'Unit must be "ml" or "oz"';

// Resolve the requested unit; returns null when the caller sent something invalid.
function resolveUnit(unit: unknown): WaterUnit | null {
  if (unit === undefined || unit === null || unit === '') return 'ml';
  if (unit === 'ml' || unit === 'oz') return unit;
  return null;
}

// Convert an incoming amount into the millilitres we store.
function toMl(amount: number, unit: WaterUnit): number {
  return unit === 'oz' ? ozToMl(amount) : amount;
}

// Convert a stored millilitre amount into the unit the caller asked for.
// Ounces are rounded to 2 decimals, matching how the app displays them.
function fromMl(amountMl: number, unit: WaterUnit): number {
  return unit === 'oz' ? Math.round(mlToOz(amountMl) * 100) / 100 : amountMl;
}

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

    const unit = resolveUnit(searchParams.get('unit') ?? undefined);
    if (!unit) {
      return NextResponse.json(
        { success: false, error: INVALID_UNIT },
        { status: 400 }
      );
    }

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

    // Convert stored millilitres into the requested unit (no-op for ml)
    const payload = (unit === 'oz' && data)
      ? (Array.isArray(data)
          ? (data as Array<WaterDayTotal | WaterEntry>).map(e => ({ ...e, amount: fromMl(e.amount, unit) }))
          : { ...data, amount: fromMl(data.amount, unit) })
      : data;

    const response: ApiResponse<typeof payload> = {
      success: true,
      data: payload
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
    const { amount, date, timestamp, unit } = body;

    const resolvedUnit = resolveUnit(unit);
    if (!resolvedUnit) {
      return NextResponse.json(
        { success: false, error: INVALID_UNIT },
        { status: 400 }
      );
    }

    // Validate amount (in the caller's unit, before conversion)
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const amountMl = toMl(amount, resolvedUnit);

    // If a date/timestamp is supplied (history mode), create a timestamped
    // insert; otherwise fall back to the simple "add to today" behavior.
    const entry = (date || timestamp)
      ? await addWaterEntry(user.username, amountMl, date, timestamp)
      : await addWater(user.username, amountMl);

    const response: ApiResponse<WaterDayTotal> = {
      success: true,
      data: { ...entry, amount: fromMl(entry.amount, resolvedUnit) }
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
    const { id, date, amount, timestamp, unit } = body;

    const resolvedUnit = resolveUnit(unit);
    if (!resolvedUnit) {
      return NextResponse.json(
        { success: false, error: INVALID_UNIT },
        { status: 400 }
      );
    }

    // History mode: update a single insert by id
    if (id && typeof id === 'string') {
      if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
        return NextResponse.json(
          { success: false, error: 'Amount must be a positive number' },
          { status: 400 }
        );
      }
      if (date !== undefined && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
        return NextResponse.json(
          { success: false, error: 'Date must be in YYYY-MM-DD format' },
          { status: 400 }
        );
      }
      const updated = await updateWaterEntry(user.username, id, {
        amount: amount !== undefined ? toMl(amount, resolvedUnit) : undefined,
        date,
        timestamp
      });
      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'Water entry not found' },
          { status: 404 }
        );
      }
      const response: ApiResponse<WaterEntry> = {
        success: true,
        data: { ...updated, amount: fromMl(updated.amount, resolvedUnit) }
      };
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

    const entry = await setWaterAmount(user.username, date, toMl(amount, resolvedUnit));

    const response: ApiResponse<WaterDayTotal> = {
      success: true,
      data: { ...entry, amount: fromMl(entry.amount, resolvedUnit) }
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
