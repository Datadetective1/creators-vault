import { NextResponse } from "next/server";

import { errorResponse, requireUser } from "@/lib/api";
import { getDownloadUrl } from "@/lib/vault";

/**
 * Redirect to a short-lived signed URL for one asset.
 *
 * The bucket is private, so there is no durable public URL to leak: the link
 * minted here expires in 60 seconds and is only issued after the caller is
 * confirmed to own the file. `no-store` keeps the redirect out of any cache.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;

    const url = await getDownloadUrl(supabase, user, id);

    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
