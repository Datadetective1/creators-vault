import type { Metadata } from "next";
import Link from "next/link";

import { PRODUCT_NAME } from "@/components/brand";
import { PricingSection } from "@/components/pricing-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { LEGAL } from "@/lib/legal";
import { PLANS } from "@/lib/plans";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${PRODUCT_NAME} pricing: Free with ${PLANS.free.storageLabel} of private storage, or Creator with up to 100 GB for ${PLANS.creator.priceLabel}${PLANS.creator.pricePeriod}.`,
};

const linkClass = "text-cream-300 underline underline-offset-2 hover:text-cream-50";

export default async function PricingPage() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteNav signedIn={Boolean(user)} />
      <main id="main" className="pt-16 sm:pt-20">
        <PricingSection standalone />

        <section aria-labelledby="billing-heading" className="pb-20 sm:pb-28">
          <div className="container-page">
            <div className="mx-auto max-w-3xl rounded-2xl border border-ink-700 bg-ink-850/70 p-6 sm:p-8">
              <h2 id="billing-heading" className="text-lg font-semibold text-cream-50">
                How billing works
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-cream-300 marker:text-gold-400">
                <li>
                  Creator is {LEGAL.creatorPrice}, plus any tax that applies where you live. Tax is
                  calculated and shown at checkout before you pay.
                </li>
                <li>
                  Payments are processed by Paddle, our Merchant of Record. Creator renews monthly
                  until you cancel.
                </li>
                <li>
                  Cancel any time from your Plan page. You keep Creator until the end of the month
                  you have paid for, then move to Free — your files are never deleted.
                </li>
                <li>
                  Any payment can be refunded within 14 days. See our{" "}
                  <Link href="/refunds" className={linkClass}>
                    Refund Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/terms" className={linkClass}>
                    Terms of Service
                  </Link>
                  .
                </li>
                <li>
                  Billing questions:{" "}
                  <a href={`mailto:${LEGAL.billingEmail}`} className={linkClass}>
                    {LEGAL.billingEmail}
                  </a>
                  .
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
