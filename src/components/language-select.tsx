"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { setLocaleAction } from "@/app/actions/locale";
import { LOCALE_META, LOCALES } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

/**
 * A compact native <select>: keyboard and screen-reader behaviour come from
 * the platform, and on a phone it opens the system picker.
 */
export function LanguageSelect({
  className = "",
  compact = false,
}: {
  className?: string;
  /**
   * Below the `sm` breakpoint, show only the globe: the select keeps its full
   * width of options (the phone opens its own picker) but its closed face is
   * just the icon, so a crowded header does not overflow.
   */
  compact?: boolean;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label
      className={`relative inline-flex items-center text-cream-300 ${pending ? "opacity-60" : ""} ${className}`}
    >
      <span className="sr-only">{t.common.language.label}</span>
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="10" cy="10" r="7.25" />
        <path d="M2.75 10h14.5M10 2.75c2 2.2 3 4.6 3 7.25s-1 5.05-3 7.25M10 2.75c-2 2.2-3 4.6-3 7.25s1 5.05 3 7.25" />
      </svg>
      <select
        data-testid="language-select"
        value={locale}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(async () => {
            await setLocaleAction(next);
            router.refresh();
          });
        }}
        className={`h-9 cursor-pointer appearance-none rounded-full border border-ink-700 bg-ink-900/60 text-xs font-medium transition-colors hover:border-ink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
          compact
            ? "w-9 pl-0 pr-0 text-transparent sm:w-auto sm:pl-8 sm:pr-3 sm:text-cream-50"
            : "pl-8 pr-3 text-cream-50"
        }`}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} lang={code} className="bg-ink-900 text-cream-50">
            {LOCALE_META[code].nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
