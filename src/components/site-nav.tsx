"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Logo } from "@/components/brand";
import { LanguageSelect } from "@/components/language-select";
import { useI18n } from "@/lib/i18n/client";

/**
 * Transparent over the hero, frosted once the page scrolls — so the media
 * behind it reads at the top, and the links stay legible everywhere else.
 */
export function SiteNav({ signedIn = false }: { signedIn?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const { t } = useI18n();
  const links = [
    { href: "/#how-it-works", label: t.common.nav.howItWorks },
    { href: "/#what-you-can-protect", label: t.common.nav.whatYouCanProtect },
    { href: "/pricing", label: t.common.nav.pricing },
    { href: "/#faq", label: t.common.nav.faq },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? "glass border-b border-white/5" : "border-b border-transparent"
      }`}
    >
      <nav aria-label={t.common.nav.main} className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <div className="hidden items-center gap-4 lg:flex xl:gap-7">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-cream-300 transition-colors hover:text-cream-50"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelect compact />
          {signedIn ? (
            <Link href="/dashboard" className="btn-primary whitespace-nowrap px-4 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm">
              {t.common.nav.goToFiles}
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost hidden whitespace-nowrap sm:inline-flex">
                {t.common.nav.login}
              </Link>
              <Link
                href="/signup"
                className="btn-primary whitespace-nowrap px-3.5 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm"
              >
                {/* The full call to action does not fit beside the logo on the
                    narrowest phones in every language; a short label does. */}
                <span className="hidden min-[420px]:inline">{t.common.nav.signupCta}</span>
                <span className="min-[420px]:hidden">{t.common.nav.signupCtaShort}</span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
