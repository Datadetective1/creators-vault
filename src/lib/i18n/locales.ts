/**
 * Locale registry.
 *
 * English is the base language and the only one with a complete dictionary.
 * Hindi and Bangla are declared here so the UI, the language picker and the
 * routing work can be built against a real list rather than a guess — but they
 * are marked `ready: false` and are deliberately NOT machine-translated.
 * Publishing an auto-translated site without a human review pass is how a
 * product ends up making claims nobody checked, in a language nobody on the
 * team reads.
 */

export const LOCALES = ["en", "hi", "bn"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export interface LocaleMeta {
  /** BCP 47 tag, for the `lang` attribute. */
  code: Locale;
  /** Name in the language itself, which is what a picker should show. */
  nativeName: string;
  englishName: string;
  dir: "ltr" | "rtl";
  /**
   * True once a human-reviewed dictionary exists. A locale that is not ready
   * must never be offered to visitors.
   */
  ready: boolean;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { code: "en", nativeName: "English", englishName: "English", dir: "ltr", ready: true },
  hi: { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", dir: "ltr", ready: false },
  bn: { code: "bn", nativeName: "বাংলা", englishName: "Bangla", dir: "ltr", ready: false },
};

/** Locales that may actually be shown to a visitor today. */
export function readyLocales(): LocaleMeta[] {
  return LOCALES.map((code) => LOCALE_META[code]).filter((meta) => meta.ready);
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
