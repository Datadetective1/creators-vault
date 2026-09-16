import Link from "next/link";

import { Logo } from "@/components/brand";

const LINKS = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteNav({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-900/85 backdrop-blur">
      <nav
        aria-label="Main"
        className="container-page flex h-16 items-center justify-between gap-4"
      >
        <Logo />

        <div className="hidden items-center gap-7 md:flex">
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
            <Link href="/dashboard" className="btn-primary">
              Go to my vault
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost hidden sm:inline-flex">
                Login
              </Link>
              {/* Compact on a phone so it sits beside the wordmark without wrapping. */}
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
