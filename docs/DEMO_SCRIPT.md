# ECDAT — 6-Minute SIH Demo Script

**Status:** Written against the real, running app (not a mockup) — every screen, button label,
and column name below was walked through live on 2026-09-03 with a real signed-in Clerk
session and a real GitHub scan of `heyakhilnair/SIH-ECDTA-Team-LatentManifold`. See
`docs/BACKEND_AUDIT_PHASE0-6.md` for the fixes that made this flow actually work end-to-end
(before 2026-09-03, every dashboard page 401'd and the risk engine silently crashed on every
scan — this script would not have been rehearsable).

**Rule for the live demo (per `docs/AGENT_CONTEXT.md`):** every number spoken below must come
from whatever the actual scan produces on demo day. Do not memorize the counts in this script —
re-run the pre-scan (§ Pre-Demo Checklist) the morning of and read the real numbers off screen.

---

## Pre-Demo Checklist (run the morning of)

1. `cd ecdat-backend && .venv/Scripts/python.exe -m pytest tests/ -q` — must be all green.
2. `.venv/Scripts/python.exe test_phase6_audit.py` — must be all green (proves auth + risk engine actually work against the real DB).
3. Confirm the demo Source is registered and healthy: Sources page → `<demo repo URL>` → HEALTHY.
4. Launch a fresh scan from Sources and let it fully complete (watch Scan Jobs go RUNNING → COMPLETED) at least once before judges arrive — first scans clone from GitHub and take longer; a warm run is faster and confirms nothing broke overnight.
5. Read the real final numbers (assets found, critical count, evidence count) off Mission Control and jot them down — that's what you say out loud, not what's written below.
6. `resize_window` / actually maximize the browser — Mission Control is data-dense, give it room.

---

## Script

**00:00 — Landing page** (`/`)
Open the public marketing site. One line: *"ECDAT discovers cryptography across an
enterprise's code and infrastructure, turns it into a Cryptographic Bill of Materials, scores
quantum risk with Mosca's inequality, and recommends NIST PQC replacements — all from real
evidence, not guesses."*

**00:30 — Sign in**
Click Sign In → Clerk's hosted flow (copper-accented split panel) → redirect to `/prototype`
(Mission Control).

**01:00 — Mission Control, first look**
Point at the live counters: *Connected Repositories*, *Discovered Assets*, *Critical Findings*,
*Quantum Vulnerable*, and the *Mosca Threshold Status* banner ("Within Quantum Margin" /
"Threshold Breached" — whichever it actually says). All four numbers are queried live from
Postgres on every page load — say so, then prove it by hitting refresh.

**01:15 — Register + launch a scan**
Sidebar → **Sources**. Paste the demo repo's URL into the "Add Source" form → **ADD SOURCE**.
Check its row → **LAUNCH ENTERPRISE DISCOVERY**.

**01:30 — Watch it actually run**
Sidebar → **Scan Jobs**. The new job appears **RUNNING** within a couple seconds (3s poll).
Click through to show the job isn't a black box — every step is a real, timestamped log line
(`GET /api/jobs/{id}/logs`): *"Cloning and scanning..."* → *"Found N findings... persisting
evidence"* → *"Normalizing N findings into canonical crypto assets"* → *"Computing Mosca risk
scores..."* → *"Generating PQC recommendations..."* → *"Generating CycloneDX CBOM..."* →
*"Job completed: N findings"*. This is the actual pipeline executing, not a progress bar
animation.

**02:30 — Job completes**
Status flips to **COMPLETED**, "Crypto Assets Found" column fills in with the real evidence
count. Mission Control's counters update on next poll.

**02:45 — Crypto Assets**
Sidebar → **Crypto Assets**. Walk the table: point at an RSA finding and a SHA-1 or MD5
finding, read their real risk badges (CRITICAL / HIGH / …) straight off the row — don't
pre-state the levels, let the screen say it.

**03:00 — Evidence, not assertion**
Click into one asset (e.g. the RSA finding) → its detail view. Scroll to the evidence list →
click one occurrence → show the real file path, line number, and the actual matched source
line. *"This is why every finding is trustworthy — you can always click through to the exact
line of code that triggered it."*

**03:30 — Risk & the Mosca inequality**
Sidebar → **Risk & Exposure**. Pick the same asset, read its Mosca explanation aloud: X (data
lifetime) + Y (migration time) vs Z (threat horizon), and why that lands it at its risk level.
Then: **Settings → Risk Policies** → change the Threat Horizon (Z) slider/field → **Save** →
back to Risk & Exposure and show the SAME asset's risk level updated immediately, recomputed
for the whole workspace. *"Z isn't hardcoded — change your organization's quantum timeline
assumption and every risk score updates instantly."*

**04:00 — Recommendation**
Sidebar → **PQC Workbench**. Same RSA asset → show the ML-KEM-768 (or ML-DSA-65, depending on
whether it's a key-exchange or signature use) recommendation, the hybrid transition path, and
the NIST FIPS citation. Point out the hard/soft constraints (HSM compatibility, bandwidth
overhead) — this isn't a generic "use PQC" answer, it's constraint-aware.

**04:30 — CBOM export**
Sidebar → **CBOM Inventory** → download/inspect the JSON. Point at `bomFormat: "CycloneDX"`,
`specVersion: "1.6"`, and one component's `cryptoProperties` — this is a real, schema-valid
CycloneDX document, not a custom format.

**05:00 — Close**
*"Every number on this screen — the asset count, the risk levels, the recommendations — came
from a scan that ran while you were watching, against a real public repository. Nothing here
is seeded or scripted."*

**05:30 — Questions**

---

## If something goes wrong live

- **Scan doesn't start / stays queued:** the backend uses in-process background tasks (a
  deliberate scope decision — see `docs/BACKEND_AUDIT_PHASE0-6.md` #9), not a durable queue.
  If the dev server restarted between launching the scan and it running, the job is lost. Fix:
  don't restart the backend during the demo window; if a job is stuck, launch a new one — it's
  a 60-90s wait, not a blocker.
- **GitHub rate limit:** `git_cloner.py` shallow-clones (`depth=1`) which minimizes API calls,
  but a rate-limited or failing clone surfaces as the job going **FAILED** with a real error
  message in the job's log/`error_msg` — show that as evidence the system fails loudly rather
  than silently, then retry with the local `ecdat-test-fixtures/` corpus as backup talking
  points (it has known RSA/SHA-1/MD5/DES findings memorized from `EXPECTED_FINDINGS.json`).
- **A number looks different from rehearsal:** say so. *"That's a different number than this
  morning — that's expected, this is a live scan of a real repo, not a fixed demo."* That's a
  feature of this product's honesty story, not a bug to hide.
