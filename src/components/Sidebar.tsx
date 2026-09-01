"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import styles from "./Sidebar.module.css";

const navItems = [
  { name: "Overview", path: "/prototype" },
  { name: "Discovery", path: "/prototype/discovery" },
  { name: "Assets", path: "/prototype/assets" },
  { name: "Risk Assessment", path: "/prototype/risk" },
  { name: "Remediation", path: "/prototype/remediation" },
  { name: "Reports", path: "/prototype/reports" },
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
        {navItems.map((item) => {
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
