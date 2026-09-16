import type { SupabaseClient } from "@supabase/supabase-js";

import { extensionOf } from "@/lib/validation";

import type {
  DownloadUrlOptions,
  StorageProvider,
  StoredObject,
  UploadTarget,
} from "./types";

export const VAULT_BUCKET = "vault";

/** How long an upload target stays valid. */
const UPLOAD_URL_TTL_SECONDS = 60 * 60; // 1 hour — large video needs headroom

/**
 * Supabase Storage implementation of {@link StorageProvider}.
 *
 * Constructed with a request-scoped, user-authenticated client, so every
 * operation runs under that user's RLS context. The storage policies in
 * migration 0002 pin the first path segment of every object to auth.uid(),
 * which means a forged key belonging to another user is rejected by Postgres,
 * not merely by this code.
 */
export class SupabaseStorageProvider implements StorageProvider {
  readonly id = "supabase";

  constructor(private readonly client: SupabaseClient) {}

  private get bucket() {
    return this.client.storage.from(VAULT_BUCKET);
  }

  /**
   * `<userId>/<uuid>.<ext>`
   *
   * The user's filename never appears in the key, so path traversal and
   * collisions are structurally impossible. The original name is kept as
   * metadata on the asset row and restored on download.
   */
  buildKey(userId: string, filename: string): string {
    const extension = extensionOf(filename);
    const id = crypto.randomUUID();
    return extension ? `${userId}/${id}.${extension}` : `${userId}/${id}`;
  }

  async createUploadTarget(key: string, _mimeType: string): Promise<UploadTarget> {
    const { data, error } = await this.bucket.createSignedUploadUrl(key, {
      upsert: false,
    });
    if (error || !data) {
      throw new Error(`Could not create an upload URL: ${error?.message ?? "unknown error"}`);
    }
    return {
      url: data.signedUrl,
      method: "PUT",
      token: data.token,
      key,
    };
  }

  async createDownloadUrl(key: string, options: DownloadUrlOptions): Promise<string> {
    const { data, error } = await this.bucket.createSignedUrl(key, options.expiresInSeconds, {
      download: options.downloadFilename ?? true,
    });
    if (error || !data) {
      throw new Error(`Could not create a download URL: ${error?.message ?? "unknown error"}`);
    }
    return data.signedUrl;
  }

  async stat(key: string): Promise<StoredObject | null> {
    const slash = key.lastIndexOf("/");
    const folder = slash === -1 ? "" : key.slice(0, slash);
    const name = slash === -1 ? key : key.slice(slash + 1);

    const { data, error } = await this.bucket.list(folder, { search: name, limit: 100 });
    if (error || !data) return null;

    const match = data.find((entry) => entry.name === name);
    if (!match) return null;

    const metadata = (match.metadata ?? {}) as { size?: number; mimetype?: string };
    return {
      key,
      sizeBytes: typeof metadata.size === "number" ? metadata.size : 0,
      mimeType: metadata.mimetype ?? "application/octet-stream",
    };
  }

  async listOwned(userId: string, limit = 1000): Promise<StoredObject[]> {
    const PAGE = 100;
    const maxPages = Math.max(1, Math.ceil(limit / PAGE));
    const objects: StoredObject[] = [];

    for (let page = 0; page < maxPages; page += 1) {
      const { data, error } = await this.bucket.list(userId, {
        limit: PAGE,
        offset: page * PAGE,
      });
      if (error || !data || data.length === 0) break;

      for (const entry of data) {
        const metadata = (entry.metadata ?? {}) as { size?: number; mimetype?: string };
        objects.push({
          key: `${userId}/${entry.name}`,
          sizeBytes: typeof metadata.size === "number" ? metadata.size : 0,
          mimeType: metadata.mimetype ?? "application/octet-stream",
          createdAt: entry.created_at ?? undefined,
        });
      }

      if (data.length < PAGE || objects.length >= limit) break;
    }

    return objects.slice(0, limit);
  }

  async remove(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const { error } = await this.bucket.remove(keys);
    // A key that is already gone is not a failure — deletion is idempotent.
    if (error && !/not found/i.test(error.message)) {
      throw new Error(`Could not delete stored object: ${error.message}`);
    }
  }
}

export { UPLOAD_URL_TTL_SECONDS };
