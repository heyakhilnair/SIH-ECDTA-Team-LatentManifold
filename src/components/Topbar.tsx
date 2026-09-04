"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { useWorkspace } from "./WorkspaceWrapper";
import styles from "./Topbar.module.css";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TourGuide, { useTourAutoOpen } from "./TourGuide";
import ActivityIcon from "./ActivityIcon";
import { api } from "@/lib/api";
import { ACTIVITY_LABELS_COMPACT, type ActivityItem } from "@/lib/activityLabels";
import { formatRelativeTime, formatISTDateTime } from "@/lib/formatTime";

type Menu = "switcher" | "new" | "notif" | "search" | null;

export default function Topbar() {
  const workspace = useWorkspace();
  const { getToken, isLoaded, userId } = useAuth();
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);

  const [openMenu, setOpenMenu] = useState<Menu>(null);
  const [tourOpen, setTourOpen] = useTourAutoOpen();

  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [notifications, setNotifications] = useState<ActivityItem[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ sources: any[]; assets: any[] }>({ sources: [], assets: [] });
  const [searching, setSearching] = useState(false);

  const toggle = (m: Menu) => setOpenMenu((cur) => (cur === m ? null : m));

  // Click-outside closes whatever dropdown is open.
  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openMenu]);

  // Real live counts — active scan jobs (same status filter Mission Control
  // already uses) and the 6 most recent audit events, refreshed every 30s.
  // Replaces what used to be a hardcoded "◌ 2" and a dead bell icon.
  useEffect(() => {
    if (!isLoaded || !userId || !workspace?.id) return;
    let cancelled = false;
    const load = () => {
      Promise.all([
        api.jobs.list(workspace.id, getToken).catch(() => []),
        api.activity.list(workspace.id, getToken, { limit: 6 }).catch(() => ({ items: [] })),
      ]).then(([jobs, activityRes]) => {
        if (cancelled) return;
        setActiveJobsCount((jobs || []).filter((j: any) => j.status === "running" || j.status === "queued").length);
        setNotifications(activityRes.items || []);
      });
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // getToken deliberately omitted — Clerk returns a new function reference
    // on every render, which would re-fire this effect every render and
    // hammer the API in a loop (the exact bug WorkspaceWrapper.tsx already
    // documents and works around the same way).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, workspace?.id]);

  // Debounced real search across real sources + real assets (server-side
  // `search` filter on algorithm name/family) — replaces the old search bar,
  // which only dispatched a fake ⌘K keydown that nothing was listening for.
  useEffect(() => {
    if (openMenu !== "search" || !searchQuery.trim() || !workspace?.id) {
      setSearchResults({ sources: [], assets: [] });
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      const q = searchQuery.toLowerCase();
      Promise.all([
        api.sources.list(workspace.id, getToken).catch(() => []),
        api.assets.list(workspace.id, getToken, { search: searchQuery, limit: 6 }).catch(() => []),
      ]).then(([sources, assets]) => {
        setSearchResults({
          sources: (sources || []).filter((s: any) => s.name?.toLowerCase().includes(q)).slice(0, 4),
          assets: assets || [],
        });
        setSearching(false);
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, openMenu, workspace?.id]);

  const go = (path: string) => {
    setOpenMenu(null);
    router.push(path);
  };

  return (
    <header className={styles.topbar} ref={rootRef}>
      <div className={styles.leftSide}>
        <div className={styles.orgSwitcher} onClick={() => toggle("switcher")}>
          <div className={styles.orgDetails}>
            <span className={styles.orgName}>{workspace?.name || "Workspace"}</span>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        {openMenu === "switcher" && (
          <div className={styles.switcherDropdown}>
            <div className={styles.dropdownSection}>
              <span className={styles.dropdownLabel}>WORKSPACE</span>
              <div className={styles.dropdownActiveItem}>
                <div className={styles.orgName}>{workspace?.name || "Workspace"}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "#999", marginTop: "4px" }}>
                  ID {workspace?.id?.slice(0, 8)} · created {workspace?.created_at ? formatISTDateTime(workspace.created_at) : "—"}
                </div>
              </div>
            </div>
            <div className={styles.dropdownDivider} />
            {/* ECDAT is single-workspace-per-account today (no Clerk
                Organizations / multi-workspace support yet — see
                docs/TRACKER.md Phase 10). Showing a fake "Staging" /
                "Security Research" switcher list here would violate the
                project's own no-fake-data rule, so this is an honest info
                panel instead of a decorative switcher. */}
            <div className={styles.dropdownActions}>
              <button onClick={() => go("/prototype/settings")}>⚙ Workspace Settings</button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.centerSide}>
        <div className={styles.searchWrapper}>
          <div className={styles.searchBar} onClick={() => toggle("search")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            {openMenu === "search" ? (
              <input
                autoFocus
                className={styles.searchInput}
                placeholder="Search assets, repositories, scans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={styles.searchPlaceholder}>Search assets, repositories, scans...</span>
            )}
            <kbd className={styles.shortcutKey}>⌘K</kbd>
          </div>

          {openMenu === "search" && searchQuery.trim() && (
            <div className={styles.searchDropdown}>
              {searching ? (
                <div className={styles.searchEmpty}>Searching your real workspace data…</div>
              ) : searchResults.sources.length === 0 && searchResults.assets.length === 0 ? (
                <div className={styles.searchEmpty}>No matches in your registered sources or discovered assets.</div>
              ) : (
                <>
                  {searchResults.sources.length > 0 && (
                    <div className={styles.searchGroup}>
                      <span className={styles.dropdownLabel}>SOURCES</span>
                      {searchResults.sources.map((s: any) => (
                        <button key={s.id} className={styles.searchResult} onClick={() => go(`/prototype/sources`)}>
                          📦 {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.assets.length > 0 && (
                    <div className={styles.searchGroup}>
                      <span className={styles.dropdownLabel}>CRYPTOGRAPHIC ASSETS</span>
                      {searchResults.assets.map((a: any) => (
                        <button key={a.id} className={styles.searchResult} onClick={() => go(`/prototype/assets`)}>
                          {a.quantum_vulnerable ? "⚠️" : "🔒"} {a.algorithm_canonical}
                          <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#999" }}>{a.risk?.composite_risk_level}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.rightSide}>
        <div className={styles.actionGroup}>
          <div className={styles.newActionWrapper}>
            <button className={styles.newBtn} onClick={() => toggle("new")}>
              + New
            </button>
            {openMenu === "new" && (
              <div className={styles.newDropdown}>
                <span className={styles.dropdownLabel}>ADD</span>
                {/* "Add Repository" was a dead duplicate of "Add Source"
                    (ECDAT has one concept — a registered Source, shown as
                    "Repositories" in KPI cards) and "Create Migration Plan"
                    had no real handler and no corresponding feature — the
                    Migration Planner is driven by at-risk assets, not a
                    separate "create plan" action. Both dropped rather than
                    left as dead buttons; these two are real navigations. */}
                <button className={styles.dropdownBtn} onClick={() => go("/prototype/sources")}>
                  + Add Source
                </button>
                <button className={styles.dropdownBtn} onClick={() => go("/prototype/sources?force=true")}>
                  ▶ Run Discovery
                </button>
              </div>
            )}
          </div>

          <button className={styles.iconBtn} title={`${activeJobsCount} scan(s) running`} onClick={() => go("/prototype/scans")}>
            <span className={styles.scanIndicator}>
              <span className={activeJobsCount > 0 ? styles.scanDotActive : styles.scanDot}></span>
              {activeJobsCount}
            </span>
          </button>

          <div className={styles.newActionWrapper}>
            <button className={styles.iconBtn} title="Notifications" onClick={() => toggle("notif")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {notifications.length > 0 && <span className={styles.notifDot}></span>}
            </button>
            {openMenu === "notif" && (
              <div className={styles.notifDropdown}>
                <span className={styles.dropdownLabel}>RECENT ACTIVITY</span>
                {notifications.length === 0 ? (
                  <div className={styles.searchEmpty}>Nothing yet — run a scan to see real events here.</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={styles.notifRow} title={formatISTDateTime(n.created_at)}>
                      <ActivityIcon event={n.event} size={13} />
                      <span className={styles.notifText}>
                        <strong>{ACTIVITY_LABELS_COMPACT[n.event] || n.event}</strong>
                        {n.resource_type ? ` · ${n.resource_type}` : ""}
                      </span>
                      <span className={styles.notifTime}>{formatRelativeTime(n.created_at)}</span>
                    </div>
                  ))
                )}
                <Link href="/prototype/activity" className={styles.notifViewAll} onClick={() => setOpenMenu(null)}>
                  View full audit trail →
                </Link>
              </div>
            )}
          </div>

          <button className={styles.iconBtn} title="Help & Resources — take the product tour" onClick={() => setTourOpen(true)}>
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
      <TourGuide open={tourOpen} onClose={() => setTourOpen(false)} />
    </header>
  );
}
