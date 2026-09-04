"use client";

/**
 * Guided product tour, wired to the Topbar's "Help & Resources" button (which
 * previously had no onClick at all — a dead icon). Steps mirror the real
 * sidebar sections in Sidebar.tsx, not invented marketing copy, so the tour
 * never drifts out of sync with the actual product. Auto-opens once per
 * browser on first visit (localStorage flag), and is always re-openable from
 * the Help button after that.
 *
 * True spotlight: everything except the sidebar section this step describes
 * is blurred/dimmed via four fixed panels framing a cutout — the target
 * itself has nothing covering it, so it renders fully sharp. A curved arrow
 * from the card points straight at it. This replaced an earlier version that
 * only tinted the target's background, which read as "highlighted" but not
 * as a real spotlight.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./TourGuide.module.css";
import sidebarStyles from "./Sidebar.module.css";

const SEEN_KEY = "ecdat_tour_v1_seen";
const PAD = 10; // breathing room between the cutout and the sharp target element

interface TourLink {
  label: string;
  path: string;
}

interface TourStep {
  icon: string;
  title: string;
  description: string;
  /** Matches a Sidebar.tsx section's data-tour-target — spotlighted while this step is shown. */
  sectionId?: string;
  links?: TourLink[];
}

const STEPS: TourStep[] = [
  {
    icon: "◈",
    title: "Welcome to ECDAT",
    description:
      "ECDAT discovers cryptography across your source code and dependencies, builds a cryptographic bill of materials, calculates quantum migration risk, recommends NIST-standard replacements, and helps you migrate — all grounded in real, evidence-backed scan data. Let's walk through where everything lives.",
  },
  {
    icon: "◉",
    title: "Command Center",
    sectionId: "command-center",
    description:
      "Mission Control is the executive view: your cryptographic posture, migration progress, and highest-priority risks at a glance — everything here is computed from your real scans, never a placeholder.",
    links: [{ label: "Mission Control", path: "/prototype" }],
  },
  {
    icon: "⌬",
    title: "Discovery",
    sectionId: "discovery",
    description:
      "Register a project, run a scan, and see exactly what cryptography it found — down to the file and line. This is where evidence enters the system.",
    links: [
      { label: "Sources", path: "/prototype/sources" },
      { label: "Scan Jobs", path: "/prototype/scans" },
      { label: "Crypto Assets", path: "/prototype/assets" },
      { label: "CBOM Inventory", path: "/prototype/cbom" },
    ],
  },
  {
    icon: "⌗",
    title: "Intelligence",
    sectionId: "intelligence",
    description:
      "Understand how algorithms connect across your projects — the Dependency Graph and Blast Radius show real cross-project reach, and Risk & Exposure explains exactly why each asset is scored the way it is.",
    links: [
      { label: "Dependency Graph", path: "/prototype/graph" },
      { label: "Risk & Exposure", path: "/prototype/risk" },
    ],
  },
  {
    icon: "⇌",
    title: "Quantum Transition",
    sectionId: "quantum-transition",
    description:
      "Once you know what's at risk, this is where you act: NIST FIPS 203/204/205 recommendations, a real migration board per algorithm, and rescan-based verification once you've migrated.",
    links: [
      { label: "PQC Workbench", path: "/prototype/pqc" },
      { label: "Migration Planner", path: "/prototype/migration" },
    ],
  },
  {
    icon: "◍",
    title: "Analyst",
    sectionId: "analyst",
    description:
      "Ask the AI Analyst a question about your workspace — every answer cites real evidence, and it never invents an asset that wasn't actually found in a scan.",
    links: [{ label: "AI Analyst", path: "/prototype/analyst" }],
  },
  {
    icon: "✓",
    title: "You're ready",
    sectionId: "system",
    description:
      "Activity keeps a full audit trail of every action taken in your workspace. If you haven't yet, the fastest way to see ECDAT do something real is to register a source and run your first scan.",
    links: [
      { label: "Activity", path: "/prototype/activity" },
      { label: "Add a Source →", path: "/prototype/sources" },
    ],
  },
];

export function useTourAutoOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      // localStorage unavailable — skip auto-open, Help button still works
    }
  }, []);
  return [open, setOpen] as const;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

