"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../lib/api";
import { useWorkspace } from "../../../components/WorkspaceWrapper";
import PageHeader from "@/components/PageHeader";
import ProjectFilter from "@/components/ProjectFilter";
import { formatRelativeTime } from "@/lib/formatTime";
import { githubBlobUrl } from "@/lib/githubLink";
import "../prototype.css";

const PAGE_SIZE = 25;
const SOURCE_TYPES = [
  { value: "", label: "All types" },
  { value: "source_code", label: "Source code" },
  { value: "dependency", label: "Dependency" },
  { value: "certificate", label: "Certificate" },
  { value: "semgrep", label: "Semgrep rule" },
];

export default function EvidencePage() {
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<any[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!isLoaded || !userId || !workspace?.id) return;
    api.sources.list(workspace.id, getToken).then(setSources).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace]);

  useEffect(() => {
    if (!isLoaded || !userId || !workspace?.id) return;
    setLoading(true);
    api.workspace
      .evidence(workspace.id, getToken, {
        source_id: sourceId || undefined,
        source_type: sourceType || undefined,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
      })
      .catch((err) => console.error("Failed to load evidence feed", err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace, sourceId, sourceType, search, page]);

  const sourceUrlById: Record<string, string | undefined> = {};
  for (const s of sources) sourceUrlById[s.id] = s.configuration?.url;

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="ecdat-container">
      <PageHeader
        breadcrumbs={[{ label: "Discovery" }, { label: "Evidence" }]}
        title="Evidence"
        description="A unified, searchable feed of every raw evidence occurrence across the workspace — one row per real scan finding."
      />

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search file path or matched code…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            fontSize: "0.85rem",
            border: "1px solid #ddd",
            borderRadius: "6px",
            minWidth: "260px",
          }}
        />
        <ProjectFilter sources={sources} value={sourceId} onChange={(v) => { setSourceId(v); setPage(0); }} />
        <select
          value={sourceType}
          onChange={(e) => { setSourceType(e.target.value); setPage(0); }}
          style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem", border: "1px solid #ddd", borderRadius: "6px", backgroundColor: "#fff", fontWeight: 600 }}
        >
          {SOURCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <span className="ecdat-badge ecdat-badge-active" style={{ fontSize: "0.75rem", marginLeft: "auto" }}>
          {loading ? "…" : `${total} occurrence${total === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="ecdat-table-wrapper">
        <table className="ecdat-table">
          <thead>
            <tr>
              <th>Algorithm</th>
              <th>File : Line</th>
              <th>Matched code</th>
              <th>Type</th>
              <th>Project</th>
              <th>Confidence</th>
              <th>Found</th>
            </tr>
          </thead>
          <tbody>
            {items.map((ev) => {
              const link = githubBlobUrl(sourceUrlById[ev.source_id || ""], ev.file_path, ev.line_number);
              return (
                <tr key={ev.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#181917" }}>
                    {ev.algorithm_canonical || <span style={{ color: "#999", fontWeight: 400 }}>unresolved</span>}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                    {link ? (
                      <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: "#181917" }}>
                        {ev.file_path}{ev.line_number ? `:${ev.line_number}` : ""} ↗
                      </a>
                    ) : (
                      <>{ev.file_path || "—"}{ev.line_number ? `:${ev.line_number}` : ""}</>
                    )}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "#555", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ev.raw_match}
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "#666" }}>{ev.source_type}</td>
                  <td style={{ fontSize: "0.85rem" }}>{ev.source_name || "—"}</td>
                  <td style={{ fontSize: "0.8rem" }}>{Math.round((ev.confidence ?? 0) * 100)}%</td>
                  <td style={{ fontSize: "0.8rem", color: "#666" }}>{ev.created_at ? formatRelativeTime(ev.created_at) : "—"}</td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "#666", padding: "2rem" }}>
                  No evidence matches these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
          <span style={{ fontSize: "0.8rem", color: "#666" }}>{from}–{to} of {total}</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="ecdat-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>
              ← Prev
            </button>
            <button className="ecdat-btn" disabled={to >= total} onClick={() => setPage((p) => p + 1)} style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
