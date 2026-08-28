"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import styles from "./Prototype.module.css";

interface CryptographicAsset {
  id: string;
  file: string;
  algorithm: string;
  function: string;
  library: string;
  safe: boolean;
  dataProtected: string;
  blastRadius: string;
}

export default function Prototype() {
  // Main assets list in state so remediation dynamically mutates it
  const [assets, setAssets] = useState<CryptographicAsset[]>([
    { id: "ASSET-001", file: "src/auth/token.go", algorithm: "RSA-2048", function: "ASYMMETRIC_KEY_EXCHANGE", library: "crypto/rsa", safe: false, dataProtected: "Session Tokens", blastRadius: "High" },
    { id: "ASSET-002", file: "src/db/connection.go", algorithm: "AES-256-GCM", function: "SYMMETRIC_ENCRYPTION", library: "crypto/cipher", safe: true, dataProtected: "User Credentials", blastRadius: "Low" },
    { id: "ASSET-003", file: "src/utils/hash.go", algorithm: "SHA-1", function: "HASHING", library: "crypto/sha1", safe: false, dataProtected: "File Integrity Check", blastRadius: "Medium" },
    { id: "ASSET-004", file: "src/api/gateway.go", algorithm: "ECDH-P256", function: "KEY_AGREEMENT", library: "crypto/elliptic", safe: false, dataProtected: "Transit TLS Session", blastRadius: "High" },
    { id: "ASSET-005", file: "src/pqc/vault.go", algorithm: "ML-KEM-768", function: "POST_QUANTUM_KEM", library: "pqc/mlkem", safe: true, dataProtected: "Master Vault Secret", blastRadius: "Critical" },
    { id: "ASSET-006", file: "src/signatures/signer.go", algorithm: "ML-DSA-65", function: "POST_QUANTUM_SIGNATURE", library: "pqc/mldsa", safe: true, dataProtected: "Code Audits", blastRadius: "Low" }
  ]);

  const [selectedAssetId, setSelectedAssetId] = useState<string>("ASSET-001");
  const [searchQuery, setSearchQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Tab switch for Left Panel: cbom, graph, playground, handshake, forecaster
  const [activeLeftTab, setActiveLeftTab] = useState("cbom");

  // PQC Workbench States
  const [selectedPqcTarget, setSelectedPqcTarget] = useState("hybrid-mlkem");
  const [compilingPqc, setCompilingPqc] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);
  const [compiledReport, setCompiledReport] = useState<any | null>(null);

  // Lattice Labs States
  const [noiseLevel, setNoiseLevel] = useState(3);

  // Moser Forecaster States
  const [crqcYear, setCrqcYear] = useState(2035);
  const [shelfLife, setShelfLife] = useState(7);

  // Maturity Index States
  const [maturityAnswers, setMaturityAnswers] = useState({
    q1: true,
    q2: false,
    q3: false,
    q4: false,
    q5: false
  });

  // Copy button state
  const [copied, setCopied] = useState(false);
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stateful checkboxes for migration tasks
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    task1: true,
    task2: false,
    task3: false,
    task4: false,
    task5: false
  });

  // Compliance filter: all, nsa-cnsa, fips, cisa
  const [complianceFilter, setComplianceFilter] = useState("all");

  // AST Code Playground States
  const [editorLanguage, setEditorLanguage] = useState("go");
  const [astLogs, setAstLogs] = useState<string[]>([]);
  const [astScanning, setAstScanning] = useState(false);
  const [astScanComplete, setAstScanComplete] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);

  // TLS Handshake States
  const [handshakeSuite, setHandshakeSuite] = useState("hybrid"); // classical, pure-pqc, hybrid
  const [handshakeRunning, setHandshakeRunning] = useState(false);
  const [handshakeStep, setHandshakeStep] = useState(0); // 0: idle, 1..5: steps, 6: done
  const [handshakeLogs, setHandshakeLogs] = useState<string[]>([]);

  const codeTemplates = {
    go: `package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"fmt"
)

func main() {
	// VULNERABLE: RSA-2048 is cryptanalytically weak against CRQCs
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		panic(err)
	}

	// VULNERABLE: SHA-1 hashing is collision-vulnerable
	hasher := sha1.New()
	hasher.Write([]byte("critical-token-data"))
	
	fmt.Printf("Keys generated. Hash: %x\\n", hasher.Sum(nil))
}`,
    python: `from Cryptodome.PublicKey import RSA
from Cryptodome.Hash import MD5
import ssl

def establish_session():
    # VULNERABLE: Small RSA key size (1024-bit)
    key = RSA.generate(1024)
    
    # VULNERABLE: MD5 is insecure and deprecated
    h = MD5.new()
    h.update(b"session-salt")
    
    # VULNERABLE: Weak protocol negotiation
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLSv1_1)
    return key, h.hexdigest()`,
    javascript: `const crypto = require('crypto');

function encryptSensitiveData(password) {
    // VULNERABLE: MD5 hashing is vulnerable
    const key = crypto.createHash('md5').update(password).digest();
    
    // VULNERABLE: DES is deprecated symmetric cipher
    const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
    
    let encrypted = cipher.update('confidential_payload', 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}`
  };

  const [currentCodeText, setCurrentCodeText] = useState(codeTemplates.go);

  useEffect(() => {
    setCurrentCodeText(codeTemplates[editorLanguage as keyof typeof codeTemplates]);
    setAstScanComplete(false);
    setHighlightedLines([]);
    setAstLogs([]);
  }, [editorLanguage]);

  const migrationTasks = [
    { id: "task1", label: "AST scan of core authentication package", desc: "Identify all hardcoded parameters and imports in token files." },
    { id: "task2", label: "Implement hybrid key encapsulation negotiator", desc: "Add dual ML-KEM + X25519 negotiation headers." },
    { id: "task3", label: "Replace crypto/sha1 instances with sha256", desc: "Refactor hashing algorithms across utility pipelines." },
    { id: "task4", label: "Establish ML-DSA firmware signatures", desc: "Integrate FIPS 204 signatures in continuous build validation." },
    { id: "task5", label: "Perform full compliance auditing", desc: "Validate that all endpoints negotiate post-quantum ciphers." }
  ];

  const pqcTargets = {
    "RSA-2048": [
      { id: "hybrid-mlkem", name: "Hybrid X25519 + ML-KEM-768", latency: "38 µs", keySize: "1216 Bytes", compliance: "FIPS 203 Compliant (Draft)", code: `import "github.com/latentmanifold/ecdat/pqc/hybrid"\n\n// Initialize dual safe key exchange\nkeyExchange := hybrid.NewX25519MLKEM768()` },
      { id: "pure-mlkem", name: "Pure ML-KEM-768 (Kyber)", latency: "26 µs", keySize: "1184 Bytes", compliance: "FIPS 203 Compliant", code: `import "github.com/latentmanifold/ecdat/pqc/mlkem"\n\n// Generate Kyber key pair\npubKey, privKey, _ := mlkem.GenerateKey768()` },
      { id: "mceliece", name: "Classic McEliece-6960119", latency: "140 µs", keySize: "1047319 Bytes", compliance: "NIST Alternative Round 4", code: `import "github.com/latentmanifold/ecdat/pqc/mceliece"\n\n// Best suited for cold archival storage\nencap, decap := mceliece.Init6960119()` }
    ],
    "ECDH-P256": [
      { id: "hybrid-mlkem", name: "Hybrid X25519 + ML-KEM-768", latency: "38 µs", keySize: "1216 Bytes", compliance: "FIPS 203 Compliant (Draft)", code: `import "github.com/latentmanifold/ecdat/pqc/hybrid"\n\nkeyExchange := hybrid.NewX25519MLKEM768()` },
      { id: "pure-mlkem", name: "Pure ML-KEM-768 (Kyber)", latency: "26 µs", keySize: "1184 Bytes", compliance: "FIPS 203 Compliant", code: `import "github.com/latentmanifold/ecdat/pqc/mlkem"\n\npubKey, privKey, _ := mlkem.GenerateKey768()` },
      { id: "bike", name: "BIKE-L3 (Code-based)", latency: "95 µs", keySize: "3246 Bytes", compliance: "NIST Round 4 Candidate", code: `import "github.com/latentmanifold/ecdat/pqc/bike"\n\nkem := bike.NewLevel3()` }
    ],
    "SHA-1": [
      { id: "sha256", name: "SHA-256", latency: "4 µs", keySize: "32 Bytes", compliance: "FIPS 180-4 Compliant", code: `import "crypto/sha256"\n\nhasher := sha256.New()` },
      { id: "sha3", name: "SHA3-256 (Keccak)", latency: "8 µs", keySize: "32 Bytes", compliance: "FIPS 202 Compliant", code: `import "golang.org/x/crypto/sha3"\n\nhasher := sha3.New256()` },
      { id: "blake3", name: "BLAKE3 (Parallel Hash)", latency: "1.5 µs", keySize: "32 Bytes", compliance: "Non-FIPS (High-Perf Alternative)", code: `import "github.com/zeebo/blake3"\n\nhasher := blake3.New()` }
    ]
  };

  const selectedAsset = assets.find(a => a.id === selectedAssetId) || assets[0];

  // Reset PQC target when selected asset changes
  useEffect(() => {
    setCompiledReport(null);
    if (!selectedAsset.safe && selectedAsset.algorithm in pqcTargets) {
      const targets = pqcTargets[selectedAsset.algorithm as keyof typeof pqcTargets];
      setSelectedPqcTarget(targets[0].id);
    } else {
      setSelectedPqcTarget("");
    }
  }, [selectedAssetId, selectedAsset.algorithm, selectedAsset.safe]);

  // Calculate migration progress percentage
  const totalTasks = Object.keys(completedTasks).length;
  const doneTasks = Object.values(completedTasks).filter(Boolean).length;
  const progressPercent = Math.round((doneTasks / totalTasks) * 100);

  const toggleTask = (id: string) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleRescan = () => {
    setScanning(true);
    setScanProgress(0);
    
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  useEffect(() => {
    const handleRescanEvent = () => {
      handleRescan();
    };
    window.addEventListener("trigger-ecdat-rescan", handleRescanEvent);
    return () => window.removeEventListener("trigger-ecdat-rescan", handleRescanEvent);
  }, []);

  // Compile / modernize action (mutates state assets to show real-time changes)
  const handlePqcCompile = () => {
    setCompilingPqc(true);
    setCompileProgress(0);
    setCompiledReport(null);

    const interval = setInterval(() => {
      setCompileProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setCompilingPqc(false);
          
          // Generate final report
          const targets = pqcTargets[selectedAsset.algorithm as keyof typeof pqcTargets];
          const activeTarget = targets.find(t => t.id === selectedPqcTarget);
          setCompiledReport(activeTarget);

          // MUTATE ASSET IN STATE to represent code patch completion!
          if (activeTarget) {
            setAssets(prevAssets => 
              prevAssets.map(asset => {
                if (asset.id === selectedAsset.id) {
                  let remAlgo = "ML-KEM-768";
                  if (selectedAsset.algorithm === "SHA-1") remAlgo = activeTarget.name;
                  if (activeTarget.id === "hybrid-mlkem") remAlgo = "ML-KEM-768 (Hybrid)";
                  return {
                    ...asset,
                    algorithm: remAlgo,
                    safe: true,
                    library: activeTarget.id
                  };
                }
                return asset;
              })
            );
            // Auto check corresponding migration checklist tasks
            if (selectedAsset.id === "ASSET-001") {
              setCompletedTasks(prev => ({ ...prev, task2: true }));
            } else if (selectedAsset.id === "ASSET-003") {
              setCompletedTasks(prev => ({ ...prev, task3: true }));
            }
          }
          return 100;
        }
        return prev + 20;
      });
    }, 100);
  };

  // Direct manual Graph Remediation
  const triggerGraphRemediate = (assetId: string) => {
    const targetAsset = assets.find(a => a.id === assetId);
    if (!targetAsset || targetAsset.safe) return;
    
    setAssets(prevAssets => 
      prevAssets.map(asset => {
        if (asset.id === assetId) {
          let remAlgo = "ML-KEM-768";
          if (asset.algorithm === "SHA-1") remAlgo = "SHA-256";
          if (asset.algorithm === "ECDH-P256") remAlgo = "ML-KEM-768 (Hybrid)";
          return {
            ...asset,
            algorithm: remAlgo,
            safe: true,
            library: "pqc/modernized"
          };
        }
        return asset;
      })
    );

    // Auto-check checklists
    if (assetId === "ASSET-001") setCompletedTasks(prev => ({ ...prev, task2: true }));
    if (assetId === "ASSET-003") setCompletedTasks(prev => ({ ...prev, task3: true }));
    if (assetId === "ASSET-004") setCompletedTasks(prev => ({ ...prev, task5: true }));
  };

  // Compliance framework logic for filtering CBOM table
  const getViolatingAssets = () => {
    return assets.filter(asset => {
      // Search text filter
      const matchesSearch = asset.file.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            asset.algorithm.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (complianceFilter === "all") return true;
      if (complianceFilter === "nsa-cnsa") {
        // CNSA 2.0 mandates post-quantum transition; classical assets violate it
        return !asset.safe;
      }
      if (complianceFilter === "fips") {
        // FIPS 203/204 mandates only FIPS-standard quantum ciphers (Kyber/Dilithium)
        return !asset.safe;
      }
      if (complianceFilter === "cisa") {
        // CISA BOD flags high blast radius classical exposures
        return !asset.safe && (asset.blastRadius === "High" || asset.blastRadius === "Critical");
      }
      return true;
    });
  };

  const filteredAssets = getViolatingAssets();

  // Export CycloneDX CBOM JSON file
  const exportCycloneDX = () => {
    const randomUuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    const bom = {
      bomFormat: "CycloneDX",
      specVersion: "1.6",
      serialNumber: `urn:uuid:${randomUuid}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [
          {
            vendor: "LatentManifold",
            name: "ECDAT Security Core",
            version: "1.0.0"
          }
        ],
        component: {
          type: "application",
          name: "ECDAT-Discovered-Bill-Of-Materials",
          version: "0.1.0"
        }
      },
      components: assets.map(a => ({
        type: "cryptographic-asset",
        name: a.file,
        bomRef: a.id,
        description: `Discovered cryptographic component protecting ${a.dataProtected}`,
        hashes: [
          {
            alg: "SHA-256",
            content: "b5bb9d8014a0f9b1d61e21e796d78dccdf1352f23cd32812f4850b878ae4944c"
          }
        ],
        properties: [
          { name: "ecdat:algorithm", value: a.algorithm },
          { name: "ecdat:function", value: a.function },
          { name: "ecdat:library", value: a.library },
          { name: "ecdat:quantum-safe", value: a.safe ? "true" : "false" },
          { name: "ecdat:blast-radius", value: a.blastRadius }
        ]
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bom, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ecdat-cbom-cyclonedx-${complianceFilter}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  // Run simulated AST Code Scanning
  const runCodeScanPlayground = () => {
    setAstScanning(true);
    setAstScanComplete(false);
    setHighlightedLines([]);
    setAstLogs(["[ECDAT-AST] Initializing parser for language: " + editorLanguage.toUpperCase()]);

    setTimeout(() => {
      setAstLogs(prev => [...prev, "[ECDAT-AST] Parsing source text into concrete syntax tree (CST)..."]);
    }, 400);

    setTimeout(() => {
      setAstLogs(prev => [...prev, "[ECDAT-AST] Compiling syntax nodes into Abstract Syntax Tree (AST)..."]);
    }, 800);

    setTimeout(() => {
      setAstLogs(prev => [...prev, "[ECDAT-LINT] Analyzing imports and function signatures against NIST ciphers..."]);
    }, 1200);

    setTimeout(() => {
      if (editorLanguage === "go") {
        setHighlightedLines([10, 11, 12, 16, 17]);
        setAstLogs(prev => [
          ...prev,
          "[SECURITY-ALERT] Found vulnerable cryptographic parameters:",
          "  -> Line 10: rsa.GenerateKey(..., 2048) - 2048 bit modulus violates quantum readiness thresholds.",
          "  -> Line 16: sha1.New() - SHA-1 hashing algorithm is insecure.",
          "[ECDAT-STATUS] AST Analysis Complete. 2 classical targets identified."
        ]);
      } else if (editorLanguage === "python") {
        setHighlightedLines([7, 10, 14]);
        setAstLogs(prev => [
          ...prev,
          "[SECURITY-ALERT] Found vulnerable cryptographic parameters:",
          "  -> Line 7: RSA.generate(1024) - Key modulus below 2048 bits is highly insecure.",
          "  -> Line 10: MD5.new() - MD5 is cryptographic garbage.",
          "  -> Line 14: ssl.SSLContext(ssl.PROTOCOL_TLSv1_1) - Protocol version deprecated by TLS 1.3.",
          "[ECDAT-STATUS] AST Analysis Complete. 3 classical targets identified."
        ]);
      } else {
        setHighlightedLines([5, 8]);
        setAstLogs(prev => [
          ...prev,
          "[SECURITY-ALERT] Found vulnerable cryptographic parameters:",
          "  -> Line 5: crypto.createHash('md5') - MD5 is weak and forbidden in FIPS mode.",
          "  -> Line 8: crypto.createCipheriv('des-ede3-cbc', ...) - Triple DES block size is vulnerable to Sweet32.",
          "[ECDAT-STATUS] AST Analysis Complete. 2 classical targets identified."
        ]);
      }
      setAstScanning(false);
      setAstScanComplete(true);
    }, 1800);
  };

  // Run simulated TLS 1.3 Handshake Protocol
  const runHandshakeSimulation = () => {
    setHandshakeRunning(true);
    setHandshakeStep(1);
    setHandshakeLogs(["[HANDSHAKE START] Client initiating connection..."]);

    const steps = [
      { text: "1. ClientHello sent with key_share extensions...", delay: 600 },
      { text: "2. ServerHello received, negotiating protocol parameters...", delay: 1200 },
      { text: "3. ServerHello Key Share: Computing shared secret parameters...", delay: 1800 },
      { text: "4. Certificate and Signature Verification exchanged...", delay: 2400 },
      { text: "5. Encrypted Extensions verify session integrity...", delay: 3000 },
      { text: "6. Handshake complete! Secure quantum-safe tunnel established.", delay: 3600 }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setHandshakeStep(idx + 1);
        setHandshakeLogs(prev => [...prev, `[HANDSHAKE] ${step.text}`]);
        if (idx === steps.length - 1) {
          setHandshakeRunning(false);
        }
      }, step.delay);
    });
  };

  const getHandshakePerformanceMetrics = () => {
    if (handshakeSuite === "classical") {
      return {
        suiteName: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
        keyExchangeSize: "32 Bytes (ECDH-P256)",
        sigSize: "256 Bytes (RSA-2048)",
        latency: "22 ms (1 RTT)",
        overhead: "288 Bytes",
        classLabel: "Vulnerable to CRQC"
      };
    } else if (handshakeSuite === "pure-pqc") {
      return {
        suiteName: "TLS_MLKEM768_MLDSA65_WITH_AES_256_GCM_SHA384",
        keyExchangeSize: "1,184 Bytes (ML-KEM-768)",
        sigSize: "3,300 Bytes (ML-DSA-65)",
        latency: "34 ms (NIST standard compute)",
        overhead: "4,484 Bytes",
        classLabel: "Quantum-Safe (Large Packets)"
      };
    } else {
      return {
        suiteName: "TLS_HYBRID_X25519_MLKEM768_WITH_AES_256_GCM",
        keyExchangeSize: "1,216 Bytes (X25519 + Kyber)",
        sigSize: "3,300 Bytes (ML-DSA-65)",
        latency: "38 ms (Hybrid dual calculation)",
        overhead: "4,516 Bytes",
        classLabel: "Post-Quantum Secure & Fallback Safe"
      };
    }
  };

  const handshakeMetrics = getHandshakePerformanceMetrics();

  // Calculate Maturity Score
  const maturityScore = Object.values(maturityAnswers).filter(Boolean).length * 20;
  const getMaturityTier = (score: number) => {
    if (score === 100) return { tier: "Tier 5: Continuously Agile", desc: "Automated rotation, hybrid validation, zero-trust cryptographic deployment." };
    if (score >= 80) return { tier: "Tier 4: Policy Compliant", desc: "Governance structures trace CBOM assets continuously." };
    if (score >= 60) return { tier: "Tier 3: Systemically Managed", desc: "Deduplicated CBOM cataloged; manual migrations ongoing." };
    if (score >= 40) return { tier: "Tier 2: Ad-Hoc Discovered", desc: "Preliminary repository scanning completed; missing API pipelines." };
    return { tier: "Tier 1: Legacy Static", desc: "Static asymmetric keys; highly vulnerable to quantum threat timelines." };
  };
  const currentMaturity = getMaturityTier(maturityScore);

  // Calculate Moser exposure timeline metrics
  const currentYear = new Date().getFullYear();
  const transitionStart = currentYear;
  const transitionDuration = Math.round(15 - (maturityScore / 10)); // Higher maturity = faster transition
  const transitionEndYear = transitionStart + transitionDuration;
  const exposureWindow = transitionEndYear > crqcYear ? transitionEndYear - crqcYear : 0;
  const lossProjection = exposureWindow * shelfLife * 3.4; // Multiplier representing business IP value loss ($ Millions)

  return (
    <div className="technical-grid min-h-screen flex flex-col">
      <Navbar />

      <main className={styles.workspaceWrapper}>
        <div className="container flex-grow">
          
          {/* Dashboard Header Bar */}
          <div className={styles.dashboardHeader}>
            <div className={styles.brandGroup}>
              <span className={styles.pulsingDot}></span>
              <h2>ECDAT COMMAND CENTER</h2>
              <span className={styles.subText}>REAL-TIME QUANTUM POSTURE DEPLOYMENT</span>
            </div>

            <div className={styles.actionsBar}>
              <button 
                onClick={handleRescan} 
                className={styles.rescanBtn}
                disabled={scanning}
              >
                {scanning ? `SCANNING ${scanProgress}%` : "[ FORCE RUN DISCOVERY ]"}
              </button>
            </div>
          </div>

          {scanning && (
            <div className={styles.scanProgressContainer}>
              <div className={styles.progressBarWrapper}>
                <div className={styles.progressBar} style={{ width: `${scanProgress}%` }}></div>
              </div>
              <span className={styles.progressLog}>Analyzing tree-sitter AST nodes... Deduplicating CBOM hashes...</span>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span>DISCOVERED CBOM ASSETS</span>
              <h3>{assets.length}</h3>
              <p className={styles.metricSub}>Across 12 repositories</p>
            </div>
            <div className={styles.metricCard}>
              <span>VULNERABLE ALGORITHMS</span>
              <h3 className={assets.filter(a => !a.safe).length > 0 ? styles.redValue : styles.greenValue}>
                {assets.filter(a => !a.safe).length}
              </h3>
              <p className={styles.metricSub}>
                {assets.filter(a => !a.safe).length > 0 
                  ? assets.filter(a => !a.safe).map(a => a.algorithm).join(", ") 
                  : "All Assets remediated"}
              </p>
            </div>
            <div className={styles.metricCard}>
              <span>QUANTUM EXPOSURE SCORE</span>
              <h3 className={exposureWindow > 0 ? styles.redValue : styles.greenValue}>
                {exposureWindow > 0 ? "CRITICAL" : "SECURE"}
              </h3>
              <p className={styles.metricSub}>X + Y ({transitionDuration + shelfLife}y) vs Z ({crqcYear}y)</p>
            </div>
            <div className={styles.metricCard}>
              <span>PQC MIGRATION PROGRESS</span>
              <h3>{progressPercent}%</h3>
              <div className={styles.miniBarWrapper}>
                <div className={styles.miniBar} style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>

          {/* Core Panel Grid */}
          <div className={styles.panelsGrid}>
            
            {/* Left Column: Tab switcher between five sub-workspaces */}
            <div className={styles.leftColumnWrapper}>
              <div className={styles.leftTabSelector}>
                <button
                  className={`${styles.leftTabBtn} ${activeLeftTab === "cbom" ? styles.activeLeftTabBtn : ""}`}
                  onClick={() => setActiveLeftTab("cbom")}
                >
                  CBOM INVENTORY
                </button>
                <button
                  className={`${styles.leftTabBtn} ${activeLeftTab === "graph" ? styles.activeLeftTabBtn : ""}`}
                  onClick={() => setActiveLeftTab("graph")}
                >
                  DEPENDENCY GRAPH
                </button>
                <button
                  className={`${styles.leftTabBtn} ${activeLeftTab === "playground" ? styles.activeLeftTabBtn : ""}`}
                  onClick={() => setActiveLeftTab("playground")}
                >
                  AST PLAYGROUND
                </button>
                <button
                  className={`${styles.leftTabBtn} ${activeLeftTab === "handshake" ? styles.activeLeftTabBtn : ""}`}
                  onClick={() => setActiveLeftTab("handshake")}
                >
                  PQC HANDSHAKE
                </button>
                <button
                  className={`${styles.leftTabBtn} ${activeLeftTab === "forecaster" ? styles.activeLeftTabBtn : ""}`}
                  onClick={() => setActiveLeftTab("forecaster")}
                >
                  FORECASTER & LABS
                </button>
              </div>

              {activeLeftTab === "cbom" && (
                /* Tab A: CBOM Asset Table with Compliance Filter & CycloneDX Exporter */
                <div className={styles.inventoryCard}>
                  <div className={styles.cardHeader}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <h4>CRYPTOGRAPHIC BILL OF MATERIALS (CBOM)</h4>
                      <button onClick={exportCycloneDX} className={styles.exportBtn}>
                        [ EXPORT CYCLONEDX CBOM ]
                      </button>
                    </div>

                    <div className={styles.complianceSelectorBar}>
                      <span className={styles.complianceLabel}>COMPLIANCE POLICY FILTER:</span>
                      <div className={styles.complianceBtns}>
                        <button 
                          className={`${styles.complianceBtn} ${complianceFilter === "all" ? styles.activeComplianceBtn : ""}`}
                          onClick={() => setComplianceFilter("all")}
                        >
                          ALL
                        </button>
                        <button 
                          className={`${styles.complianceBtn} ${complianceFilter === "nsa-cnsa" ? styles.activeComplianceBtn : ""}`}
                          onClick={() => setComplianceFilter("nsa-cnsa")}
                        >
                          NSA CNSA 2.0
                        </button>
                        <button 
                          className={`${styles.complianceBtn} ${complianceFilter === "fips" ? styles.activeComplianceBtn : ""}`}
                          onClick={() => setComplianceFilter("fips")}
                        >
                          NIST FIPS 203/204
                        </button>
                        <button 
                          className={`${styles.complianceBtn} ${complianceFilter === "cisa" ? styles.activeComplianceBtn : ""}`}
                          onClick={() => setComplianceFilter("cisa")}
                        >
                          CISA HIGH-RISK
                        </button>
                      </div>
                    </div>
                    
                    <div className={styles.tableControls}>
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search file, algorithm..."
                        className={styles.searchBar}
                      />
                    </div>
                  </div>

                  <div className={styles.tableWrapper}>
                    <table className={styles.assetsTable}>
                      <thead>
                        <tr>
                          <th>ASSET ID</th>
                          <th>TARGET FILE</th>
                          <th>ALGORITHM</th>
                          <th>COMPLIANCE STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAssets.map((asset) => (
                          <tr 
                            key={asset.id}
                            className={`${styles.tableRow} ${selectedAssetId === asset.id ? styles.selectedRow : ""}`}
                            onClick={() => setSelectedAssetId(asset.id)}
                          >
                            <td className={styles.monoId}>{asset.id}</td>
                            <td className={styles.fileName}>{asset.file}</td>
                            <td className={styles.monoAlg}>{asset.algorithm}</td>
                            <td>
                              {asset.safe ? (
                                <span className={styles.tagSafe}>QUANTUM-SAFE</span>
                              ) : (
                                <span className={styles.tagVulnerable}>VULNERABLE</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredAssets.length === 0 && (
                          <tr>
                            <td colSpan={4} className={styles.emptyTable}>No assets violate selected compliance filters.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeLeftTab === "graph" && (
                /* Tab B: Interactive CBOM Dependency Graph */
                <div className={styles.graphContainerCard}>
                  <div className={styles.cardHeader}>
                    <h4>INTERACTIVE GRAPH BLAST-RADIUS VISUALIZER</h4>
                    <p className={styles.panelIntro}>
                      Hover nodes to see dependency lines. Click a node to view metadata. Remediate nodes to verify deployment change loops.
                    </p>
                  </div>

                  <div className={styles.graphPanelBody}>
                    <div className={styles.svgWrapper}>
                      <svg viewBox="0 0 500 320" className={styles.interactiveSvg}>
                        <defs>
                          <marker id="arrow" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-stone)" />
                          </marker>
                        </defs>

                        {/* Connection Paths (Lines) */}
                        {/* ECDAT System -> Repos */}
                        <line x1="250" y1="40" x2="130" y2="110" stroke="var(--color-stone)" strokeWidth="1.5" />
                        <line x1="250" y1="40" x2="370" y2="110" stroke="var(--color-stone)" strokeWidth="1.5" />

                        {/* Repos -> Files */}
                        <line x1="130" y1="110" x2="80" y2="180" stroke="var(--color-stone)" strokeWidth="1.5" />
                        <line x1="130" y1="110" x2="180" y2="180" stroke="var(--color-stone)" strokeWidth="1.5" />
                        <line x1="370" y1="110" x2="320" y2="180" stroke="var(--color-stone)" strokeWidth="1.5" />
                        <line x1="370" y1="110" x2="420" y2="180" stroke="var(--color-stone)" strokeWidth="1.5" />

                        {/* Files -> Algorithm Targets */}
                        <line x1="80" y1="180" x2="60" y2="260" stroke={assets[0].safe ? "var(--color-sage)" : "var(--color-accent)"} strokeWidth="2" strokeDasharray={assets[0].safe ? "" : "3,3"} />
                        <line x1="180" y1="180" x2="140" y2="260" stroke={assets[2].safe ? "var(--color-sage)" : "var(--color-accent)"} strokeWidth="2" strokeDasharray={assets[2].safe ? "" : "3,3"} />
                        <line x1="320" y1="180" x2="240" y2="260" stroke={assets[3].safe ? "var(--color-sage)" : "var(--color-accent)"} strokeWidth="2" strokeDasharray={assets[3].safe ? "" : "3,3"} />
                        <line x1="420" y1="180" x2="380" y2="260" stroke="var(--color-sage)" strokeWidth="2" />

                        {/* Node Elements */}
                        {/* Root Application Node */}
                        <circle cx="250" cy="40" r="18" className={styles.svgRootNode} />
                        <text x="250" y="44" textAnchor="middle" className={styles.svgNodeTextBold}>ECDAT</text>

                        {/* Repository Nodes */}
                        <circle cx="130" cy="110" r="14" className={styles.svgRepoNode} />
                        <text x="130" y="113" textAnchor="middle" className={styles.svgNodeText}>auth</text>

                        <circle cx="370" cy="110" r="14" className={styles.svgRepoNode} />
                        <text x="370" y="113" textAnchor="middle" className={styles.svgNodeText}>vault</text>

                        {/* File Nodes */}
                        <g className={styles.svgInteractiveNode} onClick={() => setSelectedAssetId("ASSET-001")}>
                          <circle cx="80" cy="180" r="12" className={selectedAssetId === "ASSET-001" ? styles.svgActiveNode : styles.svgFileNode} />
                          <text x="80" y="183" textAnchor="middle" className={styles.svgNodeTextMini}>F1</text>
                        </g>

                        <g className={styles.svgInteractiveNode} onClick={() => setSelectedAssetId("ASSET-003")}>
                          <circle cx="180" cy="180" r="12" className={selectedAssetId === "ASSET-003" ? styles.svgActiveNode : styles.svgFileNode} />
                          <text x="180" y="183" textAnchor="middle" className={styles.svgNodeTextMini}>F3</text>
                        </g>

                        <g className={styles.svgInteractiveNode} onClick={() => setSelectedAssetId("ASSET-004")}>
                          <circle cx="320" cy="180" r="12" className={selectedAssetId === "ASSET-004" ? styles.svgActiveNode : styles.svgFileNode} />
                          <text x="320" y="183" textAnchor="middle" className={styles.svgNodeTextMini}>F4</text>
                        </g>

                        <g className={styles.svgInteractiveNode} onClick={() => setSelectedAssetId("ASSET-005")}>
                          <circle cx="420" cy="180" r="12" className={selectedAssetId === "ASSET-005" ? styles.svgActiveNode : styles.svgFileNode} />
                          <text x="420" y="183" textAnchor="middle" className={styles.svgNodeTextMini}>F5</text>
                        </g>

                        {/* Algorithms Nodes */}
                        {/* RSA-2048 Node */}
                        <g 
                          className={styles.svgInteractiveNode} 
                          onClick={() => setSelectedAssetId("ASSET-001")}
                        >
                          <circle 
                            cx="60" 
                            cy="260" 
                            r="10" 
                            className={assets[0].safe ? styles.svgAlgoNodeSafe : styles.svgAlgoNodeVuln} 
                          />
                          <text x="60" y="263" textAnchor="middle" className={styles.svgAlgoLabel}>RSA</text>
                        </g>

                        {/* SHA-1 Node */}
                        <g 
                          className={styles.svgInteractiveNode} 
                          onClick={() => setSelectedAssetId("ASSET-003")}
                        >
                          <circle 
                            cx="140" 
                            cy="260" 
                            r="10" 
                            className={assets[2].safe ? styles.svgAlgoNodeSafe : styles.svgAlgoNodeVuln} 
                          />
                          <text x="140" y="263" textAnchor="middle" className={styles.svgAlgoLabel}>SHA1</text>
                        </g>

                        {/* ECDH-P256 Node */}
                        <g 
                          className={styles.svgInteractiveNode} 
                          onClick={() => setSelectedAssetId("ASSET-004")}
                        >
                          <circle 
                            cx="240" 
                            cy="260" 
                            r="10" 
                            className={assets[3].safe ? styles.svgAlgoNodeSafe : styles.svgAlgoNodeVuln} 
                          />
                          <text x="240" y="263" textAnchor="middle" className={styles.svgAlgoLabel}>ECDH</text>
                        </g>

                        {/* ML-KEM Node */}
                        <g 
                          className={styles.svgInteractiveNode} 
                          onClick={() => setSelectedAssetId("ASSET-005")}
                        >
                          <circle 
                            cx="380" 
                            cy="260" 
                            r="10" 
                            className={styles.svgAlgoNodeSafe} 
                          />
                          <text x="380" y="263" textAnchor="middle" className={styles.svgAlgoLabel}>KEM</text>
                        </g>
                      </svg>
                    </div>

                    {/* Node Metadata & Action Panel inside Graph tab */}
                    <div className={styles.graphControlOverlay}>
                      <h5>GRAPH NODE INSPECTOR: <strong>{selectedAsset.id}</strong></h5>
                      <div className={styles.graphInspectorGrid}>
                        <div>
                          <p><strong>Module File:</strong> {selectedAsset.file}</p>
                          <p><strong>Crypto Algorithm:</strong> {selectedAsset.algorithm}</p>
                        </div>
                        <div>
                          <p><strong>Data Protected:</strong> {selectedAsset.dataProtected}</p>
                          <p><strong>Status:</strong> {selectedAsset.safe ? "QUANTUM-SAFE" : "VULNERABLE (CRITICAL)"}</p>
                        </div>
                      </div>
                      
                      {!selectedAsset.safe ? (
                        <button 
                          onClick={() => triggerGraphRemediate(selectedAsset.id)}
                          className={styles.graphRemediateBtn}
                        >
                          [ REMEDIATE ALGORITHM TO QUANTUM-SAFE ]
                        </button>
                      ) : (
                        <span className={styles.graphSuccessMsg}>✓ This node is modernized and compliant.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeLeftTab === "playground" && (
                /* Tab C: AST Parser & Code Playground */
                <div className={styles.astPlaygroundCard}>
                  <div className={styles.cardHeader}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4>AST SOURCE CODE SCANNER PLAYGROUND</h4>
                      <select 
                        value={editorLanguage} 
                        onChange={(e) => setEditorLanguage(e.target.value)}
                        className={styles.langSelector}
                      >
                        <option value="go">Go Source</option>
                        <option value="python">Python SSL</option>
                        <option value="javascript">JavaScript Crypto</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.playgroundMain}>
                    <div className={styles.codeTextEditorColumn}>
                      <span className={styles.visualLabel}>SOURCE CODE COMPILER WRITER</span>
                      <textarea
                        value={currentCodeText}
                        onChange={(e) => {
                          setCurrentCodeText(e.target.value);
                          setAstScanComplete(false);
                        }}
                        className={styles.codeTextArea}
                        rows={16}
                      />
                      <button 
                        onClick={runCodeScanPlayground} 
                        className={styles.scanAstBtn}
                        disabled={astScanning}
                      >
                        {astScanning ? "[ PARSING TREE AST SHIELD... ]" : "[ RUN AST PARSER SCAN ]"}
                      </button>
                    </div>

                    <div className={styles.astTreeSidebar}>
                      <span className={styles.visualLabel}>AST STRUCTURAL NODES</span>
                      <div className={styles.astNodeListScroll}>
                        {astScanComplete ? (
                          editorLanguage === "go" ? (
                            <div className={styles.astTreeRoot}>
                              <div className={styles.astTreeNode}>File: main.go</div>
                              <div className={styles.astTreeNodeIndent1}>├─ GenDecl (Imports)</div>
                              <div className={`${styles.astTreeNodeIndent2} ${styles.astNodeWarning}`}>├─ ImportSpec ("crypto/rsa") [!]</div>
                              <div className={`${styles.astTreeNodeIndent2} ${styles.astNodeWarning}`}>└─ ImportSpec ("crypto/sha1") [!]</div>
                              <div className={styles.astTreeNodeIndent1}>└─ FuncDecl: main()</div>
                              <div className={styles.astTreeNodeIndent2}>├─ AssignStmt (privateKey)</div>
                              <div className={`${styles.astTreeNodeIndent3} ${styles.astNodeWarning}`}>└─ CallExpr: rsa.GenerateKey (2048b) [!]</div>
                              <div className={styles.astTreeNodeIndent2}>└─ AssignStmt (hasher)</div>
                              <div className={`${styles.astTreeNodeIndent3} ${styles.astNodeWarning}`}>└─ CallExpr: sha1.New() [!]</div>
                            </div>
                          ) : editorLanguage === "python" ? (
                            <div className={styles.astTreeRoot}>
                              <div className={styles.astTreeNode}>Module: session.py</div>
                              <div className={styles.astTreeNodeIndent1}>├─ ImportFrom (RSA)</div>
                              <div className={styles.astTreeNodeIndent1}>├─ ImportFrom (MD5)</div>
                              <div className={styles.astTreeNodeIndent1}>└─ FunctionDef: establish_session()</div>
                              <div className={`${styles.astTreeNodeIndent2} ${styles.astNodeWarning}`}>├─ Call: RSA.generate (1024b) [!]</div>
                              <div className={`${styles.astTreeNodeIndent2} ${styles.astNodeWarning}`}>├─ Call: MD5.new() [!]</div>
                              <div className={`${styles.astTreeNodeIndent2} ${styles.astNodeWarning}`}>└─ Call: ssl.SSLContext (TLSv1_1) [!]</div>
                            </div>
                          ) : (
                            <div className={styles.astTreeRoot}>
                              <div className={styles.astTreeNode}>Program: encrypt.js</div>
                              <div className={styles.astTreeNodeIndent1}>├─ VariableDeclaration (crypto)</div>
                              <div className={styles.astTreeNodeIndent1}>└─ FunctionDeclaration: encryptSensitiveData()</div>
                              <div className={`${styles.astTreeNodeIndent2} ${styles.astNodeWarning}`}>├─ CallExpression: crypto.createHash ("md5") [!]</div>
                              <div className={`${styles.astTreeNodeIndent2} ${styles.astNodeWarning}`}>└─ CallExpression: crypto.createCipheriv ("des") [!]</div>
                            </div>
                          )
                        ) : (
                          <div className={styles.astEmpty}>Run AST scan to parse nodes.</div>
                        )}
                      </div>

                      {/* Scanning logs terminal */}
                      <div className={styles.playgroundConsole}>
                        <div className={styles.consoleHeader}>PARSING CONSOLE LOG</div>
                        <div className={styles.consoleContent}>
                          {astLogs.map((log, i) => (
                            <div key={i} className={styles.consoleLine}>{log}</div>
                          ))}
                          {astLogs.length === 0 && <div className={styles.consoleLine}>Simulator standing by.</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeLeftTab === "handshake" && (
                /* Tab D: TLS 1.3 Hybrid Handshake Simulator */
                <div className={styles.handshakeCard}>
                  <div className={styles.cardHeader}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4>TLS 1.3 HYBRID HANDSHAKE PROTOCOL SIMULATOR</h4>
                      <div className={styles.suiteSelectorGroup}>
                        <button 
                          className={`${styles.suiteBtn} ${handshakeSuite === "classical" ? styles.activeSuiteBtn : ""}`}
                          onClick={() => { setHandshakeSuite("classical"); setHandshakeStep(0); setHandshakeLogs([]); }}
                        >
                          Classical RSA
                        </button>
                        <button 
                          className={`${styles.suiteBtn} ${handshakeSuite === "pure-pqc" ? styles.activeSuiteBtn : ""}`}
                          onClick={() => { setHandshakeSuite("pure-pqc"); setHandshakeStep(0); setHandshakeLogs([]); }}
                        >
                          Pure PQC
                        </button>
                        <button 
                          className={`${styles.suiteBtn} ${handshakeSuite === "hybrid" ? styles.activeSuiteBtn : ""}`}
                          onClick={() => { setHandshakeSuite("hybrid"); setHandshakeStep(0); setHandshakeLogs([]); }}
                        >
                          Hybrid ML-KEM
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.handshakeBody}>
                    <div className={styles.handshakeDiagramWrapper}>
                      <div className={styles.endpointColumn}>
                        <h5>CLIENT TERMINAL</h5>
                        <div className={styles.endpointBox}>Edge Browser</div>
                      </div>
                      
                      <div className={styles.handshakeAnimationSpace}>
                        {/* Handshake line flows */}
                        <div className={styles.timingLine}></div>
                        
                        {handshakeStep >= 1 && (
                          <div className={`${styles.packetLine} ${styles.pClientToServer} ${handshakeStep === 1 ? styles.animatingPacket : ""}`}>
                            ClientHello (KeyShare)
                          </div>
                        )}
                        {handshakeStep >= 2 && (
                          <div className={`${styles.packetLine} ${styles.pServerToClient} ${handshakeStep === 2 ? styles.animatingPacket : ""}`}>
                            ServerHello
                          </div>
                        )}
                        {handshakeStep >= 3 && (
                          <div className={`${styles.packetLine} ${styles.pClientToServer} ${handshakeStep === 3 ? styles.animatingPacket : ""}`}>
                            Hybrid Key Exchange Payload
                          </div>
                        )}
                        {handshakeStep >= 4 && (
                          <div className={`${styles.packetLine} ${styles.pServerToClient} ${handshakeStep === 4 ? styles.animatingPacket : ""}`}>
                            Certificate Exch & Signatures
                          </div>
                        )}
                        {handshakeStep >= 5 && (
                          <div className={`${styles.packetLine} ${styles.pClientToServer} ${handshakeStep === 5 ? styles.animatingPacket : ""}`}>
                            Finished (Encrypted Tunnel)
                          </div>
                        )}
                      </div>

                      <div className={styles.endpointColumn}>
                        <h5>SERVER GATEWAY</h5>
                        <div className={styles.endpointBox}>ECDAT HSM Proxy</div>
                      </div>
                    </div>

                    <div className={styles.handshakeControlsBar}>
                      <button 
                        onClick={runHandshakeSimulation} 
                        className={styles.runHandshakeBtn}
                        disabled={handshakeRunning}
                      >
                        {handshakeRunning ? "[ PROTOCOL NEGOTIATING... ]" : "[ NEGOTIATE HANDSHAKE ]"}
                      </button>
                    </div>

                    {/* Protocol Logs & Statistics */}
                    <div className={styles.handshakeStatsGrid}>
                      <div className={styles.handshakeLogsPanel}>
                        <span className={styles.visualLabel}>CONNECTION LOGS</span>
                        <div className={styles.logsConsole}>
                          {handshakeLogs.map((log, i) => (
                            <div key={i} className={styles.consoleLine}>{log}</div>
                          ))}
                          {handshakeLogs.length === 0 && <div className={styles.consoleLine}>Click negotiate to test handshake layers.</div>}
                        </div>
                      </div>

                      <div className={styles.performanceMetricsPanel}>
                        <span className={styles.visualLabel}>PERFORMANCE COMPARISONS</span>
                        <table className={styles.handshakeTable}>
                          <tbody>
                            <tr>
                              <td>Cipher Suite:</td>
                              <td><strong className={styles.monoId}>{handshakeMetrics.suiteName}</strong></td>
                            </tr>
                            <tr>
                              <td>Key Exchange Payload:</td>
                              <td>{handshakeMetrics.keyExchangeSize}</td>
                            </tr>
                            <tr>
                              <td>Signature Size:</td>
                              <td>{handshakeMetrics.sigSize}</td>
                            </tr>
                            <tr>
                              <td>Handshake Latency:</td>
                              <td><strong style={{ color: handshakeSuite === "classical" ? "var(--color-sage)" : "var(--color-accent)" }}>{handshakeMetrics.latency}</strong></td>
                            </tr>
                            <tr>
                              <td>Total Network Overhead:</td>
                              <td>{handshakeMetrics.overhead}</td>
                            </tr>
                            <tr>
                              <td>Security Classification:</td>
                              <td>
                                <span className={handshakeSuite === "classical" ? styles.tagVulnerable : styles.tagSafe}>
                                  {handshakeMetrics.classLabel}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeLeftTab === "forecaster" && (
                /* Tab E: Systems Forecaster & Lattice Labs */
                <div className={styles.forecasterWorkspace}>
                  
                  {/* Part 1: Lattice Cryptography Labs */}
                  <div className={styles.forecasterSubCard}>
                    <div className={styles.subCardHeader}>
                      <span>1. LATTICE CRYPTOGRAPHY LABS // M-LWE VECTOR SIMULATION</span>
                    </div>
                    <p className={styles.panelIntro}>
                      Post-quantum encryption ML-KEM is based on the Module Learning with Errors (M-LWE) lattice hardness assumption: $A \cdot s + e = b \pmod q$.
                    </p>

                    <div className={styles.latticeLabGrid}>
                      <div className={styles.latticeVisualizerColumn}>
                        {/* Interactive lattice grid simulation */}
                        <div className={styles.latticeGridSim}>
                          {Array.from({ length: 49 }).map((_, i) => {
                            // Introduce pseudo-random displacement based on noise slider
                            const xNoise = Math.sin(i * 1.7) * (noiseLevel * 0.9);
                            const yNoise = Math.cos(i * 2.3) * (noiseLevel * 0.9);
                            return (
                              <div key={i} className={styles.latticeNodeSim} style={{ transform: `translate(${xNoise}px, ${yNoise}px)` }}>
                                <span className={styles.gridPoint}></span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className={styles.latticeInputsColumn}>
                        <div className={styles.sliderHeader}>
                          <span>Noise / Error Factor (e): <strong>{noiseLevel}</strong></span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={noiseLevel}
                          onChange={(e) => setNoiseLevel(parseInt(e.target.value))}
                          className={styles.rangeSlider}
                        />
                        <div className={styles.mathEquationBox}>
                          <code>A · s + e = b (mod q)</code>
                        </div>
                        <p className={styles.mathExplanation}>
                          {noiseLevel > 6 ? (
                            <span style={{ color: "var(--color-sage)" }}><strong>NOISE IS EXPONENTIAL:</strong> With noise vector $e \ge {noiseLevel}$, finding the closest lattice point (CVP) remains intractable for both classical and quantum algorithms. This guarantees lattice-based security.</span>
                          ) : (
                            <span style={{ color: "var(--color-warning)" }}><strong>LOW NOISE WARNING:</strong> If error parameter $e$ decreases, the vector space becomes closer to a perfect grid, reducing the hardness of the Closest Vector Problem (CVP).</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Part 2: Business Timeline & Moser Forecaster */}
                  <div className={styles.forecasterSubCard}>
                    <div className={styles.subCardHeader}>
                      <span>2. BUSINESS IMPACT & EXPOSURE TIMELINE FORECASTER</span>
                    </div>

                    <div className={styles.sliderControlGrid}>
                      <div className={styles.sliderBox}>
                        <div className={styles.sliderHeader}>
                          <span>CRQC Arrival Year (Z): <strong>{crqcYear}</strong></span>
                        </div>
                        <input
                          type="range"
                          min="2028"
                          max="2045"
                          value={crqcYear}
                          onChange={(e) => setCrqcYear(parseInt(e.target.value))}
                          className={styles.rangeSlider}
                        />
                      </div>

                      <div className={styles.sliderBox}>
                        <div className={styles.sliderHeader}>
                          <span>Corporate Data Shelf-life (X): <strong>{shelfLife} Years</strong></span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={shelfLife}
                          onChange={(e) => setShelfLife(parseInt(e.target.value))}
                          className={styles.rangeSlider}
                        />
                      </div>
                    </div>

                    <div className={styles.timelineReportGrid}>
                      <div className={styles.timelineMetricItem}>
                        <span>MIGRATION DURATION (Y)</span>
                        <h4>{transitionDuration} Years</h4>
                        <p>Calculated based on current Cryptographic Agility Maturity Score.</p>
                      </div>
                      <div className={styles.timelineMetricItem}>
                        <span>EXPOSURE GAP</span>
                        <h4 className={exposureWindow > 0 ? styles.redValue : styles.greenValue}>
                          {exposureWindow} Years
                        </h4>
                        <p>Overlapping exposure window under Harvest-Now-Decipher-Later (HNDL).</p>
                      </div>
                      <div className={styles.timelineMetricItem}>
                        <span>FINANCIAL LOSS PROJECTION</span>
                        <h4 className={exposureWindow > 0 ? styles.redValue : styles.greenValue}>
                          ${lossProjection.toFixed(1)}M
                        </h4>
                        <p>Projected data depreciation and regulatory compliance fines.</p>
                      </div>
                    </div>

                    {/* Timeline Milestones list */}
                    <div className={styles.complianceTimelineMap}>
                      <h5>QUANTUM COMPLIANCE GATEWAY TIMELINE</h5>
                      <div className={styles.gateList}>
                        <div className={styles.gateItem}>
                          <span className={styles.gateYear}>2025</span>
                          <span className={styles.gateText}>CISA Binding Directive: Inventory classical assets.</span>
                        </div>
                        <div className={styles.gateItem}>
                          <span className={styles.gateYear}>2026</span>
                          <span className={styles.gateText}>FIPS 203/204 standard implementations enforced in HSMs.</span>
                        </div>
                        <div className={styles.gateItem}>
                          <span className={styles.gateYear}>2030</span>
                          <span className={styles.gateText}>NSA CNSA 2.0: Mandate hybrid PQC for national security systems.</span>
                        </div>
                        <div className={styles.gateItem}>
                          <span className={styles.gateYear}>2035</span>
                          <span className={styles.gateText}>Transition cutoff. Classical asymmetric schemes deprecated.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Part 3: Agility Maturity Scorecard */}
                  <div className={styles.forecasterSubCard}>
                    <div className={styles.subCardHeader}>
                      <span>3. ORGANIZATIONAL CRYPTOGRAPHIC AGILITY MATURITY INDEX</span>
                    </div>

                    <div className={styles.maturityIndexBody}>
                      <div className={styles.maturityScoreHeader}>
                        <div className={styles.scoreText}>
                          <span>AGILITY LEVEL Rating: <strong>{maturityScore}/100</strong></span>
                          <h4>{currentMaturity.tier}</h4>
                          <p>{currentMaturity.desc}</p>
                        </div>
                      </div>

                      <div className={styles.maturityQuestions}>
                        <div 
                          className={styles.questionItem}
                          onClick={() => setMaturityAnswers(prev => ({ ...prev, q1: !prev.q1 }))}
                        >
                          <input type="checkbox" checked={maturityAnswers.q1} onChange={() => {}} className={styles.customCheckbox} />
                          <div>
                            <h6>Continuous CBOM Generation</h6>
                            <p>Are cryptographic bills of materials compiled in CI/CD pipelines?</p>
                          </div>
                        </div>

                        <div 
                          className={styles.questionItem}
                          onClick={() => setMaturityAnswers(prev => ({ ...prev, q2: !prev.q2 }))}
                        >
                          <input type="checkbox" checked={maturityAnswers.q2} onChange={() => {}} className={styles.customCheckbox} />
                          <div>
                            <h6>Lattice-Safe Hybrid Validation</h6>
                            <p>Do web applications employ hybrid key exchange protocols (ML-KEM + X25519)?</p>
                          </div>
                        </div>

                        <div 
                          className={styles.questionItem}
                          onClick={() => setMaturityAnswers(prev => ({ ...prev, q3: !prev.q3 }))}
                        >
                          <input type="checkbox" checked={maturityAnswers.q3} onChange={() => {}} className={styles.customCheckbox} />
                          <div>
                            <h6>Automated Key & Algorithm Rotation</h6>
                            <p>Can security teams trigger algorithm rollover dynamically without editing code?</p>
                          </div>
                        </div>

                        <div 
                          className={styles.questionItem}
                          onClick={() => setMaturityAnswers(prev => ({ ...prev, q4: !prev.q4 }))}
                        >
                          <input type="checkbox" checked={maturityAnswers.q4} onChange={() => {}} className={styles.customCheckbox} />
                          <div>
                            <h6>Binary Stiff-Linking Auditing</h6>
                            <p>Are compiled binaries checked for static algorithm footprints on build steps?</p>
                          </div>
                        </div>

                        <div 
                          className={styles.questionItem}
                          onClick={() => setMaturityAnswers(prev => ({ ...prev, q5: !prev.q5 }))}
                        >
                          <input type="checkbox" checked={maturityAnswers.q5} onChange={() => {}} className={styles.customCheckbox} />
                          <div>
                            <h6>Policy-Driven Pipeline Gatekeepers</h6>
                            <p>Are pull requests blocked if developers attempt to import deprecated libraries?</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Right Column: Dependency Graph Details & Transition Roadmap */}
            <div className={styles.detailsColumn}>
              
              {/* Box 1: Selected Asset Details & Blast Radius Graph */}
              <div className={styles.assetDetailCard}>
                <div className={styles.detailsCardHeader}>
                  <span>INVENTORY METADATA</span>
                  <span className="mono-tag">{selectedAsset.id}</span>
                </div>

                <div className={styles.detailsBody}>
                  <div className={styles.detailRow}>
                    <span>FILE LOCATION:</span>
                    <strong className={styles.monoText}>{selectedAsset.file}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>CRYPTOGRAPHIC FUNCTION:</span>
                    <strong>{selectedAsset.function}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>MODULE/LIBRARY:</span>
                    <strong className={styles.monoText}>{selectedAsset.library}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>PROTECTS DATA:</span>
                    <strong>{selectedAsset.dataProtected}</strong>
                  </div>

                  <div className={styles.graphVisualizationBox}>
                    <span className={styles.visualLabel}>BLAST RADIUS RELATIONSHIP TRAVERSAL</span>
                    <div className={styles.visualFlow}>
                      <div className={styles.vNodeApp}>APPLICATION<div className={styles.vSub}>Payment Gateway</div></div>
                      <div className={styles.vLink}>&darr;</div>
                      <div className={styles.vNodeLib}>LIBRARY<div className={styles.vSub}>{selectedAsset.library}</div></div>
                      <div className={styles.vLink}>&darr;</div>
                      <div className={`${selectedAsset.safe ? styles.vNodeAlgSafe : styles.vNodeAlgVuln}`}>
                        ALGORITHM
                        <div className={styles.vSub}>{selectedAsset.algorithm}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Post-Quantum Transition Workbench */}
              {!selectedAsset.safe && selectedAsset.algorithm in pqcTargets && (
                <div className={styles.pqcWorkbenchCard}>
                  <div className={styles.detailsCardHeader}>
                    <span>PQC TRANSITION WORKBENCH</span>
                    <span className="mono-tag-accent">REMEDIATION COMPILER</span>
                  </div>

                  <div className={styles.workbenchBody}>
                    <span className={styles.visualLabel}>1. SELECT TRANSITION ALGORITHM CANDIDATE</span>
                    <div className={styles.targetSelector}>
                      {pqcTargets[selectedAsset.algorithm as keyof typeof pqcTargets].map((target) => (
                        <button
                          key={target.id}
                          className={`${styles.targetBtn} ${selectedPqcTarget === target.id ? styles.activeTargetBtn : ""}`}
                          onClick={() => {
                            setSelectedPqcTarget(target.id);
                            setCompiledReport(null);
                          }}
                        >
                          {target.name}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handlePqcCompile}
                      className={styles.compilePqcBtn}
                      disabled={compilingPqc}
                    >
                      {compilingPqc ? `COMPILING PQC ADAPTER ${compileProgress}%...` : `[ CONFIGURE QUANTUM-SAFE ADAPTER ]`}
                    </button>

                    {compilingPqc && (
                      <div className={styles.miniProgress}>
                        <div className={styles.miniProgressBar} style={{ width: `${compileProgress}%` }}></div>
                      </div>
                    )}

                    {compiledReport && (
                      <div className={styles.compileReport}>
                        <div className={styles.reportStats}>
                          <div className={styles.statBox}>
                            <span>LATENCY DELTA</span>
                            <strong>{compiledReport.latency}</strong>
                          </div>
                          <div className={styles.statBox}>
                            <span>PUBLIC KEY SIZE</span>
                            <strong>{compiledReport.keySize}</strong>
                          </div>
                        </div>
                        <div className={styles.complianceNote}>
                          <strong>COMPLIANCE:</strong> {compiledReport.compliance}
                        </div>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "16px" }}>
                          <span className={styles.visualLabel}>2. CODE ADAPTER WRAPPER MODULE</span>
                          <button 
                            className={styles.copyTextBtn}
                            onClick={() => handleCopyCode(compiledReport.code)}
                          >
                            {copied ? "COPIED!" : "[ COPY ]"}
                          </button>
                        </div>
                        <pre className={styles.codeSnippetPre}>
                          <code>{compiledReport.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Box 3: Interactive Migration Tasks Checklist */}
              <div className={styles.migrationPlannerCard}>
                <div className={styles.detailsCardHeader}>
                  <span>TOPOLOGICAL TRANSITION WORKLIST</span>
                  <span className="mono-tag-accent">{progressPercent}% READY</span>
                </div>

                <div className={styles.checklistBody}>
                  <p className={styles.plannerDesc}>
                    Topologically ordered step-by-step mitigation tasks. Check off completed operations to update overall migration readiness.
                  </p>
                  
                  <div className={styles.tasksList}>
                    {migrationTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className={`${styles.taskItem} ${completedTasks[task.id] ? styles.taskCompleted : ""}`}
                        onClick={() => toggleTask(task.id)}
                      >
                        <div className={styles.checkboxWrapper}>
                          <input 
                            type="checkbox"
                            checked={completedTasks[task.id] || false}
                            onChange={() => {}} // toggled by parent div click
                            className={styles.customCheckbox}
                          />
                        </div>
                        <div className={styles.taskText}>
                          <h6>{task.label}</h6>
                          <p>{task.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
