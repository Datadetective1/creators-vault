import type { Metadata } from "next";

import Link from "next/link";

import { ConsentGate } from "@/components/consent-gate";
import { creatorPrice } from "@/components/pricing-section";
import { StorageMeter } from "@/components/storage-meter";
import { fmt } from "@/lib/i18n";
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

      {/* Uploading needs BOTH an active Creator subscription and current
          acceptance of the Terms, Privacy Policy and upload-rights statement.
          The server enforces each one independently (src/lib/vault.ts and
          migrations 0011/0012); this only decides what to show. */}
      {summary.canUpload ? (
        <ConsentGate initial={consent} previouslyAccepted={(history.count ?? 0) > 0} />
      ) : (
        <section className="card border-gold-400/40" data-testid="subscription-required">
          <h2 className="text-lg font-semibold text-cream-50">{t.dashboard.upload.subscribeTitle}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {fmt(t.dashboard.upload.subscribeBody, { price: (await creatorPrice(t)).priceLabel })}
          </p>
          <Link href="/dashboard/billing" className="btn-primary mt-5">
            {t.dashboard.upload.subscribeCta}
          </Link>
        </section>
      )}
    </div>
  );
}
