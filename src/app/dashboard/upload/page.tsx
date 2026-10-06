import type { Metadata } from "next";

import { ConsentGate } from "@/components/consent-gate";
import { StorageMeter } from "@/components/storage-meter";
import { getI18n } from "@/lib/i18n/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getUploadConsentStatus, getVaultSummary } from "@/lib/vault";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.common.dashboardNav.upload };
}

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { t } = await getI18n();
  const supabase = await createClient();
  const [summary, consent, history] = await Promise.all([
    getVaultSummary(supabase, user),
    getUploadConsentStatus(supabase),
    supabase.from("legal_acceptances").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream-50 sm:text-3xl">
          {t.dashboard.uploadFiles}
        </h1>
        <p className="mt-1 text-sm text-muted">{t.dashboard.upload.intro}</p>
      </div>

      <div className="card">
        <StorageMeter
          usedBytes={summary.usedBytes}
          limitBytes={summary.limitBytes}
          percentUsed={summary.percentUsed}
        />
      </div>

      <ConsentGate initial={consent} previouslyAccepted={(history.count ?? 0) > 0} />
    </div>
  );
}
