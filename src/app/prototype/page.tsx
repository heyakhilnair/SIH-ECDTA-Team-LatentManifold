"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import styles from "./Prototype.module.css";

export default function Prototype() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("ASSET-001");
  const [searchQuery, setSearchQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // PQC Workbench States
  const [selectedPqcTarget, setSelectedPqcTarget] = useState("hybrid-mlkem");
  const [compilingPqc, setCompilingPqc] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);
  const [compiledReport, setCompiledReport] = useState<any | null>(null);

  // Stateful checkboxes for migration tasks
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    task1: true,
    task2: false,
    task3: false,
    task4: false,
    task5: false
  });

  const initialAssets = [
    { id: "ASSET-001", file: "src/auth/token.go", algorithm: "RSA-2048", function: "ASYMMETRIC_KEY_EXCHANGE", library: "crypto/rsa", safe: false, dataProtected: "Session Tokens", blastRadius: "High" },
    { id: "ASSET-002", file: "src/db/connection.go", algorithm: "AES-256-GCM", function: "SYMMETRIC_ENCRYPTION", library: "crypto/cipher", safe: true, dataProtected: "User Credentials", blastRadius: "Low" },
    { id: "ASSET-003", file: "src/utils/hash.go", algorithm: "SHA-1", function: "HASHING", library: "crypto/sha1", safe: false, dataProtected: "File Integrity Check", blastRadius: "Medium" },
    { id: "ASSET-004", file: "src/api/gateway.go", algorithm: "ECDH-P256", function: "KEY_AGREEMENT", library: "crypto/elliptic", safe: false, dataProtected: "Transit TLS Session", blastRadius: "High" },
    { id: "ASSET-005", file: "src/pqc/vault.go", algorithm: "ML-KEM-768", function: "POST_QUANTUM_KEM", library: "pqc/mlkem", safe: true, dataProtected: "Master Vault Secret", blastRadius: "Critical" },
    { id: "ASSET-006", file: "src/signatures/signer.go", algorithm: "ML-DSA-65", function: "POST_QUANTUM_SIGNATURE", library: "pqc/mldsa", safe: true, dataProtected: "Code Audits", blastRadius: "Low" }
  ];

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

  const selectedAsset = initialAssets.find(a => a.id === selectedAssetId) || initialAssets[0];

  // Reset PQC target when selected asset changes
  useEffect(() => {
    setCompiledReport(null);
    if (selectedAsset.algorithm in pqcTargets) {
      const targets = pqcTargets[selectedAsset.algorithm as keyof typeof pqcTargets];
      setSelectedPqcTarget(targets[0].id);
    } else {
      setSelectedPqcTarget("");
    }
  }, [selectedAssetId]);

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

  // Compile / modernize action
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
          return 100;
        }
        return prev + 20;
      });
    }, 100);
  };

  const filteredAssets = initialAssets.filter(asset => {
    const matchesSearch = asset.file.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.algorithm.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === "all") return matchesSearch;
    if (activeFilter === "vulnerable") return matchesSearch && !asset.safe;
    if (activeFilter === "safe") return matchesSearch && asset.safe;
    return matchesSearch;
  });

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
              <span>SCANNED ASSETS</span>
              <h3>154</h3>
              <p className={styles.metricSub}>Across 12 repositories</p>
            </div>
            <div className={styles.metricCard}>
              <span>VULNERABLE ALGORITHMS</span>
              <h3 className={styles.redValue}>3</h3>
              <p className={styles.metricSub}>RSA-2048, SHA-1, ECDH-P256</p>
            </div>
            <div className={styles.metricCard}>
              <span>QUANTUM EXPOSURE SCORE</span>
              <h3 className={styles.amberValue}>CRITICAL</h3>
              <p className={styles.metricSub}>X + Y (13y) &gt; Z (12y)</p>
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
            {/* Left Side: CBOM Asset Table */}
            <div className={styles.inventoryCard}>
              <div className={styles.cardHeader}>
                <h4>CRYPTOGRAPHIC BILL OF MATERIALS (CBOM)</h4>
                
                <div className={styles.tableControls}>
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search file or algorithm..."
                    className={styles.searchBar}
                  />
                  <div className={styles.filterBtns}>
                    <button 
                      onClick={() => setActiveFilter("all")}
                      className={`${styles.filterBtn} ${activeFilter === "all" ? styles.activeFilter : ""}`}
                    >
                      ALL
                    </button>
                    <button 
                      onClick={() => setActiveFilter("vulnerable")}
                      className={`${styles.filterBtn} ${activeFilter === "vulnerable" ? styles.activeFilter : ""}`}
                    >
                      VULNERABLE
                    </button>
                    <button 
                      onClick={() => setActiveFilter("safe")}
                      className={`${styles.filterBtn} ${activeFilter === "safe" ? styles.activeFilter : ""}`}
                    >
                      SAFE
                    </button>
                  </div>
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
                        <td colSpan={4} className={styles.emptyTable}>No assets match search/filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Side: Dependency Graph Details & Transition Roadmap */}
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

              {/* Box 2: Post-Quantum Transition Workbench (THE NEW CRAZY FEATURE!) */}
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
                        
                        <span className={styles.visualLabel} style={{ marginTop: "16px" }}>2. CODE ADAPTER WRAPPER MODULE</span>
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
