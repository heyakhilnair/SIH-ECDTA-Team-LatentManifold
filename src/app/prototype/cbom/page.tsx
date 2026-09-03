"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../lib/api";
import { motion } from "framer-motion";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import "../prototype.css";

export default function CbomPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();

  const [cbom, setCbom] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadCbom = async () => {
    if (!isLoaded || !userId || !workspace?.id) return;
    setLoading(true);
    try {
      const data = await api.cbom.getLatest(workspace.id, getToken);
      setCbom(data);
    } catch (err: any) {
      console.error("Failed to load CBOM", err);
      setCbom(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCbom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace]);

  const handleGenerate = async () => {
    if (!workspace?.id) return;
    setGenerating(true);
    try {
      const fresh = await api.cbom.generate(workspace.id, getToken);
      setCbom(fresh);
      await loadCbom();
    } catch (err) {
      console.error("Failed to generate CBOM", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadJson = () => {
    if (!cbom) return;
    const blob = new Blob([JSON.stringify(cbom, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cyclonedx-cbom-${workspace?.id?.substring(0, 8) || "export"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    if (!cbom) return;
    navigator.clipboard.writeText(JSON.stringify(cbom, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const components = cbom?.components || [];

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Discovery" }, { label: "CBOM Inventory" }]}
        title="Cryptographic Bill of Materials (CBOM)"
        description="Standardized CycloneDX v1.6 inventory ledger documenting all cryptographic algorithms, keys, and security properties."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="ecdat-btn"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            >
              {generating ? "Generating..." : "Generate Fresh Snapshot"}
            </button>
            <button
              onClick={handleDownloadJson}
              disabled={!cbom}
              className="ecdat-btn"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                backgroundColor: "var(--color-primary)",
                color: "white",
              }}
            >
              Download CycloneDX JSON ↓
            </button>
          </div>
        }
      />

      {/* CBOM Specification & Metadata Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        <div className="ecdat-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>
            Specification Standard
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>
            CycloneDX v{cbom?.specVersion || "1.6"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#687563" }}>
            BOM Format: {cbom?.bomFormat || "CycloneDX"}
          </div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>
            Cryptographic Components
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#181917", margin: "4px 0" }}>
            {components.length}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#687563" }}>
            Total unique canonical assets
          </div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>
            Snapshot Timestamp
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#181917", margin: "8px 0" }}>
            {cbom?.metadata?.timestamp ? new Date(cbom.metadata.timestamp).toLocaleString() : "No snapshot yet"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#888" }}>
            Version: {cbom?.version || 1}
          </div>
        </div>

        <div className="ecdat-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", fontWeight: 700 }}>
            Authoring System
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#181917", margin: "6px 0" }}>
            ECDAT v0.1.0
          </div>
          <button
            onClick={() => setShowJsonModal(true)}
            disabled={!cbom}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary)",
              fontWeight: 600,
              fontSize: "0.8rem",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Inspect Raw JSON Schema →
          </button>
        </div>
      </div>

      {/* Components Table */}
      <div className="ecdat-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid #eaeaea", backgroundColor: "#faf9f6" }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
            Cryptographic Components in Active Snapshot
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#666" }}>
            CycloneDX component entries tagged with cryptographic primitive, execution environment, and posture flags.
          </p>
        </div>

        <div className="ecdat-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
          <table className="ecdat-table">
            <thead>
              <tr>
                <th>Component / Algorithm</th>
                <th>BOM Ref</th>
                <th>Primitive Type</th>
                <th>Execution Environment</th>
                <th>Quantum Vulnerable</th>
                <th>Classical Vulnerable</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
                    Loading CBOM components...
                  </td>
                </tr>
              ) : components.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
                    <p style={{ marginBottom: "1rem" }}>No CBOM snapshot generated yet.</p>
                    <button onClick={handleGenerate} className="ecdat-btn" style={{ padding: "0.4rem 0.8rem" }}>
                      Generate CBOM Now
                    </button>
                  </td>
                </tr>
              ) : (
                components.map((comp: any, idx: number) => {
                  const props = comp.properties || [];
                  const getProp = (key: string) => props.find((p: any) => p.name === key)?.value;
                  const isQv = getProp("ecdat:quantum_vulnerable") === "true";
                  const isCv = getProp("ecdat:classical_vulnerable") === "true";

                  return (
                    <tr key={comp["bom-ref"] || idx}>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#181917" }}>
                        {comp.name}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#888" }}>
                        {comp["bom-ref"]}
                      </td>
                      <td style={{ fontSize: "0.85rem", textTransform: "capitalize" }}>
                        {comp.cryptoProperties?.algorithmProperties?.primitive || "algorithm"}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "#666" }}>
                        {comp.cryptoProperties?.algorithmProperties?.executionEnvironment || "software-plain-ram"}
                      </td>
                      <td>
                        {isQv ? (
                          <span className="ecdat-badge ecdat-badge-danger" style={{ fontSize: "0.75rem" }}>
                            YES (SHOR)
                          </span>
                        ) : (
                          <span className="ecdat-badge ecdat-badge-success" style={{ fontSize: "0.75rem" }}>
                            QUANTUM SAFE
                          </span>
                        )}
                      </td>
                      <td>
                        {isCv ? (
                          <span className="ecdat-badge ecdat-badge-danger" style={{ fontSize: "0.75rem" }}>
                            DEPRECATED
                          </span>
                        ) : (
                          <span className="ecdat-badge ecdat-badge-neutral" style={{ fontSize: "0.75rem" }}>
                            ACCEPTABLE
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw JSON Modal */}
      {showJsonModal && (
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
          onClick={() => setShowJsonModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "800px",
              maxHeight: "85vh",
              backgroundColor: "#fff",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "1.25rem 1.75rem",
                borderBottom: "1px solid #eaeaea",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>CycloneDX v1.6 Raw JSON Payload</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleCopyJson}
                  className="ecdat-btn"
                  style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                >
                  {copied ? "Copied!" : "Copy JSON"}
                </button>
                <button
                  onClick={() => setShowJsonModal(false)}
                  style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#888" }}
                >
                  ✕
                </button>
              </div>
            </div>
            <pre
              style={{
                flex: 1,
                overflowY: "auto",
                backgroundColor: "#181917",
                color: "#F3F0E8",
                padding: "1.5rem",
                margin: 0,
                fontSize: "0.8rem",
                lineHeight: 1.5,
              }}
            >
              <code>{JSON.stringify(cbom, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
