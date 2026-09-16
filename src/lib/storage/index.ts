import type { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseStorageProvider } from "./supabase-storage";
import type { StorageProvider } from "./types";

export type { StorageProvider, StoredObject, UploadTarget, DownloadUrlOptions } from "./types";
export { VAULT_BUCKET } from "./supabase-storage";

/**
 * The provider new uploads are written to.
 *
 * When a second provider is added, this becomes the only place that changes for
 * writes. Reads continue to dispatch on each asset row's own
 * `storage_provider`, so previously uploaded files keep resolving through the
 * provider that actually holds them.
 */
export const ACTIVE_STORAGE_PROVIDER = "supabase";

/**
 * Resolve a provider by id.
 *
 * `client` is the request-scoped Supabase client; a future provider would read
 * its own credentials from the environment and ignore it.
 */
export function getStorageProvider(
  client: SupabaseClient,
  providerId: string = ACTIVE_STORAGE_PROVIDER,
): StorageProvider {
  switch (providerId) {
    case "supabase":
      return new SupabaseStorageProvider(client);
    default:
      throw new Error(
        `Unknown storage provider "${providerId}". This asset was written by a provider this build does not support.`,
      );
  }
}
