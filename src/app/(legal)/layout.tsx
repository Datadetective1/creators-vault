import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <>
      <SiteNav signedIn={Boolean(user)} />
      <main id="main" className="container-page pb-20 pt-28 sm:pt-32">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
