"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../lib/api";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/formatTime";
import "../prototype.css";

// Phase 12 — real migration verification. No CBOM-diffing needed: the
// existing scan pipeline already answers "is this algorithm still here" —
// this just triggers a real rescan of the ONE project the card is claiming
// to be verified against (reusing api.jobs.create exactly like Scan Jobs
// does), polls it to completion, then asks the backend whether the asset
// still picked up any evidence from that job+source. See
// app/routers/assets.py's verify_migration for the actual check.
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 min — generous, matches real scan durations seen in this project

type RunPhase = "scanning" | "checking" | "verified" | "still_present" | "error" | "timeout";
interface RunState {
  phase: RunPhase;
  jobId?: string;
  message?: string;
  occurrences?: number;
}

export default function VerificationPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();

  const [assets, setAssets] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<any | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [runs, setRuns] = useState<Record<string, RunState>>({});

  const loadData = useCallback(async () => {
    if (!isLoaded || !userId || !workspace?.id) return;
    setLoading(true);
    try {
      const [assetsRes, sourcesRes] = await Promise.all([
        api.assets.list(workspace.id, getToken),
        api.sources.list(workspace.id, getToken).catch(() => []),
      ]);
      setSources(sourcesRes || []);
      // Only cards someone has actually pushed to "Testing & Verification" or
      // claimed "Fully Migrated" are candidates — earlier stages have nothing
      // to verify yet (see Migration Planner's own column descriptions).
      setAssets((assetsRes || []).filter((a: any) => a.migration_status === "TESTING" || a.migration_status === "MIGRATED"));
    } catch (err) {
      console.error("Failed to load verification data", err);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, userId, workspace, getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sourceName = (sourceId: string) => sources.find((s) => s.id === sourceId)?.name || "Unknown project";

  const toggleExpand = async (asset: any) => {
    if (expandedAssetId === asset.id) {
      setExpandedAssetId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedAssetId(asset.id);
    setExpandedDetail(null);
    setExpandedLoading(true);
    try {
      const detail = await api.assets.get(asset.id, getToken);
      setExpandedDetail(detail);
    } catch (err) {
      console.error("Failed to load asset detail for verification", err);
    } finally {
      setExpandedLoading(false);
    }
  };

  const pollJob = (key: string, jobId: string, assetId: string, sourceId: string, startedAt: number) => {
    setTimeout(async () => {
      let job;
      try {
        job = await api.jobs.get(jobId, getToken);
      } catch (err) {
        setRuns((prev) => ({ ...prev, [key]: { phase: "error", message: "Failed to check scan status" } }));
        return;
      }
      if (job.status === "completed") {
        setRuns((prev) => ({ ...prev, [key]: { phase: "checking", jobId } }));
        try {
          const result = await api.assets.verifyMigration(assetId, jobId, sourceId, getToken);
          setRuns((prev) => ({
            ...prev,
            [key]: {
              phase: result.status === "VERIFIED" ? "verified" : "still_present",
              jobId,
              message: result.message,
              occurrences: result.occurrences,
            },
          }));
          if (result.status === "VERIFIED") {
            setAssets((prev) =>
              prev.map((a) => (a.id === assetId ? { ...a, migration_status: "MIGRATED", migration_verified_at: result.migration_verified_at } : a))
            );
          }
        } catch (err: any) {
          setRuns((prev) => ({ ...prev, [key]: { phase: "error", message: err?.message || "Verification check failed" } }));
        }
        return;
      }
      if (job.status === "failed" || job.status === "cancelled") {
        setRuns((prev) => ({ ...prev, [key]: { phase: "error", message: `Rescan ${job.status}${job.error_msg ? `: ${job.error_msg}` : ""}` } }));
        return;
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setRuns((prev) => ({ ...prev, [key]: { phase: "timeout", jobId } }));
        return;
      }
      pollJob(key, jobId, assetId, sourceId, startedAt);
    }, POLL_INTERVAL_MS);
  };

  const startVerification = async (assetId: string, sourceId: string) => {
    const key = `${assetId}:${sourceId}`;
    setRuns((prev) => ({ ...prev, [key]: { phase: "scanning" } }));
    try {
      const job = await api.jobs.create(workspace!.id, [sourceId], getToken);
      setRuns((prev) => ({ ...prev, [key]: { phase: "scanning", jobId: job.id } }));
      pollJob(key, job.id, assetId, sourceId, Date.now());
    } catch (err: any) {
      setRuns((prev) => ({ ...prev, [key]: { phase: "error", message: err?.message || "Failed to start rescan" } }));
    }
  };

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Quantum Transition" }, { label: "Verification" }]}
        title="Verification"
        description="Real, evidence-based proof a migration worked — ECDAT rescans the project and confirms the old algorithm is actually gone."
        actions={
          <Link href="/prototype/migration" className="ecdat-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            MIGRATION PLANNER →
          </Link>
        }
      />

      <div
        style={{
          padding: "1rem 1.5rem",
          backgroundColor: "#faf9f6",
          border: "1px solid #eaeaea",
          borderRadius: "8px",
          marginBottom: "2rem",
          fontSize: "0.85rem",
          color: "#666",
        }}
      >
        <strong style={{ color: "#181917" }}>How this works:</strong> Clicking Verify triggers a real discovery
        scan of that one project (same scanners as Scan Jobs), waits for it to finish, then checks whether the
        scan found this algorithm again. Not found → marked <strong>Verified</strong> and moved to Fully Migrated.
        Found again → stays exactly where it is, with the real occurrence count. Nothing here is inferred or
        assumed — every result comes from a scan that actually ran.
      </div>

      {loading && <div style={{ color: "#666", fontSize: "0.9rem" }}>Loading…</div>}

      {!loading && assets.length === 0 && (
        <div style={{ color: "#666", fontSize: "0.9rem" }}>
          Nothing to verify yet — move a card to "Testing &amp; Verification" or "Fully Migrated" on the{" "}
          <Link href="/prototype/migration" style={{ color: "#181917", fontWeight: 600 }}>Migration Planner</Link> first.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {assets.map((asset) => {
          const isExpanded = expandedAssetId === asset.id;
          const projectIds: string[] = isExpanded && expandedDetail
            ? [...new Set((expandedDetail.evidence || []).map((ev: any) => ev.source_id).filter(Boolean))] as string[]
            : [];

          return (
            <div key={asset.id} className="ecdat-card" style={{ padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#181917" }}>{asset.algorithm_canonical}</div>
                  <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "2px" }}>
                    Found in {asset.projects?.join(", ") || "unknown project"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {asset.migration_verified_at ? (
                    <span className="ecdat-badge" style={{ color: "#15803D", borderColor: "#15803D", fontSize: "0.75rem" }}>
                      ✓ Verified {formatRelativeTime(asset.migration_verified_at)}
                    </span>
                  ) : (
                    <span className="ecdat-badge" style={{ fontSize: "0.75rem" }}>
                      {asset.migration_status === "MIGRATED" ? "Not yet verified" : "Ready to verify"}
                    </span>
                  )}
                  <button className="ecdat-btn" style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }} onClick={() => toggleExpand(asset)}>
                    {isExpanded ? "Close" : "Verify"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #eaeaea" }}>
                  {expandedLoading && <div style={{ fontSize: "0.85rem", color: "#666" }}>Loading project list…</div>}
                  {!expandedLoading && projectIds.length === 0 && (
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>No attributed project found for this asset's evidence.</div>
                  )}
                  {!expandedLoading &&
                    projectIds.map((sourceId) => {
                      const key = `${asset.id}:${sourceId}`;
                      const run = runs[key];
                      return (
                        <div key={sourceId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", gap: "1rem" }}>
                          <span style={{ fontSize: "0.85rem", color: "#181917" }}>{sourceName(sourceId)}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            {!run && (
                              <button
                                className="ecdat-btn"
                                style={{ padding: "0.35rem 0.8rem", fontSize: "0.78rem" }}
                                onClick={() => startVerification(asset.id, sourceId)}
                              >
                                Rescan &amp; Verify
                              </button>
                            )}
                            {run?.phase === "scanning" && <span style={{ fontSize: "0.8rem", color: "#666" }}>Rescanning…</span>}
                            {run?.phase === "checking" && <span style={{ fontSize: "0.8rem", color: "#666" }}>Checking result…</span>}
                            {run?.phase === "verified" && <span style={{ fontSize: "0.8rem", color: "#15803D", fontWeight: 600 }}>✓ Verified — gone</span>}
                            {run?.phase === "still_present" && (
                              <span style={{ fontSize: "0.8rem", color: "#B91C1C", fontWeight: 600 }}>
                                Still present ({run.occurrences} occurrence{run.occurrences === 1 ? "" : "s"})
                              </span>
                            )}
                            {run?.phase === "timeout" && <span style={{ fontSize: "0.8rem", color: "#B45309" }}>Taking a while — check Scan Jobs</span>}
                            {run?.phase === "error" && <span style={{ fontSize: "0.8rem", color: "#B91C1C" }}>{run.message || "Error"}</span>}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
