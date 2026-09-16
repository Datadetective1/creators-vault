import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { ACTIVE_STORAGE_PROVIDER, getStorageProvider } from "@/lib/storage";
import type { StorageProvider, UploadTarget } from "@/lib/storage";
import { effectivePlan } from "@/lib/plans";
import { checkFile, sanitizeFilename } from "@/lib/validation";
import type { AssetRow, SubscriptionRow, VaultSummary } from "@/lib/types";

export type { AssetRow, SubscriptionRow, VaultSummary } from "@/lib/types";

/**
 * Vault business logic.
 *
 * Route handlers stay thin: they parse input and call into here. Nothing in
 * this file references a Supabase storage URL or path shape — object access
 * goes through the StorageProvider interface, so swapping providers later does
 * not touch quota, ownership, or lifecycle logic.
 */

/** Signed-out callers get nothing; this is the single gate for vault reads. */
export class NotAuthenticatedError extends Error {
  constructor() {
    super("You must be signed in.");
    this.name = "NotAuthenticatedError";
  }
}

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class AssetNotFoundError extends Error {
  constructor() {
    super("That file does not exist in your vault.");
    this.name = "AssetNotFoundError";
  }
}

async function readSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionRow | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, paddle_subscription_id, paddle_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as SubscriptionRow | null) ?? null;
}

async function readUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ usedBytes: number; fileCount: number }> {
  // RLS restricts this to the caller's own rows; user_id is pinned as well so
  // the intent is explicit rather than relying solely on the policy.
  const { data } = await supabase
    .from("assets")
    .select("file_size_bytes")
    .eq("user_id", userId);

  const rows = (data ?? []) as Array<{ file_size_bytes: number }>;
  return {
    usedBytes: rows.reduce((total, row) => total + Number(row.file_size_bytes ?? 0), 0),
    fileCount: rows.length,
  };
}

export async function getVaultSummary(
  supabase: SupabaseClient,
  user: User,
): Promise<VaultSummary> {
  const [subscription, usage] = await Promise.all([
    readSubscription(supabase, user.id),
    readUsage(supabase, user.id),
  ]);

  const plan = effectivePlan(subscription?.plan, subscription?.status);
  const limitBytes = plan.storageLimitBytes;

  return {
    plan,
    status: subscription?.status ?? "active",
    currentPeriodEnd: subscription?.current_period_end ?? null,
    usedBytes: usage.usedBytes,
    fileCount: usage.fileCount,
    limitBytes,
    percentUsed: limitBytes > 0 ? Math.min(100, (usage.usedBytes / limitBytes) * 100) : 0,
    hasPaddleSubscription: Boolean(subscription?.paddle_subscription_id),
  };
}

