import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import {
  getBodyMeasurements,
  createBodyMeasurement,
  updateBodyMeasurement,
  deleteBodyMeasurement,
} from '@/lib/body-measurements';
import { ApiResponse, BodyMeasurementEntry, MeasurementUnit, CM_PER_INCH } from '@/lib/types';

const MAX_VALUE_CM = 500; // sanity cap

// Measurements are always STORED in centimetres. Callers can opt into inches by
// passing a `unit` of "in" (in the JSON body for writes, as ?unit=in for reads).
// Omitting it keeps the original cm-only behaviour, so existing clients are unaffected.
const INVALID_UNIT = 'Unit must be "cm" or "in"';

// Resolve the requested unit; returns null when the caller sent something invalid.
function resolveUnit(unit: unknown): MeasurementUnit | null {
  if (unit === undefined || unit === null || unit === '') return 'cm';
  if (unit === 'cm' || unit === 'in') return unit;
  return null;
}

// Convert an incoming value into the centimetres we store.
function toCm(value: number, unit: MeasurementUnit): number {
  return unit === 'in' ? value * CM_PER_INCH : value;
}

// Convert a stored centimetre value into the unit the caller asked for.
// Inches are rounded to 2 decimals, matching how the app displays them.
function fromCm(cm: number, unit: MeasurementUnit): number {
  return unit === 'in' ? Math.round((cm / CM_PER_INCH) * 100) / 100 : cm;
}

// Present a stored entry in the caller's unit.
function toUnit(entry: BodyMeasurementEntry, unit: MeasurementUnit): BodyMeasurementEntry {
  if (unit === 'cm') return entry;
  const measurements: Record<string, number> = {};
  for (const [k, v] of Object.entries(entry.measurements)) {
    measurements[k] = fromCm(v, unit);
  }
  return { ...entry, measurements };
}

function validateMeasurements(
  raw: unknown,
  allowedKeys: Set<string>,
  unit: MeasurementUnit
): { ok: true; value: Record<string, number> } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'measurements must be an object' };
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!allowedKeys.has(k)) {
      return { ok: false, error: `Unknown measurement preset: ${k}` };
    }
    // Validate against the cm cap after conversion, so the limit is the same
    // whichever unit the caller used.
    const cm = typeof v === 'number' && Number.isFinite(v) ? toCm(v, unit) : NaN;
    if (!Number.isFinite(cm) || cm <= 0 || cm > MAX_VALUE_CM) {
      return { ok: false, error: `Invalid value for ${k}` };
    }
    out[k] = cm;
  }
  if (Object.keys(out).length === 0) {
    return { ok: false, error: 'At least one measurement is required' };
  }
  return { ok: true, value: out };
}

// GET /api/body-measurements — list all entries for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session || (await getApiKeyUser(request));
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const unit = resolveUnit(searchParams.get('unit') ?? undefined);
    if (!unit) {
      return NextResponse.json({ success: false, error: INVALID_UNIT }, { status: 400 });
    }

    const entries = await getBodyMeasurements(user.username);
    const response: ApiResponse<BodyMeasurementEntry[]> = {
      success: true,
      data: entries.map((e) => toUnit(e, unit)),
    };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch body measurements',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/body-measurements — create new entry
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session || (await getApiKeyUser(request));
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { timestamp, measurements, notes, unit } = body as {
      timestamp?: unknown;
      measurements?: unknown;
      notes?: unknown;
      unit?: unknown;
    };

    const resolvedUnit = resolveUnit(unit);
    if (!resolvedUnit) {
      return NextResponse.json({ success: false, error: INVALID_UNIT }, { status: 400 });
    }

    if (typeof timestamp !== 'string' || !timestamp.trim()) {
      return NextResponse.json(
        { success: false, error: 'timestamp is required' },
        { status: 400 }
      );
    }

    const settings = await getSettings(user.username);
    const allowedKeys = new Set(settings.bodyMeasurementPresets.map((p) => p.id));
    const validated = validateMeasurements(measurements, allowedKeys, resolvedUnit);
    if (!validated.ok) {
      return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
    }

    if (notes !== undefined && typeof notes !== 'string') {
      return NextResponse.json(
        { success: false, error: 'notes must be a string' },
        { status: 400 }
      );
    }

    const entry = await createBodyMeasurement(user.username, {
      timestamp,
      measurements: validated.value,
      notes: notes as string | undefined,
    });

    const response: ApiResponse<BodyMeasurementEntry> = {
      success: true,
      data: toUnit(entry, resolvedUnit),
    };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create body measurement',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// PATCH /api/body-measurements — update entry by ID (id in body)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session || (await getApiKeyUser(request));
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, timestamp, measurements, notes, unit } = body as {
      id?: unknown;
      timestamp?: unknown;
      measurements?: unknown;
      notes?: unknown;
      unit?: unknown;
    };

    const resolvedUnit = resolveUnit(unit);
    if (!resolvedUnit) {
      return NextResponse.json({ success: false, error: INVALID_UNIT }, { status: 400 });
    }

    if (typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const update: { timestamp?: string; measurements?: Record<string, number>; notes?: string } = {};

    if (timestamp !== undefined) {
      if (typeof timestamp !== 'string') {
        return NextResponse.json(
          { success: false, error: 'timestamp must be a string' },
          { status: 400 }
        );
      }
      update.timestamp = timestamp;
    }

    if (measurements !== undefined) {
      const settings = await getSettings(user.username);
      const allowedKeys = new Set(settings.bodyMeasurementPresets.map((p) => p.id));
      const validated = validateMeasurements(measurements, allowedKeys, resolvedUnit);
      if (!validated.ok) {
        return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
      }
      update.measurements = validated.value;
    }

    if (notes !== undefined) {
      if (typeof notes !== 'string') {
        return NextResponse.json(
          { success: false, error: 'notes must be a string' },
          { status: 400 }
        );
      }
      update.notes = notes;
    }

    const entry = await updateBodyMeasurement(user.username, id, update);
    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<BodyMeasurementEntry> = {
      success: true,
      data: toUnit(entry, resolvedUnit),
    };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update body measurement',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/body-measurements?id=... — delete entry by ID
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session || (await getApiKeyUser(request));
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteBodyMeasurement(user.username, id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    const response: ApiResponse<{ deleted: boolean }> = {
      success: true,
      data: { deleted: true },
    };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete body measurement',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
