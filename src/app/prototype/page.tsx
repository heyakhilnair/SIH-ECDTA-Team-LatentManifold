"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { fetchWithAuth } from "../../lib/api";
import { motion } from "framer-motion";
import { useWorkspace } from "../../components/WorkspaceWrapper";
import Link from "next/link";
import "./prototype.css";

export default function MissionControl() {
  const { getToken, isLoaded, userId } = useAuth();
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

  return (
    <div className="ecdat-container">
      <motion.header 
        className="ecdat-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 style={{ fontSize: "2.25rem", marginBottom: "0.25rem" }}>Mission Control</h1>
          <p>Enterprise cryptographic discovery and migration posture.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/prototype/sources" className="ecdat-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            MANAGE SOURCES
          </Link>
          <Link href="/prototype/sources?force=true" className="ecdat-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", backgroundColor: "var(--color-primary)", color: "white" }}>
            FORCE RUN DISCOVERY
          </Link>
        </div>
      </motion.header>
          
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
