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
  locale: 'it',
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

// Format a date according to a single format setting
function formatWithSettings(
  date: Date | string,
  singleFormat: SingleDateFormat,
  locale: DateLocale
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const localeObj = getLocale(locale);

    // Determine the date pattern
    let pattern = singleFormat.dateFormat === 'custom'
      ? (singleFormat.customDateFormat || 'dd/MM/yyyy')
      : singleFormat.dateFormat;

    // Add weekday if enabled and not already in pattern
    if (singleFormat.showWeekday && !pattern.includes('EEE')) {
      pattern = `EEE ${pattern}`;
    }

    // Add time if not 'none'
    if (singleFormat.timeFormat !== 'none') {
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
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd/MM/yyyy HH:mm');
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
