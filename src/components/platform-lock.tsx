"use client";

import { LockMark, PRODUCT_NAME } from "@/components/brand";
import { PLATFORMS } from "@/components/platform-icons";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Social content → lock.
 *
 * The idea Ravi drew: the platforms a creator publishes on sit around the
 * edge, then draw inward and disappear into the lock, which absorbs them. It
 * says "everything you make out there ends up safe in here" without a caption.
 *
 * Built from transform/opacity only, on staggered CSS keyframes rather than a
 * JS timer — five elements animating on the compositor costs nothing, and the
 * whole thing stops dead under prefers-reduced-motion, where the platforms
 * simply rest in their ring and the lock sits still.
 *
 * The ring radius is a single custom property so the geometry scales from a
 * 390px phone to a wide desktop without a second set of coordinates: each
 * platform carries its own unit-circle cos/sin, and the keyframes multiply.
 */

/** Unit-circle positions, evenly spaced from the top, clockwise. */
const ANGLES = [-90, -18, 54, 126, 198];

const PLACED = PLATFORMS.map((platform, index) => {
  const radians = ((ANGLES[index] ?? 0) * Math.PI) / 180;
  return {
    ...platform,
    cx: Math.round(Math.cos(radians) * 1000) / 1000,
    cy: Math.round(Math.sin(radians) * 1000) / 1000,
  };
});

/** One full inflow cycle; each platform is offset by a fifth of it. */
const CYCLE_MS = 6000;

export function PlatformLock({ className = "" }: { className?: string }) {
  const reduced = usePrefersReducedMotion();

  return (
    <div
      className={`relative mx-auto aspect-square w-full max-w-[22rem] ${className}`}
      style={{ ["--ring-r" as string]: "clamp(76px, 27vw, 118px)" }}
    >
      {/* soft field behind the lock */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,176,31,0.30), rgba(123,47,247,0.20) 52%, transparent 72%)",
        }}
      />

      {/* the ring the platforms rest on */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10"
        style={{ width: "calc(var(--ring-r) * 2)", height: "calc(var(--ring-r) * 2)" }}
      />

      {PLACED.map((platform, index) => (
        <div
          key={platform.id}
          className={`absolute left-1/2 top-1/2 -ml-[1.625rem] -mt-[1.625rem] ${
            reduced ? "" : "animate-platform-inflow"
          }`}
          style={
            {
              "--cx": platform.cx,
              "--cy": platform.cy,
              animationDelay: `${(index * CYCLE_MS) / PLACED.length}ms`,
              transform: reduced
                ? "translate(calc(var(--ring-r) * var(--cx)), calc(var(--ring-r) * var(--cy)))"
                : undefined,
            } as React.CSSProperties
          }
        >
          {/*
            aria-hidden: the summary below names all five platforms in a
            sentence. Labelling each chip as well makes a screen reader read the
            list twice over, then a third time at the marquee.
          */}
          <span
            aria-hidden="true"
            className="glass flex items-center justify-center rounded-2xl text-cream-50 shadow-lg shadow-black/40"
            style={{ height: "3.25rem", width: "3.25rem" }}
          >
            <platform.Icon className="h-5 w-5" />
          </span>
        </div>
      ))}

      {/* the lock everything flows into */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span
          className={`relative flex h-24 w-24 items-center justify-center rounded-3xl border border-gold-400/35 bg-ink-900/85 text-gold-400 shadow-2xl shadow-black/60 ${
            reduced ? "" : "animate-lock-absorb"
          }`}
        >
          <LockMark className="h-11 w-11" />
          {!reduced && (
            <span
              aria-hidden="true"
              className="animate-lock-ring absolute inset-0 rounded-3xl border border-gold-400/50"
            />
          )}
        </span>
      </div>

      {/*
        What the picture means, for anyone who cannot see it.

        Worded carefully: the animation shows marks converging on the lock,
        which reads as an import. The product does not import — the creator
        uploads their own copies — so the description says whose copies these
        are and states the denial here rather than leaving it to the FAQ three
        sections below.
      */}
      <p className="sr-only">
        Work a creator publishes on Instagram, Snapchat, Telegram, YouTube and TikTok,
        kept as their own copy in a lock they control. Files are uploaded by the
        creator; {PRODUCT_NAME} does not connect to these platforms.
      </p>
    </div>
  );
}
