import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/timeout";
import {
  AssetNotFoundError,
  ConsentRequiredError,
  NotAuthenticatedError,
  QuotaExceededError,
  StaleConsentError,
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
  // Bounded like getCurrentUser(): a slow auth server fails closed (401).
  const user = await withTimeout(
    supabase.auth.getUser().then(({ data }) => data.user),
    3000,
    null,
  );

  if (!user) throw new NotAuthenticatedError();
  return { supabase, user };
}

/**
 * Map a thrown error onto a response.
 *
 * Known error types get their message through; anything else is logged
 * server-side and reported generically, so an internal detail never reaches
 * the client. Every body carries a stable `code` as well, which the client
 * uses to show the message in the visitor's language.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof NotAuthenticatedError) {
    return NextResponse.json({ error: "You must be signed in.", code: "unauthenticated" }, { status: 401 });
  }
  if (error instanceof ConsentRequiredError) {
    return NextResponse.json({ error: error.message, code: "consent_required" }, { status: 403 });
  }
  if (error instanceof StaleConsentError) {
    return NextResponse.json({ error: error.message, code: "consent_stale" }, { status: 409 });
  }
  if (error instanceof AssetNotFoundError) {
    return NextResponse.json({ error: error.message, code: "not_found" }, { status: 404 });
  }
  if (error instanceof QuotaExceededError) {
    return NextResponse.json({ error: error.message, code: "quota_exceeded" }, { status: 413 });
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message, code: "invalid" }, { status: 400 });
  }

  console.error("[api] unhandled error", error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again.", code: "server_error" },
    { status: 500 },
  );
}
