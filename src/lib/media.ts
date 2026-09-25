/**
 * The landing page's media catalogue.
 *
 * Every tile is real creator photography, sourced under the Pexels License and
 * imported by `scripts/ingest-photos.mjs` from `scripts/photo-manifest.json`.
 * Provenance for each file — source page, photographer, licence — is written to
 * `public/media/CREDITS.md` by the same script; the manifest is the place to
 * change a picture, not this file.
 *
 * `swapHint` is the brief each slot was cast against, kept so a future swap
 * stays on-brief and at the same aspect ratio without any layout change.
 */

export type MediaKind = "Reel" | "Video" | "Photo" | "Podcast" | "Thumbnail" | "Brand Kit" | "Script";

export interface MediaItem {
  src: string;
  /** Intrinsic size, so the browser can reserve space and avoid layout shift. */
  width: number;
  height: number;
  kind: MediaKind;
  alt: string;
  /** Shown as a duration chip on video and audio tiles. */
  meta?: string;
  swapHint: string;
}

export const CONTENT_WALL: MediaItem[] = [
  {
    src: "/media/photos/reel-01.webp",
    width: 540,
    height: 960,
    kind: "Reel",
    alt: "Creator in a striped top adjusting her phone on a tripod beside a ring light",
    meta: "0:28",
    swapHint: "Vertical 9:16 photo of a creator filming themselves on a phone",
  },
  {
    src: "/media/photos/video-01.webp",
    width: 960,
    height: 540,
    kind: "Video",
    alt: "Creator at a yellow desk reaching for her phone on a tripod, video edit open on the laptop",
    meta: "12:04",
    swapHint: "16:9 photo of a creator editing footage on a laptop",
  },
  {
    src: "/media/photos/photo-01.webp",
    width: 720,
    height: 720,
    kind: "Photo",
    alt: "Smiling young photographer lining up a shot with a mirrorless camera in a dark studio",
    swapHint: "Square photo from a real shoot — portrait or product",
  },
  {
    src: "/media/photos/podcast-01.webp",
    width: 720,
    height: 720,
    kind: "Podcast",
    alt: "Podcaster in headphones smiling at a boom microphone, audio software open on her laptop",
    meta: "41:17",
    swapHint: "Square photo of a podcast recording setup",
  },
  {
    src: "/media/photos/reel-02.webp",
    width: 540,
    height: 960,
    kind: "Reel",
    alt: "Travel creator's hand holding a vlogging camera towards a beach at sunset",
    meta: "0:45",
    swapHint: "Vertical 9:16 travel or lifestyle content still",
  },
  {
    src: "/media/photos/thumbnail-01.webp",
    width: 960,
    height: 540,
    kind: "Thumbnail",
    alt: "Two photographers reviewing shots on a laptop in a studio ringed with softboxes",
    swapHint: "16:9 grid of real thumbnail artwork",
  },
  {
    src: "/media/photos/brand-01.webp",
    width: 720,
    height: 720,
    kind: "Brand Kit",
    alt: "Overhead flat lay of a creator's kit: camera body, lenses, an action camera, spare batteries and a flexible tripod",
    swapHint: "Square flat-lay of brand assets, logos or a media kit",
  },
  {
    src: "/media/photos/script-01.webp",
    width: 720,
    height: 960,
    kind: "Script",
    alt: "Creator writing notes in a planner while recording at a microphone",
    swapHint: "Vertical shot of a script, caption sheet or content plan",
  },
  {
    src: "/media/photos/reel-03.webp",
    width: 540,
    height: 960,
    kind: "Reel",
    alt: "Creator pointing at her phone camera in a studio lit by neon tubes",
    meta: "1:02",
    swapHint: "Vertical 9:16 studio or behind-the-scenes still",
  },
  {
    src: "/media/photos/video-02.webp",
    width: 960,
    height: 540,
    kind: "Video",
    alt: "Smiling videographer filming outdoors with a camera on a gimbal",
    meta: "06:39",
    swapHint: "16:9 photo of a shoot in progress",
  },
  {
    src: "/media/photos/photo-02.webp",
    width: 720,
    height: 720,
    kind: "Photo",
    alt: "Creator photographing an orange handbag for a brand shoot",
    swapHint: "Square product or brand-content photo",
  },
  {
    src: "/media/photos/studio-01.webp",
    width: 960,
    height: 540,
    kind: "Podcast",
    alt: "Podcaster in headphones at a condenser microphone in a warmly lit home studio",
    meta: "22:51",
    swapHint: "16:9 photo of a studio or recording session",
  },
];

/** The three tiles that float beside the hero. */
export const HERO_TILES = [
  CONTENT_WALL[0]!,
  CONTENT_WALL[3]!,
  CONTENT_WALL[1]!,
];
