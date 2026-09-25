"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

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
 * moves.
 */

const CYCLE_MS = 1900;

export function ContentEquation({ lines }: { lines: readonly string[] }) {
  const reduced = usePrefersReducedMotion();
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
        const lit = reduced || index === active;
        return (
          <span
            key={line}
            className={`block transition-[opacity,transform,filter] duration-700 ease-out ${
              lit
                ? "text-gradient opacity-100 [transform:translateZ(0)]"
                : "text-cream-50/35 opacity-60 blur-[0.4px]"
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
