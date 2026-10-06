"use client";

import { createContext, useContext } from "react";

import { getDictionary } from "./index";
import { DEFAULT_LOCALE, type Locale } from "./locales";

import type { Messages } from "./messages/en";

const I18nContext = createContext<Locale>(DEFAULT_LOCALE);

/**
 * Carries the server-resolved locale to client components. Only the locale
 * code crosses the boundary; each client bundle already includes the
 * dictionaries, so nothing large is serialised into every page.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useI18n(): { locale: Locale; t: Messages } {
  const locale = useContext(I18nContext);
  return { locale, t: getDictionary(locale) };
}
