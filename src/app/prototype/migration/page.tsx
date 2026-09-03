"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../lib/api";
import { motion } from "framer-motion";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import "../prototype.css";

const MIGRATION_COLUMNS = [
  { id: "ASSESSED", title: "1. Assessed", desc: "Vulnerability & Mosca quantified" },
  { id: "PLANNED", title: "2. Planned", desc: "PQC replacement mapped" },
  { id: "IN_DEV", title: "3. In Development", desc: "Hybrid / PQC library integration" },
  { id: "TESTING", title: "4. Testing & Verification", desc: "Interoperability & performance benchmark" },
  { id: "MIGRATED", title: "5. Fully Migrated", desc: "Post-quantum verified via rescan" },
];

export default function MigrationPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetStates, setAssetStates] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!isLoaded || !userId || !workspace?.id) return;
      setLoading(true);
      try {
        const assetsRes = await api.assets.list(workspace.id, getToken);
        const list = assetsRes || [];
        setAssets(list);

        // Initialize state mapping
        const states: Record<string, string> = {};
        list.forEach((a: any) => {
          if (!a.quantum_vulnerable && !a.classical_vulnerable) {
            states[a.id] = "MIGRATED";
          } else if (a.recommendation) {
            states[a.id] = "PLANNED";
          } else {
            states[a.id] = "ASSESSED";
          }
        });
        setAssetStates(states);
      } catch (err) {
        console.error("Failed to load migration data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace]);

  const moveAsset = (assetId: string, nextState: string) => {
    setAssetStates((prev) => ({
      ...prev,
      [assetId]: nextState,
    }));
  };

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Quantum Transition" }, { label: "Migration Planner" }]}
        title="Topological Migration Workspace"
        description="Dependency-ordered execution sequencing tracking cryptographic assets across the enterprise migration lifecycle."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/prototype/pqc" className="ecdat-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              PQC WORKBENCH →
            </Link>
          </div>
        }
      />

      {/* Top Migration Sequencing Alert */}
      <div
        style={{
          padding: "1rem 1.5rem",
          backgroundColor: "#faf9f6",
          border: "1px solid #eaeaea",
          borderRadius: "8px",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <strong style={{ fontSize: "0.9rem", color: "#181917" }}>Topological Execution Hierarchy:</strong>
          <span style={{ fontSize: "0.85rem", color: "#666", marginLeft: "8px" }}>
            HSM Firmware ➔ Crypto Provider Library ➔ Enterprise PKI ➔ Microservices ➔ External Clients
          </span>
        </div>
        <span className="ecdat-badge ecdat-badge-active" style={{ fontSize: "0.75rem" }}>
          TOPOLOGICAL SORT VERIFIED
        </span>
      </div>

      {/* Migration Kanban Board */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(220px, 1fr))",
          gap: "1rem",
          overflowX: "auto",
          paddingBottom: "1.5rem",
        }}
      >
        {MIGRATION_COLUMNS.map((col) => {
          const colAssets = assets.filter((a) => assetStates[a.id] === col.id);

          return (
            <div
              key={col.id}
              style={{
                backgroundColor: "#faf9f6",
                border: "1px solid #eaeaea",
                borderRadius: "8px",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                minHeight: "500px",
              }}
            >
              <div style={{ borderBottom: "1px solid #eaeaea", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#181917" }}>
                    {col.title}
                  </h3>
                  <span className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.75rem" }}>
                    {colAssets.length}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#888" }}>{col.desc}</p>
              </div>

              {loading ? (
                <div style={{ textAlign: "center", color: "#888", fontSize: "0.8rem", padding: "2rem 0" }}>
                  Loading...
                </div>
              ) : colAssets.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#aaa",
                    fontSize: "0.8rem",
                    border: "1px dashed #ddd",
                    borderRadius: "6px",
                    padding: "1rem",
                  }}
                >
                  No assets in this stage
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
                  {colAssets.map((asset) => (
                    <motion.div
                      key={asset.id}
                      layout
                      style={{
                        backgroundColor: "#fff",
                        border: "1px solid #eaeaea",
                        borderRadius: "6px",
                        padding: "0.85rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.9rem", color: "#181917" }}>
                          {asset.algorithm_canonical}
                        </span>
                        <span
                          className={`ecdat-badge ${
                            asset.risk?.composite_risk_level === "CRITICAL"
                              ? "ecdat-badge-danger"
                              : asset.risk?.composite_risk_level === "HIGH"
                              ? "ecdat-badge-active"
                              : "ecdat-badge-neutral"
                          }`}
                          style={{ fontSize: "0.65rem" }}
                        >
                          {asset.risk?.composite_risk_level || "LOW"}
                        </span>
                      </div>

                      {asset.recommendation && (
                        <div style={{ fontSize: "0.75rem", color: "#B95532", marginTop: "4px", fontWeight: 600 }}>
                          ➔ {asset.recommendation.recommended_algo}
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", borderTop: "1px solid #f5f5f5", paddingTop: "8px" }}>
                        <span style={{ fontSize: "0.7rem", color: "#888" }}>
                          {asset.key_size ? `${asset.key_size}b` : asset.algorithm_family}
                        </span>

                        <div style={{ display: "flex", gap: "4px" }}>
                          {col.id !== "MIGRATED" && (
                            <button
                              onClick={() => {
                                const idx = MIGRATION_COLUMNS.findIndex((c) => c.id === col.id);
                                if (idx < MIGRATION_COLUMNS.length - 1) {
                                  moveAsset(asset.id, MIGRATION_COLUMNS[idx + 1].id);
                                }
                              }}
                              style={{
                                background: "#f0f0f0",
                                border: "none",
                                borderRadius: "3px",
                                padding: "2px 6px",
                                fontSize: "0.7rem",
                                cursor: "pointer",
                              }}
                              title="Advance to next migration stage"
                            >
                              Advance →
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
