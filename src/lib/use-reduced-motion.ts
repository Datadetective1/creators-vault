"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/**
 * Whether the viewer has asked for reduced motion.
 *
 * useSyncExternalStore rather than an effect + setState: the preference is
 * external state, it can change mid-session, and this avoids both a flash of
 * animation on load and a setState during effect.
 *
 * Server snapshot is `false` so markup matches the common case; a viewer who
 * does prefer reduced motion gets the correct value on hydration.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
