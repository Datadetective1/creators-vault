import Link from "next/link";

import { Logo } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink-800">
        <div className="container-page flex h-16 items-center">
          <Logo />
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
        <div className="container-page text-center text-xs text-muted">
          <Link href="/" className="transition-colors hover:text-cream-50">
            &larr; Back to Creator Vault
          </Link>
        </div>
      </footer>
    </div>
  );
}
