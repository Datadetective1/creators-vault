"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

import { apiErrorMessage } from "@/lib/api-errors";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { LEGAL } from "@/lib/legal";
import { PLAN_ORDER, PLANS, type PlanTier } from "@/lib/plans";

/** A failure whose message is already in the visitor's language. */
class ShownError extends Error {}

/**
 * Stored in `error` when Paddle.js fails to load; translated at render time so
 * the effect below does not depend on the dictionary.
 */
const LOAD_FAILED = "load_failed";

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
  paddleCustomerId,
  creatorPriceLabel,
}: {
  currentTier: PlanTier;
  paddleReady: boolean;
  clientToken: string;
  environment: string;
  customerEmail: string;
  /** The signed-in user's Paddle customer id (ctm_…), once they have one. */
  paddleCustomerId: string | null;
  /** The Creator price as Paddle charges it in this visitor's country. */
  creatorPriceLabel?: string;
}) {
  const { t } = useI18n();
  const d = t.dashboard;
  const paddleRef = useRef<Paddle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  // Paid buttons stay disabled until Paddle.js is ready, so a quick click
  // cannot land before the overlay exists.
  const [checkoutReady, setCheckoutReady] = useState(false);

  useEffect(() => {
    if (!paddleReady || !clientToken) return;
    let cancelled = false;

    initializePaddle({
      token: clientToken,
      environment: environment === "production" ? "production" : "sandbox",
      // Paddle Retain identifies the customer by their Paddle customer id —
      // never our user id or email. Empty until they have checked out once.
      pwCustomer: paddleCustomerId ? { id: paddleCustomerId } : {},
    })
      .then((instance) => {
        if (!cancelled && instance) {
          paddleRef.current = instance;
          setCheckoutReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError(LOAD_FAILED);
      });

    return () => {
      cancelled = true;
    };
  }, [paddleReady, clientToken, environment, paddleCustomerId]);

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
        countryCode?: string | null;
        error?: string;
        code?: string;
      };

      if (!response.ok || !body.priceId) {
        throw new ShownError(apiErrorMessage(t, body.code, d.planPicker.startFailed));
      }

      const paddle = paddleRef.current;
      if (!paddle) throw new ShownError(d.planPicker.stillLoading);

      paddle.Checkout.open({
        items: [{ priceId: body.priceId, quantity: 1 }],
        customer: customerEmail
          ? {
              email: customerEmail,
              ...(body.countryCode ? { address: { countryCode: body.countryCode } } : {}),
            }
          : undefined,
        customData: body.customData,
        settings: {
          displayMode: "overlay",
          theme: "dark",
          // Back to the plan page once paid. The plan itself only changes when
          // the verified webhook lands; the page explains that while it waits.
          successUrl: `${window.location.origin}/dashboard/billing?checkout=complete`,
        },
      });
    } catch (cause) {
      setError(cause instanceof ShownError ? cause.message : d.planPicker.startFailed);
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
          {d.planPicker.notEnabled}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-400"
        >
          {error === LOAD_FAILED ? d.planPicker.loadFailed : error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {PLAN_ORDER.map((tier) => {
          const plan = PLANS[tier];
          const copy = t.pricing.plans[tier];
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
                <h3 className="text-base font-semibold text-cream-50">{copy.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-gold-400 px-2.5 py-0.5 text-xs font-semibold text-ink-950">
                    {d.planPicker.current}
                  </span>
                )}
              </div>

              <p className="mt-3 flex flex-wrap items-baseline gap-x-0.5">
                <span className="text-2xl font-semibold tracking-tight text-gold-400">
                  {tier === "free"
                    ? t.pricing.plans.free.priceLabel
                    : (creatorPriceLabel ?? plan.priceLabel)}
                </span>
                {tier === "creator" && (
                  <span className="text-sm text-muted">{t.pricing.plans.creator.pricePeriod}</span>
                )}
              </p>
              <p className="text-sm text-cream-300">{copy.storageLabel}</p>
              <p className="mt-1 text-sm text-muted">{copy.tagline}</p>

              <button
                type="button"
                onClick={() => choosePlan(tier)}
                disabled={
                  isCurrent ||
                  tier === "free" ||
                  !paddleReady ||
                  !checkoutReady ||
                  loadingTier !== null
                }
                className={isCurrent ? "btn-secondary mt-5 w-full" : "btn-primary mt-5 w-full"}
              >
                {isCurrent
                  ? d.planPicker.yourPlan
                  : tier === "free"
                    ? d.planPicker.included
                    : loadingTier === tier
                      ? d.planPicker.opening
                      : paddleReady && !checkoutReady
                        ? d.planPicker.loadingCheckout
                        : fmt(d.planPicker.switchTo, { plan: copy.name })}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-muted">
        {renderTemplate(d.planPicker.legalNote, {
          plan: t.pricing.plans.creator.name,
          terms: (
            <Link href="/terms" className="text-cream-300 underline underline-offset-2 hover:text-cream-50">
              {t.common.legalLinks.terms}
            </Link>
          ),
          refunds: (
            <Link href="/refunds" className="text-cream-300 underline underline-offset-2 hover:text-cream-50">
              {t.common.legalLinks.refunds}
            </Link>
          ),
        })}{" "}
        {LEGAL.billingEmail &&
          renderTemplate(d.planPicker.billingQuestions, {
            email: (
              <a
                href={`mailto:${LEGAL.billingEmail}`}
                className="text-cream-300 underline underline-offset-2 hover:text-cream-50"
              >
                {LEGAL.billingEmail}
              </a>
            ),
          })}
      </p>
    </div>
  );
}

/** Like fmt(), but placeholders may be React nodes (links). */
function renderTemplate(template: string, values: Record<string, React.ReactNode>) {
  return template.split(/(\{\w+\})/g).map((part, index) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={index}>{key !== undefined && key in values ? values[key] : part}</Fragment>;
  });
}
