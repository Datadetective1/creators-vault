import { NextResponse, type NextRequest } from "next/server";

import { errorResponse, requireUser } from "@/lib/api";
import { finalizeUpload, listAssets, ValidationError } from "@/lib/vault";
import { finalizeUploadSchema } from "@/lib/validation";

/** The caller's own files. RLS makes returning anyone else's impossible. */
export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const assets = await listAssets(supabase, user);
    return NextResponse.json({ assets });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Record an asset once its bytes have landed in storage. */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();

    const parsed = finalizeUploadSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ValidationError("That upload could not be saved.");
    }

    const asset = await finalizeUpload(supabase, user, parsed.data);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
