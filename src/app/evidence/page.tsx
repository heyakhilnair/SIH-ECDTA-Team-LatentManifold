"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import styles from "./Evidence.module.css";

export default function Evidence() {
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);

  const phases = [
    { id: 1, title: "Cryptography Fundamentals", status: "RESEARCHED", purpose: "Investigate classical symmetric & asymmetric ciphers, hashing, and signature schemes.", keyConcepts: ["AES", "RSA", "ECC", "SHA-2", "Signatures"], source: "Phase 1 - ECDAT Research Foundation" },
    { id: 2, title: "Quantum Computing & Quantum Threats", status: "RESEARCHED", purpose: "Understand Shor's and Grover's algorithms and their mathematical threat to RSA/ECC.", keyConcepts: ["Shor's Algorithm", "Grover's Algorithm", "Quantum Bit (Qubit)", "CRQC"], source: "Phase 2 - ECDAT Research Foundation" },
    { id: 3, title: "Post-Quantum Cryptography", status: "RESEARCHED", purpose: "Analyze lattice-based, hash-based, code-based, and multivariate ciphers.", keyConcepts: ["Lattice Cryptography", "ML-KEM", "ML-DSA", "NIST Standards"], source: "Phase 3 - ECDAT Research Foundation" },
    { id: 4, title: "Enterprise Cryptographic Ecosystem", status: "RESEARCHED", purpose: "Document how cryptography is integrated across software stacks, APIs, and infrastructure.", keyConcepts: ["SSL/TLS", "KMS / HSM", "Code Signature", "Secrets Management"], source: "Phase 4 - ECDAT Research Foundation" },
    { id: 5, title: "Cryptographic Discovery, CBOM & Asset Inventory", status: "IMPLEMENTED", purpose: "Define schemas to represent cryptographic assets inside software bills of materials.", keyConcepts: ["CBOM Specs", "Software Cataloging", "Metadata Normalization"], source: "Phase 5 - ECDAT Research Foundation" },
    { id: 6, title: "Quantum Risk Assessment & Mosca's Method", status: "IMPLEMENTED", purpose: "Model risk priority dynamically based on Mosca's data lifetime equations.", keyConcepts: ["Mosca's Theorem", "Data Lifetime", "Migration Complexity"], source: "Phase 6 - ECDAT Research Foundation" },
    { id: 7, title: "PQC Recommendation", status: "IN DEVELOPMENT", purpose: "Establish evaluation metrics for picking post-quantum cryptographic candidates.", keyConcepts: ["NIST FIPS 203/204", "Bandwidth Overhead", "Latency Margins"], source: "Phase 7 - ECDAT Research Foundation" },
    { id: 8, title: "AI-Powered Cryptographic Code Analysis", status: "IN DEVELOPMENT", purpose: "Leverage AST parsing and explainable AI to contextualize security vulnerabilities.", keyConcepts: ["Tree-sitter AST", "Explainable AI (XAI)", "Vulnerability Remediation"], source: "Phase 8 - ECDAT Research Foundation" },
    { id: 9, title: "Cryptographic Knowledge Graph", status: "IMPLEMENTED", purpose: "Build a multi-layered relationship catalog linking application components to keys.", keyConcepts: ["Graph Schema", "Transitive Dependency", "Neo4j / Cypher Query"], source: "Phase 9 - ECDAT Research Foundation" },
    { id: 10, title: "Enterprise Scanning & Discovery Fabric", status: "IMPLEMENTED", purpose: "Implement specialized code, dependency, and certificate extraction workers.", keyConcepts: ["AST Parser", "YARA Engine", "X509 Cert Parser"], source: "Phase 10 - ECDAT Research Foundation" },
    { id: 11, title: "CBOM Data Model & Normalization", status: "IMPLEMENTED", purpose: "Create normalizers to merge distinct parser formats into a single CBOM JSON file.", keyConcepts: ["Deduplication Rules", "SPDX Extension", "Canonical Format"], source: "Phase 11 - ECDAT Research Foundation" },
    { id: 12, title: "Quantum Risk Engine", status: "IMPLEMENTED", purpose: "Translate Mosca inputs and network posture into numerical priority levels.", keyConcepts: ["Mosca Risk Matrix", "Vulnerability Scoring", "Threat Forecast"], source: "Phase 12 - ECDAT Research Foundation" },
    { id: 13, title: "PQC Recommendation Engine & Crypto-Agility", status: "IN DEVELOPMENT", purpose: "Build decision templates that select and configure ML-KEM/ML-DSA candidates.", keyConcepts: ["Crypto-Agility", "Hybrid Negotiation", "Algorithmic Fallbacks"], source: "Phase 13 - ECDAT Research Foundation" },
    { id: 14, title: "AI Intelligence & Explainable Reasoning", status: "IN DEVELOPMENT", purpose: "Configure RAG models bounded by deterministic scan outputs for explainable Q&A.", keyConcepts: ["RAG Boundaries", "Contextual Prompting", "PR Diff Generation"], source: "Phase 14 - ECDAT Research Foundation" },
    { id: 15, title: "Multi-Source Discovery Engine", status: "IMPLEMENTED", purpose: "Integrate binary scanners (LIEF) and container layers inspection into the core parser.", keyConcepts: ["LIEF", "Layer Unzipping", "Static Signature Scans"], source: "Phase 15 - ECDAT Research Foundation" },
    { id: 16, title: "Knowledge Graph, Dependencies & Blast Radius", status: "IMPLEMENTED", purpose: "Model blast radius dynamically by traversing graph paths between apps and data.", keyConcepts: ["Blast Radius Index", "Topological Graph Search", "Critical Paths"], source: "Phase 16 - ECDAT Research Foundation" },
    { id: 17, title: "ECDAT Command Center & Risk Dashboard", status: "IN DEVELOPMENT", purpose: "Design a unified command dashboard showing CBOM assets, risk priorities, and plans.", keyConcepts: ["Dashboard UI", "Heatmaps", "Actionable Alerts"], source: "Phase 17 - ECDAT Research Foundation" },
    { id: 18, title: "Migration Planning / Operational Intelligence", status: "ARCHITECTED", purpose: "Design task schedulers that output topological build order for code modernization.", keyConcepts: ["Topological Sorting", "Migration Workbooks", "Pre-requisite Chains"], source: "Phase 18 - ECDAT Research Foundation" },
    { id: 19, title: "Security Architecture & Zero Trust", status: "ARCHITECTED", purpose: "Audit the tool security to guarantee that local workspaces erase code and tokens post-scan.", keyConcepts: ["Workspace Deletion", "Credential Hashing", "Zero-Trust Agent"], source: "Phase 19 - ECDAT Research Foundation" },
    { id: 20, title: "Testing, Validation & Benchmarking", status: "IMPLEMENTED", purpose: "Perform pipeline correctness checks using benchmark cryptographic repositories.", keyConcepts: ["Pipeline Tests", "Detection Precision", "False Positive Audit"], source: "Phase 20 - ECDAT Research Foundation" },
    { id: 21, title: "Complete Technical Architecture", status: "ARCHITECTED", purpose: "Synthesize ingestion, scanners, normalizers, graphs, engines, and portals.", keyConcepts: ["Blueprint Synthesizer", "API Gateway", "Message Broker"], source: "Phase 21 - ECDAT Research Foundation" },
    { id: 22, title: "Final Productization & SIH Strategy", status: "IMPLEMENTED", purpose: "Package ECDAT for hackathon submission and construct Vercel web presentation.", keyConcepts: ["SIH Deliverables", "Slide Synchronization", "QR Navigation"], source: "Phase 22 - ECDAT Research Foundation" },
  ];

  const references = [
    {
      id: "SOURCE 001",
      org: "NIST",
      title: "FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism Standard",
      year: "2024",
      usedFor: "Guided our integration profiles and key sizes for the ML-KEM (Kyber) post-quantum candidate.",
      link: "https://csrc.nist.gov/pubs/fips/203/ipd"
    },
    {
      id: "SOURCE 002",
      org: "NIST",
      title: "FIPS 204: Module-Lattice-Based Digital Signature Standard",
      year: "2024",
      usedFor: "Used to model packet constraints and validation overheads for ML-DSA (Dilithium) digital signature implementations.",
      link: "https://csrc.nist.gov/pubs/fips/204/ipd"
    },
    {
      id: "SOURCE 003",
      org: "Michele Mosca",
      title: "Cybersecurity in a Quantum World: Will We Be Ready?",
      year: "2018",
      usedFor: "Formed the complete mathematical foundation for the ECDAT Quantum Risk Priority calculation formula (X + Y > Z).",
      link: "https://arxiv.org/abs/1510.07859"
    },
    {
      id: "SOURCE 004",
      org: "OWASP",
      title: "Software Bill of Materials (SBOM) and CBOM Specifications Guide",
      year: "2023",
      usedFor: "Helped structure the fields and components for the Cryptographic Bill of Materials normalization schema.",
      link: "https://owasp.org/www-project-integration-standards/cbom/"
    },
    {
      id: "SOURCE 005",
      org: "IETF / RFC 8446",
      title: "The Transport Layer Security (TLS) Protocol Version 1.3",
      year: "2018",
      usedFor: "Defined standard cipher names and network formats utilized inside our Network Handshake scanner parser.",
      link: "https://datatracker.ietf.org/doc/html/rfc8446"
    },
    {
      id: "SOURCE 006",
      org: "CISA",
      title: "Preparing for Post-Quantum Cryptography: CISA Quantum Transition Roadmap",
      year: "2023",
      usedFor: "Shaped our migration planning steps, grouping assets by business criticality and compliance rules.",
      link: "https://www.cisa.gov/resources-tools/resources/preparing-post-quantum-cryptography"
    }
  ];

  return (
    <div className="technical-grid min-h-screen">
      <Navbar />

      <header className={styles.evidenceHero}>
        <div className="container">
          <div className={styles.heroEyebrow}>
            <span>EVIDENCE ROOM</span>
            <span className={styles.separator}>·</span>
            <span>RESEARCH FOUNDATION</span>
          </div>
          <h1>ECDAT EVIDENCE ROOM</h1>
          <p className={styles.heroSub}>
            Research, technical specifications, academic foundations, and acknowledgements supporting the design of ECDAT.
          </p>
        </div>
      </header>

      {/* 22-Phase Timeline Section */}
      <section className={styles.timelineSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-accent">TIMELINE</span>
            <h2>22-PHASE RESEARCH TIMELINE</h2>
            <p className={styles.sectionDesc}>
              Click any phase below to inspect its research scope, technical concepts, and development status.
            </p>
          </div>

          <div className={styles.timelineGrid}>
            <div className={styles.phasesGrid}>
              {phases.map((ph, idx) => (
                <button
                  key={ph.id}
                  className={`${styles.phaseCard} ${selectedPhase === idx ? styles.activePhaseCard : ""}`}
                  onClick={() => setSelectedPhase(idx)}
                >
                  <div className={styles.phaseCardHeader}>
                    <span className={styles.phaseNum}>PHASE {ph.id.toString().padStart(2, "0")}</span>
                    <span className={`mono-tag-sage ${styles.statusTag}`}>{ph.status}</span>
                  </div>
                  <h4 className={styles.phaseTitle}>{ph.title}</h4>
                </button>
              ))}
            </div>

            <div className={styles.detailsColumn}>
              {selectedPhase !== null ? (
                <div className={styles.detailsCard}>
                  <div className={styles.detailsHeader}>
                    <h3>
                      <span className={styles.accentText}>PHASE {phases[selectedPhase].id.toString().padStart(2, "0")}</span><br />
                      {phases[selectedPhase].title}
                    </h3>
                    <span className="mono-tag-accent">{phases[selectedPhase].status}</span>
                  </div>

                  <div className={styles.detailsBody}>
                    <div className={styles.detailGroup}>
                      <h5>RESEARCH & DEVELOPMENT PURPOSE</h5>
                      <p>{phases[selectedPhase].purpose}</p>
                    </div>

                    <div className={styles.detailGroup}>
                      <h5>KEY CRYPTOGRAPHIC CONCEPTS</h5>
                      <div className={styles.conceptsTags}>
                        {phases[selectedPhase].keyConcepts.map((c, i) => (
                          <span key={i} className="mono-tag">{c}</span>
                        ))}
                      </div>
                    </div>

                    <div className={styles.detailGroup}>
                      <h5>SOURCE CITATION</h5>
                      <p className={styles.monoSource}>{phases[selectedPhase].source}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.detailsPlaceholder}>
                  <p>SELECT A RESEARCH PHASE FROM THE TIMELINE TO INSPECT METHODOLOGY EVIDENCE.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* References Section */}
      <section className={styles.referencesSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-sage">BIBLIOGRAPHY</span>
            <h2>TECHNICAL REFERENCES</h2>
            <p className={styles.sectionDesc}>
              Formal references that guided the development of the ECDAT scanning, normalization, and PQC engine layers.
            </p>
          </div>

          <div className={styles.referencesGrid}>
            {references.map((ref) => (
              <div key={ref.id} className={styles.refCard}>
                <div className={styles.refHeader}>
                  <span className={styles.refSourceId}>{ref.id}</span>
                  <span className="mono-tag">{ref.org}</span>
                </div>
                <h4 className={styles.refTitle}>{ref.title}</h4>
                <div className={styles.refMeta}>
                  <span>YEAR: {ref.year}</span>
                </div>
                <p className={styles.refUsage}>
                  <strong>USED FOR:</strong> {ref.usedFor}
                </p>
                <a href={ref.link} target="_blank" rel="noopener noreferrer" className={styles.refLinkBtn}>
                  [ OPEN SOURCE &nearr; ]
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Documentation References */}
      <section className={styles.internalDocsSection}>
        <div className="container">
          <div className={styles.internalDocsCard}>
            <h4>PROJECT ARCHIVE & MASTER FILES</h4>
            <p>
              This architecture is grounded in the team's canonical project dossier, comprising the ECDAT Project Master Context PDF, which sets out problem constraints for SIH26164 under NTRO, and the 22 technical research phases.
            </p>
            <div className={styles.docBadges}>
              <span className="mono-tag-accent">ECDAT_MASTER_CONTEXT.PDF</span>
              <span className="mono-tag-sage">PHASES_1_TO_22_COMPENDIUM</span>
            </div>
          </div>
        </div>
      </section>

      {/* Acknowledgements */}
      <section className={styles.ackSection}>
        <div className="container">
          <div className={styles.ackBox}>
            <span className="mono-tag-sage">ACKNOWLEDGEMENT</span>
            <h2>FACULTY MENTOR GUIDANCE</h2>
            <blockquote>
              &quot;The LatentManifold team acknowledges the guidance and mentorship provided throughout the research, architecture, and development of ECDAT.&quot;
            </blockquote>
            <div className={styles.mentorBio}>
              <h5>Dr. Basavaraj N Hiremath</h5>
              <p>Department of Computer Science and Engineering | Dayananda Sagar University</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
