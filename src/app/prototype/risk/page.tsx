"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import "../prototype.css";

export default function RiskPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();

  const [riskSummary, setRiskSummary] = useState<any>({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    SAFE: 0,
    total: 0,
  });
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mosca Scenario setting
  const [threatHorizon, setThreatHorizon] = useState<number>(12); // years (Z)

  // Recalculator Modal State
  const [selectedRisk, setSelectedRisk] = useState<any | null>(null);
  const [customLifetime, setCustomLifetime] = useState<number>(7);
  const [customCriticality, setCustomCriticality] = useState<string>("HIGH");
  const [customHorizon, setCustomHorizon] = useState<number>(12);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<any | null>(null);

  const loadRiskData = async () => {
    if (!isLoaded || !userId || !workspace?.id) return;
    setLoading(true);
    try {
      const [summaryRes, listRes] = await Promise.all([
        api.risk.summary(workspace.id, getToken).catch(() => ({})),
        api.risk.list(workspace.id, getToken).catch(() => []),
      ]);
      setRiskSummary(summaryRes || {});
      setRisks(listRes || []);
    } catch (err) {
      console.error("Failed to load risk data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiskData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace]);

  const openRecalculator = (riskItem: any) => {
    setSelectedRisk(riskItem);
    setCustomLifetime(riskItem.data_lifetime_years || 7);
    setCustomCriticality(riskItem.business_criticality || "HIGH");
    setCustomHorizon(threatHorizon);
    setRecalcResult(null);
  };

  const handleRecalculate = async () => {
    if (!selectedRisk?.asset_id) return;
    setRecalculating(true);
    try {
      const result = await api.risk.recalculate(
        selectedRisk.asset_id,
        {
          data_lifetime_years: Number(customLifetime),
          business_criticality: customCriticality,
          threat_horizon_years: Number(customHorizon),
        },
        getToken
      );
      setRecalcResult(result);
      await loadRiskData();
    } catch (err: any) {
      console.error("Recalculation error", err);
    } finally {
      setRecalculating(false);
    }
  };

  const total = riskSummary.total || risks.length;
  const critical = riskSummary.CRITICAL || 0;
  const high = riskSummary.HIGH || 0;
  const medium = riskSummary.MEDIUM || 0;
  const low = riskSummary.LOW || 0;
  const safe = riskSummary.SAFE || 0;

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Intelligence" }, { label: "Quantum Risk & Mosca" }]}
        title="Quantum Risk Workbench"
        description="Multi-dimensional risk assessment evaluating Shor vulnerability, classical deprecation, and Mosca's Inequality (X + Y > Z)."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.85rem", color: "#666" }}>Threat Horizon (Z):</span>
            <select
              value={threatHorizon}
              onChange={(e) => setThreatHorizon(Number(e.target.value))}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #ddd",
                fontSize: "0.85rem",
                backgroundColor: "#fff",
              }}
            >
              <option value={8}>Aggressive (Z = 8y / 2034)</option>
              <option value={12}>Moderate (Z = 12y / 2038)</option>
              <option value={15}>Conservative (Z = 15y / 2041)</option>
            </select>
          </div>
        }
      />

      {/* Mosca Visualizer Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          backgroundColor: "#fff",
          border: "1px solid #eaeaea",
          borderRadius: "8px",
          padding: "1.5rem 2rem",
          marginBottom: "2rem",
          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#181917" }}>
              Mosca's Inequality Status: $X + Y &gt; Z$
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#666", margin: "4px 0 0" }}>
              If Data Lifetime ($X$) plus Migration Time ($Y$) exceeds CRQC Arrival Horizon ($Z$), the Harvest-Now-Decrypt-Later window is active.
            </p>
          </div>
          <span
            className={`ecdat-badge ${critical > 0 ? "ecdat-badge-danger" : "ecdat-badge-success"}`}
            style={{ fontSize: "0.85rem" }}
          >
            {critical > 0 ? "HNDL WINDOW OPEN" : "MIGRATION ON TRACK"}
          </span>
        </div>

        {/* Timeline Visualization Bar */}
        <div style={{ margin: "1.5rem 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#888", marginBottom: "6px" }}>
            <span>Today (2026)</span>
            <span>Est. Migration Horizon: ~2029</span>
            <span>Threat Horizon Z ({threatHorizon}y): ~{2026 + threatHorizon}</span>
          </div>
          <div style={{ height: "14px", backgroundColor: "#f0f0f0", borderRadius: "7px", overflow: "hidden", display: "flex" }}>
            <div style={{ width: "25%", backgroundColor: "#B95532" }} title="Migration Period Y (~3 yrs)"></div>
            <div style={{ width: "50%", backgroundColor: "#EAB308" }} title="Protected Data Lifetime X (~7 yrs)"></div>
            <div style={{ width: "25%", backgroundColor: "#15803D" }} title="Residual Safety Margin"></div>
          </div>
          <div style={{ display: "flex", gap: "2rem", marginTop: "8px", fontSize: "0.75rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", backgroundColor: "#B95532", borderRadius: "2px" }}></span>
              Migration Time Y (avg 2-3y)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", backgroundColor: "#EAB308", borderRadius: "2px" }}></span>
              Data Lifetime X (avg 5-10y)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", backgroundColor: "#15803D", borderRadius: "2px" }}></span>
              Safety Margin
            </span>
          </div>
        </div>
      </motion.div>

      {/* 5 Risk Level Breakdown Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #B91C1C" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#B91C1C", textTransform: "uppercase" }}>
            CRITICAL
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>{critical}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>
            {total > 0 ? `${Math.round((critical / total) * 100)}% of perimeter` : "0%"}
          </div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #C2410C" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#C2410C", textTransform: "uppercase" }}>
            HIGH
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>{high}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>
            {total > 0 ? `${Math.round((high / total) * 100)}% of perimeter` : "0%"}
          </div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #D97706" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#D97706", textTransform: "uppercase" }}>
            MEDIUM
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>{medium}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>Plan migration</div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #4B5563" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4B5563", textTransform: "uppercase" }}>
            LOW
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>{low}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>Monitor timeline</div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #15803D" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#15803D", textTransform: "uppercase" }}>
            SAFE / PQC
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>{safe}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>Quantum Resistant</div>
        </div>
      </div>

      {/* Prioritized Risk Table */}
      <div className="ecdat-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid #eaeaea", backgroundColor: "#faf9f6" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Prioritized Cryptographic Risk Ledger</h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#666" }}>
            Ordered top-to-bottom by composite urgency. Click "Recalculate" to simulate what-if scenarios.
          </p>
        </div>

        <div className="ecdat-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
          <table className="ecdat-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Family</th>
                <th>Composite Risk</th>
                <th>Quantum Exposure</th>
                <th>Classical Risk</th>
                <th>Mosca Threshold</th>
                <th>Primary Factor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
                    Loading risk data...
                  </td>
                </tr>
              ) : risks.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
                    <p style={{ marginBottom: "1rem" }}>No risk scores computed yet.</p>
                    <Link href="/prototype/sources" className="ecdat-btn" style={{ padding: "0.4rem 0.8rem" }}>
                      Run Discovery
                    </Link>
                  </td>
                </tr>
              ) : (
                risks.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#181917" }}>
                      {r.algorithm_canonical}
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "#555" }}>{r.algorithm_family}</td>
                    <td>
                      <span
                        className={`ecdat-badge ${
                          r.composite_risk_level === "CRITICAL"
                            ? "ecdat-badge-danger"
                            : r.composite_risk_level === "HIGH"
                            ? "ecdat-badge-active"
                            : r.composite_risk_level === "MEDIUM"
                            ? "ecdat-badge-neutral"
                            : "ecdat-badge-success"
                        }`}
                      >
                        {r.composite_risk_level}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.85rem", fontWeight: 600 }}>{r.quantum_risk_level || "UNKNOWN"}</td>
                    <td style={{ fontSize: "0.85rem" }}>{r.classical_risk_level || "LOW"}</td>
                    <td>
                      {r.mosca_threshold_exceeded ? (
                        <span style={{ color: "#B91C1C", fontWeight: 700, fontSize: "0.85rem" }}>EXCEEDED</span>
                      ) : (
                        <span style={{ color: "#15803D", fontSize: "0.85rem" }}>SAFE</span>
                      )}
                    </td>
                    <td
                      style={{
                        fontSize: "0.8rem",
                        color: "#666",
                        maxWidth: "240px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={r.quantum_reason || r.classical_reason || ""}
                    >
                      {r.quantum_reason || r.classical_reason || "—"}
                    </td>
                    <td>
                      <button
                        onClick={() => openRecalculator(r)}
                        className="ecdat-btn"
                        style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                      >
                        What-If ↻
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* What-If Recalculator Modal */}
      <AnimatePresence>
        {selectedRisk && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setSelectedRisk(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: "100%",
                maxWidth: "540px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                padding: "2rem",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                    What-If Risk Recalculator
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#666" }}>
                    Algorithm: <strong style={{ color: "#181917" }}>{selectedRisk.algorithm_canonical}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRisk(null)}
                  style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#888" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                    <span>Data Lifetime X (How long data remains sensitive)</span>
                    <strong>{customLifetime} Years</strong>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={customLifetime}
                    onChange={(e) => setCustomLifetime(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                    <span>Estimated Threat Horizon Z (Arrival of CRQC)</span>
                    <strong>{customHorizon} Years</strong>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={25}
                    value={customHorizon}
                    onChange={(e) => setCustomHorizon(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "6px" }}>
                    Business Criticality Tier
                  </label>
                  <select
                    value={customCriticality}
                    onChange={(e) => setCustomCriticality(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #ddd",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="CRITICAL">CRITICAL (Tier 0 — Payment / Identity / Core Ledger)</option>
                    <option value="HIGH">HIGH (Tier 1 — Core Microservices)</option>
                    <option value="MEDIUM">MEDIUM (Tier 2 — Internal APIs)</option>
                    <option value="LOW">LOW (Tier 3 — Batch / Logging)</option>
                  </select>
                </div>
              </div>

              {recalcResult && (
                <div
                  style={{
                    backgroundColor: "#faf9f6",
                    border: "1px solid #eaeaea",
                    borderRadius: "6px",
                    padding: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "#666" }}>Computed Risk:</span>
                    <span
                      className={`ecdat-badge ${
                        recalcResult.composite_risk_level === "CRITICAL"
                          ? "ecdat-badge-danger"
                          : recalcResult.composite_risk_level === "HIGH"
                          ? "ecdat-badge-active"
                          : "ecdat-badge-neutral"
                      }`}
                    >
                      {recalcResult.composite_risk_level}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "#555", margin: "8px 0 0" }}>
                    {recalcResult.quantum_reason || recalcResult.classical_reason}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={() => setSelectedRisk(null)}
                  className="ecdat-btn"
                  style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                >
                  Close
                </button>
                <button
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  className="ecdat-btn"
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.85rem",
                    backgroundColor: "var(--color-primary)",
                    color: "white",
                  }}
                >
                  {recalculating ? "Recalculating..." : "Recalculate Urgency"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
