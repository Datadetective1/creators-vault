import { z } from "zod";

/**
 * Upload validation.
 *
 * Both the MIME type and the extension must be recognised, and they must agree
 * on the same family. The browser is never trusted: every check here runs again
 * server-side before an upload URL is issued.
 */

export const MAX_FILE_SIZE_BYTES = 5 * 1024 ** 3; // 5 GiB — matches the bucket ceiling
export const MAX_FILENAME_LENGTH = 255;

/**
 * Allowed types, mapped to their permitted extensions.
 *
 * SVG is deliberately excluded: it is an executable document that can carry
 * script, and serving one from our own origin would be a stored-XSS vector.
 */
export const ALLOWED_TYPES: Record<string, readonly string[]> = {
  // images
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
  "image/heic": ["heic"],
  "image/heif": ["heif"],
  "image/tiff": ["tif", "tiff"],
  // video
  "video/mp4": ["mp4", "m4v"],
  "video/quicktime": ["mov"],
  "video/webm": ["webm"],
  "video/x-matroska": ["mkv"],
  "video/x-msvideo": ["avi"],
  // audio
  "audio/mpeg": ["mp3"],
  "audio/mp4": ["m4a"],
  "audio/wav": ["wav"],
  "audio/x-wav": ["wav"],
  "audio/aac": ["aac"],
  "audio/ogg": ["ogg", "oga"],
  "audio/flac": ["flac"],
  "audio/x-flac": ["flac"],
  // documents & text
  "application/pdf": ["pdf"],
  "text/plain": ["txt", "md", "srt", "vtt"],
  "text/markdown": ["md"],
  "text/csv": ["csv"],
  "text/vtt": ["vtt"],
  "application/json": ["json"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/zip": ["zip"],
};

/** Comma-separated `accept` attribute for the file input. */
export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_TYPES).join(",");

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) return "";
  return filename.slice(dot + 1).toLowerCase();
}

// Control characters and double quotes are stripped from display filenames so
// they cannot break out of a Content-Disposition header.
const UNSAFE_FILENAME_CHARS = new RegExp("[\\u0000-\\u001F\\u007F\"]", "g");

/**
 * Strip anything that could escape a directory or confuse a Content-Disposition
 * header. This value is metadata only — it never becomes part of a storage key —
 * but it is echoed back on download, so it must be inert.
 */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(UNSAFE_FILENAME_CHARS, "").replace(/^\.+/, "").trim();
  const safe = cleaned.length > 0 ? cleaned : "file";
  return safe.slice(0, MAX_FILENAME_LENGTH);
}

export interface FileCheckResult {
  ok: boolean;
  error?: string;
}

/** Shared by the browser form and the server route — one rule set, one place. */
export function checkFile(
  filename: string,
  mimeType: string,
  sizeBytes: number,
): FileCheckResult {
  if (sizeBytes <= 0) return { ok: false, error: "File appears to be empty." };
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "File is larger than the 5 GB per-file limit." };
  }

  const allowedExtensions = ALLOWED_TYPES[mimeType];
  if (!allowedExtensions) {
    return { ok: false, error: `Files of type "${mimeType || "unknown"}" are not supported.` };
  }

  const extension = extensionOf(filename);
  if (!extension) return { ok: false, error: "File must have an extension." };
  if (!allowedExtensions.includes(extension)) {
    return {
      ok: false,
      error: `Extension ".${extension}" does not match the file type "${mimeType}".`,
    };
  }

  return { ok: true };
}

export const uploadUrlRequestSchema = z.object({
  filename: z.string().min(1).max(MAX_FILENAME_LENGTH),
  mimeType: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
});

export const finalizeUploadSchema = z.object({
  storageKey: z.string().min(1).max(1024),
  filename: z.string().min(1).max(MAX_FILENAME_LENGTH),
  mimeType: z.string().min(1).max(255),
});

export const checkoutRequestSchema = z.object({
  // `creator` is the only paid tier the pilot sells. A request naming the
  // retired `pro` tier is rejected here rather than reaching Paddle.
  tier: z.enum(["creator"]),
});
