import { NextResponse, type NextRequest } from "next/server";

import { errorResponse, requireUser } from "@/lib/api";
import { isPaddleConfigured, priceIdFor } from "@/lib/paddle";
import { createAdminClient } from "@/lib/supabase/admin";
import { ValidationError } from "@/lib/vault";
import { checkoutRequestSchema } from "@/lib/validation";

/**
 * Open a checkout for the signed-in user.
 *
 * The browser receives a price id and an opaque nonce — never a user id. The
 * nonce -> account mapping is written here with the service-role key, so the
 * account a subscription lands on is decided server-side and cannot be edited
 * in devtools before Paddle signs it.
 *
 * Entitlement is still never granted here; only a verified webhook does that.
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireUser();

    if (!isPaddleConfigured()) {
      return NextResponse.json(
        { error: "Payments are not switched on for this deployment yet." },
        { status: 503 },
      );
    }

    const parsed = checkoutRequestSchema.safeParse(await request.json());
    if (!parsed.success) throw new ValidationError("Choose a valid plan.");

    const priceId = priceIdFor(parsed.data.tier);
    if (!priceId) {
      return NextResponse.json({ error: "That plan is not available yet." }, { status: 503 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("checkout_sessions")
      .insert({ user_id: user.id, tier: parsed.data.tier })
      .select("nonce")
      .single();

    if (error || !data) {
      console.error("[paddle] could not create checkout session", error);
      return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
    }

    return NextResponse.json({
      priceId,
      customerEmail: user.email,
      customData: { checkout_nonce: (data as { nonce: string }).nonce },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
