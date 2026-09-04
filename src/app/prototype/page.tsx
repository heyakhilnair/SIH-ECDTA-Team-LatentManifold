"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { api, downloadTextFile } from "../../lib/api";
import { motion } from "framer-motion";
import { useWorkspace } from "../../components/WorkspaceWrapper";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import ActivityIcon from "@/components/ActivityIcon";
import { ACTIVITY_LABELS_COMPACT } from "@/lib/activityLabels";
import { formatRelativeTime, formatISTDateTime } from "@/lib/formatTime";
import "./prototype.css";

// Same precedence as ecdat-backend's compute_asset_risk: classical risk
// drives the composite level before quantum/Mosca does, so the summary
// reason shown must follow suit — otherwise a CRITICAL row broken classically
// (e.g. MD5) shows its quantum-safety text instead, reading as contradictory.

function primaryFactorReason(r: any): string {
  if (r.classical_risk_level === "CRITICAL" || r.classical_risk_level === "HIGH") {
    return r.classical_reason || r.quantum_reason || "Vulnerable to quantum attack";
  }
  return r.quantum_reason || r.classical_reason || "Vulnerable to quantum attack";
}

export default function MissionControl() {
  const { getToken, isLoaded, userId } = useAuth();
  const { user } = useUser();
  const workspace = useWorkspace();

  const [jobs, setJobs] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [riskSummary, setRiskSummary] = useState<any>({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    SAFE: 0,
    total: 0,
  });
  const [priorityRisks, setPriorityRisks] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any | null>(null);
  const [showReadinessBreakdown, setShowReadinessBreakdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const loadData = async () => {
      if (!isLoaded || !userId || !workspace?.id) return;
      try {
        const [jobsRes, sourcesRes, riskSumRes, riskListRes, recsRes, assetsRes, activityRes, readinessRes] = await Promise.all([
          api.jobs.list(workspace.id, getToken).catch(() => []),
          api.sources.list(workspace.id, getToken).catch(() => []),
          api.risk.summary(workspace.id, getToken).catch(() => ({
            CRITICAL: 0,
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0,
            SAFE: 0,
            total: 0,
          })),
          api.risk.list(workspace.id, getToken).catch(() => []),
          api.recommendations.list(workspace.id, getToken).catch(() => []),
          api.assets.list(workspace.id, getToken, { limit: 50 }).catch(() => []),
          api.activity.list(workspace.id, getToken, { limit: 8 }).catch(() => ({ items: [] })),
          api.workspace.readinessScore(workspace.id, getToken).catch(() => null),
        ]);

        setJobs(jobsRes || []);
        setSources(sourcesRes || []);
        setRiskSummary(riskSumRes || {});
        setPriorityRisks((riskListRes || []).slice(0, 5));
        setRecommendations(recsRes || []);
        setActivity(activityRes?.items || []);
        setAssets(assetsRes || []);
        setReadiness(readinessRes);
      } catch (err: any) {
        console.error("Error loading mission control data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  const activeJobsCount = jobs.filter((j) => j.status === "running" || j.status === "queued").length;
  const completedJobsCount = jobs.filter((j) => j.status === "completed").length;
  const activeJob = jobs.find((j) => j.status === "running" || j.status === "queued");
  const latestCompletedJob = jobs
    .filter((j) => j.status === "completed")
    .sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime())[0];

  const totalAssetsCount = riskSummary.total || assets.length;
  const criticalCount = riskSummary.CRITICAL || 0;
  const highCount = riskSummary.HIGH || 0;
  const quantumVulnerableCount = assets.filter((a) => a.quantum_vulnerable).length;
  // "Already safe" = composite risk LOW or SAFE (compute_asset_risk never
  // actually emits "SAFE" today — LOW is the real safe bucket in practice —
  // counting both is harmless and future-proof if that changes).
  const alreadySafeCount = (riskSummary.LOW || 0) + (riskSummary.SAFE || 0);
  const needsMigrationCount = totalAssetsCount - alreadySafeCount;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 21) return "Good Evening";
    return "Good Night";
  };

  const exportReport = async (kind: "executive" | "technical") => {
    if (!workspace?.id) return;
    try {
      const md = kind === "executive"
        ? await api.workspace.executiveReport(workspace.id, getToken)
        : await api.workspace.technicalReport(workspace.id, getToken);
      downloadTextFile(`ecdat-${kind}-report-${workspace.id.substring(0, 8)}.md`, md, "text/markdown");
    } catch (err) {
      console.error(`Failed to export ${kind} report`, err);
    }
  };

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Command Center" }, { label: "Mission Control" }]}
        title="Mission Control"
        description="Enterprise cryptographic discovery, Mosca quantum risk posture, and PQC transition pipeline."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => exportReport("executive")}
              className="ecdat-btn"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              title="High-level summary for leadership — Markdown"
            >
              EXECUTIVE REPORT ↓
            </button>
            <button
              onClick={() => exportReport("technical")}
              className="ecdat-btn"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              title="Full per-asset detail for engineers — Markdown"
            >
              TECHNICAL REPORT ↓
            </button>
            <Link href="/prototype/sources" className="ecdat-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              CONNECT SOURCES
            </Link>
            <Link
              href="/prototype/sources?force=true"
              className="ecdat-btn"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                backgroundColor: "var(--color-primary)",
                color: "white",
              }}
            >
              LAUNCH DISCOVERY
            </Link>
          </div>
        }
      />

      {/* Quantum Readiness Score — Phase 11.2, Phase 17 PDF's headline executive
          KPI. Real, computed dimensions only (readiness_engine.py) — never
          shown as a bare number, per the PDF's own explicit warning that this
          "must not be arbitrary" (§26). Click to see exactly what it's made of. */}
      {readiness && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ecdat-card"
          style={{ padding: "1.5rem", marginBottom: "1.25rem", cursor: "pointer" }}
          onClick={() => setShowReadinessBreakdown((s) => !s)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#fff",
                background:
                  readiness.score <= 20 ? "#D63939" : readiness.score <= 40 ? "#D3A248" : readiness.score <= 60 ? "#B95532" : readiness.score <= 80 ? "#4F7CAC" : "#2B7A4B",
              }}
            >
              {readiness.score}
            </div>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                Quantum Readiness Score
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#181917" }}>
                {readiness.level} <span style={{ fontWeight: 500, fontSize: "0.9rem", color: "#666" }}>· {readiness.score} / 100</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#888" }}>
                {showReadinessBreakdown ? "Click to collapse breakdown ▲" : "Click to see what this is actually made of ▼"}
              </div>
            </div>
          </div>

          {showReadinessBreakdown && (
            <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid #eaeaea", display: "flex", flexDirection: "column", gap: "0.75rem" }} onClick={(e) => e.stopPropagation()}>
              {[
                { key: "coverage", label: "Discovery Coverage", desc: "Registered sources that have completed at least one scan" },
                { key: "risk_posture", label: "Risk Posture", desc: "Inverse of the critical/high fraction of your scored assets" },
                { key: "pqc_adoption", label: "PQC Adoption", desc: "Quantum-vulnerable assets that have at least started migrating" },
                { key: "migration_progress", label: "Migration Progress", desc: "At-risk assets confirmed fully migrated" },
                { key: "governance", label: "Governance", desc: "Any workspace activity audited in the last 30 days" },
              ].map((d) => (
                <div key={d.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "3px" }}>
                    <span style={{ color: "#333" }}>{d.label} <span style={{ color: "#999" }}>— {d.desc}</span></span>
                    <strong>{readiness.breakdown[d.key]}%</strong>
                  </div>
                  <div style={{ height: "6px", background: "#eee", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${readiness.breakdown[d.key]}%`, height: "100%", background: "#B95532" }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: "0.8rem", color: "#999", fontStyle: "italic", marginTop: "4px" }}>
                Crypto Agility — not measured yet (needs a real policy engine, Phase 14). Shown as "not measured", not guessed.
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Executive Briefing Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          backgroundColor: "#fff",
          border: "1px solid #eaeaea",
          borderRadius: "8px",
          padding: "1.5rem",
          marginBottom: "2rem",
          display: "flex",
          gap: "2rem",
          flexWrap: "wrap",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ flex: "2 1 400px" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "#181917",
              marginBottom: "0.75rem",
              fontFamily: "var(--font-display)",
            }}
          >
            {getGreeting()}, {user?.firstName || "Analyst"}.
          </h2>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#687563",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
            }}
          >
            Live Cryptographic Perimeter Status
          </div>
          <div
            style={{
              display: "flex",
              gap: "2rem",
              marginBottom: "1rem",
              borderBottom: "1px solid #eaeaea",
              paddingBottom: "1rem",
            }}
          >
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#181917" }}>{sources.length}</div>
              <div style={{ fontSize: "0.75rem", color: "#666" }}>Connected Repositories</div>
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#181917" }}>{totalAssetsCount}</div>
              <div style={{ fontSize: "0.75rem", color: "#666" }}>Discovered Assets</div>
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: criticalCount > 0 ? "#B91C1C" : "#15803D" }}>
                {criticalCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#666" }}>Critical Findings</div>
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#B95532" }}>
                {quantumVulnerableCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#666" }}>Quantum Vulnerable</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "2rem", fontSize: "0.8rem", color: "#666" }}>
            <span title={latestCompletedJob ? formatISTDateTime(latestCompletedJob.completed_at || latestCompletedJob.created_at) : undefined}>
              <strong style={{ color: "#333" }}>Last Discovery:</strong>{" "}
              {latestCompletedJob
                ? `${formatRelativeTime(latestCompletedJob.completed_at || latestCompletedJob.created_at)} (${formatISTDateTime(latestCompletedJob.completed_at || latestCompletedJob.created_at)})`
                : "No scans run yet"}
            </span>
            <span>
              <strong style={{ color: "#333" }}>Mosca Threshold Status:</strong>{" "}
              {criticalCount > 0 ? (
                <span style={{ color: "#B91C1C", fontWeight: 700 }}>HNDL Window Open ({criticalCount} assets)</span>
              ) : (
                <span style={{ color: "#15803D", fontWeight: 700 }}>Within Quantum Margin</span>
              )}
            </span>
          </div>
        </div>

        <div style={{ flex: "1 1 280px", borderLeft: "1px solid #eaeaea", paddingLeft: "2rem" }}>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.75rem",
            }}
          >
            {activeJob ? "Discovery In Progress" : "Scan Pipeline State"}
          </div>
          {activeJob ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "#B95532",
                    display: "inline-block",
                    animation: "pulse 2s infinite",
                  }}
                ></span>
                <span style={{ fontWeight: 700, color: "#181917", fontSize: "0.95rem" }}>
                  Scan #{activeJob.id.substring(0, 8)}
                </span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: "0.25rem" }}>
                Scanning {sources.length} repositories
              </div>
              <div style={{ fontSize: "0.8rem", color: "#888" }}>
                Pipeline Stage: AST & Semgrep Analysis
              </div>
            </div>
          ) : latestCompletedJob ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "#15803D",
                    display: "inline-block",
                  }}
                ></span>
                <span style={{ fontWeight: 700, color: "#181917", fontSize: "0.95rem" }}>
                  Scan #{latestCompletedJob.id.substring(0, 8)}
                </span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: "0.25rem" }}>
                {sources.length} sources indexed · {latestCompletedJob.evidence_count || 0} findings
              </div>
              {/* Real workspace totals, not this-job-only (jobs don't track
                  which specific assets/recommendations they contributed —
                  only their raw evidence count does) — labeled as such so
                  it doesn't overclaim precision the data doesn't have. */}
              <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: "0.25rem" }}>
                {assets.length} canonical assets in workspace · {recommendations.length} PQC migrations recommended
              </div>
              <div style={{ fontSize: "0.8rem", color: "#888" }} title={formatISTDateTime(latestCompletedJob.completed_at || latestCompletedJob.created_at)}>
                Completed {formatRelativeTime(latestCompletedJob.completed_at || latestCompletedJob.created_at)} ({formatISTDateTime(latestCompletedJob.completed_at || latestCompletedJob.created_at)})
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "0.85rem", color: "#888", fontStyle: "italic" }}>
              No discovery tasks run yet. Click "Launch Discovery" above to begin.
            </div>
          )}
        </div>
      </motion.div>

      {/* 4 Metric Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <motion.div variants={itemVariants} className="ecdat-card" style={{ padding: "1.5rem" }}>
          <h3
            style={{
              fontSize: "0.8rem",
              textTransform: "uppercase",
              color: "#687563",
              letterSpacing: "0.05em",
              marginBottom: "1rem",
            }}
          >
            Connected Sources
          </h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontSize: "2.75rem", fontWeight: 800, lineHeight: 1, color: "#181917" }}>{sources.length}</span>
            <span style={{ color: "#687563", fontSize: "0.9rem" }}>Repositories</span>
          </div>
          <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "#666" }}>
            {activeJobsCount > 0 ? `${activeJobsCount} scan running` : "All feeds idle"}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="ecdat-card" style={{ padding: "1.5rem" }}>
          <h3
            style={{
              fontSize: "0.8rem",
              textTransform: "uppercase",
              color: "#687563",
              letterSpacing: "0.05em",
              marginBottom: "1rem",
            }}
          >
            Cryptographic Assets
          </h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontSize: "2.75rem", fontWeight: 800, lineHeight: 1, color: "#181917" }}>
              {totalAssetsCount}
            </span>
            <span style={{ color: "#687563", fontSize: "0.9rem" }}>Canonical Items</span>
          </div>
          <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "#B95532", fontWeight: 600 }}>
            {quantumVulnerableCount} Quantum Vulnerable
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="ecdat-card" style={{ padding: "1.5rem" }}>
          <h3
            style={{
              fontSize: "0.8rem",
              textTransform: "uppercase",
              color: "#687563",
              letterSpacing: "0.05em",
              marginBottom: "1rem",
            }}
          >
            Quantum Risk Exposure
          </h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontSize: "2.75rem", fontWeight: 800, lineHeight: 1, color: criticalCount > 0 ? "#B91C1C" : "#181917" }}>
              {criticalCount}
            </span>
            <span style={{ color: "#687563", fontSize: "0.9rem" }}>Critical Priority</span>
          </div>
          <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "#C2410C" }}>
            {highCount} High Priority assets
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="ecdat-card" style={{ padding: "1.5rem" }}>
          <h3
            style={{
              fontSize: "0.8rem",
              textTransform: "uppercase",
              color: "#687563",
              letterSpacing: "0.05em",
              marginBottom: "1rem",
            }}
            title="Already-safe assets divided by total — not 'percent migrated'; ECDAT doesn't track migration completion yet, see Migration Planner"
          >
            Already Quantum-Safe
          </h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontSize: "2.75rem", fontWeight: 800, lineHeight: 1, color: alreadySafeCount === totalAssetsCount && totalAssetsCount > 0 ? "#15803D" : "#B95532" }}>
              {alreadySafeCount}
            </span>
            <span style={{ color: "#687563", fontSize: "0.9rem" }}>of {totalAssetsCount} assets</span>
          </div>
          <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "#687563" }}>
            {needsMigrationCount > 0 ? (
              <Link href="/prototype/migration" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
                {needsMigrationCount} need migration · {recommendations.length} have a plan ready →
              </Link>
            ) : totalAssetsCount > 0 ? (
              "All discovered assets are quantum-safe"
            ) : (
              "No assets discovered yet"
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Main Grid: Priority Risk Queue + Live Pipeline Feed */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "2rem" }}
      >
        {/* Top Priority Risk Queue */}
        <motion.div variants={itemVariants} className="ecdat-card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "1.25rem 1.75rem",
              borderBottom: "1px solid #eaeaea",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#faf9f6",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#181917", margin: 0 }}>
                High-Priority Cryptographic Assets
              </h2>
              <p style={{ fontSize: "0.8rem", color: "#666", margin: "2px 0 0" }}>
                Ranked by classical vulnerability, Shor exposure, and Mosca threshold.
              </p>
            </div>
            <Link
              href="/prototype/assets"
              className="ecdat-badge ecdat-badge-neutral"
              style={{ textDecoration: "none", fontSize: "0.75rem" }}
            >
              VIEW ALL ASSETS →
            </Link>
          </div>

          <div className="ecdat-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
            <table className="ecdat-table">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Family / Function</th>
                  <th>Risk Level</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {priorityRisks.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
                      {totalAssetsCount === 0 ? (
                        <div>
                          <p style={{ marginBottom: "1rem" }}>No cryptographic assets discovered yet.</p>
                          <Link href="/prototype/sources" className="ecdat-btn" style={{ padding: "0.4rem 0.8rem" }}>
                            Connect a Repository
                          </Link>
                        </div>
                      ) : (
                        "No critical or high-risk assets detected in this workspace."
                      )}
                    </td>
                  </tr>
                ) : (
                  priorityRisks.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#181917" }}>
                        {r.algorithm_canonical}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "#555" }}>
                        {r.algorithm_family || "ASYMMETRIC"}
                      </td>
                      <td>
                        <span
                          className={`ecdat-badge ${
                            r.composite_risk_level === "CRITICAL"
                              ? "ecdat-badge-danger"
                              : r.composite_risk_level === "HIGH"
                              ? "ecdat-badge-active"
                              : "ecdat-badge-neutral"
                          }`}
                        >
                          {r.composite_risk_level}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#666", maxWidth: "320px", lineHeight: 1.4 }}>
                        {primaryFactorReason(r)}
                      </td>
                      <td>
                        <Link
                          href="/prototype/assets"
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--color-primary)",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Live Scan Pipeline & Logs */}
        <motion.div
          variants={itemVariants}
          className="ecdat-card"
          style={{
            padding: 0,
            overflow: "hidden",
            background: "#181917",
            color: "#687563",
            fontFamily: "var(--font-mono)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid #2a2a28",
              fontSize: "0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#eaeaea",
              letterSpacing: "0.04em",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {activeJobsCount > 0 && (
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#B95532",
                    boxShadow: "0 0 8px #B95532",
                    animation: "pulse 2s infinite",
                    flexShrink: 0,
                  }}
                  title={`${activeJobsCount} scan(s) running`}
                ></span>
              )}
              LIVE ACTIVITY FEED
            </span>
            <span style={{ color: "#555", fontSize: "0.7rem" }}>{workspace?.id?.substring(0, 8)}</span>
          </div>

          <div style={{ padding: "0.4rem 0", flex: 1, fontSize: "0.8rem", overflowY: "auto" }}>
            {/* Real recent events from the append-only audit ledger — not a
                simulated log. Same event labels + icon set as the Activity page. */}
            {activity.length === 0 ? (
              <div style={{ color: "#888", padding: "0.75rem 1.25rem" }}>
                No activity yet. Connect a source and launch a discovery scan to see real events here.
              </div>
            ) : (
              activity.map((item) => (
                <div
                  key={item.id}
                  title={formatISTDateTime(item.created_at)}
                  style={{
                    color: "#F3F0E8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.55rem 1.25rem",
                    borderLeft: "2px solid transparent",
                    transition: "background-color 0.15s, border-color 0.15s",
                  }}
                  className="ecdat-activity-row"
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                    <ActivityIcon event={item.event} size={13} />
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <span style={{ color: "#B95532", fontWeight: 700 }}>{ACTIVITY_LABELS_COMPACT[item.event] || item.event}</span>{" "}
                      <span style={{ color: "#9a9a94" }}>
                        {item.resource_type ? `${item.resource_type}${item.resource_id ? " " + item.resource_id.slice(0, 8) : ""}` : ""}
                      </span>
                    </span>
                  </span>
                  <span style={{ color: "#687563", whiteSpace: "nowrap", fontSize: "0.72rem" }}>{formatRelativeTime(item.created_at)}</span>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              padding: "0.75rem 1.25rem",
              borderTop: "1px solid #2a2a28",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.75rem",
            }}
          >
            <Link href="/prototype/activity" style={{ color: "#888", textDecoration: "none" }}>
              View full audit trail →
            </Link>
            <Link
              href="/prototype/cbom"
              style={{ color: "#B95532", textDecoration: "none", fontWeight: 600 }}
            >
              Inspect CBOM →
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
