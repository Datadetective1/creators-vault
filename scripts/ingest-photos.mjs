/**
 * Downloads, optimises and credits the landing page's real creator media.
 *
 * scripts/photo-manifest.json is the source of truth: every photograph and the
 * hero video record where they came from, who made them and under what
 * licence. This script turns that manifest into web-ready files and writes
 * public/media/CREDITS.md so provenance ships with the assets.
 *
 * Run:  node scripts/ingest-photos.mjs
 * Env:  FFMPEG=/path/to/ffmpeg   full build with libx264 + libvpx-vp9; without
 *                                it the photos still import and the video is
 *                                reported as skipped.
 * Out:  public/media/photos/*.webp
 *       public/media/hero-creator.{webm,mp4}  +  hero-creator-poster.webp
 *       public/media/CREDITS.md
 *
 * Nothing here invents a source. An entry with no `url` is skipped and
 * reported, so a partial manifest degrades to a partial swap rather than a
 * broken page.
 */

import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";

const MANIFEST = path.resolve("scripts/photo-manifest.json");
const MEDIA_DIR = path.resolve("public/media");
const PHOTO_DIR = path.join(MEDIA_DIR, "photos");
const CREDITS = path.join(MEDIA_DIR, "CREDITS.md");

/** Longest edge we ever render a tile at, doubled for high-DPI screens. */
const MAX_EDGE = 1280;

async function download(url, expectType) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const type = response.headers.get("content-type") ?? "";
  if (!type.startsWith(expectType)) {
    throw new Error(`expected ${expectType}*, got "${type}"`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/* -------------------------------------------------------------------------- */
/* Photos                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Crop to the tile's aspect ratio rather than letterboxing, using attention
 * cropping so a person stays in frame instead of being sliced by a centre cut.
 * Attention favours detail, which on a gear-heavy shot can mean the camera
 * wins over the face; an entry can set `position` ("top", "centre", ...) to
 * override it.
 *
 * An entry can also set `crop` — {left, top, width, height} as fractions of
 * the framed tile — to keep a region of that framing and discard the rest.
 * This is how a shot earns its place when part of the frame carries a legible
 * third-party wordmark: the brief asks us to avoid those where we can, and a
 * tighter crop is cheaper than losing the photograph. The zoom is taken before
 * the downscale, so the kept region still lands at full tile resolution.
 */
async function optimise(buffer, { width, height, position, crop }) {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const target = { width: Math.round(width * scale), height: Math.round(height * scale) };

  // Frame wide enough that `crop` lands exactly on target without upscaling.
  const framed = crop
    ? { width: Math.round(target.width / crop.width), height: Math.round(target.height / crop.height) }
    : target;

  const pipeline = sharp(buffer).resize({
    ...framed,
    fit: "cover",
    position: position ?? sharp.strategy.attention,
  });

  if (crop) {
    pipeline.extract({
      left: Math.round(crop.left * framed.width),
      top: Math.round(crop.top * framed.height),
      width: target.width,
      height: target.height,
    });
  }

  return pipeline.webp({ quality: 72, effort: 6 }).toBuffer();
}

async function ingestPhotos(photos) {
  await mkdir(PHOTO_DIR, { recursive: true });
  const done = [];
  const skipped = [];
  const failed = [];

  for (const entry of photos) {
    if (!entry.url) {
      skipped.push(entry);
      continue;
    }
    try {
      const raw = await download(entry.url, "image/");
      const optimised = await optimise(raw, entry);
      await writeFile(path.join(PHOTO_DIR, `${entry.id}.webp`), optimised);
      done.push({ ...entry, bytes: optimised.length });
      console.log(`  photos/${entry.id}.webp`.padEnd(34), `${(optimised.length / 1024).toFixed(1)} KB`);
    } catch (error) {
      failed.push({ entry, message: error instanceof Error ? error.message : String(error) });
      console.error(`  ${entry.id}: FAILED — ${error}`);
    }
  }
  return { done, skipped, failed };
}

/* -------------------------------------------------------------------------- */
/* Hero video                                                                 */
/* -------------------------------------------------------------------------- */

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${path.basename(bin)} exited ${code}\n${stderr.slice(-800)}`)),
    );
  });
}

/**
 * Builds a seamless loop: the segment's final second is cross-faded into its
 * first, so the wrap-around lands on the frame it started from. The camera in
 * the chosen clip is static, which is what makes this trick read as one
 * continuous take rather than a cut.
 */
function loopFilter({ start, end, crossfade }, { width, height }) {
  const bodyStart = start + crossfade;
  const bodyLength = end - bodyStart;
  const scale = `scale=${width}:${height}:flags=lanczos,setsar=1`;
  return [
    `[0:v]trim=start=${bodyStart}:end=${end},setpts=PTS-STARTPTS,${scale}[body]`,
    `[0:v]trim=start=${start}:end=${bodyStart},setpts=PTS-STARTPTS,${scale}[head]`,
    `[body][head]xfade=transition=fade:duration=${crossfade}:offset=${bodyLength - crossfade}[v]`,
  ].join(";");
}

async function ingestVideo(video) {
  if (!video?.url) return { status: "skipped", reason: "no url" };
  const ffmpeg = process.env.FFMPEG;
  if (!ffmpeg) return { status: "skipped", reason: "FFMPEG not set" };

  const work = await (async () => {
    const dir = path.join(os.tmpdir(), `creator-vault-video-${process.pid}`);
    await mkdir(dir, { recursive: true });
    return dir;
  })();

  try {
    const source = path.join(work, "source.mp4");
    await writeFile(source, await download(video.url, "video/"));

    // One near-lossless intermediate carrying the loop, then two deliverables
    // encoded from it so both formats share identical frames.
    const loop = path.join(work, "loop.mp4");
    await run(ffmpeg, [
      "-v", "error", "-y", "-i", source,
      "-filter_complex", loopFilter(video.trim, video),
      "-map", "[v]", "-an", "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p",
      loop,
    ]);

    const webm = path.join(MEDIA_DIR, `${video.id}.webm`);
    await run(ffmpeg, [
      "-v", "error", "-y", "-i", loop, "-an",
      "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-deadline", "good", "-cpu-used", "1", "-row-mt", "1",
      "-pix_fmt", "yuv420p",
      webm,
    ]);

    const mp4 = path.join(MEDIA_DIR, `${video.id}.mp4`);
    await run(ffmpeg, [
      "-v", "error", "-y", "-i", loop, "-an",
      "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-profile:v", "high", "-level", "4.0",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      mp4,
    ]);

    // Poster = the first frame, so the hand-off to the playing video is invisible.
    const framePng = path.join(work, "poster.png");
    await run(ffmpeg, ["-v", "error", "-y", "-i", loop, "-frames:v", "1", framePng]);
    const posterPath = path.join(MEDIA_DIR, `${video.id}-poster.webp`);
    const poster = await sharp(framePng).webp({ quality: 68, effort: 6 }).toBuffer();
    await writeFile(posterPath, poster);

    const sizes = {};
    for (const file of [webm, mp4, posterPath]) {
      const bytes = (await readFile(file)).length;
      sizes[path.basename(file)] = bytes;
      console.log(`  ${path.basename(file)}`.padEnd(34), `${(bytes / 1024).toFixed(1)} KB`);
    }
    return { status: "done", sizes };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

/* -------------------------------------------------------------------------- */
/* Credits                                                                    */
/* -------------------------------------------------------------------------- */

function creditCell(entry) {
  return entry.creditUrl ? `[${entry.credit}](${entry.creditUrl})` : (entry.credit ?? "—");
}

async function writeCredits({ photos, video, licenses }) {
  const licenseRows = Object.entries(licenses ?? {}).map(
    ([name, { url, summary }]) => `- **${name}** — <${url}>\n  ${summary}`,
  );

  const lines = [
    "# Media credits",
    "",
    "Photography and footage used on the Creator Lock landing page.",
    "Generated by `scripts/ingest-photos.mjs` from `scripts/photo-manifest.json` — do not edit by hand.",
    "",
    "## Photos",
    "",
    "| File | Source | Licence | Credit |",
    "| --- | --- | --- | --- |",
    ...photos.map(
      (d) => `| \`photos/${d.id}.webp\` | [${d.source}](${d.pageUrl ?? d.url}) | ${d.license} | ${creditCell(d)} |`,
    ),
    "",
  ];

  if (video) {
    lines.push(
      "## Hero video",
      "",
      "| File | Source | Licence | Credit |",
      "| --- | --- | --- | --- |",
      `| \`${video.id}.webm\`, \`${video.id}.mp4\`, \`${video.id}-poster.webp\` | [${video.source}](${video.pageUrl ?? video.url}) | ${video.license} | ${creditCell(video)} |`,
      "",
      `Trimmed to a ${video.trim.end - video.trim.start - video.trim.crossfade}-second seamless loop, scaled to ${video.width}×${video.height}, audio track removed.`,
      "",
    );
  }

  lines.push(
    "## Licences",
    "",
    ...licenseRows,
    "",
    "> A stock licence covers use of the photograph, but it does not by itself",
    "> grant a model release for every use of an identifiable person. Before",
    "> launch, confirm each photo of a recognisable person is cleared for",
    "> marketing use, and never present anyone as endorsing the product.",
    "",
  );
  await writeFile(CREDITS, lines.join("\n"));
}

