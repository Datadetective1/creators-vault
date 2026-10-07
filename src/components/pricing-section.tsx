import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { rich } from "@/components/rich-text";
import { isPaddleConfigured } from "@/lib/env";
import { fmt, type Messages } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getAdvertisedCreatorPrice } from "@/lib/paddle-pricing";
import { PLANS } from "@/lib/plans";

/**
 * The Creator price as advertised: the figure, its period and the tax note.
 *
 * The one place the price label is put together — the card below, the
 * /pricing billing notes, its metadata, the Plan page and the upload page all
 * read it from here.
 *
 * The figure is Paddle's own India price (₹399 including GST), fetched from
 * Paddle's pricing preview, and is shown to every visitor wherever they are.
 * Checkout then charges each buyer in the currency Paddle sets for their
 * country, which the tax note says. If Paddle cannot be reached in time the
 * fallback in src/lib/plans.ts — the same ₹399 — is shown instead.
 */
export async function creatorPrice(t: Messages) {
  const advertised = await getAdvertisedCreatorPrice();
  return {
    priceLabel: advertised?.total ?? PLANS.creator.priceLabel,
    pricePeriod: t.pricing.plans.creator.pricePeriod,
    taxNote: t.pricing.plans.creator.taxNote,
  };
}

/**
 * The one Creator plan. Rendered on the homepage (#pricing) and as the
 * standalone /pricing page, which is the pricing URL given to Paddle.
 *
 * Whether anything is charged is read off `isPaddleConfigured()` rather than
 * asserted. The card links to sign-up, never straight to a checkout.
 */
export async function PricingSection({ standalone = false }: { standalone?: boolean }) {
  const { t } = await getI18n();
  const copy = t.pricing;
  const { creator } = copy.plans;
  const { priceLabel, pricePeriod, taxNote } = await creatorPrice(t);
  const billingLive = isPaddleConfigured();
  const Heading = standalone ? "h1" : "h2";
  const linkClass = "text-cream-300 underline underline-offset-2 hover:text-cream-50";

  return (
    <section
      id="pricing"
      className={
        standalone
          ? "py-16 sm:py-20"
          : "scroll-mt-24 border-t border-ink-800/80 py-20 sm:py-28"
      }
    >
      <div className="container-page">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow justify-center">{copy.eyebrow}</p>
            <Heading className="section-heading mt-3">{fmt(copy.heading, { price: priceLabel })}</Heading>
            <p className="prose-muted mt-4">
              {billingLive ? copy.subheadingLive : copy.subheadingNotLive}
            </p>
          </div>
        </Reveal>

        <div className="mx-auto mt-12 max-w-md">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border-2 border-gold-400/70 bg-ink-850 p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-40 blur-3xl"
                style={{ background: "radial-gradient(circle, rgba(255,176,31,0.7), transparent 70%)" }}
              />

              <h3 className="relative text-lg font-semibold text-cream-50">{creator.name}</h3>
              <p className="relative mt-1 text-sm text-muted">{creator.tagline}</p>

              <p className="relative mt-6 flex flex-wrap items-baseline gap-x-0.5">
                {/* Solid, not text-gradient: across glyphs the ramp would split
                    the currency sign and the figure into different colours. */}
                <span className="text-4xl font-semibold tracking-tight text-gold-400">
                  <span data-testid="creator-price">{priceLabel}</span>
                </span>
                <span className="text-sm text-muted">{pricePeriod}</span>
              </p>
              <p className="relative mt-1 text-xs leading-relaxed text-muted">
                <span data-testid="creator-tax-note">{taxNote}</span>
              </p>
              <p className="relative mt-2 text-sm text-muted">{creator.storageCaption}</p>

              <ul className="relative mt-6 space-y-2.5">
                {creator.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-sm text-cream-300">
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/signup" className="btn-primary relative mt-7 w-full">
                {creator.cta}
              </Link>
            </div>
          </Reveal>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
          {rich(billingLive ? copy.footnoteLive : copy.footnoteNotLive, {
            terms: (
              <Link href="/terms" className={linkClass}>
                {t.common.legalLinks.termsShort}
              </Link>
            ),
            refunds: (
              <Link href="/refunds" className={linkClass}>
                {t.common.legalLinks.refunds}
              </Link>
            ),
          })}
        </p>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" fill="none" aria-hidden="true">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
