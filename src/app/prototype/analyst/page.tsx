import RoadmapPlaceholder from "@/components/RoadmapPlaceholder";

export default function AiAnalystPage() {
  return (
    <RoadmapPlaceholder
      breadcrumbLabel="AI Analyst"
      title="AI Analyst"
      description="Evidence-grounded Q&A over your workspace's real crypto findings — every claim cites a real evidence_id."
      phaseLabel="Phase 8 — Post-SIH"
      explanation="Deliberately deferred per docs/TRACKER.md Phase 8: needs pgvector, an evidence embedding pipeline, RAG retrieval, and strict output-schema validation so the model can never invent an asset or cite an evidence_id that doesn't exist. Shipping a chat box that isn't actually grounded in real evidence would violate this project's own 'AI never invents cryptographic assets' rule — so there's nothing here rather than something fake."
    />
  );
}
