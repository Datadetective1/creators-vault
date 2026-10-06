import type { Metadata } from "next";

import { ManageBillingButton } from "@/components/manage-billing-button";
import { creatorPrice } from "@/components/pricing-section";
import { PlanPicker } from "@/components/plan-picker";
import { formatDate } from "@/lib/format";
import { isPaddleConfigured, publicEnv } from "@/lib/env";
import { fmt } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getVaultSummary } from "@/lib/vault";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.common.dashboardNav.plan };
}

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { checkout } = await searchParams;

  const supabase = await createClient();
  const [summary, { locale, t }] = await Promise.all([getVaultSummary(supabase, user), getI18n()]);
  const paddleReady = isPaddleConfigured();
  // The Creator price as Paddle charges it in this visitor's country (₹399 in India).
  const { priceLabel: creatorPriceLabel } = await creatorPrice(t, locale);
  const d = t.dashboard;
  const plan = t.pricing.plans[summary.plan.tier];
  const statusLabel: Record<string, string> = d.status;

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream-50 sm:text-3xl">
          {d.billing.heading}
        </h1>
        <p className="mt-1 text-sm text-muted">{d.billing.intro}</p>
      </div>

      {checkout === "complete" && summary.plan.tier === "free" && (
        <p
          role="status"
          className="rounded-xl border border-gold-400/40 bg-gold-400/10 px-4 py-3 text-sm text-gold-300"
        >
          {d.billing.checkoutComplete}
        </p>
      )}

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">{d.currentPlan}</p>
            <p className="mt-1 text-xl font-semibold text-cream-50">
              {plan.name}{" "}
              <span className="text-base font-normal text-muted">
                &middot; {plan.storageLabel}
              </span>
            </p>
          </div>
          <span className="rounded-full border border-ink-600 bg-ink-800 px-3 py-1 text-xs font-medium text-cream-300">
            {statusLabel[summary.status] ?? summary.status}
          </span>
        </div>

        {summary.plan.tier !== "free" && summary.scheduledCancelAt ? (
          <p className="mt-4 text-sm text-muted">
            {fmt(d.billing.cancelScheduled, {
              plan: plan.name,
              date: formatDate(summary.scheduledCancelAt, locale),
              free: t.pricing.plans.free.name,
            })}
          </p>
        ) : (
          summary.currentPeriodEnd &&
          summary.plan.tier !== "free" && (
            <p className="mt-4 text-sm text-muted">
              {fmt(summary.status === "canceled" ? d.billing.accessEndsOn : d.billing.renewsOn, {
                date: formatDate(summary.currentPeriodEnd, locale),
              })}
            </p>
          )
        )}
      </div>

      <PlanPicker
        currentTier={summary.plan.tier}
        paddleReady={paddleReady}
        clientToken={publicEnv.paddleClientToken}
        environment={publicEnv.paddleEnvironment}
        paddleCustomerId={summary.paddleCustomerId}
        customerEmail={user.email ?? ""}
        creatorPriceLabel={creatorPriceLabel}
      />

      {summary.hasPaddleSubscription && (
        <div className="card">
          <h2 className="text-base font-semibold text-cream-50">{d.billing.manageHeading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {d.billing.manageBody}
          </p>
          {paddleReady && <ManageBillingButton />}
        </div>
      )}
    </div>
  );
}
