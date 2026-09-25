import "server-only";

import { Environment, Paddle } from "@paddle/paddle-node-sdk";

import { isPaddleConfigured, publicEnv, requireServerEnv } from "@/lib/env";
import type { PlanTier, SubscriptionStatus } from "@/lib/plans";

/**
 * Paddle Billing integration.
 *
 * Paddle is the approved provider and acts as Merchant of Record. All
 * subscription state is owned by Paddle and mirrored into our `subscriptions`
 * table by the webhook — the app never infers entitlement from a checkout
 * result in the browser, only from a verified webhook.
 */

let cached: Paddle | null = null;

export function getPaddle(): Paddle {
  if (cached) return cached;
  cached = new Paddle(requireServerEnv("PADDLE_API_KEY"), {
    environment:
      publicEnv.paddleEnvironment === "production" ? Environment.production : Environment.sandbox,
  });
  return cached;
}

export { isPaddleConfigured };

/** Paddle price id for a paid tier, or null when not configured. */
export function priceIdFor(tier: PlanTier): string | null {
  if (tier === "creator") return process.env.PADDLE_CREATOR_PRICE_ID || null;
  return null;
}

/**
 * Reverse lookup: which tier does this Paddle price grant?
 *
 * Only the creator price grants anything. A subscription created against the
 * retired pro price — none exist, billing was never switched on — resolves to
 * null here, which the webhook treats as no entitlement rather than guessing.
 */
export function tierForPriceId(priceId: string | null | undefined): PlanTier | null {
  if (!priceId) return null;
  if (priceId === process.env.PADDLE_CREATOR_PRICE_ID) return "creator";
  return null;
}

/**
 * Map a Paddle subscription status onto ours.
 *
 * Paddle Billing statuses: active, trialing, past_due, paused, canceled.
 * Anything unrecognised is treated as inactive, which falls back to the Free
 * allowance rather than silently granting a paid plan.
 */
export function mapPaddleStatus(status: string | null | undefined): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "cancelled":
      return "canceled";
    default:
      return "inactive";
  }
}

/**
 * Subscription lifecycle events we act on.
 *
 * `transaction.completed` is intentionally absent: a completed transaction is
 * a payment, not an entitlement. Entitlement changes arrive as subscription
 * events, which carry the authoritative status and period end.
 */
export const HANDLED_WEBHOOK_EVENTS = new Set([
  "subscription.created",
  "subscription.updated",
  "subscription.activated",
  "subscription.canceled",
  "subscription.cancelled",
  "subscription.paused",
  "subscription.resumed",
  "subscription.trialing",
  "subscription.past_due",
]);
