"use client";

import { useCallback } from 'react';
import { useI18n } from '@/components/i18n-provider';

type Vars = Record<string, string | number>;

// Resolve a dotted key path ("settings.account.title") against a nested object.
function resolve(dict: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, dict);
}

export function useTranslation() {
  const { dictionary, locale, languages } = useI18n();

  // t('a.b.c', { name: 'x' }) -> looks up the key, interpolates {name},
  // and falls back to the key itself if the string is missing.
  // Memoized on the dictionary so it's stable across renders (safe to use in
  // useCallback/useEffect dependency arrays).
  const t = useCallback((key: string, vars?: Vars): string => {
    const found = resolve(dictionary, key);
    let str = typeof found === 'string' ? found : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  }, [dictionary]);

  return { t, locale, languages };
}
