/**
 * Resolve a `?next=` value to a path that can only ever stay on this site.
 *
 * A prefix test is not enough. The URL parser treats a backslash as a slash in
 * the relative-slash states, so `/\evil.com` passes a naive
 * `startsWith("/") && !startsWith("//")` check and then resolves to
 * `https://evil.com/` when emitted as a relative Location header — a
 * credential-harvesting redirect whose first hop is a genuine login page.
 *
 * Parsing against a throwaway origin and requiring the origin to survive is
 * the check that actually holds: anything that escapes to another host changes
 * the origin and is rejected.
 */
export const DEFAULT_REDIRECT = "/dashboard";

const PLACEHOLDER_ORIGIN = "https://placeholder.invalid";

export function safeNextPath(raw: unknown): string {
  const value = String(raw ?? "");
  if (!value.startsWith("/")) return DEFAULT_REDIRECT;
  // Backslashes never appear in a legitimate internal path here.
  if (value.includes("\\")) return DEFAULT_REDIRECT;

  try {
    const url = new URL(value, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return DEFAULT_REDIRECT;
    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
}
