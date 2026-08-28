"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import styles from "./Presentation.module.css";

export default function Presentation() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    // Slide 1: Title Slide
    {
      num: "01 / 06",
      topic: "PROJECT INITIALIZATION",
      title: "ECDAT",
      subtitle: "Enterprise Cryptographic Discovery & Analysis Tool",
      content: (
        <div className={styles.titleSlide}>
          <div className={styles.sihBanner}>
            <span className={styles.pulsingDot}></span>
            <span>SMART INDIA HACKATHON 2026</span>
          </div>
          
          <div className={styles.metaBox}>
            <div className={styles.metaRow}>
              <span>PROBLEM:</span>
              <span className={styles.monoValue}>SIH26164 (NTRO)</span>
            </div>
            <div className={styles.metaRow}>
              <span>THEME:</span>
              <span className={styles.monoValue}>BLOCKCHAIN & CYBERSECURITY</span>
            </div>
            <div className={styles.metaRow}>
              <span>TEAM ID:</span>
              <span className={styles.monoValue}>SIH2026-143 (LATENTMANIFOLD)</span>
            </div>
            <div className={styles.metaRow}>
              <span>INSTITUTION:</span>
              <span className={styles.monoValue}>DAYANANDA SAGAR UNIVERSITY</span>
            </div>
          </div>

          <div className={styles.rosterInline}>
            <strong>TEAM ROSTER:</strong> N Bharath (L), Shwetakshi S., Akhil V. N., Soham R. H., Vishwajith K., Anirudhha V. M.
          </div>
        </div>
      )
    },
    // Slide 2: Proposed Solution
    {
      num: "02 / 06",
      topic: "PROPOSED SOLUTION",
      title: "THE MIGRATION CHALLENGE",
      subtitle: "You cannot migrate what you cannot see.",
      content: (
        <div className={styles.slideGrid2}>
          <div>
            <h5 className={styles.slideSubHeader}>THE SYSTEMIC PROBLEM</h5>
            <p className={styles.slideText}>
              Enterprises depend on cryptography across multiple layers (legacy code, transitives, configurations, server certificates, and network handshakes). They lack a single, normalized, relationship-aware cryptographic catalog.
            </p>
            <div className={styles.accentCallout}>
              <strong>The Harvesting Threat:</strong> Quantum computers will compromise classical encryption (RSA/ECC). Without early discovery, organizations cannot transition to post-quantum cryptography (PQC) in time.
            </div>
          </div>
          <div className={styles.borderBox}>
            <h5 className={styles.slideSubHeader}>THE ECDAT ANSWER</h5>
            <ul className={styles.slideList}>
              <li><strong>Continuous Discovery:</strong> Automated discovery across code repositories, compiled binaries, containers, and live TLS handshakes.</li>
              <li><strong>Standardized Cataloging:</strong> Normalizes inputs into a canonical Cryptographic Bill of Materials (CBOM).</li>
              <li><strong>Mosca Assessment:</strong> Dynamic quantum priority scoring using Mosca’s Mosca equation.</li>
            </ul>
          </div>
        </div>
      )
    },
    // Slide 3: Technical Approach
    {
      num: "03 / 06",
      topic: "TECHNICAL APPROACH",
      title: "DISCOVERY & CBOM PIPELINE",
      subtitle: "Multi-Source Extraction and Structured Normalization",
      content: (
        <div className={styles.slideGrid2}>
          <div className={styles.borderBox}>
            <h5 className={styles.slideSubHeader}>1. PARSING & SCANNING LAYER</h5>
            <p className={styles.slideTextSmall}>
              - **Static Code**: Tree-sitter AST queries to flag cryptographic imports and API invocation arguments.
            </p>
            <p className={styles.slideTextSmall}>
              - **Binary & Layer Scans**: PE/ELF section entropy scans (LIEF) and container filesystem layer inspection.
            </p>
            <p className={styles.slideTextSmall}>
              - **Network negotiation**: Passive inspection of client TLS handshakes to log cipher version negotiation.
            </p>
          </div>
          <div>
            <h5 className={styles.slideSubHeader}>2. CANONICAL CBOM & GRAPH</h5>
            <p className={styles.slideTextSmall}>
              Raw outputs are parsed, deduplicated, and mapped to a CycloneDX-based CBOM JSON schema. 
            </p>
            <div className={styles.smallConsole}>
{`APPLICATION ──[uses]──> LIBRARY 
                      └──[implements]──> ALGORITHM 
                                            └──[protects]──> DATA`}
            </div>
            <p className={styles.slideTextSmall}>
              This relationship model is queried using Neo4j (Cypher) to compute the blast radius of vulnerable components.
            </p>
          </div>
        </div>
      )
    },
    // Slide 4: Feasibility & Viability
    {
      num: "04 / 06",
      topic: "FEASIBILITY & VIABILITY",
      title: "FEASIBILITY & SECURITY",
      subtitle: "Engineered to scale, secured by design.",
      content: (
        <div className={styles.slideGrid3}>
          <div className={styles.featureCol}>
            <span className="mono-tag-accent">TECHNICAL</span>
            <h6>Modular Parsers</h6>
            <p className={styles.slideTextSmall}>
              Utilizes decoupled scan workers (AST, dependency, binary, network) communicating via an API fabric. Scalable to massive repositories.
            </p>
          </div>
          <div className={styles.featureCol}>
            <span className="mono-tag-sage">OPERATIONAL</span>
            <h6>Agile Integration</h6>
            <p className={styles.slideTextSmall}>
              Integrates directly with Git Hooks and CI/CD pipelines to prevent developers from adding legacy cryptographic algorithms at build time.
            </p>
          </div>
          <div className={styles.featureCol}>
            <span className="mono-tag">SECURITY</span>
            <h6>Zero-Trust</h6>
            <p className={styles.slideTextSmall}>
              Isolated, ephemeral scan containers. Encrypted storage of findings, scoped RBAC logs, and strict workspace erasure guidelines.
            </p>
          </div>
        </div>
      )
    },
    // Slide 5: Implementation Workflow
    {
      num: "05 / 06",
      topic: "IMPLEMENTATION WORKFLOW",
      title: "THE 6-STAGE ENGINE",
      subtitle: "From observation to continuous verification.",
      content: (
        <div className={styles.workflowRow}>
          <div className={styles.wfNode}>
            <span className={styles.wfNum}>01</span>
            <h6>DISCOVER</h6>
            <p>Scan source code, binaries, and configurations.</p>
          </div>
          <div className={styles.wfArrow}>&rarr;</div>
          <div className={styles.wfNode}>
            <span className={styles.wfNum}>02</span>
            <h6>UNDERSTAND</h6>
            <p>Generate standard CBOM inventory.</p>
          </div>
          <div className={styles.wfArrow}>&rarr;</div>
          <div className={styles.wfNode}>
            <span className={styles.wfNum}>03</span>
            <h6>ASSESS</h6>
            <p>Calculate Mosca Quantum Risk priority.</p>
          </div>
          <div className={styles.wfArrow}>&rarr;</div>
          <div className={styles.wfNode}>
            <span className={styles.wfNum}>04</span>
            <h6>RECOMMEND</h6>
            <p>Select ML-KEM/ML-DSA candidates.</p>
          </div>
          <div className={styles.wfArrow}>&rarr;</div>
          <div className={styles.wfNode}>
            <span className={styles.wfNum}>05</span>
            <h6>MIGRATE</h6>
            <p>Output topological transition plan.</p>
          </div>
        </div>
      )
    },
    // Slide 6: Impact & Benefits
    {
      num: "06 / 06",
      topic: "IMPACT & BENEFITS",
      title: "TRANSITION TO READINESS",
      subtitle: "Actionable priority metrics over guesswork.",
      content: (
        <div className={styles.slideGrid2}>
          <div>
            <h5 className={styles.slideSubHeader}>KEY TRANSFORMATION DELIVERABLES</h5>
            <div className={styles.impactRow}>
              <strong>1. CRYPTOGRAPHIC AGILITY:</strong>
              <p className={styles.slideTextSmall}>Applications are made modular so that algorithms can be swapped out without rebuilding architecture.</p>
            </div>
            <div className={styles.impactRow}>
              <strong>2. ACTIONABLE MODERNIZATION:</strong>
              <p className={styles.slideTextSmall}>Provides engineering teams with clear migration sequencing instructions rather than static alarms.</p>
            </div>
          </div>
          <div className={styles.borderBox}>
            <h5 className={styles.slideSubHeader}>QUANTUM PREPARATION LEVEL</h5>
            <div className={styles.metricItem}>
              <span className={styles.metricVal}>CBOM</span>
              <span className={styles.metricLbl}>Unified Inventory Standard</span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricVal}>MOSCA</span>
              <span className={styles.metricLbl}>Equation-based Prioritization</span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricVal}>PQC</span>
              <span className={styles.metricLbl}>ML-KEM / ML-DSA Standardization Ready</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Navigation handlers
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Space") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="technical-grid min-h-screen flex flex-col">
      <Navbar />

      <main className={styles.presentationWrapper}>
        <div className="container flex-grow flex flex-col justify-center">
          
          <div className={styles.slideFrame}>
            <div className={styles.slideHeader}>
              <div className={styles.slideTopic}>
                <span className={styles.pulsingDotSmall}></span>
                <span>{slides[currentSlide].topic}</span>
              </div>
              <span className={styles.slideNumLabel}>{slides[currentSlide].num}</span>
            </div>

            <div className={styles.slideBody}>
              <div className={styles.titleArea}>
                <h1 className={styles.slideTitle}>{slides[currentSlide].title}</h1>
                <p className={styles.slideSubtitle}>{slides[currentSlide].subtitle}</p>
              </div>
              
              <div className={styles.slideContent}>
                {slides[currentSlide].content}
              </div>
            </div>

            <div className={styles.slideFooter}>
              <div className={styles.controls}>
                <button 
                  className={styles.controlBtn} 
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                >
                  &larr; PREVIOUS
                </button>
                <div className={styles.dotsIndicator}>
                  {slides.map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`${styles.dot} ${currentSlide === idx ? styles.activeDot : ""}`}
                      onClick={() => setCurrentSlide(idx)}
                    ></span>
                  ))}
                </div>
                <button 
                  className={styles.controlBtn} 
                  onClick={nextSlide}
                  disabled={currentSlide === slides.length - 1}
                >
                  NEXT &rarr;
                </button>
              </div>

              <div className={styles.qaAction}>
                <Link href="/evidence" className={styles.qaBtn}>
                  [ GO TO EVIDENCE ROOM &nearr; ]
                </Link>
              </div>
            </div>
          </div>
          
        </div>
      </main>
      
      <div className={styles.deckFooter}>
        <span>SIH 2026 · PROBLEM SIH26164 · NTRO · TEAM LATENTMANIFOLD · ID SIH2026-143</span>
      </div>
    </div>
  );
}
