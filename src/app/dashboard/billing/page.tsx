import type { Metadata } from "next";

import { PlanPicker } from "@/components/plan-picker";
import { formatDate } from "@/lib/format";
import { isPaddleConfigured, publicEnv } from "@/lib/env";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getVaultSummary } from "@/lib/vault";

export const metadata: Metadata = { title: "Plan" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment overdue",
  paused: "Paused",
  canceled: "Cancelled",
  inactive: "Inactive",
};

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const summary = await getVaultSummary(supabase, user);
  const paddleReady = isPaddleConfigured();

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream-50 sm:text-3xl">
          Your plan
        </h1>
        <p className="mt-1 text-sm text-muted">
          Change how much storage your vault has.
        </p>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Current plan</p>
            <p className="mt-1 text-xl font-semibold text-cream-50">
              {summary.plan.name}{" "}
              <span className="text-base font-normal text-muted">
                &middot; {summary.plan.storageLabel}
              </span>
            </p>
          </div>
          <span className="rounded-full border border-ink-600 bg-ink-800 px-3 py-1 text-xs font-medium text-cream-300">
            {STATUS_LABEL[summary.status] ?? summary.status}
          </span>
        </div>

        {summary.currentPeriodEnd && summary.plan.tier !== "free" && (
          <p className="mt-4 text-sm text-muted">
            {summary.status === "canceled" ? "Access ends" : "Renews"} on{" "}
            {formatDate(summary.currentPeriodEnd)}.
          </p>
        )}
      </div>

      <PlanPicker
        currentTier={summary.plan.tier}
        paddleReady={paddleReady}
        clientToken={publicEnv.paddleClientToken}
        environment={publicEnv.paddleEnvironment}
        customerEmail={user.email ?? ""}
      />

      {summary.hasPaddleSubscription && (
        <div className="card">
          <h2 className="text-base font-semibold text-cream-50">Cancel or update payment</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your subscription is managed by Paddle, our payment provider. Use the link in any
            Paddle receipt email to update your payment method or cancel. Cancelling moves you
            back to the Free plan at the end of your billing period — your files stay in your
            vault and remain downloadable.
          </p>
        </div>
      )}
    </div>
  );
}
