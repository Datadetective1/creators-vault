import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { formatBytes } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pilot stats", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Internal pilot metrics. Deliberately minimal — four numbers, no controls.
 *
 * Access requires a signed-in user whose email is listed in ADMIN_EMAILS. With
 * that variable unset the route 404s, so an unconfigured deployment exposes
 * nothing.
 */
export default async function AdminPage() {
  if (!isSupabaseConfigured()) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");

  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  // 404 rather than 403: do not confirm the route exists to a non-admin.
  if (allowed.length === 0) notFound();
  if (!user.email || !allowed.includes(user.email.toLowerCase())) notFound();

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("admin_pilot_stats").single<{
    total_users: number;
    paid_users: number;
    total_uploads: number;
    total_bytes: number;
  }>();

  if (error) {
    return (
      <main id="main" className="container-page py-16">
        <h1 className="text-2xl font-semibold text-cream-50">Pilot stats</h1>
        <p className="mt-3 text-sm text-rose-400">Could not load stats: {error.message}</p>
      </main>
    );
  }

  const stats = [
    { label: "Users", value: String(data?.total_users ?? 0) },
    { label: "Paid users", value: String(data?.paid_users ?? 0) },
    { label: "Uploads", value: String(data?.total_uploads ?? 0) },
    { label: "Total storage", value: formatBytes(Number(data?.total_bytes ?? 0)) },
  ];

  return (
    <main id="main" className="container-page py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-cream-50">Pilot stats</h1>
      <p className="mt-1 text-sm text-muted">Internal. Not linked from anywhere.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-cream-50">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
