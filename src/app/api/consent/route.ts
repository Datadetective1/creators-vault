import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, requireUser } from "@/lib/api";
import { acceptUploadConsent, getUploadConsentStatus, ValidationError } from "@/lib/vault";

/** The caller's acceptance state and the current document versions. */
export async function GET() {
  try {
    const { supabase } = await requireUser();
    return NextResponse.json(await getUploadConsentStatus(supabase));
  } catch (error) {
    return errorResponse(error);
  }
}

const acceptSchema = z.object({
  termsVersion: z.string().min(1).max(40),
  privacyVersion: z.string().min(1).max(40),
  uploadRightsVersion: z.string().min(1).max(40),
  agreeTerms: z.literal(true),
  confirmRights: z.literal(true),
});

/**
 * Record acceptance. Both statements must be affirmatively true, and the
 * versions must be the current ones; the user id comes from the session, never
 * from the body. Nothing about the request (IP, user agent) is stored.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireUser();

    const parsed = acceptSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError("Both statements must be accepted.");
    }

    await acceptUploadConsent(supabase, parsed.data);
    return NextResponse.json(await getUploadConsentStatus(supabase));
  } catch (error) {
    return errorResponse(error);
  }
}
