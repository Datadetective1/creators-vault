import { NextResponse } from "next/server";

import { errorResponse, requireUser } from "@/lib/api";
import { deleteAsset } from "@/lib/vault";

/**
 * Permanently delete one asset.
 *
 * Removes the stored object first, then the metadata row, so a failure cannot
 * leave a row pointing at bytes that are gone. Ownership is checked in
 * deleteAsset and enforced again by RLS.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;

    await deleteAsset(supabase, user, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
