/**
 * Shared audit-event vocabulary — was duplicated (differently) across
 * Mission Control's compact panel and the full Activity page; the Topbar
 * notifications dropdown needed the same thing, so centralized here instead
 * of adding a third copy.
 */
export interface ActivityItem {
  id: string;
  actor: string;
  event: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export const EVENT_LABELS: Record<string, string> = {
  WORKSPACE_CREATED: "Workspace created",
  POLICY_UPDATED: "Policy changed",
  SOURCE_ADDED: "Source registered",
  SCAN_STARTED: "Scan started",
  SCAN_CANCELLED: "Scan cancelled",
  CBOM_GENERATED: "CBOM generated",
  AI_ACTION: "AI Analyst question",
  SOURCE_AI_ACCESS_CHANGED: "AI access changed for source",
  MIGRATION_STATUS_CHANGED: "Migration status changed",
  MIGRATION_VERIFIED: "Migration verified by rescan",
  POLICY_VIOLATION_DETECTED: "Policy violation detected",
  NEW_CRITICAL_ASSET: "New critical-risk asset",
};

export const ACTIVITY_LABELS_COMPACT: Record<string, string> = {
  WORKSPACE_CREATED: "WORKSPACE",
  POLICY_UPDATED: "POLICY",
  SOURCE_ADDED: "SOURCE ADDED",
  SCAN_STARTED: "SCAN STARTED",
  SCAN_CANCELLED: "SCAN CANCELLED",
  CBOM_GENERATED: "CBOM",
  AI_ACTION: "AI ANALYST",
  SOURCE_AI_ACCESS_CHANGED: "AI ACCESS",
  MIGRATION_STATUS_CHANGED: "MIGRATION",
  MIGRATION_VERIFIED: "VERIFIED",
  POLICY_VIOLATION_DETECTED: "VIOLATION",
  NEW_CRITICAL_ASSET: "CRITICAL",
};

/** Which small icon (from the shared set) represents each event kind. */
export function activityIconKey(event: string): "scan" | "source" | "ai" | "cbom" | "policy" | "workspace" | "migration" {
  if (event.startsWith("SCAN")) return "scan";
  if (event.startsWith("SOURCE")) return "source";
  if (event.startsWith("AI")) return "ai";
  if (event.startsWith("CBOM")) return "cbom";
  if (event.startsWith("POLICY")) return "policy";
  if (event.startsWith("MIGRATION")) return "migration";
  if (event === "NEW_CRITICAL_ASSET") return "policy";
  return "workspace";
}
