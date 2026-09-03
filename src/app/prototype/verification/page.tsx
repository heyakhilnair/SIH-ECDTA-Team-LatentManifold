import RoadmapPlaceholder from "@/components/RoadmapPlaceholder";

export default function VerificationPage() {
  return (
    <RoadmapPlaceholder
      breadcrumbLabel="Verification"
      title="Verification"
      description="Post-migration proof: diff two CBOM snapshots to confirm a vulnerable algorithm was actually removed, not just recommended."
      phaseLabel="Post-SIH"
      explanation="This needs comparing two CbomSnapshot rows over time (CBOM(t1) vs CBOM(t2)) and no diff logic exists yet. CBOM snapshots themselves are real and generated on every scan — CBOM Inventory shows the current one — but nothing compares two of them yet."
    />
  );
}
