/**
 * Plan definitions.
 *
 * `storageLimitBytes` mirrors the `plans` table in migration 0001. The
 * database is the enforcement point; this copy exists so the UI can render
 * pricing without a round trip.
 */

export type PlanTier = "free" | "creator" | "pro";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled"
  | "inactive";

const GIB = 1024 ** 3;

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  storageLimitBytes: number;
  storageLabel: string;
  priceLabel: string;
  tagline: string;
  features: string[];
  /** Which env var holds this plan's Paddle price id. Free has no price. */
  paddlePriceEnv: "PADDLE_CREATOR_PRICE_ID" | "PADDLE_PRO_PRICE_ID" | null;
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: "free",
    name: "Free",
    storageLimitBytes: 5 * GIB,
    storageLabel: "5 GB",
    priceLabel: "Free",
    tagline: "Try it with your most important files.",
    features: [
      "5 GB of private storage",
      "Upload video, photos, audio and documents",
      "Download anything, any time",
      "Private by default",
    ],
    paddlePriceEnv: null,
  },
  creator: {
    tier: "creator",
    name: "Creator",
    storageLimitBytes: 100 * GIB,
    storageLabel: "100 GB",
    priceLabel: "Creator",
    tagline: "For creators publishing every week.",
    features: [
      "100 GB of private storage",
      "Everything in Free",
      "Room for full-resolution video",
      "Priority email support",
    ],
    paddlePriceEnv: "PADDLE_CREATOR_PRICE_ID",
  },
  pro: {
    tier: "pro",
    name: "Pro",
    storageLimitBytes: 500 * GIB,
    storageLabel: "500 GB",
    priceLabel: "Pro",
    tagline: "For full-time creators and small studios.",
    features: [
      "500 GB of private storage",
      "Everything in Creator",
      "Large back-catalogue archives",
      "Priority email support",
    ],
    paddlePriceEnv: "PADDLE_PRO_PRICE_ID",
  },
};

export const PLAN_ORDER: PlanTier[] = ["free", "creator", "pro"];

export function planFor(tier: string | null | undefined): PlanDefinition {
  if (tier === "creator" || tier === "pro" || tier === "free") return PLANS[tier];
  return PLANS.free;
}

/** A plan only grants its allowance while the subscription is in good standing. */
export function effectivePlan(
  tier: string | null | undefined,
  status: string | null | undefined,
): PlanDefinition {
  const plan = planFor(tier);
  if (plan.tier === "free") return plan;
  const healthy = status === "active" || status === "trialing" || status === "past_due";
  return healthy ? plan : PLANS.free;
}
