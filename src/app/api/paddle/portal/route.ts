import { NextResponse } from "next/server";

import { errorResponse, requireUser } from "@/lib/api";
import { getPaddle, isPaddleConfigured } from "@/lib/paddle";

/**
 * Open Paddle's customer portal for the signed-in subscriber, where they can
 * cancel or update their payment method.
 *
 * The Paddle customer id is read through the user's own session, so row-level
 * security decides whose portal can be opened — never a value from the request.
 * Portal links are short-lived and authenticated by Paddle, so one is minted
 * per click rather than stored.
 */
export async function POST() {
  try {
    const { supabase, user } = await requireUser();

    if (!isPaddleConfigured()) {
      return NextResponse.json(
        { error: "Payments are not switched on for this deployment yet." },
        { status: 503 },
      );
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const customerId = subscription?.paddle_customer_id as string | null | undefined;
    if (!customerId) {
      return NextResponse.json({ error: "There is no paid subscription to manage." }, { status: 404 });
    }

    const subscriptionId = subscription?.paddle_subscription_id as string | null | undefined;
    const session = await getPaddle().customerPortalSessions.create(
      customerId,
      subscriptionId ? [subscriptionId] : [],
    );

    return NextResponse.json({ url: session.urls.general.overview });
  } catch (error) {
    return errorResponse(error);
  }
}
