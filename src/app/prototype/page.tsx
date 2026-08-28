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

  // Tab switch for Left Panel
  const [activeLeftTab, setActiveLeftTab] = useState("cbom"); // cbom, forecaster

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

  useEffect(() => {
    const handleRescanEvent = () => {
      handleRescan();
    };
    window.addEventListener("trigger-ecdat-rescan", handleRescanEvent);
    return () => window.removeEventListener("trigger-ecdat-rescan", handleRescanEvent);
  }, []);

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
            
            {/* Left Column: Tab switcher between CBOM Table and Systems Forecaster */}
            <div className={styles.leftColumnWrapper}>
              <div className={styles.leftTabSelector}>
                <button
                  className={`${styles.leftTabBtn} ${activeLeftTab === "cbom" ? styles.activeLeftTabBtn : ""}`}
                  onClick={() => setActiveLeftTab("cbom")}
                >
                  CRYPTOGRAPHIC BILL OF MATERIALS (CBOM)
                </button>
                <button
                  className={`${styles.leftTabBtn} ${activeLeftTab === "forecaster" ? styles.activeLeftTabBtn : ""}`}
                  onClick={() => setActiveLeftTab("forecaster")}
                >
                  SYSTEMIC FORECASTER & LATTICE LABS
                </button>
              </div>

              {activeLeftTab === "cbom" ? (
                /* Tab A: CBOM Asset Table */
                <div className={styles.inventoryCard}>
                  <div className={styles.cardHeader}>
                    <h4>CBOM INVENTORY LISTINGS</h4>
                    
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
              ) : (
                /* Tab B: Systems Forecaster & Lattice Labs */
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
                          <span className={styles.gateText}>Transition cutoff. Classical asymmetric schemes completely deprecated.</span>
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
                            <p>Are cryptographic bills of materials automatically compiled in CI/CD pipelines?</p>
                          </div>
                        </div>

                        <div 
                          className={styles.questionItem}
                          onClick={() => setMaturityAnswers(prev => ({ ...prev, q2: !prev.q2 }))}
                        >
                          <input type="checkbox" checked={maturityAnswers.q2} onChange={() => {}} className={styles.customCheckbox} />
                          <div>
                            <h6>Lattice-Safe Hybrid Validation</h6>
                            <p>Do web applications employ hybrid key exchange protocols (ML-KEM + X25519) on edge gateways?</p>
                          </div>
                        </div>

                        <div 
                          className={styles.questionItem}
                          onClick={() => setMaturityAnswers(prev => ({ ...prev, q3: !prev.q3 }))}
                        >
                          <input type="checkbox" checked={maturityAnswers.q3} onChange={() => {}} className={styles.customCheckbox} />
                          <div>
                            <h6>Automated Key & Algorithm Rotation</h6>
                            <p>Can security teams trigger cryptographic algorithm rollover dynamically without editing source code?</p>
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
                            <p>Are pull requests blocked if developers attempt to import deprecated libraries (like RSA-2048)?</p>
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
