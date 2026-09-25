/**
 * Plan definitions.
 *
 * `storageLimitBytes` mirrors the `plans` table in migration 0001, narrowed by
 * migration 0006. The database is the enforcement point; this copy exists so
 * the UI can render pricing without a round trip.
 *
 * PILOT MODEL: two tiers, free and creator. The 500 GB "pro" tier was retired —
 * the pilot concept is a single paid tier at a flat price, so a third tier had
 * nothing to sell. Migration 0006 moves any row still on `pro` to `creator` and
 * deletes the plans row. The enum value itself is deliberately left in place
 * (Postgres cannot drop one without recreating the type, which would mean
 * rewriting every dependent column), so `planFor` still has to answer for it —
 * see RETIRED_TIERS below.
 *
 * Pricing is pilot pricing and is NOT wired to billing. `priceLabel` is a
 * display string; the Paddle price id it would charge against lives in
 * PADDLE_CREATOR_PRICE_ID and is unset until Amary confirms the final price and
 * the product is created in Paddle. Until then `isPaddleConfigured()` is false
 * and checkout refuses with a 503.
 */

export type PlanTier = "free" | "creator";

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
  /** Display price. Pilot pricing — not what Paddle charges, which is unset. */
  priceLabel: string;
  pricePeriod: string;
  tagline: string;
  features: string[];
  /** Which env var holds this plan's Paddle price id. Free has no price. */
  paddlePriceEnv: "PADDLE_CREATOR_PRICE_ID" | null;
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: "free",
    name: "Free",
    storageLimitBytes: 5 * GIB,
    storageLabel: "5 GB",
    priceLabel: "Free",
    pricePeriod: "",
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
    storageLabel: "Up to 100 GB",
    priceLabel: "$4",
    pricePeriod: "per month",
    tagline: "20 GB or 100 GB — the price is the same.",
    features: [
      "Up to 100 GB of private storage",
      "Upload video, photos, audio and documents",
      "Download anything, any time",
      "Private by default",
    ],
    paddlePriceEnv: "PADDLE_CREATOR_PRICE_ID",
  },
};

export const PLAN_ORDER: PlanTier[] = ["free", "creator"];

/**
 * Tiers that existed once and may still appear in stored rows.
 *
 * Mapped forward rather than dropped to free: someone who was on `pro` paid for
 * more than Free, and silently demoting them below what they bought would be
 * the wrong failure. `creator` is the highest tier that still exists, so that is
 * where they land. Migration 0006 does the same thing in the database; this is
 * the belt to its braces, for any row written before it ran.
 */
const RETIRED_TIERS: Record<string, PlanTier> = { pro: "creator" };

export function planFor(tier: string | null | undefined): PlanDefinition {
  if (tier === "creator" || tier === "free") return PLANS[tier];
  const retired = tier ? RETIRED_TIERS[tier] : undefined;
  if (retired) return PLANS[retired];
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
