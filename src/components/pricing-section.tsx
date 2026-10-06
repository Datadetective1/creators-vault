import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { rich } from "@/components/rich-text";
import { isPaddleConfigured } from "@/lib/env";
import { fmt, type Locale, type Messages } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getLocalCreatorPrice, visitorCountry } from "@/lib/paddle-pricing";
import { PLANS } from "@/lib/plans";

/**
 * The Creator price as displayed: the figure, its period and the tax note.
 *
 * The one place the price label is put together — the cards below, the
 * /pricing billing notes and its metadata all read it from here.
 *
 * Where the visitor's country is known, the figure is Paddle's own pricing
 * preview for that country (src/lib/paddle-pricing.ts), so the page shows what
 * checkout will charge, in the currency it will charge in. Otherwise it is the
 * catalog price from `src/lib/plans.ts` with the general tax note.
 */
export async function creatorPrice(t: Messages, locale: Locale) {
  const country = await visitorCountry();
  const local = await getLocalCreatorPrice(country);
  const generic = {
    priceLabel: PLANS.creator.priceLabel,
    pricePeriod: t.pricing.plans.creator.pricePeriod,
    taxNote: t.pricing.plans.creator.taxNote,
  };
  if (!local) return generic;

  let countryName = local.country;
  try {
    countryName = new Intl.DisplayNames([locale], { type: "region" }).of(local.country) ?? local.country;
  } catch {
    // Keep the ISO code.
  }

  return {
    priceLabel: local.total,
    pricePeriod: t.pricing.plans.creator.pricePeriod,
    taxNote: local.taxIncluded
      ? fmt(t.pricing.plans.creator.localTaxIncluded, { tax: local.taxIncluded, country: countryName })
      : generic.taxNote,
  };
}

/**
 * The Free and Creator plans. Rendered on the homepage (#pricing) and as the
 * standalone /pricing page, which is the pricing URL given to Paddle.
 *
 * Both tiers are read from `src/lib/plans.ts` — the same definitions the
 * dashboard's plan picker and the server-side quota use — so the price and
 * allowance shown here cannot drift from what people actually get. The words
 * around them come from `t.pricing.plans`, keyed by plan id.
 *
 * Whether anything is charged is read off `isPaddleConfigured()` rather than
 * asserted: with no Paddle configuration the copy says nothing is charged yet,
 * and it changes by itself the moment billing is switched on. Both cards link
 * to sign-up, never straight to a checkout.
 */
export async function PricingSection({ standalone = false }: { standalone?: boolean }) {
  const { locale, t } = await getI18n();
  const copy = t.pricing;
  const { free, creator } = copy.plans;
  const { priceLabel, pricePeriod, taxNote } = await creatorPrice(t, locale);
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
            <Heading className="section-heading mt-3">{copy.heading}</Heading>
            <p className="prose-muted mt-4">
              {billingLive ? copy.subheadingLive : copy.subheadingNotLive}
            </p>
          </div>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-ink-700 bg-ink-850/70 p-6 transition-transform duration-300 hover:-translate-y-1">
              <h3 className="text-lg font-semibold text-cream-50">{free.name}</h3>
              <p className="mt-1 text-sm text-muted">{free.tagline}</p>

              <p className="mt-6 text-4xl font-semibold tracking-tight text-cream-50">
                {free.storageLabel}
              </p>
              <p className="text-sm text-muted">{free.storageCaption}</p>

              <ul className="mt-6 space-y-2.5">
                {free.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-sm text-cream-300">
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/signup" className="btn-secondary mt-7 w-full">
                {free.cta}
              </Link>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="relative h-full overflow-hidden rounded-2xl border-2 border-gold-400/70 bg-ink-850 p-6 transition-transform duration-300 hover:-translate-y-1">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-40 blur-3xl"
                style={{ background: "radial-gradient(circle, rgba(255,176,31,0.7), transparent 70%)" }}
              />

              <h3 className="relative text-lg font-semibold text-cream-50">{creator.name}</h3>
              <p className="relative mt-1 text-sm text-muted">{creator.tagline}</p>

              <p className="relative mt-6 flex flex-wrap items-baseline gap-x-0.5">
                {/* Solid, not text-gradient: across two glyphs the ramp puts
                    a gold "$" beside a magenta "4". plan-picker.tsx renders the
                    same priceLabel in gold-400. */}
                <span className="text-4xl font-semibold tracking-tight text-gold-400">
                  <span data-testid="creator-price">{priceLabel}</span>
                </span>
                <span className="text-sm text-muted">{pricePeriod}</span>
              </p>
              <p className="relative mt-1 text-xs leading-relaxed text-muted"><span data-testid="creator-tax-note">{taxNote}</span></p>
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
