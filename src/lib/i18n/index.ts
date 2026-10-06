/**
 * Dictionary access.
 *
 * Every locale's messages live under ./messages/<locale>/<namespace>.ts. The
 * English file of each namespace defines the shape; the Hindi and Bangla files
 * are annotated with that type, so a missing or misnamed key is a type error
 * rather than a blank on screen.
 */

import { en } from "./messages/en";
import { hi } from "./messages/hi";
import { bn } from "./messages/bn";
import { DEFAULT_LOCALE, type Locale } from "./locales";

import type { Messages } from "./messages/en";

const DICTIONARIES: Record<Locale, Messages> = { en, hi, bn };

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Messages {
  return DICTIONARIES[locale] ?? en;
}

/** Replace `{name}` placeholders. Unknown placeholders are left as written. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export type { Messages };
export type { LandingMessages } from "./messages/en/landing";
export {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_META,
  LOCALES,
  isLocale,
  localeFromAcceptLanguage,
} from "./locales";
export type { Locale, LocaleMeta } from "./locales";
