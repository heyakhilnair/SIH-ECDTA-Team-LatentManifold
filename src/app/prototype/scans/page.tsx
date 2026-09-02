"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { fetchWithAuth } from "../../../lib/api";
import { motion } from "framer-motion";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import "../prototype.css";

export default function ScansPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();
  
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const loadData = async () => {
      if (!isLoaded || !userId || !workspace?.id) return;
      try {
        const token = await getToken();
        if (!token) return;
        const jobsResponse = await fetchWithAuth(`/api/workspaces/${workspace.id}/jobs`, getToken);
        setJobs(jobsResponse);
      } catch (err: any) {
        console.error("Error loading data", err);
      }
    };

    loadData();
    interval = setInterval(loadData, 3000); // Poll every 3 seconds for active jobs
    return () => clearInterval(interval);
  }, [isLoaded, userId, getToken, workspace]);

  const activeJobs = jobs.filter(j => j.status === 'running' || j.status === 'queued');

  return (
    <div className="ecdat-container">
      <motion.header 
        className="ecdat-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 style={{ fontSize: "2.25rem", marginBottom: "0.25rem" }}>Scan Jobs Pipeline</h1>
          <p>Monitor asynchronous discovery tasks across the enterprise.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="ecdat-badge ecdat-badge-active" style={{ fontSize: "0.85rem" }}>
            {activeJobs.length} ACTIVE
          </div>
        </div>
      </motion.header>
          
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        <div className="ecdat-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1.5rem 2rem", borderBottom: "var(--border-thin)", backgroundColor: "#faf9f6" }}>
            <h2 style={{ fontSize: "1.1rem" }}>Pipeline Execution History</h2>
          </div>
          
          <div className="ecdat-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
            <table className="ecdat-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Pipeline Status</th>
                  <th>Initiated At</th>
                  <th>Completed At</th>
                  <th>Crypto Assets Found</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "var(--color-secondary)" }}>
                      No scan jobs found. Launch discovery from the Sources page.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--color-secondary)" }}>
                        {job.id}
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
                      <td style={{ fontSize: "0.85rem", color: "var(--color-secondary)" }}>
                        {job.started_at ? new Date(job.started_at).toLocaleString() : 'PENDING'}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--color-secondary)" }}>
                        {job.completed_at ? new Date(job.completed_at).toLocaleString() : '—'}
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
        </div>
      </div>
    </div>
  );
}
