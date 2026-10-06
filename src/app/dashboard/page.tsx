import type { Metadata } from "next";
import Link from "next/link";

import { StorageMeter } from "@/components/storage-meter";
import { AssetTable } from "@/components/asset-table";
import { formatBytes } from "@/lib/format";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getVaultSummary, listAssets } from "@/lib/vault";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.common.dashboardNav.dashboard };
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout redirects; this satisfies the type narrowing

  const supabase = await createClient();
  const [summary, recent, { t }] = await Promise.all([
    getVaultSummary(supabase, user),
    listAssets(supabase, user, 5),
    getI18n(),
  ]);
  const d = t.dashboard;
  const plan = t.pricing.plans[summary.plan.tier];

  const firstName =
    (user.user_metadata?.["display_name"] as string | undefined)?.split(" ")[0] ?? null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-cream-50 sm:text-3xl">
            {firstName ? fmt(d.overview.welcomeNamed, { name: firstName }) : d.overview.welcome}
          </h1>
          <p className="mt-1 text-sm text-muted">{d.overview.intro}</p>
        </div>
        <Link href="/dashboard/upload" className="btn-primary shrink-0">
          {d.uploadFiles}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={d.currentPlan} value={plan.name} sub={plan.storageLabel} />
        <StatCard
          label={d.overview.filesProtected}
          value={String(summary.fileCount)}
          sub={summary.fileCount === 1 ? d.fileOne : d.fileMany}
        />
        <StatCard
          label={d.overview.storageUsed}
          value={formatBytes(summary.usedBytes)}
          sub={fmt(d.overview.ofTotal, { total: plan.storageLabel })}
        />
      </div>

      <div className="card">
        <StorageMeter
          usedBytes={summary.usedBytes}
          limitBytes={summary.limitBytes}
          percentUsed={summary.percentUsed}
        />
        {summary.plan.tier === "free" && (
          <p className="mt-4 text-sm text-muted">
            {d.overview.needMoreRoom}{" "}
            <Link href="/dashboard/billing" className="font-medium text-gold-400 hover:text-gold-300">
              {d.overview.seePlans}
            </Link>
          </p>
        )}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-cream-50">{d.overview.recentFiles}</h2>
          {summary.fileCount > 0 && (
            <Link href="/dashboard/files" className="text-sm text-gold-400 hover:text-gold-300">
              {d.overview.viewAll}
            </Link>
          )}
        </div>
        <AssetTable assets={recent} emptyHint />
      </section>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-cream-50">{value}</p>
      <p className="text-sm text-muted">{sub}</p>
    </div>
  );
}
