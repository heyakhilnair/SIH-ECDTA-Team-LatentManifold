"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../lib/api";
import { motion } from "framer-motion";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProjectFilter from "@/components/ProjectFilter";
import Link from "next/link";
import "../prototype.css";

export default function GraphPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();
  const searchParams = useSearchParams();

  const [assets, setAssets] = useState<any[]>([]);
  const [allSources, setAllSources] = useState<any[]>([]);
  const [sourceId, setSourceId] = useState(() => searchParams?.get("source") || "");
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!isLoaded || !userId || !workspace?.id) return;
      setLoading(true);
      try {
        const [assetsRes, sourcesRes] = await Promise.all([
          api.assets.list(workspace.id, getToken, sourceId ? { source_id: sourceId } : undefined).catch(() => []),
          api.sources.list(workspace.id, getToken).catch(() => []),
        ]);
        setAssets(assetsRes || []);
        setAllSources(sourcesRes || []);
        if (assetsRes && assetsRes.length > 0) {
          setSelectedNode(assetsRes[0]);
        } else {
          setSelectedNode(null);
        }
      } catch (err) {
        console.error("Failed to load graph data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace, sourceId]);

  // Topology's "Tier 1" row shows only the scoped project when one is selected.
  const sources = sourceId ? allSources.filter((s) => s.id === sourceId) : allSources;

  const quantumCount = assets.filter((a) => a.quantum_vulnerable).length;

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Intelligence" }, { label: "Dependency Graph & Blast Radius" }]}
        title="Cryptographic Knowledge Graph"
        description="Topological dependency mapping tracing cryptographic algorithms through libraries, source repositories, and business services."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <ProjectFilter sources={allSources} value={sourceId} onChange={setSourceId} />
            <Link href="/prototype/assets" className="ecdat-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              INSPECT ASSETS
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        <div className="ecdat-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>
            Graph Entities (Nodes)
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>
            {sources.length + assets.length}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#687563" }}>
            {sources.length} Repositories · {assets.length} Algorithms
          </div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #B91C1C" }}>
          <div style={{ fontSize: "0.75rem", color: "#B91C1C", textTransform: "uppercase", fontWeight: 700 }}>
            Quantum Vulnerable Nodes
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>
            {quantumCount}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>
            Target nodes requiring PQC migration
          </div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>
            Estimated Blast Radius
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>
            {sources.length > 0 ? `${sources.length} Repos` : "0 Repos"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#687563" }}>
            Downstream systems impacted by crypto migration
          </div>
        </div>
      </div>

      {/* Interactive Topology Graph Visualizer */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1.5rem",
        }}
      >
        {/* Visual Graph Canvas */}
        <div
          className="ecdat-card"
          style={{
            padding: "2rem",
            backgroundColor: "#faf9f6",
            border: "1px solid #eaeaea",
            borderRadius: "8px",
            minHeight: "480px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#888", textTransform: "uppercase" }}>
              Topology Graph // Layered Cryptographic Flow
            </span>
            <span className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.75rem" }}>
              Source → Library → Algorithm
            </span>
          </div>

          {loading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
              Generating dependency graph...
            </div>
          ) : assets.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "#888", marginBottom: "1rem" }}>No discovered assets to map.</p>
              <Link href="/prototype/sources" className="ecdat-btn" style={{ padding: "0.4rem 0.8rem" }}>
                Add Source Repository
              </Link>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around" }}>
              {/* Repositories Row */}
              <div>
                <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "8px", fontWeight: 700 }}>
                  TIER 1: ENTERPRISE SOURCES
                </div>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {sources.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        padding: "0.6rem 1rem",
                        backgroundColor: "#181917",
                        color: "#F3F0E8",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                        fontFamily: "var(--font-mono)",
                        border: "1px solid #333",
                      }}
                    >
                      📦 {s.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Connecting Lines Indicator */}
              <div style={{ display: "flex", justifyContent: "center", color: "#B95532", fontSize: "1.2rem" }}>
                ↓ (USES)
              </div>

              {/* Algorithms Row */}
              <div>
                <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "8px", fontWeight: 700 }}>
                  TIER 2: DISCOVERED CRYPTOGRAPHIC ALGORITHMS (BLAST RADIUS)
                </div>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {assets.slice(0, 8).map((asset) => {
                    const isSelected = selectedNode?.id === asset.id;
                    return (
                      <motion.div
                        key={asset.id}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setSelectedNode(asset)}
                        style={{
                          padding: "0.6rem 1rem",
                          backgroundColor: isSelected ? "var(--color-primary)" : "#fff",
                          color: isSelected ? "#fff" : "#181917",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          border: isSelected
                            ? "2px solid var(--color-primary)"
                            : asset.quantum_vulnerable
                            ? "2px solid #B91C1C"
                            : "1px solid #ddd",
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                        }}
                      >
                        {asset.quantum_vulnerable ? "⚠️ " : "🔒 "}
                        {asset.algorithm_canonical}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Node Blast Radius Inspector */}
        <div className="ecdat-card" style={{ padding: "1.5rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700, marginBottom: "1rem" }}>
            Blast Radius Inspector
          </div>

          {!selectedNode ? (
            <p style={{ color: "#888", fontStyle: "italic" }}>Select an algorithm node to inspect blast radius.</p>
          ) : (
            <div>
              <div style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #eaeaea" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 800, color: "#181917" }}>
                  {selectedNode.algorithm_canonical}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "4px" }}>
                  Family: {selectedNode.algorithm_family} · Function: {selectedNode.function || "UNSPECIFIED"}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>
                    Quantum Impact
                  </span>
                  <div style={{ marginTop: "4px" }}>
                    {selectedNode.quantum_vulnerable ? (
                      <span className="ecdat-badge ecdat-badge-danger">SHOR VULNERABLE</span>
                    ) : (
                      <span className="ecdat-badge ecdat-badge-success">QUANTUM SAFE</span>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>
                    Affected Repositories
                  </span>
                  <div style={{ fontSize: "0.85rem", color: "#333", marginTop: "4px" }}>
                    {sources.length} active repositories depend on this algorithm
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>
                    Replacement Path
                  </span>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#B95532", marginTop: "4px" }}>
                    {selectedNode.recommendation?.recommended_algo || "NIST FIPS Candidate Mapped"}
                  </div>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <Link
                    href="/prototype/assets"
                    className="ecdat-btn"
                    style={{ width: "100%", textAlign: "center", padding: "0.5rem", fontSize: "0.85rem" }}
                  >
                    View All Occurrences →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
