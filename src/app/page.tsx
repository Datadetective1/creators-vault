import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getCurrentUser } from "@/lib/supabase/server";
import { PLAN_ORDER, PLANS } from "@/lib/plans";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteNav signedIn={Boolean(user)} />
      <main id="main">
        <Hero signedIn={Boolean(user)} />
        <WhySection />
        <HowItWorks />
        <WhatYouCanStore />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Hero                                                                    */
/* -------------------------------------------------------------------------- */

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="hero-glow relative overflow-hidden border-b border-ink-800">
      <div className="container-page relative py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Early access for creators</p>

          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-[2rem] font-semibold leading-[1.14] tracking-tight text-cream-50 sm:text-5xl lg:text-[3.5rem]">
            Your content is your business.{" "}
            <span className="text-gold-400">Protect the work behind your brand.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-cream-300 sm:text-lg">
            Store an independent copy of your most valuable videos, photos and creator assets.
            Access them whenever you need them, even if something happens to your social account.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={signedIn ? "/dashboard" : "/signup"}
              className="btn-primary w-full px-7 py-3 text-base sm:w-auto"
            >
              {signedIn ? "Go to my vault" : "Protect My Content"}
            </Link>
            <Link
              href="#how-it-works"
              className="btn-secondary w-full px-7 py-3 text-base sm:w-auto"
            >
              See how it works
            </Link>
          </div>

          <p className="mt-5 text-sm text-muted">
            Start free with 5&nbsp;GB. No card required to try it.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          <TrustStat value="Private" label="by default — only you can open your files" />
          <TrustStat value="Any device" label="upload from phone or desktop" />
          <TrustStat value="Yours" label="download everything, any time" />
        </div>
      </div>
    </section>
  );
}

function TrustStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-850/70 px-5 py-4 text-center">
      <p className="text-base font-semibold text-gold-400">{value}</p>
      <p className="mt-1 text-sm leading-snug text-muted">{label}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Why creators need an independent copy                                   */
/* -------------------------------------------------------------------------- */

const REASONS = [
  {
    title: "Accounts can be lost",
    body: "Accounts get hacked, locked or recovered slowly. If your only copy lives inside an app you do not control, losing access means losing your archive too.",
  },
  {
    title: "Files get deleted by accident",
    body: "A cleared phone, a wiped SD card, a wrong tap during a clean-up. Original footage is usually the first thing to disappear and the hardest to recreate.",
  },
  {
    title: "Devices break and get stolen",
    body: "Phones and laptops fail. If the raw files only ever existed in one place, a single failure takes years of work with it.",
  },
  {
    title: "Your work outlives any one platform",
    body: "Apps change, features get removed, audiences move. Keeping your own copy means your catalogue belongs to your business, not to a platform.",
  },
];

