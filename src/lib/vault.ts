import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { ACTIVE_STORAGE_PROVIDER, getStorageProvider } from "@/lib/storage";
import type { UploadTarget } from "@/lib/storage";
import { effectivePlan, type PlanDefinition } from "@/lib/plans";
import { checkFile, sanitizeFilename } from "@/lib/validation";

/**
 * Vault business logic.
 *
 * Route handlers stay thin: they parse input and call into here. Nothing in
 * this file references a Supabase storage URL or path shape — object access
 * goes through the StorageProvider interface, so swapping providers later does
 * not touch quota, ownership, or lifecycle logic.
 */

export interface AssetRow {
  id: string;
  user_id: string;
  filename: string;
  storage_provider: string;
  storage_key: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
}

export interface SubscriptionRow {
  plan: string;
  status: string;
  current_period_end: string | null;
  paddle_subscription_id: string | null;
  paddle_customer_id: string | null;
}

export interface VaultSummary {
  plan: PlanDefinition;
  status: string;
  currentPeriodEnd: string | null;
  usedBytes: number;
  fileCount: number;
  limitBytes: number;
  percentUsed: number;
  hasPaddleSubscription: boolean;
}

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
 * Validate, enforce quota, and mint an upload target.
 *
 * Quota is checked here — before any bytes move — because this is the only
 * place an upload can be authorised. The client-side check in the upload form
 * is a convenience; this one is the control.
 */
export async function createUpload(
  supabase: SupabaseClient,
  user: User,
  input: { filename: string; mimeType: string; sizeBytes: number },
): Promise<UploadTarget> {
  const filename = sanitizeFilename(input.filename);

  const check = checkFile(filename, input.mimeType, input.sizeBytes);
  if (!check.ok) throw new ValidationError(check.error ?? "That file is not supported.");

  const summary = await getVaultSummary(supabase, user);
  if (summary.usedBytes + input.sizeBytes > summary.limitBytes) {
    const remaining = Math.max(0, summary.limitBytes - summary.usedBytes);
    throw new QuotaExceededError(
      `This upload would exceed your ${summary.plan.name} plan storage. You have ${formatBytesForError(remaining)} left.`,
    );
  }

  const provider = getStorageProvider(supabase, ACTIVE_STORAGE_PROVIDER);
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
  if (!input.storageKey.startsWith(`${user.id}/`)) {
    throw new ValidationError("That storage location does not belong to you.");
  }

  const provider = getStorageProvider(supabase, ACTIVE_STORAGE_PROVIDER);
  const stored = await provider.stat(input.storageKey);
  if (!stored) {
    throw new ValidationError("The upload did not complete. Please try again.");
  }

  const filename = sanitizeFilename(input.filename);
  const summary = await getVaultSummary(supabase, user);

  // The object is already stored, so an over-quota upload is rolled back rather
  // than recorded.
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
    // Do not leave an orphaned object behind if the metadata write fails.
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

function formatBytesForError(bytes: number): string {
  const gib = bytes / 1024 ** 3;
  if (gib >= 1) return `${gib.toFixed(1)} GB`;
  const mib = bytes / 1024 ** 2;
  return `${Math.max(0, Math.round(mib))} MB`;
}
