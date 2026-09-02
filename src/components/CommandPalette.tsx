"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./CommandPalette.module.css";

interface CommandItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  action: () => void;
  shortcut?: string;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    // ALGORITHMS
    { id: "algo-1", category: "ALGORITHMS", title: "RSA-2048", subtitle: "Cryptographic Algorithm", action: () => router.push("/prototype/assets"), shortcut: "" },
    { id: "algo-2", category: "ALGORITHMS", title: "SHA-1", subtitle: "Cryptographic Hash Function", action: () => router.push("/prototype/assets"), shortcut: "" },
    
    // CRYPTO ASSETS
    { id: "asset-1", category: "CRYPTO ASSETS", title: "ASSET-001", subtitle: "src/auth/token.go • Production", action: () => router.push("/prototype/assets/ASSET-001"), shortcut: "" },
    { id: "asset-2", category: "CRYPTO ASSETS", title: "ASSET-018", subtitle: "config/crypto.yaml • Production", action: () => router.push("/prototype/assets/ASSET-018"), shortcut: "" },
    
    // REPOSITORIES
    { id: "repo-1", category: "REPOSITORIES", title: "auth-service", subtitle: "GitHub • 12 active findings", action: () => router.push("/prototype/sources"), shortcut: "" },
    { id: "repo-2", category: "REPOSITORIES", title: "payment-gateway", subtitle: "GitHub • 4 active findings", action: () => router.push("/prototype/sources"), shortcut: "" },
    
    // FINDINGS
    { id: "finding-1", category: "FINDINGS", title: "RSA-2048 in src/auth/token.go", subtitle: "High severity • Discovered today", action: () => router.push("/prototype/evidence"), shortcut: "" },
    
    // SCAN JOBS
    { id: "scan-1", category: "SCAN JOBS", title: "Enterprise Scan #1042", subtitle: "Completed 18 min ago", action: () => router.push("/prototype/scans"), shortcut: "" },
    
    // JUMP TO
    { id: "nav-mc", category: "JUMP TO", title: "Mission Control", subtitle: "Dashboard overview", action: () => router.push("/prototype"), shortcut: "G M" },
    { id: "nav-cbom", category: "JUMP TO", title: "CBOM Inventory", subtitle: "CycloneDX cryptographic bills of material", action: () => router.push("/prototype/cbom"), shortcut: "G C" },
    { id: "nav-graph", category: "JUMP TO", title: "Dependency Graph", subtitle: "Blast radius analysis", action: () => router.push("/prototype/graph"), shortcut: "G G" },
    
    // ACTIONS
    { id: "action-run", category: "ACTIONS", title: "Run Discovery", subtitle: "Start a new scan job", action: () => {}, shortcut: "R D" },
    { id: "action-add", category: "ACTIONS", title: "Add Source", subtitle: "Connect a repository or registry", action: () => {}, shortcut: "A S" },
    { id: "action-export", category: "ACTIONS", title: "Export CBOM", subtitle: "Download CycloneDX JSON", action: () => {}, shortcut: "E C" },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      
      if (!isOpen) return;

      // Handle palette navigation
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[activeIndex]) {
          filteredCommands[activeIndex].action();
          setIsOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeIndex, search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch("");
      setActiveIndex(0);
    }
  }, [isOpen]);

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase()) ||
    cmd.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) {
    // Show static keyboard shortcut tooltip at bottom left of screen
    return (
      <div className={styles.cmdKTooltip}>
        <span>Press</span>
        <kbd className={styles.kbd}>⌘ K</kbd>
        <span>to search</span>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={() => setIsOpen(false)}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        
        {/* Search Input Area */}
        <div className={styles.searchHeader}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, trigger audits, or summon companions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <span className={styles.escTip}>ESC</span>
        </div>

        {/* Filtered Command List */}
        <div className={styles.commandList}>
          {filteredCommands.length === 0 ? (
            <div className={styles.emptyList}>No actions found matching search queries.</div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <div
                key={cmd.id}
                className={`${styles.commandRow} ${index === activeIndex ? styles.activeRow : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  cmd.action();
                  setIsOpen(false);
                }}
              >
                <div className={styles.commandInfo}>
                  <span className={styles.cmdCategory}>{cmd.category}</span>
                  <h6 className={styles.cmdTitle}>{cmd.title}</h6>
                  <p className={styles.cmdSubtitle}>{cmd.subtitle}</p>
                </div>
                {cmd.shortcut && (
                  <span className={styles.cmdShortcut}>{cmd.shortcut}</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Instructions Footer */}
        <div className={styles.paletteFooter}>
          <div className={styles.navigationTips}>
            <span>Use</span>
            <kbd className={styles.miniKbd}>&uarr;</kbd>
            <kbd className={styles.miniKbd}>&darr;</kbd>
            <span>to navigate,</span>
            <kbd className={styles.miniKbd}>Enter</kbd>
            <span>to select.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
