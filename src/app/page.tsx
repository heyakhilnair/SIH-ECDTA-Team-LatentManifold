"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
            <a href="#how-it-works" className={styles.primaryBtn}>
              EXPLORE THE SYSTEM &rarr;
            </a>
            <a href="/evidence" className={styles.secondaryBtn}>
              VIEW EVIDENCE &rarr;
            </a>
          </div>
        </div>
      </header>

      {/* 09 - HERO VISUAL FLOW (CONVERGENCE & EMERGENCE) */}
      <section className={styles.visualSection}>
        <div className="container">
          <div className={styles.visualCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>ECDAT CONVERGENCE & EMERGENCE PIPELINE</span>
              <span className="mono-tag-sage">ARCHITECTED</span>
            </div>
            
            <div className={styles.pipelineContainer}>
              {/* Left Column: Enterprise Sources */}
              <div className={styles.pipelineCol}>
                <h4 className={styles.colTitle}>ENTERPRISE SOURCES</h4>
                <div className={styles.sourceList}>
                  <div className={styles.sourceNode}>CODE</div>
                  <div className={styles.sourceNode}>BINARIES</div>
                  <div className={styles.sourceNode}>LIBRARIES</div>
                  <div className={styles.sourceNode}>CONTAINERS</div>
                  <div className={styles.sourceNode}>CERTIFICATES</div>
                  <div className={styles.sourceNode}>CLOUD</div>
                  <div className={styles.sourceNode}>KUBERNETES</div>
                  <div className={styles.sourceNode}>NETWORK</div>
                  <div className={styles.sourceNode}>HSM / KMS</div>
                  <div className={styles.sourceNode}>SBOM</div>
                </div>
              </div>

              {/* Center: ECDAT Core */}
              <div className={styles.pipelineCenter}>
                <div className={styles.ecdatCoreNode}>
                  <div className={styles.corePulse}></div>
                  <span className={styles.coreText}>ECDAT</span>
                  <span className={styles.coreSub}>DISCOVERY ENGINE</span>
                </div>
                <div className={styles.connectorLines}>
                  <svg className={styles.svgLines} width="100%" height="100%">
                    <path d="M0,50 L100,50" stroke="var(--color-stone)" strokeWidth="2" strokeDasharray="5,5" />
                  </svg>
                </div>
              </div>

              {/* Right Column: Structured Intelligence */}
              <div className={styles.pipelineCol}>
                <h4 className={styles.colTitle}>STRUCTURED OUTPUT</h4>
                <div className={styles.outputList}>
                  <div className={styles.outputNode}>CBOM INVENTORY</div>
                  <div className={styles.outputNode}>KNOWLEDGE GRAPH</div>
                  <div className={styles.outputNode}>QUANTUM RISK ENGINE</div>
                  <div className={styles.outputNode}>PQC RECOMMENDATION</div>
                  <div className={styles.outputNode}>MIGRATION PLAN</div>
                </div>
              </div>
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
                  <p>Organizations need actionable recommendations: what should replace it, what hybrid schemes fit latency constraints, and in what order components must be upgraded.</p>
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

      {/* 18 - SECTION: KNOWLEDGE GRAPH */}
      <section className={styles.graphSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-sage">05 — RELATIONSHIP INTELLIGENCE</span>
            <h2>INVENTORY IS NOT ENOUGH. RELATIONSHIPS MATTER.</h2>
            <p className={styles.descriptionCenter}>
              ECDAT connects cryptographic assets with applications, dependencies, data, infrastructure, and other contextual relationships.
            </p>
          </div>

          <div className={styles.graphGrid}>
            <div className={styles.graphVisualColumn}>
              <div className={styles.graphMapContainer}>
                <div className={styles.graphNodeGroup}>
                  <div className={styles.graphNodeApp}>APPLICATION<div className={styles.nodeSub}>Payment Gateway</div></div>
                  <div className={styles.graphEdge}>uses &rarr;</div>
                  <div className={styles.graphNodeLib}>LIBRARY<div className={styles.nodeSub}>OpenSSL v1.1.1</div></div>
                  <div className={styles.graphEdge}>implements &rarr;</div>
                  <div className={styles.graphNodeAlg}>ALGORITHM<div className={styles.nodeSub}>RSA-2048</div></div>
                  <div className={styles.graphEdge}>protects &rarr;</div>
                  <div className={styles.graphNodeData}>DATA<div className={styles.nodeSub}>Credit Card Numbers</div></div>
                </div>
                <div className={styles.graphNodeGroup2}>
                  <div className={styles.graphNodeApp} style={{ opacity: 0.7 }}>CONTAINER<div className={styles.nodeSub}>payment-prod-01</div></div>
                  <div className={styles.graphEdge}>runs on &rarr;</div>
                  <div className={styles.graphNodeLib} style={{ opacity: 0.7 }}>INFRASTRUCTURE<div className={styles.nodeSub}>AWS EKS Cluster</div></div>
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

      {/* 19 - SECTION: QUANTUM RISK */}
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
                ECDAT applies Mosca's Theorem (Theorem of Risk) to calculate priority. We model:
              </p>
              
              <ul className={styles.riskList}>
                <li><strong>Data Lifetime (X)</strong>: How long must the encrypted data remain secure?</li>
                <li><strong>Migration Time (Y)</strong>: How long will it take to update the systems to PQC?</li>
                <li><strong>Threat Horizon (Z)</strong>: When will a cryptanalytically relevant quantum computer (CRQC) be available?</li>
              </ul>
              
              <p className={styles.subPara}>
                If <strong>X + Y &gt; Z</strong>, the organization is already exposed to harvest-now-decipher-later attacks, elevating priority immediately.
              </p>
            </div>

            <div className={styles.riskCalculatorBox}>
              <div className={styles.calculatorHeader}>
                <span>MOSCA RISK EQUATION MODEL</span>
                <span className="mono-tag-accent">RISK ENGINE v1.0</span>
              </div>
              <div className={styles.calcBody}>
                <div className={styles.calcFormula}>
                  <div className={styles.calcTerm}>
                    <span className={styles.termLabel}>Data Lifetime</span>
                    <span className={styles.termVar}>X</span>
                  </div>
                  <span className={styles.calcOp}>+</span>
                  <div className={styles.calcTerm}>
                    <span className={styles.termLabel}>Migration Time</span>
                    <span className={styles.termVar}>Y</span>
                  </div>
                  <span className={styles.calcOp}>&gt;</span>
                  <div className={styles.calcTerm}>
                    <span className={styles.termLabel}>Threat Horizon</span>
                    <span className={styles.termVar}>Z</span>
                  </div>
                </div>

                <div className={styles.calcStatusList}>
                  <div className={styles.calcStatusRow}>
                    <span className={`${styles.statusBadge} ${styles.badgeCritical}`}>CRITICAL</span>
                    <span className={styles.statusLabel}>X + Y &gt; Z (EXPOSED NOW)</span>
                  </div>
                  <div className={styles.calcStatusRow}>
                    <span className={`${styles.statusBadge} ${styles.badgeHigh}`}>HIGH</span>
                    <span className={styles.statusLabel}>X + Y &asymp; Z (MIGRATE IMMEDIATELY)</span>
                  </div>
                  <div className={styles.calcStatusRow}>
                    <span className={`${styles.statusBadge} ${styles.badgeMedium}`}>MEDIUM</span>
                    <span className={styles.statusLabel}>X + Y &lt; Z (PLAN TRANSITION)</span>
                  </div>
                  <div className={styles.calcStatusRow}>
                    <span className={`${styles.statusBadge} ${styles.badgeLow}`}>LOW</span>
                    <span className={styles.statusLabel}>TEMPORARY / LOW IMPACT DATA</span>
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

      {/* 24 - SECTION: ARCHITECTURE BLUEPRINT */}
      <section id="architecture" className={styles.archSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-sage">09 — BLUEPRINT</span>
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
              <div className={styles.layerHeader}>NORMALIZATION LAYER</div>
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
            <span className="mono-tag">10 — STACK</span>
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
            <span className="mono-tag-accent">11 — ROADMAP</span>
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

      {/* 28 - DEMO / PROTOTYPE */}
      <section id="demo" className={styles.demoSection}>
        <div className="container">
          <div className={styles.demoFrame}>
            <div className={styles.frameHeader}>
              <span className={styles.frameDot}></span>
              <span>ECDAT CONSOLE PANEL</span>
            </div>
            <div className={styles.frameBody}>
              <h3>PROTOTYPE IN ACTIVE DEVELOPMENT</h3>
              <p>The core scanning engine and graph mapping services are undergoing integration benchmarking.</p>
              <div className={styles.loaderLine}></div>
              <div className={styles.demoLinks}>
                <a href="/presentation" className={styles.primaryBtn}>
                  EXPLORE INTERACTIVE SLIDES &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 30 - CHALLENGES MATRIX */}
      <section className={styles.matrixSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="mono-tag-sage">12 — CONSTRAINTS</span>
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
            <span className="mono-tag">13 — IMPACT</span>
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
            <span className="mono-tag-accent">14 — ROSTER</span>
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
