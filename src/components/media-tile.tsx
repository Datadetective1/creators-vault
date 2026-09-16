import Image from "next/image";

import type { MediaItem } from "@/lib/media";

const KIND_TINT: Record<string, string> = {
  Reel: "text-magenta-400",
  Video: "text-gold-400",
  Photo: "text-cyan-400",
  Podcast: "text-violet-400",
  Thumbnail: "text-gold-300",
  "Brand Kit": "text-mint-400",
  Script: "text-cream-300",
};

/**
 * One piece of creator content.
 *
 * `priority` is reserved for the tiles above the fold; everything else loads
 * lazily so the content wall costs nothing until it is scrolled to.
 */
export function MediaTile({
  item,
  className = "",
  sizes = "(max-width: 640px) 60vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
  showBadge = true,
}: {
  item: MediaItem;
  className?: string;
  sizes?: string;
  priority?: boolean;
  showBadge?: boolean;
}) {
  return (
    <figure className={`media-tile group ${className}`}>
      <Image
        src={item.src}
        alt={item.alt}
        width={item.width}
        height={item.height}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        className="h-full w-full object-cover"
      />

      {/* Legibility scrim, so chips stay readable over any artwork. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/75 via-transparent to-ink-950/25"
      />

      {showBadge && (
        <figcaption className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2">
          {/* On a narrow tile the two chips compete; the kind label truncates
              so the duration is never clipped. */}
          <span className={`badge min-w-0 ${KIND_TINT[item.kind] ?? "text-cream-200"}`}>
            <KindDot />
            <span className="truncate">{item.kind}</span>
          </span>
          {item.meta && <span className="badge shrink-0 text-cream-200">{item.meta}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function KindDot() {
  return (
    <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
  );
}
