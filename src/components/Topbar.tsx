"use client";

import { UserButton } from "@clerk/nextjs";
import { useWorkspace } from "./WorkspaceWrapper";
import styles from "./Topbar.module.css";
import { useState } from "react";

export default function Topbar() {
  const workspace = useWorkspace();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  
  return (
    <header className={styles.topbar}>
      <div className={styles.leftSide}>
        <div 
          className={styles.orgSwitcher} 
          onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
        >
          <div className={styles.orgDetails}>
            <span className={styles.orgName}>{workspace?.name || "Production"}</span>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        
        {isSwitcherOpen && (
          <div className={styles.switcherDropdown}>
            <div className={styles.dropdownSection}>
              <span className={styles.dropdownLabel}>CURRENT</span>
              <div className={styles.dropdownActiveItem}>
                <div className={styles.orgName}>{workspace?.name || "Production"}</div>
              </div>
            </div>
            <div className={styles.dropdownDivider} />
            <div className={styles.dropdownSection}>
              <span className={styles.dropdownLabel}>WORKSPACES</span>
              <div className={styles.dropdownItem}>
                <span className={styles.itemBulletActive}>●</span> {workspace?.name || "Production"}
              </div>
              <div className={styles.dropdownItem}>
                <span className={styles.itemBullet}>○</span> Staging
              </div>
              <div className={styles.dropdownItem}>
                <span className={styles.itemBullet}>○</span> Security Research
              </div>
            </div>
            <div className={styles.dropdownDivider} />
            <div className={styles.dropdownActions}>
              <button>+ Create Workspace</button>
              <button>⚙ Manage Workspaces</button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.centerSide}>
        <div 
          className={styles.searchBar}
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span className={styles.searchPlaceholder}>Search assets, repositories, scans...</span>
          <kbd className={styles.shortcutKey}>⌘K</kbd>
        </div>
      </div>

      <div className={styles.rightSide}>
        <div className={styles.actionGroup}>
          <div className={styles.newActionWrapper}>
            <button 
              className={styles.newBtn}
              onClick={() => setIsNewOpen(!isNewOpen)}
            >
              + New
            </button>
            {isNewOpen && (
              <div className={styles.newDropdown}>
                <span className={styles.dropdownLabel}>ADD</span>
                <button className={styles.dropdownBtn}>+ Add Source</button>
                <button className={styles.dropdownBtn}>+ Add Repository</button>
                <button className={styles.dropdownBtn}>+ Run Discovery</button>
                <button className={styles.dropdownBtn}>+ Create Migration Plan</button>
              </div>
            )}
          </div>
          
          <button className={styles.iconBtn} title="Active Scans">
            <span className={styles.scanIndicator}>◌ 2</span>
          </button>
          
          <button className={styles.iconBtn} title="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
          
          <button className={styles.iconBtn} title="Help & Resources">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </button>
        </div>

        <div className={styles.userMenu}>
          <UserButton 
            appearance={{
              elements: {
                userButtonAvatarBox: {
                  width: 32,
                  height: 32,
                  borderRadius: "6px"
                }
              }
            }}
          />
        </div>
      </div>
    </header>
  );
}
