import Link from "next/link";

import { ContentWall } from "@/components/content-wall";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { MediaTile } from "@/components/media-tile";
import { PlatformMarquee } from "@/components/platform-marquee";
import { PricingSection } from "@/components/pricing-section";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import type { LandingMessages } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { CONTENT_WALL } from "@/lib/media";
import { hasSessionCookie } from "@/lib/supabase/server";

export default async function HomePage() {
  // Cosmetic only (which CTA to show), so no auth-server call on the homepage.
  const [signedIn, { t }] = await Promise.all([hasSessionCookie(), getI18n()]);
  const copy = t.landing;

  return (
    <>
      <SiteNav signedIn={signedIn} />
      <main id="main">
        <Hero signedIn={signedIn} />
        <PlatformMarquee />
        <RiskSection copy={copy.risk} />
        <SolutionSection copy={copy.solution} />
        <HowItWorks />
        <ContentWall />
        <TrustSection copy={copy.trust} />
        <PricingSection />
        <Faq copy={copy.faq} />
        <FinalCta copy={copy} signedIn={signedIn} />
      </main>
      <SiteFooter />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* The risk                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Ravi's wording, verbatim, from `landing.risk`. The lead sentence of each point is
 * emphasised and the rest follows in the same paragraph — that is how he wrote
 * them, and splitting them into title/body pairs would change the reading.
 */
function RiskSection({ copy }: { copy: LandingMessages["risk"] }) {
  const { eyebrow, heading, points } = copy;

  return (
    <section className="border-t border-ink-800/80 py-20 sm:py-28">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
          <Reveal>
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h2 className="section-heading mt-3">{heading}</h2>

              <ul className="mt-8 space-y-5">
                {points.map((point) => (
                  <li key={point.lead} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400"
                    />
                    <p className="text-sm leading-relaxed text-muted">
                      <strong className="font-semibold text-cream-50">{point.lead}</strong>{" "}
                      {point.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-3 sm:space-y-4">
                <MediaTile item={CONTENT_WALL[4]!} sizes="(max-width:1024px) 45vw, 260px" />
                <MediaTile item={CONTENT_WALL[6]!} sizes="(max-width:1024px) 45vw, 260px" />
              </div>
              <div className="space-y-3 pt-8 sm:space-y-4">
                <MediaTile item={CONTENT_WALL[3]!} sizes="(max-width:1024px) 45vw, 260px" />
                <MediaTile item={CONTENT_WALL[8]!} sizes="(max-width:1024px) 45vw, 260px" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* The solution                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Ravi's wording, verbatim, from `landing.solution`.
 *
 * NOTE FOR WHOEVER SHIPS THIS PUBLICLY: "Sovereign Security" asserts hosting
 * in an independent, off-shore jurisdiction insulated from domestic law. The
 * pilot's storage is a single Supabase project, and README.md recommends the
 * Mumbai (ap-south-1) region for Indian creators — i.e. domestic Indian
 * infrastructure, which is close to the opposite of the claim. The copy is
 * reproduced here as dictated and must be confirmed against the real
 * deployment region and reviewed legally before launch.
 */
function SolutionSection({ copy }: { copy: LandingMessages["solution"] }) {
  const { heading, blocks } = copy;

  return (
    <section id="the-solution" className="scroll-mt-24 border-t border-ink-800/80 py-20 sm:py-28">
      <div className="container-page">
        <Reveal>
          <h2 className="section-heading max-w-2xl">{heading}</h2>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {blocks.map((block, index) => (
            <Reveal key={block.title} delay={index * 90}>
              <div className="edge-glow h-full rounded-2xl border border-ink-700 bg-ink-850/70 p-6 sm:p-7">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800 text-gold-400">
                  {index === 0 ? <ShieldIcon /> : <ReclaimIcon />}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-cream-50">{block.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-cream-300">{block.lead}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{block.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 3.2l7 2.6v5.4c0 4.2-2.9 7.6-7 9.6-4.1-2-7-5.4-7-9.6V5.8l7-2.6z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 12.2l2 2 3.6-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReclaimIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 4.5v10m0 0l-3.5-3.5M12 14.5l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.8 15.5v2.2a1.8 1.8 0 001.8 1.8h10.8a1.8 1.8 0 001.8-1.8v-2.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Trust                                                                      */
/* -------------------------------------------------------------------------- */

/** Icons in the order of `landing.trust.items`. */
const TRUST_ICONS = ["lock", "download", "sliders"] as const;

function TrustSection({ copy }: { copy: LandingMessages["trust"] }) {
  return (
    <section className="border-t border-ink-800/80 py-16 sm:py-20">
      <div className="container-page">
        <div className="grid gap-4 sm:grid-cols-3">
          {copy.items.map((item, index) => (
            <Reveal key={item.title} delay={index * 80}>
              <div className="edge-glow h-full rounded-2xl border border-ink-700 bg-ink-850/70 p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800 text-gold-400">
                  <TrustIcon name={TRUST_ICONS[index] ?? "lock"} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-cream-50">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustIcon({ name }: { name: "lock" | "download" | "sliders" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "lock") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" {...common} />
        <path d="M8.5 10.5V7.75a3.5 3.5 0 017 0v2.75" {...common} />
      </svg>
    );
  }
  if (name === "download") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M12 4v11m0 0l-4-4m4 4l4-4" {...common} />
        <path d="M5 19h14" {...common} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M5 8h14M5 16h14" {...common} />
      <circle cx="10" cy="8" r="2.2" {...common} />
      <circle cx="15" cy="16" r="2.2" {...common} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* FAQ                                                                        */
/* -------------------------------------------------------------------------- */

function Faq({ copy }: { copy: LandingMessages["faq"] }) {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-ink-800/80 py-20 sm:py-28">
      <div className="container-page">
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 className="section-heading mt-3">{copy.heading}</h2>
          </div>
        </Reveal>

        <div className="mt-10 grid max-w-4xl gap-3">
          {copy.items.map((item, index) => (
            <Reveal key={item.q} delay={index * 45}>
              <details className="group rounded-2xl border border-ink-700 bg-ink-850/70 px-5 py-4 transition-colors hover:border-ink-600 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-cream-50">
                  {item.q}
                  <span className="shrink-0 text-gold-400 transition-transform duration-300 group-open:rotate-45">
                    <PlusIcon />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Final CTA                                                                  */
/* -------------------------------------------------------------------------- */

function FinalCta({ copy, signedIn }: { copy: LandingMessages; signedIn: boolean }) {
  const { hero, finalCta } = copy;

  return (
    <section className="pb-20 pt-4 sm:pb-28">
      <div className="container-page">
        <Reveal>
          <div className="edge-glow relative overflow-hidden rounded-3xl border border-ink-700 bg-ink-850 px-6 py-16 text-center sm:px-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -top-24 h-64 opacity-70 blur-3xl"
              style={{
                background:
                  "radial-gradient(ellipse 50% 60% at 50% 50%, rgba(255,61,127,0.35), rgba(123,47,247,0.22) 50%, transparent 72%)",
              }}
            />
            <h2 className="section-heading relative">{finalCta.heading}</h2>
            <p className="prose-muted relative mx-auto mt-4 max-w-md">{finalCta.body}</p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={signedIn ? "/dashboard" : "/signup"}
                className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto"
              >
                {signedIn ? hero.ctaPrimarySignedIn : hero.ctaPrimary}
              </Link>
              {!signedIn && (
                <Link href="/login" className="btn-secondary w-full px-7 py-3.5 text-base sm:w-auto">
                  {finalCta.login}
                </Link>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
