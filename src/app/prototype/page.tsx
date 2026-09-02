"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { fetchWithAuth } from "../../lib/api";
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

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const loadData = async () => {
      if (!isLoaded || !userId || !workspace?.id) return;
      try {
        const token = await getToken();
        if (!token) return;
        const [jobsResponse, sourcesResponse] = await Promise.all([
          fetchWithAuth(`/api/workspaces/${workspace.id}/jobs`, getToken),
          fetchWithAuth(`/api/workspaces/${workspace.id}/sources`, getToken)
        ]);
        setJobs(jobsResponse);
        setSources(sourcesResponse);
      } catch (err: any) {
        console.error("Error loading data", err);
      }
    };

    loadData();
    interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [isLoaded, userId, getToken, workspace]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const activeJobsCount = jobs.filter(j => j.status === 'running' || j.status === 'queued').length;
  const completedJobsCount = jobs.filter(j => j.status === 'completed').length;
  const activeJob = jobs.find(j => j.status === 'running' || j.status === 'queued');
  const latestCompletedJob = jobs.filter(j => j.status === 'completed').sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
  
  const totalAssets = jobs.reduce((sum, job) => sum + (job.evidence_count || 0), 0);

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
        description="Enterprise cryptographic discovery and migration posture."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/prototype/sources" className="ecdat-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              MANAGE SOURCES
            </Link>
            <Link href="/prototype/sources?force=true" className="ecdat-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", backgroundColor: "var(--color-primary)", color: "white" }}>
              FORCE RUN DISCOVERY
            </Link>
          </div>
        }
      />

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
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
        }}
      >
        <div style={{ flex: "2 1 400px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#111", marginBottom: "1rem", fontFamily: "var(--font-display)" }}>
            {getGreeting()}, {user?.firstName || "Analyst"}.
          </h2>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
            Today's Cryptographic Report
          </div>
          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", borderBottom: "1px solid #eaeaea", paddingBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111" }}>{sources.length}</div>
              <div style={{ fontSize: "0.75rem", color: "#666" }}>Repositories Scanned</div>
            </div>
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111" }}>{totalAssets}</div>
              <div style={{ fontSize: "0.75rem", color: "#666" }}>New Assets</div>
            </div>
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#b95532" }}>0 <span style={{fontSize:"0.6rem", fontWeight: "normal"}}>[DEMO]</span></div>
              <div style={{ fontSize: "0.75rem", color: "#666" }}>Critical Findings</div>
            </div>
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111" }}>{completedJobsCount}</div>
              <div style={{ fontSize: "0.75rem", color: "#666" }}>Scans Completed</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "2rem", fontSize: "0.8rem", color: "#666" }}>
            <span><strong style={{ color: "#333" }}>Last Discovery:</strong> {latestCompletedJob ? new Date(latestCompletedJob.updated_at).toLocaleTimeString() : "N/A"}</span>
            <span><strong style={{ color: "#333" }}>Posture Change:</strong> <span style={{ color: "green" }}>+4% improved [DEMO]</span></span>
          </div>
        </div>

        <div style={{ flex: "1 1 250px", borderLeft: "1px solid #eaeaea", paddingLeft: "2rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
            {activeJob ? "Discovery In Progress" : "Today's Discovery"}
          </div>
          {activeJob ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#b95532", display: "inline-block", animation: "pulse 2s infinite" }}></span>
                <span style={{ fontWeight: 600, color: "#111", fontSize: "0.9rem" }}>Enterprise Scan #{activeJob.id.substring(0,6)}</span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: "0.25rem" }}>
                Analyzing {sources.length} repositories
              </div>
              <div style={{ fontSize: "0.8rem", color: "#888" }}>
                Current stage: Crypto Detection
              </div>
            </div>
          ) : latestCompletedJob ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }}></span>
                <span style={{ fontWeight: 600, color: "#111", fontSize: "0.9rem" }}>Enterprise Scan #{latestCompletedJob.id.substring(0,6)}</span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: "0.25rem" }}>
                {sources.length} / {sources.length} repositories
              </div>
              <div style={{ fontSize: "0.8rem", color: "#888" }}>
                Completed {new Date(latestCompletedJob.updated_at).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "0.85rem", color: "#888", fontStyle: "italic" }}>
              No discovery tasks run today.
            </div>
          )}
        </div>
      </motion.div>
          
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}
      >
        <motion.div variants={itemVariants} className="ecdat-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--color-secondary)", marginBottom: "1rem" }}>Monitored Sources</h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1 }}>{sources.length}</span>
            <span style={{ color: "var(--color-secondary)", fontSize: "0.9rem" }}>Repositories</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="ecdat-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--color-secondary)", marginBottom: "1rem" }}>Scan Activity</h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1 }}>{activeJobsCount}</span>
            <span style={{ color: "var(--color-secondary)", fontSize: "0.9rem" }}>Active Scans</span>
          </div>
          <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "var(--color-stone)" }}>
            {completedJobsCount} completed historically
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="ecdat-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--color-secondary)", marginBottom: "1rem" }}>Crypto Assets</h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1 }}>0</span>
            <span style={{ color: "var(--color-secondary)", fontSize: "0.9rem" }}>Discovered</span>
          </div>
          <div style={{ marginTop: "12px", fontSize: "0.85rem", color: "var(--color-danger)" }}>
            0 Quantum Vulnerable
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="ecdat-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--color-secondary)", marginBottom: "1rem" }}>Migration Readiness</h3>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
            <span style={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1 }}>0%</span>
            <span style={{ color: "var(--color-secondary)", fontSize: "0.9rem" }}>PQC Ready</span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        
        <motion.div variants={itemVariants} className="ecdat-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1.5rem 2rem", borderBottom: "var(--border-thin)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.1rem" }}>Extraction Pipeline Jobs</h2>
            <Link href="/prototype/scans" className="ecdat-badge ecdat-badge-neutral" style={{ textDecoration: "none" }}>VIEW ALL</Link>
          </div>
          <div className="ecdat-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
            <table className="ecdat-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Status</th>
                  <th>Initiated At</th>
                  <th>Assets Found</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 5).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "3rem", color: "var(--color-secondary)" }}>
                      No recent jobs found. <Link href="/prototype/sources" style={{ color: "var(--color-primary)" }}>Select sources</Link> to run discovery.
                    </td>
                  </tr>
                ) : (
                  jobs.slice(0, 5).map((job) => (
                    <tr key={job.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--color-secondary)" }}>
                        {job.id.substring(0, 12)}
                      </td>
                      <td>
                        <span className={`ecdat-badge ${
                          job.status === 'completed' ? 'ecdat-badge-success' : 
                          job.status === 'running' ? 'ecdat-badge-active' : 
                          job.status === 'failed' ? 'ecdat-badge-danger' : 
                          'ecdat-badge-neutral'}`}
                        >
                          {job.status === 'running' && (
                            <svg className="ecdat-spin" style={{ width: "12px", height: "12px", marginRight: "6px" }} fill="none" viewBox="0 0 24 24">
                              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {job.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.85rem" }}>
                        {job.started_at ? new Date(job.started_at).toLocaleString() : 'PENDING'}
                      </td>
                      <td>
                        {job.evidence_count > 0 ? (
                          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--color-primary)" }}>
                            {job.evidence_count}
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-stone)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Storytelling Terminal Feed */}
        <motion.div variants={itemVariants} className="ecdat-card" style={{ padding: 0, overflow: "hidden", background: "#111", color: "#00FF41", fontFamily: "var(--font-mono)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1rem", borderBottom: "1px solid #333", fontSize: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>SECURE ENCLAVE LOGS // {workspace?.id?.substring(0, 8)}</span>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00FF41", boxShadow: "0 0 8px #00FF41", animation: "pulse 2s infinite" }}></span>
          </div>
          <div style={{ padding: "1.5rem", flex: 1, fontSize: "0.85rem", lineHeight: 1.6, overflowY: "auto" }}>
            <div style={{ color: "#888", marginBottom: "8px" }}>[{new Date().toLocaleTimeString()}] SYS: Enclave active. Monitoring cryptographic perimeter...</div>
            {activeJobsCount > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: "8px" }}>
                [{new Date().toLocaleTimeString()}] DISCOVERY: Tree-sitter pipeline running on {activeJobsCount} targets...
              </motion.div>
            )}
            {completedJobsCount > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: "8px" }}>
                [{new Date().toLocaleTimeString()}] DB: Synchronized {completedJobsCount} scan results to central CBOM ledger.
              </motion.div>
            )}
            {sources.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: "#D3A248", marginBottom: "8px" }}>
                [{new Date().toLocaleTimeString()}] WARN: No sources configured. Awaiting intelligence feed.
              </motion.div>
            )}
            <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>_</motion.div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
