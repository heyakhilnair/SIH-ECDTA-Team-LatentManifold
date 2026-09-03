"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { api } from "../../lib/api";
import { motion } from "framer-motion";
import { useWorkspace } from "../../components/WorkspaceWrapper";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import "./prototype.css";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const loadData = async () => {
      if (!isLoaded || !userId || !workspace?.id) return;
      try {
        const [jobsRes, sourcesRes, riskSumRes, riskListRes, recsRes, assetsRes] = await Promise.all([
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
        ]);

        setJobs(jobsRes || []);
        setSources(sourcesRes || []);
        setRiskSummary(riskSumRes || {});
        setPriorityRisks((riskListRes || []).slice(0, 5));
        setRecommendations(recsRes || []);
        setAssets(assetsRes || []);
      } catch (err: any) {
        console.error("Error loading mission control data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [isLoaded, userId, getToken, workspace]);

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
  const pqcReadyCount = totalAssetsCount > 0 ? Math.round((recommendations.length / totalAssetsCount) * 100) : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 21) return "Good Evening";
    return "Good Night";
  };

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Command Center" }, { label: "Mission Control" }]}
        title="Mission Control"
        description="Enterprise cryptographic discovery, Mosca quantum risk posture, and PQC transition pipeline."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
            <span>
              <strong style={{ color: "#333" }}>Last Discovery:</strong>{" "}
              {latestCompletedJob
                ? new Date(latestCompletedJob.completed_at || latestCompletedJob.created_at).toLocaleString()
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
              <div style={{ fontSize: "0.8rem", color: "#888" }}>
                Completed {new Date(latestCompletedJob.completed_at || latestCompletedJob.created_at).toLocaleTimeString()}
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
          >
            PQC Migration Readiness
          </h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontSize: "2.75rem", fontWeight: 800, lineHeight: 1, color: "#B95532" }}>
              {pqcReadyCount}%
            </span>
            <span style={{ color: "#687563", fontSize: "0.9rem" }}>NIST FIPS Mapped</span>
          </div>
          <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "#687563" }}>
            {recommendations.length} replacements prepared
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
                      <td
                        style={{
                          fontSize: "0.8rem",
                          color: "#666",
                          maxWidth: "280px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={r.quantum_reason || r.classical_reason || ""}
                      >
                        {r.quantum_reason || r.classical_reason || "Vulnerable to quantum attack"}
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
            }}
          >
            <span>LIVE DISCOVERY LOG // {workspace?.id?.substring(0, 8)}</span>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#B95532",
                boxShadow: "0 0 8px #B95532",
                animation: "pulse 2s infinite",
              }}
            ></span>
          </div>

          <div style={{ padding: "1.25rem", flex: 1, fontSize: "0.8rem", lineHeight: 1.6, overflowY: "auto" }}>
            <div style={{ color: "#888", marginBottom: "6px" }}>
              [{new Date().toLocaleTimeString()}] SYS: Enclave initialized. Monitoring perimeter.
            </div>
            {sources.length > 0 && (
              <div style={{ color: "#F3F0E8", marginBottom: "6px" }}>
                [{new Date().toLocaleTimeString()}] SOURCES: {sources.length} repository targets registered.
              </div>
            )}
            {activeJobsCount > 0 && (
              <div style={{ color: "#B95532", marginBottom: "6px" }}>
                [{new Date().toLocaleTimeString()}] SCANNER: Tree-sitter & Semgrep analyzing {activeJobsCount} jobs...
              </div>
            )}
            {totalAssetsCount > 0 && (
              <div style={{ color: "#687563", marginBottom: "6px" }}>
                [{new Date().toLocaleTimeString()}] CBOM: {totalAssetsCount} canonical cryptographic assets resolved.
              </div>
            )}
            {recommendations.length > 0 && (
              <div style={{ color: "#F3F0E8", marginBottom: "6px" }}>
                [{new Date().toLocaleTimeString()}] PQC: {recommendations.length} NIST FIPS 203/204/205 candidate paths generated.
              </div>
            )}
            {sources.length === 0 && (
              <div style={{ color: "#D3A248", marginBottom: "6px" }}>
                [{new Date().toLocaleTimeString()}] WARN: No repository connected. Awaiting intelligence source.
              </div>
            )}
            <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
              _
            </motion.div>
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
            <span style={{ color: "#888" }}>CycloneDX v1.6 Ledger</span>
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
