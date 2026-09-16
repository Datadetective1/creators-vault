"use client";

import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Reveals its children once they scroll into view.
 *
 * Three things keep this safe rather than merely pretty, because the hidden
 * state is `opacity: 0` and a section that never reveals is a section nobody
 * can read:
 *
 *  1. `threshold: 0` — any visible pixel counts. A threshold based on a
 *     fraction of the element can never be met by an element taller than the
 *     viewport, which silently stranded several sections.
 *  2. A rect-based sweep on scroll, throttled to one animation frame, as a
 *     backstop for intersections the observer coalesces away during fast or
 *     programmatic scrolling.
 *  3. The styles themselves are gated on `html[data-js="1"]`, so if the bundle
 *     never runs the page renders fully visible instead of blank.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (reduced) return;

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    let done = false;
    let frame = 0;

    // Anything at or above the fold counts as seen.
    const isInView = () => {
      const rect = node.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.94 && rect.bottom > 0;
    };

    const detach = () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };

    const finish = () => {
      if (done) return;
      done = true;
      setSeen(true);
      detach();
    };

    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (isInView()) finish();
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) finish();
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );
    observer.observe(node);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Already on screen at mount (above the fold, or a deep link).
    onScroll();

    return detach;
  }, [reduced]);

  // Reduced motion never hides anything in the first place.
  const revealed = reduced || seen;

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      data-revealed={revealed ? "true" : undefined}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
