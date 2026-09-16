/**
 * Storage provider contract.
 *
 * Application code talks to this interface and never to a vendor SDK directly.
 * Supabase Storage is the only implementation for the pilot, but nothing above
 * this layer knows that: no route builds a Supabase URL, parses a Supabase
 * path, or assumes Supabase's signing behaviour.
 *
 * Each asset row records `storage_provider` alongside `storage_key`, so a later
 * migration can copy objects to another private store, write rows pointing at
 * the new provider, and serve both during the transition. Creators never
 * re-upload.
 */

/** Where and how the browser should send the bytes. */
export interface UploadTarget {
  /** Absolute URL the browser uploads to. */
  url: string;
  /** HTTP method the provider expects. */
  method: "PUT" | "POST";
  /**
   * Provider-specific credential the browser must present.
   * Opaque to callers — pass it straight back to the matching upload helper.
   */
  token?: string;
  /** The key to persist in `assets.storage_key` once the upload succeeds. */
  key: string;
}

/** What the provider knows about a stored object. */
export interface StoredObject {
  key: string;
  sizeBytes: number;
  mimeType: string;
  /** When the object landed, when the provider reports it. */
  createdAt?: string;
}

export interface DownloadUrlOptions {
  expiresInSeconds: number;
  /** Suggested filename for the browser's save dialog. */
  downloadFilename?: string;
}

export interface StorageProvider {
  /** Stable identifier persisted in `assets.storage_provider`. */
  readonly id: string;

  /**
   * Build an opaque object key owned by `userId`.
   *
   * Implementations must derive the key from a random identifier, never from
   * user-supplied text, and must namespace it by `userId` so ownership is
   * structural rather than advisory.
   */
  buildKey(userId: string, filename: string): string;

  /** Mint a short-lived, single-object upload target. */
  createUploadTarget(key: string, mimeType: string): Promise<UploadTarget>;

  /** Mint a short-lived download URL for one object. */
  createDownloadUrl(key: string, options: DownloadUrlOptions): Promise<string>;

  /** Object metadata, or null when the object does not exist. */
  stat(key: string): Promise<StoredObject | null>;

  /**
   * Every object actually held under a user's prefix.
   *
   * Reflects real storage, including objects whose metadata row was never
   * written, so quota can be charged against what exists rather than what was
   * recorded, and abandoned uploads can be identified and swept.
   */
  listOwned(userId: string, limit?: number): Promise<StoredObject[]>;

  /** Remove objects. Must succeed silently when a key is already gone. */
  remove(keys: string[]): Promise<void>;
}
