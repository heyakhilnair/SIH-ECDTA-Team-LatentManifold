import RoadmapPlaceholder from "@/components/RoadmapPlaceholder";

export default function ActivityPage() {
  return (
    <RoadmapPlaceholder
      breadcrumbLabel="Activity"
      title="Activity"
      description="An append-only audit ledger: every login, scan, asset view, evidence access, and policy change."
      phaseLabel="Phase 10 — Future"
      explanation="Deferred per docs/TRACKER.md Phase 10 (Enterprise Hardening). No audit_log table or write-path exists yet — actions aren't currently being recorded anywhere to display here."
    />
  );
}
