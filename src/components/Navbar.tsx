"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.logoGroup}>
          <Link href="/" className={styles.logoLink}>
            <span className={styles.logoText}>ECDAT</span>
            <span className={styles.version}>v1.0.0-MVP</span>
          </Link>
        </div>
        
        <div className={styles.navLinks}>
          {isHome ? (
            <>
              <a href="#problem" className={styles.navLink}>PROJECT</a>
              <a href="#how-it-works" className={styles.navLink}>HOW IT WORKS</a>
              <a href="#architecture" className={styles.navLink}>ARCHITECTURE</a>
              <a href="#impact" className={styles.navLink}>IMPACT</a>
              <a href="#team" className={styles.navLink}>TEAM</a>
            </>
          ) : (
            <>
              <Link href="/#problem" className={styles.navLink}>PROJECT</Link>
              <Link href="/#how-it-works" className={styles.navLink}>HOW IT WORKS</Link>
              <Link href="/#architecture" className={styles.navLink}>ARCHITECTURE</Link>
              <Link href="/#impact" className={styles.navLink}>IMPACT</Link>
              <Link href="/#team" className={styles.navLink}>TEAM</Link>
            </>
          )}
          <Link 
            href="/evidence" 
            className={`${styles.navLink} ${pathname === "/evidence" ? styles.active : ""}`}
          >
            EVIDENCE
          </Link>
          <Link 
            href="/presentation" 
            className={`${styles.navLink} ${pathname.startsWith("/presentation") ? styles.active : ""}`}
          >
            PRESENTATION
          </Link>
        </div>

        <div className={styles.actionGroup}>
          <a href="#demo" className={styles.actionBtn}>
            [ EXPLORE ECDAT ]
          </a>
        </div>
      </div>
    </nav>
  );
}
