"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { fetchWithAuth, createSource, createDiscoveryJob } from "../../../lib/api";
import { api } from "../../../lib/api";
import { motion } from "framer-motion";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace]);

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
      alert(`Successfully queued discovery job for ${selectedIds.size} project(s).`);
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
      setSelectedIds(new Set(sources.map((s) => s.id)));
    }
  };

  const toggleAiExcluded = async (source: any) => {
    if (!workspace?.id) return;
    setTogglingId(source.id);
    try {
      await api.sources.update(workspace.id, source.id, { ai_excluded: !source.ai_excluded }, getToken);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update AI access for this project");
    } finally {
      setTogglingId(null);
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
          <h1 style={{ fontSize: "2.25rem", marginBottom: "0.25rem" }}>Projects</h1>
          <p>Register a repository as a project, then scan it. Every other page — Assets, Risk, CBOM, Migration, AI Analyst — can be scoped to one project at a time from here.</p>
        </div>
      </motion.header>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div className="ecdat-card">
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Register a Project</h2>
          <p style={{ marginBottom: "1.5rem" }}>Add a Git repository to your workspace as a new project.</p>

          <form onSubmit={handleAddSource} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "620px" }}>
            <div>
              <label htmlFor="source-name" style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-secondary)", marginBottom: "0.4rem", textTransform: "uppercase" }}>
                Project Name
              </label>
              <input
                id="source-name"
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="e.g. Core Auth Service"
                required
                className="ecdat-input"
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label htmlFor="source-url" style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--color-secondary)", marginBottom: "0.4rem", textTransform: "uppercase" }}>
                Repository URL
              </label>
              <input
                id="source-url"
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                required
                className="ecdat-input"
                style={{ width: "100%" }}
              />
            </div>
            <button type="submit" disabled={isSubmitting || !workspace} className="ecdat-btn" style={{ alignSelf: "flex-start" }}>
              {isSubmitting ? "REGISTERING..." : "ADD PROJECT"}
            </button>
          </form>
          {error && <p style={{ color: "var(--color-danger)", marginTop: "1rem", fontWeight: 600, fontSize: "0.9rem" }}>{error}</p>}
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>
                {sources.length} Registered Project{sources.length === 1 ? "" : "s"}
              </h2>
              <div style={{ fontSize: "0.85rem", color: "var(--color-secondary)" }}>
                {selectedIds.size} selected for discovery
                {sources.length > 0 && (
                  <button onClick={toggleSelectAll} style={{ marginLeft: "0.75rem", background: "none", border: "none", color: "var(--color-accent, #B95532)", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>
                    {selectedIds.size === sources.length ? "Clear selection" : "Select all"}
                  </button>
                )}
              </div>
            </div>
            <button
              className="ecdat-btn"
              style={{ backgroundColor: selectedIds.size > 0 ? "var(--color-primary)" : "var(--color-stone)", color: "white" }}
              disabled={selectedIds.size === 0 || isScanning}
              onClick={handleLaunchDiscovery}
            >
              {isScanning ? "QUEUING JOB..." : "LAUNCH DISCOVERY SCAN"}
            </button>
          </div>

          {sources.length === 0 ? (
            <div className="ecdat-card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-secondary)" }}>
              No projects registered. Add your first repository above.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="ecdat-card"
                  style={{
                    padding: "1.25rem",
                    borderColor: selectedIds.has(source.id) ? "var(--color-accent, #B95532)" : undefined,
                    backgroundColor: selectedIds.has(source.id) ? "rgba(185, 85, 50, 0.04)" : undefined,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", cursor: "pointer", flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(source.id)}
                        onChange={() => toggleSelect(source.id)}
                        style={{ marginTop: "0.3rem", flexShrink: 0 }}
                      />
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "1.05rem",
                          color: "#181917",
                          wordBreak: "break-word",
                        }}
                        title={source.name}
                      >
                        {source.name}
                      </span>
                    </label>
                    <span className="ecdat-badge ecdat-badge-success" style={{ flexShrink: 0, fontSize: "0.7rem" }}>
                      HEALTHY
                    </span>
                  </div>

                  <div style={{ margin: "0.6rem 0 0.9rem", fontSize: "0.8rem", color: "var(--color-secondary)", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <span className="ecdat-badge ecdat-badge-neutral" style={{ textTransform: "uppercase", width: "fit-content", fontSize: "0.7rem" }}>
                      {source.source_type}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        wordBreak: "break-all",
                      }}
                      title={source.configuration?.url}
                    >
                      {source.configuration?.url}
                    </span>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.78rem",
                      color: "var(--color-secondary)",
                      padding: "0.5rem 0.65rem",
                      backgroundColor: source.ai_excluded ? "#FEF3C7" : "#faf9f6",
                      border: "1px solid " + (source.ai_excluded ? "#FDE68A" : "#eaeaea"),
                      borderRadius: "6px",
                      marginBottom: "0.9rem",
                      cursor: togglingId === source.id ? "wait" : "pointer",
                    }}
                    title="When on, findings from this project are never sent to the AI Analyst — for sensitive/confidential repos."
                  >
                    <input
                      type="checkbox"
                      checked={!!source.ai_excluded}
                      disabled={togglingId === source.id}
                      onChange={() => toggleAiExcluded(source)}
                    />
                    <span style={{ fontWeight: 600, color: source.ai_excluded ? "#92400E" : "var(--color-secondary)" }}>
                      {source.ai_excluded ? "🔒 Hidden from AI Analyst" : "Visible to AI Analyst"}
                    </span>
                  </label>

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderTop: "1px solid #eaeaea", paddingTop: "0.75rem" }}>
                    <Link href={`/prototype/assets?source=${source.id}`} className="ecdat-btn" style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}>
                      Assets →
                    </Link>
                    <Link href={`/prototype/risk?source=${source.id}`} className="ecdat-btn" style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}>
                      Risk →
                    </Link>
                    <Link href={`/prototype/migration?source=${source.id}`} className="ecdat-btn" style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }}>
                      Migration →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
