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
    {
      id: "nav-home",
      category: "NAVIGATION",
      title: "Go to Home Portal",
      subtitle: "Return to the main landing portal page",
      action: () => router.push("/"),
      shortcut: "G H"
    },
    {
      id: "nav-prototype",
      category: "NAVIGATION",
      title: "Go to Command Center Dashboard",
      subtitle: "Analyze CBOM inventory and systems forecasts",
      action: () => router.push("/prototype"),
      shortcut: "G D"
    },
    {
      id: "nav-evidence",
      category: "NAVIGATION",
      title: "Go to Research Evidence Room",
      subtitle: "Inspect the 22-phase academic transition matrix",
      action: () => router.push("/evidence"),
      shortcut: "G E"
    },
    {
      id: "nav-presentation",
      category: "NAVIGATION",
      title: "Go to Presentation Slides",
      subtitle: "View the official 6-slide deck companion",
      action: () => router.push("/presentation"),
      shortcut: "G P"
    },
    {
      id: "action-rescan",
      category: "ACTIONS",
      title: "Trigger Ingestion Re-Scan",
      subtitle: "Force a metadata collection run on dashboard assets",
      action: () => {
        router.push("/prototype");
        // Custom event to communicate scan trigger
        window.dispatchEvent(new Event("trigger-ecdat-rescan"));
      },
      shortcut: "R S"
    },
    {
      id: "action-quby",
      category: "ACTIONS",
      title: "Ask Quby for status update",
      subtitle: "Open the Quantum Sentinel speech notification card",
      action: () => {
        window.dispatchEvent(new Event("trigger-quby-speech"));
      },
      shortcut: "Q A"
    }
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
