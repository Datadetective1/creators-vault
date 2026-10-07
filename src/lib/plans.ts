/**
 * Plan definitions.
 *
 * `storageLimitBytes` mirrors the `plans` table in migration 0001, narrowed by
 * migration 0006. The database is the enforcement point; this copy exists so
 * the UI can render pricing without a round trip.
 *
 * ONE CUSTOMER-FACING PLAN: Creator, 100 GB. `free` survives only as the
 * internal tier for "no active subscription" — the value the webhook writes when
 * a subscription ends — and it grants NO storage: such an account can sign in,
 * view, download and delete what it already has, but cannot upload (enforced in
 * src/lib/vault.ts and, for every path, by migration 0012). It is never sold or
 * shown as a plan.
 *
 * History: the 500 GB "pro" tier was retired —
 * the pilot concept is a single paid tier at a flat price, so a third tier had
 * nothing to sell. Migration 0006 moves any row still on `pro` to `creator` and
 * deletes the plans row. The enum value itself is deliberately left in place
 * (Postgres cannot drop one without recreating the type, which would mean
 * rewriting every dependent column), so `planFor` still has to answer for it —
 * see RETIRED_TIERS below.
 *
 * `priceLabel` is only the fallback display price. The advertised price is
 * read from Paddle (src/lib/paddle-pricing.ts), so it cannot drift from what
 * checkout charges.
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
  /** No active subscription. Not a plan anyone buys; grants no storage. */
  free: {
    tier: "free",
    name: "No active plan",
    storageLimitBytes: 0,
    storageLabel: "",
    priceLabel: "",
    pricePeriod: "",
    tagline: "",
    features: [],
    paddlePriceEnv: null,
  },
  creator: {
    tier: "creator",
    name: "Creator",
    storageLimitBytes: 100 * GIB,
    storageLabel: "100 GB",
    // Fallback only: matches the India price configured in Paddle (₹399 incl.
    // GST). The page shows Paddle's own figure whenever it can reach Paddle.
    priceLabel: "₹399",
    pricePeriod: "/month",
    tagline: "100 GB of private storage.",
    features: [
      "100 GB of private storage",
      "Upload video, photos, audio and documents",
      "Download anything, any time",
      "Private by default",
    ],
    paddlePriceEnv: "PADDLE_CREATOR_PRICE_ID",
  },
};

/** The plans offered to customers. */
export const PLAN_ORDER: PlanTier[] = ["creator"];

/** Whether this plan allows new uploads. Only an active Creator subscription does. */
export function canUpload(plan: PlanDefinition): boolean {
  return plan.tier === "creator";
}

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
