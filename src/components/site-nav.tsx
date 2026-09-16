"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Logo } from "@/components/brand";

const LINKS = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#what-you-can-protect", label: "What You Can Protect" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

/**
 * Transparent over the hero, frosted once the page scrolls — so the media
 * behind it reads at the top, and the links stay legible everywhere else.
 */
export function SiteNav({ signedIn = false }: { signedIn?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

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
      <nav aria-label="Main" className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <div className="hidden items-center gap-7 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-cream-300 transition-colors hover:text-cream-50"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/dashboard" className="btn-primary whitespace-nowrap px-4 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm">
              Go to my vault
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost hidden sm:inline-flex">
                Login
              </Link>
              <Link
                href="/signup"
                className="btn-primary whitespace-nowrap px-3.5 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Protect My Content
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
