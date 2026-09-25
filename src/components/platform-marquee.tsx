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
 * The track is duplicated once and translated by exactly -50%, which is what
 * makes the loop seamless. The copy is marked aria-hidden on the duplicate so
 * it is announced once, not twice, and the whole thing stops under
 * prefers-reduced-motion (see globals.css).
 */
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
        <div className="marquee-track flex w-max items-center gap-10 sm:gap-14">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="flex items-center gap-10 sm:gap-14"
              aria-hidden={copy === 1 ? "true" : undefined}
            >
              {PLATFORMS.map((platform) => (
                <span
                  key={`${copy}-${platform.id}`}
                  className="flex shrink-0 items-center gap-2.5 text-cream-300"
                >
                  <platform.Icon className="h-5 w-5" />
                  <span className="text-sm font-medium tracking-tight">{platform.name}</span>
                </span>
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
