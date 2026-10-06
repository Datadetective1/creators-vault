import type { Metadata, Viewport } from "next";

import { PRODUCT_NAME } from "@/lib/brand";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    // The name is a WORKING name, not final branding — see src/lib/brand.ts.
    title: {
      default: `${PRODUCT_NAME} — ${t.common.meta.title}`,
      template: `%s · ${PRODUCT_NAME}`,
    },
    description: t.common.meta.description,
    openGraph: {
      title: `${PRODUCT_NAME} — ${t.common.meta.title}`,
      description: t.common.meta.ogDescription,
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0810",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();

  return (
    <html lang={locale}>
      <head>
        {/*
          Marks the document as scripting-capable before first paint, which is
          what gates the scroll-reveal styles.

          The flag is set optimistically and then withdrawn on a timer: an
          inline script proves scripting is ON, not that the bundle will arrive,
          so a failed or blocked chunk would otherwise leave every section
          hidden with nothing left to un-hide it. Reveal's effect cancels the
          timer as soon as it mounts, so the withdrawal only ever fires when the
          bundle genuinely never ran.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `var d=document.documentElement;d.setAttribute("data-js","1");d.dataset.revealFailsafe=String(setTimeout(function(){d.removeAttribute("data-js")},4000))`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only rounded-full bg-gold-400 px-4 py-2 font-semibold text-ink-950 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          {t.common.skipToContent}
        </a>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
