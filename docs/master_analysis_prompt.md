# ECDAT — MASTER PRODUCT INTELLIGENCE, ARCHITECTURE & EXECUTION PROMPT

## 0. MANDATORY DOCUMENT FOLDER ANALYSIS
Before performing ANY product, architecture, UX, engineering, or roadmap recommendation:
FIRST inspect the entire ECDAT document folder / uploaded document collection.
The documents contain the detailed ECDAT phase architecture and must be treated as the primary technical source of truth.
Do NOT begin by reasoning from the website.
Do NOT begin by reasoning from general knowledge.
Do NOT assume what a phase contains from its title.

### 0.1 FIND ALL ECDAT PHASE DOCUMENTS
Search the document folder for ALL documents related to ECDAT.
Identify:
Phase 1
Phase 2
Phase 3
Phase 4
Phase 5
Phase 6
Phase 7
Phase 8
Phase 9
Phase 10
Phase 11
Phase 12
Phase 13
Phase 14
Phase 15
Phase 16
Phase 17
Phase 18
Phase 19
Phase 20
Phase 21
Phase 22
If the actual number of phases differs, use the documents that actually exist rather than assuming 22.
Also identify supporting documents that describe:
ECDAT architecture
Product requirements
CBOM
Discovery
Cryptography
Risk
PQC
AI
Migration
Enterprise architecture
Data models
APIs
UX
Security
Research
Future roadmap

### 0.2 READ THE ACTUAL DOCUMENTS
Do not rely on:
File names
Previous summaries
Memory
Assumptions
Generic cryptography knowledge
Generic cybersecurity architecture
Open and read the actual contents of the documents.
Where documents contain diagrams, tables, architecture drawings, workflows, schemas or screenshots, inspect those as well.

### 0.3 BUILD A PHASE INDEX FIRST
Before analyzing the product, create an internal index:
- Phase
- Document
- Title
- Purpose
- Key Outputs
- Dependencies

This index is only the starting point.
The actual document contents must then be analyzed in detail.

### 0.4 ANALYZE EVERY PHASE IN CONTEXT
Read the phases:
Phase 1 ↓ Phase 2 ↓ Phase 3 ↓ ... ↓ Final Phase
However, do NOT assume the numerical ordering represents the actual engineering dependency order.
Determine both:
DOCUMENT ORDER
How the ECDAT research/architecture is currently organized.
and:
ENGINEERING ORDER
How the system should actually be implemented.

### 0.5 PRESERVE ORIGINAL TERMINOLOGY
When analyzing the documents:
Preserve ECDAT's terminology.
Preserve definitions.
Preserve architecture names.
Preserve phase boundaries.
Preserve stated assumptions.
Preserve stated constraints.
Do not silently rename concepts because another architecture seems more conventional.
If you believe a term or architecture should change, explicitly state:
SOURCE DESIGN ↓ ISSUE ↓ PROPOSED CHANGE ↓ REASON

### 0.6 EXTRACT THE ACTUAL TECHNICAL CONTENT
For every phase extract:
Problem: What problem is the phase solving?
Objective: What is the phase trying to achieve?
Inputs: What does it consume?
Processing: What actually happens?
Outputs: What does it produce?
Data: What entities, objects or schemas are introduced?
Dependencies: What does it depend on?
Consumers: Who/what consumes its output?
Technologies: What technologies are explicitly proposed?
Algorithms: What algorithms or calculations are defined?
APIs: What interfaces are defined or implied?
Security: What security assumptions or controls exist?
AI: Where is AI explicitly used?
Deterministic Logic: What MUST remain deterministic?
UX: What user-facing functionality does the phase imply?
Implementation: What would need to be built?

### 0.7 CROSS-REFERENCE DOCUMENTS
If two or more documents discuss the same concept, compare them.
For example:
Phase definition ↕ Architecture document ↕ CBOM definition ↕ Website ↕ Current prototype
Identify:
Agreement
Duplication
Missing information
Contradictions
Evolution of the architecture
Do not silently resolve contradictions.
Report them.

### 0.8 SOURCE CONFIDENCE
For every important architectural conclusion classify its source:
DOCUMENT FACT: Explicitly stated in the ECDAT documents.
PRODUCT FACT: Observable in the current ECDAT product.
WEB FACT: Observed from the referenced inspiration/product websites.
ENGINEERING INFERENCE: Derived logically from the source material.
RECOMMENDATION: A proposed change to the architecture.
Never present an inference or recommendation as if it were an existing ECDAT capability.

### 0.9 DOCUMENT → PRODUCT TRACEABILITY
Every major product feature must be traceable back to the source material.
Create:
Product Capability | Phase | Supporting Document | Evidence | Current Implementation | Target
This becomes the master traceability matrix.

### 0.10 DO NOT SKIP "BORING" PHASES
Infrastructure, schemas, evidence, normalization, security, APIs, storage, observability and governance phases may appear less visually interesting than AI or dashboards.
Do NOT deprioritize them because of that.
A phase is important according to its architectural dependency and product necessity, not how impressive it sounds.

### 0.11 ONLY AFTER DOCUMENT ANALYSIS
Only after completing the document analysis should you proceed to:
ECDAT Documents ↓ Current ECDAT Website ↓ Lyzr Analysis ↓ Circle13 Analysis ↓ Cross-Source Comparison ↓ Architecture Reconstruction ↓ Product Strategy ↓ MVP ↓ Engineering Roadmap
The document analysis is therefore the foundation of the entire master analysis, not an optional input.

