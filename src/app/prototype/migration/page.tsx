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

// Concrete, actionable per-stage guidance — not just a label. Each `next`
// line is the literal condition for dragging a card to the next column, so
// a first-time user knows exactly what "done" means at every step.
const MIGRATION_COLUMNS = [
  {
    id: "ASSESSED",
    title: "1. Assessed",
    desc: "ECDAT found this algorithm and computed its real quantum/classical risk.",
    next: "Open the card, review the risk, then advance once you're ready to plan a replacement.",
  },
  {
    id: "PLANNED",
    title: "2. Planned",
    desc: "A NIST-standard replacement algorithm is already picked below.",
    next: "Open the card for the exact file locations to change, then advance once you start implementing.",
  },
  {
    id: "IN_DEV",
    title: "3. In Development",
    desc: "You're replacing the algorithm in code, at the file locations shown on the card.",
    next: "Advance once the code change is merged and ready to verify.",
  },
  {
    id: "TESTING",
    title: "4. Testing & Verification",
    desc: "Confirm the new algorithm works end-to-end (interop, performance) before rollout.",
    next: "Re-run a discovery scan on this project — advance once it stops finding the old algorithm.",
  },
  {
    id: "MIGRATED",
    title: "5. Fully Migrated",
    desc: "You've made the change and confirmed it. ECDAT never edits code or marks this for you — you drag a card here yourself once you're done.",
    next: null,
  },
];

