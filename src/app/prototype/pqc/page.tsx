"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../lib/api";
import { motion } from "framer-motion";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import "../prototype.css";

export default function PqcPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<string>("ALL");

  const loadRecommendations = async () => {
    if (!isLoaded || !userId || !workspace?.id) return;
    setLoading(true);
    try {
      const data = await api.recommendations.list(workspace.id, getToken);
      setRecommendations(data || []);
    } catch (err) {
      console.error("Failed to load recommendations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [isLoaded, userId, getToken, workspace]);

  const handleGenerate = async () => {
    if (!workspace?.id) return;
    setGenerating(true);
    try {
      await api.recommendations.generate(workspace.id, getToken);
      await loadRecommendations();
    } catch (err) {
      console.error("Failed to generate recommendations", err);
    } finally {
      setGenerating(false);
    }
  };

  const filtered = recommendations.filter((r) => {
    if (selectedFamily === "ALL") return true;
    if (selectedFamily === "FIPS-203") return r.nist_standard === "FIPS 203";
    if (selectedFamily === "FIPS-204") return r.nist_standard === "FIPS 204";
    if (selectedFamily === "CLASSICAL") return r.nist_standard === "FIPS 180-4" || r.nist_standard === "FIPS 197";
    return true;
  });

  const fips203Count = recommendations.filter((r) => r.nist_standard === "FIPS 203").length;
  const fips204Count = recommendations.filter((r) => r.nist_standard === "FIPS 204").length;
  const classicalUpgradeCount = recommendations.filter((r) => r.nist_standard !== "FIPS 203" && r.nist_standard !== "FIPS 204").length;

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Quantum Transition" }, { label: "PQC Workbench" }]}
        title="Post-Quantum Cryptography (PQC) Workbench"
        description="NIST FIPS 203, 204, and 205 cryptographic migration recommendations with constraint-aware trade-off analysis."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="ecdat-btn"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                backgroundColor: "var(--color-primary)",
                color: "white",
              }}
            >
              {generating ? "Evaluating Algorithms..." : "Regenerate Recommendations ↻"}
            </button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
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
            Total Recommendations
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>
            {recommendations.length}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#687563" }}>
            Prepared migration candidates
          </div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #B95532" }}>
          <div style={{ fontSize: "0.75rem", color: "#B95532", textTransform: "uppercase", fontWeight: 700 }}>
            FIPS 203: ML-KEM
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>
            {fips203Count}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>
            Key Encapsulation Mechanisms
          </div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #C2410C" }}>
          <div style={{ fontSize: "0.75rem", color: "#C2410C", textTransform: "uppercase", fontWeight: 700 }}>
            FIPS 204: ML-DSA
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>
            {fips204Count}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>
            Digital Signature Algorithms
          </div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #15803D" }}>
          <div style={{ fontSize: "0.75rem", color: "#15803D", textTransform: "uppercase", fontWeight: 700 }}>
            Classical Upgrades
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>
            {classicalUpgradeCount}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>
            SHA-256 & AES-256-GCM Upgrades
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "1.5rem",
          padding: "0.75rem 1rem",
          backgroundColor: "#fff",
          border: "1px solid #eaeaea",
          borderRadius: "8px",
        }}
      >
        {[
          { key: "ALL", label: `All Candidates (${recommendations.length})` },
          { key: "FIPS-203", label: `ML-KEM Key Exchange (${fips203Count})` },
          { key: "FIPS-204", label: `ML-DSA Signatures (${fips204Count})` },
          { key: "CLASSICAL", label: `Classical Upgrades (${classicalUpgradeCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedFamily(tab.key)}
            className={`ecdat-btn ${selectedFamily === tab.key ? "ecdat-btn-primary" : ""}`}
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.8rem",
              borderRadius: "20px",
              backgroundColor: selectedFamily === tab.key ? "var(--color-primary)" : "#f5f5f5",
              color: selectedFamily === tab.key ? "#fff" : "#333",
              border: "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Recommendations Cards List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#888" }}>
          Loading PQC migration candidates...
        </div>
      ) : filtered.length === 0 ? (
        <div className="ecdat-card" style={{ textAlign: "center", padding: "4rem" }}>
          <h3 style={{ margin: "0 0 8px" }}>No Recommendations Found</h3>
          <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Run a discovery scan or click below to analyze discovered assets.
          </p>
          <button onClick={handleGenerate} className="ecdat-btn" style={{ padding: "0.5rem 1rem" }}>
            Generate Recommendations Now
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {filtered.map((rec) => {
            const reasoning = rec.reasoning || {};
            const hardConstraints = reasoning.hard_constraints || {};
            const softConstraints = reasoning.soft_constraints || {};
            const alternatives = reasoning.alternatives || [];

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="ecdat-card"
                style={{ padding: 0, overflow: "hidden" }}
              >
                {/* Card Header */}
                <div
                  style={{
                    padding: "1.25rem 1.75rem",
                    borderBottom: "1px solid #eaeaea",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#faf9f6",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        fontSize: "1.1rem",
                        color: "#B91C1C",
                      }}
                    >
                      {rec.current_algo}
                    </span>
                    <span style={{ color: "#888", fontSize: "1.1rem" }}>➔</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        fontSize: "1.15rem",
                        color: "#181917",
                      }}
                    >
                      {rec.recommended_algo}
                    </span>
                    <span className="ecdat-badge ecdat-badge-success" style={{ fontSize: "0.75rem" }}>
                      {rec.nist_standard}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.75rem" }}>
                      Complexity: {rec.migration_complexity}
                    </span>
                    <span className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.75rem" }}>
                      Confidence: {((rec.confidence || 0.95) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: "1.5rem 1.75rem" }}>
                  <p style={{ fontSize: "0.9rem", color: "#333", marginTop: 0, marginBottom: "1rem" }}>
                    {reasoning.explanation}
                  </p>

                  {/* Hybrid & Fallback Path */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: "1rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    {rec.hybrid_path && (
                      <div
                        style={{
                          padding: "0.85rem 1rem",
                          backgroundColor: "#f5fbf7",
                          border: "1px solid #d1fae5",
                          borderRadius: "6px",
                        }}
                      >
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#065f46", textTransform: "uppercase" }}>
                          Hybrid Transition Path (Recommended)
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#047857", marginTop: "4px" }}>
                          {rec.hybrid_path}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#065f46", marginTop: "4px" }}>
                          Maintains classical cryptographic compliance while introducing quantum resistance.
                        </div>
                      </div>
                    )}

                    {reasoning.fallback && (
                      <div
                        style={{
                          padding: "0.85rem 1rem",
                          backgroundColor: "#fffdfa",
                          border: "1px solid #fef3c7",
                          borderRadius: "6px",
                        }}
                      >
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>
                          Fallback Candidate
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#b45309", marginTop: "4px" }}>
                          {reasoning.fallback}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#92400e", marginTop: "4px" }}>
                          Non-lattice fallback if quantum assumptions undergo revisions.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Constraints Section */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1.25rem",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <div style={{ padding: "0.85rem", backgroundColor: "#faf9f6", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#687563", textTransform: "uppercase", marginBottom: "6px" }}>
                        Hard Constraints (Compliance & HSM)
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.8rem", color: "#555", lineHeight: 1.5 }}>
                        <li>{hardConstraints.regulatory_compliance || "Standard NIST compliant"}</li>
                        <li>{hardConstraints.hsm_compatibility || "Standard HSM / KMS migration"}</li>
                        {hardConstraints.client_interoperability && <li>{hardConstraints.client_interoperability}</li>}
                      </ul>
                    </div>

                    <div style={{ padding: "0.85rem", backgroundColor: "#faf9f6", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#687563", textTransform: "uppercase", marginBottom: "6px" }}>
                        Soft Constraints (Bandwidth & Key Sizes)
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.8rem", color: "#555", lineHeight: 1.5 }}>
                        {softConstraints.key_size_bytes && <li>Public Key: {softConstraints.key_size_bytes} Bytes</li>}
                        {softConstraints.ciphertext_size_bytes && <li>Ciphertext: {softConstraints.ciphertext_size_bytes} Bytes</li>}
                        {softConstraints.signature_size_bytes && <li>Signature Size: {softConstraints.signature_size_bytes} Bytes</li>}
                        {softConstraints.bandwidth_overhead && <li>Bandwidth Overhead: {softConstraints.bandwidth_overhead}</li>}
                      </ul>
                    </div>
                  </div>

                  {/* Alternatives Table */}
                  {alternatives.length > 0 && (
                    <div style={{ borderTop: "1px solid #eaeaea", paddingTop: "1rem" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: "8px" }}>
                        Candidate Evaluation & Rejection Trade-Offs
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {alternatives.map((alt: any, aIdx: number) => (
                          <div
                            key={aIdx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "0.4rem 0.6rem",
                              backgroundColor: alt.status === "PRIMARY" ? "#faf9f6" : "#fff",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                            }}
                          >
                            <div>
                              <strong style={{ fontFamily: "var(--font-mono)", marginRight: "8px" }}>
                                {alt.algorithm}
                              </strong>
                              <span style={{ color: "#666" }}>{alt.rationale}</span>
                            </div>
                            <span
                              className={`ecdat-badge ${
                                alt.status === "PRIMARY"
                                  ? "ecdat-badge-success"
                                  : alt.status === "ALTERNATIVE"
                                  ? "ecdat-badge-neutral"
                                  : "ecdat-badge-danger"
                              }`}
                              style={{ fontSize: "0.7rem" }}
                            >
                              {alt.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
