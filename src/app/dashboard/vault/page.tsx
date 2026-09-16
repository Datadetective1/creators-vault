import type { Metadata } from "next";
import Link from "next/link";

import { AssetTable } from "@/components/asset-table";
import { StorageMeter } from "@/components/storage-meter";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getVaultSummary, listAssets } from "@/lib/vault";

export const metadata: Metadata = { title: "My Vault" };
export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const [summary, assets] = await Promise.all([
    getVaultSummary(supabase, user),
    listAssets(supabase, user),
  ]);

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-cream-50 sm:text-3xl">
            My Vault
          </h1>
          <p className="mt-1 text-sm text-muted">
            {summary.fileCount === 0
              ? "Nothing here yet."
              : `${summary.fileCount} ${summary.fileCount === 1 ? "file" : "files"} protected.`}
          </p>
        </div>
        <Link href="/dashboard/upload" className="btn-primary shrink-0">
          Upload files
        </Link>
      </div>

      <div className="card">
        <StorageMeter
          usedBytes={summary.usedBytes}
          limitBytes={summary.limitBytes}
          percentUsed={summary.percentUsed}
        />
      </div>

      <AssetTable assets={assets} emptyHint />
    </div>
  );
}