export default function MigrationPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();
  const searchParams = useSearchParams();

  const [assets, setAssets] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [sourceId, setSourceId] = useState(() => searchParams?.get("source") || "");
  const [loading, setLoading] = useState(true);
  const [assetStates, setAssetStates] = useState<Record<string, string>>({});
  const [alreadySafeCount, setAlreadySafeCount] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"guide" | "evidence" | "risk">("guide");

  useEffect(() => {
    const loadData = async () => {
      if (!isLoaded || !userId || !workspace?.id) return;
      setLoading(true);
      try {
        const [assetsRes, sourcesRes] = await Promise.all([
          api.assets.list(workspace.id, getToken, sourceId ? { source_id: sourceId } : undefined),
          api.sources.list(workspace.id, getToken).catch(() => []),
        ]);
        setSources(sourcesRes || []);
        const allAssets = assetsRes || [];
        // Only at-risk findings belong on a *migration* board — an asset
        // that was never quantum- or classically-vulnerable was never
        // migrated, it was just always safe, so auto-dropping it into
        // "Fully Migrated" falsely implied ECDAT (or the user) had done
        // work on it. Those get a plain count below the board instead.
        const list = allAssets.filter((a: any) => a.quantum_vulnerable || a.classical_vulnerable);
        setAssets(list);
        setAlreadySafeCount(allAssets.length - list.length);

        // Initial stage is only ever ASSESSED or PLANNED — "Fully Migrated"
        // is reachable only by the user's own "Advance" action, never
        // auto-assigned, so it only ever means "I did this and confirmed it."
        setAssetStates((prev) => {
          const states: Record<string, string> = {};
          list.forEach((a: any) => {
            // Preserve any in-progress stage the user already set this
            // session; only assign a fresh default for assets seen for the
            // first time (e.g. after switching project scope).
            states[a.id] = prev[a.id] || (a.recommendation ? "PLANNED" : "ASSESSED");
          });
          return states;
        });
      } catch (err) {
        console.error("Failed to load migration data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace, sourceId]);

  const moveAsset = (assetId: string, nextState: string) => {
    setAssetStates((prev) => ({
      ...prev,
      [assetId]: nextState,
    }));
  };

  const openGuide = async (asset: any) => {
    setSelectedAsset(asset);
    setDrawerTab("guide");
    setDrawerLoading(true);
    try {
      const detail = await api.assets.get(asset.id, getToken);
      setSelectedAsset(detail);
    } catch (err) {
      console.error("Failed to fetch migration guide detail", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const migratedCount = assets.filter((a) => assetStates[a.id] === "MIGRATED").length;
  const remainingCount = assets.length - migratedCount;

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Quantum Transition" }, { label: "Migration Planner" }]}
        title="Migration Planner"
        description="Track every cryptographic finding through to a quantum-safe replacement — one board, five concrete stages."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <ProjectFilter sources={sources} value={sourceId} onChange={setSourceId} />
            <Link href="/prototype/pqc" className="ecdat-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              PQC WORKBENCH →
            </Link>
          </div>
        }
      />

      {/* How this works — concrete, not decorative */}
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
          <strong style={{ fontSize: "0.9rem", color: "#181917" }}>How this works:</strong>
          <span style={{ fontSize: "0.85rem", color: "#666", marginLeft: "8px" }}>
            Each card below is one algorithm ECDAT found in your code that's actually at risk — safe algorithms
            aren't shown, there's nothing to migrate. Click a card for the exact file locations to change and the
            recommended replacement. Drag it through the 5 stages <strong>as you make the change yourself</strong> —
            ECDAT only remembers what column you dragged it to (in this browser); it never edits your code, and
            "Fully Migrated" only ever means you put it there.
          </span>
        </div>
        <span className="ecdat-badge ecdat-badge-active" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
          {loading ? "…" : `${remainingCount} remaining · ${migratedCount} migrated`}
        </span>
      </div>

      {!loading && alreadySafeCount > 0 && (
        <div style={{ marginBottom: "1.5rem", fontSize: "0.8rem", color: "#15803D" }}>
          ✓ {alreadySafeCount} other asset{alreadySafeCount === 1 ? "" : "s"} {alreadySafeCount === 1 ? "is" : "are"} already quantum-safe and not shown here — see{" "}
          <Link href="/prototype/assets" style={{ color: "#15803D", fontWeight: 600 }}>Crypto Assets</Link>.
        </div>
      )}

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
                <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#666", lineHeight: 1.4 }}>{col.desc}</p>
                {col.next && (
                  <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: "#B95532", lineHeight: 1.4, fontWeight: 600 }}>
                    ✓ {col.next}
                  </p>
                )}
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
                      onClick={() => openGuide(asset)}
                      style={{
                        backgroundColor: "#fff",
                        border: "1px solid #eaeaea",
                        borderRadius: "6px",
                        padding: "0.85rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        cursor: "pointer",
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
                          {asset.recommendation.nist_standard && (
                            <span style={{ color: "#888", fontWeight: 400 }}> ({asset.recommendation.nist_standard})</span>
                          )}
                        </div>
                      )}

                      <div style={{ fontSize: "0.7rem", color: "#888", marginTop: "6px" }}>
                        📁 {asset.evidence_count ?? 0} location{asset.evidence_count === 1 ? "" : "s"} to change
                        {asset.recommendation?.migration_complexity && (
                          <> · complexity: {asset.recommendation.migration_complexity}</>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", borderTop: "1px solid #f5f5f5", paddingTop: "8px" }}>
                        <span style={{ fontSize: "0.7rem", color: "#888" }}>
                          {asset.key_size ? `${asset.key_size}b` : asset.algorithm_family}
                        </span>

                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); openGuide(asset); }}
                            style={{
                              background: "none",
                              border: "1px solid #ddd",
                              borderRadius: "3px",
                              padding: "2px 6px",
                              fontSize: "0.7rem",
                              cursor: "pointer",
                              color: "#666",
                            }}
                          >
                            Guide
                          </button>
                          {col.id !== "MIGRATED" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
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

      {/* Concrete Migration Guide Drawer */}
      <AnimatePresence>
        {selectedAsset && (
          <div
            style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1000,
              display: "flex", justifyContent: "flex-end",
            }}
            onClick={() => setSelectedAsset(null)}
          >
            <motion.div
              initial={{ x: 500, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 500, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                width: "100%", maxWidth: "640px", height: "100%",
                backgroundColor: "#fff", display: "flex", flexDirection: "column",
                boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid #eaeaea", backgroundColor: "#faf9f6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", fontWeight: 800, color: "#181917" }}>
                        {selectedAsset.algorithm_canonical}
                      </span>
                      <span className={`ecdat-badge ${selectedAsset.risk?.composite_risk_level === "CRITICAL" ? "ecdat-badge-danger" : "ecdat-badge-active"}`}>
                        {selectedAsset.risk?.composite_risk_level || "ASSESSED"}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "#666", margin: 0 }}>Concrete migration guide for this finding</p>
                  </div>
                  <button onClick={() => setSelectedAsset(null)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#888" }}>✕</button>
                </div>
              </div>

              <div style={{ display: "flex", borderBottom: "1px solid #eaeaea", padding: "0 2rem" }}>
                {(["guide", "evidence", "risk"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDrawerTab(tab)}
                    style={{
                      padding: "0.85rem 1.25rem", border: "none",
                      borderBottom: drawerTab === tab ? "2px solid #B95532" : "2px solid transparent",
                      background: "none", fontWeight: 700, fontSize: "0.85rem",
                      color: drawerTab === tab ? "#B95532" : "#666", cursor: "pointer",
                    }}
                  >
                    {tab === "guide" ? "Migration Guide" : tab === "evidence" ? `Where to Change (${selectedAsset.evidence?.length ?? selectedAsset.evidence_count ?? 0})` : "Risk Detail"}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "1.75rem 2rem" }}>
                {drawerLoading ? (
                  <p style={{ textAlign: "center", color: "#888" }}>Loading migration guide...</p>
                ) : drawerTab === "guide" ? (
                  <div>
                    {!selectedAsset.recommendation ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "#15803D" }}>
                        <h4 style={{ margin: "0 0 8px" }}>No Replacement Needed</h4>
                        <p style={{ fontSize: "0.85rem", color: "#666" }}>Already quantum-safe and classically secure.</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ padding: "1.25rem", backgroundColor: "#faf9f6", border: "1px solid #eaeaea", borderRadius: "6px", marginBottom: "1rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "#B95532", fontWeight: 700, textTransform: "uppercase" }}>Step 1 — Replace with</span>
                          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>
                            {selectedAsset.recommendation.recommended_algo}
                          </div>
                          <span className="ecdat-badge ecdat-badge-success" style={{ fontSize: "0.75rem" }}>{selectedAsset.recommendation.nist_standard}</span>
                          <p style={{ fontSize: "0.85rem", color: "#555", marginTop: "8px" }}>{selectedAsset.recommendation.reasoning?.explanation}</p>
                        </div>
                        {selectedAsset.recommendation.hybrid_path && (
                          <div style={{ padding: "1rem", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "6px", marginBottom: "1rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "#687563", fontWeight: 700, textTransform: "uppercase" }}>Or, for a safer rollout — Hybrid Path</span>
                            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#181917", margin: "4px 0" }}>{selectedAsset.recommendation.hybrid_path}</div>
                            <p style={{ fontSize: "0.8rem", color: "#666", margin: 0 }}>Runs the classical and post-quantum algorithm side by side during rollout, so nothing breaks if either has an issue.</p>
                          </div>
                        )}
                        <div style={{ padding: "1rem", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "6px", marginBottom: "1rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: 700, textTransform: "uppercase" }}>Step 2 — Update these {selectedAsset.evidence?.length ?? selectedAsset.evidence_count ?? 0} location(s) in your code</span>
                          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            {(selectedAsset.evidence || []).slice(0, 5).map((ev: any) => (
                              <div key={ev.id} style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#181917", backgroundColor: "#faf9f6", padding: "0.4rem 0.6rem", borderRadius: "4px" }}>
                                {ev.file_path || "source file"}{ev.line_number ? `:${ev.line_number}` : ""}
                              </div>
                            ))}
                            {(!selectedAsset.evidence || selectedAsset.evidence.length === 0) && (
                              <p style={{ fontSize: "0.8rem", color: "#888", fontStyle: "italic" }}>No file locations recorded for this finding.</p>
                            )}
                          </div>
                        </div>
                        <div style={{ padding: "1rem", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "6px" }}>
                          <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: 700, textTransform: "uppercase" }}>Step 3 — Verify</span>
                          <p style={{ fontSize: "0.85rem", color: "#555", margin: "6px 0 0" }}>
                            Re-run a discovery scan on this project. Once ECDAT stops finding {selectedAsset.algorithm_canonical} at these locations, mark this card Migrated.
                          </p>
                          <div style={{ display: "flex", gap: "1.5rem", marginTop: "10px" }}>
                            <div>
                              <span style={{ fontSize: "0.75rem", color: "#666" }}>Complexity</span>
                              <div style={{ fontWeight: 700 }}>{selectedAsset.recommendation.migration_complexity || "UNKNOWN"}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: "0.75rem", color: "#666" }}>Confidence</span>
                              <div style={{ fontWeight: 700 }}>{((selectedAsset.recommendation.confidence || 0.95) * 100).toFixed(0)}%</div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : drawerTab === "evidence" ? (
                  <div>
                    {!selectedAsset.evidence || selectedAsset.evidence.length === 0 ? (
                      <p style={{ color: "#888", fontStyle: "italic" }}>No evidence occurrences linked.</p>
                    ) : (
                      selectedAsset.evidence.map((ev: any) => (
                        <div key={ev.id} style={{ border: "1px solid #eaeaea", borderRadius: "6px", padding: "1rem", marginBottom: "1rem", backgroundColor: "#faf9f6" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#181917" }}>
                              {ev.file_path || "source file"} : Line {ev.line_number || "—"}
                            </span>
                            <span className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.75rem" }}>
                              {ev.detector} ({(ev.confidence * 100).toFixed(0)}% conf)
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "1rem" }}>
                    <div style={{ padding: "1rem", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>Quantum Threat</div>
                      <p style={{ fontSize: "0.85rem", color: "#555", margin: "4px 0 0" }}>{selectedAsset.risk?.quantum_reason || "—"}</p>
                    </div>
                    <div style={{ padding: "1rem", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>Classical Risk</div>
                      <p style={{ fontSize: "0.85rem", color: "#555", margin: "4px 0 0" }}>{selectedAsset.risk?.classical_reason || "—"}</p>
                    </div>
                    <div style={{ padding: "1rem", backgroundColor: "#faf9f6", border: "1px solid #eaeaea", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>Mosca Inequality (X + Y &gt; Z)</div>
                      <p style={{ fontSize: "0.85rem", color: "#555", margin: "6px 0 0" }}>
                        {selectedAsset.risk?.mosca_threshold_exceeded
                          ? "CRITICAL: Harvest-Now-Decrypt-Later window is open. Immediate migration required."
                          : "Within acceptable safety margin for planned migration."}
                      </p>
                    </div>
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
