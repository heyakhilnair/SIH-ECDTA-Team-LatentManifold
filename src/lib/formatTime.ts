/**
 * Every ECDAT timestamp is shown in IST (Asia/Kolkata) — the team and stated
 * audience (NTRO) are India-based. A bare `toLocaleTimeString()` silently uses
 * whatever timezone the viewing machine happens to be set to, which is why
 * timestamps could read as "wrong" — this pins it explicitly instead.
 */
export function formatISTTime(iso?: string | null): string {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }) + " IST";
}

export function formatISTDateTime(iso?: string | null): string {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) + " IST";
}

/** "2m ago" style, falling back to the absolute IST date once it's stale. Pair with a `title={formatISTDateTime(iso)}` tooltip for the exact time. */
export function formatRelativeTime(iso?: string | null): string {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (isNaN(t)) return "—";
  const diffS = Math.floor((Date.now() - t) / 1000);
  if (diffS < 5) return "just now";
  if (diffS < 60) return `${diffS}s ago`;
  const m = Math.floor(diffS / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatISTDateTime(iso);
}
