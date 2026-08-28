import styles from "./Footer.module.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.topSection}>
          <div className={styles.brandInfo}>
            <span className={styles.logoText}>ECDAT</span>
            <p className={styles.description}>
              Enterprise Cryptographic Discovery & Analysis Tool
            </p>
          </div>
          <div className={styles.sihBlock}>
            <div className={styles.sihBanner}>
              <span className={styles.pulsingDot}></span>
              <span className={styles.bannerText}>SMART INDIA HACKATHON 2026</span>
            </div>
            <p className={styles.sihDetails}>
              Problem Statement: SIH26164 | Organization: NTRO
            </p>
          </div>
        </div>

        <div className={styles.divider}></div>

        <div className={styles.bottomSection}>
          <div className={styles.copyright}>
            © {currentYear} Team LatentManifold (SIH2026-143). school of Engineering, Dayananda Sagar University.
          </div>
          <div className={styles.metadata}>
            <span className={styles.metaItem}>ROLE: SOFTWARE MVP</span>
            <span className={styles.metaItem}>THEME: BLOCKCHAIN & CYBERSECURITY</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
