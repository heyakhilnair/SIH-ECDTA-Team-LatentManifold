"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProjectFilter from "@/components/ProjectFilter";
import Link from "next/link";
import "../prototype.css";

function AssetsTable({ assets, onSelect }: { assets: any[]; onSelect: (asset: any) => void }) {
  return (
    <div className="ecdat-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
      <table className="ecdat-table">
        <thead>
          <tr>
            <th>Canonical Algorithm</th>
            <th>Family</th>
            <th>Function</th>
            <th>Key Size</th>
            <th>Quantum Posture</th>
            <th>Classical Status</th>
            <th>Composite Risk</th>
            <th>Occurrences</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id} onClick={() => onSelect(asset)} style={{ cursor: "pointer" }}>
              <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#181917" }}>
                {asset.algorithm_canonical}
              </td>
              <td style={{ fontSize: "0.85rem", color: "#555" }}>{asset.algorithm_family}</td>
              <td style={{ fontSize: "0.85rem", color: "#666" }}>{asset.function || "UNSPECIFIED"}</td>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                {asset.key_size ? `${asset.key_size} bit` : "—"}
              </td>
              <td>
                {asset.quantum_vulnerable ? (
                  <span className="ecdat-badge ecdat-badge-danger" style={{ fontSize: "0.75rem" }}>VULNERABLE (SHOR)</span>
                ) : (
                  <span className="ecdat-badge ecdat-badge-success" style={{ fontSize: "0.75rem" }}>QUANTUM SAFE</span>
                )}
              </td>
              <td>
                {asset.classical_vulnerable ? (
                  <span className="ecdat-badge ecdat-badge-danger" style={{ fontSize: "0.75rem" }}>DEPRECATED / BROKEN</span>
                ) : (
                  <span className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.75rem" }}>ACCEPTABLE</span>
                )}
              </td>
              <td>
                <span
                  className={`ecdat-badge ${
                    asset.risk?.composite_risk_level === "CRITICAL" ? "ecdat-badge-danger"
                    : asset.risk?.composite_risk_level === "HIGH" ? "ecdat-badge-active"
                    : asset.risk?.composite_risk_level === "MEDIUM" ? "ecdat-badge-neutral"
                    : "ecdat-badge-success"
                  }`}
                  style={{ fontSize: "0.75rem" }}
                >
                  {asset.risk?.composite_risk_level || "ASSESSED"}
                </span>
              </td>
              <td style={{ textAlign: "center", fontWeight: 700 }}>
                <span style={{ color: "var(--color-primary)" }}>{asset.evidence_count}</span>
              </td>
              <td>
                <button
                  onClick={(e) => { e.stopPropagation(); onSelect(asset); }}
                  className="ecdat-btn"
                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                >
                  Inspect →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AssetsPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();
  const searchParams = useSearchParams();

  const [assets, setAssets] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [sourceId, setSourceId] = useState(() => searchParams?.get("source") || "");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "quantum" | "classical" | "safe">("all");
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"evidence" | "risk" | "recommendation">("evidence");
  const [drawerLoading, setDrawerLoading] = useState(false);

  const loadAssets = async () => {
    if (!isLoaded || !userId || !workspace?.id) return;
    setLoading(true);
    try {
      const params: any = {};
      if (activeFilter === "quantum") params.quantum_vulnerable = true;
      if (activeFilter === "classical") params.classical_vulnerable = true;
      if (search.trim()) params.search = search.trim();
      if (sourceId) params.source_id = sourceId;

      const [data, sourcesData] = await Promise.all([
        api.assets.list(workspace.id, getToken, params),
        api.sources.list(workspace.id, getToken).catch(() => []),
      ]);
      let filtered = data || [];
      if (activeFilter === "safe") {
        filtered = filtered.filter((a: any) => !a.quantum_vulnerable && !a.classical_vulnerable);
      }
      setAssets(filtered);
      setSources(sourcesData || []);
    } catch (err: any) {
      console.error("Failed to load assets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace, activeFilter, sourceId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAssets();
  };

  // Group by project when viewing "All Projects" — an asset shared across
  // projects (same algorithm in two repos) appears once under each project
  // it was actually found in, so "where does this sit in MY project" has a
  // real, direct answer instead of one flat mixed list. A single-project
  // view (sourceId set) has nothing to group by, so it stays flat.
  const groupedByProject: [string, any[]][] | null = sourceId
    ? null
    : (() => {
        const groups: Record<string, any[]> = {};
        for (const asset of assets) {
          const projects: string[] = asset.projects?.length ? asset.projects : ["Unattributed"];
          for (const p of projects) {
            (groups[p] ||= []).push(asset);
          }
        }
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
      })();

  const handleSelectAsset = async (asset: any) => {
    setSelectedAsset(asset);
    setActiveTab("evidence");
    setDrawerLoading(true);
    try {
      const detail = await api.assets.get(asset.id, getToken);
      setSelectedAsset(detail);
    } catch (err) {
      console.error("Failed to fetch asset detail", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Discovery" }, { label: "Crypto Assets" }]}
        title="Cryptographic Inventory"
        description="Canonical cryptographic assets discovered across all enterprise source code, dependencies, and certificates."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/prototype/sources" className="ecdat-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              ADD REPOSITORY
            </Link>
            <Link
              href="/prototype/cbom"
              className="ecdat-btn"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                backgroundColor: "var(--color-primary)",
                color: "white",
              }}
            >
              EXPORT CBOM →
            </Link>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
          backgroundColor: "#fff",
          border: "1px solid #eaeaea",
          borderRadius: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <ProjectFilter sources={sources} value={sourceId} onChange={setSourceId} />
          <button
            onClick={() => setActiveFilter("all")}
            className={`ecdat-btn ${activeFilter === "all" ? "ecdat-btn-primary" : ""}`}
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.8rem",
              borderRadius: "20px",
              backgroundColor: activeFilter === "all" ? "var(--color-primary)" : "#f5f5f5",
              color: activeFilter === "all" ? "#fff" : "#333",
              border: "none",
            }}
          >
            All Assets ({assets.length})
          </button>
          <button
            onClick={() => setActiveFilter("quantum")}
            className={`ecdat-btn ${activeFilter === "quantum" ? "ecdat-btn-primary" : ""}`}
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.8rem",
              borderRadius: "20px",
              backgroundColor: activeFilter === "quantum" ? "#B95532" : "#f5f5f5",
              color: activeFilter === "quantum" ? "#fff" : "#333",
              border: "none",
            }}
          >
            Quantum Vulnerable (Shor)
          </button>
          <button
            onClick={() => setActiveFilter("classical")}
            className={`ecdat-btn ${activeFilter === "classical" ? "ecdat-btn-primary" : ""}`}
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.8rem",
              borderRadius: "20px",
              backgroundColor: activeFilter === "classical" ? "#B91C1C" : "#f5f5f5",
              color: activeFilter === "classical" ? "#fff" : "#333",
              border: "none",
            }}
          >
            Classically Broken
          </button>
          <button
            onClick={() => setActiveFilter("safe")}
            className={`ecdat-btn ${activeFilter === "safe" ? "ecdat-btn-primary" : ""}`}
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.8rem",
              borderRadius: "20px",
              backgroundColor: activeFilter === "safe" ? "#15803D" : "#f5f5f5",
              color: activeFilter === "safe" ? "#fff" : "#333",
              border: "none",
            }}
          >
            Quantum-Safe
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", flex: "1 1 240px", maxWidth: "400px" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search algorithm, key size, or OID..."
            style={{
              flex: 1,
              padding: "0.5rem 0.75rem",
              fontSize: "0.85rem",
              border: "1px solid #ddd",
              borderRadius: "6px",
            }}
          />
          <button
            type="submit"
            className="ecdat-btn"
            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Assets Table(s) — grouped by project when viewing all projects, flat when one is selected */}
      {loading ? (
        <div className="ecdat-card" style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
          Loading cryptographic assets...
        </div>
      ) : assets.length === 0 ? (
        <div className="ecdat-card" style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
          <p style={{ marginBottom: "1rem" }}>No cryptographic assets matching the selected criteria.</p>
          <Link href="/prototype/sources" className="ecdat-btn" style={{ padding: "0.4rem 0.8rem" }}>
            Run Discovery Scan
          </Link>
        </div>
      ) : groupedByProject ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {groupedByProject.map(([projectName, projectAssets]) => (
            <div key={projectName} className="ecdat-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #eaeaea", backgroundColor: "#faf9f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "0.95rem", color: "#181917" }}>📁 {projectName}</strong>
                <span className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.7rem" }}>{projectAssets.length} asset{projectAssets.length === 1 ? "" : "s"}</span>
              </div>
              <AssetsTable assets={projectAssets} onSelect={handleSelectAsset} />
            </div>
          ))}
        </div>
      ) : (
        <div className="ecdat-card" style={{ padding: 0, overflow: "hidden" }}>
          <AssetsTable assets={assets} onSelect={handleSelectAsset} />
        </div>
      )}

      {/* Slide-Over Detail Drawer */}
      <AnimatePresence>
        {selectedAsset && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              zIndex: 1000,
              display: "flex",
              justifyContent: "flex-end",
            }}
            onClick={() => setSelectedAsset(null)}
          >
            <motion.div
              initial={{ x: 500, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 500, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                width: "100%",
                maxWidth: "680px",
                height: "100%",
                backgroundColor: "#fff",
                display: "flex",
                flexDirection: "column",
                boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div
                style={{
                  padding: "1.5rem 2rem",
                  borderBottom: "1px solid #eaeaea",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  backgroundColor: "#faf9f6",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "1.4rem",
                        fontWeight: 800,
                        color: "#181917",
                      }}
                    >
                      {selectedAsset.algorithm_canonical}
                    </span>
                    <span
                      className={`ecdat-badge ${
                        selectedAsset.risk?.composite_risk_level === "CRITICAL"
                          ? "ecdat-badge-danger"
                          : "ecdat-badge-active"
                      }`}
                    >
                      {selectedAsset.risk?.composite_risk_level || "ACTIVE"}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#666", margin: 0 }}>
                    Family: <strong>{selectedAsset.algorithm_family}</strong> · Key Size:{" "}
                    <strong>{selectedAsset.key_size ? `${selectedAsset.key_size}-bit` : "N/A"}</strong> · Function:{" "}
                    <strong>{selectedAsset.function || "UNSPECIFIED"}</strong>
                  </p>
                  {selectedAsset.projects?.length > 0 && (
                    <p style={{ fontSize: "0.8rem", color: "#666", margin: "6px 0 0" }}>
                      Found in: {selectedAsset.projects.map((p: string) => (
                        <span key={p} className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.7rem", marginRight: "4px" }}>📁 {p}</span>
                      ))}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    color: "#888",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Drawer Tabs */}
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid #eaeaea",
                  backgroundColor: "#fff",
                  padding: "0 2rem",
                }}
              >
                <button
                  onClick={() => setActiveTab("evidence")}
                  style={{
                    padding: "0.85rem 1.25rem",
                    border: "none",
                    borderBottom: activeTab === "evidence" ? "2px solid #B95532" : "2px solid transparent",
                    background: "none",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: activeTab === "evidence" ? "#B95532" : "#666",
                    cursor: "pointer",
                  }}
                >
                  Evidence Occurrences ({selectedAsset.evidence?.length || selectedAsset.evidence_count || 0})
                </button>
                <button
                  onClick={() => setActiveTab("risk")}
                  style={{
                    padding: "0.85rem 1.25rem",
                    border: "none",
                    borderBottom: activeTab === "risk" ? "2px solid #B95532" : "2px solid transparent",
                    background: "none",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: activeTab === "risk" ? "#B95532" : "#666",
                    cursor: "pointer",
                  }}
                >
                  Quantum & Mosca Risk
                </button>
                <button
                  onClick={() => setActiveTab("recommendation")}
                  style={{
                    padding: "0.85rem 1.25rem",
                    border: "none",
                    borderBottom: activeTab === "recommendation" ? "2px solid #B95532" : "2px solid transparent",
                    background: "none",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: activeTab === "recommendation" ? "#B95532" : "#666",
                    cursor: "pointer",
                  }}
                >
                  NIST PQC Recommendation
                </button>
              </div>

              {/* Drawer Body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "1.75rem 2rem" }}>
                {drawerLoading ? (
                  <p style={{ textAlign: "center", color: "#888" }}>Loading full asset dossier...</p>
                ) : activeTab === "evidence" ? (
                  <div>
                    <h3 style={{ fontSize: "0.9rem", color: "#888", textTransform: "uppercase", marginBottom: "1rem" }}>
                      Raw Finding Evidence Occurrences
                    </h3>
                    {!selectedAsset.evidence || selectedAsset.evidence.length === 0 ? (
                      <p style={{ color: "#888", fontStyle: "italic" }}>No evidence occurrences linked.</p>
                    ) : (
                      selectedAsset.evidence.map((ev: any) => (
                        <div
                          key={ev.id}
                          style={{
                            border: "1px solid #eaeaea",
                            borderRadius: "6px",
                            padding: "1rem",
                            marginBottom: "1rem",
                            backgroundColor: "#faf9f6",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.5rem",
                              fontSize: "0.85rem",
                            }}
                          >
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#181917" }}>
                              {ev.file_path || "source file"} : Line {ev.line_number || "—"}
                            </span>
                            <span className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.75rem" }}>
                              {ev.detector} ({(ev.confidence * 100).toFixed(0)}% conf)
                            </span>
                          </div>
                          {ev.context_lines && (
                            <pre
                              style={{
                                backgroundColor: "#181917",
                                color: "#F3F0E8",
                                padding: "0.75rem",
                                borderRadius: "4px",
                                fontSize: "0.8rem",
                                overflowX: "auto",
                                margin: "0.5rem 0 0",
                              }}
                            >
                              <code>{ev.context_lines}</code>
                            </pre>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : activeTab === "risk" ? (
                  <div>
                    <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
                      <div style={{ padding: "1rem", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "6px" }}>
                        <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>
                          Quantum Threat Exposure (Shor)
                        </div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: selectedAsset.quantum_vulnerable ? "#B91C1C" : "#15803D", margin: "4px 0" }}>
                          {selectedAsset.quantum_vulnerable ? "HIGH EXPOSURE" : "SAFE / RESISTANT"}
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "#555", margin: 0 }}>
                          {selectedAsset.risk?.quantum_reason || "Algorithm is vulnerable to polynomial-time quantum attacks on CRQC."}
                        </p>
                      </div>

                      <div style={{ padding: "1rem", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "6px" }}>
                        <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>
                          Classical Security Risk
                        </div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: selectedAsset.classical_vulnerable ? "#B91C1C" : "#15803D", margin: "4px 0" }}>
                          {selectedAsset.classical_vulnerable ? "DEPRECATED / VULNERABLE" : "CLASSICALLY ACCEPTABLE"}
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "#555", margin: 0 }}>
                          {selectedAsset.risk?.classical_reason || "No active classical vulnerabilities detected."}
                        </p>
                      </div>

                      <div style={{ padding: "1rem", backgroundColor: "#faf9f6", border: "1px solid #eaeaea", borderRadius: "6px" }}>
                        <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>
                          Mosca Inequality ($X + Y &gt; Z$)
                        </div>
                        <div style={{ display: "flex", gap: "1.5rem", margin: "8px 0" }}>
                          <div>
                            <span style={{ fontSize: "0.75rem", color: "#666" }}>X (Data Lifetime)</span>
                            <div style={{ fontWeight: 700, color: "#181917" }}>{selectedAsset.risk?.data_lifetime_years || 7} Years</div>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.75rem", color: "#666" }}>Y (Migration Time)</span>
                            <div style={{ fontWeight: 700, color: "#181917" }}>{selectedAsset.risk?.migration_time_years || 2} Years</div>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.75rem", color: "#666" }}>Z (Threat Horizon)</span>
                            <div style={{ fontWeight: 700, color: "#181917" }}>12 Years</div>
                          </div>
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "#555", margin: 0 }}>
                          {selectedAsset.risk?.mosca_threshold_exceeded
                            ? "CRITICAL: Harvest-Now-Decrypt-Later window is open. Immediate migration required."
                            : "Within acceptable safety margin for planned migration."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {!selectedAsset.recommendation ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "#15803D" }}>
                        <h4 style={{ margin: "0 0 8px" }}>No Replacement Needed</h4>
                        <p style={{ fontSize: "0.85rem", color: "#666" }}>
                          This asset is already quantum-safe and conforms to modern NIST standards.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ padding: "1.25rem", backgroundColor: "#faf9f6", border: "1px solid #eaeaea", borderRadius: "6px", marginBottom: "1rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "#B95532", fontWeight: 700, textTransform: "uppercase" }}>
                            Primary NIST Standard Replacement
                          </span>
                          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>
                            {selectedAsset.recommendation.recommended_algo}
                          </div>
                          <span className="ecdat-badge ecdat-badge-success" style={{ fontSize: "0.75rem" }}>
                            {selectedAsset.recommendation.nist_standard}
                          </span>
                          <p style={{ fontSize: "0.85rem", color: "#555", marginTop: "8px" }}>
                            {selectedAsset.recommendation.reasoning?.explanation}
                          </p>
                        </div>

                        {selectedAsset.recommendation.hybrid_path && (
                          <div style={{ padding: "1rem", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "6px", marginBottom: "1rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "#687563", fontWeight: 700, textTransform: "uppercase" }}>
                              Recommended Transition Path (Hybrid)
                            </span>
                            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#181917", margin: "4px 0" }}>
                              {selectedAsset.recommendation.hybrid_path}
                            </div>
                            <p style={{ fontSize: "0.8rem", color: "#666", margin: 0 }}>
                              Provides dual classical + post-quantum safety during protocol rollout.
                            </p>
                          </div>
                        )}

                        <div style={{ padding: "1rem", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "6px" }}>
                          <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: 700, textTransform: "uppercase" }}>
                            Migration Complexity & Constraints
                          </span>
                          <div style={{ display: "flex", gap: "1.5rem", marginTop: "8px" }}>
                            <div>
                              <span style={{ fontSize: "0.75rem", color: "#666" }}>Complexity</span>
                              <div style={{ fontWeight: 700 }}>{selectedAsset.recommendation.migration_complexity}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: "0.75rem", color: "#666" }}>Confidence</span>
                              <div style={{ fontWeight: 700 }}>
                                {((selectedAsset.recommendation.confidence || 0.95) * 100).toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        </div>

                        <Link
                          href={selectedAsset.projects?.length === 1 ? `/prototype/migration?source=${sources.find((s) => s.name === selectedAsset.projects[0])?.id || ""}` : "/prototype/migration"}
                          className="ecdat-btn"
                          style={{ display: "inline-block", marginTop: "1rem", padding: "0.6rem 1rem", fontSize: "0.85rem", textDecoration: "none" }}
                        >
                          Manage this migration — exact file locations, step-by-step guide →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
