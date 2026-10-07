import Link from "next/link";

import { Logo, PRODUCT_NAME } from "@/components/brand";
import { LanguageSelect } from "@/components/language-select";
import { getI18n } from "@/lib/i18n/server";
import { LEGAL } from "@/lib/legal";

export async function SiteFooter() {
  const year = new Date().getFullYear();
  const { t } = await getI18n();
  const f = t.common.footer;

  return (
    <footer className="border-t border-ink-800 bg-ink-950">
      <div className="container-page py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {f.tagline}
            </p>
            <LanguageSelect className="mt-5" />
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6 sm:grid-cols-4">
            <FooterColumn title={f.product}>
              <FooterLink href="/#how-it-works">{f.howItWorks}</FooterLink>
              <FooterLink href="/#what-you-can-protect">{f.whatYouCanProtect}</FooterLink>
              <FooterLink href="/pricing">{f.pricing}</FooterLink>
            </FooterColumn>

            <FooterColumn title={f.account}>
              <FooterLink href="/signup">{f.createAccount}</FooterLink>
              <FooterLink href="/login">{f.login}</FooterLink>
              <FooterLink href="/#faq">{f.faq}</FooterLink>
            </FooterColumn>

            <FooterColumn title={f.support}>
              <FooterLink href="/#faq">{f.help}</FooterLink>
              {LEGAL.supportEmail && (
                <FooterLink href={`mailto:${LEGAL.supportEmail}`}>{f.emailSupport}</FooterLink>
              )}
              {LEGAL.securityEmail && (
                <FooterLink href={`mailto:${LEGAL.securityEmail}`}>{f.reportSecurity}</FooterLink>
              )}
            </FooterColumn>

            <FooterColumn title={f.legal}>
              <FooterLink href="/terms">{t.common.legalLinks.terms}</FooterLink>
              <FooterLink href="/privacy">{t.common.legalLinks.privacy}</FooterLink>
              <FooterLink href="/refunds">{t.common.legalLinks.refunds}</FooterLink>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-ink-800 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {PRODUCT_NAME}. {f.rights}
          </p>
          <p>{f.privacyNote}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cream-300">
        {title}
      </h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className = "text-sm text-muted transition-colors hover:text-cream-50";
  return (
    <li>
      {href.startsWith("mailto:") ? (
        <a href={href} className={className}>
          {children}
        </a>
      ) : (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    </li>
  );
}
