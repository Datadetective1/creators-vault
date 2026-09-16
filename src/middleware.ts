import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, publicEnv } from "@/lib/env";

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
 * Refreshes the Supabase session cookie on every request and gates protected
 * routes.
 *
 * This is a first line of defence for UX, not the security boundary: the real
 * boundary is RLS in Postgres plus a per-request getUser() check inside each
 * protected page and route handler. A bypassed middleware still yields nothing.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  // Without Supabase configured there are no sessions; let the pages render
  // their own "not configured yet" state instead of redirect-looping.
  if (!isSupabaseConfigured()) return response;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const isAuthOnly = AUTH_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isAuthOnly && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static assets. The hero loop's
     * mp4/webm are excluded for the same reason as the images: they are static
     * files that never need a session, and without them every byte-range
     * request for the video would cost a Supabase getUser() round trip. The
     * Paddle webhook is excluded because it authenticates by signature, not by
     * session cookie.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/paddle/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)$).*)",
  ],
};
