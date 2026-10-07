import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { withTimeout } from "@/lib/timeout";

/**
 * Everything under these prefixes requires a signed-in user.
 *
 * /admin is deliberately absent: redirecting an anonymous visitor to /login
 * would confirm the route exists, while a non-existent path 404s. The page
 * gates itself and returns notFound() in every unauthorised case instead.
 */
const PROTECTED_PREFIXES = ["/dashboard"];

/** Signed-in users are bounced away from these back to the dashboard. */
const AUTH_ONLY_PREFIXES = ["/login", "/signup"];

/**
 * The longest the middleware will wait on Supabase Auth. Vercel kills a slow
 * middleware with a 504 for the whole page, so past this the request carries
 * on without the middleware's answer and the page's own check decides.
 */
const AUTH_TIMEOUT_MS = 2500;

type MiddlewareUser = { id: string } | null;

/**
 * Refreshes the Supabase session cookie on every request and gates protected
 * routes.
 *
 * This is a first line of defence for UX, not the security boundary: the real
 * boundary is RLS in Postgres plus a per-request getUser() check inside each
 * protected page and route handler. A bypassed middleware still yields nothing.
 *
 * It must stay fast, and it runs ONLY where the response depends on who is
 * signed in: /dashboard (redirect to /login, refresh the session) and /login
 * and /signup (bounce a signed-in user). See `config.matcher`. Public pages,
 * robots.txt, static files and API routes never reach it. Even here, a visitor
 * with no Supabase cookie costs no network call, and the one call made for a
 * session holder is capped at AUTH_TIMEOUT_MS. Nothing here calls Paddle,
 * pricing, or the database.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  // Without Supabase configured there are no sessions; let the pages render
  // their own "not configured yet" state instead of redirect-looping.
  if (!isSupabaseConfigured()) return response;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthOnly = AUTH_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // No Supabase auth cookie means no session: nothing to ask the auth server.
  const hasSession = request.cookies.getAll().some((cookie) => /^sb-.+-auth-token/.test(cookie.name));
  if (!hasSession) {
    if (isProtected) return redirectToLogin(request, pathname);
    return response;
  }

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims() refreshes an expired session (writing the new cookies through
  // setAll above) and then verifies the access token's signature, so the
  // decision rests on a verified identity — never on getSession() alone.
  const timedOut = Symbol("timeout");
  const result = await withTimeout<MiddlewareUser | typeof timedOut>(
    supabase.auth.getClaims().then(({ data }) => {
      const sub = data?.claims?.sub;
      return typeof sub === "string" ? { id: sub } : null;
    }),
    AUTH_TIMEOUT_MS,
    timedOut,
  );

  // Auth is slow: let the request through. A protected page re-checks the user
  // itself (with its own timeout) and redirects to /login if it cannot confirm
  // one, so this never grants access — it only avoids a 504.
  if (result === timedOut) {
    console.warn("[middleware] Supabase getClaims timed out", pathname);
    return response;
  }
  const user = result;

  if (isProtected && !user) return redirectToLogin(request, pathname);

  if (isAuthOnly && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Only the routes above. Everything else — the marketing pages, legal pages,
  // /pricing, robots.txt, sitemap.xml, images, fonts, video and every /api
  // route (each authenticates itself) — is served without middleware.
  matcher: ["/dashboard", "/dashboard/:path*", "/login", "/signup"],
};
