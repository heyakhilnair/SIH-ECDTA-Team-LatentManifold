"use client";

import PageHeader from "@/components/PageHeader";
import { useState } from "react";
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
            {activeItem === "Authentication" ? (
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
