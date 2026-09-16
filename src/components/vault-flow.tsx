"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { CONTENT_WALL } from "@/lib/media";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * The product, shown rather than described: a reel leaves the phone, uploads,
 * and lands protected in the vault.
 *
 * Driven by a single step counter on a timer rather than by a chain of CSS
 * delays, so the three panels stay in sync and the loop can be paused when off
 * screen. Honours prefers-reduced-motion by settling on the final state.
 */

const STEPS = ["Choose", "Uploading", "Protected"] as const;
const STEP_MS = 2600;

const CLIP = CONTENT_WALL[0]!;

export function VaultFlow() {
  const reduced = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(true);

  useEffect(() => {
    if (reduced) return;

    // Pause the loop while the section is off screen — no point animating into
    // an empty viewport, and it keeps the tab cheap.
    const node = containerRef.current;
    let observer: IntersectionObserver | undefined;
    if (node && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          visibleRef.current = entry?.isIntersecting ?? true;
        },
        { threshold: 0.2 },
      );
      observer.observe(node);
    }

    const timer = window.setInterval(() => {
      if (visibleRef.current) setTick((current) => current + 1);
    }, STEP_MS);

    return () => {
      window.clearInterval(timer);
      observer?.disconnect();
    };
  }, [reduced]);

  // Reduced motion settles on the outcome rather than cycling.
  const step = reduced ? 2 : tick % STEPS.length;
  const uploading = step === 1;
  const protectedNow = step === 2;

  return (
    <div ref={containerRef} className="relative mx-auto max-w-4xl">
      <div className="grid items-center gap-5 sm:gap-4 md:grid-cols-[1fr_auto_1fr]">
        <PhonePanel active={step === 0} dimmed={step > 0} />

        <FlowArrow uploading={uploading} done={protectedNow} />

        <VaultPanel uploading={uploading} protectedNow={protectedNow} />
      </div>

      {/* Step labels double as the accessible description of the animation. */}
      <ol
        className="mt-7 flex items-center justify-center gap-2"
        aria-label="How a file reaches your vault"
      >
        {STEPS.map((label, index) => (
          <li key={label}>
            <span
              aria-current={index === step ? "step" : undefined}
              className={
                index === step
                  ? "badge border-gold-400/50 text-gold-300"
                  : "badge text-muted opacity-60"
              }
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      {reduced && <span className="sr-only">Animation paused because reduced motion is on.</span>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PhonePanel({ active, dimmed }: { active: boolean; dimmed: boolean }) {
  return (
    <div
      className={`relative mx-auto w-full max-w-[13rem] transition-opacity duration-700 ${
        dimmed ? "opacity-55" : "opacity-100"
      }`}
    >
      <div className="rounded-[1.6rem] border border-ink-600 bg-ink-850 p-2.5 shadow-2xl shadow-black/60">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[0.625rem] font-medium text-muted">Your phone</span>
          <span className="h-1 w-6 rounded-full bg-ink-600" />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }, (_, i) => (
            <div
              key={i}
              className={`aspect-[9/13] overflow-hidden rounded-md ${
                i === 0 ? "ring-2 ring-gold-400 ring-offset-1 ring-offset-ink-850" : ""
              }`}
            >
              {i === 0 ? (
                <Image
                  src={CLIP.src}
                  alt=""
                  width={CLIP.width}
                  height={CLIP.height}
                  sizes="60px"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-ink-700/70" />
              )}
            </div>
          ))}
        </div>
      </div>

      {active && (
        <span className="absolute -right-2 -top-2 badge border-gold-400/50 text-gold-300">
          Selected
        </span>
      )}
    </div>
  );
}

function FlowArrow({ uploading, done }: { uploading: boolean; done: boolean }) {
  return (
    <div className="relative mx-auto flex h-14 w-full max-w-[9rem] items-center justify-center md:h-44 md:w-20">
      {/* track */}
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink-600 md:inset-y-0 md:left-1/2 md:h-auto md:w-px md:-translate-x-1/2 md:translate-y-0" />

      {/* travelling pulse, only while uploading */}
      {uploading && (
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 overflow-hidden md:inset-y-0 md:left-1/2 md:h-auto md:w-px md:-translate-x-1/2 md:translate-y-0">
          <span className="animate-sweep block h-px w-1/2 bg-gradient-to-r from-transparent via-gold-400 to-transparent md:h-1/2 md:w-px md:bg-gradient-to-b" />
        </div>
      )}

      <span
        className={`glass relative z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-500 ${
          done ? "text-mint-400" : uploading ? "text-gold-400" : "text-muted"
        }`}
      >
        {done ? <CheckIcon /> : <UploadIcon />}
      </span>
    </div>
  );
}

function VaultPanel({ uploading, protectedNow }: { uploading: boolean; protectedNow: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[20rem]">
      <div className="edge-glow rounded-2xl border border-ink-700 bg-ink-850 p-3 shadow-2xl shadow-black/60">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[0.6875rem] font-semibold text-cream-200">My Vault</span>
          <span className="text-[0.625rem] text-muted">
            {protectedNow || uploading ? "4 files" : "3 files"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {/* the arriving clip */}
          <div
            className={`relative aspect-[9/13] overflow-hidden rounded-md transition-all duration-700 ${
              uploading || protectedNow
                ? "scale-100 opacity-100"
                : "scale-90 opacity-0"
            }`}
          >
            <Image
              src={CLIP.src}
              alt=""
              width={CLIP.width}
              height={CLIP.height}
              sizes="70px"
              className="h-full w-full object-cover"
            />
            {uploading && (
              <span className="absolute inset-x-0 bottom-0 h-1 bg-ink-950/70">
                <span className="animate-sweep block h-full w-1/2 bg-gold-400" />
              </span>
            )}
            {protectedNow && (
              <span className="absolute inset-0 flex items-center justify-center bg-ink-950/45">
                <span className="text-mint-400">
                  <CheckIcon />
                </span>
              </span>
            )}
          </div>

          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="aspect-[9/13] rounded-md bg-ink-700/70" />
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink-800/70 px-2.5 py-2">
          <span className={protectedNow ? "text-mint-400" : "text-muted"}>
            <ShieldIcon />
          </span>
          <span className="text-[0.6875rem] font-medium text-cream-200">
            {protectedNow ? "Protected — only you can open this" : "Private storage"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function UploadIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M10 14.5V5m0 0L6.5 8.5M10 5l3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15.5h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path d="M10 2.5l6 2.2v4.6c0 3.5-2.4 6.6-6 7.7-3.6-1.1-6-4.2-6-7.7V4.7l6-2.2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
