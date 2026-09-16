import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  AssetNotFoundError,
  NotAuthenticatedError,
  QuotaExceededError,
  ValidationError,
} from "@/lib/vault";

/**
 * Resolve the caller for an API route.
 *
 * Uses getUser(), which revalidates the token against the auth server rather
 * than trusting the cookie, so this is a real check and not just a session
 * lookup. Every vault route calls this first.
 */
export async function requireUser(): Promise<{ supabase: SupabaseClient; user: User }> {
  if (!isSupabaseConfigured()) throw new NotAuthenticatedError();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new NotAuthenticatedError();
  return { supabase, user };
}

/**
 * Map a thrown error onto a response.
 *
 * Known error types get their message through; anything else is logged
 * server-side and reported generically, so an internal detail never reaches
 * the client.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof NotAuthenticatedError) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (error instanceof AssetNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof QuotaExceededError) {
    return NextResponse.json({ error: error.message }, { status: 413 });
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error("[api] unhandled error", error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
