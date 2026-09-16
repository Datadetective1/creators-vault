import Link from "next/link";

import { MediaTile } from "@/components/media-tile";
import { Reveal } from "@/components/reveal";
import { HERO_TILES } from "@/lib/media";

/**
 * Split hero: the promise on the left, the creator's own content on the right.
 *
 * The backdrop is a 6-second VP8 loop (≈130 KB) that drifts slowly. It is
 * muted, playsInline and poster-backed, so a browser that blocks autoplay — or
 * a user on reduced motion — simply sees the poster frame and loses nothing.
 */
export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative overflow-hidden pb-14 pt-6 sm:pb-24 sm:pt-14">
      <HeroBackdrop />

      <div className="container-page relative">
        {/*
         * On a phone the DOM order is headline -> media -> supporting copy, so
         * the first screen is visual rather than a wall of text. On large
         * screens explicit grid placement restores the classic split: all copy
         * on the left, media on the right.
         */}
        <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10">
          <div className="text-center lg:col-start-1 lg:row-start-1 lg:text-left">
            <Reveal>
              <p className="eyebrow justify-center lg:justify-start">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-gold-400" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-400" />
                </span>
                Early access for creators
              </p>
            </Reveal>

            <Reveal delay={70}>
              <h1 className="display mt-4 text-[1.75rem] leading-[1.1] sm:text-[2.6rem] lg:text-[3.3rem]">
                Your content is your business.
                <span className="mt-1.5 block text-gradient">
                  Protect the work behind your brand.
                </span>
              </h1>
            </Reveal>
          </div>

          <Reveal delay={160} className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <HeroCollage />
          </Reveal>

          <div className="text-center lg:col-start-1 lg:row-start-2 lg:text-left">
            <Reveal delay={140}>
              <p className="prose-muted mx-auto max-w-lg lg:mx-0">
                Your best work shouldn&rsquo;t live in only one place. Keep an independent copy
                of the videos, photos and files your audience is built on.
              </p>
            </Reveal>

            <Reveal delay={210}>
              <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href={signedIn ? "/dashboard" : "/signup"}
                  className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto"
                >
                  {signedIn ? "Go to my vault" : "Protect My Content"}
                </Link>
                <Link
                  href="#how-it-works"
                  className="btn-secondary w-full px-7 py-3.5 text-base sm:w-auto"
                >
                  See how it works
                </Link>
              </div>
            </Reveal>

            <Reveal delay={280}>
              <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted lg:justify-start">
                <TrustPoint>Start free with 5 GB</TrustPoint>
                <TrustPoint>Private by default</TrustPoint>
                <TrustPoint>Download anytime</TrustPoint>
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" fill="none">
        <path
          d="M3.5 8.5l3 3 6-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {children}
    </li>
  );
}

/** Slow-drifting gradient video behind the whole hero. */
function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <video
        className="h-full w-full object-cover opacity-60"
        poster="/media/hero-poster.webp"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        // A background loop is decoration: keep it out of the a11y tree and off
        // the tab order.
        tabIndex={-1}
        aria-hidden="true"
      >
        <source src="/media/hero-loop.webm" type="video/webm" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900/45 via-ink-900/65 to-ink-900" />
    </div>
  );
}

/**
 * Three tiles arranged as a creator's content, plus a floating "Protected"
 * chip. Sized in a fixed aspect box so nothing reflows as the images decode.
 */
function HeroCollage() {
  const [reel, podcast, video] = HERO_TILES;

  return (
    <div className="relative mx-auto aspect-[4/3.6] w-full max-w-[30rem] sm:max-w-[34rem] lg:max-w-none">
      {/* glow behind the stack */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[75%] w-[75%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,61,127,0.4), rgba(123,47,247,0.28) 45%, transparent 70%)",
        }}
      />

      {/* tall reel, front-left */}
      <div
        className="animate-drift-slow absolute left-0 top-[6%] w-[46%]"
        style={{ "--tilt": "-4deg" } as React.CSSProperties}
      >
        <MediaTile
          item={reel!}
          priority
          sizes="(max-width: 640px) 46vw, 220px"
          className="aspect-[9/16] shadow-2xl shadow-black/60 ring-1 ring-white/10"
        />
      </div>

      {/* square podcast, back-right */}
      <div
        className="animate-drift absolute right-[2%] top-0 w-[40%]"
        style={{ animationDelay: "-2.4s" }}
      >
        <MediaTile
          item={podcast!}
          priority
          sizes="(max-width: 640px) 40vw, 190px"
          className="aspect-square shadow-2xl shadow-black/60 ring-1 ring-white/10"
        />
      </div>

      {/* wide video, front-right */}
      <div
        className="animate-drift-slow absolute bottom-[8%] right-0 w-[56%]"
        style={{ "--tilt": "3deg", animationDelay: "-5s" } as React.CSSProperties}
      >
        <MediaTile
          item={video!}
          priority
          sizes="(max-width: 640px) 56vw, 270px"
          className="aspect-video shadow-2xl shadow-black/60 ring-1 ring-white/10"
        />
      </div>

      {/* protected chip */}
      <div
        className="animate-drift absolute bottom-[1%] left-[2%] z-20"
        style={{ animationDelay: "-1.2s" }}
      >
        <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold text-cream-50 shadow-xl shadow-black/50">
          <LockIcon />
          Protected in your vault
        </span>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-mint-400" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.75 7V5.25a2.25 2.25 0 014.5 0V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
