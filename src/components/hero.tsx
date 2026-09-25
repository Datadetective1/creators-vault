import Link from "next/link";

import { ContentEquation } from "@/components/content-equation";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { MediaTile } from "@/components/media-tile";
import { PlatformLock } from "@/components/platform-lock";
import { Reveal } from "@/components/reveal";
import { en } from "@/lib/i18n/en";
import { HERO_TILES } from "@/lib/media";

/**
 * Split hero: the promise on the left, the creator's own content on the right.
 *
 * The backdrop is real footage of a creator recording to her phone in a
 * neon-lit studio — a 9-second seamless loop, 720p, ≈620 KB as VP9 with an
 * H.264 fallback, no audio track at all. Motion is opt-in: no autoplay and no
 * sources ship in the server markup, so a viewer who prefers reduced motion
 * never downloads the loop at all (see HeroBackdrop).
 *
 * The right-hand column carries the creator's own work (the collage) and the
 * platforms-into-the-lock animation directly beneath it, so the page states
 * its whole argument — this is your content, this is where it goes — inside
 * the first screen and a half.
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
                {en.hero.eyebrow}
              </p>
            </Reveal>

            <Reveal delay={70}>
              <h1 className="display mt-4 text-[2rem] leading-[1.14] sm:text-[3rem] lg:text-[3.6rem]">
                <ContentEquation lines={en.hero.equation} />
              </h1>
            </Reveal>
          </div>

          <Reveal delay={160} className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <HeroCollage />
          </Reveal>

          <div className="text-center lg:col-start-1 lg:row-start-2 lg:text-left">
            <Reveal delay={140}>
              <p className="mx-auto mt-2 max-w-lg text-balance text-lg font-medium leading-snug text-cream-50 sm:text-xl lg:mx-0">
                {en.hero.support}
              </p>
            </Reveal>

            <Reveal delay={210}>
              <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href={signedIn ? "/dashboard" : "/signup"}
                  className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto"
                >
                  {signedIn ? en.hero.ctaPrimarySignedIn : en.hero.ctaPrimary}
                </Link>
                <Link
                  href="#how-it-works"
                  className="btn-secondary w-full px-7 py-3.5 text-base sm:w-auto"
                >
                  {en.hero.ctaSecondary}
                </Link>
              </div>
            </Reveal>

            <Reveal delay={280}>
              <ProcessLabels steps={en.hero.steps} />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Upload → Secure → Retrieve anytime.
 *
 * An ordered list, because it is one: the arrows are decoration for sighted
 * readers and the numbering carries the sequence for everyone else. The same
 * three words label the detailed steps further down the page, so a visitor who
 * scrolls never meets a second, differently-worded version of the same flow.
 */
function ProcessLabels({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="mt-7 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 lg:justify-start">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-2.5">
          {index > 0 && (
            <span aria-hidden="true" className="text-gold-400/70">
              <ArrowRight />
            </span>
          )}
          <span className="glass rounded-full px-3.5 py-1.5 text-sm font-semibold text-cream-50">
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path
        d="M2.5 8h11m0 0l-4-4m4 4l-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The creator's own content, then the lock that content flows into.
 */
function HeroCollage() {
  const [reel, podcast, video] = HERO_TILES;

  return (
    <div className="space-y-6">
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
            // Real box is 228 CSS px; 190 left this tile at 1.68x on retina.
            sizes="(max-width: 640px) 40vw, 240px"
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
            <LockChipIcon />
            Protected in your vault
          </span>
        </div>
      </div>

      {/* social content -> lock */}
      <PlatformLock />
    </div>
  );
}

function LockChipIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-mint-400" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.75 7V5.25a2.25 2.25 0 014.5 0V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
