import type { Metadata } from "next";
import Link from "next/link";

import { PRODUCT_NAME } from "@/components/brand";
import { PricingSection, creatorPrice } from "@/components/pricing-section";
import { rich } from "@/components/rich-text";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { LEGAL } from "@/lib/legal";
import { hasSessionCookie } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  const { priceLabel, pricePeriod } = await creatorPrice(t);
  return {
    title: t.pricing.meta.title,
    description: fmt(t.pricing.meta.description, {
      product: PRODUCT_NAME,
      price: `${priceLabel}${pricePeriod}`,
    }),
  };
}

const linkClass = "text-cream-300 underline underline-offset-2 hover:text-cream-50";

export default async function PricingPage() {
  const signedIn = await hasSessionCookie();
  const { t } = await getI18n();
  const copy = t.pricing.billing;
  const { priceLabel, pricePeriod } = await creatorPrice(t);

  return (
    <>
      <SiteNav signedIn={signedIn} />
      <main id="main" className="pt-16 sm:pt-20">
        <PricingSection standalone />

        <section aria-labelledby="billing-heading" className="pb-20 sm:pb-28">
          <div className="container-page">
            <div className="mx-auto max-w-3xl rounded-2xl border border-ink-700 bg-ink-850/70 p-6 sm:p-8">
              <h2 id="billing-heading" className="text-lg font-semibold text-cream-50">
                {copy.heading}
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-cream-300 marker:text-gold-400">
                <li>{fmt(copy.price, { price: `${priceLabel}${pricePeriod}` })}</li>
                <li>{copy.paddle}</li>
                <li>{copy.cancel}</li>
                <li>
                  {rich(copy.refunds, {
                    refunds: (
                      <Link href="/refunds" className={linkClass}>
                        {t.common.legalLinks.refunds}
                      </Link>
                    ),
                    terms: (
                      <Link href="/terms" className={linkClass}>
                        {t.common.legalLinks.terms}
                      </Link>
                    ),
                  })}
                </li>
                <li>
                  {rich(copy.questions, {
                    email: (
                      <a href={`mailto:${LEGAL.billingEmail}`} className={linkClass}>
                        {LEGAL.billingEmail}
                      </a>
                    ),
                  })}
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
