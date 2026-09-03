"use client";

import PageHeader from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { useWorkspace } from "@/components/WorkspaceWrapper";
import styles from "./settings.module.css";

const SETTINGS_SECTIONS = [
  {
    category: "ORGANIZATION",
    items: ["General", "Members", "Teams", "Roles & Permissions", "Workspaces"]
  },
  {
    category: "SECURITY",
    items: ["Authentication", "SSO / SAML", "SCIM", "MFA", "Sessions", "API Keys", "Service Accounts"]
  },
  {
    category: "DISCOVERY",
    items: ["Scan Policies", "Scanner Configuration", "Scheduling", "Source Integrations", "Exclusions"]
  },
  {
    category: "CRYPTOGRAPHY",
    items: ["Risk Policies", "Algorithm Policies", "PQC Policies", "Compliance Policies"]
  },
  {
    category: "INTEGRATIONS",
    items: ["GitHub", "GitLab", "Azure DevOps", "SIEM", "Ticketing", "Webhooks"]
  },
  {
    category: "AI",
    items: ["AI Provider", "Local LLM", "RAG Configuration", "Data Handling"]
  },
  {
    category: "NOTIFICATIONS",
    items: ["Email", "Webhooks", "Alerts"]
  },
  {
    category: "AUDIT",
    items: ["Audit Logs", "Data Retention"]
  },
  {
    category: "SYSTEM",
    items: ["API", "Usage", "System Health"]
  }
];

export default function SettingsPage() {
  const [activeItem, setActiveItem] = useState("General");
  const { getToken, isLoaded, userId } = useAuth();
  const workspace = useWorkspace();

  const [threatHorizon, setThreatHorizon] = useState<number | null>(null);
  const [savingHorizon, setSavingHorizon] = useState(false);
  const [horizonSaved, setHorizonSaved] = useState(false);
  const [horizonError, setHorizonError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    api.workspace.getMe(getToken)
      .then((res) => setThreatHorizon(res.threat_horizon_years ?? 12))
      .catch(() => {});
  }, [isLoaded, userId, getToken]);

  const saveThreatHorizon = async () => {
    if (threatHorizon == null) return;
    setSavingHorizon(true);
    setHorizonError(null);
    setHorizonSaved(false);
    try {
      await api.workspace.updateSettings(threatHorizon, getToken);
      setHorizonSaved(true);
      setTimeout(() => setHorizonSaved(false), 2500);
    } catch (err: any) {
      setHorizonError(err.message || "Failed to save");
    } finally {
      setSavingHorizon(false);
    }
  };

  return (
    <div className={styles.container}>
      <PageHeader 
        breadcrumbs={[
          { label: "System" },
          { label: "Settings" }
        ]}
        title="Settings"
        description="Manage organization preferences, security policies, and discovery configuration."
      />
      
      <div className={styles.settingsLayout}>
        <aside className={styles.settingsNav}>
          {SETTINGS_SECTIONS.map((section) => (
            <div key={section.category} className={styles.navSection}>
              <h4 className={styles.navCategory}>{section.category}</h4>
              <ul className={styles.navList}>
                {section.items.map(item => (
                  <li 
                    key={item} 
                    className={`${styles.navItem} ${activeItem === item ? styles.active : ""}`}
                    onClick={() => setActiveItem(item)}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
        
        <main className={styles.settingsContent}>
          <div className={styles.contentHeader}>
            <h2>{activeItem}</h2>
            <p>Manage {activeItem.toLowerCase()} settings for your organization.</p>
          </div>
          
          <div className={styles.settingsCard}>
            {activeItem === "Risk Policies" ? (
              <div className={styles.mockForm}>
                <div className={styles.formGroup}>
                  <label>Threat Horizon — Z (years)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={0.5}
                    value={threatHorizon ?? ""}
                    onChange={(e) => setThreatHorizon(parseFloat(e.target.value))}
                    className={styles.input}
                    disabled={threatHorizon == null}
                  />
                  <span className={styles.helpText}>
                    Mosca's inequality: X (data lifetime) + Y (migration time) &gt; Z (this value) marks an
                    asset CRITICAL. Changing Z recomputes risk for every asset in this workspace immediately.
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <button className={styles.btnSecondary} onClick={saveThreatHorizon} disabled={savingHorizon || threatHorizon == null}>
                    {savingHorizon ? "Saving & recalculating risk..." : "Save"}
                  </button>
                  {horizonSaved && <span style={{ marginLeft: "0.75rem", color: "var(--color-sage, #687563)" }}>Saved — risk scores updated.</span>}
                  {horizonError && <span style={{ marginLeft: "0.75rem", color: "#B91C1C" }}>{horizonError}</span>}
                </div>
              </div>
            ) : activeItem === "Authentication" ? (
              <div className={styles.mockForm}>
                <div className={styles.formGroup}>
                  <label>MFA Enforced</label>
                  <div className={styles.toggleActive}>
                    <div className={styles.toggleKnob}></div>
                  </div>
                  <span className={styles.helpText}>Require all members to use Multi-Factor Authentication</span>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Session Timeout (Minutes)</label>
                  <input type="number" defaultValue={60} className={styles.input} />
                </div>

                <div className={styles.formGroup}>
                  <label>API Keys</label>
                  <div className={styles.dataRow}>
                    <span>3 Active Keys</span>
                    <button className={styles.btnSecondary}>Manage Keys</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.placeholderState}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                <h3>{activeItem} Settings Unavailable</h3>
                <p>This configuration panel has not yet been integrated into the current LatentManifold backend deployment.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
