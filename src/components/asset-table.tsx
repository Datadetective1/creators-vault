"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { fileKind, formatBytes, formatDate } from "@/lib/format";
import type { AssetRow } from "@/lib/types";

const KIND_LABEL: Record<ReturnType<typeof fileKind>, string> = {
  image: "Photo",
  video: "Video",
  audio: "Audio",
  document: "Document",
  other: "File",
};

export function AssetTable({
  assets,
  emptyHint = false,
}: {
  assets: AssetRow[];
  emptyHint?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(asset: AssetRow) {
    const confirmed = window.confirm(
      `Delete "${asset.filename}" permanently? This cannot be undone.`,
    );
    if (!confirmed) return;

    setError(null);
    setDeletingId(asset.id);

    try {
      const response = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not delete that file.");
      }
      startTransition(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete that file.");
    } finally {
      setDeletingId(null);
    }
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-600 bg-ink-850/50 px-6 py-12 text-center">
        <p className="text-base font-medium text-cream-50">Your vault is empty</p>
        {emptyHint && (
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Upload the videos, photos and files your business would miss most.
          </p>
        )}
        <Link href="/dashboard/upload" className="btn-primary mt-5">
          Upload your first file
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
                <th scope="col" className="px-5 py-3 font-semibold">File</th>
                <th scope="col" className="px-5 py-3 font-semibold">Type</th>
                <th scope="col" className="px-5 py-3 font-semibold">Size</th>
                <th scope="col" className="px-5 py-3 font-semibold">Uploaded</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700 bg-ink-900">
              {assets.map((asset) => (
                <tr key={asset.id} className="transition-colors hover:bg-ink-850/60">
                  <td className="max-w-xs truncate px-5 py-3.5 text-sm font-medium text-cream-50">
                    {asset.filename}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted">
                    {KIND_LABEL[fileKind(asset.mime_type)]}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm text-muted">
                    {formatBytes(Number(asset.file_size_bytes))}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm text-muted">
                    {formatDate(asset.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/api/assets/${asset.id}/download`}
                        className="btn-secondary px-3.5 py-1.5 text-xs"
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(asset)}
                        disabled={pending || deletingId === asset.id}
                        className="btn-danger px-3.5 py-1.5 text-xs"
                      >
                        {deletingId === asset.id ? "Deleting…" : "Delete"}
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
