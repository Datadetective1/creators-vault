import "server-only";

import { cookies, headers } from "next/headers";

import { getDictionary } from "./index";
import { LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, type Locale } from "./locales";

/**
 * The visitor's language: their saved choice (cookie) first, then the
 * browser's Accept-Language, then English.
 */
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}

/** Locale plus its dictionary, for server components. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
