/**
 * Environment access.
 *
 * Nothing here throws at module load. The landing page must render — and the
 * project must build and deploy — before Supabase or Paddle credentials
 * exist, so missing configuration degrades to a clear in-app message instead
 * of a crashed build.
 */

// NEXT_PUBLIC_* values are inlined at build time, so they must be referenced
// as complete literal property accesses rather than looked up dynamically.
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
  paddleClientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "",
  paddleEnvironment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ?? "sandbox",
} as const;

export function isSupabaseConfigured(): boolean {
  return publicEnv.supabaseUrl !== "" && publicEnv.supabaseAnonKey !== "";
}

export function isPaddleConfigured(): boolean {
  return (
    publicEnv.paddleClientToken !== "" &&
    (process.env.PADDLE_API_KEY ?? "") !== "" &&
    (process.env.PADDLE_CREATOR_PRICE_ID ?? "") !== "" &&
    (process.env.PADDLE_PRO_PRICE_ID ?? "") !== ""
  );
}

/** Server-only secret. Throws at call time if absent, never at import time. */
export function requireServerEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Add it to .env.local (locally) or the Vercel project settings (deployed).`,
    );
  }
  return value;
}

/** Absolute site origin, used for auth redirects. */
export function siteUrl(): string {
  if (publicEnv.siteUrl) return publicEnv.siteUrl.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
