import { format } from 'date-fns';
import { enUS, it, de, fr, es } from 'date-fns/locale';
import type { DateFormatSettings, SingleDateFormat, DateLocale } from './types';

// Map locale codes to date-fns locale objects
const LOCALES: Record<DateLocale, typeof enUS> = {
  en: enUS,
  it: it,
  de: de,
  fr: fr,
  es: es,
};

// Get the date-fns locale object
export function getLocale(localeCode: DateLocale) {
  return LOCALES[localeCode] || enUS;
}

// Default date format settings
export const DEFAULT_DATE_FORMAT: DateFormatSettings = {
  locale: 'en',
  tableFormat: {
    dateFormat: 'EEE.dd/MM',
    timeFormat: 'HH:mm',
    showWeekday: false, // Already in format
  },
  tooltipFormat: {
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    showWeekday: true,
  },
  axisFormat: {
    dateFormat: 'dd/MM',
    timeFormat: 'none',
    showWeekday: false,
  },
};

// Helper to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Matches a plain calendar date with no time component, e.g. "2026-07-07"
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Parse a value into a Date. Date-only strings are parsed in LOCAL time:
// `new Date("2026-07-07")` would be UTC midnight, which renders as the previous
// day (e.g. "Jul 6, 5:00 PM") in negative-UTC-offset timezones. These strings
// represent a calendar day, so we build the date in the local zone instead.
function toDateObj(date: Date | string): Date {
  if (typeof date !== 'string') return date;
  const m = DATE_ONLY_RE.exec(date);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(date);
}

// Format a date according to a single format setting
function formatWithSettings(
  date: Date | string,
  singleFormat: SingleDateFormat,
  locale: DateLocale
): string {
  // Date-only values (e.g. water/steps daily totals) represent a calendar day
  // with no meaningful time, so parse them locally and never append a time.
  const isDateOnly = typeof date === 'string' && DATE_ONLY_RE.test(date);
  try {
    const dateObj = toDateObj(date);
    const localeObj = getLocale(locale);

    // Determine the date pattern
    let pattern = singleFormat.dateFormat === 'custom'
      ? (singleFormat.customDateFormat || 'dd/MM/yyyy')
      : singleFormat.dateFormat;

    // Add weekday if enabled and not already in pattern
    if (singleFormat.showWeekday && !pattern.includes('EEE')) {
      pattern = `EEE ${pattern}`;
    }

    // Add time if not 'none' (skip for date-only values)
    if (singleFormat.timeFormat !== 'none' && !isDateOnly) {
      pattern = `${pattern} ${singleFormat.timeFormat}`;
    }

    // Format the date
    let formatted = format(dateObj, pattern, { locale: localeObj });

    // Capitalize first letter (for weekday abbreviations)
    if (pattern.startsWith('EEE') || singleFormat.showWeekday) {
      formatted = capitalize(formatted);
    }

    return formatted;
  } catch {
    // Fallback to a safe default format if there's an error
    const dateObj = toDateObj(date);
    return format(dateObj, isDateOnly ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm');
  }
}

// Ensure we have valid settings, merging with defaults for any missing fields
function ensureValidSettings(settings?: DateFormatSettings): DateFormatSettings {
  if (!settings) return DEFAULT_DATE_FORMAT;

  return {
    locale: settings.locale || DEFAULT_DATE_FORMAT.locale,
    tableFormat: settings.tableFormat || DEFAULT_DATE_FORMAT.tableFormat,
    tooltipFormat: settings.tooltipFormat || DEFAULT_DATE_FORMAT.tooltipFormat,
    axisFormat: settings.axisFormat || DEFAULT_DATE_FORMAT.axisFormat,
  };
}

// Format for table rows
export function formatDateForTable(date: Date | string, settings?: DateFormatSettings): string {
  const s = ensureValidSettings(settings);
  return formatWithSettings(date, s.tableFormat, s.locale);
}

// Format for chart tooltip
export function formatDateForTooltip(date: Date | string, settings?: DateFormatSettings): string {
  const s = ensureValidSettings(settings);
  return formatWithSettings(date, s.tooltipFormat, s.locale);
}

// Format for chart X-axis
export function formatDateForAxis(date: Date | string, settings?: DateFormatSettings): string {
  const s = ensureValidSettings(settings);
  return formatWithSettings(date, s.axisFormat, s.locale);
}

// Format for recap: uses table format without time
export function formatDateForRecap(date: Date | string, settings?: DateFormatSettings): string {
  const s = ensureValidSettings(settings);
  // Use table format but force no time
  const recapFormat: SingleDateFormat = {
    ...s.tableFormat,
    timeFormat: 'none',
    showWeekday: true,
  };
  return formatWithSettings(date, recapFormat, s.locale);
}

// Preview a format with current date
export function previewFormat(singleFormat: SingleDateFormat, locale: DateLocale): string {
  return formatWithSettings(new Date(), singleFormat, locale);
}
