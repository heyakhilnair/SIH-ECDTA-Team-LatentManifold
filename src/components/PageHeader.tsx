"use client";

import styles from "./PageHeader.module.css";
import Link from "next/link";
import { ReactNode } from "react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs: Breadcrumb[];
  title: string;
  description: string;
  actions?: ReactNode;
  metrics?: { label: string; value: string | number }[];
}

export default function PageHeader({ breadcrumbs, title, description, actions, metrics }: PageHeaderProps) {
  return (
    <div className={styles.headerContainer}>
      <nav className={styles.breadcrumbs}>
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className={styles.crumbItem}>
            {crumb.href ? (
              <Link href={crumb.href} className={styles.crumbLink}>
                {crumb.label}
              </Link>
            ) : (
              <span className={styles.crumbCurrent}>{crumb.label}</span>
            )}
            {idx < breadcrumbs.length - 1 && <span className={styles.crumbSeparator}>/</span>}
          </span>
        ))}
      </nav>
      
      <div className={styles.headerMain}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
        
        {metrics && metrics.length > 0 && (
          <div className={styles.metricsArea}>
            {metrics.map((m, idx) => (
              <div key={idx} className={styles.metric}>
                <span className={styles.metricValue}>{m.value}</span>
                <span className={styles.metricLabel}>{m.label}</span>
              </div>
            ))}
          </div>
        )}

        {actions && (
          <div className={styles.actionsArea}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