function rectToBox(r: DOMRect): Box {
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function TourGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [targetBox, setTargetBox] = useState<Box | null>(null);
  const [cardBox, setCardBox] = useState<Box | null>(null);
  const highlightedEl = useRef<Element | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const sectionId = open ? STEPS[step].sectionId : undefined;

  // Scroll the sidebar to the section this step describes, ring it (a plain
  // in-place glow, no scale — a transform here would fight the rect
  // measurement below and make the spotlight cutout jitter), and keep
  // re-measuring its screen position while the smooth-scroll settles.
  useEffect(() => {
    if (highlightedEl.current) {
      highlightedEl.current.classList.remove(sidebarStyles.tourHighlight);
      highlightedEl.current = null;
    }
    setTargetBox(null);
    if (!open || !sectionId) return;
    const el = document.querySelector(`[data-tour-target="${sectionId}"]`);
    if (!el) return;
    el.classList.add(sidebarStyles.tourHighlight);
    highlightedEl.current = el;
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    const measure = () => setTargetBox(rectToBox(el.getBoundingClientRect()));
    measure();
    const raf = requestAnimationFrame(measure);
    const timers = [80, 200, 350, 500, 700, 900].map((ms) => setTimeout(measure, ms));
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", measure);
    };
  }, [step, open, sectionId]);

  // Measure the modal card itself so the arrow can start from its real edge.
  useLayoutEffect(() => {
    if (!open || !cardRef.current) {
      setCardBox(null);
      return;
    }
    setCardBox(rectToBox(cardRef.current.getBoundingClientRect()));
  }, [open, step, targetBox]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    onClose();
  };

  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;

  const hole = targetBox
    ? {
        top: Math.max(0, targetBox.top - PAD),
        left: Math.max(0, targetBox.left - PAD),
        width: targetBox.width + PAD * 2,
        height: targetBox.height + PAD * 2,
      }
    : null;

  // Arrow: from the card's edge nearest the target, straight to the hole's edge.
  let arrowPath: string | null = null;
  let arrowMid: { x: number; y: number } | null = null;
  if (hole && cardBox) {
    const startX = cardBox.left;
    const startY = Math.min(Math.max(hole.top + hole.height / 2, cardBox.top + 24), cardBox.top + cardBox.height - 24);
    const endX = hole.left + hole.width + 4;
    const endY = hole.top + hole.height / 2;
    const midX = (startX + endX) / 2;
    arrowPath = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX + 14} ${endY}`;
    arrowMid = { x: midX, y: (startY + endY) / 2 };
  }

  return (
    <>
      {hole ? (
        <>
          {/* Four dimmed+blurred panels framing the cutout — the target itself has no covering element, so it stays fully sharp. */}
          <div className={styles.spotlightPanel} style={{ top: 0, left: 0, width: vw, height: hole.top }} onClick={finish} />
          <div className={styles.spotlightPanel} style={{ top: hole.top + hole.height, left: 0, width: vw, height: Math.max(0, vh - (hole.top + hole.height)) }} onClick={finish} />
          <div className={styles.spotlightPanel} style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} onClick={finish} />
          <div className={styles.spotlightPanel} style={{ top: hole.top, left: hole.left + hole.width, width: Math.max(0, vw - (hole.left + hole.width)), height: hole.height }} onClick={finish} />
          {arrowPath && (
            <svg className={styles.arrowSvg} width={vw} height={vh}>
              <defs>
                <marker id="tourArrowHead" markerWidth="9" markerHeight="9" refX="6" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#B95532" />
                </marker>
              </defs>
              <path d={arrowPath} fill="none" stroke="#B95532" strokeWidth="2.5" strokeDasharray="6 5" markerEnd="url(#tourArrowHead)" className={styles.arrowPath} />
            </svg>
          )}
        </>
      ) : (
        <div className={styles.backdrop} onClick={finish} />
      )}

      <div className={hole ? styles.cardWrapSpotlight : styles.cardWrap} onClick={finish}>
        <div className={styles.card} ref={cardRef} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <span className={styles.stepPill}>
              {current.icon} STEP {step + 1} OF {STEPS.length}
            </span>
            <button className={styles.closeBtn} onClick={finish} aria-label="Close tour">
              ✕
            </button>
          </div>

          <h3 className={styles.title}>{current.title}</h3>
          <p className={styles.description}>{current.description}</p>

          {current.links && (
            <div className={styles.linkRow}>
              {current.links.map((l) => (
                <Link key={l.path} href={l.path} className={styles.linkPill} onClick={finish}>
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          <div className={styles.footer}>
            <button className={styles.backBtn} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              ← Back
            </button>
            <button className={styles.skipBtn} onClick={finish}>
              Skip Tour
            </button>
            <button className={styles.nextBtn} onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
              {isLast ? "Get Started" : "Next →"}
            </button>
          </div>

          <div className={styles.dots}>
            {STEPS.map((_, i) => (
              <span key={i} className={i === step ? styles.dotActive : styles.dot} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
