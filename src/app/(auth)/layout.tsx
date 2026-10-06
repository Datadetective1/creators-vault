import Link from "next/link";

import { Logo, PRODUCT_NAME } from "@/components/brand";
import { LanguageSelect } from "@/components/language-select";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink-800">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo />
          <LanguageSelect />
        </div>
      </header>

      <main id="main" className="relative flex flex-1 items-center justify-center px-5 py-14">
        {/* Same warm glow as the landing hero, so signing up feels continuous. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[26rem] w-[40rem] max-w-full -translate-x-1/2 opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 40%, rgba(255,176,31,0.22), rgba(168,85,247,0.16) 45%, transparent 72%)",
          }}
        />
        <div className="relative w-full max-w-md">{children}</div>
      </main>

      <footer className="border-t border-ink-800 py-6">
        <div className="container-page flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
          <Link href="/" className="transition-colors hover:text-cream-50">
            &larr; {fmt(t.common.backTo, { product: PRODUCT_NAME })}
          </Link>
          <Link href="/terms" className="transition-colors hover:text-cream-50">
            {t.common.legalLinks.termsShort}
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-cream-50">
            {t.common.legalLinks.privacyShort}
          </Link>
          <Link href="/refunds" className="transition-colors hover:text-cream-50">
            {t.common.legalLinks.refundsShort}
          </Link>
        </div>
      </footer>
    </div>
  );
}
