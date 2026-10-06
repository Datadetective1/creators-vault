import type { Messages } from "@/lib/i18n";

/**
 * The visitor-language message for an API error body.
 *
 * Routes return a stable `code` alongside their English `error` (see
 * src/lib/api.ts). The English text is never shown; the code picks a
 * translated message, and `fallback` covers a missing or unknown code.
 */
export function apiErrorMessage(t: Messages, code: string | undefined, fallback: string): string {
  switch (code) {
    case "unauthenticated":
      return t.common.errors.signedOut;
    case "consent_required":
      return t.consent.required;
    case "consent_stale":
      return t.consent.errors.stale;
    case "not_found":
      return t.dashboard.apiErrors.not_found;
    case "quota_exceeded":
      return t.dashboard.apiErrors.quota_exceeded;
    case "invalid":
      return t.dashboard.apiErrors.invalid;
    case "server_error":
      return t.common.errors.generic;
    default:
      return fallback;
  }
}
