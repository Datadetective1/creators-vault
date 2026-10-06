"use client";

import { formatBytes } from "@/lib/format";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

export function StorageMeter({
  usedBytes,
  limitBytes,
  percentUsed,
}: {
  usedBytes: number;
  limitBytes: number;
  percentUsed: number;
}) {
  const { t } = useI18n();
  const d = t.dashboard.storage;
  const nearLimit = percentUsed >= 90;
  const warm = percentUsed >= 75;
  const barColor = nearLimit ? "bg-rose-400" : warm ? "bg-gold-500" : "bg-gold-400";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">{d.label}</p>
        <p className="text-sm font-medium text-cream-50">
          {formatBytes(usedBytes)}{" "}
          <span className="text-muted">{fmt(d.ofTotal, { total: formatBytes(limitBytes) })}</span>
        </p>
      </div>

      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-ink-700"
        role="progressbar"
        aria-valuenow={Math.round(percentUsed)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={d.label}
      >
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(percentUsed, percentUsed > 0 ? 2 : 0)}%` }}
        />
      </div>

      {nearLimit && (
        <p className="mt-2 text-xs text-rose-400">
          {d.nearLimit}
        </p>
      )}
    </div>
  );
}
