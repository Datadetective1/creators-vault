/**
 * Locale registry.
 *
 * English is the base language. Hindi and Bangla have complete dictionaries
 * under ./messages, written by hand for this product (not browser
 * auto-translation). They have NOT yet had a review by a native speaker, which
 * `reviewed: false` records; flip it once that review is done.
 *
 * Legal documents (Terms, Privacy, Refunds) stay in English in every locale,
 * with a translated notice saying so: the English text is the binding one.
 */

export const LOCALES = ["en", "hi", "bn"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie holding the visitor's chosen language. Not httpOnly: nothing secret. */
export const LOCALE_COOKIE = "cl_locale";

export interface LocaleMeta {
  /** BCP 47 tag, for the `lang` attribute. */
  code: Locale;
  /** Name in the language itself, which is what a picker should show. */
  nativeName: string;
  englishName: string;
  dir: "ltr" | "rtl";
  /** False until a native speaker has reviewed the dictionary. */
  reviewed: boolean;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { code: "en", nativeName: "English", englishName: "English", dir: "ltr", reviewed: true },
  hi: { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", dir: "ltr", reviewed: false },
  bn: { code: "bn", nativeName: "বাংলা", englishName: "Bangla", dir: "ltr", reviewed: false },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Best match from an Accept-Language header, used only when no choice has
 * been saved. Anything unrecognised resolves to English.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: (tag ?? "").toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
