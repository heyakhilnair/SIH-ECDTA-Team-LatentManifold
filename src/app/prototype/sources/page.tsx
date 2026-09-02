"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { fetchWithAuth, createSource, createDiscoveryJob } from "../../../lib/api";
import { motion } from "framer-motion";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import { useSearchParams } from "next/navigation";
import "../prototype.css";

export default function SourcesPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();
  const searchParams = useSearchParams();
  const autoForce = searchParams?.get("force") === "true";
  
  const [sources, setSources] = useState<any[]>([]);
  const [repoName, setRepoName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    if (!isLoaded || !userId || !workspace?.id) return;
    try {
      const token = await getToken();
      if (!token) return;
      const sourcesResponse = await fetchWithAuth(`/api/workspaces/${workspace.id}/sources`, getToken);
      setSources(sourcesResponse);
    } catch (err: any) {
      console.error("Error loading sources", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [isLoaded, userId, getToken, workspace]);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id || !repoUrl || !repoName) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      await createSource(workspace.id, repoName, repoUrl, getToken);
      setRepoName("");
      setRepoUrl("");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to add source");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaunchDiscovery = async () => {
    if (!workspace?.id || selectedIds.size === 0) return;
    
    setIsScanning(true);
    setError(null);
    try {
      await createDiscoveryJob(workspace.id, Array.from(selectedIds), getToken);
      setSelectedIds(new Set());
      alert(`Successfully queued discovery job for ${selectedIds.size} sources.`);
    } catch (err: any) {
      setError(err.message || "Failed to start scan");
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sources.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sources.map(s => s.id)));
    }
  };

  return (
    <div className="ecdat-container">
      <motion.header 
        className="ecdat-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 style={{ fontSize: "2.25rem", marginBottom: "0.25rem" }}>Sources Inventory</h1>
          <p>Register enterprise repositories and assets for cryptographic discovery.</p>
        </div>
      </motion.header>
          
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        <div className="ecdat-card">
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Register Source</h2>
          <p style={{ marginBottom: "1.5rem" }}>Add a Git repository, Container Image, or PKI endpoint to your workspace.</p>
          
          <form onSubmit={handleAddSource} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", maxWidth: "1000px" }}>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="Source Name (e.g. Core Auth Service)"
              required
              className="ecdat-input"
              style={{ flex: 1, minWidth: "200px" }}
            />
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              required
              className="ecdat-input"
              style={{ flex: 2, minWidth: "300px" }}
            />
            <button
              type="submit"
              disabled={isSubmitting || !workspace}
              className="ecdat-btn"
            >
              {isSubmitting ? "REGISTERING..." : "ADD SOURCE"}
            </button>
          </form>
          {error && <p style={{ color: "var(--color-danger)", marginTop: "1rem", fontWeight: 600, fontSize: "0.9rem" }}>{error}</p>}
        </div>

        <div className="ecdat-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1.5rem 2rem", borderBottom: "var(--border-thin)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#faf9f6" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>Registered Sources</h2>
              <div style={{ fontSize: "0.85rem", color: "var(--color-secondary)" }}>{selectedIds.size} selected for discovery</div>
            </div>
            <button 
              className="ecdat-btn" 
              style={{ backgroundColor: selectedIds.size > 0 ? "var(--color-primary)" : "var(--color-stone)", color: "white" }}
              disabled={selectedIds.size === 0 || isScanning}
              onClick={handleLaunchDiscovery}
            >
              {isScanning ? "QUEUING JOB..." : "LAUNCH ENTERPRISE DISCOVERY"}
            </button>
          </div>
          
          <div className="ecdat-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
            <table className="ecdat-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <input 
                      type="checkbox" 
                      checked={sources.length > 0 && selectedIds.size === sources.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Source Name</th>
                  <th>Type</th>
                  <th>URL</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {sources.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "var(--color-secondary)" }}>
                      No sources registered. Add your first repository above.
                    </td>
                  </tr>
                ) : (
                  sources.map((source) => (
                    <tr key={source.id} style={{ backgroundColor: selectedIds.has(source.id) ? "rgba(185, 85, 50, 0.05)" : "transparent" }}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(source.id)}
                          onChange={() => toggleSelect(source.id)}
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>{source.name}</td>
                      <td>
                        <span className="ecdat-badge ecdat-badge-neutral" style={{ textTransform: "uppercase" }}>{source.source_type}</span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--color-secondary)" }}>
                        {source.configuration?.url}
                      </td>
                      <td>
                        <span className="ecdat-badge ecdat-badge-success">HEALTHY</span>
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
