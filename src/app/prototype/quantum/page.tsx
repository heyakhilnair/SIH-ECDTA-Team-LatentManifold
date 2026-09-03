import RoadmapPlaceholder from "@/components/RoadmapPlaceholder";

export default function QuantumPosturePage() {
  return (
    <RoadmapPlaceholder
      breadcrumbLabel="Quantum Posture"
      title="Quantum Posture"
      description="Enterprise-wide stratification: Shor-vulnerable (needs asymmetric replacement) vs. Grover-weakened (needs symmetric key doubling)."
      phaseLabel="Not yet built"
      explanation="Risk & Exposure already shows per-asset quantum exposure and the Mosca calculation. A dedicated Shor-vs-Grover stratified view across the whole workspace, per docs/IMPLEMENTATION_PLAN.md's Advanced Intelligence spec, doesn't exist as its own page yet."
    />
  );
}
