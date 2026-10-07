import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getI18n } from "@/lib/i18n/server";
import { hasSessionCookie } from "@/lib/supabase/server";

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await hasSessionCookie();
  const { locale, t } = await getI18n();

  return (
    <>
      <SiteNav signedIn={signedIn} />
      <main id="main" className="container-page pb-20 pt-28 sm:pt-32">
        {/* The documents themselves are English-only; say so in the reader's
            language before they start, rather than switching silently. */}
        {locale !== "en" && (
          <p
            role="note"
            className="mx-auto mb-8 max-w-3xl rounded-xl border border-gold-400/40 bg-gold-400/10 px-4 py-3 text-sm leading-relaxed text-gold-300"
          >
            {t.common.legalEnglishOnly}
          </p>
        )}
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
