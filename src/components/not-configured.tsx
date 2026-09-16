/**
 * Shown when the deployment has no Supabase credentials yet.
 *
 * The landing page is useful on its own during the pilot, so a missing
 * database degrades to an honest message rather than a broken page.
 */
export function NotConfiguredNotice() {
  return (
    <p
      role="status"
      className="mt-5 rounded-xl border border-gold-400/40 bg-gold-400/10 px-4 py-3 text-sm text-gold-300"
    >
      Accounts are not switched on for this deployment yet. The site is live for preview, but
      sign-up opens once the database connection is configured.
    </p>
  );
}
