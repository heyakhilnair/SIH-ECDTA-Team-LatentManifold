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

// The composite risk level is driven by classical risk first, then Mosca/quantum
// (see ecdat-backend/app/services/risk_engine.py's compute_asset_risk) — the
// "Primary Factor" summary must follow the same precedence, or a CRITICAL row
// driven by a classical break (e.g. MD5) shows its *quantum*-safety text as
// the "reason", which reads as contradictory ("CRITICAL ... quantum-safe for now").
function primaryFactorReason(r: any): string {
  if (r.classical_risk_level === "CRITICAL" || r.classical_risk_level === "HIGH") {
    return r.classical_reason || r.quantum_reason || "—";
  }
  return r.quantum_reason || r.classical_reason || "—";
}

export default function RiskPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();
  const searchParams = useSearchParams();

  const [sources, setSources] = useState<any[]>([]);
  const [sourceId, setSourceId] = useState(() => searchParams?.get("source") || "");
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

  // Detail drawer (full, untruncated explanation for one asset's risk)
  const [detailRisk, setDetailRisk] = useState<any | null>(null);

  const loadRiskData = async () => {
    if (!isLoaded || !userId || !workspace?.id) return;
    setLoading(true);
    try {
      const [summaryRes, listRes, sourcesRes] = await Promise.all([
        api.risk.summary(workspace.id, getToken, sourceId).catch(() => ({})),
        api.risk.list(workspace.id, getToken, sourceId).catch(() => []),
        api.sources.list(workspace.id, getToken).catch(() => []),
      ]);
      setRiskSummary(summaryRes || {});
      setRisks(listRes || []);
      setSources(sourcesRes || []);
    } catch (err) {
      console.error("Failed to load risk data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiskData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace, sourceId]);

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

  // risks[] is already priority-sorted by the backend — the first row is the
  // single most urgent real finding, used to drive the Mosca visualization
  // instead of a fixed/decorative bar.
  const topRisk = risks[0] || null;
  const moscaX = topRisk?.data_lifetime_years ?? 0;
  const moscaY = topRisk?.migration_time_years ?? 0;
  const moscaTotal = moscaX + moscaY || 1; // avoid divide-by-zero
  const moscaMargin = threatHorizon - moscaX - moscaY;
  const moscaBarDenominator = moscaMargin > 0 ? threatHorizon : moscaTotal;
  const moscaYPct = Math.min(100, (moscaY / moscaBarDenominator) * 100);
  const moscaXPct = Math.min(100 - moscaYPct, (moscaX / moscaBarDenominator) * 100);
  const moscaMarginPct = Math.max(0, 100 - moscaYPct - moscaXPct);

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Intelligence" }, { label: "Quantum Risk & Mosca" }]}
        title="Quantum Risk Workbench"
        description="Multi-dimensional risk assessment evaluating Shor vulnerability, classical deprecation, and Mosca's Inequality (X + Y > Z)."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ProjectFilter sources={sources} value={sourceId} onChange={setSourceId} />
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

      {/* Mosca Visualizer Banner — driven by the single most urgent real asset,
          not a fixed/decorative bar. Empty state when there's nothing to show. */}
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
              Mosca's Inequality: X + Y &gt; Z
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#666", margin: "4px 0 0", maxWidth: "640px" }}>
              <strong>X</strong> = how long the data protected by an algorithm must stay secret. <strong>Y</strong> = how
              long migrating away from it takes. <strong>Z</strong> = your chosen threat horizon (when a quantum
              computer capable of breaking it might exist). If X + Y exceeds Z, an attacker harvesting encrypted
              traffic today could decrypt it once that computer arrives — the window is open <em>now</em>, not in the future.
            </p>
          </div>
          <span
            className={`ecdat-badge ${critical > 0 ? "ecdat-badge-danger" : "ecdat-badge-success"}`}
            style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}
          >
            {critical > 0 ? "HNDL WINDOW OPEN" : "MIGRATION ON TRACK"}
          </span>
        </div>

        {topRisk ? (
          <div style={{ margin: "1.5rem 0" }}>
            <div style={{ fontSize: "0.78rem", color: "#888", marginBottom: "8px" }}>
              Showing your most urgent real finding — <strong style={{ color: "#181917" }}>{topRisk.algorithm_canonical}</strong>{" "}
              (X = {moscaX}y, Y = {moscaY}y, Z = {threatHorizon}y)
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#888", marginBottom: "6px" }}>
              <span>Migration (Y): {moscaY}y</span>
              <span>Data Lifetime (X): {moscaX}y</span>
              <span>{moscaMargin >= 0 ? `Margin: ${moscaMargin.toFixed(1)}y` : `Over threshold by ${Math.abs(moscaMargin).toFixed(1)}y`}</span>
            </div>
            <div style={{ height: "14px", backgroundColor: "#f0f0f0", borderRadius: "7px", overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${moscaYPct}%`, backgroundColor: "#B95532" }} title={`Migration Time Y — ${moscaY}y`}></div>
              <div style={{ width: `${moscaXPct}%`, backgroundColor: "#EAB308" }} title={`Data Lifetime X — ${moscaX}y`}></div>
              {moscaMargin > 0 && (
                <div style={{ width: `${moscaMarginPct}%`, backgroundColor: "#15803D" }} title={`Safety margin — ${moscaMargin.toFixed(1)}y`}></div>
              )}
            </div>
            <div style={{ display: "flex", gap: "2rem", marginTop: "8px", fontSize: "0.75rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", backgroundColor: "#B95532", borderRadius: "2px" }}></span>
                Migration Time Y
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", backgroundColor: "#EAB308", borderRadius: "2px" }}></span>
                Data Lifetime X
              </span>
              {moscaMargin > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", backgroundColor: "#15803D", borderRadius: "2px" }}></span>
                  Safety Margin
                </span>
              )}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "0.85rem", color: "#888", fontStyle: "italic", margin: "1rem 0 0" }}>
            No risk-scored assets yet — run a discovery scan to see a real Mosca timeline here.
          </p>
        )}
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
            {total > 0 ? `${Math.round((critical / total) * 100)}% of perimeter` : "0%"} · actively broken or HNDL window open
          </div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #C2410C" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#C2410C", textTransform: "uppercase" }}>
            HIGH
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>{high}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>
            {total > 0 ? `${Math.round((high / total) * 100)}% of perimeter` : "0%"} · little Mosca margin left
          </div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #D97706" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#D97706", textTransform: "uppercase" }}>
            MEDIUM
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>{medium}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>Plan migration this cycle</div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #4B5563" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4B5563", textTransform: "uppercase" }}>
            LOW
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>{low}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>Comfortable margin, monitor annually</div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem", borderLeft: "4px solid #15803D" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#15803D", textTransform: "uppercase" }}>
            SAFE / PQC
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>{safe}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>Not quantum- or classically-vulnerable</div>
        </div>
      </div>

      {/* Prioritized Risk Table */}
      <div className="ecdat-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid #eaeaea", backgroundColor: "#faf9f6" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Prioritized Cryptographic Risk Ledger</h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#666" }}>
            Ordered top-to-bottom by composite urgency. Click a row for the full explanation, or "What-If" to simulate a scenario.
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
                  <tr key={r.id} onClick={() => setDetailRisk(r)} style={{ cursor: "pointer" }}>
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
                        maxWidth: "280px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title="Click the row to read this in full"
                    >
                      {primaryFactorReason(r)}
                    </td>
                    <td>
                      <button
                        onClick={(e) => { e.stopPropagation(); openRecalculator(r); }}
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

      {/* Risk Detail Drawer — full, untruncated explanation for one asset */}
      <AnimatePresence>
        {detailRisk && (
          <div
            style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1000,
              display: "flex", justifyContent: "flex-end",
            }}
            onClick={() => setDetailRisk(null)}
          >
            <motion.div
              initial={{ x: 500, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 500, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                width: "100%", maxWidth: "620px", height: "100%",
                backgroundColor: "#fff", display: "flex", flexDirection: "column",
                boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid #eaeaea", backgroundColor: "#faf9f6", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.3rem", fontWeight: 800, color: "#181917" }}>
                      {detailRisk.algorithm_canonical}
                    </span>
                    <span
                      className={`ecdat-badge ${
                        detailRisk.composite_risk_level === "CRITICAL" ? "ecdat-badge-danger"
                        : detailRisk.composite_risk_level === "HIGH" ? "ecdat-badge-active"
                        : detailRisk.composite_risk_level === "MEDIUM" ? "ecdat-badge-neutral"
                        : "ecdat-badge-success"
                      }`}
                    >
                      {detailRisk.composite_risk_level}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#666", margin: 0 }}>{detailRisk.algorithm_family} · full risk explanation</p>
                </div>
                <button onClick={() => setDetailRisk(null)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#888" }}>✕</button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "1.75rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div style={{ padding: "1rem", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700, marginBottom: "6px" }}>
                    Quantum Exposure — {detailRisk.quantum_risk_level || "UNKNOWN"}
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#333", margin: 0, lineHeight: 1.6 }}>
                    {detailRisk.quantum_reason || "No quantum exposure analysis recorded for this asset."}
                  </p>
                </div>

                <div style={{ padding: "1rem", backgroundColor: "#fff", border: "1px solid #eaeaea", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700, marginBottom: "6px" }}>
                    Classical Risk — {detailRisk.classical_risk_level || "LOW"}
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#333", margin: 0, lineHeight: 1.6 }}>
                    {detailRisk.classical_reason || "No classical vulnerabilities recorded for this asset."}
                  </p>
                </div>

                <div style={{ padding: "1rem", backgroundColor: "#faf9f6", border: "1px solid #eaeaea", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700, marginBottom: "10px" }}>
                    Mosca Calculation
                  </div>
                  <div style={{ display: "flex", gap: "1.5rem", marginBottom: "10px" }}>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#666" }}>X — Data Lifetime</span>
                      <div style={{ fontWeight: 700, color: "#181917" }}>{detailRisk.data_lifetime_years ?? "—"} years</div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#666" }}>Y — Migration Time</span>
                      <div style={{ fontWeight: 700, color: "#181917" }}>{detailRisk.migration_time_years ?? "—"} years</div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#666" }}>Z — Threat Horizon</span>
                      <div style={{ fontWeight: 700, color: "#181917" }}>{threatHorizon} years</div>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "#555", margin: 0, lineHeight: 1.6 }}>
                    {detailRisk.mosca_threshold_exceeded
                      ? `X + Y (${(detailRisk.data_lifetime_years ?? 0) + (detailRisk.migration_time_years ?? 0)}y) exceeds Z (${threatHorizon}y) — the Harvest-Now-Decrypt-Later window is already open for this asset.`
                      : `X + Y (${(detailRisk.data_lifetime_years ?? 0) + (detailRisk.migration_time_years ?? 0)}y) stays within Z (${threatHorizon}y) — ${(threatHorizon - (detailRisk.data_lifetime_years ?? 0) - (detailRisk.migration_time_years ?? 0)).toFixed(1)}y of safety margin remains.`}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#888", margin: "10px 0 0", fontStyle: "italic" }}>
                    X defaults to {detailRisk.data_lifetime_years ?? 7} years workspace-wide — ECDAT can't infer how
                    long your data must stay secret from a code scan alone. Use "What-If" to override it for this
                    specific asset if you know better (e.g. session tokens are short-lived; archived records aren't).
                  </p>
                </div>

                <button
                  onClick={() => { openRecalculator(detailRisk); setDetailRisk(null); }}
                  className="ecdat-btn"
                  style={{ padding: "0.6rem 1rem", fontSize: "0.85rem", alignSelf: "flex-start" }}
                >
                  Run a What-If scenario for this asset →
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    {primaryFactorReason(recalcResult)}
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
