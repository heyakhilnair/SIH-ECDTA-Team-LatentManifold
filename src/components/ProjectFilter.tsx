"use client";

/**
 * Project/source scope dropdown, reused on every page that lists per-asset
 * data (Crypto Assets, Risk, CBOM, PQC Workbench, Migration, Graph). Each
 * page owns its own selected source_id in local state (or the `?source=`
 * URL param it was opened with) — selecting a project here never touches
 * any other page's state, per the user's explicit request.
 */
export interface SourceOption {
  id: string;
  name: string;
}

export default function ProjectFilter({
  sources,
  value,
  onChange,
}: {
  sources: SourceOption[];
  value: string;
  onChange: (sourceId: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "0.5rem 0.75rem",
        fontSize: "0.85rem",
        border: "1px solid #ddd",
        borderRadius: "6px",
        backgroundColor: "#fff",
        color: "#181917",
        fontWeight: 600,
        minWidth: "180px",
        maxWidth: "260px",
      }}
      title="Scope this page to one project/source"
    >
      <option value="">All Projects</option>
      {sources.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
