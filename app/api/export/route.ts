import { NextRequest, NextResponse } from 'next/server';
import { getSession, getApiKeyUser } from '@/lib/auth';
import { getEntries, getSettings } from '@/lib/data';
import { getWaterInserts } from '@/lib/water';
import { getStepsEntries } from '@/lib/steps';
import { getPressureEntries } from '@/lib/pressure';
import { getMedicationEntries } from '@/lib/medication';
import { getInjectionEntries } from '@/lib/injections';
import { getBodyMeasurements } from '@/lib/body-measurements';
import {
  isExportType,
  toCsv,
  withinRange,
  entryDate,
  buildWeightCsv,
  buildWaterCsv,
  buildStepsCsv,
  buildPressureCsv,
  buildMedicationsCsv,
  buildInjectionsCsv,
  buildBodyMeasurementsCsv,
  type ExportType,
  type CsvDocument,
  type DatedEntry,
} from '@/lib/csv-export';
import type { UserSettings } from '@/lib/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Load the requested data set, filter it to the date range, and turn it into CSV.
async function buildCsv(
  type: ExportType,
  userId: string,
  settings: UserSettings,
  from?: string,
  to?: string
): Promise<CsvDocument> {
  const inRange = <T extends DatedEntry>(rows: T[]): T[] =>
    rows.filter((r) => withinRange(entryDate(type, r), from, to));

  switch (type) {
    case 'weight':
      return buildWeightCsv(inRange(await getEntries(userId)), settings);
    case 'water':
      return buildWaterCsv(inRange(await getWaterInserts(userId)), settings);
    case 'steps':
      return buildStepsCsv(inRange(await getStepsEntries(userId)));
    case 'pressure':
      return buildPressureCsv(inRange(await getPressureEntries(userId)));
    case 'medications':
      return buildMedicationsCsv(inRange(await getMedicationEntries(userId)), settings);
    case 'injections':
      return buildInjectionsCsv(inRange(await getInjectionEntries(userId)), settings);
    case 'body-measurements':
      return buildBodyMeasurementsCsv(inRange(await getBodyMeasurements(userId)), settings);
  }
}

// GET /api/export?type=<type>&from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns a single CSV file. from/to are optional and inclusive.
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const user = session || (await getApiKeyUser(request));
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    if (!isExportType(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing export type' },
        { status: 400 }
      );
    }
    for (const [name, value] of [['from', from], ['to', to]] as const) {
      if (value !== undefined && !DATE_RE.test(value)) {
        return NextResponse.json(
          { success: false, error: `${name} must be in YYYY-MM-DD format` },
          { status: 400 }
        );
      }
    }
    if (from && to && from > to) {
      return NextResponse.json(
        { success: false, error: '"from" must not be after "to"' },
        { status: 400 }
      );
    }

    const settings = await getSettings(user.username);
    const { headers, rows } = await buildCsv(type, user.username, settings, from, to);

    const range = from || to ? `_${from || 'start'}_${to || 'end'}` : '';
    const filename = `weighttracker_${type}${range}.csv`;

    return new NextResponse(toCsv(headers, rows), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
