// Client-safe i18n helpers and types (no Node.js/fs imports, so this can be
// imported from client components). Server-only file scanning lives in lib/i18n.ts.

export const DEFAULT_LANGUAGE = 'en';

export type Dictionary = Record<string, unknown>;

// Human-readable names for known language codes (extend as needed). Unknown
// codes just display their code.
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  it: 'Italiano',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
};

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}