/* -------------------------------------------------------------------------- */

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  await mkdir(MEDIA_DIR, { recursive: true });

  console.log("Photos");
  const photos = await ingestPhotos(manifest.photos);

  console.log("\nHero video");
  let video;
  try {
    video = await ingestVideo(manifest.video);
    if (video.status === "skipped") console.log(`  skipped — ${video.reason}`);
  } catch (error) {
    video = { status: "failed", message: error instanceof Error ? error.message : String(error) };
    console.error(`  FAILED — ${video.message}`);
  }

  if (photos.done.length > 0 || video?.status === "done") {
    // Credit everything that is actually on disk, not just this run's
    // successes. A run without FFMPEG — or with a single failed download —
    // still ships the previously imported files, and they must stay credited.
    const credited = manifest.photos.filter((entry) =>
      existsSync(path.join(PHOTO_DIR, `${entry.id}.webp`)),
    );
    const heroOnDisk =
      Boolean(manifest.video?.id) &&
      existsSync(path.join(MEDIA_DIR, `${manifest.video.id}.mp4`));

    // An asset no manifest entry claims would ship uncredited; say so loudly.
    const claimed = new Set(manifest.photos.map((entry) => `${entry.id}.webp`));
    for (const file of readdirSync(PHOTO_DIR)) {
      if (file.endsWith(".webp") && !claimed.has(file)) {
        console.warn(`  WARNING: photos/${file} has no manifest entry — it will ship uncredited`);
      }
    }

    await writeCredits({
      photos: credited,
      video: heroOnDisk ? manifest.video : undefined,
      licenses: manifest.licenses,
    });
  }

  console.log(
    `\n${photos.done.length} photos imported, ${photos.skipped.length} awaiting a URL, ${photos.failed.length} failed; video ${video?.status}`,
  );
  if (photos.skipped.length > 0) {
    console.log("Awaiting URLs:");
    for (const entry of photos.skipped) {
      console.log(`  ${entry.id.padEnd(16)} ${entry.width}x${entry.height}  ${entry.brief}`);
    }
  }
  if (photos.failed.length > 0 || video?.status === "failed") process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
