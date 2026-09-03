import RoadmapPlaceholder from "@/components/RoadmapPlaceholder";

export default function CompliancePage() {
  return (
    <RoadmapPlaceholder
      breadcrumbLabel="Compliance"
      title="Compliance"
      description="Pass/fail mapping of discovered assets against regulatory frameworks (NIST CSF, CNSA 2.0, CMMC)."
      phaseLabel="Phase 10 — Future"
      explanation="Deferred per docs/TRACKER.md Phase 10 (Enterprise Hardening). No framework-constraint matrix exists yet to check discovered assets against — building this without one would mean fabricating a compliance score, which this project's own 'no fake data' rule prohibits."
    />
  );
}
