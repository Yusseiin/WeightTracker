import { promises as fs } from 'fs';
import path from 'path';
import { DEFAULT_LANGUAGE, type Dictionary } from './i18n-shared';

// Re-export the client-safe helpers so existing server imports keep working.
export { DEFAULT_LANGUAGE, getLanguageName, type Dictionary } from './i18n-shared';

// The dictionary folder lives at the app root. In a Next.js standalone build the
// working directory is the standalone root, so the Dockerfile copies dictionary/
// there too. Available languages are whatever *.json files exist here.
const DICTIONARY_DIR = path.join(process.cwd(), 'dictionary');

// Process-lifetime caches: the folder is scanned and files parsed once per
// server start, so editing/adding a dictionary is picked up on the next reboot.
let availableCache: string[] | null = null;
const rawCache = new Map<string, Dictionary>();

// Parse JSON that may contain full-line `//` comments (JSONC-lite). Only lines
// whose first non-whitespace characters are `//` are stripped, so `https://`
// inside string values is preserved.
function parseJsonc(text: string): Dictionary {
  const cleaned = text
    .split('\n')
    .filter(line => !line.trimStart().startsWith('//'))
    .join('\n');
  return JSON.parse(cleaned) as Dictionary;
}

// List available language codes, derived from dictionary/*.json (cached).
export async function getAvailableLanguages(): Promise<string[]> {
  if (availableCache) return availableCache;
  let codes: string[] = [];
  try {
    const files = await fs.readdir(DICTIONARY_DIR);
    codes = files
      .filter(f => f.toLowerCase().endsWith('.json'))
      .map(f => f.slice(0, -'.json'.length));
  } catch {
    codes = [];
  }
  if (!codes.includes(DEFAULT_LANGUAGE)) codes.unshift(DEFAULT_LANGUAGE);
  // English first, then the rest alphabetically
  availableCache = [
    DEFAULT_LANGUAGE,
    ...codes.filter(c => c !== DEFAULT_LANGUAGE).sort(),
  ];
  return availableCache;
}

async function loadRaw(locale: string): Promise<Dictionary> {
  const cached = rawCache.get(locale);
  if (cached) return cached;
  try {
    const text = await fs.readFile(path.join(DICTIONARY_DIR, `${locale}.json`), 'utf-8');
    const dict = parseJsonc(text);
    rawCache.set(locale, dict);
    return dict;
  } catch {
    return {};
  }
}

// Deep-merge source over base (base = English fallback).
function deepMerge(base: Dictionary, override: Dictionary): Dictionary {
  const out: Dictionary = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseVal = out[key];
    if (
      value && typeof value === 'object' && !Array.isArray(value) &&
      baseVal && typeof baseVal === 'object' && !Array.isArray(baseVal)
    ) {
      out[key] = deepMerge(baseVal as Dictionary, value as Dictionary);
    } else {
      out[key] = value;
    }
  }
  return out;
}

// Resolve the dictionary for a locale, merged over English so any missing
// translation falls back to the English string.
export async function getDictionary(locale: string): Promise<Dictionary> {
  const en = await loadRaw(DEFAULT_LANGUAGE);
  if (!locale || locale === DEFAULT_LANGUAGE) return en;
  const target = await loadRaw(locale);
  return deepMerge(en, target);
}
