"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import styles from "./Sidebar.module.css";

const navSections = [
  {
    title: "Command Center",
    items: [
      { name: "Mission Control", path: "/prototype" },
    ]
  },
  {
    title: "Discovery",
    items: [
      { name: "Sources", path: "/prototype/sources" },
      { name: "Scan Jobs", path: "/prototype/scans" },
      { name: "Crypto Assets", path: "/prototype/assets" },
      { name: "CBOM Inventory", path: "/prototype/cbom" },
    ]
  },
  {
    title: "Intelligence",
    items: [
      { name: "Dependency Graph", path: "/prototype/graph" },
      { name: "Blast Radius", path: "/prototype/blast-radius" },
      { name: "Evidence", path: "/prototype/evidence" },
      { name: "Risk & Exposure", path: "/prototype/risk" },
    ]
  },
  {
    title: "Quantum Transition",
    items: [
      { name: "Quantum Posture", path: "/prototype/quantum" },
      { name: "PQC Workbench", path: "/prototype/pqc" },
      { name: "Migration Planner", path: "/prototype/migration" },
      { name: "Verification", path: "/prototype/verification" },
    ]
  },
  {
    title: "Analyst",
    items: [
      { name: "AI Analyst", path: "/prototype/analyst" },
      { name: "Forecast & Labs", path: "/prototype/labs" },
    ]
  },
  {
    title: "System",
    items: [
      { name: "Activity", path: "/prototype/activity" },
      { name: "Compliance", path: "/prototype/compliance" },
      { name: "Settings", path: "/prototype/settings" },
    ]
  }
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
          <div key={section.title}>
            <div className={styles.navSection}>{section.title}</div>
            {section.items.map((item) => {
              const isActive = pathname === item.path || (item.path !== "/prototype" && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                >
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
