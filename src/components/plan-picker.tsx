"use client";

import { useEffect, useRef, useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

import { PLAN_ORDER, PLANS, type PlanTier } from "@/lib/plans";

/**
 * Plan selection, backed by Paddle Checkout.
 *
 * The overlay only collects payment. Entitlement is applied when Paddle calls
 * our verified webhook, so a user who closes the overlay mid-flow — or tampers
 * with the page — never gains a paid plan.
 */
export function PlanPicker({
  currentTier,
  paddleReady,
  clientToken,
  environment,
  customerEmail,
}: {
  currentTier: PlanTier;
  paddleReady: boolean;
  clientToken: string;
  environment: string;
  customerEmail: string;
}) {
  const paddleRef = useRef<Paddle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);

  useEffect(() => {
    if (!paddleReady || !clientToken) return;
    let cancelled = false;

    initializePaddle({
      token: clientToken,
      environment: environment === "production" ? "production" : "sandbox",
    })
      .then((instance) => {
        if (!cancelled && instance) paddleRef.current = instance;
      })
      .catch(() => {
        if (!cancelled) setError("Checkout could not be loaded. Please refresh and try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [paddleReady, clientToken, environment]);

  async function choosePlan(tier: PlanTier) {
    if (tier === "free" || tier === currentTier) return;

    setError(null);
    setLoadingTier(tier);

    try {
      // The server decides which price id this tier maps to and attaches the
      // user id, so the browser cannot request a plan it has not paid for.
      const response = await fetch("/api/paddle/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const body = (await response.json()) as {
        priceId?: string;
        customData?: Record<string, unknown>;
        error?: string;
      };

      if (!response.ok || !body.priceId) {
        throw new Error(body.error ?? "Could not start checkout.");
      }

      const paddle = paddleRef.current;
      if (!paddle) throw new Error("Checkout is still loading. Please try again in a moment.");

      paddle.Checkout.open({
        items: [{ priceId: body.priceId, quantity: 1 }],
        customer: customerEmail ? { email: customerEmail } : undefined,
        customData: body.customData,
        settings: { displayMode: "overlay", theme: "dark" },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start checkout.");
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <div className="space-y-4">
      {!paddleReady && (
        <p
          role="status"
          className="rounded-xl border border-gold-400/40 bg-gold-400/10 px-4 py-3 text-sm text-gold-300"
        >
          Paid plans are not switched on for this deployment yet. Your vault works on the Free
          plan in the meantime.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-400"
        >
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {PLAN_ORDER.map((tier) => {
          const plan = PLANS[tier];
          const isCurrent = tier === currentTier;

          return (
            <div
              key={tier}
              className={
                isCurrent
                  ? "rounded-2xl border-2 border-gold-400 bg-ink-850 p-5"
                  : "rounded-2xl border border-ink-700 bg-ink-850 p-5"
              }
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-cream-50">{plan.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-gold-400 px-2.5 py-0.5 text-xs font-semibold text-ink-950">
                    Current
                  </span>
                )}
              </div>

              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tracking-tight text-gold-400">
                  {plan.priceLabel}
                </span>
                {plan.pricePeriod && (
                  <span className="text-sm text-muted">{plan.pricePeriod}</span>
                )}
              </p>
              <p className="text-sm text-cream-300">{plan.storageLabel}</p>
              <p className="mt-1 text-sm text-muted">{plan.tagline}</p>

              <button
                type="button"
                onClick={() => choosePlan(tier)}
                disabled={isCurrent || tier === "free" || !paddleReady || loadingTier !== null}
                className={isCurrent ? "btn-secondary mt-5 w-full" : "btn-primary mt-5 w-full"}
              >
                {isCurrent
                  ? "Your plan"
                  : tier === "free"
                    ? "Included"
                    : loadingTier === tier
                      ? "Opening…"
                      : `Switch to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
