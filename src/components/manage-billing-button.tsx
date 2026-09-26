"use client";

import { useState } from "react";

/** Opens Paddle's customer portal, where a subscriber can cancel or update payment. */
export function ManageBillingButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/paddle/portal", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error ?? "Could not open billing.");
      window.location.assign(body.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open billing.");
      setPending(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <button type="button" onClick={open} disabled={pending} className="btn-secondary">
        {pending ? "Opening…" : "Manage or cancel subscription"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