function WhySection() {
  return (
    <section className="border-b border-ink-800 py-20 sm:py-24">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="eyebrow">Why it matters</p>
          <h2 className="section-heading mt-3">
            Most creators have exactly one copy of their best work.
          </h2>
          <p className="prose-muted mt-4">
            The footage, photos and files you have built your audience on are business assets. They
            deserve to be stored somewhere you control.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {REASONS.map((reason) => (
            <div key={reason.title} className="card">
              <h3 className="text-lg font-semibold text-cream-50">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{reason.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. How it works                                                            */
/* -------------------------------------------------------------------------- */

const STEPS = [
  {
    step: "01",
    title: "Create your account",
    body: "Sign up with your email and confirm it. Your vault is ready in under a minute.",
  },
  {
    step: "02",
    title: "Upload what matters most",
    body: "Choose the videos, photos, audio and documents worth protecting, and upload them straight from your phone or computer.",
  },
  {
    step: "03",
    title: "Get it back whenever you need it",
    body: "Everything stays private and organised in your vault. Download any file, any time, or delete it for good when you want.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-ink-800 py-20 sm:py-24">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 className="section-heading mt-3">Three steps. No technical setup.</h2>
          <p className="prose-muted mt-4">
            You choose what to protect and upload it yourself. Creator Vault does not connect to
            Instagram, YouTube or TikTok, and never posts anything anywhere.
          </p>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((item) => (
            <li key={item.step} className="card relative">
              <span className="text-sm font-semibold tracking-widest text-gold-400">
                {item.step}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-cream-50">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. What can be protected                                                   */
/* -------------------------------------------------------------------------- */

const ASSET_TYPES = [
  { title: "Videos", body: "Finished uploads, raw footage, reels and long-form cuts." },
  { title: "Photos", body: "Shoots, product images, behind-the-scenes and press shots." },
  { title: "Thumbnails", body: "Cover art and thumbnail files you may need to reuse." },
  { title: "Audio", body: "Voiceovers, podcast episodes, music beds and interview recordings." },
  { title: "Documents", body: "Contracts, invoices, brand kits, briefs and rate cards." },
  { title: "Captions & text", body: "Scripts, subtitle files, caption drafts and content plans." },
];

function WhatYouCanStore() {
  return (
    <section
      id="what-you-can-store"
      className="scroll-mt-20 border-b border-ink-800 py-20 sm:py-24"
    >
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="eyebrow">What you can protect</p>
          <h2 className="section-heading mt-3">Everything your content business runs on.</h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ASSET_TYPES.map((type) => (
            <div
              key={type.title}
              className="rounded-2xl border border-ink-700 bg-ink-850 p-5 transition-colors hover:border-ink-600"
            >
              <h3 className="text-base font-semibold text-cream-50">{type.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{type.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Pricing                                                                 */
/* -------------------------------------------------------------------------- */

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-b border-ink-800 py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Pricing</p>
          <h2 className="section-heading mt-3">Start free. Upgrade when you outgrow it.</h2>
          <p className="prose-muted mt-4">
            Pick the amount of storage that fits your catalogue. You can change plan at any time.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-3">
          {PLAN_ORDER.map((tier) => {
            const plan = PLANS[tier];
            const featured = tier === "creator";
            return (
              <div
                key={tier}
                className={
                  featured
                    ? "relative rounded-2xl border-2 border-gold-400 bg-ink-850 p-6"
                    : "relative rounded-2xl border border-ink-700 bg-ink-850 p-6"
                }
              >
                {featured && (
                  <span className="absolute -top-3 left-6 rounded-full bg-gold-400 px-3 py-1 text-xs font-semibold text-ink-950">
                    Most popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-cream-50">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted">{plan.tagline}</p>

                <p className="mt-5 text-3xl font-semibold tracking-tight text-gold-400">
                  {plan.storageLabel}
                </p>
                <p className="text-sm text-muted">of private storage</p>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm text-cream-300">
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={featured ? "btn-primary mt-7 w-full" : "btn-secondary mt-7 w-full"}
                >
                  {tier === "free" ? "Start free" : `Choose ${plan.name}`}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
          Paid plans are billed through Paddle, our payment provider. Pricing for the pilot is
          confirmed at checkout.
        </p>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0 text-gold-400"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. FAQ                                                                     */
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
    <section id="faq" className="scroll-mt-20 border-b border-ink-800 py-20 sm:py-24">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="eyebrow">FAQ</p>
          <h2 className="section-heading mt-3">Questions creators ask first.</h2>
        </div>

        <div className="mt-12 grid max-w-4xl gap-3">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-ink-700 bg-ink-850 px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-cream-50">
                {item.q}
                <span className="shrink-0 text-gold-400 transition-transform group-open:rotate-45">
                  <PlusIcon />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
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
/* 7. Final CTA                                                               */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="py-20 sm:py-24">
      <div className="container-page">
        <div className="hero-glow relative overflow-hidden rounded-3xl border border-ink-700 bg-ink-850 px-6 py-14 text-center sm:px-12">
          <h2 className="section-heading relative">Keep your own copy of your best work.</h2>
          <p className="prose-muted relative mx-auto mt-4 max-w-xl">
            Create a free account and upload the files your business would miss most.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary px-7 py-3 text-base">
              Protect My Content
            </Link>
            <Link href="/login" className="btn-secondary px-7 py-3 text-base">
              I already have an account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
