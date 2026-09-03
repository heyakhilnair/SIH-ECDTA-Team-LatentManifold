import RoadmapPlaceholder from "@/components/RoadmapPlaceholder";

export default function BlastRadiusPage() {
  return (
    <RoadmapPlaceholder
      breadcrumbLabel="Blast Radius"
      title="Blast Radius"
      description="Impact analysis: how many applications and data assets depend on a given vulnerable algorithm."
      phaseLabel="Phase 9 — Post-SIH"
      explanation="Blast radius requires a real dependency graph (Application → Library → Algorithm → DataAsset) backed by Neo4j, per docs/IMPLEMENTATION_PLAN.md §9. That graph doesn't exist yet — the Dependency Graph page today derives a flat view directly from Crypto Assets, which isn't enough to compute a real weighted impact score. See docs/TRACKER.md Phase 9."
    />
  );
}
