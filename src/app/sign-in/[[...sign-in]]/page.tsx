import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import styles from "./SignIn.module.css";

export default function SignInPage() {
  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <Link href="/" className={styles.logo} style={{ textDecoration: 'none' }}>
          Latent<span className={styles.logoAccent}>Manifold</span>
        </Link>
        <h1 className={styles.tagline}>
          Enterprise Cryptographic Discovery & Analysis
        </h1>
        <div className={styles.pillsContainer}>
          <div className={styles.pill}>Automated Source Scanning</div>
          <div className={styles.pill}>PQC Risk Assessment</div>
          <div className={styles.pill}>Migration Recommendations</div>
        </div>
        <div className={styles.badge}>
          <div className={styles.badgeDot}></div>
          Smart India Hackathon 2026 (SIH26164)
        </div>
      </div>
      <div className={styles.rightPanel}>
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: {
                backgroundColor: "#B95532",
                "&:hover": {
                  backgroundColor: "#A04A2B",
                }
              }
            }
          }}
        />
      </div>
    </div>
  );
}
