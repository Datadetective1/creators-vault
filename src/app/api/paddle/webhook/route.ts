import { NextResponse, type NextRequest } from "next/server";

import { requireServerEnv } from "@/lib/env";
import { getPaddle, HANDLED_WEBHOOK_EVENTS, mapPaddleStatus, tierForPriceId } from "@/lib/paddle";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Paddle webhook — the only source of truth for entitlement.
 *
 * The browser is never trusted to report a successful payment: a plan changes
 * here, after Paddle's signature has been verified, or not at all.
 *
 * Runs on Node (not Edge) because signature verification needs the raw body
 * exactly as sent.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubscriptionEventData {
  id?: string;
  status?: string;
  customerId?: string;
  currentBillingPeriod?: { endsAt?: string } | null;
  customData?: Record<string, unknown> | null;
  items?: Array<{ price?: { id?: string } | null }>;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("paddle-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Must be the raw body — any re-serialisation would invalidate the HMAC.
  const rawBody = await request.text();

  let event;
  try {
    const paddle = getPaddle();
    event = await paddle.webhooks.unmarshal(
      rawBody,
      requireServerEnv("PADDLE_WEBHOOK_SECRET"),
      signature,
    );
  } catch (error) {
    console.error("[paddle] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  if (!event) {
    return NextResponse.json({ error: "Unreadable event." }, { status: 400 });
  }

  // Acknowledge anything we do not act on, so Paddle stops retrying it.
  if (!HANDLED_WEBHOOK_EVENTS.has(event.eventType)) {
    return NextResponse.json({ ok: true, ignored: event.eventType });
  }

  try {
    await applySubscriptionEvent(event.data as SubscriptionEventData);
  } catch (error) {
    // A 500 tells Paddle to retry, which is what we want for a transient
    // database failure.
    console.error("[paddle] failed to apply event", event.eventType, error);
    return NextResponse.json({ error: "Could not process event." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function applySubscriptionEvent(data: SubscriptionEventData): Promise<void> {
  const supabase = createAdminClient();

  const subscriptionId = data.id ?? null;
  const customerId = data.customerId ?? null;
  const status = mapPaddleStatus(data.status);
  const periodEnd = data.currentBillingPeriod?.endsAt ?? null;

  // Which plan does the subscribed price map to? An unrecognised price falls
  // back to free rather than guessing an allowance.
  const priceId = data.items?.[0]?.price?.id ?? null;
  const tier = tierForPriceId(priceId) ?? "free";

  // A canceled or otherwise unhealthy subscription reverts to the free
  // allowance; the user keeps their files and can still download them.
  const grantedPlan =
    status === "active" || status === "trialing" || status === "past_due" ? tier : "free";

  const userId = await resolveUserId(supabase, data, customerId, subscriptionId);
  if (!userId) {
    // Nothing to attach this to. Logged rather than retried forever.
    console.error("[paddle] could not map subscription to a user", { subscriptionId, customerId });
    return;
  }

  /*
   * Only write to a row that is unclaimed or already belongs to this Paddle
   * customer. Without this an event could reassign one account's subscription
   * onto another, even after the nonce mapping has narrowed who can be named.
   */
  let query = supabase
    .from("subscriptions")
    .update(
      {
        paddle_customer_id: customerId,
        paddle_subscription_id: subscriptionId,
        plan: grantedPlan,
        status,
        current_period_end: periodEnd,
      },
      { count: "exact" },
    )
    .eq("user_id", userId);

  if (customerId) {
    query = query.or(`paddle_customer_id.is.null,paddle_customer_id.eq.${customerId}`);
  }

  const { error, count } = await query;

  if (error) throw new Error(error.message);

  if (!count) {
    console.error("[paddle] refused to reassign a subscription owned by another customer", {
      subscriptionId,
      customerId,
    });
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Find the account this subscription belongs to.
 *
 * Resolution order: the checkout nonce we minted server-side, then an existing
 * row matching the Paddle subscription, then one matching the Paddle customer.
 *
 * A user id is deliberately never read from the event payload. Paddle stores
 * whatever custom data the browser passed and signs the webhook legitimately,
 * so trusting a user_id there would let anyone apply a genuine, correctly
 * signed subscription event to somebody else's account. The nonce is opaque,
 * single-purpose, and only ever issued to the account that started the
 * checkout.
 */
async function resolveUserId(
  supabase: ReturnType<typeof createAdminClient>,
  data: SubscriptionEventData,
  customerId: string | null,
  subscriptionId: string | null,
): Promise<string | null> {
  const nonce = data.customData?.["checkout_nonce"];
  if (typeof nonce === "string" && UUID_PATTERN.test(nonce)) {
    const { data: session } = await supabase
      .from("checkout_sessions")
      .select("user_id")
      .eq("nonce", nonce)
      .maybeSingle();
    if (session?.user_id) return session.user_id as string;
  }

  if (subscriptionId) {
    const { data: row } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("paddle_subscription_id", subscriptionId)
      .maybeSingle();
    if (row?.user_id) return row.user_id as string;
  }

  if (customerId) {
    const { data: row } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("paddle_customer_id", customerId)
      .maybeSingle();
    if (row?.user_id) return row.user_id as string;
  }

  return null;
}
