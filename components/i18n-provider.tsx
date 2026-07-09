"use client";

import { createContext, useContext } from 'react';
import type { Dictionary } from '@/lib/i18n-shared';

interface I18nContextValue {
  dictionary: Dictionary;
  locale: string;
  languages: string[];
}

const I18nContext = createContext<I18nContextValue>({
  dictionary: {},
  locale: 'en',
  languages: ['en'],
});

export function I18nProvider({
  dictionary,
  locale,
  languages,
  children,
}: I18nContextValue & { children: React.ReactNode }) {
  return (
    <I18nContext.Provider value={{ dictionary, locale, languages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
