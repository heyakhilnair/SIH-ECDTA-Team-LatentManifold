"use client";

import PageHeader from "./PageHeader";
import styles from "./RoadmapPlaceholder.module.css";

interface RoadmapPlaceholderProps {
  breadcrumbLabel: string;
  title: string;
  description: string;
  phaseLabel: string; // e.g. "Phase 8 — Post-SIH"
  explanation: string; // why it's not built yet / what exists today instead
}

/**
 * Honest "not built yet" page for sidebar routes that don't have a real
 * implementation behind them (see docs/TRACKER.md for what's assigned to
 * which phase). Exists so clicking a nav link never 404s during a demo —
 * these 8 routes (Blast Radius, Evidence, Quantum Posture, Verification,
 * AI Analyst, Forecast & Labs, Activity, Compliance) had no route folder at
 * all until this was added; see docs/BACKEND_AUDIT_PHASE0-6.md-style Phase 7
 * findings. This is a real state, not a mock — no fake data, no fabricated
 * progress bar, just an honest "here's what's here and what isn't yet".
 */
export default function RoadmapPlaceholder({
  breadcrumbLabel,
  title,
  description,
  phaseLabel,
  explanation,
}: RoadmapPlaceholderProps) {
  return (
    <div className={styles.container}>
      <PageHeader
        breadcrumbs={[{ label: "Command Center", href: "/prototype" }, { label: breadcrumbLabel }]}
        title={title}
        description={description}
      />
      <div className={styles.card}>
        <span className={styles.badge}>{phaseLabel}</span>
        <h3>Not built yet</h3>
        <p>{explanation}</p>
      </div>
    </div>
  );
}
