import Image from "next/image";

import { MediaTile } from "@/components/media-tile";
import { Reveal } from "@/components/reveal";
import { VaultFlow } from "@/components/vault-flow";
import { CONTENT_WALL } from "@/lib/media";

/**
 * Three steps, each carrying its own visual so the pictures do the explaining
 * and the copy stays to one line.
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-t border-ink-800/80 py-20 sm:py-28">
      <div className="container-page">
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="section-heading mt-3">Three steps. No technical setup.</h2>
            <p className="prose-muted mt-4 max-w-xl">
              You choose what to protect and upload it yourself. Creator Vault never connects to
              Instagram, YouTube or TikTok, and never posts anything anywhere.
            </p>
          </div>
        </Reveal>

        {/* The product, animated. */}
        <Reveal delay={80}>
          <div className="mt-12 rounded-3xl border border-ink-700 bg-ink-850/60 p-5 sm:p-8">
            <VaultFlow />
          </div>
        </Reveal>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Reveal delay={0}>
            <Step
              number="01"
              title="Choose your valuable content"
              body="Pick the work your business would miss."
            >
              <GalleryVisual />
            </Step>
          </Reveal>

          <Reveal delay={90}>
            <Step
              number="02"
              title="Upload to your private vault"
              body="Straight from your phone or computer."
            >
              <UploadVisual />
            </Step>
          </Reveal>

          <Reveal delay={180}>
            <Step
              number="03"
              title="Get it back whenever you need it"
              body="Download or delete any file, any time."
            >
              <VaultVisual />
            </Step>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Step({
  number,
  title,
  body,
  children,
}: {
  number: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 transition-colors hover:border-ink-600">
      <div className="relative h-40 overflow-hidden bg-ink-800 sm:h-44">{children}</div>
      <div className="p-5">
        <span className="text-xs font-semibold tracking-widest text-gold-400">{number}</span>
        <h3 className="mt-2 text-base font-semibold text-cream-50">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Step visuals                                                               */
/* -------------------------------------------------------------------------- */

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

function UploadVisual() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
      <div className="w-full max-w-[12rem] rounded-xl border border-ink-600 bg-ink-850 p-3">
        <div className="flex items-center gap-2">
          <MediaTile
            item={CONTENT_WALL[0]!}
            showBadge={false}
            sizes="32px"
            className="h-9 w-7 shrink-0"
            // A thumbnail standing in for "a file" inside a mock upload card:
            // announcing the photograph's full description would describe
            // scenery the diagram is not about.
            alt=""
          />
          <div className="min-w-0 flex-1">
            <div className="h-1.5 w-16 rounded-full bg-ink-600" />
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
              <span className="animate-sweep block h-full w-1/2 rounded-full bg-gold-400" />
            </div>
          </div>
        </div>
      </div>
      <span className="badge text-gold-300">Uploading&hellip;</span>
    </div>
  );
}

function VaultVisual() {
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
      <span className="absolute bottom-3 right-3 badge text-mint-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        Protected
      </span>
    </div>
  );
}
