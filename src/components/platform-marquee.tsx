import { PLATFORMS } from "@/components/platform-icons";
import { getDictionary } from "@/lib/i18n";

/** Base-language copy. One lookup point, so a locale is a file, not a hunt. */
const en = getDictionary();

/**
 * The running banner Ravi sketched — with the claim removed.
 *
 * His note read "Join thousands of other content creators from other major
 * platforms". We have no verified users, so that sentence would be a
 * fabricated adoption metric on a public page. The motion and the platform
 * strip are his idea and are kept; the wording states only what is true — the
 * platforms this is meant for. Put the real number back the day there is one.
 *
 * Two things about the geometry are load-bearing, and both were wrong once:
 *
 * 1. `translateX(-50%)` loops seamlessly only while half the track equals the
 *    repeat period. So the gutter between repetitions lives INSIDE each half
 *    (`pr-*` matching the internal `gap-*`) and the track itself carries no
 *    gap. With a gap on the track the strip skipped by exactly that gap — 28px
 *    at desktop — once per cycle. Equal half widths are NOT sufficient to check
 *    this; compare half width against trackWidth / 2.
 * 2. One half must be wider than the widest viewport, or the band empties as
 *    the track scrolls left. With a single repetition per half, 52% of a 1440px
 *    band was blank by the end of the cycle. Hence three repetitions.
 *
 * Only the first repetition of the first half is announced; everything else is
 * aria-hidden, so the five names are read once rather than six times. The whole
 * thing stops under prefers-reduced-motion (see globals.css).
 */

const REPEATS = [0, 1, 2];

export function PlatformMarquee() {
  return (
    <section
      aria-label="Platforms this is built for"
      className="border-y border-ink-800/80 bg-ink-900/40 py-5"
    >
      <p className="container-page mb-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {en.marquee.lead}
      </p>

      <div className="marquee-mask relative overflow-hidden">
        {/* No gap on the track — see (1) above. */}
        <div className="marquee-track flex w-max items-center">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex items-center gap-10 pr-10 sm:gap-14 sm:pr-14"
              aria-hidden={copy === 1 ? "true" : undefined}
            >
              {REPEATS.map((rep) => (
                <div
                  key={rep}
                  className="flex items-center gap-10 sm:gap-14"
                  aria-hidden={rep > 0 ? "true" : undefined}
                >
                  {PLATFORMS.map((platform) => (
                    <span
                      key={`${copy}-${rep}-${platform.id}`}
                      className="flex shrink-0 items-center gap-2.5 text-cream-300"
                    >
                      <platform.Icon className="h-5 w-5" />
                      <span className="text-sm font-medium tracking-tight">{platform.name}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="container-page mt-4 text-center text-xs leading-relaxed text-muted">
        {en.marquee.disclaimer}
      </p>
    </section>
  );
}
