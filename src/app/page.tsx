"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ThreeManifold from "@/components/ThreeManifold";
import { motion } from "framer-motion";
import styles from "./Home.module.css";

export default function Home() {
  // State for Six-Stage Model
  const [activeStage, setActiveStage] = useState(0);
  
  // State for Asset Constellation
  const [activeAsset, setActiveAsset] = useState("source");
  
  // State for PQC recommendation candidates
  const [activeCandidate, setActiveCandidate] = useState("ml-kem");

  // State for Challenges matrix
  const [activeChallenge, setActiveChallenge] = useState(0);

  // State for Interactive Mosca Risk Calculator
  const [dataLifetime, setDataLifetime] = useState(8);
  const [migrationTime, setMigrationTime] = useState(5);
  const [threatHorizon, setThreatHorizon] = useState(12);

  // State for Interactive Graph Node
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Playground Terminal Simulator States
  const [scanCode, setScanCode] = useState(`import (
  "crypto/rsa"
  "crypto/sha1"
)

func ConnectSecurity() {
  // Establish connection
  key, _ := rsa.GenerateKey(rand.Reader, 2048)
  hasher := sha1.New()
  // ...
}`);
  const [scanStatus, setScanStatus] = useState("idle"); // idle, scanning, complete
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  
  // Copy button state
  const [copied, setCopied] = useState(false);
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const patchDiff = `diff --git a/main.go b/main.go
index 8f2b4c1..9a3f2d2 100644
--- a/main.go
+++ b/main.go
@@ -2,2 +2,2 @@ import (
-	"crypto/rsa"
-	"crypto/sha1"
+	"github.com/latentmanifold/ecdat/pqc/mlkem"
+	"crypto/sha256"
@@ -6,3 +6,3 @@ func ConnectSecurity() {
-	key, _ := rsa.GenerateKey(rand.Reader, 2048)
-	hasher := sha1.New()
+	key, _ := mlkem.GenerateKey768()
+	hasher := sha256.New()`;
  const [activeTabPlayground, setActiveTabPlayground] = useState("scanner"); // scanner, simulator, planner, game

  // Game states
  const [gameLevel, setGameLevel] = useState(1); // 1, 2, 3, completed
  const [harvestedCount, setHarvestedCount] = useState(0);
  const [currentNetworkPacket, setCurrentNetworkPacket] = useState({ id: 1, type: "RSA-1024 (Vulnerable)", safe: false });
  const [shorPeriodVal, setShorPeriodVal] = useState("");
  const [latticePlayerNoise, setLatticePlayerNoise] = useState(50);
  const [gameLogs, setGameLogs] = useState<string[]>(["[GAME INITIALIZED] Prepare cryptanalytic hack..."]);

  // Game loop effect for Level 1 packet rolling
  useEffect(() => {
    if (activeTabPlayground !== "game" || gameLevel !== 1) return;
    const packets = [
      { id: 1, type: "RSA-1024 (Vulnerable)", safe: false },
      { id: 2, type: "AES-256 (Safe)", safe: true },
      { id: 3, type: "SHA-1 (Vulnerable)", safe: false },
      { id: 4, type: "ML-KEM-768 (Safe)", safe: true },
      { id: 5, type: "Triple-DES (Vulnerable)", safe: false },
      { id: 6, type: "Curve25519 (Vulnerable to Shor's)", safe: false },
      { id: 7, type: "ML-DSA-65 (Safe)", safe: true },
    ];
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * packets.length);
      setCurrentNetworkPacket(packets[idx]);
    }, 1500);
    return () => clearInterval(interval);
  }, [activeTabPlayground, gameLevel]);

  // Shor's Simulator States
  const [secretMessage, setSecretMessage] = useState("SIH-2026-SECRET-KEY");
  const [encryptedClassical, setEncryptedClassical] = useState("");
  const [encryptedQuantum, setEncryptedQuantum] = useState("");
  const [classicalAttackStatus, setClassicalAttackStatus] = useState("idle"); // idle, attacking, cracked
  const [quantumAttackStatus, setQuantumAttackStatus] = useState("idle"); // idle, attacking, blocked
  const [classicalAttackLog, setClassicalAttackLog] = useState("");
  const [quantumAttackLog, setQuantumAttackLog] = useState("");

  // What-If Planner Scenario
  const [plannerScenario, setPlannerScenario] = useState("standard"); // standard, hybrid, accelerated

  // Ref for terminal scrolling
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const calculateRiskPriority = () => {
    const sum = dataLifetime + migrationTime;
    const difference = threatHorizon - sum;

    if (sum > threatHorizon) {
      return { level: "CRITICAL", class: styles.badgeCritical, color: "var(--color-accent)", text: `X + Y (${sum} years) exceeds Z (${threatHorizon} years). You are EXPOSED NOW to Harvest-Now-Decipher-Later attacks.` };
    } else if (difference <= 2) {
      return { level: "HIGH", class: styles.badgeHigh, color: "#E27B3C", text: `X + Y (${sum} years) is close to Z (${threatHorizon} years). Transition must begin immediately to avoid exposure.` };
    } else if (difference <= 6) {
      return { level: "MEDIUM", class: styles.badgeMedium, color: "#D3A248", text: `X + Y (${sum} years) is within Z (${threatHorizon} years). Active transition planning is required.` };
    } else {
      return { level: "LOW", class: styles.badgeLow, color: "var(--color-sage)", text: `Data lifetime and migration times are safe. Monitor quantum timeline shifts.` };
    }
  };

  const currentRisk = calculateRiskPriority();

  // Run Code Scanner Simulation
  const runCodeScan = () => {
    setScanStatus("scanning");
    setTerminalLogs([]);
    
    const logs = [
      "[ECDAT-PARSE] Initializing tree-sitter AST scanning engine...",
      "[ECDAT-PARSE] Target file: main.go (Golang source template)",
      "[ECDAT-AST] Traversing AST nodes... Found 2 imports.",
      "[ECDAT-AST] FLAG: import \"crypto/rsa\" is marked as CLASSICAL_ASYMMETRIC",
      "[ECDAT-AST] FLAG: import \"crypto/sha1\" is marked as LEGACY_VULNERABLE",
      "[ECDAT-AST] Analyzing function 'ConnectSecurity()'...",
      "[ECDAT-AST] FLAG: rsa.GenerateKey(..., 2048) -> Key length 2048 bits is susceptible to Shor's factoring algorithm.",
      "[ECDAT-CBOM] Mapping discovered assets to canonical CBOM nodes...",
      "[ECDAT-CBOM] Generated asset Node ID: ALGO-RSA-2048-001",
      "[ECDAT-CBOM] Generated asset Node ID: HASH-SHA1-002",
      "[ECDAT-GRAPH] Calculating blast radius... 1 dependent path discovered.",
      "[ECDAT-RISK] Evaluating quantum exposure (Mosca calculation)...",
      "[ECDAT-RISK] Exposure detected. System marked: HIGH PRIORITY RISK.",
      "[ECDAT-PQC] Querying post-quantum alternatives...",
      "[ECDAT-PQC] Recommended modernizer candidate: ML-KEM-768 (Kyber)",
      "[ECDAT-COMPLIANCE] Verification report: FAILED (RSA-2048/SHA-1 in use).",
      "[ECDAT-MIGRATE] Generating code modernization patch diff..."
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setTerminalLogs((prev) => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
        if (terminalEndRef.current) {
          terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        clearInterval(interval);
        setScanStatus("complete");
      }
    }, 250);
  };

  // Encrypt secrets for simulator
  useEffect(() => {
    // Mock Base64-like cypher for classical and lattice-like text for quantum
    if (secretMessage) {
      setEncryptedClassical(btoa(secretMessage).substring(0, 16) + "== [RSA-2048]");
      setEncryptedQuantum("Latt_[" + Array.from(secretMessage).map(c => c.charCodeAt(0).toString(16)).join(".").substring(0, 20) + "...] (ML-KEM)");
    } else {
      setEncryptedClassical("");
      setEncryptedQuantum("");
    }
  }, [secretMessage]);

  // Simulate Classical Shor's Attack
  const simulateClassicalAttack = () => {
    setClassicalAttackStatus("attacking");
    setClassicalAttackLog("Initializing virtual Shor's Quantum factoring processor...");
    
    setTimeout(() => {
      setClassicalAttackLog("Mapping prime factorization constraints on 4096 logical qubits...");
    }, 800);
    
    setTimeout(() => {
      setClassicalAttackLog("Executing modular exponentiation period-finding function...");
    }, 1600);

    setTimeout(() => {
      setClassicalAttackStatus("cracked");
      setClassicalAttackLog(`CRACKED: Factorization of N solved in 2.4 seconds.\nDecrypted Message: "${secretMessage}"`);
    }, 2400);
  };

  // Simulate Quantum-safe Attack
  const simulateQuantumAttack = () => {
    setQuantumAttackStatus("attacking");
    setQuantumAttackLog("Initializing virtual Shor's Quantum factoring processor...");
    
    setTimeout(() => {
      setQuantumAttackLog("Shor's factoring aborted: ML-KEM is not based on prime integer factorization.");
    }, 800);
    
    setTimeout(() => {
      setQuantumAttackLog("Executing lattice basis reduction attacks (BKZ-90 simulator)...");
    }, 1600);

    setTimeout(() => {
      setQuantumAttackStatus("blocked");
      setQuantumAttackLog("BLOCKED: Lattice dimension 768 remains secure.\nRemaining attack complexity: 2^150 operations.");
    }, 2400);
  };

  const getPlannerMetrics = () => {
    switch (plannerScenario) {
      case "hybrid":
        return {
          cost: "Medium",
          time: "4.5 Years",
          risk: "LOW (Dual-safe coverage)",
          steps: [
            "1. Generate dual-algorithm certificates (ECDSA + ML-DSA).",
            "2. Establish hybrid key negotiation in API Gateways.",
            "3. Progressively decommission pure RSA/ECC channels."
          ]
        };
      case "accelerated":
        return {
          cost: "High",
          time: "2.1 Years",
          risk: "ZERO EXPOSURE",
          steps: [
            "1. Absolute migration to ML-KEM and ML-DSA immediately.",
            "2. Emergency key rollover across KMS and HSM partitions.",
            "3. Enforce strict PR compliance blocking legacy algorithms."
          ]
        };
      default:
        return {
          cost: "Low",
          time: "8.5 Years",
          risk: "HIGH EXPOSURE (Mosca overlap)",
          steps: [
            "1. Discover classical crypto assets in code bases.",
            "2. Wait for vendor libraries to bundle FIPS PQC targets.",
            "3. Migrate infrastructure sections ad-hoc."
          ]
        };
    }
  };

  const currentPlanner = getPlannerMetrics();

  const stages = [
    {
      num: "01",
      name: "DISCOVER",
      desc: "Find cryptographic assets across the enterprise.",
      details: "Scans multiple source repositories, binary artifacts, cloud environments, container images, network configurations, certificates, and HSM/KMS setups.",
      technical: "Uses customized tree-sitter parsers, Semgrep rules, YARA patterns, and binary inspection (LIEF) to find cryptographic API calls and imports.",
      status: "IMPLEMENTED"
    },
    {
      num: "02",
      name: "UNDERSTAND",
      desc: "Normalize findings into a canonical CBOM.",
      details: "Processes raw scanner outputs from different sources and maps them into a unified Cryptographic Bill of Materials (CBOM) XML/JSON schema.",
      technical: "Applies structural deduplication and terminology normalizers to resolve naming differences (e.g., standardizing 'SHA256' vs 'SHA-256').",
      status: "IMPLEMENTED"
    },
    {
      num: "03",
      name: "ASSESS",
      desc: "Understand classical and quantum-related risk.",
      details: "Evaluates cryptographic assets against known vulnerabilities (classical risk) and calculates quantum risk priority using Mosca's method.",
      technical: "Checks algorithm status, key sizes, protocol configuration, data lifetimes, estimated migration times, and quantum threat horizons.",
      status: "IMPLEMENTED"
    },
    {
      num: "04",
      name: "RECOMMEND",
      desc: "Evaluate PQC / hybrid alternatives.",
      details: "Suggests post-quantum (PQC) or hybrid cryptographic schemes tailored to the application's performance, memory, and compliance constraints.",
      technical: "Weights candidates (like ML-KEM, ML-DSA, SLH-DSA) against latency budget, packet size, security strength, and FIPS/NIST compliance.",
      status: "IN DEVELOPMENT"
    },
    {
      num: "05",
      name: "MIGRATE",
      desc: "Prioritize and plan cryptographic modernization.",
      details: "Builds a prioritized migration roadmap grouping assets by application criticality, blast radius, and migration complexity.",
      technical: "Orders tasks by dependency tree topological sort, ensuring core library layers are migrated before dependent high-level applications.",
      status: "ARCHITECTED"
    },
    {
      num: "06",
      name: "VERIFY",
      desc: "Continuously validate the migration state.",
      details: "Integrates with CI/CD pipelines to ensure new code commits do not reintroduce weak cryptography and verify runtime cipher negotiations.",
      technical: "Automates pull request checking and scans TLS handshakes to ensure strict compliance with transition policies.",
      status: "ROADMAP"
    }
  ];

  const assets = {
    source: {
      title: "Source Code Scanning",
      description: "Detects custom cryptographic algorithms, hardcoded keys, API usage patterns, and libraries within source files.",
      output: `// ECDAT Source Scan Result
{
  "file": "src/auth/crypto.go",
  "line": 42,
  "match": "crypto/sha1.New()",
  "evidence": "sha1.New()",
  "confidence": "HIGH",
  "algorithm": "SHA-1",
  "function": "HASH",
  "remediation": "Replace with SHA-256 or SHA-3"
}`
    },
    dependencies: {
      title: "Dependency Tracking",
      description: "Analyzes third-party packages, transitives, and import chains to trace libraries containing cryptographic utilities.",
      output: `// ECDAT Dependency Scan Result
{
  "dependency": "node_modules/jsonwebtoken",
  "version": "8.5.1",
  "path": "package.json -> express -> jsonwebtoken",
  "contains_crypto": true,
  "crypto_capabilities": ["HS256", "RS256", "ES256"],
  "vulnerability": "Algorithm confusion possible if insecure configs allowed"
}`
    },
    binaries: {
      title: "Compiled Binaries",
      description: "Inspects compiled binaries using static signatures and ELF/PE/Mach-O format analysis to find static crypto linking.",
      output: `// ECDAT Binary Scan Result
{
  "binary": "bin/auth_service",
  "format": "ELF-64",
  "linked_libraries": ["libcrypto.so.1.1"],
  "statically_linked_signatures": [
    { "offset": "0x40A2C0", "found": "OpenSSL AES-NI key schedule constants" }
  ],
  "entropy_score": 7.82,
  "encrypted_sections": true
}`
    },
    certificates: {
      title: "TLS Certificates",
      description: "Extracts local or remote certificate chains, checking key sizes, expiration dates, and algorithm strengths.",
      output: `// ECDAT Certificate Scan Result
{
  "domain": "internal.service.local",
  "issuer": "CN=Local CA",
  "signature_algorithm": "SHA256withRSA",
  "key_type": "RSA",
  "key_size": 2048,
  "quantum_vulnerable": true,
  "expiry": "2027-12-31T23:59:59Z",
  "validity_days_remaining": 490
}`
    },
    containers: {
      title: "Container Images",
      description: "Peels container filesystem layers to identify libraries, binaries, and environment configurations containing cryptographic items.",
      output: `// ECDAT Container Scan Result
{
  "image": "docker.io/library/node:18-alpine",
  "layers": 3,
  "vulnerabilities": [
    {
      "layer": "sha256:7234...9d",
      "package": "openssl",
      "version": "1.1.1t-r0",
      "status": "Vulnerable (CVE-2023-0464)"
    }
  ]
}`
    },
    network: {
      title: "Network Cipher Negotiator",
      description: "Inspects active TLS handshakes on ingress endpoints to log negotiated protocol versions and cipher suites.",
      output: `// ECDAT TLS Handshake Result
{
  "endpoint": "10.0.4.15:443",
  "negotiated_version": "TLS 1.2",
  "cipher_suite": "ECDHE-RSA-AES256-GCM-SHA384",
  "client_hello_extensions": ["supported_groups (P-256, P-384)"],
  "quantum_risk": "HIGH (RSA key exchange / signature)"
}`
    }
  };

  const candidates = {
    "ml-kem": {
      name: "ML-KEM (Kyber)",
      category: "Key Encapsulation Mechanism (KEM)",
      standard: "FIPS 203",
      sihStatus: "IMPLEMENTED",
      factors: [
        { name: "Security Level", score: "LEVEL 3 / 5", desc: "Hardness based on Module Lattice-Based Key Encapsulation." },
        { name: "Public Key Size", score: "800 - 1568 Bytes", desc: "Larger than classical (RSA/ECC) but bandwidth-friendly." },
        { name: "Latency", score: "EXCELLENT", desc: "Extremely fast encapsulation/decapsulation cycles." },
        { name: "Hybrid Compatibility", score: "HIGH", desc: "Designed to pair with X25519 for dual classical/PQC safety." }
      ]
    },
    "ml-dsa": {
      name: "ML-DSA (Dilithium)",
      category: "Digital Signature Algorithm",
      standard: "FIPS 204",
      sihStatus: "IMPLEMENTED",
      factors: [
        { name: "Security Level", score: "LEVEL 2 / 3 / 5", desc: "Robust lattice-based digital signature." },
        { name: "Signature Size", score: "2420 - 4595 Bytes", desc: "Significantly larger signature sizes; requires TCP fragmentation checks." },
        { name: "Verification Speed", score: "VERY FAST", desc: "Extremely optimized signature validation times." },
        { name: "Hybrid Compatibility", score: "HIGH", desc: "Pairs seamlessly with ECDSA P-256 / Ed25519." }
      ]
    },
    "slh-dsa": {
      name: "SLH-DSA (SPHINCS+)",
      category: "Stateless Hash-Based Signature",
      standard: "FIPS 205",
      sihStatus: "IN DEVELOPMENT",
      factors: [
        { name: "Security Level", score: "LEVEL 1 / 3 / 5", desc: "Based strictly on cryptographic hash functions; no lattice assumptions." },
        { name: "Signature Size", score: "7856 - 49856 Bytes", desc: "Very large signature size; limits use in standard network headers." },
        { name: "Signing Speed", score: "SLOW", desc: "Computationally intensive signing; highly reliable backup security." },
        { name: "Crypto Agility Role", score: "FALLBACK", desc: "Excellent fallback option if lattices are found vulnerable." }
      ]
    }
  };

  const challenges = [
    { ch: "Hidden Cryptography", resp: "Multi-source discovery fabric + tree-sitter AST scanning for custom logic and algorithms." },
    { ch: "False Positives", resp: "Deterministic syntax rules combined with contextual metadata mapping and confidence scoring." },
    { ch: "Different Scanner Formats", resp: "Standardized canonical Cryptographic Bill of Materials (CBOM) translation engine." },
    { ch: "Dependency Complexity", resp: "Interactive multi-layered Knowledge Graph tracking structural relationships (App -> Lib -> Crypto)." },
    { ch: "Quantum Uncertainty", resp: "Mosca-style priority matrix analyzing Data Lifetime (X) + Migration Time (Y) vs Threat Horizon (Z)." },
    { ch: "Migration Sequencing", resp: "Automated topological sorting of dependencies for step-by-step component modernization." },
    { ch: "Sensitive Data", resp: "Zero-Trust architecture with isolated temporary scan workspaces and scoped RBAC control." },
    { ch: "AI Hallucinations", resp: "Evidence-first AI model designed only to interpret and present parsed data rather than guessing." }
  ];

  return (
    <div className="technical-grid min-h-screen">
      <Navbar />
      
      {/* 08 - HERO SECTION */}
      <header className={styles.heroSection}>
        <div className="container">
          <div className={styles.heroEyebrow}>
            <span className={styles.dot}></span>
            <span>SMART INDIA HACKATHON 2026</span>
            <span className={styles.separator}>·</span>
            <span>SIH26164</span>
            <span className={styles.separator}>·</span>
            <span>NTRO</span>
          </div>
          
          <h1 className={styles.heroHeadline}>
            YOU CANNOT MIGRATE<br />
            <span className={styles.accentText}>WHAT YOU CANNOT SEE.</span>
          </h1>
          
          <p className={styles.heroSubheadline}>
            ECDAT discovers cryptographic assets across enterprise environments, turns fragmented findings into structured intelligence, assesses quantum risk, and helps organizations plan their transition toward post-quantum cryptography.
          </p>
          
          <div className={styles.heroActions}>
            <a href="#playground" className={styles.primaryBtn}>
              ENTER MIGRATION WORKSPACE &rarr;
            </a>
            <a href="/evidence" className={styles.secondaryBtn}>
              VIEW EVIDENCE &rarr;
            </a>
          </div>
        </div>
      </header>

      {/* 08.5 - LATENT MANIFOLD 3D VISUALIZATION */}
      <section style={{ position: "relative", zIndex: 10, marginTop: "-40px", borderBottom: "1px solid var(--color-stone)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: "1200px", borderLeft: "1px solid var(--color-stone)", borderRight: "1px solid var(--color-stone)" }}>
             <ThreeManifold />
          </div>
        </div>
      </section>

      {/* 09 - HERO VISUAL FLOW (CONVERGENCE & EMERGENCE ANIMATED SVG) */}
      <section className={styles.visualSection}>
        <div className="container">
          <div className={styles.visualCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>ENTERPRISE CRYPTOGRAPHIC INGESTION & PIPELINE ENGINE</span>
              <span className="mono-tag-accent">ACTIVE VISUALIZATION</span>
            </div>
            
            <div className={styles.svgWrapper}>
              <svg width="100%" height="340" viewBox="0 0 1000 340" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.pipelineSvg}>
                {/* Background Grid Pattern */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(24, 25, 23, 0.02)" strokeWidth="1"/>
                  </pattern>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--color-stone)" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="var(--color-accent)" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="var(--color-sage)" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Stream Paths */}
                {/* Code, Binary, Cert, Net to ECDAT Core */}
                <path d="M 100 60 Q 300 60 480 150" stroke="var(--color-stone)" strokeWidth="1.5" strokeDasharray="6,4" className={styles.animPath} />
                <path d="M 100 120 Q 300 120 480 160" stroke="var(--color-stone)" strokeWidth="1.5" strokeDasharray="6,4" className={styles.animPath} />
                <path d="M 100 180 Q 300 180 480 170" stroke="var(--color-stone)" strokeWidth="1.5" strokeDasharray="6,4" className={styles.animPath} />
                <path d="M 100 240 Q 300 240 480 180" stroke="var(--color-stone)" strokeWidth="1.5" strokeDasharray="6,4" className={styles.animPath} />
                <path d="M 100 300 Q 300 300 480 190" stroke="var(--color-stone)" strokeWidth="1.5" strokeDasharray="6,4" className={styles.animPath} />

                {/* ECDAT to Outputs */}
                <path d="M 520 170 Q 700 120 900 60" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="8,6" className={styles.animPathSlow} />
                <path d="M 520 170 Q 700 150 900 120" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="8,6" className={styles.animPathSlow} />
                <path d="M 520 170 Q 700 170 900 180" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="8,6" className={styles.animPathSlow} />
                <path d="M 520 170 Q 700 190 900 240" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="8,6" className={styles.animPathSlow} />
                <path d="M 520 170 Q 700 220 900 300" stroke="url(#lineGrad)" strokeWidth="2" strokeDasharray="8,6" className={styles.animPathSlow} />

                {/* Source Nodes */}
                <g className={styles.svgNode}>
                  <rect x="20" y="40" width="130" height="36" fill="#FFFFFF" stroke="var(--color-stone)" />
                  <text x="85" y="62" fill="var(--color-primary)" fontFamily="var(--font-mono)" fontSize="11" textAnchor="middle" fontWeight="bold">CODE & BINARIES</text>
                </g>
                <g className={styles.svgNode}>
                  <rect x="20" y="100" width="130" height="36" fill="#FFFFFF" stroke="var(--color-stone)" />
                  <text x="85" y="122" fill="var(--color-primary)" fontFamily="var(--font-mono)" fontSize="11" textAnchor="middle" fontWeight="bold">LIBRARIES & DEPS</text>
                </g>
                <g className={styles.svgNode}>
                  <rect x="20" y="160" width="130" height="36" fill="#FFFFFF" stroke="var(--color-stone)" />
                  <text x="85" y="182" fill="var(--color-primary)" fontFamily="var(--font-mono)" fontSize="11" textAnchor="middle" fontWeight="bold">CERTIFICATES</text>
                </g>
                <g className={styles.svgNode}>
                  <rect x="20" y="220" width="130" height="36" fill="#FFFFFF" stroke="var(--color-stone)" />
                  <text x="85" y="242" fill="var(--color-primary)" fontFamily="var(--font-mono)" fontSize="11" textAnchor="middle" fontWeight="bold">CONTAINERS & CLOUD</text>
                </g>
                <g className={styles.svgNode}>
                  <rect x="20" y="280" width="130" height="36" fill="#FFFFFF" stroke="var(--color-stone)" />
                  <text x="85" y="302" fill="var(--color-primary)" fontFamily="var(--font-mono)" fontSize="11" textAnchor="middle" fontWeight="bold">NETWORK / TLS</text>
                </g>

                {/* Central Core: ECDAT */}
                <g className={styles.svgCore}>
                  <rect x="420" y="125" width="160" height="90" fill="var(--color-primary)" stroke="var(--color-primary)" />
                  <rect x="425" y="130" width="150" height="80" fill="none" stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="4,2" />
                  <text x="500" y="168" fill="var(--color-base)" fontFamily="var(--font-display)" fontSize="20" textAnchor="middle" fontWeight="900" letterSpacing="0.05em">ECDAT</text>
                  <text x="500" y="190" fill="var(--color-stone)" fontFamily="var(--font-mono)" fontSize="8" textAnchor="middle" fontWeight="700">DISCOVERY CORE</text>
                </g>

                {/* Output Nodes */}
                <g className={styles.svgNodeOutput}>
                  <rect x="850" y="40" width="130" height="36" fill="#FFFFFF" stroke="var(--color-primary)" strokeWidth="1.5" />
                  <text x="915" y="62" fill="var(--color-primary)" fontFamily="var(--font-mono)" fontSize="11" textAnchor="middle" fontWeight="bold">CANONICAL CBOM</text>
                </g>
                <g className={styles.svgNodeOutput}>
                  <rect x="850" y="100" width="130" height="36" fill="#FFFFFF" stroke="var(--color-primary)" strokeWidth="1.5" />
                  <text x="915" y="122" fill="var(--color-primary)" fontFamily="var(--font-mono)" fontSize="11" textAnchor="middle" fontWeight="bold">DEPENDENCY GRAPH</text>
                </g>
                <g className={styles.svgNodeOutput}>
                  <rect x="850" y="160" width="130" height="36" fill="#FFFFFF" stroke="var(--color-primary)" strokeWidth="1.5" />
                  <text x="915" y="182" fill="var(--color-primary)" fontFamily="var(--font-mono)" fontSize="11" textAnchor="middle" fontWeight="bold">QUANTUM RISK INDEX</text>
                </g>
                <g className={styles.svgNodeOutput}>
                  <rect x="850" y="220" width="130" height="36" fill="#FFFFFF" stroke="var(--color-primary)" strokeWidth="1.5" />
                  <text x="915" y="242" fill="var(--color-primary)" fontFamily="var(--font-mono)" fontSize="11" textAnchor="middle" fontWeight="bold">PQC RECOMMENDATION</text>
                </g>
                <g className={styles.svgNodeOutput}>
                  <rect x="850" y="280" width="130" height="36" fill="#FFFFFF" stroke="var(--color-primary)" strokeWidth="1.5" />
                  <text x="915" y="302" fill="var(--color-primary)" fontFamily="var(--font-mono)" fontSize="11" textAnchor="middle" fontWeight="bold">MIGRATION ROADMAP</text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 10 - HERO PRODUCT IDENTIFICATION */}
      <section className={styles.factsSection}>
        <div className="container">
          <div className={styles.factsGrid}>
            <div className={styles.factItem}>
              <span className={styles.factLabel}>PROBLEM STATEMENT</span>
              <span className={styles.factValue}>SIH26164</span>
            </div>
            <div className={styles.factItem}>
              <span className={styles.factLabel}>ORGANIZATION</span>
              <span className={styles.factValue}>NATIONAL TECHNICAL RESEARCH ORGANISATION</span>
            </div>
            <div className={styles.factItem}>
              <span className={styles.factLabel}>THEME</span>
              <span className={styles.factValue}>BLOCKCHAIN & CYBERSECURITY</span>
            </div>
            <div className={styles.factItem}>
              <span className={styles.factLabel}>CATEGORY</span>
              <span className={styles.factValue}>SOFTWARE</span>
            </div>
            <div className={styles.factItem}>
              <span className={styles.factLabel}>TEAM</span>
              <span className={styles.factValue}>LATENTMANIFOLD</span>
            </div>
            <div className={styles.factItem}>
              <span className={styles.factLabel}>TEAM ID</span>
              <span className={styles.factValue}>SIH2026-143</span>
            </div>
          </div>
        </div>
      </section>

      {/* 11 - SECTION: THE PROBLEM */}
      <section id="problem" className={styles.problemSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-accent">01 — CONTEXT</span>
            <h2>THE CRYPTOGRAPHIC BLIND SPOT</h2>
          </div>

          <div className={styles.problemGrid}>
            <div className={styles.problemContent}>
              <p className={styles.largePara}>
                Modern enterprises depend on cryptography everywhere — often without maintaining a complete, continuously understandable inventory of where it exists, how components depend on it, or which assets require attention during cryptographic modernization.
              </p>
              <p className={styles.subPara}>
                Cryptographic assets are not isolated; they exist in legacy codebases, configuration files, compiled binary formats, third-party library pipelines, system certificates, and active network interfaces.
              </p>

              <div className={styles.gapsBlock}>
                <div className={styles.gapCard}>
                  <h5>01 — DISCOVERY GAP</h5>
                  <p>Cryptography is implemented directly or transitively across different infrastructure layers. Traditional scanners only inspect source repositories, completely missing runtime negotiation and binary linkage.</p>
                </div>
                <div className={styles.gapCard}>
                  <h5>02 — CONTEXT GAP</h5>
                  <p>Finding a vulnerable algorithm is not enough. You must understand what it protects, application criticality, dependencies, and the business blast radius if it fails.</p>
                </div>
                <div className={styles.gapCard}>
                  <h5>03 — MIGRATION GAP</h5>
                  <p>Organizations need actionable recommendations: what should replace it, what hybrid schemes fit legacy limits, and in what order components must be upgraded.</p>
                </div>
              </div>
            </div>

            <div className={styles.problemVisualColumn}>
              <div className={styles.constellationCard}>
                <div className={styles.constellationTitle}>
                  <span>ENTERPRISE CRYPTOGRAPHIC LANDSCAPE</span>
                </div>
                <div className={styles.centralStatementBox}>
                  <h4>CRYPTOGRAPHY IS EVERYWHERE</h4>
                  <p>BUT ITS FULL DEPENDENCY AND RISK PICTURE IS BLIND</p>
                </div>
                <div className={styles.landscapeNodes}>
                  <div className={styles.lNode}>APPLICATIONS</div>
                  <div className={styles.lNode}>LIBRARIES</div>
                  <div className={styles.lNode}>SOURCE CODE</div>
                  <div className={styles.lNode}>BINARIES</div>
                  <div className={styles.lNode}>CERTIFICATES</div>
                  <div className={styles.lNode}>CONTAINERS</div>
                  <div className={styles.lNode}>CLOUD</div>
                  <div className={styles.lNode}>INFRASTRUCTURE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 14 - SECTION: THE ECDAT ANSWER & SIX-STAGE MODEL */}
      <section id="how-it-works" className={styles.stageSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-sage">02 — PIPELINE</span>
            <h2>FROM CRYPTOGRAPHIC BLINDNESS TO ACTIONABLE INTELLIGENCE</h2>
            <p className={styles.descriptionCenter}>
              ECDAT transforms fragmented cryptographic observations into an evidence-backed decision system for discovery, risk assessment, and migration planning.
            </p>
          </div>

          <div className={styles.stageInteractiveContainer}>
            <div className={styles.stagesNav}>
              {stages.map((stg, idx) => (
                <button
                  key={idx}
                  className={`${styles.stageTabBtn} ${activeStage === idx ? styles.activeStageBtn : ""}`}
                  onClick={() => setActiveStage(idx)}
                >
                  <span className={styles.tabNum}>{stg.num}</span>
                  <span className={styles.tabName}>{stg.name}</span>
                </button>
              ))}
            </div>

            <div className={styles.stageDisplayCard}>
              <div className={styles.stageDisplayHeader}>
                <h3>
                  <span className={styles.displayNum}>{stages[activeStage].num}</span>{" "}
                  {stages[activeStage].name}
                </h3>
                <span className={`mono-tag ${stages[activeStage].status === "IMPLEMENTED" ? "mono-tag-accent" : "mono-tag"}`}>
                  {stages[activeStage].status}
                </span>
              </div>
              <p className={styles.displayDesc}>{stages[activeStage].desc}</p>
              
              <div className={styles.displaySubGrid}>
                <div className={styles.displayDetailBox}>
                  <h5>FUNCTIONAL TARGET</h5>
                  <p>{stages[activeStage].details}</p>
                </div>
                <div className={styles.displayDetailBox}>
                  <h5>TECHNICAL IMPLEMENTATION</h5>
                  <p>{stages[activeStage].technical}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 16 - SECTION: WHAT DOES ECDAT ACTUALLY DISCOVER? */}
      <section className={styles.discoverySection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag">03 — SCANNER</span>
            <h2>WHAT DOES ECDAT ACTUALLY DISCOVER?</h2>
            <p className={styles.descriptionCenter}>
              ECDAT features a modular scanner engine designed to scrape raw findings across multiple enterprise vectors.
            </p>
          </div>

          <div className={styles.discoveryGrid}>
            <div className={styles.discoveryMenu}>
              {Object.keys(assets).map((key) => (
                <button
                  key={key}
                  className={`${styles.discoveryMenuBtn} ${activeAsset === key ? styles.activeMenuBtn : ""}`}
                  onClick={() => setActiveAsset(key)}
                >
                  {assets[key as keyof typeof assets].title}
                </button>
              ))}
            </div>

            <div className={styles.discoveryConsole}>
              <div className={styles.consoleHeader}>
                <div className={styles.consoleDots}>
                  <span className={styles.cDotRed}></span>
                  <span className={styles.cDotYellow}></span>
                  <span className={styles.cDotGreen}></span>
                </div>
                <span className={styles.consoleTitle}>ECDAT SCAN DATA PREVIEW</span>
              </div>
              <div className={styles.consoleContent}>
                <p className={styles.consoleDesc}>{assets[activeAsset as keyof typeof assets].description}</p>
                <pre>
                  <code>{assets[activeAsset as keyof typeof assets].output}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 17 - SECTION: CBOM & NORMALIZATION */}
      <section className={styles.cbomSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-accent">04 — DATA SCHEMAS</span>
            <h2>FROM FINDINGS TO A CRYPTOGRAPHIC BILL OF MATERIALS</h2>
          </div>

          <div className={styles.cbomGrid}>
            <div className={styles.cbomText}>
              <p className={styles.largePara}>
                A CBOM (Cryptographic Bill of Materials) gives an organization a structured, normalized inventory of every discovered cryptographic component.
              </p>
              <p className={styles.subPara}>
                Different scanners describe assets differently (e.g. `RSA-2048`, `rsa2048`, `Alg:RSA`). ECDAT normalizes metadata into a standardized, canonical format that fits enterprise compliance audits and inventory databases.
              </p>
              <div className={styles.cbomWorkflow}>
                <div className={styles.flowStep}>
                  <span className={styles.stepNum}>A</span>
                  <div>
                    <h6>RAW DISCOVERY</h6>
                    <p>Scanners gather fragments (RSA-2048, certificate details, code imports).</p>
                  </div>
                </div>
                <div className={styles.flowStep}>
                  <span className={styles.stepNum}>B</span>
                  <div>
                    <h6>NORMALIZATION & DEDUPLICATION</h6>
                    <p>ECDTA matches formats and groups duplicates into a single asset model.</p>
                  </div>
                </div>
                <div className={styles.flowStep}>
                  <span className={styles.stepNum}>C</span>
                  <div>
                    <h6>CANONICAL CBOM INVENTORY</h6>
                    <p>Structured output ready for dependency mapping and risk calculation.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.cbomVisual}>
              <div className={styles.schemaCard}>
                <div className={styles.schemaCardHeader}>
                  <span>CANONICAL CBOM JSON SCHEMATIC</span>
                  <span className="mono-tag">CycloneDX / CBOM Draft</span>
                </div>
                <pre className={styles.schemaCode}>
{`{
  "bomFormat": "CBOM",
  "specVersion": "1.0",
  "component": {
    "name": "AuthService",
    "type": "application",
    "cryptographicAssets": [
      {
        "assetType": "algorithm",
        "name": "RSA",
        "keyLength": 2048,
        "mode": "OAEP",
        "implementation": "OpenSSL 1.1.1t",
        "quantumSafe": false
      },
      {
        "assetType": "protocol",
        "name": "TLS",
        "version": "1.2",
        "cipherSuite": "ECDHE-RSA-AES256-GCM-SHA384",
        "quantumSafe": false
      }
    ]
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 18 - SECTION: KNOWLEDGE GRAPH WITH INTERACTIVE HOVER */}
      <section className={styles.graphSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-sage">05 — RELATIONSHIP INTELLIGENCE</span>
            <h2>INVENTORY IS NOT ENOUGH. RELATIONSHIPS MATTER.</h2>
            <p className={styles.descriptionCenter}>
              ECDAT connects cryptographic assets with applications, dependencies, data, infrastructure, and other contextual relationships. Hover over the nodes below to inspect relationships.
            </p>
          </div>

          <div className={styles.graphGrid}>
            <div className={styles.graphVisualColumn}>
              <div className={styles.graphMapContainer}>
                <div className={styles.graphNodeGroup}>
                  <div 
                    className={`${styles.graphNodeApp} ${hoveredNode === "app" ? styles.nodeHighlighted : ""}`}
                    onMouseEnter={() => setHoveredNode("app")}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    APPLICATION
                    <div className={styles.nodeSub}>Payment Gateway</div>
                  </div>
                  <div className={styles.graphEdge}>uses &rarr;</div>
                  <div 
                    className={`${styles.graphNodeLib} ${hoveredNode === "lib" ? styles.nodeHighlighted : ""}`}
                    onMouseEnter={() => setHoveredNode("lib")}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    LIBRARY
                    <div className={styles.nodeSub}>OpenSSL v1.1.1</div>
                  </div>
                  <div className={styles.graphEdge}>implements &rarr;</div>
                  <div 
                    className={`${styles.graphNodeAlg} ${hoveredNode === "alg" ? styles.nodeHighlighted : ""}`}
                    onMouseEnter={() => setHoveredNode("alg")}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    ALGORITHM
                    <div className={styles.nodeSub}>RSA-2048</div>
                  </div>
                  <div className={styles.graphEdge}>protects &rarr;</div>
                  <div 
                    className={`${styles.graphNodeData} ${hoveredNode === "data" ? styles.nodeHighlighted : ""}`}
                    onMouseEnter={() => setHoveredNode("data")}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    DATA
                    <div className={styles.nodeSub}>Credit Card Numbers</div>
                  </div>
                </div>
                
                <div className={styles.graphInfoBox}>
                  {hoveredNode === "app" && (
                    <p className={styles.graphInfoText}><strong>APPLICATION (Payment Gateway):</strong> Mission-critical deployment. High exposure score. Entrypoint of user actions.</p>
                  )}
                  {hoveredNode === "lib" && (
                    <p className={styles.graphInfoText}><strong>LIBRARY (OpenSSL v1.1.1):</strong> Statically linked inside binaries. Triggers CVE alerts. Needs complete hybrid updates.</p>
                  )}
                  {hoveredNode === "alg" && (
                    <p className={styles.graphInfoText}><strong>ALGORITHM (RSA-2048):</strong> Classical asymmetric algorithm. Vulnerable to Shor's algorithm. Calculated Quantum Risk is CRITICAL.</p>
                  )}
                  {hoveredNode === "data" && (
                    <p className={styles.graphInfoText}><strong>DATA (Credit Card Numbers):</strong> Encrypted data at rest. Retention requirements exceed 10 years, creating immediate harvest risk.</p>
                  )}
                  {!hoveredNode && (
                    <p className={styles.graphInfoTextPlaceholder}>Hover over any node above to inspect dependency context details.</p>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.graphContentColumn}>
              <h4>Cryptographic Dependency & Blast Radius Analysis</h4>
              <p className={styles.largePara}>
                Knowing you have RSA-2048 is only 10% of the puzzle. The true question is: **\"If this algorithm is compromised, what breaks?\"**
              </p>
              <p className={styles.subPara}>
                Our graph-based mapping links components and datasets. If an algorithm is marked as quantum-vulnerable, the system traces the relationship tree upwards to flag vulnerable APIs, containers, and data zones, giving you an accurate blast radius assessment.
              </p>
              <div className={styles.graphBenefits}>
                <div className={styles.benefitCard}>
                  <h6>TRANSITIVE VISIBILITY</h6>
                  <p>Traces deep dependencies (e.g. which app uses which container that hosts the vulnerable binary).</p>
                </div>
                <div className={styles.benefitCard}>
                  <h6>IMPACT PRIORITIZATION</h6>
                  <p>Ranks risks based on how close they are to sensitive customer data storage zones.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 19 - SECTION: QUANTUM RISK WITH INTERACTIVE CALCULATOR */}
      <section className={styles.riskSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-accent">06 — RISK ENGINE</span>
            <h2>NOT EVERYTHING IS EQUALLY URGENT.</h2>
          </div>

          <div className={styles.riskGrid}>
            <div className={styles.riskText}>
              <p className={styles.largePara}>
                A cryptographic algorithm can be technically vulnerable without every instance requiring immediate action.
              </p>
              <p className={styles.subPara}>
                ECDAT applies Mosca's Theorem (Theorem of Risk) to calculate priority. Adjust the sliders on the right to simulate your risk posture:
              </p>
              
              <div className={styles.calcInputs}>
                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span>Data Lifetime (X): <strong>{dataLifetime} years</strong></span>
                    <span className={styles.sliderSub}>How long must your data remain secure?</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    value={dataLifetime} 
                    onChange={(e) => setDataLifetime(parseInt(e.target.value))} 
                    className={styles.rangeSlider}
                  />
                </div>

                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span>Migration Time (Y): <strong>{migrationTime} years</strong></span>
                    <span className={styles.sliderSub}>How long to transition your stacks to PQC?</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={migrationTime} 
                    onChange={(e) => setMigrationTime(parseInt(e.target.value))} 
                    className={styles.rangeSlider}
                  />
                </div>

                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span>Threat Horizon (Z): <strong>{threatHorizon} years</strong></span>
                    <span className={styles.sliderSub}>When will a quantum computer break RSA?</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    value={threatHorizon} 
                    onChange={(e) => setThreatHorizon(parseInt(e.target.value))} 
                    className={styles.rangeSlider}
                  />
                </div>
              </div>
            </div>

            <div className={styles.riskCalculatorBox}>
              <div className={styles.calculatorHeader}>
                <span>MOSCA EQUATION RISK EVALUATOR</span>
                <span className="mono-tag-accent" style={{ backgroundColor: currentRisk.color, color: "#FFFFFF" }}>{currentRisk.level}</span>
              </div>
              <div className={styles.calcBody}>
                <div className={styles.calcFormula}>
                  <div className={styles.calcTerm}>
                    <span className={styles.termLabel}>Data (X)</span>
                    <span className={styles.termVar}>{dataLifetime}y</span>
                  </div>
                  <span className={styles.calcOp}>+</span>
                  <div className={styles.calcTerm}>
                    <span className={styles.termLabel}>Migrate (Y)</span>
                    <span className={styles.termVar}>{migrationTime}y</span>
                  </div>
                  <span className={styles.calcOp}>{dataLifetime + migrationTime > threatHorizon ? ">" : "<="}</span>
                  <div className={styles.calcTerm}>
                    <span className={styles.termLabel}>Threat (Z)</span>
                    <span className={styles.termVar}>{threatHorizon}y</span>
                  </div>
                </div>

                <div className={styles.riskStatusBox} style={{ borderLeftColor: currentRisk.color }}>
                  <h4 style={{ color: currentRisk.color }}>PRIORITY: {currentRisk.level}</h4>
                  <p>{currentRisk.text}</p>
                </div>

                <div className={styles.calcStatusList} style={{ marginTop: "24px" }}>
                  <div className={`${styles.calcStatusRow} ${currentRisk.level === "CRITICAL" ? styles.rowHighlight : ""}`}>
                    <span className={`${styles.statusBadge} ${styles.badgeCritical}`}>CRITICAL</span>
                    <span className={styles.statusLabel}>X + Y &gt; Z (Exposed now)</span>
                  </div>
                  <div className={`${styles.calcStatusRow} ${currentRisk.level === "HIGH" ? styles.rowHighlight : ""}`}>
                    <span className={`${styles.statusBadge} ${styles.badgeHigh}`}>HIGH</span>
                    <span className={styles.statusLabel}>X + Y &asymp; Z (Start immediately)</span>
                  </div>
                  <div className={`${styles.calcStatusRow} ${currentRisk.level === "MEDIUM" ? styles.rowHighlight : ""}`}>
                    <span className={`${styles.statusBadge} ${styles.badgeMedium}`}>MEDIUM</span>
                    <span className={styles.statusLabel}>X + Y &lt; Z (Plan transition)</span>
                  </div>
                  <div className={`${styles.calcStatusRow} ${currentRisk.level === "LOW" ? styles.rowHighlight : ""}`}>
                    <span className={`${styles.statusBadge} ${styles.badgeLow}`}>LOW</span>
                    <span className={styles.statusLabel}>Data is safe for now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 21 - SECTION: PQC RECOMMENDATION */}
      <section className={styles.pqcSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag">07 — PQC ROADMAP</span>
            <h2>FROM &quot;WHAT IS AT RISK?&quot; TO &quot;WHAT SHOULD REPLACE IT?&quot;</h2>
            <p className={styles.descriptionCenter}>
              ECDAT helps select candidate algorithms (standardized under NIST PQC) to construct dual-safe hybrid schemes.
            </p>
          </div>

          <div className={styles.pqcInteractiveGrid}>
            <div className={styles.candidateSelector}>
              <button 
                className={`${styles.candidateTab} ${activeCandidate === "ml-kem" ? styles.activeCandTab : ""}`}
                onClick={() => setActiveCandidate("ml-kem")}
              >
                ML-KEM (Kyber)
              </button>
              <button 
                className={`${styles.candidateTab} ${activeCandidate === "ml-dsa" ? styles.activeCandTab : ""}`}
                onClick={() => setActiveCandidate("ml-dsa")}
              >
                ML-DSA (Dilithium)
              </button>
              <button 
                className={`${styles.candidateTab} ${activeCandidate === "slh-dsa" ? styles.activeCandTab : ""}`}
                onClick={() => setActiveCandidate("slh-dsa")}
              >
                SLH-DSA (SPHINCS+)
              </button>
            </div>

            <div className={styles.candidateCard}>
              <div className={styles.candidateHeader}>
                <div>
                  <h4>{candidates[activeCandidate as keyof typeof candidates].name}</h4>
                  <span className={styles.candCategory}>{candidates[activeCandidate as keyof typeof candidates].category}</span>
                </div>
                <span className="mono-tag-sage">
                  {candidates[activeCandidate as keyof typeof candidates].standard}
                </span>
              </div>

              <div className={styles.candFactors}>
                {candidates[activeCandidate as keyof typeof candidates].factors.map((fac, idx) => (
                  <div key={idx} className={styles.factorItem}>
                    <span className={styles.factorName}>{fac.name}</span>
                    <span className={styles.factorScore}>{fac.score}</span>
                    <p className={styles.factorDesc}>{fac.desc}</p>
                  </div>
                ))}
              </div>
              <div className={styles.candidateFooter}>
                <span className={styles.verificationNote}>
                  * Algorithm candidate evaluation metrics are mapped based on initial NIST PQC benchmarking guidelines.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 22 - SECTION: AI WITH EVIDENCE */}
      <section className={styles.aiSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-accent">08 — AI COMPANION</span>
            <h2>AI WITH EVIDENCE. NOT AI INSTEAD OF EVIDENCE.</h2>
          </div>

          <div className={styles.aiGrid}>
            <div className={styles.aiContent}>
              <blockquote>
                &quot;AI should enhance evidence, not replace evidence.&quot;
              </blockquote>
              <p className={styles.largePara}>
                Traditional deterministic tools output locations and signatures. While precise, developers often do not understand the cryptographic implications.
              </p>
              <p className={styles.subPara}>
                ECDAT integrates an **Explainable AI Analyst** to interpret findings. The AI never guesses; it utilizes deterministic scanner signals (AST outputs, cert attributes) as prompt boundaries to generate context-specific transition plans.
              </p>
              <div className={styles.aiCapabilities}>
                <div className={styles.aiCapCard}>
                  <h6>Semantic Contextualization</h6>
                  <p>Explains why a specific algorithm is dangerous in its host environment.</p>
                </div>
                <div className={styles.aiCapCard}>
                  <h6>Developer Coaching</h6>
                  <p>Outputs exact code diff snippets showing how to replace legacy library imports with hybrid packages.</p>
                </div>
              </div>
            </div>

            <div className={styles.aiVisualBox}>
              <div className={styles.flowChartBox}>
                <div className={styles.flowItem}>DETERMINISTIC SIGNALS (AST, Configs)</div>
                <div className={styles.flowArrow}>&darr;</div>
                <div className={styles.flowItemAccent}>EVIDENCE NORMALIZATION</div>
                <div className={styles.flowArrow}>&darr;</div>
                <div className={styles.flowItemHighlight}>AI ANALYST INTERPRETATION</div>
                <div className={styles.flowArrow}>&darr;</div>
                <div className={styles.flowItem}>EXPLAINABLE TRANSITION PLAN</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 28 - DYNAMIC PLAYGROUND SECTION (THE WORKSPACE CHALLENGE) */}
      <section id="playground" className={styles.playgroundSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-accent">09 — INTERACTIVE PLAYGROUND</span>
            <h2>ECDAT LIVE SIMULATION CENTER</h2>
            <p className={styles.descriptionCenter}>
              Test ECDAT's core capabilities in real-time. Execute an AST parser scan or simulate a Shor's algorithm quantum attack on classical RSA.
            </p>
          </div>

          <div className={styles.playgroundFrame}>
            <div className={styles.playgroundTabs}>
              <button 
                className={`${styles.playgroundTabBtn} ${activeTabPlayground === "scanner" ? styles.activePlayTab : ""}`}
                onClick={() => setActiveTabPlayground("scanner")}
              >
                1. AST CODE SCANNER
              </button>
              <button 
                className={`${styles.playgroundTabBtn} ${activeTabPlayground === "simulator" ? styles.activePlayTab : ""}`}
                onClick={() => setActiveTabPlayground("simulator")}
              >
                2. SHOR'S ATTACK SIMULATOR
              </button>
              <button 
                className={`${styles.playgroundTabBtn} ${activeTabPlayground === "planner" ? styles.activePlayTab : ""}`}
                onClick={() => setActiveTabPlayground("planner")}
              >
                3. WHAT-IF SCENARIO PLANNER
              </button>
              <button 
                className={`${styles.playgroundTabBtn} ${activeTabPlayground === "game" ? styles.activePlayTab : ""}`}
                onClick={() => setActiveTabPlayground("game")}
              >
                4. HACK-RUN GAME
              </button>
            </div>

            <div className={styles.playgroundContent}>
              {/* Tab 1: AST Code Scanner */}
              {activeTabPlayground === "scanner" && (
                <div className={styles.scannerPlayground}>
                  <div className={styles.playgroundSplit}>
                    <div className={styles.codeEditorPane}>
                      <span className={styles.paneLabel}>SOURCE CODE INPUT (GOLANG)</span>
                      <textarea
                        value={scanCode}
                        onChange={(e) => setScanCode(e.target.value)}
                        className={styles.editorTextArea}
                        rows={10}
                      />
                      <button 
                        onClick={runCodeScan}
                        className={styles.runAuditBtn}
                        disabled={scanStatus === "scanning"}
                      >
                        {scanStatus === "scanning" ? "SCANNING Stack..." : "[ RUN QUANTUM COMPLIANCE AUDIT ]"}
                      </button>
                    </div>

                    <div className={styles.terminalOutputPane}>
                      <span className={styles.paneLabel}>ECDAT PARSER TERMINAL</span>
                      <div className={styles.terminalLogs}>
                        {terminalLogs.length === 0 && (
                          <span className={styles.terminalPlaceholder}>Click 'RUN QUANTUM COMPLIANCE AUDIT' to execute tree-sitter scanning pipeline.</span>
                        )}
                        {terminalLogs.map((log, i) => (
                          <div key={i} className={styles.logLine}>{log}</div>
                        ))}
                        <div ref={terminalEndRef} />
                      </div>
                    </div>
                  </div>

                  {scanStatus === "complete" && (
                    <div className={styles.remediationBox}>
                      <div className={styles.remedHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className={styles.pulsingDot}></span>
                          <span>ECDAT PATCH RECOMMENDATION DIFF</span>
                        </div>
                        <button 
                          className={styles.copyTextBtn}
                          onClick={() => handleCopyCode(patchDiff)}
                        >
                          {copied ? "COPIED!" : "[ COPY ]"}
                        </button>
                      </div>
                      <pre className={styles.diffPre}>
{`diff --git a/main.go b/main.go
index 8f2b4c1..9a3f2d2 100644
--- a/main.go
+++ b/main.go
@@ -2,2 +2,2 @@ import (
-	"crypto/rsa"
-	"crypto/sha1"
+	"github.com/latentmanifold/ecdat/pqc/mlkem"
+	"crypto/sha256"
@@ -6,3 +6,3 @@ func ConnectSecurity() {
-	key, _ := rsa.GenerateKey(rand.Reader, 2048)
-	hasher := sha1.New()
+	key, _ := mlkem.GenerateKey768()
+	hasher := sha256.New()`}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Shor's Attack Simulator */}
              {activeTabPlayground === "simulator" && (
                <div className={styles.simulatorPlayground}>
                  <div className={styles.messageInputBox}>
                    <span className={styles.paneLabel}>ENTER SECURE DATA STRING TO ENCRYPT</span>
                    <input 
                      type="text" 
                      value={secretMessage}
                      onChange={(e) => setSecretMessage(e.target.value)}
                      className={styles.plainTextInput}
                      placeholder="Type credit card numbers, passwords, etc."
                    />
                  </div>

                  <div className={styles.playgroundSplit}>
                    {/* Classical Stack */}
                    <div className={styles.cryptoBox}>
                      <div className={styles.cryptoBoxHeader}>
                        <span>CLASSICAL ASYMMETRIC (RSA-2048)</span>
                        <span className="mono-tag-accent">VULNERABLE</span>
                      </div>
                      <div className={styles.cryptoContent}>
                        <div className={styles.cipherPreview}>
                          <strong>Ciphertext:</strong>
                          <code className={styles.cipherCode}>{encryptedClassical}</code>
                        </div>
                        
                        <button 
                          onClick={simulateClassicalAttack}
                          className={styles.attackBtn}
                          disabled={classicalAttackStatus === "attacking"}
                        >
                          {classicalAttackStatus === "attacking" ? "FACTORING N..." : "SIMULATE SHOR'S ATTACK"}
                        </button>

                        <div className={styles.consoleLogsMini}>
                          {classicalAttackLog ? (
                            <pre><code>{classicalAttackLog}</code></pre>
                          ) : (
                            <span className={styles.miniPlaceholder}>Awaiting simulator trigger.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantum safe Stack */}
                    <div className={styles.cryptoBox} style={{ borderTopColor: "var(--color-sage)" }}>
                      <div className={styles.cryptoBoxHeader}>
                        <span>POST-QUANTUM CRYPTO (ML-KEM-768)</span>
                        <span className="mono-tag-sage">SAFE</span>
                      </div>
                      <div className={styles.cryptoContent}>
                        <div className={styles.cipherPreview}>
                          <strong>Ciphertext:</strong>
                          <code className={styles.cipherCode}>{encryptedQuantum}</code>
                        </div>
                        
                        <button 
                          onClick={simulateQuantumAttack}
                          className={styles.attackBtn}
                          style={{ backgroundColor: "var(--color-sage)", borderColor: "var(--color-sage)" }}
                          disabled={quantumAttackStatus === "attacking"}
                        >
                          {quantumAttackStatus === "attacking" ? "SOLVING LATTICES..." : "SIMULATE SHOR'S ATTACK"}
                        </button>

                        <div className={styles.consoleLogsMini}>
                          {quantumAttackLog ? (
                            <pre><code>{quantumAttackLog}</code></pre>
                          ) : (
                            <span className={styles.miniPlaceholder}>Awaiting simulator trigger.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: What-If Planner */}
              {activeTabPlayground === "planner" && (
                <div className={styles.plannerPlayground}>
                  <div className={styles.scenarioSelector}>
                    <button 
                      onClick={() => setPlannerScenario("standard")}
                      className={`${styles.scenarioTab} ${plannerScenario === "standard" ? styles.activeScenarioTab : ""}`}
                    >
                      STANDARD TRANSITION
                    </button>
                    <button 
                      onClick={() => setPlannerScenario("hybrid")}
                      className={`${styles.scenarioTab} ${plannerScenario === "hybrid" ? styles.activeScenarioTab : ""}`}
                    >
                      HYBRID DUAL-MODE DEPLOYMENT
                    </button>
                    <button 
                      onClick={() => setPlannerScenario("accelerated")}
                      className={`${styles.scenarioTab} ${plannerScenario === "accelerated" ? styles.activeScenarioTab : ""}`}
                    >
                      ACCELERATED COVERT MIGRATION
                    </button>
                  </div>

                  <div className={styles.plannerResults}>
                    <div className={styles.plannerMetricsGrid}>
                      <div className={styles.metricResultItem}>
                        <span>PROJECTED TRANSITION TIME</span>
                        <h4>{currentPlanner.time}</h4>
                      </div>
                      <div className={styles.metricResultItem}>
                        <span>BUDGET LEVEL</span>
                        <h4>{currentPlanner.cost}</h4>
                      </div>
                      <div className={styles.metricResultItem}>
                        <span>RESIDUAL QUANTUM RISK</span>
                        <h4 style={{ color: currentPlanner.risk.includes("HIGH") ? "var(--color-accent)" : "var(--color-sage)" }}>
                          {currentRisk.level === "CRITICAL" && plannerScenario === "standard" ? "CRITICAL" : currentPlanner.risk}
                        </h4>
                      </div>
                    </div>

                    <div className={styles.plannerSteps}>
                      <h5>MIGRATION SEQUENCE CHECKLIST</h5>
                      <ul className={styles.plannerList}>
                        {currentPlanner.steps.map((st, i) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Quantum Cryptanalysis Hack-Run Game */}
              {activeTabPlayground === "game" && (
                <div className={styles.gameContainer}>
                  <div className={styles.gameHeader}>
                    <h4>LEVEL {gameLevel}: {gameLevel === 1 ? "HARVEST-NOW-DECIPHER-LATER" : gameLevel === 2 ? "SHOR'S PERIOD FINDER" : gameLevel === 3 ? "LATTICE DECRYPTION BARRIER" : "HACK COMPLETE!"}</h4>
                    <span className="mono-tag-accent">SYSTEM POSTURE: {gameLevel <= 3 ? "ATTACKING" : "SECURED"}</span>
                  </div>

                  {gameLevel === 1 && (
                    <div className={styles.gameLevelBox}>
                      <p><strong>Goal:</strong> Intercept 3 vulnerable classic cryptographic key handshakes flowing through the network. Avoid quantum-safe assets.</p>
                      
                      <div className={styles.packetScanner}>
                        <div className={styles.packetStream}>
                          <span className={styles.pulsingDot}></span>
                          <span style={{ marginLeft: "8px" }}>LIVE PACKET STREAM:</span>
                          <strong style={{ color: currentNetworkPacket.safe ? "var(--color-sage)" : "var(--color-accent)", marginLeft: "8px" }}>
                            {currentNetworkPacket.type}
                          </strong>
                        </div>
                        <div className={styles.progressBarWrapper}>
                          <div className={styles.progressBar} style={{ width: `${(harvestedCount / 3) * 100}%` }}></div>
                        </div>
                        <span>Assets Harvested: {harvestedCount}/3</span>
                      </div>

                      <button 
                        className={styles.actionBtn}
                        onClick={() => {
                          if (!currentNetworkPacket.safe) {
                            const newCount = harvestedCount + 1;
                            setHarvestedCount(newCount);
                            setGameLogs(prev => [`[HARVESTED] Intercepted vulnerable ${currentNetworkPacket.type}!`, ...prev]);
                            if (newCount >= 3) {
                              setGameLevel(2);
                              setGameLogs(prev => ["[LEVEL 1 COMPLETED] Successfully harvested 3 keys. Moving to Level 2: Shor's Period Finder.", ...prev]);
                            }
                          } else {
                            setGameLogs(prev => ["[WARNING] Selected quantum-safe packet. Ingestion blocked by ML-KEM wrapper!", ...prev]);
                          }
                        }}
                      >
                        [ HARVEST CURRENT PACKET ]
                      </button>
                    </div>
                  )}

                  {gameLevel === 2 && (
                    <div className={styles.gameLevelBox}>
                      <p><strong>Goal:</strong> Factorize the public RSA key modulus <code>N = 77</code>. Find the repeating period <code>r</code> of the modular wave function.</p>
                      
                      <div className={styles.shorInterface}>
                        <div style={{ margin: "12px 0" }}>
                          <span>ENTER PERIOD VALUE (r): </span>
                          <input 
                            type="number"
                            placeholder="Hint: try 30"
                            value={shorPeriodVal}
                            onChange={(e) => setShorPeriodVal(e.target.value)}
                            className={styles.plainTextInput}
                            style={{ padding: "6px 12px", marginLeft: "12px" }}
                          />
                        </div>
                      </div>

                      <button 
                        className={styles.actionBtn}
                        onClick={() => {
                          if (shorPeriodVal === "30") {
                            setGameLevel(3);
                            setGameLogs(prev => ["[SOLVED] Period r=30 found! Primes solved: p=7, q=11. Decrypted Secret: 'SIH-2026-WINNER'. Moving to Level 3: Lattice CVP Barrier.", ...prev]);
                          } else {
                            setGameLogs(prev => ["[FAIL] Period value incorrect. Periodic wave did not match modulus parameters.", ...prev]);
                          }
                        }}
                      >
                        [ EXECUTE SHOR FACTORING ]
                      </button>
                    </div>
                  )}

                  {gameLevel === 3 && (
                    <div className={styles.gameLevelBox}>
                      <p><strong>Goal:</strong> Attack the post-quantum ML-KEM lattice. Slide to align your decryption vector with the target point.</p>
                      
                      <div className={styles.latticeGame}>
                        <div style={{ margin: "12px 0" }}>
                          <label>LATTICE NOISE VECTOR (e): {latticePlayerNoise}%</label>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={latticePlayerNoise}
                            onChange={(e) => setLatticePlayerNoise(parseInt(e.target.value))}
                            className={styles.sliderInput}
                          />
                        </div>
                        <div className={styles.latticeTargetBox}>
                          <span>Target Vector (with noise): <strong>{42 + Math.round(latticePlayerNoise / 5)}</strong></span>
                          <span style={{ marginLeft: "24px" }}>Player Vector: <strong>{42}</strong></span>
                        </div>
                        <p className={styles.subtext}>Notice: As long as noise vector is greater than 0%, the Closest Vector Problem remains unsolvable and key agreement is secure.</p>
                      </div>

                      <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => {
                            if (latticePlayerNoise === 0) {
                              setGameLevel(4);
                              setGameLogs(prev => ["[SUCCESS] Cracked! Decrypted with zero noise vectors.", ...prev]);
                            } else {
                              setGameLogs(prev => ["[BLOCKED] Cryptanalysis failed. The noise vector introduces mathematical lattice complexity!", ...prev]);
                            }
                          }}
                        >
                          [ ATTEMPT DECRYPTION ]
                        </button>
                        <button 
                          className={styles.actionBtn}
                          style={{ backgroundColor: "var(--color-accent)", color: "#FFFFFF" }}
                          onClick={() => {
                            setGameLevel(4);
                            setGameLogs(prev => ["[ECDAT ENFORCED] Post-Quantum ML-KEM wrappers activated. Secure boundary established!", ...prev]);
                          }}
                        >
                          [ ACTIVATE ECDAT DEFENSE ]
                        </button>
                      </div>
                    </div>
                  )}

                  {gameLevel === 4 && (
                    <div className={styles.gameLevelBox} style={{ textAlign: "center", padding: "24px 0" }}>
                      <h3 style={{ color: "var(--color-accent)" }}>HACK COMPLETED!</h3>
                      <p style={{ marginTop: "12px", marginBottom: "20px" }}>You successfully completed the cryptanalytic lifecycle. Classical assets fell to Shor's algorithm, but post-quantum ML-KEM lattices remained secure under mathematical noise vectors!</p>
                      <button 
                        className={styles.actionBtn}
                        onClick={() => {
                          setGameLevel(1);
                          setHarvestedCount(0);
                          setShorPeriodVal("");
                          setLatticePlayerNoise(50);
                          setGameLogs(["[GAME RESTART] Prepare cryptanalytic hack..."]);
                        }}
                      >
                        [ PLAY AGAIN ]
                      </button>
                    </div>
                  )}

                  {/* Game logs terminal console */}
                  <div className={styles.gameLogsConsole}>
                    <div className={styles.consoleHeader}>
                      <span className={styles.pulsingDot}></span>
                      <span style={{ marginLeft: "8px" }}>CRYPTANALYST CONSOLE OUTPUT</span>
                    </div>
                    <pre className={styles.consoleLogs}>
                      {gameLogs.map((log, i) => (
                        <div key={i}>{log}</div>
                      ))}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 24 - SECTION: ARCHITECTURE BLUEPRINT */}
      <section id="architecture" className={styles.archSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-sage">10 — BLUEPRINT</span>
            <h2>INSIDE ECDAT</h2>
            <p className={styles.descriptionCenter}>
              A comprehensive view of the modular cryptographic discovery fabric, normalization pipeline, and decision layers.
            </p>
          </div>

          <div className={styles.blueprintContainer}>
            <div className={styles.blueprintLayer}>
              <div className={styles.layerHeader}>ENTERPRISE INGESTION</div>
              <div className={styles.layerNodes}>
                <div>Source Code</div>
                <div>Compiled Binaries</div>
                <div>Certificates</div>
                <div>Containers</div>
                <div>Network Handshakes</div>
                <div>KMS Configurations</div>
              </div>
            </div>
            <div className={styles.blueprintArrow}>&darr;</div>
            <div className={styles.blueprintLayer}>
              <div className={styles.layerHeader}>DISCOVERY & PARSING FABRIC</div>
              <div className={styles.layerNodes}>
                <div>Tree-sitter AST Scanners</div>
                <div>YARA Pattern Signatures</div>
                <div>OpenSSL/TLS Inspectors</div>
                <div>LIEF Binary Analyzers</div>
              </div>
            </div>
            <div className={styles.blueprintArrow}>&darr;</div>
            <div className={styles.blueprintLayer}>
              <div className={styles.layerHeader}>EVIDENCE NORMALIZATION</div>
              <div className={styles.layerNodes}>
                <div>Deduplication Engine</div>
                <div>Terminology Normalizer</div>
                <div>Canonical CBOM Generator</div>
              </div>
            </div>
            <div className={styles.blueprintArrow}>&darr;</div>
            <div className={styles.blueprintLayer}>
              <div className={styles.layerHeader}>DECISION & ANALYSIS PIPELINE</div>
              <div className={styles.layerNodes}>
                <div>Mosca Risk Priority Calculator</div>
                <div>PQC Recommendation Model</div>
                <div>AI Explainable Reasoning</div>
                <div>Topological Migration Planner</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 25 - TECHNOLOGY LAYER */}
      <section className={styles.techSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag">11 — STACK</span>
            <h2>ECDAT TECHNOLOGY STACK</h2>
          </div>

          <div className={styles.techGrid}>
            <div className={styles.techLayerCard}>
              <h5>Frontend Web Portal</h5>
              <div className={styles.techTags}>
                <span className="mono-tag">React</span>
                <span className="mono-tag">Next.js 14</span>
                <span className="mono-tag">Vanilla CSS Modules</span>
              </div>
            </div>
            <div className={styles.techLayerCard}>
              <h5>Analysis Engine</h5>
              <div className={styles.techTags}>
                <span className="mono-tag">Python 3.11</span>
                <span className="mono-tag">Tree-sitter</span>
                <span className="mono-tag">LIEF Binary Analysis</span>
                <span className="mono-tag">FastAPI</span>
              </div>
            </div>
            <div className={styles.techLayerCard}>
              <h5>Data Storage & Graph</h5>
              <div className={styles.techTags}>
                <span className="mono-tag">PostgreSQL</span>
                <span className="mono-tag">Neo4j Graph Database</span>
              </div>
            </div>
            <div className={styles.techLayerCard}>
              <h5>AI Analyst Layer</h5>
              <div className={styles.techTags}>
                <span className="mono-tag">RAG Pipeline</span>
                <span className="mono-tag">Local LLM Interface</span>
                <span className="mono-tag">OpenAI Gateway</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 27 - MVP SECTION */}
      <section className={styles.mvpSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-accent">12 — ROADMAP</span>
            <h2>WHAT WE ARE ACTUALLY BUILDING</h2>
            <p className={styles.descriptionCenter}>
              We maintain a clear distinction between the full system architecture design and what is active in our MVP.
            </p>
          </div>

          <div className={styles.mvpGrid}>
            <div className={styles.mvpBox}>
              <h4>MVP SCOPE</h4>
              <ul className={styles.mvpList}>
                <li>✓ Source Code Scan (AST representation)</li>
                <li>✓ Dependency Scan (Import chain)</li>
                <li>✓ Certificate Scan (RSA/ECC key checker)</li>
                <li>✓ Canonical CBOM Output (JSON schema)</li>
                <li>✓ Interactive Mosca Risk Score Calculator</li>
                <li>✓ Preliminary PQC Candidates scorecards</li>
                <li>✓ Technical Presentation Slide Companion</li>
              </ul>
            </div>
            <div className={styles.mvpBox} style={{ borderColor: "var(--color-stone)" }}>
              <h4>FUTURE SCOPE</h4>
              <ul className={styles.mvpList}>
                <li>◷ Binary Analysis Engine (LIEF parsing integrations)</li>
                <li>◷ Network negotiation tap (eBPF packet tracking)</li>
                <li>◷ Live Neo4j Graph DB cluster deployment</li>
                <li>◷ Automated PR check integration hook</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 30 - CHALLENGES MATRIX */}
      <section className={styles.matrixSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-sage">13 — CONSTRAINTS</span>
            <h2>ENGINEERING CHALLENGES</h2>
          </div>

          <div className={styles.matrixGrid}>
            <div className={styles.matrixList}>
              {challenges.map((chg, idx) => (
                <button
                  key={idx}
                  className={`${styles.matrixBtn} ${activeChallenge === idx ? styles.activeMatrixBtn : ""}`}
                  onClick={() => setActiveChallenge(idx)}
                >
                  {chg.ch}
                </button>
              ))}
            </div>
            <div className={styles.matrixDetails}>
              <h5>ECDAT RESPONSE DESIGN</h5>
              <p className={styles.largePara}>{challenges[activeChallenge].resp}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 31 - IMPACT & TRANSFORMATION */}
      <section id="impact" className={styles.impactSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag">14 — IMPACT</span>
            <h2>FROM INVENTORY TO READINESS</h2>
          </div>

          <div className={styles.impactGrid}>
            <div className={styles.impactCard}>
              <h5>VISIBILITY</h5>
              <p>Instantly know where cryptographic methods exist inside applications, libraries, or network interfaces.</p>
            </div>
            <div className={styles.impactCard}>
              <h5>PRIORITIZATION</h5>
              <p>Identify critical assets that need immediate post-quantum attention based on exposure and Mosca's law.</p>
            </div>
            <div className={styles.impactCard}>
              <h5>MIGRATION INTELLIGENCE</h5>
              <p>Determine exactly what candidates to evaluate and how to layout the topological migration phases.</p>
            </div>
            <div className={styles.impactCard}>
              <h5>CONTINUOUS ASSURANCE</h5>
              <p>Track validation metrics continuously over time to verify transition compliance across teams.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 33 - TEAM SECTION */}
      <section id="team" className={styles.teamSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-accent">15 — ROSTER</span>
            <h2>LATENTMANIFOLD</h2>
            <p className={styles.descriptionCenter}>
              Six engineers. One cryptographic visibility problem.
            </p>
            <div className="mono-tag-accent" style={{ marginTop: "12px", display: "inline-block" }}>
              TEAM ID: SIH2026-143
            </div>
          </div>

          <div className={styles.teamGrid}>
            <div className={styles.memberCard}>
              <span className={styles.memberNum}>01</span>
              <h4>N Bharath</h4>
              <span className="mono-tag-accent">TEAM LEADER</span>
              <p className={styles.memberUsn}>USN: ENG24CS0537</p>
              <p className={styles.memberBranch}>Computer Science and Engineering (Core)</p>
            </div>
            <div className={styles.memberCard}>
              <span className={styles.memberNum}>02</span>
              <h4>Shwetakshi Satvika</h4>
              <span className="mono-tag">DEVELOPER</span>
              <p className={styles.memberUsn}>USN: ENG24AM0291</p>
              <p className={styles.memberBranch}>Artificial Intelligence and Machine Learning</p>
            </div>
            <div className={styles.memberCard}>
              <span className={styles.memberNum}>03</span>
              <h4>Akhil Vipin Nair</h4>
              <span className="mono-tag">DEVELOPER</span>
              <p className={styles.memberUsn}>USN: ENG24CS0756</p>
              <p className={styles.memberBranch}>Computer Science and Engineering (Core)</p>
            </div>
            <div className={styles.memberCard}>
              <span className={styles.memberNum}>04</span>
              <h4>Soham R Hiremath</h4>
              <span className="mono-tag">DEVELOPER</span>
              <p className={styles.memberUsn}>USN: ENG24CS0670</p>
              <p className={styles.memberBranch}>Computer Science and Engineering (Core)</p>
            </div>
            <div className={styles.memberCard}>
              <span className={styles.memberNum}>05</span>
              <h4>Vishwajith K</h4>
              <span className="mono-tag">DEVELOPER</span>
              <p className={styles.memberUsn}>USN: ENG24CS0737</p>
              <p className={styles.memberBranch}>Computer Science and Engineering (Core)</p>
            </div>
            <div className={styles.memberCard}>
              <span className={styles.memberNum}>06</span>
              <h4>Anirudhha Veeranagaiah M</h4>
              <span className="mono-tag">DEVELOPER</span>
              <p className={styles.memberUsn}>USN: ENG24RA0026</p>
              <p className={styles.memberBranch}>Artificial Intelligence and Robotics</p>
            </div>
          </div>

          <div className={styles.mentorBox}>
            <span className="mono-tag-sage">FACULTY MENTOR</span>
            <h4>Dr. Basavaraj N Hiremath</h4>
            <p>Department of Computer Science and Engineering | Dayananda Sagar University</p>
            <div className={styles.mentorContact}>
              <span>Email: basavaraj-cse@dsu.edu.in</span>
              <span>Phone: 98864 96530</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
