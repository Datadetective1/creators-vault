import { getI18n } from "@/lib/i18n/server";

/**
 * Shown when the deployment has no Supabase credentials yet.
 *
 * The landing page is useful on its own during the pilot, so a missing
 * database degrades to an honest message rather than a broken page.
 */
export async function NotConfiguredNotice() {
  const { t } = await getI18n();

  return (
    <p
      role="status"
      className="mt-5 rounded-xl border border-gold-400/40 bg-gold-400/10 px-4 py-3 text-sm text-gold-300"
    >
      {t.auth.notConfigured}
    </p>
  );
}
