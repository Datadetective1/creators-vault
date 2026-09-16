/**
 * Fallback generator for the landing page's media assets.
 *
 * The page now ships real creator photography and footage, imported by
 * `scripts/ingest-photos.mjs` from `scripts/photo-manifest.json`. This script
 * is the earlier alternative from when no stock library was reachable:
 * everything it makes is produced from scratch — layered gradient meshes, grain
 * and original vector scenes — so it carries no third-party licence. Its output
 * is no longer committed; keep it for a licence-free rebuild if one is ever
 * needed (point `src/lib/media.ts` back at `/media/<id>.webp`).
 *
 * Run:  node scripts/generate-media.mjs
 * Out:  public/media/*.webp  and  public/media/hero-loop.webm
 */

import { mkdir, writeFile, rm, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

import sharp from "sharp";

const OUT = path.resolve("public/media");
const FRAMES = path.resolve(".media-frames");

/* -------------------------------------------------------------------------- */
/* Palettes — one per content family, so the wall reads as variety not noise.  */
/* -------------------------------------------------------------------------- */

const PALETTES = {
  reel: ["#ff3d7f", "#7b2ff7", "#1b0f2b"],
  video: ["#ffb01f", "#ff5f6d", "#1d1206"],
  photo: ["#3ddad7", "#2b6cb0", "#08131f"],
  podcast: ["#a78bfa", "#ec4899", "#150b24"],
  thumbnail: ["#fbbf24", "#f97316", "#1b0f04"],
  brand: ["#34d399", "#0ea5e9", "#04161a"],
  script: ["#94a3b8", "#6366f1", "#0b1020"],
  travel: ["#fb7185", "#f59e0b", "#1e0a12"],
  studio: ["#c084fc", "#22d3ee", "#0d0620"],
};

/** Deterministic PRNG so repeated runs produce identical assets. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/* -------------------------------------------------------------------------- */
/* Gradient-mesh backdrop                                                     */
/* -------------------------------------------------------------------------- */

function meshSvg(width, height, colors, seed, { blobs = 5 } = {}) {
  const rand = rng(seed);
  const [a, b, base] = colors;

  const shapes = Array.from({ length: blobs }, (_, i) => {
    const cx = rand() * width;
    const cy = rand() * height;
    const r = (0.35 + rand() * 0.45) * Math.max(width, height);
    const color = i % 2 === 0 ? a : b;
    const opacity = (0.5 + rand() * 0.4).toFixed(2);
    return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="${color}" opacity="${opacity}" />`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${Math.round(Math.max(width, height) * 0.14)}" />
    </filter>
    <radialGradient id="vig" cx="50%" cy="45%" r="75%">
      <stop offset="55%" stop-color="#000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000" stop-opacity="0.66" />
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="${base}" />
  <g filter="url(#soft)">${shapes}</g>
  <rect width="${width}" height="${height}" fill="url(#vig)" />
</svg>`;
}

/** Fine luminance grain — stops large gradients from banding and adds texture. */
async function grainLayer(width, height, seed) {
  const rand = rng(seed);
  const px = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const v = 118 + Math.floor(rand() * 40);
    px[i * 4] = v;
    px[i * 4 + 1] = v;
    px[i * 4 + 2] = v;
    px[i * 4 + 3] = 16;
  }
  return sharp(px, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/* -------------------------------------------------------------------------- */
/* Original vector scenes — stylised creators, not fake photographs.          */
/* -------------------------------------------------------------------------- */

/**
 * Figures are drawn as high-contrast silhouettes against the gradient rather
 * than as shaded people. The stylisation is deliberate and reads as editorial
 * illustration; attempting photo-realism in SVG would just look like failed
 * photography. Proportions follow a ~7.5-head figure so they stay believable.
 */
const INK = "#0b0710";

/**
 * Figures are built in HEAD UNITS (u = one head radius), the standard way to
 * keep proportions believable: shoulders ~2.2u half-width, torso ~3.2u tall,
 * whole figure ~7 heads. Drawing them in fractions of the frame instead — as a
 * first attempt did — produces a slab that reads as a monolith, not a person.
 *
 * They are flat silhouettes on purpose. The stylisation is a deliberate
 * editorial choice; SVG pseudo-realism would just look like failed photography.
 *
 * Origin (0,0) is the figure's chin. Positive y is down.
 */
function figure(u, { hair = "bob", opacity = 0.92 } = {}) {
  const head = `<circle cx="0" cy="${-u}" r="${u}" fill="${INK}" opacity="${opacity}"/>`;

  const hairShapes = {
    bob: `<path d="M ${-u * 1.24} ${-u * 0.55} q ${-u * 0.16} ${-u * 2.0} ${u * 1.24} ${-u * 2.0}
                  q ${u * 1.40} 0 ${u * 1.24} ${u * 2.0}
                  q ${-u * 0.3} ${-u * 0.85} ${-u * 1.24} ${-u * 0.85}
                  q ${-u * 0.94} 0 ${-u * 1.24} ${u * 0.85} z" fill="${INK}" opacity="${opacity}"/>`,
    curls: `<g fill="${INK}" opacity="${opacity}">
              ${Array.from({ length: 8 }, (_, i) => {
                const a = Math.PI * (0.02 + (i / 7) * 0.96);
                return `<circle cx="${(-Math.cos(a) * u * 1.02).toFixed(2)}" cy="${(-u - Math.sin(a) * u * 1.02).toFixed(2)}" r="${(u * 0.42).toFixed(2)}"/>`;
              }).join("")}
            </g>`,
    tied: `<path d="M ${-u * 1.1} ${-u * 1.0} q 0 ${-u * 1.5} ${u * 1.1} ${-u * 1.5}
                  q ${u * 1.1} 0 ${u * 1.1} ${u * 1.5}
                  q ${-u * 0.45} ${-u * 0.7} ${-u * 1.1} ${-u * 0.7}
                  q ${-u * 0.65} 0 ${-u * 1.1} ${u * 0.7} z" fill="${INK}" opacity="${opacity}"/>
           <circle cx="${u * 1.28}" cy="${-u * 1.45}" r="${u * 0.46}" fill="${INK}" opacity="${opacity}"/>`,
  };

  // Neck, then a torso that tapers slightly to the waist and stops — no slab.
  const body = `
    <rect x="${-u * 0.32}" y="${-u * 0.3}" width="${u * 0.64}" height="${u * 0.7}" fill="${INK}" opacity="${opacity}"/>
    <path d="M ${-u * 2.2} ${u * 3.3}
             L ${-u * 1.95} ${u * 0.75}
             q ${u * 0.55} ${-u * 0.5} ${u * 1.95} ${-u * 0.5}
             q ${u * 1.4} 0 ${u * 1.95} ${u * 0.5}
             L ${u * 2.2} ${u * 3.3} z"
          fill="${INK}" opacity="${opacity}"/>`;

  return `${hairShapes[hair] ?? hairShapes.bob}${head}${body}`;
}

/** A limb drawn from the shoulder. Stroke width scales with the head unit. */
function limb(u, path, scale = 1) {
  return `<path d="${path}" stroke="${INK}" stroke-width="${u * 0.62 * scale}"
                stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.92"/>`;
}

function ground(u, opacity = 0.26) {
  return `<ellipse cx="0" cy="${u * 3.35}" rx="${u * 3.2}" ry="${u * 0.34}" fill="#000" opacity="${opacity}"/>`;
}

const SCENES = {
  /** Creator filming themselves, phone held up at arm's length. */
  filming: (w, h) => {
    const u = Math.min(w, h) * 0.058;
    return `<g transform="translate(${w * 0.46} ${h * 0.60})">
      ${ground(u)}
      ${figure(u, { hair: "tied" })}
      ${limb(u, `M ${-u * 1.85} ${u * 0.95} q ${-u * 1.1} ${u * 1.2} ${-u * 0.5} ${u * 2.1}`)}
      ${limb(u, `M ${u * 1.85} ${u * 0.95} q ${u * 1.9} ${-u * 0.5} ${u * 2.3} ${-u * 2.2}`)}
      <g transform="translate(${u * 4.15} ${-u * 1.85}) rotate(13)">
        <rect x="${-u * 0.82}" y="${-u * 1.5}" width="${u * 1.64}" height="${u * 3.0}"
              rx="${u * 0.24}" fill="${INK}" opacity="0.95"/>
        <rect x="${-u * 0.64}" y="${-u * 1.28}" width="${u * 1.28}" height="${u * 2.56}"
              rx="${u * 0.14}" fill="#fff" opacity="0.3"/>
        <circle cx="0" cy="${-u * 1.62}" r="${u * 0.1}" fill="#fff" opacity="0.6"/>
      </g>
      <g transform="translate(${u * 4.15} ${-u * 1.85})" fill="none" stroke="#fff">
        <circle r="${u * 2.3}" stroke-width="${u * 0.07}" opacity="0.26"/>
        <circle r="${u * 3.1}" stroke-width="${u * 0.055}" opacity="0.13"/>
      </g>
    </g>`;
  },

  /** Photographer, camera raised to the eye. */
  camera: (w, h) => {
    const u = Math.min(w, h) * 0.058;
    return `<g transform="translate(${w * 0.5} ${h * 0.60})">
      ${ground(u)}
      ${figure(u, { hair: "curls" })}
      ${limb(u, `M ${-u * 1.85} ${u * 0.9} q ${-u * 0.3} ${-u * 1.0} ${u * 0.95} ${-u * 1.6}`)}
      ${limb(u, `M ${u * 1.85} ${u * 0.9} q ${u * 0.3} ${-u * 1.0} ${-u * 0.95} ${-u * 1.6}`)}
      <g transform="translate(${u * 0.25} ${-u * 1.5})">
        <rect x="${-u * 1.2}" y="${-u * 0.6}" width="${u * 2.4}" height="${u * 1.28}"
              rx="${u * 0.2}" fill="${INK}" opacity="0.97"/>
        <rect x="${-u * 0.38}" y="${-u * 0.82}" width="${u * 0.72}" height="${u * 0.26}"
              rx="${u * 0.08}" fill="${INK}" opacity="0.97"/>
        <circle cx="0" cy="${u * 0.04}" r="${u * 0.5}" fill="#fff" opacity="0.24"/>
        <circle cx="0" cy="${u * 0.04}" r="${u * 0.29}" fill="#fff" opacity="0.5"/>
        <circle cx="${-u * 0.11}" cy="${-u * 0.06}" r="${u * 0.1}" fill="#fff" opacity="0.8"/>
        <rect x="${u * 0.62}" y="${-u * 0.4}" width="${u * 0.34}" height="${u * 0.15}"
              rx="${u * 0.06}" fill="#ff5f6d" opacity="0.95"/>
      </g>
    </g>`;
  },

  /** Podcaster at a boom mic, voice bars rising beside them. */
  podcast: (w, h) => {
    const u = Math.min(w, h) * 0.056;
    return `<g transform="translate(${w * 0.52} ${h * 0.60})">
      ${ground(u)}
      ${figure(u, { hair: "curls" })}
      ${limb(u, `M ${-u * 1.9} ${u * 1.0} q ${-u * 0.85} ${u * 1.3} ${-u * 0.2} ${u * 2.2}`)}
      ${limb(u, `M ${u * 1.9} ${u * 1.0} q ${u * 0.85} ${u * 1.3} ${u * 0.2} ${u * 2.2}`)}
      <g transform="translate(${-u * 2.5} ${-u * 0.5}) rotate(-14)">
        <rect x="${-u * 0.38}" y="${-u * 0.85}" width="${u * 0.76}" height="${u * 1.7}"
              rx="${u * 0.38}" fill="${INK}" opacity="0.96"/>
        <g opacity="0.32" stroke="#fff" stroke-width="${u * 0.06}">
          ${Array.from({ length: 4 }, (_, i) =>
            `<line x1="${-u * 0.34}" y1="${-u * 0.65 + i * u * 0.38}" x2="${u * 0.34}" y2="${-u * 0.65 + i * u * 0.38}"/>`,
          ).join("")}
        </g>
        <rect x="${-u * 0.08}" y="${u * 1.0}" width="${u * 0.16}" height="${u * 1.5}" fill="${INK}" opacity="0.9"/>
      </g>
      ${Array.from({ length: 9 }, (_, i) => {
        const bx = u * 3.0 + i * u * 0.52;
        const bh = u * (0.5 + Math.abs(Math.sin(i * 1.4)) * 2.3);
        return `<rect x="${bx}" y="${-u * 1.0 - bh / 2}" width="${u * 0.2}" height="${bh}"
                      rx="${u * 0.1}" fill="#fff" opacity="${(0.3 + Math.abs(Math.sin(i * 1.4)) * 0.45).toFixed(2)}"/>`;
      }).join("")}
    </g>`;
  },

  /** Editing: creator at a desk with a timeline on screen. */
  editing: (w, h) => {
    const u = Math.min(w, h) * 0.05;
    return `<g transform="translate(${w * 0.5} ${h * 0.56})">
      <ellipse cx="0" cy="${u * 4.4}" rx="${u * 7.5}" ry="${u * 0.4}" fill="#000" opacity="0.26"/>
      <g transform="translate(${-u * 4.9} ${u * 0.9})">
        ${figure(u * 0.92, { hair: "bob" })}
      </g>
      ${limb(u, `M ${-u * 3.1} ${u * 1.85} q ${u * 1.4} ${u * 0.9} ${u * 2.6} ${u * 0.35}`, 0.9)}
      <g transform="translate(${u * 1.9} ${-u * 0.5})">
        <rect x="${-u * 4.6}" y="${-u * 2.8}" width="${u * 9.2}" height="${u * 5.4}"
              rx="${u * 0.34}" fill="${INK}" opacity="0.94"/>
        <rect x="${-u * 4.25}" y="${-u * 2.45}" width="${u * 8.5}" height="${u * 3.9}"
              rx="${u * 0.2}" fill="#fff" opacity="0.15"/>
        ${Array.from({ length: 3 }, (_, i) =>
          `<rect x="${-u * 3.95}" y="${-u * 2.1 + i * u * 1.0}" width="${u * (3.1 + i * 1.6)}"
                 height="${u * 0.6}" rx="${u * 0.12}" fill="#fff" opacity="${(0.46 - i * 0.11).toFixed(2)}"/>`,
        ).join("")}
        <rect x="${-u * 3.95}" y="${u * 0.95}" width="${u * 7.9}" height="${u * 0.17}"
              rx="${u * 0.085}" fill="#fff" opacity="0.32"/>
        <circle cx="${-u * 2.0}" cy="${u * 1.03}" r="${u * 0.26}" fill="#fff" opacity="0.8"/>
        <rect x="${-u * 0.7}" y="${u * 2.6}" width="${u * 1.4}" height="${u * 0.8}" fill="${INK}" opacity="0.9"/>
        <rect x="${-u * 1.9}" y="${u * 3.4}" width="${u * 3.8}" height="${u * 0.26}"
              rx="${u * 0.13}" fill="${INK}" opacity="0.9"/>
      </g>
    </g>`;
  },
};

/* -------------------------------------------------------------------------- */
/* Overlays: play glyph, waveform, document lines                             */
/* -------------------------------------------------------------------------- */

const OVERLAYS = {
  play: (w, h) => `
    <g transform="translate(${w * 0.5} ${h * 0.5})" opacity="0.92">
      <circle r="${w * 0.085}" fill="#000" opacity="0.32"/>
      <circle r="${w * 0.085}" fill="none" stroke="#fff" stroke-width="${w * 0.006}" opacity="0.75"/>
      <path d="M ${-w * 0.026} ${-h * 0.021} L ${w * 0.038} 0 L ${-w * 0.026} ${h * 0.021} z" fill="#fff"/>
    </g>`,
  wave: (w, h) => `
    <g transform="translate(${w * 0.5} ${h * 0.5})" opacity="0.8">
      ${Array.from({ length: 21 }, (_, i) => {
        const x = (i - 10) * w * 0.042;
        const bh = h * (0.02 + Math.abs(Math.sin(i * 0.9)) * 0.13);
        return `<rect x="${x - w * 0.007}" y="${-bh / 2}" width="${w * 0.014}" height="${bh}"
                      rx="${w * 0.007}" fill="#fff"/>`;
      }).join("")}
    </g>`,
  doc: (w, h) => `
    <g transform="translate(${w * 0.5} ${h * 0.5})" opacity="0.62">
      ${Array.from({ length: 6 }, (_, i) =>
        `<rect x="${-w * 0.22}" y="${-h * 0.14 + i * h * 0.05}" width="${w * (i === 5 ? 0.22 : 0.44)}"
               height="${h * 0.018}" rx="${w * 0.009}" fill="#fff"/>`,
      ).join("")}
    </g>`,
  grid: (w, h) => `
    <g opacity="0.5">
      ${Array.from({ length: 6 }, (_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cw = w * 0.24;
        const ch = h * 0.30;
        return `<rect x="${w * 0.12 + col * (cw + w * 0.02)}" y="${h * 0.19 + row * (ch + h * 0.03)}"
                      width="${cw}" height="${ch}" rx="${w * 0.02}" fill="#fff" opacity="${0.16 + i * 0.05}"/>`;
      }).join("")}
    </g>`,
};

/* -------------------------------------------------------------------------- */
/* Composer                                                                   */
/* -------------------------------------------------------------------------- */

async function makeCard({ name, width, height, palette, seed, scene, overlay, quality = 74 }) {
  const colors = PALETTES[palette];
  const base = Buffer.from(meshSvg(width, height, colors, seed));

  const layers = [];
  if (scene && SCENES[scene]) {
    layers.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${SCENES[scene](width, height)}</svg>`,
    );
  }
  if (overlay && OVERLAYS[overlay]) {
    layers.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${OVERLAYS[overlay](width, height)}</svg>`,
    );
  }

  const composite = [
    ...layers.map((svg) => ({ input: Buffer.from(svg) })),
    { input: await grainLayer(width, height, seed + 7), blend: "overlay" },
  ];

  const buffer = await sharp(base).composite(composite).webp({ quality, effort: 6 }).toBuffer();
  await writeFile(path.join(OUT, `${name}.webp`), buffer);
  return buffer.length;
}

/* -------------------------------------------------------------------------- */
/* Asset manifest                                                             */
/* -------------------------------------------------------------------------- */

// 9:16 reels, 16:9 videos, 1:1 photos — real creator aspect ratios.
const CARDS = [
  { name: "reel-01", width: 540, height: 960, palette: "reel", seed: 11, scene: "filming", overlay: "play" },
  { name: "reel-02", width: 540, height: 960, palette: "travel", seed: 23, scene: "camera", overlay: "play" },
  { name: "reel-03", width: 540, height: 960, palette: "studio", seed: 41, scene: "filming", overlay: "play" },
  { name: "video-01", width: 960, height: 540, palette: "video", seed: 57, scene: "editing", overlay: "play" },
  { name: "video-02", width: 960, height: 540, palette: "thumbnail", seed: 73, scene: "camera", overlay: "play" },
  { name: "photo-01", width: 720, height: 720, palette: "photo", seed: 89, scene: "camera" },
  { name: "photo-02", width: 720, height: 720, palette: "brand", seed: 97, scene: "editing" },
  { name: "podcast-01", width: 720, height: 720, palette: "podcast", seed: 103, scene: "podcast", overlay: "wave" },
  { name: "thumbnail-01", width: 960, height: 540, palette: "thumbnail", seed: 127, overlay: "grid" },
  { name: "brand-01", width: 720, height: 720, palette: "brand", seed: 139, overlay: "grid" },
  { name: "script-01", width: 720, height: 960, palette: "script", seed: 151, overlay: "doc" },
  { name: "studio-01", width: 960, height: 540, palette: "studio", seed: 167, scene: "podcast", overlay: "wave" },
];

/* -------------------------------------------------------------------------- */
/* Hero loop — a slow drifting gradient rendered to VP8/WebM                   */
/* -------------------------------------------------------------------------- */

const FFMPEG = "/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux";

function heroFrameSvg(width, height, t) {
  // Three blobs orbiting on slow, mutually prime periods so the loop seams
  // cleanly at t = 1 without an obvious repeat.
  const tau = Math.PI * 2;
  const blob = (cx, cy, r, color, opacity) =>
    `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="b" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${Math.round(width * 0.11)}"/>
    </filter>
    <radialGradient id="v" cx="50%" cy="50%" r="72%">
      <stop offset="45%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.78"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="#0a0810"/>
  <g filter="url(#b)">
    ${blob(width * (0.34 + 0.13 * Math.cos(tau * t)), height * (0.40 + 0.15 * Math.sin(tau * t)), width * 0.40, "#7b2ff7", 0.78)}
    ${blob(width * (0.68 + 0.14 * Math.cos(tau * t + 2.1)), height * (0.56 + 0.13 * Math.sin(tau * t + 2.1)), width * 0.35, "#ff3d7f", 0.62)}
    ${blob(width * (0.52 + 0.16 * Math.cos(tau * t + 4.2)), height * (0.34 + 0.14 * Math.sin(tau * t + 4.2)), width * 0.30, "#ffb01f", 0.48)}
  </g>
  <rect width="${width}" height="${height}" fill="url(#v)"/>
</svg>`;
}

async function buildHeroLoop() {
  if (!existsSync(FFMPEG)) {
    console.warn("! ffmpeg not found — skipping hero-loop.webm (poster still generated)");
    return null;
  }

  const W = 960;
  const H = 540;
  const COUNT = 90; // 6s at 15fps — small file, no visible stutter for a slow drift

  await rm(FRAMES, { recursive: true, force: true });
  await mkdir(FRAMES, { recursive: true });

  for (let i = 0; i < COUNT; i += 1) {
    const svg = Buffer.from(heroFrameSvg(W, H, i / COUNT));
    // JPEG, not PNG: this ffmpeg has an mjpeg decoder but no png decoder.
    const frame = await sharp(svg).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer();
    await writeFile(path.join(FRAMES, `f${String(i).padStart(4, "0")}.jpg`), frame);
  }

  const outPath = path.join(OUT, "hero-loop.webm");
  const streamPath = path.join(FRAMES, "stream.bin");

  /*
   * This ffmpeg is compiled --disable-everything. It has the image2pipe
   * demuxer and an mjpeg decoder but no png decoder, and `pipe:` is not
   * available — only `file:`. So the frames are JPEG, concatenated into one
   * file, and read back through the file protocol.
   */
  const frames = [];
  for (let i = 0; i < COUNT; i += 1) {
    frames.push(await readFile(path.join(FRAMES, `f${String(i).padStart(4, "0")}.jpg`)));
  }
  await writeFile(streamPath, Buffer.concat(frames));

  await new Promise((resolve, reject) => {
    const proc = spawn(
      FFMPEG,
      [
        "-y",
        "-f", "image2pipe", "-vcodec", "mjpeg", "-framerate", "15", "-i", streamPath,
        "-c:v", "libvpx", "-b:v", "240k", "-crf", "37",
        "-an", // never ship audio on a background loop
        outPath,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    proc.stderr.on("data", (c) => { stderr += c.toString(); });
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-700)}`)),
    );
  });

  // Poster = first frame, so the fallback matches the video's opening state.
  const poster = await sharp(Buffer.from(heroFrameSvg(W, H, 0)))
    .webp({ quality: 70, effort: 6 })
    .toBuffer();
  await writeFile(path.join(OUT, "hero-poster.webp"), poster);

  await rm(FRAMES, { recursive: true, force: true });
  return outPath;
}

/* -------------------------------------------------------------------------- */

async function main() {
  await mkdir(OUT, { recursive: true });

  let total = 0;
  for (const card of CARDS) {
    const bytes = await makeCard(card);
    total += bytes;
    console.log(`  ${card.name}.webp`.padEnd(26), `${(bytes / 1024).toFixed(1)} KB`);
  }

  const hero = await buildHeroLoop();
  if (hero) {
    const { size } = await stat(hero);
    total += size;
    console.log("  hero-loop.webm".padEnd(26), `${(size / 1024).toFixed(1)} KB`);
  }

  console.log(`\n${CARDS.length} cards + hero loop — ${(total / 1024).toFixed(0)} KB total`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