export async function listAssets(
  supabase: SupabaseClient,
  user: User,
  limit?: number,
): Promise<AssetRow[]> {
  let query = supabase
    .from("assets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AssetRow[];
}

/**
 * Validate and mint an upload target.
 *
 * This is the happy path, not a security boundary. Every browser holds the
 * anon key and the user's JWT, so PostgREST and the Storage API are reachable
 * without going through here at all — which means the checks in this function
 * are for giving a clear error, and the database is what actually enforces
 * size, type and quota (migrations 0002 and 0004).
 */
export async function createUpload(
  supabase: SupabaseClient,
  user: User,
  input: { filename: string; mimeType: string; sizeBytes: number },
): Promise<UploadTarget> {
  const filename = sanitizeFilename(input.filename);

  const check = checkFile(filename, input.mimeType, input.sizeBytes);
  if (!check.ok) throw new ValidationError(check.error ?? "That file is not supported.");

  const provider = getStorageProvider(supabase, ACTIVE_STORAGE_PROVIDER);

  // Opportunistic tidy-up of abandoned uploads. Best effort and strictly
  // bounded: it must never decide whether this upload is allowed.
  await sweepAbandonedUploads(supabase, user, provider);

  /*
   * A friendly pre-flight check, not the control.
   *
   * The real enforcement is in the database (migration 0004): a trigger
   * overwrites file_size_bytes from the stored object and checks the plan
   * limit under a per-user lock, so it applies to every path — including a
   * client talking to PostgREST and Storage directly with the anon key, which
   * never reaches this function at all.
   */
  const summary = await getVaultSummary(supabase, user);
  if (summary.usedBytes + input.sizeBytes > summary.limitBytes) {
    const remaining = Math.max(0, summary.limitBytes - summary.usedBytes);
    throw new QuotaExceededError(
      `This upload would exceed your ${summary.plan.name} plan storage. You have ${formatBytesForError(remaining)} left.`,
    );
  }

  const key = provider.buildKey(user.id, filename);
  return provider.createUploadTarget(key, input.mimeType);
}

/**
 * Record an asset after the bytes have landed.
 *
 * The size written to the database is read back from the storage provider, not
 * taken from the client, so a caller cannot understate a file's size to cheat
 * the quota. The key's owner prefix is re-checked here as well.
 */
export async function finalizeUpload(
  supabase: SupabaseClient,
  user: User,
  input: { storageKey: string; filename: string; mimeType: string },
): Promise<AssetRow> {
  // Strict shape rather than a prefix test: `<uid>/<name>` and nothing else.
  // A startsWith check would accept `<uid>/../<victim>/file`, which is inert
  // today but would become a traversal the moment this path changed.
  if (!ownedKeyPattern(user.id).test(input.storageKey)) {
    throw new ValidationError("That storage location does not belong to you.");
  }

  const provider = getStorageProvider(supabase, ACTIVE_STORAGE_PROVIDER);
  const stored = await provider.stat(input.storageKey);
  if (!stored) {
    throw new ValidationError("The upload did not complete. Please try again.");
  }

  const filename = sanitizeFilename(input.filename);

  // Re-validate against what was actually stored, not what the client declared.
  // The signed upload URL does not bind a content type, so the bytes that
  // landed may not be the type the upload was authorised for.
  const storedCheck = checkFile(filename, stored.mimeType || input.mimeType, stored.sizeBytes);
  if (!storedCheck.ok) {
    await provider.remove([input.storageKey]);
    throw new ValidationError(storedCheck.error ?? "That file is not supported.");
  }

  const summary = await getVaultSummary(supabase, user);

  // The object is already stored, so an over-quota upload is rolled back rather
  // than recorded. The database enforces this too (migration 0004); this branch
  // gives the user a clear message instead of a raw constraint error.
  if (summary.usedBytes + stored.sizeBytes > summary.limitBytes) {
    await provider.remove([input.storageKey]);
    throw new QuotaExceededError(
      `That file would exceed your ${summary.plan.name} plan storage, so it was not saved.`,
    );
  }

  const { data, error } = await supabase
    .from("assets")
    .insert({
      user_id: user.id,
      filename,
      storage_provider: provider.id,
      storage_key: input.storageKey,
      mime_type: stored.mimeType || input.mimeType,
      file_size_bytes: stored.sizeBytes,
    })
    .select("*")
    .single();

  if (error || !data) {
    /*
     * A unique violation means this key was already finalised — a double
     * submit, or a retry after a dropped response. The first row is valid and
     * points at these bytes, so deleting the object here would destroy a live
     * file the vault still lists. Return the existing row instead, making
     * finalise idempotent.
     */
    if (error?.code === "23505") {
      const existing = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .eq("storage_provider", provider.id)
        .eq("storage_key", input.storageKey)
        .maybeSingle();

      if (existing.data) return existing.data as AssetRow;
      throw new Error("That file could not be saved.");
    }

    // Any other failure leaves bytes with no row; remove them.
    await provider.remove([input.storageKey]);
    throw new Error(error?.message ?? "Could not save that file.");
  }

  return data as AssetRow;
}

async function readOwnedAsset(
  supabase: SupabaseClient,
  user: User,
  assetId: string,
): Promise<AssetRow> {
  const { data } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) throw new AssetNotFoundError();
  return data as AssetRow;
}

