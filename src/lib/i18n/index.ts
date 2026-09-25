/**
 * Dictionary access.
 *
 * One lookup point so a future locale is a file plus a registry flag, not a
 * hunt through components. Only ready locales resolve to their own dictionary;
 * everything else falls back to English rather than rendering blanks or
 * half-translated pages.
 */

import { en } from "./en";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "./locales";

import type { Dictionary } from "./en";

const DICTIONARIES: Partial<Record<Locale, Dictionary>> = {
  en,
  // hi: ..., bn: ...  — add alongside LOCALE_META[...].ready = true.
};

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  if (LOCALE_META[locale]?.ready) {
    const dictionary = DICTIONARIES[locale];
    if (dictionary) return dictionary;
  }
  return en;
}

export type { Dictionary };
export { DEFAULT_LOCALE, LOCALE_META, LOCALES, isLocale, readyLocales } from "./locales";
export type { Locale, LocaleMeta } from "./locales";
