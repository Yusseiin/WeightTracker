import { format, parseISO } from 'date-fns';
import type {
  UserSettings,
  WeightEntry,
  WaterEntry,
  StepsEntry,
  PressureEntry,
  MedicationEntry,
  InjectionEntry,
  BodyMeasurementEntry,
} from './types';
import { CM_PER_INCH } from './types';
import { mlToOz } from './water-utils';

// The data sets a user can export. Each one becomes its own CSV file.
export const EXPORT_TYPES = [
  'weight',
  'water',
  'steps',
  'pressure',
  'medications',
  'injections',
  'body-measurements',
] as const;

export type ExportType = (typeof EXPORT_TYPES)[number];

export function isExportType(v: unknown): v is ExportType {
  return typeof v === 'string' && (EXPORT_TYPES as readonly string[]).includes(v);
}

// ---------- CSV primitives ----------

// Spreadsheets treat a leading =, +, @ (or control char) as a formula, so a
// crafted note could execute on open. Prefix those with a quote to neutralise
// them without changing how the text reads.
function neutralizeFormula(s: string): string {
  return /^[=+@\t\r]/.test(s) ? `'${s}` : s;
}

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (s === '') return '';
  s = neutralizeFormula(s);
  // Quote when the value contains a delimiter, quote or newline; double inner quotes.
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type Cell = string | number | boolean | null | undefined;

// Build a CSV document. Uses CRLF (the CSV standard) and a UTF-8 BOM so Excel
// renders accented characters correctly.
export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) lines.push(row.map(escapeCsv).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// ---------- date helpers ----------

// Local calendar day of an ISO timestamp (honours the server's TZ setting).
function localDate(iso: string): string {
  try {
    return format(parseISO(iso), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

function localTime(iso: string): string {
  try {
    return format(parseISO(iso), 'HH:mm');
  } catch {
    return '';
  }
}

// Inclusive YYYY-MM-DD range filter; empty bounds mean "unbounded".
export function withinRange(date: string, from?: string, to?: string): boolean {
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

const SLEEP_LABELS: Record<number, string> = { 0: 'Good', 1: 'Fair', 2: 'Poor' };

export interface CsvDocument {
  headers: string[];
  rows: Cell[][];
}

// ---------- per-type builders ----------

export function buildWeightCsv(entries: WeightEntry[], s: UserSettings): CsvDocument {
  const activities = new Map((s.activities || []).map((a) => [a.id, a.label]));
  return {
    headers: ['date', 'time', `weight_${s.unit}`, 'body_fat_percent', 'activity', 'sleep_quality', 'notes'],
    rows: entries.map((e) => [
      localDate(e.timestamp),
      localTime(e.timestamp),
      e.weight,
      e.bodyFat ?? '',
      activities.get(e.training) ?? e.training,
      SLEEP_LABELS[e.sleep] ?? e.sleep,
      e.notes ?? '',
    ]),
  };
}

export function buildWaterCsv(entries: WaterEntry[], s: UserSettings): CsvDocument {
  const unit = s.waterUnit || 'ml';
  return {
    headers: ['date', 'time', `amount_${unit}`],
    rows: entries.map((e) => [
      e.date,
      localTime(e.timestamp),
      unit === 'oz' ? Math.round(mlToOz(e.amount) * 100) / 100 : e.amount,
    ]),
  };
}

export function buildStepsCsv(entries: StepsEntry[]): CsvDocument {
  return {
    headers: ['date', 'time', 'steps', 'notes'],
    rows: entries.map((e) => [e.date, localTime(e.timestamp), e.steps, e.notes ?? '']),
  };
}

export function buildPressureCsv(entries: PressureEntry[]): CsvDocument {
  return {
    headers: ['date', 'time', 'systolic', 'diastolic', 'notes'],
    rows: entries.map((e) => [e.date, localTime(e.timestamp), e.systolic, e.diastolic, e.notes ?? '']),
  };
}

export function buildMedicationsCsv(entries: MedicationEntry[], s: UserSettings): CsvDocument {
  const presets = new Map((s.medicationPresets || []).map((m) => [m.id, m]));
  return {
    headers: ['date', 'time', 'medication', 'taken', 'dose', 'dose_unit', 'notes'],
    rows: entries.map((e) => {
      const p = presets.get(e.medicationId);
      return [
        e.date,
        localTime(e.timestamp),
        p?.label ?? e.medicationId,
        e.taken ? 'yes' : 'no',
        e.dose ?? '',
        e.dose !== undefined ? p?.unit ?? '' : '',
        e.notes ?? '',
      ];
    }),
  };
}

export function buildInjectionsCsv(entries: InjectionEntry[], s: UserSettings): CsvDocument {
  const meds = new Map((s.injectionSettings?.medications || []).map((m) => [m.id, m]));
  const sites = new Map((s.injectionSettings?.injectionSites || []).map((x) => [x.id, x.label]));
  return {
    headers: ['date', 'time', 'medication', 'dose', 'dose_unit', 'site', 'notes'],
    rows: entries.map((e) => {
      const m = meds.get(e.medicationId);
      return [
        e.date,
        localTime(e.timestamp),
        m?.name ?? e.medicationId,
        e.dose,
        m?.unit ?? '',
        sites.get(e.siteId) ?? e.siteId,
        e.notes ?? '',
      ];
    }),
  };
}

export function buildBodyMeasurementsCsv(entries: BodyMeasurementEntry[], s: UserSettings): CsvDocument {
  const unit = s.measurementUnit || 'cm';
  const presets = s.bodyMeasurementPresets || [];
  // One column per configured preset, with the unit in the header.
  const headers = ['date', 'time', ...presets.map((p) => `${p.label} (${unit})`), 'notes'];
  const rows = entries.map((e) => {
    const values = presets.map((p) => {
      const cm = e.measurements?.[p.id];
      if (cm === undefined) return '';
      return unit === 'in' ? Math.round((cm / CM_PER_INCH) * 100) / 100 : cm;
    });
    return [localDate(e.timestamp), localTime(e.timestamp), ...values, e.notes ?? ''];
  });
  return { headers, rows };
}

// Anything exportable carries an ISO timestamp; day-based trackers also carry
// the calendar day they count toward.
export interface DatedEntry {
  timestamp: string;
  date?: string;
}

// The calendar day an entry belongs to, used for range filtering. Weight and
// body measurements have no `date` field, so it comes from the timestamp.
export function entryDate(type: ExportType, e: DatedEntry): string {
  if (type === 'weight' || type === 'body-measurements') {
    return localDate(e.timestamp);
  }
  return e.date ?? '';
}
