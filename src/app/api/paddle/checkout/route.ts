import { NextResponse, type NextRequest } from "next/server";

import { errorResponse, requireUser } from "@/lib/api";
import { isPaddleConfigured, priceIdFor } from "@/lib/paddle";
import { ValidationError } from "@/lib/vault";
import { checkoutRequestSchema } from "@/lib/validation";

/**
 * Resolve the Paddle price to open a checkout for.
 *
 * Checkout itself runs in the browser through Paddle.js. This route exists so
 * the price id is chosen server-side and the user id is attached as custom
 * data — the webhook uses that to tie the resulting subscription back to an
 * account. Entitlement is never granted here; only a verified webhook does that.
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
      return NextResponse.json(
        { error: "That plan is not available yet." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      priceId,
      customerEmail: user.email,
      customData: { user_id: user.id },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
