import type { Metadata } from "next";
import Link from "next/link";

import { AssetTable } from "@/components/asset-table";
import { StorageMeter } from "@/components/storage-meter";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getVaultSummary, listAssets } from "@/lib/vault";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.common.dashboardNav.files };
}

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const [summary, assets, { t }] = await Promise.all([
    getVaultSummary(supabase, user),
    listAssets(supabase, user),
    getI18n(),
  ]);
  const d = t.dashboard;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-cream-50 sm:text-3xl">
            {t.common.dashboardNav.files}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {summary.fileCount === 0
              ? d.files.empty
              : fmt(summary.fileCount === 1 ? d.files.countOne : d.files.countMany, {
                  count: summary.fileCount,
                })}
          </p>
        </div>
        <Link href="/dashboard/upload" className="btn-primary shrink-0">
          {d.uploadFiles}
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
