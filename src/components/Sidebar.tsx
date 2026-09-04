"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import styles from "./Sidebar.module.css";

/**
 * Icon set for nav items — inline SVG, stroke-based (matches the icon style
 * already used in Topbar.tsx's search/bell/help buttons), so no new icon
 * library dependency. One icon per real page, not decorative.
 */
const Icon = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </svg>
  ),
  scan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  network: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" />
      <line x1="8" y1="7" x2="10.5" y2="16" /><line x1="16" y1="7" x2="13.5" y2="16" /><line x1="8.5" y1="6" x2="15.5" y2="6" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" />
    </svg>
  ),
  fileSearch: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8" /><path d="M14 2l6 6v3" />
      <circle cx="16" cy="17" r="3" /><line x1="18.5" y1="19.5" x2="21" y2="22" />
    </svg>
  ),
  alertTriangle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  atom: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <ellipse cx="12" cy="12" rx="9" ry="4" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" />
    </svg>
  ),
  flask: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2v6L3.5 18a2 2 0 0 0 1.8 3h13.4a2 2 0 0 0 1.8-3L15 8V2" /><line x1="7" y1="2" x2="17" y2="2" />
      <line x1="7" y1="14" x2="17" y2="14" />
    </svg>
  ),
  gitBranch: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  ),
  shieldCheck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Z" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  trending: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  clipboardCheck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
};

const navSections = [
  {
    title: "Command Center",
    id: "command-center",
    items: [{ name: "Mission Control", path: "/prototype", icon: Icon.grid }],
  },
  {
    title: "Discovery",
    id: "discovery",
    items: [
      { name: "Sources", path: "/prototype/sources", icon: Icon.database },
      { name: "Scan Jobs", path: "/prototype/scans", icon: Icon.scan },
      { name: "Crypto Assets", path: "/prototype/assets", icon: Icon.lock },
      { name: "CBOM Inventory", path: "/prototype/cbom", icon: Icon.list },
    ],
  },
  {
    title: "Intelligence",
    id: "intelligence",
    items: [
      { name: "Dependency Graph", path: "/prototype/graph", icon: Icon.network },
      { name: "Blast Radius", path: "/prototype/blast-radius", icon: Icon.target },
      { name: "Evidence", path: "/prototype/evidence", icon: Icon.fileSearch },
      { name: "Risk & Exposure", path: "/prototype/risk", icon: Icon.alertTriangle },
    ],
  },
  {
    title: "Quantum Transition",
    id: "quantum-transition",
    items: [
      { name: "Quantum Posture", path: "/prototype/quantum", icon: Icon.atom },
      { name: "PQC Workbench", path: "/prototype/pqc", icon: Icon.flask },
      { name: "Migration Planner", path: "/prototype/migration", icon: Icon.gitBranch },
      { name: "Verification", path: "/prototype/verification", icon: Icon.shieldCheck },
    ],
  },
  {
    title: "Analyst",
    id: "analyst",
    items: [
      { name: "AI Analyst", path: "/prototype/analyst", icon: Icon.sparkles },
      { name: "Forecast & Labs", path: "/prototype/labs", icon: Icon.trending },
    ],
  },
  {
    title: "System",
    id: "system",
    items: [
      { name: "Activity", path: "/prototype/activity", icon: Icon.activity },
      { name: "Compliance", path: "/prototype/compliance", icon: Icon.clipboardCheck },
      { name: "Settings", path: "/prototype/settings", icon: Icon.settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <div className={styles.logo}>
          Latent<span className={styles.logoAccent}>Manifold</span>
        </div>
      </div>
      <nav className={styles.nav}>
        {navSections.map((section) => (
          <div key={section.title} data-tour-target={section.id}>
            <div className={styles.navSection}>{section.title}</div>
            {section.items.map((item) => {
              const isActive = pathname === item.path || (item.path !== "/prototype" && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className={styles.footer}>
        <SignOutButton>
          <button className={styles.logoutBtn}>
            Log Out
          </button>
        </SignOutButton>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '12px' }}>
          <div className={styles.version}>v0.1.0-alpha</div>
          <div className={styles.badge}>SIH26164</div>
        </div>
      </div>
    </aside>
  );
}
