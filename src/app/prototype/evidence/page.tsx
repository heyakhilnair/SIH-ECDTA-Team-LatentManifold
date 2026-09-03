import RoadmapPlaceholder from "@/components/RoadmapPlaceholder";

export default function EvidencePage() {
  return (
    <RoadmapPlaceholder
      breadcrumbLabel="Evidence"
      title="Evidence"
      description="A unified, searchable feed of every raw evidence occurrence across the workspace."
      phaseLabel="Not yet built"
      explanation="Evidence itself is real and already viewable — open any asset in Crypto Assets and its detail view lists every real evidence occurrence (file, line, matched code). What's missing is a single workspace-wide feed with search/filter across all evidence at once, rather than per-asset. No GET /api/workspaces/{id}/evidence endpoint exists yet to back it."
    />
  );
}
