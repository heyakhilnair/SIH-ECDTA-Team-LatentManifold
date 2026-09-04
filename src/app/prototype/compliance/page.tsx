"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../lib/api";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/formatTime";
import { EVENT_LABELS } from "@/lib/activityLabels";
import "../prototype.css";

export default function CompliancePage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();
  const [violations, setViolations] = useState<any | null>(null);
  const [alerts, setAlerts] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !userId || !workspace?.id) return;
    setLoading(true);
    Promise.all([
      api.workspace.policyViolations(workspace.id, getToken),
      api.workspace.alerts(workspace.id, getToken),
    ])
      .then(([v, a]) => {
        setViolations(v);
        setAlerts(a);
      })
      .catch((err) => console.error("Failed to load compliance data", err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace]);

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Analyst" }, { label: "Compliance" }]}
        title="Compliance"
        description="Real, evidence-backed policy violations — every discovered algorithm checked against a starter forbidden/review ruleset."
        actions={
          <Link href="/prototype/assets" className="ecdat-btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            CRYPTO ASSETS →
          </Link>
        }
      />

      <div
        style={{
          padding: "1rem 1.5rem", backgroundColor: "#faf9f6", border: "1px solid #eaeaea", borderRadius: "8px",
          marginBottom: "1.5rem", fontSize: "0.85rem", color: "#666",
        }}
      >
        <strong style={{ color: "#181917" }}>What this is — and isn&apos;t:</strong> Violations below come from a
        real starter policy (classically-broken algorithms are Forbidden, quantum-vulnerable ones need Review),
        sourced from ECDAT&apos;s own vulnerability classifications — not invented. There is{" "}
        <strong>no NIST CSF / CMMC / CNSA 2.0 framework mapping yet</strong> — building a pass/fail score against a
        framework ECDAT doesn&apos;t actually model would mean fabricating a compliance score, which this project
        doesn&apos;t do. That mapping stays future work.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="ecdat-card" style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#181917" }}>{loading ? "…" : violations?.total_assets ?? 0}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>assets evaluated</div>
        </div>
        <div className="ecdat-card" style={{ padding: "1.25rem", backgroundColor: "#FEE2E2" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#B91C1C" }}>{loading ? "…" : violations?.forbidden_count ?? 0}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>forbidden</div>
        </div>
        <div className="ecdat-card" style={{ padding: "1.25rem", backgroundColor: "#FFEDD5" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#C2410C" }}>{loading ? "…" : violations?.review_count ?? 0}</div>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>needs review</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.25rem" }}>
        <div>
          <h3 style={{ fontSize: "0.95rem", color: "#181917", marginBottom: "0.75rem" }}>Policy Violations</h3>
          <div className="ecdat-table-wrapper">
            <table className="ecdat-table">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Status</th>
                  <th>Rule</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {(violations?.violations || []).map((v: any) => (
                  <tr key={v.asset_id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#181917" }}>{v.algorithm_canonical}</td>
                    <td>
                      <span className={`ecdat-badge ${v.status === "FORBIDDEN" ? "ecdat-badge-danger" : "ecdat-badge-active"}`} style={{ fontSize: "0.72rem" }}>
                        {v.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#666" }}>{v.rule}</td>
                    <td style={{ fontSize: "0.8rem", textAlign: "center" }}>{v.evidence_count ?? "—"}</td>
                  </tr>
                ))}
                {!loading && (violations?.violations || []).length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "#666", padding: "2rem" }}>
                      No policy violations — every discovered algorithm is Allowed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: "0.95rem", color: "#181917", marginBottom: "0.75rem" }}>Alerts</h3>
          <div className="ecdat-card" style={{ padding: 0, maxHeight: "420px", overflowY: "auto" }}>
            {(alerts?.items || []).map((a: any) => (
              <div key={a.id} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f0f0ed" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#181917" }}>{EVENT_LABELS[a.event] || a.event}</div>
                <div style={{ fontSize: "0.78rem", color: "#888", marginTop: "2px" }}>
                  {a.details?.algorithm ? `${a.details.algorithm} — ` : ""}{formatRelativeTime(a.created_at)}
                </div>
              </div>
            ))}
            {!loading && (alerts?.items || []).length === 0 && (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "#666", fontSize: "0.85rem" }}>
                No alerts yet — they fire the first time a scan finds a real violation or a new critical-risk asset.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
