import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publicEnv, requireServerEnv } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * `server-only` makes importing this from a Client Component a build error, so
 * the service-role key cannot leak into a browser bundle.
 *
 * Only two callers are legitimate:
 *   1. the Paddle webhook, which writes subscription state on behalf of a user
 *      who is not the one making the request;
 *   2. admin pilot stats, which aggregate across all users.
 *
 * Everything else must use the request-scoped client from ./server so RLS
 * applies.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(publicEnv.supabaseUrl, requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
