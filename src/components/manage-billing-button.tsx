"use client";

import { useState } from "react";

import { apiErrorMessage } from "@/lib/api-errors";
import { useI18n } from "@/lib/i18n/client";

/** A failure whose message is already in the visitor's language. */
class ShownError extends Error {}

/** Opens Paddle's customer portal, where a subscriber can cancel or update payment. */
export function ManageBillingButton() {
  const { t } = useI18n();
  const d = t.dashboard.billing;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/paddle/portal", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string; code?: string };
      if (!response.ok || !body.url) throw new ShownError(apiErrorMessage(t, body.code, d.portalFailed));
      window.location.assign(body.url);
    } catch (cause) {
      setError(cause instanceof ShownError ? cause.message : d.portalFailed);
      setPending(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <button type="button" onClick={open} disabled={pending} className="btn-secondary">
        {pending ? d.opening : d.manageButton}
      </button>
      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
