import Link from "next/link";

import { ContentWall } from "@/components/content-wall";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { MediaTile } from "@/components/media-tile";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { CONTENT_WALL } from "@/lib/media";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await getCurrentUser();
  const signedIn = Boolean(user);

  return (
    <>
      <SiteNav signedIn={signedIn} />
      <main id="main">
        <Hero signedIn={signedIn} />
        <WhySection />
        <HowItWorks />
        <ContentWall />
        <TrustSection />
        <Pricing />
        <Faq />
        <FinalCta signedIn={signedIn} />
      </main>
      <SiteFooter />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Why an independent copy                                                    */
/* -------------------------------------------------------------------------- */

const REASONS = [
  {
    title: "Accounts can be lost",
    body: "Hacked, locked, or recovered slowly. If your only copy lives inside an app you do not control, losing access loses the archive too.",
  },
  {
    title: "Files get deleted by accident",
    body: "A cleared phone, a wiped card, one wrong tap. Originals are the first thing to go and the hardest to recreate.",
  },
  {
    title: "Devices break and get stolen",
    body: "Phones and laptops fail. If the raw files existed in one place, one failure takes years of work with them.",
  },
  {
    title: "Your work outlives any platform",
    body: "Apps change, features disappear, audiences move. Your own copy belongs to your business.",
  },
];

function WhySection() {
  return (
    <section className="border-t border-ink-800/80 py-20 sm:py-28">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
          <Reveal>
            <div>
              <p className="eyebrow">Why it matters</p>
              <h2 className="section-heading mt-3">
                Most creators have exactly one copy of their best work.
              </h2>
              <p className="prose-muted mt-4">
                The footage, photos and files you built an audience on are business assets. They
                belong somewhere you control.
              </p>

              <dl className="mt-8 grid gap-x-6 gap-y-6 sm:grid-cols-2">
                {REASONS.map((reason) => (
                  <div key={reason.title}>
                    <dt className="flex items-center gap-2 text-sm font-semibold text-cream-50">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                      {reason.title}
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-muted">{reason.body}</dd>
                  </div>
                ))}
              </dl>
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
/* Trust                                                                      */
/* -------------------------------------------------------------------------- */

const TRUST = [
  {
    title: "Private by default",
    body: "Your vault is yours alone. No other user can list, open or download your files.",
    icon: "lock" as const,
  },
  {
    title: "Yours to download",
    body: "Every file comes back out whenever you want it, in the format you put in.",
    icon: "download" as const,
  },
  {
    title: "You control what is stored",
    body: "Upload what matters, delete what does not. Nothing is kept without you choosing it.",
    icon: "sliders" as const,
  },
];

function TrustSection() {
  return (
    <section className="border-t border-ink-800/80 py-16 sm:py-20">
      <div className="container-page">
        <div className="grid gap-4 sm:grid-cols-3">
          {TRUST.map((item, index) => (
            <Reveal key={item.title} delay={index * 80}>
              <div className="edge-glow h-full rounded-2xl border border-ink-700 bg-ink-850/70 p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800 text-gold-400">
                  <TrustIcon name={item.icon} />
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
/* Pricing                                                                    */
/* -------------------------------------------------------------------------- */

const PLAN_CONTEXT: Record<string, string> = {
  free: "Protect your most important work",
  creator: "For active creators",
  pro: "For creators with growing libraries",
};

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 border-t border-ink-800/80 py-20 sm:py-28">
      <div className="container-page">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow justify-center">Pricing</p>
            <h2 className="section-heading mt-3">Start free. Upgrade when you outgrow it.</h2>
            <p className="prose-muted mt-4">Change plan at any time.</p>
          </div>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 lg:grid-cols-3">
          {PLAN_ORDER.map((tier, index) => {
            const plan = PLANS[tier];
            const featured = tier === "creator";
            return (
              <Reveal key={tier} delay={index * 90}>
                <div
                  className={`relative h-full overflow-hidden rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1 ${
                    featured
                      ? "border-2 border-gold-400/70 bg-ink-850"
                      : "border border-ink-700 bg-ink-850/70"
                  }`}
                >
                  {featured && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-40 blur-3xl"
                      style={{ background: "radial-gradient(circle, rgba(255,176,31,0.7), transparent 70%)" }}
                    />
                  )}

                  <h3 className="relative text-lg font-semibold text-cream-50">{plan.name}</h3>
                  <p className="relative mt-1 text-sm text-muted">{PLAN_CONTEXT[tier]}</p>

                  <p
                    className={`relative mt-6 text-4xl font-semibold tracking-tight ${
                      featured ? "text-gradient" : "text-cream-50"
                    }`}
                  >
                    {plan.storageLabel}
                  </p>
                  <p className="relative text-sm text-muted">of private storage</p>

                  <ul className="relative mt-6 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2.5 text-sm text-cream-300">
                        <CheckIcon />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className={featured ? "btn-primary relative mt-7 w-full" : "btn-secondary relative mt-7 w-full"}
                  >
                    {tier === "free" ? "Start free" : `Choose ${plan.name}`}
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
          Paid plans are billed through Paddle, our payment provider. Pricing is confirmed at
          checkout.
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

/* -------------------------------------------------------------------------- */
/* FAQ                                                                        */
/* -------------------------------------------------------------------------- */

const FAQS = [
  {
    q: "Does this automatically back up my Instagram or YouTube?",
    a: "No. Creator Vault does not connect to social platforms and does not import anything automatically. You choose the files you want protected and upload them yourself.",
  },
  {
    q: "Can anyone else see my files?",
    a: "No. Your vault is private. Files are stored in a private location and each file is locked to your account, so no other user can list, open or download them.",
  },
  {
    q: "What kinds of files can I upload?",
    a: "Videos, photos, thumbnails, audio, PDFs and documents, plus text files like scripts and subtitles. Individual files can be up to 5 GB.",
  },
  {
    q: "Can I download my files whenever I want?",
    a: "Yes. Every file in your vault can be downloaded at any time, and you can delete anything permanently whenever you choose.",
  },
  {
    q: "What happens if I stop paying?",
    a: "Your account moves back to the Free plan allowance. You keep access to your vault and can still download your files.",
  },
  {
    q: "How do I pay?",
    a: "Paid plans are handled by Paddle, which supports common payment methods for creators in India including UPI, as well as international cards.",
  },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-ink-800/80 py-20 sm:py-28">
      <div className="container-page">
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow">FAQ</p>
            <h2 className="section-heading mt-3">Questions creators ask first.</h2>
          </div>
        </Reveal>

        <div className="mt-10 grid max-w-4xl gap-3">
          {FAQS.map((item, index) => (
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

function FinalCta({ signedIn }: { signedIn: boolean }) {
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
            <h2 className="section-heading relative">Keep your own copy of your best work.</h2>
            <p className="prose-muted relative mx-auto mt-4 max-w-md">
              Upload what matters. Get it back whenever you need it.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={signedIn ? "/dashboard" : "/signup"}
                className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto"
              >
                {signedIn ? "Go to my vault" : "Protect My Content"}
              </Link>
              {!signedIn && (
                <Link href="/login" className="btn-secondary w-full px-7 py-3.5 text-base sm:w-auto">
                  I already have an account
                </Link>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