---

## ECDAT — MASTER PRODUCT INTELLIGENCE, ARCHITECTURE & EXECUTION PROMPT

### ROLE
You are a Principal Product Architect + Cryptography Engineer + Cybersecurity Architect + Enterprise Software Architect + AI Systems Architect + UX/Product Strategist.
You are working on:
ECDAT (Enterprise Cryptographic Discovery & Analysis Tool)
Your job is to understand ECDAT completely, from the first cryptographic foundation through the final enterprise product.
You are NOT being asked to summarize documents.
You are being asked to determine:
What ECDAT is, what it should become, what currently exists, what is missing, what should be built next, and exactly how the product should be engineered and presented as a credible enterprise platform.

### 1. SOURCES OF TRUTH
You have three primary source categories.

**SOURCE A — ECDAT PHASE DOCUMENTS**
The uploaded ECDAT phase documents are the primary source for:
Research, Technical architecture, Cryptographic concepts, Discovery architecture, CBOM, Risk, PQC, AI architecture, Migration, Enterprise architecture, Security, Data models, Future capabilities
You MUST understand every phase sequentially.
Do not skip phases.
Do not treat them as independent documents.
Treat them as chapters of one product architecture.

**SOURCE B — CURRENT ECDAT PRODUCT**
Analyze: [https://ecdta.vercel.app/](https://ecdta.vercel.app/)
This represents the current product/prototype and should be treated as the current-state reference.
Determine:
What exists, What is demonstrated, What is interactive, What is architectural visualization, What is implemented, What is simulated, What is future scope, What the product currently communicates, What user journey currently exists
IMPORTANT:
A UI element does NOT automatically prove backend implementation.
Never infer implementation merely from visual presentation.

**SOURCE C — UI / PRODUCT INSPIRATION**
Analyze these products/sites for interaction, storytelling, information architecture, UX patterns and enterprise-product presentation only:
Lyzr: [https://www.lyzr.ai/](https://www.lyzr.ai/)
Circle13 Math: [https://math.circle13.space/](https://math.circle13.space/)
DO NOT copy their:
Branding, Logos, Content, Visual identity, Proprietary language, Exact layouts, Assets, Claims
Instead extract reusable product principles.

### 2. IMPORTANT DISTINCTION
Maintain these three states throughout the entire analysis:
CURRENT ECDAT ↓ What actually exists today
TARGET ECDAT MVP ↓ What should be built next
FULL ECDAT ↓ Long-term enterprise platform
Never mix these states.
Every recommendation must identify which state it belongs to.

### 3. ABSOLUTE RULE — NO FAKE DATA
This is one of the most important instructions.
ECDAT must never use fabricated enterprise data to make the product appear more advanced than it is.
Do NOT invent:
Repository counts, Cryptographic asset counts, Risk scores, Application counts, Vulnerability counts, Migration percentages, Enterprise customers, Scan results, Performance metrics, AI accuracy, Confidence scores, Compliance status, Production status, Number of affected applications, Number of certificates, Number of algorithms, Migration savings, Business impact, Quantum readiness percentage
Unless those values are actually generated from a real dataset or explicitly provided by the source documents.

### 4. DEMO DATA POLICY
If a demonstration requires data:
Use one of these approaches:
A. Real uploaded data: Data generated from an actual scan.
B. Public dataset: Clearly identify its source.
C. Open-source repository: Actually scan the repository and derive the findings.
D. Synthetic dataset: Allowed ONLY when clearly labeled: DEMONSTRATION DATA or SYNTHETIC ENVIRONMENT
Never present synthetic data as a real enterprise environment.

### 5. ZERO MOCKED PRODUCT STATE
Never write: "Neo4j is connected" unless it is actually connected.
Never write: "AI analyzed 15,000 assets" unless it actually did.
Never show: "99.8% detection accuracy" unless it has been measured.
Never show: "Enterprise is 87% quantum ready" unless calculated from real evidence.
Never create fake activity feeds such as:
RSA detected 2 minutes ago
Migration completed
AI found critical vulnerability
unless the backend actually generated those events.
If there is no real data:
Display: NO DATA AVAILABLE or AWAITING DISCOVERY or NOT YET IMPLEMENTED or DEMONSTRATION DATA

### 6. PRODUCT STORY
ECDAT must feel like an enterprise product with a coherent story.
The user should understand the product without reading the research papers.
The storytelling should follow:
THE PROBLEM ↓ THE INVISIBLE CRYPTOGRAPHIC SURFACE ↓ DISCOVERY ↓ UNDERSTANDING ↓ CONTEXT ↓ RISK ↓ PRIORITIZATION ↓ PQC RECOMMENDATION ↓ MIGRATION ↓ VERIFICATION ↓ CONTINUOUS POSTURE
The product should answer progressively:
What do we have?
then: Where is it?
then: What depends on it?
then: Why does it matter?
then: What should we change?
then: How do we migrate safely?
then: How do we prove the migration worked?

### 7. ENTERPRISE PRODUCT PRINCIPLE
ECDAT should not feel like: "A scanner with an AI chatbot."
It should feel like: An enterprise cryptographic intelligence and migration control platform.
The product should communicate:
Visibility, Evidence, Context, Risk, Decisions, Governance, Migration, Verification

### 8. USE LYZR AS PRODUCT-ARCHITECTURE INSPIRATION
Study Lyzr's current product presentation.
Extract principles such as: Layered architecture storytelling
Instead of showing 20 disconnected features, group the product into understandable layers.
For ECDAT, investigate a structure such as:
01 CONNECT Enterprise sources
02 DISCOVER Cryptographic discovery
03 NORMALIZE Evidence → canonical assets
04 UNDERSTAND CBOM + dependency graph
05 ASSESS Quantum + business + migration risk
06 DECIDE PQC recommendation
07 MIGRATE Migration planning and execution
08 VERIFY Continuous cryptographic posture
This is an inspiration pattern, not a mandatory final architecture.
Derive the final structure from the ECDAT phases.

### 9. ENTERPRISE CONTROL-PLANE THINKING
Investigate whether ECDAT should behave like a cryptographic control plane.
Potential concept:
ECDAT
│
┌─────────────┼─────────────┐
│             │             │
DISCOVERY     RISK      MIGRATION
│             │             │
└─────────────┼─────────────┘
│
GOVERNANCE
Determine whether this is appropriate.
If yes, define: Asset registry, Discovery jobs, Risk engine, Recommendation engine, Migration workspace, Evidence, Audit trail, Policy, Governance, Access control, Reporting

### 10. USE CIRCLE13 MATH AS INTERACTION INSPIRATION
Analyze the interaction philosophy of: [https://math.circle13.space/](https://math.circle13.space/)
Focus on how complex technical concepts can become: Interactive, Visual, Progressive, Exploratory, Story-driven
Do NOT copy its design.
Apply the principle to ECDAT.
Examples:
Instead of: Mosca's inequality = X + Y > Z
Allow the user to interactively understand: DATA LIFETIME + MIGRATION TIME > THREAT HORIZON
Then show the resulting implication.
Similarly: Dependency graph
Instead of dumping a graph: RSA → App → Service → Database
allow the user to explore: "What happens if this cryptographic asset becomes unavailable?"
and reveal the blast radius.

### 11. PRODUCT STORYTELLING PRINCIPLE
Every major screen should answer ONE primary question.
Examples:
Command Center: "What is the current cryptographic posture?"
Discovery: "What cryptography exists?"
Asset Explorer: "What exactly is this cryptographic asset?"
Graph: "What depends on it?"
Risk: "What should we worry about first?"
Recommendation: "What should replace it?"
Migration: "How do we change it safely?"
Verification: "Did the migration actually work?"
AI Analyst: "Why does this matter and what should I do?"
Avoid screens that attempt to answer everything simultaneously.

### 12. COMPLETE PHASE ANALYSIS
Read every uploaded ECDAT phase sequentially.
For EVERY phase produce:
Phase X — [Title]
Purpose, Problem, Core Concepts, Inputs, Processing, Outputs, Data Objects, APIs / Interfaces, Dependencies, Upstream Dependencies, Downstream Consumers, Deterministic Components, AI Components, Security Boundaries, Technology Requirements, Implementation Difficulty, MVP Relevance, Current Product Representation, Missing Implementation, Architectural Issues, Conflicts With Other Phases, Recommended Changes, Definition of Done

### 13. CROSS-PHASE ANALYSIS
After analyzing every phase independently, reconstruct the entire architecture.
Create: PHASE 1 ↓ PHASE 2 ↓ PHASE 3 ↓ ... ↓ PHASE 22
Then identify the actual dependency graph.
Do not assume numerical phase order equals technical dependency order.
Identify the real dependency order.

### 14. ECDAT CANONICAL PIPELINE
Determine the final canonical lifecycle.
The current conceptual model is:
OBSERVATION ↓ EVIDENCE ↓ ASSET ↓ ASSESSMENT ↓ RISK ↓ RECOMMENDATION ↓ MIGRATION ↓ VERIFICATION
Validate this against every phase.
Modify only where the documents justify it.

### 15. DISCOVERY
Determine the complete discovery system.
Analyze:
Source code, AST, Static analysis, Semgrep, Tree-sitter, Dependencies, Libraries, Binary, LIEF, YARA, Containers, Certificates, TLS, Network, Cloud, Kubernetes, HSM, KMS, SBOM, Runtime, Firmware
For every source:
SOURCE ↓ DETECTOR ↓ EVIDENCE ↓ PARSER ↓ NORMALIZER ↓ ASSET

### 16. EVIDENCE
Evidence must be treated as first-class data.
Every important finding should answer: Why does ECDAT believe this?
Potential evidence: File, Line, AST node, API call, Certificate, OID, Binary symbol, Dependency, Configuration, Runtime observation, Network observation, Scanner output
Preserve: Source, Timestamp, Location, Detector, Confidence, Provenance

### 17. CBOM
Analyze and implement the canonical CBOM model.
Separate: Evidence from Asset from Assessment from Risk from Recommendation from Migration
Do not collapse them.

### 18. NORMALIZATION
Design the canonicalization system.
Handle: RSA-2048, RSA / 2048, RSA2048, rsaEncryption, OID and normalize to canonical representation.
Maintain: Alias registry, OID registry, Algorithm family, Parameters, Standards, Implementation, Function, Key size, Security properties
Preserve original evidence.

### 19. KNOWLEDGE GRAPH
Determine the graph model.
Potential nodes: Repository, Application, Library, API, Algorithm, Certificate, Key, Protocol, Cipher suite, Binary, Container, HSM, KMS, Data asset, Business process
Potential relationships: USES, DEPENDS_ON, IMPLEMENTS, CONTAINS, DEPLOYED_AS, PROTECTS, AUTHENTICATES, SIGNED_BY, ISSUED_BY
Determine which relationships are actually required.

### 20. QUANTUM RISK
Separate: Quantum Risk, Classical Security Risk, Business Risk, Migration Risk, Dependency Risk, Exposure Risk, Compliance Risk
Evaluate: Shor, Grover, HNDL, Data lifetime, Migration time, Threat horizon, Mosca inequality, Business criticality, Sensitivity, Exposure, Dependency centrality, Migration complexity, Confidence
Avoid meaningless single-number risk scores.
Prefer explainable multidimensional risk where appropriate.

### 21. PQC RECOMMENDATION
Do not implement: RSA → ML-DSA, ECC → ML-DSA, ECDH → ML-KEM as a simplistic replacement table.
Determine: CURRENT CRYPTO ↓ FUNCTION ↓ SYSTEM CONSTRAINTS ↓ SECURITY REQUIREMENTS ↓ COMPATIBILITY ↓ HARDWARE ↓ PROTOCOL ↓ COMPLIANCE ↓ PERFORMANCE ↓ MIGRATION COMPLEXITY ↓ CANDIDATES ↓ RANKING ↓ RECOMMENDATION
Evaluate: ML-KEM, ML-DSA, SLH-DSA, Hybrid migration, Protocol compatibility, Library support, HSM support, Client compatibility, Vendor dependencies, Performance, Compliance

### 22. AI ARCHITECTURE
AI must be downstream from evidence.
Canonical architecture:
DETERMINISTIC DISCOVERY ↓ EVIDENCE ↓ NORMALIZATION ↓ CANONICAL ASSET ↓ CONTEXT ↓ AI ANALYST ↓ STRUCTURED OUTPUT ↓ VALIDATION ↓ DECISION
AI may perform: Semantic contextualization, Investigation, Explanation, Code reasoning, Cross-asset reasoning, Recommendation explanation, Migration-plan drafting, Analyst assistance
AI must NOT: Invent cryptographic assets, Override evidence, Manufacture risk, Manufacture compliance, Pretend unknown information is known, Modify canonical facts without validation

### 23. AI AGENT SYSTEM
Determine whether ECDAT needs: One analyst agent, Multiple specialist agents, Tool-using agent, Planner, Executor, Human approval
Do not use multi-agent architecture simply because it is fashionable.
Every agent must have: ROLE, INPUT, TOOLS, CONTEXT, OUTPUT SCHEMA, VALIDATION, CONFIDENCE, FAILURE MODE, AUDIT TRAIL

### 24. ENTERPRISE AI GOVERNANCE
Inspired by enterprise control-plane patterns, determine whether ECDAT needs:
Identity, SSO / authentication, Authorization, RBAC / ABAC, Tool permissions (Which agents can call which tools?), Data permissions (Which assets can an analyst access?), Audit (Who asked what? Which evidence was used? Which tool was called? What recommendation was generated?), Human approval (Which decisions require human review?)

### 25. AI OBSERVABILITY
Every AI operation should be traceable.
Store, where appropriate: run_id, agent_id, model, prompt_version, input_context, tools_called, evidence_used, output, validation_result, confidence, latency, token usage, errors, human_review, final_decision
Do not store sensitive content unnecessarily.

### 26. PRODUCT UI ARCHITECTURE
Design the product as an enterprise application.
Do NOT create a landing-page-style dashboard with random cards.
The UI should have a clear information hierarchy.
Potential structure:
ECDAT
├── Command Center
├── Discovery
│   ├── Jobs
│   ├── Sources
│   ├── Findings
│   └── Evidence
├── Cryptographic Inventory
│   ├── Assets
│   ├── Algorithms
│   ├── Certificates
│   ├── Libraries
│   ├── Keys
│   └── Protocols
├── Dependency Graph
├── Risk
│   ├── Quantum
│   ├── Business
│   ├── Migration
│   └── Priorities
├── Recommendations
├── Migration
├── Verification
├── AI Analyst
└── Governance
Modify this structure if the phases justify a better one.

### 27. COMMAND CENTER
The home screen should NOT be filled with fake metrics.
If real data exists, show: Assets discovered, Critical assets, Quantum-vulnerable assets, Applications affected, Certificates affected, Migration blockers, Open recommendations, Active discovery jobs, Recent verified changes
If no real data exists: Show meaningful empty states.
Example: CRYPTOGRAPHIC POSTURE: No discovery environment connected. Connect a repository or enterprise source to begin building your cryptographic inventory.

### 28. STORY-DRIVEN UX
The product should reveal complexity progressively.
Example:
RSA-2048 ↓ Used by 14 applications ↓ 3 business-critical services ↓ 2 sensitive datasets ↓ Migration dependency: shared PKI ↓ Quantum Risk: HIGH ↓ Recommended Strategy: ...
Every step should be backed by actual relationships.

### 29. ASSET DETAIL PAGE
Every cryptographic asset should have a deep investigation page.
Example structure:
ASSET: RSA-2048 Digital Signature
STATUS: Active
QUANTUM STATUS: Vulnerable
EVIDENCE: src/auth/signing.py:42
USED BY: Applications
DEPENDS ON: OpenSSL
PROTECTS: Customer Data
RISK: ...
RECOMMENDATION: ...
MIGRATION: ...
HISTORY: ...
Everything must be generated from actual stored data.

### 30. GRAPH EXPERIENCE
Do not make the graph a decorative visualization.
Every node and relationship must map to real data.
Allow: Search, Filter, Expand, Collapse, Trace dependency, Show evidence, Show risk, Show blast radius, Show migration impact
Potential interaction: "Show everything affected if this certificate is deprecated."
The graph should then perform a real traversal.

### 31. RISK EXPERIENCE
Risk should be explainable.
Instead of: Risk = 92
show: WHY THIS ASSET IS HIGH PRIORITY (Quantum Exposure HIGH, Data Lifetime 12 years, Migration Complexity HIGH, Business Criticality CRITICAL, Dependency Centrality HIGH, Exposure INTERNAL, Evidence Confidence 0.97)
Every value must have a source.

### 32. RECOMMENDATION EXPERIENCE
Recommendations must explain:
Current state, Problem, Candidate alternatives, Constraints, Recommended option, Why, Trade-offs, Migration approach, Confidence, Evidence, Required approvals

### 33. MIGRATION WORKSPACE
The product should eventually move beyond: "You should migrate RSA."
It should answer: "How do we migrate RSA safely?"
Represent: ASSET ↓ DEPENDENCIES ↓ AFFECTED SYSTEMS ↓ MIGRATION ORDER ↓ OWNER ↓ TASKS ↓ VALIDATION ↓ ROLLOUT ↓ VERIFICATION
Do not claim migration completion unless an actual integration confirms it.

### 34. VERIFICATION
Verification is a critical enterprise feature.
After migration: BEFORE ↓ MIGRATION ↓ RESCAN ↓ COMPARE ↓ VERIFY ↓ UPDATE CBOM ↓ UPDATE RISK
Determine whether ECDAT should support cryptographic posture drift detection.

### 35. CONTINUOUS POSTURE
Long-term ECDAT should not be: "Run once and export PDF."
It should become: DISCOVER ↓ MONITOR ↓ DETECT CHANGE ↓ REASSESS ↓ RECOMMEND ↓ MIGRATE ↓ VERIFY
Determine the architecture required to support this.

### 36. ENTERPRISE GOVERNANCE
Determine requirements for: RBAC, SSO, Tenant isolation, Audit logs, Data residency, Encryption, Secrets, Key management, Evidence integrity, Approval workflows, Policy, Compliance reporting, Export, Retention
Do not claim compliance certifications unless they actually exist.

### 37. SECURITY BOUNDARIES
ECDAT itself processes potentially sensitive data.
Determine: What data enters ECDAT, What stays in the customer's environment, What can be sent to an LLM, What must never be sent, How secrets are protected, How tenant isolation works, How evidence is protected

### 38. TECHNOLOGY STACK
Analyze the existing proposed technologies.
Where appropriate evaluate: Next.js, React, FastAPI, Python, PostgreSQL, Neo4j, Tree-sitter, Semgrep, LIEF, YARA, OpenSSL, SBOM tooling, Container tooling, RAG, LLM gateway, Local models
Do not preserve a technology just because it appears in a document.
For every component answer: WHY, PHASE, MVP?, PRODUCTION?, ALTERNATIVE, COMPLEXITY

### 39. REAL DATA ARCHITECTURE
Design the actual data flow.
Example: Repository ↓ Discovery Job ↓ Scanner ↓ Raw Evidence ↓ Evidence Store ↓ Normalizer ↓ Asset Resolver ↓ Canonical Asset ↓ CBOM ↓ Graph ↓ Risk Engine ↓ Recommendation Engine ↓ Migration
Define where every object is stored.

### 40. NO PREMATURE MICROSERVICES
Do not create 25 services because the architecture diagram looks impressive.
Determine the simplest deployment architecture that supports Security, Scalability, Clear ownership, Reliability, Testing, Deployment, Future expansion
A modular monolith may be better for MVP.
Microservices should be introduced only where justified.

### 41. MVP
Define:
V0: Minimum working technical proof.
V1: Strong technical MVP.
V2: Enterprise pilot.
V3: Full ECDAT.
For every feature classify: P0 P1 P2 P3

### 42. MVP MUST PROVE ONE COMPLETE LOOP
The strongest MVP should demonstrate:
REAL SOURCE ↓ REAL DISCOVERY ↓ REAL EVIDENCE ↓ REAL CBOM ↓ REAL DEPENDENCY CONTEXT ↓ REAL RISK ↓ REAL RECOMMENDATION ↓ REAL EXPLANATION
Prefer one deep end-to-end workflow over 20 shallow features.

### 43. DEMO DATA REQUIREMENT
The primary demo should use: REAL OPEN-SOURCE CODE or USER-PROVIDED REPOSITORY or CLEARLY LABELED SYNTHETIC DATA
The system should actually run its discovery pipeline.
The resulting Assets, Evidence, CBOM, Graph, Risk, Recommendation must derive from the same source.

### 44. PRODUCT DEMO STORY
Construct a compelling end-to-end demonstration.
Example:
START "We don't know where cryptography exists." ↓ CONNECT SOURCE ↓ "Let's discover it." ↓ REAL SCAN ↓ "Here is the cryptographic inventory." ↓ CBOM ↓ "But which assets actually matter?" ↓ DEPENDENCY GRAPH ↓ "These applications depend on this asset." ↓ RISK ↓ "This is why this asset is urgent." ↓ PQC RECOMMENDATION ↓ "This is the migration path." ↓ MIGRATION PLAN ↓ "Now let's verify the change." ↓ RESCAN ↓ "Posture updated." END

### 45. ENTERPRISE STORYTELLING
The website/product should communicate ECDAT through progressive questions.
Level 1 — Executive: What is our cryptographic exposure?
Level 2 — Security Leader: Which systems are at risk?
Level 3 — Architect: Why are they at risk?
Level 4 — Engineer: Where exactly is the cryptography implemented?
Level 5 — Migration Team: What should replace it?
Level 6 — Operations: How do we execute and verify the migration?

### 46. PRODUCT PERSONAS
Determine the actual personas ECDAT serves.
Potential users: CISO, CTO, Security Architect, Cryptography Engineer, Application Security Engineer, Cloud Security Engineer, PKI Team, Infrastructure Team, Developer, Compliance Team, Migration Program Manager
For each persona determine: What they need, What they see, What decisions they make, What ECDAT provides

### 47. PRODUCT INFORMATION HIERARCHY
Determine what should be: Global, Workspace-level, Application-level, Asset-level, Evidence-level, Recommendation-level

### 48. CURRENT WEBSITE AUDIT
Analyze: [https://ecdta.vercel.app/](https://ecdta.vercel.app/)
Create: Existing Element, Purpose, Real?, Keep, Improve, Remove
Determine what is strong, weak, misleading, should be redesigned, functional, or disappear.

### 49. PRODUCT UX AUDIT
Evaluate the existing product against: Clarity, Credibility, Traceability, Interactivity, Enterprise readiness, Storytelling, Visual hierarchy, Empty states, Error states

### 50. UI DESIGN PRINCIPLES
Dense but readable, Progressive disclosure, Evidence everywhere, Interactive explanations, No decorative graphs, No dashboard theatre, No fake activity, No fake confidence

### 51. PRODUCT COMPONENTS
Determine the final component architecture.
Potentially: COMMAND CENTER, DISCOVERY CONTROL, DISCOVERY JOBS, EVIDENCE EXPLORER, CRYPTOGRAPHIC INVENTORY, CBOM EXPLORER, DEPENDENCY GRAPH, RISK ENGINE, PQC RECOMMENDATION, MIGRATION WORKSPACE, VERIFICATION, AI ANALYST, POLICY / GOVERNANCE, AUDIT, REPORTING

### 52. GAP ANALYSIS
Identify gaps: Architecture, Data, Discovery, Graph, Risk, PQC, AI, Security, UX, Backend, Frontend, Product, Enterprise

### 53. CONFLICT ANALYSIS
Identify conflicts such as: Different asset models, Different risk models, Duplicate confidence models, AI vs deterministic discovery, Different recommendation logic, Different storage models, Duplicate functionality, Contradictory implementation assumptions
For each: CURRENT ↓ CONFLICT ↓ REASON ↓ RECOMMENDATION ↓ DOWNSTREAM IMPACT

### 54. ARCHITECTURAL DECISION REGISTER
Produce: Decision, Current Design, Recommendation, Reason, Confidence, Impact

### 55. GAP REGISTER
Produce: Gap, Severity, Phase, Impact, Resolution, Priority

### 56. FEATURE PRIORITIZATION
Prioritize using: Product Value + Technical Dependency + Feasibility + Differentiation + Security + Demonstration Value - Engineering Complexity

### 57. ENGINEERING BACKLOG
Produce concrete tasks.
Every task must include: ID, Task, Phase, Dependency, Complexity, Priority, Definition of Done

### 58. API DESIGN
Determine actual interfaces between: Frontend, Discovery, Evidence, Normalization, CBOM, Graph, Risk, Recommendation, AI, Migration, Verification
For each: Endpoint, Input, Output, Authentication, Authorization, Validation, Errors, Audit requirements

### 59. TESTING STRATEGY
Determine: Unit Tests, Scanner Tests, Parser Tests, Normalization Tests, CBOM Tests, Graph Tests, Risk Tests, Recommendation Tests, AI Evaluation, Security Tests, Integration Tests, End-to-End Tests, Regression Tests

### 60. AI EVALUATION
Define evaluation datasets for: Algorithm classification, Context extraction, Evidence interpretation, Risk explanation, Recommendation explanation, Migration planning
Measure: Groundedness, Correctness, Unsupported claims, Evidence usage, Schema validity, Consistency

### 61. PRODUCTION READINESS
Evaluate: Reliability, Scalability, Security, Observability, Auditability, Backup, Disaster recovery, Access control, Deployment, Data retention, Upgrade strategy, Model failure, Scanner failure, Partial discovery

### 62. WHAT NOT TO BUILD
Explicitly identify features that should NOT be built yet.

### 63. FINAL RECOMMENDED ARCHITECTURE
Produce: System Architecture, Data Architecture, Discovery Architecture, Evidence Architecture, CBOM Architecture, Knowledge Graph, Risk Engine, Recommendation Engine, AI Architecture, Migration Architecture, Verification Architecture, Governance Architecture, Security Architecture, Deployment Architecture

### 64. FINAL USER JOURNEY
Define the final experience: LOGIN ↓ WORKSPACE ↓ CONNECT ENVIRONMENT ↓ DISCOVERY ↓ FINDINGS ↓ EVIDENCE ↓ CBOM ↓ GRAPH ↓ RISK ↓ RECOMMENDATION ↓ MIGRATION ↓ VERIFICATION ↓ CONTINUOUS POSTURE

### 65. FINAL STORY
Write the final product story in one continuous narrative grounded in actual ECDAT capabilities.

### 66. FINAL MVP DEFINITION
Answer: What EXACTLY should be built first?
Give: P0, P1, P2, P3. Then identify the smallest end-to-end workflow that proves ECDAT.

### 67. FINAL EXECUTION ROADMAP
Create the actual implementation sequence based on dependencies.

### 68. TOP 10 ACTIONS
End the entire analysis with: TOP 10 ACTIONS TO TAKE NOW

### 69. FINAL DECISION QUESTION
Your final answer MUST explicitly answer: If the ECDAT team starts engineering tomorrow, what should they do first, second, third, and so on...

### 70. FINAL QUALITY BAR
REAL DATA + REAL EVIDENCE + DETERMINISTIC DISCOVERY + CANONICAL CBOM + DEPENDENCY CONTEXT + EXPLAINABLE RISK + CONSTRAINED PQC RECOMMENDATION + GROUNDED AI + TRACEABLE DECISIONS + MIGRATION WORKFLOW + VERIFICATION + ENTERPRISE SECURITY + HONEST PRODUCT UX

### 71. FINAL OUTPUT FORMAT
Return the final analysis in this exact order:
Executive Summary... (all components listed)

---

## 72. ENTERPRISE UI + AUTHENTICATION REQUIREMENTS

### 72.1 VISUAL DIRECTION — ENTERPRISE WHITE UI
ECDAT must consistently use a clean enterprise white UI as its primary visual language.
The default product experience should feel: Enterprise, Professional, Technical, Precise, Trustworthy, Clean, Data-centric, Modern, Calm, High information density without visual clutter
Avoid: Gaming UI, Excessive neon, Cyberpunk aesthetics, Dark-first design, Excessive gradients, Glowing borders, Decorative 3D elements, Excessive animations, Fake terminal aesthetics, "Hacker" visual clichés, Excessive glassmorphism

### 72.2 COLOR SYSTEM
The default application experience must be light / white.
Use color primarily to communicate state: Neutral (Normal), Blue (Active), Green (Healthy), Amber (Warning), Red (Critical), Purple (AI-specific).

### 72.3 TYPOGRAPHY
Typography should prioritize: Readability, Information hierarchy, Technical precision, Enterprise credibility.

### 72.4 PUBLIC EXPERIENCE VS AUTHENTICATED EXPERIENCE
Separate the product into two experiences.
PUBLIC: The public-facing website should communicate what ECDAT is.
AUTHENTICATED: The prototype must require authentication to access the operational product.

### 72.5 SIGN-IN GATE
The primary flow should be: ECDAT LANDING ↓ SIGN IN ↓ AUTHENTICATION ↓ WORKSPACE SELECTION ↓ ECDAT COMMAND CENTER

### 72.6 AUTHENTICATION EXPERIENCE
Design a real authentication flow. Do not create a fake login screen.

### 72.7 AUTHENTICATION STATES
Handle all states explicitly: Signed Out, Signing In, Authenticated, Authentication Failure, Session Expired, Unauthorized, Account Not Found, Network Failure

### 72.8 PROTECTED ROUTES
All operational ECDAT features must exist behind authentication.

### 72.9 DASHBOARD = ACTUAL PRODUCT
After signing in, the user should enter the ECDAT Command Center / Dashboard.

### 72.10 DASHBOARD STRUCTURE
Design the dashboard around the actual ECDAT lifecycle.

### 72.11 AUTHENTICATED COMMAND CENTER
The Command Center should answer: What is the current state of my cryptographic environment?

### 72.12 FIRST LOGIN EXPERIENCE
Guide the user toward the first meaningful product action.

### 72.13 WORKSPACE MODEL
A workspace should logically represent an environment being analyzed.

### 72.14 MULTI-TENANCY
For enterprise architecture, evaluate tenant isolation.

### 72.15 RBAC
Determine role requirements (Admin, Analyst, Engineer, Developer, Manager, Viewer).

### 72.16 AI ACCESS CONTROL
The AI Analyst must inherit the user's permissions.

### 72.17 SESSION + SECURITY
Secure sessions, password handling, audit logging.

### 72.18 AUTHENTICATION AUDIT TRAIL
Enterprise authentication events should be auditable.

### 72.19 PRODUCT STATE AFTER LOGIN
The user should have persistent navigation, context, and identity.

### 72.20 GLOBAL PRODUCT NAVIGATION
Create a consistent enterprise navigation system.

### 72.21 GLOBAL SEARCH
Evaluate an enterprise-wide search experience.

### 72.22 GLOBAL ENTITY MODEL
The interface should consistently reference canonical entities.

### 72.23 EMPTY STATES
Empty states are part of the enterprise UX. Provide current state, explanation, next action.

### 72.24 LOADING STATES
All asynchronous operations must have honest loading states.

### 72.25 ERROR STATES
Errors must be technically useful.

### 72.26 REAL-TIME JOBS
If discovery or analysis is asynchronous, create a real job model.

### 72.27 NOTIFICATIONS
Notifications must correspond to real system events.

### 72.28 ENTERPRISE REPORTING
Evaluate authenticated reporting capabilities.

### 72.29 SETTINGS
Users should eventually have Profile, Organization, Workspace settings.

### 72.30 LANDING → SIGN-IN → PRODUCT STORY
LEARN ↓ TRUST ↓ SIGN IN ↓ CONNECT ↓ DISCOVER ↓ UNDERSTAND ↓ ASSESS ↓ DECIDE ↓ MIGRATE ↓ VERIFY

### 72.31 NO DEMO THEATRE
Never use marketing-only numbers inside the operational dashboard.

### 72.32 AUTHENTICATION IMPLEMENTATION PRINCIPLE
If authentication is implemented in the prototype, it must be functional.

### 72.33 AUTH + DATA OWNERSHIP
Every piece of ECDAT data should have a clear ownership boundary.

### 72.34 ENTERPRISE UI QUALITY BAR
Before accepting any screen, ask: Does this look like an enterprise security product?

### 72.35 FINAL UI PRINCIPLE
ECDAT should feel like: A calm, precise enterprise control plane for understanding and transforming cryptographic infrastructure.

---

## 73. CLERK AUTHENTICATION — MANDATORY IMPLEMENTATION
ECDAT will use Clerk for authentication and identity management.

### 73.1 AUTHENTICATION ARCHITECTURE
The intended flow is: PUBLIC ECDAT WEBSITE ↓ SIGN IN / GET STARTED ↓ CLERK AUTHENTICATION ↓ AUTHENTICATED SESSION ↓ ECDAT WORKSPACE ↓ COMMAND CENTER

### 73.2 CLERK + ECDAT APPLICATION
Integrate Clerk into the actual ECDAT application using the appropriate Clerk SDK.

### 73.3 PROTECTED APPLICATION
The following areas must require authentication: /dashboard, /discovery, /evidence, /assets, /cbom, /graph, /risk, /recommendations, /migration, /verification, /ai, /governance, /settings

### 73.4 PUBLIC ROUTES
Public pages may include: /, /product, /architecture, /security, /research, /docs, /signin

### 73.5 SIGN-IN EXPERIENCE
Use Clerk's authentication flow.

### 73.6 FIRST-TIME USER
For a new user: Clerk Sign Up ↓ Authenticated ↓ Create / Join Organization ↓ Create / Select Workspace ↓ Connect Data Source ↓ Run Discovery ↓ Command Center

### 73.7 USER IDENTITY
Use Clerk as the source of truth for authenticated user identity.

### 73.8 ORGANIZATION MODEL
Evaluate Clerk Organizations for ECDAT's enterprise workspace model.

### 73.9 ROLES AND PERMISSIONS
Use Clerk's organization/role capabilities where appropriate.

### 73.10 BACKEND AUTHORIZATION
Every sensitive backend operation must verify the authenticated identity.

### 73.11 DATA ISOLATION
Every ECDAT resource must be associated with an appropriate organization/workspace boundary.

### 73.12 AI + CLERK AUTHORIZATION
The AI Analyst must inherit the authenticated user's permissions.

### 73.13 CLERK WEBHOOK / SYNCHRONIZATION
Evaluate whether ECDAT needs Clerk webhooks for events.

### 73.14 AUTHENTICATION STATES
Implement all relevant states.

### 73.15 SIGN OUT
The application must provide a clear sign-out mechanism.

### 73.16 ACCOUNT MANAGEMENT
Use Clerk's account-management capabilities where appropriate.

### 73.17 ENTERPRISE AUTHENTICATION ROADMAP
Clerk should provide the authentication foundation while the product matures.

### 73.18 AUTHENTICATION ENVIRONMENTS
Maintain separate environments: LOCAL ↓ DEVELOPMENT ↓ STAGING ↓ PRODUCTION

### 73.19 CLERK ENVIRONMENT CONFIGURATION
Use environment variables for Clerk configuration.

### 73.20 AUTHENTICATION + ROUTING
The route protection architecture should be defined before implementing the dashboard.

### 73.21 AUTHENTICATION + PRODUCT STORY
LEARN ↓ TRUST ↓ SIGN IN ↓ CONNECT ↓ DISCOVER ↓ UNDERSTAND ↓ ASSESS ↓ DECIDE ↓ MIGRATE ↓ VERIFY

### 73.22 NO FAKE LOGIN
Do NOT implement fake login.

### 73.23 AUTHENTICATION TESTING
Test Authentication, Authorization, Security.

### 73.24 FINAL AUTHENTICATION ARCHITECTURE
The final recommended pattern should preserve: Clerk for identity + ECDAT for authorization + real ECDAT data for product functionality.

---

### FINAL INSTRUCTION
Do not optimize for producing a long document. Optimize for producing the correct product strategy and engineering sequence.
The objective is: Turn ECDAT from a collection of research phases + prototype UI into one coherent, evidence-driven, technically credible, enterprise cryptographic intelligence and migration platform.
Every recommendation must ultimately answer: Can this be implemented, verified, and trusted?
