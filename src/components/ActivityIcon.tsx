"use client";

import type { ReactElement } from "react";
import { activityIconKey } from "@/lib/activityLabels";

/**
 * One small glyph per audit-event kind, shared between Mission Control's
 * activity panel, the Topbar notifications dropdown, and (potentially) the
 * full Activity page — built once instead of copy-pasted per consumer.
 * Colors follow the palette IMPLEMENTATION_PLAN.md §72.2 already defines:
 * neutral/blue/green/amber/red/purple(AI-specific) — AI events get the
 * documented purple, everything else stays on-brand copper/graphite.
 */
const PATHS: Record<string, ReactElement> = {
  scan: (
    <>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  source: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    </>
  ),
  ai: (
    <>
      <path d="M12 3v4M12 17v4M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  cbom: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </>
  ),
  policy: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </>
  ),
  workspace: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  migration: (
    <>
      <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </>
  ),
};

const COLORS: Record<string, string> = {
  scan: "#B95532",
  source: "#4F7CAC",
  ai: "#8B5FBF",
  cbom: "#2B7A4B",
  policy: "#D3A248",
  workspace: "#687563",
  migration: "#2B7A4B",
};

export default function ActivityIcon({ event, size = 14 }: { event: string; size?: number }) {
  const key = activityIconKey(event);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={COLORS[key]}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {PATHS[key]}
    </svg>
  );
}
