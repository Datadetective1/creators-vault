"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Creator-at-work footage behind the whole hero, dimmed so the headline stays
 * the loudest thing on screen. Credit: Ivan S via Pexels — see
 * public/media/CREDITS.md.
 *
 * A real person moving behind the copy is exactly what a reduced-motion
 * preference is asking us not to do, so this is a client component: when the
 * preference is on, the loop is held on its first frame (which is also the
 * poster), and the page reads as a still photograph. The preference can change
 * mid-session, so it is applied in an effect rather than only at mount.
 */
export function HeroBackdrop() {
  const reduced = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reduced) {
      video.pause();
      video.currentTime = 0;
    } else {
      // Autoplay policies may have declined before hydration; asking again is
      // harmless and a rejection just leaves the poster in place.
      video.play().catch(() => {});
    }
  }, [reduced]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <video
        ref={videoRef}
        className="h-full w-full object-cover opacity-70"
        poster="/media/hero-creator-poster.webp"
        autoPlay={!reduced}
        muted
        loop
        playsInline
        preload="metadata"
        // A background loop is decoration: keep it out of the a11y tree and off
        // the tab order.
        tabIndex={-1}
        aria-hidden="true"
      >
        <source src="/media/hero-creator.webm" type="video/webm" />
        <source src="/media/hero-creator.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900/55 via-ink-900/70 to-ink-900" />
      {/* Keep the left column legible on wide screens where the copy sits over
          the brightest part of the frame. */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink-900/70 via-ink-900/20 to-transparent" />
    </div>
  );
}
