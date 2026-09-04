"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { useWorkspace } from "@/components/WorkspaceWrapper";
import { motion } from "framer-motion";
import { EVENT_LABELS, type ActivityItem } from "@/lib/activityLabels";
import { formatISTDateTime } from "@/lib/formatTime";
import "../prototype.css";

export default function ActivityPage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !userId || !workspace) return;
    api.activity.list(workspace.id, getToken, { limit: 100 })
      .then((res) => { setItems(res.items || []); setTotal(res.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace]);

  return (
    <div className="ecdat-container">
      <motion.header
        className="ecdat-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 style={{ fontSize: "2.25rem", marginBottom: "0.25rem" }}>Audit Trail</h1>
          <p>A chronological, tamper-evident record of every scan, source, policy, and AI Analyst action taken in this workspace.</p>
        </div>
      </motion.header>

      <div className="ecdat-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.5rem 2rem", borderBottom: "var(--border-thin)", backgroundColor: "#faf9f6" }}>
          <h2 style={{ fontSize: "1.1rem" }}>{total} event{total === 1 ? "" : "s"} recorded</h2>
        </div>
        <div className="ecdat-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
          <table className="ecdat-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Actor</th>
                <th>Resource</th>
                <th>Details</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "var(--color-secondary)" }}>
                    No activity yet. Actions like adding a source, launching a scan, or changing a policy will show up here.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{EVENT_LABELS[item.event] || item.event}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--color-secondary)" }}>{item.actor}</td>
                    <td style={{ fontSize: "0.85rem", color: "var(--color-secondary)" }}>
                      {item.resource_type ? `${item.resource_type}${item.resource_id ? ` · ${item.resource_id.slice(0, 8)}` : ""}` : "—"}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--color-secondary)", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.details ? JSON.stringify(item.details) : ""}>
                      {item.details ? JSON.stringify(item.details) : "—"}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--color-secondary)" }}>
                      {formatISTDateTime(item.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
