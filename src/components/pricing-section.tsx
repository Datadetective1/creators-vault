import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { isPaddleConfigured } from "@/lib/env";
import { PLANS } from "@/lib/plans";

/**
 * The Free and Creator plans. Rendered on the homepage (#pricing) and as the
 * standalone /pricing page, which is the pricing URL given to Paddle.
 *
 * Both tiers are read from `src/lib/plans.ts` — the same definitions the
 * dashboard's plan picker and the server-side quota use — so the price and
 * allowance shown here cannot drift from what people actually get.
 *
 * Whether anything is charged is read off `isPaddleConfigured()` rather than
 * asserted: with no Paddle configuration the copy says nothing is charged yet,
 * and it changes by itself the moment billing is switched on. Both cards link
 * to sign-up, never straight to a checkout.
 */
export function PricingSection({ standalone = false }: { standalone?: boolean }) {
  const { free, creator } = PLANS;
  const billingLive = isPaddleConfigured();
  const Heading = standalone ? "h1" : "h2";

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
            <p className="eyebrow justify-center">Pricing</p>
            <Heading className="section-heading mt-3">Start free. One simple paid plan.</Heading>
            <p className="prose-muted mt-4">
              {billingLive
                ? "Pilot pricing. Change plan at any time."
                : "Pilot pricing, while we finish building. Nothing is charged yet."}
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
              <p className="text-sm text-muted">of private storage</p>

              <ul className="mt-6 space-y-2.5">
                {free.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-sm text-cream-300">
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/signup" className="btn-secondary mt-7 w-full">
                Start free
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
                  {creator.priceLabel}
                </span>
                <span className="text-sm text-muted">{creator.pricePeriod}</span>
              </p>
              <p className="relative text-sm text-muted">
                {creator.storageLabel} — flat, however much you store
              </p>

              <ul className="relative mt-6 space-y-2.5">
                {creator.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-sm text-cream-300">
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/signup" className="btn-primary relative mt-7 w-full">
                Join the pilot
              </Link>
            </div>
          </Reveal>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
          {billingLive
            ? "Pilot pricing is not final. Paid plans are billed through Paddle, our payment provider, with the price confirmed at checkout."
            : "Pilot pricing is not final and no card is charged today. Paid plans will be billed through Paddle, our payment provider, with the price confirmed at checkout."}{" "}
          See our{" "}
          <Link href="/terms" className="text-cream-300 underline underline-offset-2 hover:text-cream-50">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/refunds" className="text-cream-300 underline underline-offset-2 hover:text-cream-50">
            Refund Policy
          </Link>
          .
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
