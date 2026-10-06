"use client";

import { Fragment, useId, useState } from "react";
import Link from "next/link";

import { UploadPanel } from "@/components/upload-panel";
import { PRODUCT_NAME } from "@/lib/brand";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

export interface ConsentState {
  accepted: boolean;
  termsVersion: string;
  privacyVersion: string;
  uploadRightsVersion: string;
}

/**
 * Blocks the uploader until the user accepts the current Terms of Service,
 * Privacy Policy and the upload-rights statement.
 *
 * Until then the upload panel is not rendered at all — no drop zone, no file
 * button — so there is nothing on the page to drop a file onto. This is the
 * user-facing half; the server refuses an upload URL, the asset row and the
 * stored object for a user who has not accepted (src/lib/vault.ts and
 * migration 0011), which is what actually stops a scripted upload.
 */
export function ConsentGate({
  initial,
  previouslyAccepted,
}: {
  initial: ConsentState;
  /** True if the user accepted an older version: wording says "changed". */
  previouslyAccepted: boolean;
}) {
  const { t } = useI18n();
  const c = t.consent;
  const [status, setStatus] = useState(initial);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [confirmRights, setConfirmRights] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const headingId = useId();

  if (status.accepted) {
    return (
      <UploadPanel
        onConsentRequired={() => {
          // The server said acceptance is missing (e.g. the Terms were updated
          // while this page was open). Show the gate again, unchecked.
          setStatus((current) => ({ ...current, accepted: false }));
          setAgreeTerms(false);
          setConfirmRights(false);
          setDismissed(false);
        }}
      />
    );
  }

  if (dismissed) {
    return (
      <div className="card text-center" data-testid="consent-locked">
        <p className="text-sm text-cream-300">{c.cancelledNote}</p>
        <button type="button" className="btn-primary mt-4" onClick={() => setDismissed(false)}>
          {c.reopen}
        </button>
      </div>
    );
  }

  async function accept() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          termsVersion: status.termsVersion,
          privacyVersion: status.privacyVersion,
          uploadRightsVersion: status.uploadRightsVersion,
          agreeTerms,
          confirmRights,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | (ConsentState & { code?: string })
        | null;
      if (!response.ok || !body) {
        setError(body?.code === "consent_stale" ? c.errors.stale : c.errors.generic);
        return;
      }
      setStatus(body);
    } catch {
      setError(c.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  const link = (href: string, label: string) => (
    <Link
      href={href}
      target="_blank"
      rel="noopener"
      className="font-medium text-cream-50 underline underline-offset-2 hover:text-gold-300"
    >
      {label}
      <span className="sr-only"> {c.opensInNewTab}</span>
    </Link>
  );

  return (
    <section
      aria-labelledby={headingId}
      className="card border-gold-400/40"
      data-testid="consent-gate"
    >
      <h2 id={headingId} className="text-lg font-semibold text-cream-50">
        {previouslyAccepted ? c.updatedHeading : c.heading}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        {previouslyAccepted ? c.updatedIntro : c.intro}
      </p>

      <div className="mt-5 space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-700 bg-ink-900/50 p-4 text-sm leading-relaxed text-cream-300">
          <input
            type="checkbox"
            name="agreeTerms"
            data-testid="consent-terms"
            checked={agreeTerms}
            onChange={(event) => setAgreeTerms(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--color-gold-400)]"
          />
          <span>
            {renderTemplate(c.agreeTerms, {
              product: PRODUCT_NAME,
              terms: link("/terms", t.common.legalLinks.terms),
              privacy: link("/privacy", t.common.legalLinks.privacy),
            })}
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-700 bg-ink-900/50 p-4 text-sm leading-relaxed text-cream-300">
          <input
            type="checkbox"
            name="confirmRights"
            data-testid="consent-rights"
            checked={confirmRights}
            onChange={(event) => setConfirmRights(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--color-gold-400)]"
          />
          <span>{fmt(c.uploadRights, { product: PRODUCT_NAME })}</span>
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-400">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          data-testid="consent-accept"
          disabled={!agreeTerms || !confirmRights || saving}
          onClick={accept}
        >
          {saving ? c.saving : c.accept}
        </button>
        <button
          type="button"
          className="btn-ghost"
          data-testid="consent-cancel"
          onClick={() => {
            setAgreeTerms(false);
            setConfirmRights(false);
            setDismissed(true);
          }}
        >
          {c.cancel}
        </button>
      </div>

      <p className="mt-4 text-xs text-muted">
        {c.lockedNote}{" "}
        <span className="whitespace-nowrap">
          {fmt(c.versions, { terms: status.termsVersion, privacy: status.privacyVersion })}
        </span>
      </p>
    </section>
  );
}

/** Like fmt(), but placeholders may be React nodes (links). */
function renderTemplate(template: string, values: Record<string, React.ReactNode>) {
  return template.split(/(\{\w+\})/g).map((part, index) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={index}>{key !== undefined && key in values ? values[key] : part}</Fragment>;
  });
}
