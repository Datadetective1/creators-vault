import Image from "next/image";

import { MediaTile } from "@/components/media-tile";
import { Reveal } from "@/components/reveal";
import { en } from "@/lib/i18n/en";
import { CONTENT_WALL } from "@/lib/media";

/**
 * Upload. Secure. Retrieve.
 *
 * There used to be a second, animated phone-to-vault diagram above these
 * cards. Ravi's review called it confusing, and he was right: it explained the
 * same three steps a second time, in different words, directly above the cards
 * that explain them. One explanation now, and its labels are the same three
 * words the hero uses — so the flow a visitor meets at the top is the flow
 * they meet here.
 */
export function HowItWorks() {
  const { eyebrow, heading, intro, items } = en.steps;

  return (
    <section id="how-it-works" className="scroll-mt-24 border-t border-ink-800/80 py-20 sm:py-28">
      <div className="container-page">
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="section-heading mt-3">{heading}</h2>
            <p className="prose-muted mt-4 max-w-xl">{intro}</p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {items.map((item, index) => (
            <Reveal key={item.number} delay={index * 90}>
              <Step number={item.number} label={item.label} body={item.body}>
                {index === 0 && <GalleryVisual />}
                {index === 1 && <SecureVisual />}
                {index === 2 && <RetrieveVisual />}
              </Step>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Step({
  number,
  label,
  body,
  children,
}: {
  number: string;
  label: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 transition-colors hover:border-ink-600">
      <div className="relative h-40 overflow-hidden bg-ink-800 sm:h-44">{children}</div>
      <div className="p-5">
        <span className="text-xs font-semibold tracking-widest text-gold-400">{number}</span>
        <h3 className="mt-2 text-base font-semibold text-cream-50">{label}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Step visuals                                                               */
/* -------------------------------------------------------------------------- */

/** 01 Upload — picking the work, with one selected. */
function GalleryVisual() {
  const picks = [CONTENT_WALL[0]!, CONTENT_WALL[4]!, CONTENT_WALL[8]!];
  return (
    <div className="absolute inset-0 flex items-end justify-center gap-2 px-5 pb-4 pt-6">
      {picks.map((item, i) => (
        <div
          key={item.src}
          className={`relative w-[28%] overflow-hidden rounded-lg ring-1 ring-white/10 transition-transform duration-500 ${
            i === 1 ? "z-10 -translate-y-3 scale-110 group-hover:-translate-y-4" : "opacity-80"
          }`}
        >
          <Image
            src={item.src}
            alt=""
            width={item.width}
            height={item.height}
            sizes="90px"
            className="aspect-[9/14] w-full object-cover"
          />
          {i === 1 && (
            <span className="absolute inset-0 ring-2 ring-inset ring-gold-400" aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}

/** 02 Secure — the file moving into the lock. */
function SecureVisual() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
      <div className="flex w-full max-w-[13rem] items-center gap-3">
        <MediaTile
          item={CONTENT_WALL[0]!}
          showBadge={false}
          sizes="32px"
          className="h-10 w-7 shrink-0"
          // A thumbnail standing in for "a file" inside a diagram: announcing
          // the photograph's full description would describe scenery the
          // diagram is not about.
          alt=""
        />
        <span aria-hidden="true" className="flex-1 text-gold-400/70">
          <svg viewBox="0 0 48 8" className="h-2 w-full" fill="none">
            <path
              d="M0 4h40m0 0l-4-3m4 3l-4 3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="3 3"
            />
          </svg>
        </span>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold-400/40 bg-ink-900 text-gold-400">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path
              d="M8 10.5V8a4 4 0 118 0v2.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <rect
              x="4.5"
              y="10.5"
              width="15"
              height="10"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.8"
            />
          </svg>
        </span>
      </div>
      <span className="badge text-mint-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        Secured
      </span>
    </div>
  );
}

/** 03 Retrieve — the archive, back in the creator's hands. */
function RetrieveVisual() {
  const picks = CONTENT_WALL.slice(0, 6);
  return (
    <div className="absolute inset-0 p-4">
      <div className="grid h-full grid-cols-3 grid-rows-2 gap-1.5">
        {picks.map((item) => (
          <div key={item.src} className="overflow-hidden rounded-md ring-1 ring-white/5">
            <Image
              src={item.src}
              alt=""
              width={item.width}
              height={item.height}
              sizes="70px"
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
      <span className="badge absolute bottom-3 right-3 text-gold-300">
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true">
          <path
            d="M8 2.5v8m0 0l-3-3m3 3l3-3M3 13h10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Download
      </span>
    </div>
  );
}
