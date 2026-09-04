"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../lib/api";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ProjectFilter from "@/components/ProjectFilter";
import CryptoGraph3D from "@/components/CryptoGraph3D";
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

  // Real blast radius: the widest real cross-project reach any single algorithm
  // actually has, from each asset's own `projects` field (serialize_asset() —
  // the same data the Crypto Assets page's "Found in: 📁 X" badges use). This
  // replaces the old `sources.length` placeholder, which showed the total
  // source count for every single algorithm regardless of where it was
  // actually found — that's what made Blowfish (or anything else selected)
  // always look like it touched every registered repo.
  const maxBlastRadius = useMemo(
    () => assets.reduce((max, a) => Math.max(max, (a.projects || []).length), 0),
    [assets]
  );
  const selectedProjects: string[] = selectedNode?.projects || [];

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
            Widest Blast Radius
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>
            {maxBlastRadius > 0 ? `${maxBlastRadius} Repos` : "0 Repos"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#687563" }}>
            Highest number of projects any single algorithm actually appears in
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
            padding: "1.5rem",
            backgroundColor: "#faf9f6",
            border: "1px solid #eaeaea",
            borderRadius: "8px",
            minHeight: "480px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#888", textTransform: "uppercase" }}>
              Topology Graph // Real Evidence-Backed Connections
            </span>
            <span className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.75rem" }}>
              Drag to rotate · Scroll to zoom · Click a node
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
            <CryptoGraph3D
              sources={sources}
              assets={assets}
              selectedId={selectedNode?.id || null}
              onSelectNode={(asset) => setSelectedNode(asset)}
            />
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
                  {selectedProjects.length === 0 ? (
                    <div style={{ fontSize: "0.85rem", color: "#888", marginTop: "4px", fontStyle: "italic" }}>
                      No project attribution on this evidence yet
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: "0.85rem", color: "#333", marginTop: "4px" }}>
                        {selectedProjects.length} project{selectedProjects.length === 1 ? "" : "s"} actually use this algorithm
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                        {selectedProjects.map((p) => (
                          <span key={p} className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.7rem" }}>
                            📁 {p}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
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
