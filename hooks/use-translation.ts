"use client";

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
  const t = (key: string, vars?: Vars): string => {
    const found = resolve(dictionary, key);
    let str = typeof found === 'string' ? found : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  };

  return { t, locale, languages };
}
