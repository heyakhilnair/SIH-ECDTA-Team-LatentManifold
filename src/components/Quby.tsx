"use client";

import { useState } from "react";
import styles from "./Quby.module.css";

export default function Quby() {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.qubyWrapper}>
      {/* Speech Bubble */}
      {open && (
        <div className={styles.speechBubble}>
          <div className={styles.bubbleHeader}>
            <span>QUBY // QUANTUM SENTINEL</span>
            <button onClick={() => setOpen(false)} className={styles.closeBtn}>&times;</button>
          </div>
          <p className={styles.bubbleText}>
            Lattice stability: <strong>99.98%</strong>. Cryptographic drift detected on <strong>3 legacy assets</strong>. Shor's factor threat level: <strong>STABLE</strong> (ML-KEM-768 active).
          </p>
          <div className={styles.bubbleFooter}>
            <span>Logical Qubits Alert: 4096 required to break RSA</span>
          </div>
        </div>
      )}

      {/* Interactive Mascot Circle */}
      <button 
        onClick={() => setOpen(!open)} 
        className={styles.mascotBtn} 
        aria-label="Toggle Quby Quantum Sentinel"
      >
        <div className={styles.orbitContainer}>
          {/* Orbiting Ring 1 */}
          <div className={styles.ring1}></div>
          {/* Orbiting Ring 2 */}
          <div className={styles.ring2}></div>
          
          {/* Qubit Core */}
          <div className={styles.qubitCore}>
            <span className={styles.coreDot}></span>
          </div>
        </div>
      </button>
    </div>
  );
}
