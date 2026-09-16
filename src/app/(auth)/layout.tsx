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

      <main id="main" className="hero-glow relative flex flex-1 items-center justify-center px-5 py-14">
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
