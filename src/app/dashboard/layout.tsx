import { redirect } from "next/navigation";

import { DashboardNav } from "@/components/dashboard-nav";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) redirect("/login");

  // Middleware already gates this, but the check is repeated here so a page
  // never renders without a verified user even if middleware is bypassed.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav email={user.email ?? ""} />
      <main id="main" className="container-page flex-1 py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