export async function getDownloadUrl(
  supabase: SupabaseClient,
  user: User,
  assetId: string,
): Promise<string> {
  const asset = await readOwnedAsset(supabase, user, assetId);
  // Dispatch on the row's own provider so files written by an earlier provider
  // keep resolving after a migration.
  const provider = getStorageProvider(supabase, asset.storage_provider);
  return provider.createDownloadUrl(asset.storage_key, {
    expiresInSeconds: 60,
    downloadFilename: asset.filename,
  });
}

/** Removes the stored object first, then the row. */
export async function deleteAsset(
  supabase: SupabaseClient,
  user: User,
  assetId: string,
): Promise<void> {
  const asset = await readOwnedAsset(supabase, user, assetId);
  const provider = getStorageProvider(supabase, asset.storage_provider);

  await provider.remove([asset.storage_key]);

  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", asset.id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

/** `<user id>/<opaque name>` — no path segments, no traversal. */
function ownedKeyPattern(userId: string): RegExp {
  return new RegExp(`^${userId.replace(/[^0-9a-fA-F-]/g, "")}/[A-Za-z0-9._-]{1,200}$`);
}

/** In-flight uploads are given this long before they count as abandoned. */
const ORPHAN_GRACE_MS = 60 * 60 * 1000; // 1 hour — matches the upload URL TTL

/** Hard ceiling on sweep work per request, so upload latency stays flat. */
const SWEEP_SCAN_LIMIT = 400;
const SWEEP_DELETE_LIMIT = 100;
const SWEEP_DELETE_CHUNK = 50;

/**
 * Delete stored objects that have no asset row.
 *
 * An upload leaves bytes in storage before its metadata row is written, so a
 * dropped connection — common on mobile data — strands an object that nothing
 * lists and nothing can delete. This clears them.
 *
 * Three rules keep it safe to run on the upload path:
 *   * bounded — it scans and deletes a fixed maximum per call, so a vault with
 *     many objects cannot turn one upload into hundreds of round trips;
 *   * chunked — deletions go out in small batches rather than one huge request;
 *   * advisory — every failure is swallowed. It returns nothing and gates
 *     nothing, so a failed sweep can never block the upload that triggered it.
 *     Quota is the database's job.
 *
 * Objects younger than the grace period, and any whose age is unknown, are
 * left alone so an upload in progress is never destroyed.
 */
async function sweepAbandonedUploads(
  supabase: SupabaseClient,
  user: User,
  provider: StorageProvider,
): Promise<void> {
  try {
    const objects = await provider.listOwned(user.id, SWEEP_SCAN_LIMIT);
    if (objects.length === 0) return;

    const { data } = await supabase
      .from("assets")
      .select("storage_key")
      .eq("user_id", user.id)
      .eq("storage_provider", provider.id);

    const recorded = new Set(
      (data ?? []).map((row) => (row as { storage_key: string }).storage_key),
    );
    const cutoff = Date.now() - ORPHAN_GRACE_MS;

    const orphans = objects
      .filter((object) => {
        if (recorded.has(object.key)) return false;
        if (!object.createdAt) return false;
        const created = new Date(object.createdAt).getTime();
        return Number.isFinite(created) && created < cutoff;
      })
      .slice(0, SWEEP_DELETE_LIMIT);

    for (let i = 0; i < orphans.length; i += SWEEP_DELETE_CHUNK) {
      const batch = orphans.slice(i, i + SWEEP_DELETE_CHUNK).map((object) => object.key);
      await provider.remove(batch);
    }
  } catch (error) {
    // Tidy-up is never worth failing a user's upload over.
    console.error("[vault] abandoned-upload sweep failed", error);
  }
}

function formatBytesForError(bytes: number): string {
  const gib = bytes / 1024 ** 3;
  if (gib >= 1) return `${gib.toFixed(1)} GB`;
  const mib = bytes / 1024 ** 2;
  return `${Math.max(0, Math.round(mib))} MB`;
}
