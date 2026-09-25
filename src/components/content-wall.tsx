import { MediaTile } from "@/components/media-tile";
import { Reveal } from "@/components/reveal";
import { CONTENT_WALL } from "@/lib/media";

/**
 * "All of this can live in your vault."
 *
 * Desktop gets a real masonry column flow so the mixed aspect ratios interlock
 * rather than sitting in a rigid grid. Phones get a two-row swipeable rail
 * instead — stacking twelve tiles vertically would bury the rest of the page.
 */
export function ContentWall() {
  const [topRow, bottomRow] = [CONTENT_WALL.slice(0, 6), CONTENT_WALL.slice(6)];

  return (
    <section id="what-you-can-protect" className="scroll-mt-24 py-20 sm:py-28">
      <div className="container-page">
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow">What you can protect</p>
            <h2 className="section-heading mt-3">
              All of this can live in your vault.
            </h2>
            <p className="prose-muted mt-4 max-w-xl">
              Video, photos, audio, artwork, documents — whatever your business would miss.
            </p>
          </div>
        </Reveal>
      </div>

      {/* --- phone: two swipeable rails --- */}
      <Reveal delay={80} className="mt-10 space-y-3 md:hidden">
        <div className="container-page">
          {/* A scroll container needs a tab stop, or its overflow is
              unreachable without a pointer. globals.css already paints the
              gold ring on [tabindex]:focus-visible. */}
          <div
            className="rail pb-1"
            tabIndex={0}
            role="group"
            aria-label="Content you can protect, row 1 of 2"
          >
            {topRow.map((item) => (
              <div key={item.src} className="rail-item w-[42vw] max-w-[11rem]">
                {/* 42vw and max-w-[11rem] meet at 419px; above that the tile is
                    a fixed 176px. Keeping the 42vw term holds 384w in the
                    srcset for the narrow case. */}
                <MediaTile
                  item={item}
                  sizes="(max-width: 419px) 42vw, 176px"
                  className="aspect-[9/14]"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="container-page">
          <div
            className="rail pb-1"
            tabIndex={0}
            role="group"
            aria-label="Content you can protect, row 2 of 2"
          >
            {bottomRow.map((item) => (
              <div key={item.src} className="rail-item w-[42vw] max-w-[11rem]">
                <MediaTile
                  item={item}
                  sizes="(max-width: 419px) 42vw, 176px"
                  className="aspect-[9/14]"
                />
              </div>
            ))}
          </div>
        </div>
        <p className="container-page pt-1 text-xs text-muted">Swipe or scroll to see more &rarr;</p>
      </Reveal>

      {/* --- tablet and up: masonry --- */}
      <div className="container-page mt-12 hidden md:block">
        <div className="columns-2 gap-4 md:columns-3">
          {CONTENT_WALL.map((item, index) => (
            <Reveal
              key={item.src}
              delay={(index % 4) * 70}
              className="mb-4 break-inside-avoid"
            >
              <MediaTile
                item={item}
                sizes="(max-width: 1024px) 45vw, 30vw"
                className="w-full"
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
