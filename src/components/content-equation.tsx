"use client";

import { useEffect, useState } from "react";

import { useIsHydrated, usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Ravi's three lines, cycling.
 *
 * All three are always in the DOM. Only their emphasis animates — the inactive
 * lines dim rather than unmount — because a headline that mounts and unmounts
 * its own words is a headline a screen reader announces three times, a crawler
 * sees one third of, and a visitor with JavaScript blocked never finishes
 * reading. Dimming gets the "one at a time" beat Ravi asked for without any of
 * that.
 *
 * Under prefers-reduced-motion every line sits at full emphasis and nothing
 * moves. Same before hydration: the cycle is the only thing that ever lifts a
 * dimmed line, so shipping the dim state in the server markup would leave two
 * of the three lines permanently faint for a visitor with JavaScript off or a
 * bundle that never arrived. All three start lit and dimming begins only once
 * the client is actually driving.
 */

const CYCLE_MS = 1900;

export function ContentEquation({ lines }: { lines: readonly string[] }) {
  const reduced = usePrefersReducedMotion();
  const hydrated = useIsHydrated();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced || lines.length < 2) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % lines.length),
      CYCLE_MS,
    );
    return () => window.clearInterval(timer);
  }, [reduced, lines.length]);

  return (
    <span className="block">
      {lines.map((line, index) => {
        const lit = reduced || !hydrated || index === active;
        return (
          <span
            key={line}
            className={`block transition-[opacity,transform] duration-700 ease-out ${
              // The dim state still has to clear 3:1 as large text — it is real
              // copy, not decoration. A single alpha, no stacked opacity/blur.
              lit ? "text-gradient [transform:translateZ(0)]" : "text-cream-50/70"
            }`}
            style={lit ? undefined : { transform: "scale(0.985)" }}
          >
            {line}
          </span>
        );
      })}
    </span>
  );
}
