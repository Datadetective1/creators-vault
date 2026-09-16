"use client";

import { useEffect, useRef } from "react";

import { useIsHydrated, usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Creator-at-work footage behind the whole hero, dimmed so the headline stays
 * the loudest thing on screen. Credit: Ivan S via Pexels — see
 * public/media/CREDITS.md.
 *
 * A real person moving behind the copy is exactly what a reduced-motion
 * preference is asking us not to do, so motion here is opt-in rather than
 * opt-out. The element ships WITHOUT `autoplay` and without sources: the
 * server cannot know the preference, and an SSR `autoplay` would start the
 * fetch at parse time and have the whole loop down before any effect could
 * pause it. Under reduced motion the loop is therefore never requested at all
 * and the poster is the entire backdrop. The preference can change mid-session,
 * so it is applied in an effect rather than only at mount.
 */
export function HeroBackdrop() {
  const reduced = usePrefersReducedMotion();
  const hydrated = useIsHydrated();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reduced) {
      video.pause();
      video.currentTime = 0;
      return;
    }
    // The <source> children appear only after hydration, and appending them
    // does not by itself restart resource selection — the element already
    // finished with no source and sits at NETWORK_EMPTY. load() is what makes
    // it look again; without it play() rejects and only the poster is ever
    // shown.
    if (video.networkState === video.NETWORK_EMPTY) video.load();
    // Autoplay policies may decline; a rejection just leaves the poster up.
    video.play().catch(() => {});
  }, [reduced, hydrated]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <video
        ref={videoRef}
        className="h-full w-full object-cover opacity-70"
        poster="/media/hero-creator-poster.webp"
        muted
        loop
        playsInline
        preload={reduced ? "none" : "metadata"}
        // A background loop is decoration: keep it out of the a11y tree and off
        // the tab order.
        tabIndex={-1}
        aria-hidden="true"
      >
        {/* Held back until the client confirms motion is welcome — see the
            component comment for why `autoplay` and the sources cannot ship in
            the server markup. */}
        {hydrated && !reduced && (
          <>
            <source src="/media/hero-creator.webm" type="video/webm" />
            <source src="/media/hero-creator.mp4" type="video/mp4" />
          </>
        )}
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900/55 via-ink-900/70 to-ink-900" />
      {/* Keep the left column legible on wide screens where the copy sits over
          the brightest part of the frame. */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink-900/70 via-ink-900/20 to-transparent" />
    </div>
  );
}
