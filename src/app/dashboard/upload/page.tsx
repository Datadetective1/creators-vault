import type { Metadata } from "next";

import { StorageMeter } from "@/components/storage-meter";
import { UploadPanel } from "@/components/upload-panel";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getVaultSummary } from "@/lib/vault";

export const metadata: Metadata = { title: "Upload" };
export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const summary = await getVaultSummary(supabase, user);

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream-50 sm:text-3xl">
          Upload to your vault
        </h1>
        <p className="mt-1 text-sm text-muted">
          Files are private to your account. Nobody else can see or download them.
        </p>
      </div>

      <div className="card">
        <StorageMeter
          usedBytes={summary.usedBytes}
          limitBytes={summary.limitBytes}
          percentUsed={summary.percentUsed}
        />
      </div>

      <UploadPanel />
    </div>
  );
}
