import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Creator Vault — Protect the work behind your brand",
    template: "%s · Creator Vault",
  },
  description:
    "Store an independent copy of your most valuable videos, photos and creator assets. Access them whenever you need them, even if something happens to your social account.",
  openGraph: {
    title: "Creator Vault — Protect the work behind your brand",
    description:
      "Keep a private, independent copy of the content your business depends on.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only rounded-full bg-gold-400 px-4 py-2 font-semibold text-ink-950 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
