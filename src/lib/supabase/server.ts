import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { withTimeout } from "@/lib/timeout";

/**
 * Request-scoped Supabase client carrying the signed-in user's session.
 *
 * Every query made through this client runs under that user's RLS context, so
 * the database itself enforces isolation. Application code should prefer this
 * over the admin client in all but two places: the Paddle webhook and admin
 * stats.
 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * The signed-in user, or null.
 *
 * Uses getUser() rather than getSession(): getUser() revalidates the token with
 * the Supabase auth server, so a forged or stale cookie cannot pass.
 *
 * Bounded: if the auth server does not answer in time this returns null, which
 * fails closed — protected pages send the visitor to /login and public pages
 * render the signed-out view — instead of hanging the render.
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  return withTimeout(
    supabase.auth.getUser().then(({ data }) => data.user),
    AUTH_TIMEOUT_MS,
    null,
  );
}

const AUTH_TIMEOUT_MS = 3000;

/**
 * Whether the visitor carries a Supabase session cookie — no network call.
 *
 * For PUBLIC pages only, where "signed in" just picks which navigation link to
 * show ("Go to my files" vs "Sign up"). It is not verified and must never gate
 * anything: the dashboard, its layout and every API route verify the user with
 * the auth server. Using it keeps the homepage, /pricing and the legal pages
 * independent of Supabase Auth, so an auth outage cannot take them down.
 */
export async function hasSessionCookie(): Promise<boolean> {
  return (await cookies()).getAll().some((cookie) => /^sb-.+-auth-token/.test(cookie.name));
}
