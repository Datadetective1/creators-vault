"use server";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";

/**
 * Save the visitor's language. A cookie, not localStorage, so the server
 * renders the right language on the very first byte and there is no flash of
 * English. Signed-in users rely on the same cookie; the setting holds nothing
 * sensitive, so it is not tied to the account.
 */
export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
