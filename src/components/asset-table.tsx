"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiErrorMessage } from "@/lib/api-errors";
import { fileKind, formatBytes, formatDate } from "@/lib/format";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import type { AssetRow } from "@/lib/types";

export function AssetTable({
  assets,
  emptyHint = false,
}: {
  assets: AssetRow[];
  emptyHint?: boolean;
}) {
  const { locale, t } = useI18n();
  const d = t.dashboard.table;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(asset: AssetRow) {
    const confirmed = window.confirm(fmt(d.confirmDelete, { name: asset.filename }));
    if (!confirmed) return;

    setError(null);
    setDeletingId(asset.id);

    try {
      const response = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { code?: string };
        setError(apiErrorMessage(t, body.code, d.deleteFailed));
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError(d.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-850/50 px-6 py-12 text-center">
        <p className="text-base font-medium text-cream-50">{d.emptyTitle}</p>
        {emptyHint && (
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            {d.emptyHint}
          </p>
        )}
        <Link href="/dashboard/upload" className="btn-primary mt-5">
          {d.uploadFirst}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-400"
        >
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-ink-700">
        {/* Horizontal scroll keeps the table usable on a narrow phone. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left">
            <thead className="bg-ink-850">
              <tr className="text-xs uppercase tracking-wider text-muted">
                <th scope="col" className="px-5 py-3 font-semibold">{d.file}</th>
                <th scope="col" className="px-5 py-3 font-semibold">{d.type}</th>
                <th scope="col" className="px-5 py-3 font-semibold">{d.size}</th>
                <th scope="col" className="px-5 py-3 font-semibold">{d.uploaded}</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">{d.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700 bg-ink-900">
              {assets.map((asset) => (
                <tr key={asset.id} className="transition-colors hover:bg-ink-850/60">
                  <td className="max-w-xs truncate px-5 py-3.5 text-sm font-medium text-cream-50">
                    {asset.filename}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted">
                    {d.kinds[fileKind(asset.mime_type)]}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm text-muted">
                    {formatBytes(Number(asset.file_size_bytes))}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm text-muted">
                    {formatDate(asset.created_at, locale)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/api/assets/${asset.id}/download`}
                        className="btn-secondary px-3.5 py-1.5 text-xs"
                      >
                        {d.download}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(asset)}
                        disabled={pending || deletingId === asset.id}
                        className="btn-danger px-3.5 py-1.5 text-xs"
                      >
                        {deletingId === asset.id ? d.deleting : d.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
