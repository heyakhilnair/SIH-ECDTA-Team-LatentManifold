"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../lib/api";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import PageHeader from "@/components/PageHeader";
import "../prototype.css";

export default function BlastRadiusPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !userId || !workspace?.id) return;
    setLoading(true);
    api.assets
      .list(workspace.id, getToken)
      .then((res) => {
        const list = (res || []).slice().sort((a: any, b: any) => (b.evidence_count || 0) - (a.evidence_count || 0));
        setAssets(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch((err) => console.error("Failed to load assets for blast radius", err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace]);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    api.assets
      .blastRadiusLite(selectedId, getToken)
      .then(setDetail)
      .catch((err) => console.error("Failed to load blast radius", err))
      .finally(() => setDetailLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Discovery" }, { label: "Blast Radius" }]}
        title="Blast Radius"
        description="How far one algorithm actually reaches — real projects, files, and co-located assets, computed from scan evidence."
      />

      <div
        style={{
          padding: "1rem 1.5rem", backgroundColor: "#faf9f6", border: "1px solid #eaeaea", borderRadius: "8px",
          marginBottom: "1.5rem", fontSize: "0.85rem", color: "#666",
        }}
      >
        <strong style={{ color: "#181917" }}>What this is — and isn&apos;t:</strong> ECDAT doesn&apos;t model
        Applications or Services, so this isn&apos;t a real dependency graph — it&apos;s honest file/project reach,
        computed straight from real scan evidence: which projects and files an algorithm was actually found in, and
        which other algorithms live in those same projects.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.25rem" }}>
        <div className="ecdat-card" style={{ padding: 0, maxHeight: "640px", overflowY: "auto" }}>
          {loading && <div style={{ padding: "1rem", fontSize: "0.85rem", color: "#666" }}>Loading…</div>}
          {!loading && assets.length === 0 && <div style={{ padding: "1rem", fontSize: "0.85rem", color: "#666" }}>No assets discovered yet.</div>}
          {assets.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                padding: "0.65rem 1rem", border: "none", borderBottom: "1px solid #f0f0ed",
                backgroundColor: selectedId === a.id ? "#faf9f6" : "#fff", cursor: "pointer", textAlign: "left",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.85rem", color: "#181917" }}>{a.algorithm_canonical}</span>
              <span style={{ fontSize: "0.75rem", color: "#888" }}>{a.evidence_count} occurrence{a.evidence_count === 1 ? "" : "s"}</span>
            </button>
          ))}
        </div>

        <div className="ecdat-card">
          {detailLoading && <div style={{ fontSize: "0.85rem", color: "#666" }}>Loading blast radius…</div>}
          {!detailLoading && detail && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
                <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", color: "#181917", margin: 0 }}>{detail.algorithm_canonical}</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ padding: "1rem", backgroundColor: "#faf9f6", borderRadius: "8px" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#181917" }}>{detail.project_count}</div>
                  <div style={{ fontSize: "0.78rem", color: "#666" }}>project{detail.project_count === 1 ? "" : "s"}</div>
                </div>
                <div style={{ padding: "1rem", backgroundColor: "#faf9f6", borderRadius: "8px" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#181917" }}>{detail.file_count}</div>
                  <div style={{ fontSize: "0.78rem", color: "#666" }}>file{detail.file_count === 1 ? "" : "s"}</div>
                </div>
                <div style={{ padding: "1rem", backgroundColor: "#faf9f6", borderRadius: "8px" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#181917" }}>{detail.shared_asset_count}</div>
                  <div style={{ fontSize: "0.78rem", color: "#666" }}>co-located algorithm{detail.shared_asset_count === 1 ? "" : "s"}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#181917", marginBottom: "0.5rem" }}>Projects</div>
                  {detail.projects.length === 0 && <div style={{ fontSize: "0.8rem", color: "#999" }}>No attributed project.</div>}
                  {detail.projects.map((p: any) => (
                    <div key={p.id} style={{ fontSize: "0.82rem", padding: "0.35rem 0", borderBottom: "1px solid #f5f5f2" }}>{p.name}</div>
                  ))}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#181917", marginBottom: "0.5rem" }}>
                    Files {detail.file_count > detail.files.length ? `(showing ${detail.files.length} of ${detail.file_count})` : ""}
                  </div>
                  <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                    {detail.files.map((f: string) => (
                      <div key={f} style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#555", padding: "0.3rem 0", borderBottom: "1px solid #f5f5f2" }}>{f}</div>
                    ))}
                  </div>
                </div>
              </div>

              {detail.shared_assets.length > 0 && (
                <div style={{ marginTop: "1.5rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#181917", marginBottom: "0.5rem" }}>
                    Other algorithms in the same project{detail.project_count === 1 ? "" : "s"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {detail.shared_assets.map((sa: any) => (
                      <span
                        key={sa.id}
                        className={`ecdat-badge ${sa.quantum_vulnerable || sa.classical_vulnerable ? "ecdat-badge-danger" : "ecdat-badge-neutral"}`}
                        style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}
                      >
                        {sa.algorithm_canonical}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
