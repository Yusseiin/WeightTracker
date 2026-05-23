import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import {
  getBodyMeasurements,
  createBodyMeasurement,
  updateBodyMeasurement,
  deleteBodyMeasurement,
} from '@/lib/body-measurements';
import { ApiResponse, BodyMeasurementEntry } from '@/lib/types';

const MAX_VALUE_CM = 500; // sanity cap

function validateMeasurements(
  raw: unknown,
  allowedKeys: Set<string>
): { ok: true; value: Record<string, number> } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'measurements must be an object' };
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!allowedKeys.has(k)) {
      return { ok: false, error: `Unknown measurement preset: ${k}` };
    }
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > MAX_VALUE_CM) {
      return { ok: false, error: `Invalid value for ${k}` };
    }
    out[k] = v;
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

    const entries = await getBodyMeasurements(user.username);
    const response: ApiResponse<BodyMeasurementEntry[]> = { success: true, data: entries };
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
    const { timestamp, measurements, notes } = body as {
      timestamp?: unknown;
      measurements?: unknown;
      notes?: unknown;
    };

    if (typeof timestamp !== 'string' || !timestamp.trim()) {
      return NextResponse.json(
        { success: false, error: 'timestamp is required' },
        { status: 400 }
      );
    }

    const settings = await getSettings(user.username);
    const allowedKeys = new Set(settings.bodyMeasurementPresets.map((p) => p.id));
    const validated = validateMeasurements(measurements, allowedKeys);
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

    const response: ApiResponse<BodyMeasurementEntry> = { success: true, data: entry };
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
    const { id, timestamp, measurements, notes } = body as {
      id?: unknown;
      timestamp?: unknown;
      measurements?: unknown;
      notes?: unknown;
    };

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
      const validated = validateMeasurements(measurements, allowedKeys);
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

    const response: ApiResponse<BodyMeasurementEntry> = { success: true, data: entry };
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
