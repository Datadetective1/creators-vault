"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiErrorMessage } from "@/lib/api-errors";
import { formatBytes } from "@/lib/format";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { ACCEPT_ATTRIBUTE, checkFile, extensionOf } from "@/lib/validation";

type ItemStatus = "queued" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  status: ItemStatus;
  progress: number;
  error?: string;
}

/** An upload failure whose message is already in the visitor's language. */
class UploadError extends Error {}

/**
 * Uploads go browser -> storage provider directly, using a short-lived signed
 * target minted by /api/assets/upload-url. Bytes never pass through a route
 * handler, so the 4.5 MB serverless request-body limit does not apply and
 * multi-gigabyte video works.
 */
export function UploadPanel({ onConsentRequired }: { onConsentRequired?: () => void } = {}) {
  const { t } = useI18n();
  const u = t.dashboard.uploader;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  function update(id: string, patch: Partial<QueueItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const next: QueueItem[] = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      status: "queued",
      progress: 0,
    }));
    setItems((current) => [...current, ...next]);
  }

  /** PUT the bytes with XHR so we can report real progress. */
  function putWithProgress(url: string, method: string, file: File, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader("content-type", file.type || "application/octet-stream");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          update(id, { progress: Math.round((event.loaded / event.total) * 100) });
        }
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new UploadError(fmt(u.uploadFailedStatus, { status: xhr.status })));
      xhr.onerror = () => reject(new UploadError(u.networkError));
      xhr.onabort = () => reject(new UploadError(u.cancelled));

      xhr.send(file);
    });
  }

  async function uploadOne(item: QueueItem) {
    const { file, id } = item;

    // Same rules the server enforces — this is only to fail fast.
    const check = checkFile(file.name, file.type, file.size);
    if (!check.ok) {
      const message = check.code
        ? fmt(u.fileErrors[check.code], {
            type: file.type || u.unknownType,
            extension: extensionOf(file.name),
          })
        : u.uploadFailed;
      update(id, { status: "error", error: message });
      return;
    }

    update(id, { status: "uploading", progress: 0, error: undefined });

    try {
      const targetResponse = await fetch("/api/assets/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });

      const target = (await targetResponse.json()) as {
        uploadUrl?: string;
        method?: string;
        storageKey?: string;
        error?: string;
        code?: string;
      };

      if (target.code === "consent_required") {
        update(id, { status: "queued", progress: 0 });
        onConsentRequired?.();
        return;
      }

      if (!targetResponse.ok || !target.uploadUrl || !target.storageKey) {
        throw new UploadError(apiErrorMessage(t, target.code, u.startFailed));
      }

      await putWithProgress(target.uploadUrl, target.method ?? "PUT", file, id);

      const finalizeResponse = await fetch("/api/assets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storageKey: target.storageKey,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
        }),
      });

      if (!finalizeResponse.ok) {
        const body = (await finalizeResponse.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        if (body.code === "consent_required") {
          update(id, { status: "queued", progress: 0 });
          onConsentRequired?.();
          return;
        }
        throw new UploadError(apiErrorMessage(t, body.code, u.saveFailed));
      }

      update(id, { status: "done", progress: 100 });
    } catch (cause) {
      update(id, {
        status: "error",
        error: cause instanceof UploadError ? cause.message : u.uploadFailed,
      });
    }
  }

  async function startUploads() {
    setBusy(true);
    // Sequential: keeps a slow mobile connection from being saturated and makes
    // quota rejections deterministic.
    for (const item of items) {
      if (item.status === "queued" || item.status === "error") {
        await uploadOne(item);
      }
    }
    setBusy(false);
    router.refresh();
  }

  const pendingCount = items.filter(
    (item) => item.status === "queued" || item.status === "error",
  ).length;
  const doneCount = items.filter((item) => item.status === "done").length;

  return (
    <div className="space-y-5">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={
          dragging
            ? "rounded-2xl border-2 border-dashed border-gold-400 bg-gold-400/5 px-6 py-12 text-center"
            : "rounded-2xl border-2 border-dashed border-ink-600 bg-ink-850/50 px-6 py-12 text-center transition-colors"
        }
      >
        <p className="text-base font-medium text-cream-50">{u.dropTitle}</p>
        <p className="mt-1.5 text-sm text-muted">{u.dropHint}</p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-secondary mt-5"
        >
          {u.choose}
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-ink-700 bg-ink-850 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-cream-50">
                  {item.file.name}
                </p>
                <span className="shrink-0 text-xs text-muted">
                  {formatBytes(item.file.size)}
                </span>
                <StatusBadge status={item.status} progress={item.progress} />
              </div>

              {item.status === "uploading" && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
                  <div
                    className="h-full rounded-full bg-gold-400 transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {item.error && (
                <p role="alert" className="mt-2 text-xs text-rose-400">
                  {item.error}
                </p>
              )}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={startUploads}
              disabled={busy || pendingCount === 0}
              className="btn-primary"
            >
              {busy
                ? u.uploading
                : fmt(pendingCount === 1 ? u.uploadOne : u.uploadMany, { count: pendingCount })}
            </button>

            <button
              type="button"
              onClick={() => setItems([])}
              disabled={busy}
              className="btn-ghost"
            >
              {u.clear}
            </button>

            {doneCount > 0 && (
              <span className="text-sm text-mint-400">
                {fmt(u.doneCount, { count: doneCount })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, progress }: { status: ItemStatus; progress: number }) {
  const { t } = useI18n();
  const u = t.dashboard.uploader;
  const styles: Record<ItemStatus, string> = {
    queued: "text-muted",
    uploading: "text-gold-400",
    done: "text-mint-400",
    error: "text-rose-400",
  };
  const label: Record<ItemStatus, string> = {
    queued: u.ready,
    uploading: `${progress}%`,
    done: u.done,
    error: u.failed,
  };
  return (
    <span className={`shrink-0 text-xs font-medium ${styles[status]}`}>{label[status]}</span>
  );
}
