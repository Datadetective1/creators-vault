import { NextResponse, type NextRequest } from "next/server";

import { errorResponse, requireUser } from "@/lib/api";
import { createUpload, ValidationError } from "@/lib/vault";
import { uploadUrlRequestSchema } from "@/lib/validation";

/**
 * Authorise an upload and mint a short-lived, single-object upload target.
 *
 * The bytes never pass through this function — the browser sends them straight
 * to the storage provider. That keeps uploads clear of the 4.5 MB serverless
 * request-body limit, which matters for video.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();

    const parsed = uploadUrlRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ValidationError("That upload request was not valid.");
    }

    const target = await createUpload(supabase, user, parsed.data);

    return NextResponse.json({
      uploadUrl: target.url,
      method: target.method,
      storageKey: target.key,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
