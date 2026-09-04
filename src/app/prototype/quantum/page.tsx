"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../lib/api";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import "../prototype.css";

function AssetChip({ a }: { a: any }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0.5rem 0.75rem", borderBottom: "1px solid #f0f0ed", fontSize: "0.85rem",
      }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#181917" }}>{a.algorithm_canonical}</span>
      <span style={{ color: "#888", fontSize: "0.78rem" }}>{a.algorithm_family}</span>
    </div>
  );
}

function Bucket({ title, subtitle, color, bg, data }: { title: string; subtitle: string; color: string; bg: string; data: { count: number; assets: any[] } | undefined }) {
  return (
    <div className="ecdat-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "1.25rem 1.25rem 1rem", backgroundColor: bg }}>
        <div style={{ fontSize: "2rem", fontWeight: 700, color }}>{data?.count ?? "…"}</div>
        <div style={{ fontWeight: 700, color: "#181917", marginTop: "0.25rem" }}>{title}</div>
        <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.2rem" }}>{subtitle}</div>
      </div>
      <div style={{ maxHeight: "360px", overflowY: "auto" }}>
        {data?.assets?.length ? (
          data.assets.map((a) => <AssetChip key={a.id} a={a} />)
        ) : (
          <div style={{ padding: "1rem", fontSize: "0.8rem", color: "#999" }}>{data ? "None in this workspace." : "Loading…"}</div>
        )}
      </div>
    </div>
  );
}

export default function QuantumPosturePage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();
  const [posture, setPosture] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !userId || !workspace?.id) return;
    setLoading(true);
    api.workspace
      .quantumPosture(workspace.id, getToken)
      .then(setPosture)
      .catch((err) => console.error("Failed to load quantum posture", err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace]);

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Quantum Transition" }, { label: "Quantum Posture" }]}
        title="Quantum Posture"
        description="Enterprise-wide stratification: Shor-vulnerable (needs asymmetric replacement) vs. Grover-weakened (needs symmetric key doubling) vs. already safe."
        actions={
          <Link href="/prototype/risk" className="ecdat-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            RISK & EXPOSURE →
          </Link>
        }
      />

      <div
        style={{
          padding: "1rem 1.5rem", backgroundColor: "#faf9f6", border: "1px solid #eaeaea", borderRadius: "8px",
          marginBottom: "1.5rem", fontSize: "0.85rem", color: "#666",
        }}
      >
        <strong style={{ color: "#181917" }}>How this is computed:</strong> Shor-vulnerable comes straight from
        each asset&apos;s real classification (asymmetric algorithms — RSA, ECDSA, ECDH, DSA — fundamentally broken
        by Shor&apos;s algorithm on a cryptographically relevant quantum computer). Grover-weakened flags symmetric
        algorithms whose effective security is halved by Grover&apos;s algorithm (today: AES-128 → ~64-bit). Every
        other asset is quantum-safe as far as ECDAT can tell. This is not a separate score — it's the same{" "}
        {loading ? "…" : posture?.total_assets ?? 0} assets, one 3-way split.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        <Bucket
          title="Shor-Vulnerable"
          subtitle="Asymmetric — needs a PQC replacement (ML-KEM / ML-DSA)"
          color="#B91C1C"
          bg="#FEE2E2"
          data={posture?.shor_vulnerable}
        />
        <Bucket
          title="Grover-Weakened"
          subtitle="Symmetric — needs a key-size doubling, not a new algorithm"
          color="#C2410C"
          bg="#FFEDD5"
          data={posture?.grover_weakened}
        />
        <Bucket
          title="Quantum-Safe"
          subtitle="No known Shor or Grover exposure"
          color="#15803D"
          bg="#DCFCE7"
          data={posture?.safe}
        />
      </div>
    </div>
  );
}
