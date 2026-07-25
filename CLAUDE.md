# PROJECT AQUA — CLAUDE CODE BRIEFING
**Global Industrial Water Treatment Intelligence Platform**
Lead Developer: Michael Fouche | AI Collaborator: Claude AI (Anthropic)
Kickoff: March 11, 2026 | Design Doc: PROJECT_AQUA_Phase1_v4.docx

---

## ⚠️ MANDATORY FIRST ACTIONS EVERY SESSION

Before writing any code, Claude Code MUST:

1. Read this entire CLAUDE.md file
2. Read the current SESSION SNAPSHOT at the bottom of this file
3. Confirm current phase and open issues to Michael before proceeding
4. If starting a new module: invoke the Chemistry Advisor and Build Agent test specification protocol BEFORE writing code
5. Never skip QA gates — they are non-negotiable build requirements

---

## PROJECT OVERVIEW

PROJECT AQUA is a real-time, animated, AI-powered Global Industrial Water Treatment Intelligence Platform built for LinkedIn portfolio demonstration. It combines live contamination data, physics-grounded chemistry simulation, multi-layer animation, and a streaming Claude AI domain advisor.

**Universal appeal target:** Water affects every human on earth. No military framing. Maximum public resonance.

**Dedicated to:** Craig Gagnon, industrial water treatment chemist (Meta Valent Solutions) — 40 billion litres treated, novel radium removal process developer.

**Target post date:** Sunday night following build completion.

---

## TECHNOLOGY STACK

| Component | Technology |
|-----------|-----------|
| 3D Globe | Three.js r128 — same as SENTINEL |
| Process Flow Animation | SVG animated schematic with CSS/JS keyframes |
| Molecular Visualization | Three.js particle system |
| Telemetry Engine | JavaScript simulation using real chemistry equations |
| AI Advisor | Claude API streaming — industrial water treatment system prompt |
| Frontend | React + Tailwind |
| Data Sources | WHO GEMS/Water, EPA ECHO, IAEA PRIS, USGS NWIS |

---

## ANIMATION LAYERS — MUST ALL RUN IN PARALLEL

All five layers must be active simultaneously. A static screen at any point is a failure.

| Layer | Description |
|-------|-------------|
| L1 — Globe | Rotating Three.js Earth, contamination plumes pulsing/expanding, treatment nodes pulsing teal |
| L2 — Process Flow | Animated particles flowing through treatment stages, color shifting as contaminants removed |
| L3 — Molecular | Ion exchange and precipitation at particle level, ions binding to resin, particles nucleating |
| L4 — Telemetry | pH, turbidity, metal concentrations, flow rate, efficiency — all ticking continuously |
| L5 — AI Advisor | Streaming situational assessment every 30-60 seconds with STATUS LEVEL |

---

## CHEMISTRY PARAMETERS — VALIDATED VALUES

These are the CORRECTED values after Phase 1 Chemistry Advisor review. Use only these:

| Parameter | Valid Input Range | Treatment Target | Notes |
|-----------|------------------|-----------------|-------|
| Ra-226 | 0 – 10 Bq/L | < 0.185 Bq/L | EPA MCL. BaSO4 co-precipitation. Sludge = radioactive waste. |
| Lead (Pb) | 0 – 5 mg/L | < 0.01 mg/L | pH precipitation as Pb(OH)2 |
| Arsenic (As) | 0 – 2 mg/L | < 0.01 mg/L | Iron co-precipitation ONLY (not ion exchange for industrial WWT) |
| Nickel (Ni) | 0 – 100 mg/L | < 0.1 mg/L | Precipitation as Ni(OH)2 at pH **9.5–10.5** (not 9-10) |
| pH | 0.0 – 14.0 | 6.5 – 8.5 output | Never NaN, never out of range |
| Turbidity | 0 – 1000 NTU | Site-specific permit limit | Do NOT use single global target — show permit-specific value |
| Flow Rate | > 0 L/s | — | Craig benchmark: 300 L/s avg, 500 L/s peak |
| Lithium (Li) | Recovery context | > 90% recovery | Ion exchange selective resins — separate process train |

**CRITICAL CORRECTIONS from Phase 1 Chemistry Advisor:**
- Arsenic removal: lead with iron co-precipitation, NOT ion exchange
- Nickel pH: 9.5–10.5, NOT 9–10
- Every precipitation stage MUST have a solids-liquid separation stage (clarifier or filter press) immediately following
- Ion exchange MUST include regeneration cycle animation — resins saturate
- Ra-226 sludge MUST be flagged as radioactive waste in AI Advisor output

---

## MANDATORY PROCESS STAGE ORDERING

The treatment train must follow this sequence. Deviation requires Chemistry Advisor approval:

```
Raw Water Intake
    ↓
pH Adjustment (to target range for downstream precipitation)
    ↓
Chemical Dosing (reagent addition — iron for As, BaSO4 seed for Ra-226, etc.)
    ↓
Reaction Chamber (precipitation / co-precipitation occurs)
    ↓
Solids-Liquid Separation (clarifier or filter press) ← MANDATORY after every precipitation
    ↓
Ion Exchange (if applicable — after solids removal to protect resin)
    [Ion Exchange Regeneration Cycle — must be animated]
    ↓
pH Correction (final pH adjustment to discharge standard)
    ↓
Clean Water Output
    ↓ (parallel stream)
Sludge Handling / Waste Characterization
    [Radioactive sludge flagged for Ra-226 streams]
```

---

## CHEMISTRY ADVISOR AGENT — STANDING PROTOCOL

### Who the Chemistry Advisor Is
Claude operating as a PhD-level industrial water treatment and hydrometallurgy expert. Expertise: selective precipitation, ion exchange, hydromet recovery (Ni, Li), nuclear water treatment, environmental compliance. Reference standard: what would Craig Gagnon use to tear this apart?

### When to Invoke the Chemistry Advisor
The Chemistry Advisor MUST be invoked at ALL of the following points — not optional:

- **Before any module build begins:** Chemistry Advisor produces complete chemistry test specification for that module
- **After each module is built:** Chemistry Advisor reviews module output for domain correctness
- **At every module-to-module interface:** Chemistry Advisor reviews the handoff stream chemistry
- **System Gate 1 (pre-build):** Whole-process architecture review before Phase 3
- **System Gate 2 (per-interface):** Every module handoff reviewed as standalone chemistry problem
- **System Gate 3 (pre-build + post-integration):** Mass balance validation — runs twice
- **System Gate 4 (final):** End-to-end system certification before LinkedIn post

### Chemistry Advisor Verdicts
Every Chemistry Advisor review produces one of three verdicts:
- **APPROVED** — proceed
- **APPROVED WITH CORRECTIONS** — listed corrections must be made before proceeding
- **REJECTED — REBUILD** — module does not meet chemistry standards, must be rebuilt

No module advances without APPROVED status. This rule cannot be overridden.

### Chemistry Advisor Invocation Template
When invoking the Chemistry Advisor, use this system prompt structure:

```
You are a PhD-level industrial water treatment and hydrometallurgy chemist with 
20+ years of experience in: selective precipitation of heavy metals and radionuclides, 
ion exchange resin systems, hydromet recovery of Ni and Li, nuclear wastewater 
treatment, environmental compliance (EPA, WHO), and industrial process design.

Your role is to review [MODULE/SYSTEM/INTERFACE NAME] for scientific accuracy.
Approach this with the mindset of Craig Gagnon — an expert who has treated 40 billion 
litres of industrial wastewater and developed novel radium removal processes.
Find every error, every physically impossible claim, every sequence violation, 
every unit inconsistency. Issue verdict: APPROVED / APPROVED WITH CORRECTIONS / REJECTED.

[PASTE MODULE SPEC OR CODE OUTPUT HERE]
```

---

## QA PROTOCOL — NON-NEGOTIABLE RULES

### The Iron Rule
**Tests are written BEFORE code. No exceptions. TDD is mandatory.**

For every module, before coding:
1. Chemistry Advisor writes complete chemistry test specification
2. Build Agent writes complete software test specification
3. Both agents jointly write integration test specification
4. All three specs agreed before first line of code

### Chemistry Tests — Required for Every Relevant Module
- All parameter values within physical bounds (see table above)
- Treatment always reduces contaminant load — output < input, always
- Reaction correctness: pH ranges, reagent correlations, ion exchange saturation curve
- Process sequence: solids removal after precipitation, regeneration cycle present
- Unit consistency: mg/L never mixed with Bq/L in any calculation
- Radioactive sludge correctly flagged for all Ra-226 streams

### Software Tests — Required for Every Module
- **SENTINEL MEMORY RULE:** Every THREE.js geometry and material created MUST be disposed on removal. Test geometry count stability over 100 site switches.
- Particle count strictly bounded — test at 30 min and 60 min runtime
- Every setInterval/setTimeout cleared on component unmount
- Every addEventListener has corresponding removeEventListener
- No setState on unmounted components
- API response handlers abort correctly on component unmount
- requestAnimationFrame loop does not stack

### Integration Tests — Required at Every Module Boundary
- Correct chemistry values (right units, right precision) at every handoff
- No stale data passed across boundaries
- Globe click → correct site data loads, no null reference
- Telemetry → AI Advisor receives labeled parameters with units
- All layers respond correctly to time scrubbing

### Performance Stress Tests — Required Milestones
| Test | When | Pass Criteria |
|------|------|---------------|
| 30-min runtime | Phase 5 | FPS stable, heap plateau, particle count bounded |
| 60-min runtime | Phase 7 pre-final | < 15% FPS degradation vs t=0, memory flat |
| 100 site switches | Phase 5 | Geometry count equals baseline after all switches |
| AI Advisor 100 calls | Phase 7 | No stacking, no duplicate renders, memory stable |
| Layer isolation | Phase 5 | Each layer can be disabled without crashing others |

---

## SYSTEM-LEVEL CHEMISTRY GATES

These are SEPARATE from and IN ADDITION TO module-level QA:

| Gate | Timing | What Gets Reviewed |
|------|--------|-------------------|
| Gate 1 | Before Phase 3 | Complete treatment train architecture — end-to-end chemical coherence, stage ordering, interference, contaminant coverage, achievability of targets |
| Gate 2 | At each integration point | Every module-to-module interface — stream compatibility, unit consistency, flow conservation, visual accuracy at seam |
| Gate 3 | Pre-build + post-integration | Mass balance — contaminant accounting closes, reagent doses stoichiometrically consistent, sludge generation non-zero, energy realistic |
| Gate 4 | Before LinkedIn post | Complete 10-minute live system run reviewed by Chemistry Advisor — Final System Chemistry Certification issued |

**Gate 4 = airworthiness check. Post does not go live without it.**

---

## AI ADVISOR — REQUIRED OUTPUT STRUCTURE

Every streaming AI Advisor response must contain these fields:

```
**SITUATION**
[Current contamination levels, active treatment stages, flow conditions]

**NOTABLE PARAMETERS**
[Any values approaching or exceeding regulatory thresholds]

**ASSESSMENT**
[Process efficiency, treatment effectiveness, system health]

**RECOMMENDATIONS**
[Process optimization suggestions based on current telemetry]

**STATUS LEVEL: [COMPLIANT / WATCH / ALERT / CRITICAL]**
```

The AI Advisor system prompt must:
- Include current telemetry values WITH units (not bare numbers)
- Include current treatment stage context
- Include applicable regulatory thresholds for context
- Flag radioactive sludge generation when Ra-226 streams are active
- Never contradict current telemetry readings

---

## BUILD PHASES

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Architecture & Science Foundation + QA Protocol | ✅ COMPLETE |
| 2 | Data architecture, corrected chemistry parameters, animation spec | ✅ COMPLETE |
| 3 | Core build: Three.js globe, contamination layer, site markers | ✅ COMPLETE |
| 4 | Chemistry Advisor Review #2 + System Gate 2 interface reviews | ✅ COMPLETE |
| 5 | Process flow animation + molecular layer + telemetry engine | ✅ COMPLETE |
| 6 | Gate 2 re-run at Phase 5 interfaces + layer integration with globe | ✅ COMPLETE |
| 7 | Claude AI Water Advisor integration + streaming panel | ✅ COMPLETE |
| 8 | System Gates 3 + 4, stress tests, final polish | ✅ COMPLETE |
| 9 | LinkedIn demo video + post | ⏳ PENDING Gate 4 verdict |

---

## KNOWN OPEN ISSUES — MUST BE RESOLVED IN PHASE 2

1. Arsenic removal: revise to lead with iron co-precipitation throughout all specs
2. Nickel precipitation pH: correct to 9.5–10.5 everywhere
3. Solids-liquid separation stages: add explicitly after every precipitation stage in process flow architecture
4. Ion exchange regeneration cycle: add to animation Layer 2 specification
5. Radioactive sludge disposal pathway: add to AI Advisor logic for Ra-226 streams

---

## MASS BALANCE REQUIREMENTS

The following must close within 5% tolerance in the running simulation:

- **Water:** Input flow = clean output + sludge water content + losses
- **Contaminants:** Mass in = mass in clean output + mass in sludge + mass in waste streams (nothing disappears)
- **Reagents:** Dose rates stoichiometrically consistent with removal claimed
- **Sludge:** Non-zero from every active precipitation stage
- **Energy:** kWh/m³ in realistic industrial range

---

## INTERFACE CHEMISTRY REFERENCE

Key interfaces the Chemistry Advisor must review at integration:

| Interface | Critical Chemistry Check |
|-----------|------------------------|
| Raw Water → pH Adjustment | Incoming contaminant profile realistic for source type |
| pH Adjustment → Precipitation | pH correct for target reaction, buffering adequate |
| Precipitation → Separation | Precipitate particle size compatible with separation method |
| Separation → Ion Exchange | Suspended solids below resin fouling threshold |
| Ion Exchange → pH Correction | Residual reagent from regeneration not carried forward |
| Chemistry Engine → Telemetry | Correct parameters, correct units, correct precision |
| Telemetry → AI Advisor | Named parameters with units, not bare numbers |
| Any Ra-226 Stage → Sludge | Radioactive waste flag set correctly |

---

## SESSION CONTINUITY PROTOCOL

At the END of each session, update the snapshot below before closing.
At the START of each session, Michael pastes this file and Claude Code reads the snapshot first.

---

## 📍 CURRENT SESSION SNAPSHOT

```
Date: March 16, 2026
CLAUDE.md Version: 8.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1: ✅ COMPLETE
Phase 2: ✅ COMPLETE
Phase 3: ✅ COMPLETE — 3-A ✅ CERTIFIED, 3-B ✅ CERTIFIED, 3-C ✅ CERTIFIED
Phase 4: ✅ COMPLETE — Gate 2 CLOSED (APPROVED WITH CORRECTIONS, C1–C4 incorporated)
Phase 5: ✅ COMPLETE — 5-A ✅ CERTIFIED, 5-B ✅ CERTIFIED, 5-C ✅ CERTIFIED
Phase 6: ✅ COMPLETE — Gate 2 re-run CLOSED (C6+AF2 wire+6-C cleanup all built, build CLEAN)
Phase 7: ✅ COMPLETE — 7-A AI Advisor Panel BUILT + CERTIFIED (C7 incorporated, build CLEAN)
Phase 8: ✅ COMPLETE — Gate 3 APPROVED, G3-OP1 implemented, Gate 4 document produced
Phase 9: 🔄 IN PROGRESS — Site-by-site validation underway + debug pass complete
         Gate 4 Chemistry Advisor verdict still required before demo recording.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gate 1: ✅ CLOSED — APPROVED WITH CORRECTIONS (R1–R5 + AF1–AF3 all incorporated)
Gate 2: ✅ CLOSED — Phase 4 run + Phase 6 re-run both APPROVED (C1–C6 all incorporated)
Gate 3: ✅ CLOSED — APPROVED. All 10 sites mass balance ≤5% tolerance. G3-OP1 implemented.
Gate 4: ⏳ AWAITING VERDICT — PHASE8_GATE4_FINAL.md produced and ready for Chemistry Advisor review
         Platform does NOT go live without Gate 4 APPROVED verdict.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLETE CORRECTIONS REGISTRY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gate 1 (R1–R5, AF1–AF3): all incorporated into sites.js + data architecture
AF2 ↳ LIVE WIRE: af2_alert_active → ProcessFlow (SVG animate) + TelemetryPanel (banner) + AIAdvisorPanel (user message)

Gate 2 Phase 6 re-run:
  C6 [REQUIRED]: MolecularLayer scene rotation dynamic per site — getScenesForSite() filters baso4_coprecip when BaCl2_mgL === 0
  6-B: AF2 live wire — useTelemetry lifted to App.jsx single instance; af2Active threaded to ProcessFlow
  6-C: Dead site info overlay removed from App.jsx

Module 3-C (useSelectedSite.js): C1/C2/C3 incorporated

Module 7-A (AIAdvisorPanel.jsx):
  C7 [CRITICAL]: Ni(OH)2 re-dissolution acid-side only; high-pH excursions MUST NOT trigger warning;
      Ca(OH)2 dose reduction MUST NOT be recommended when AF2 active — embedded in system prompt

Gate 3 operational note (AIAdvisorPanel.jsx buildUserMessage):
  G3-OP1: Fe:As mass ratio computed inline. SITE-004 Zambia at 2.99 — annotated "⚠ BELOW MINIMUM".
      "(at margin)" annotation when 3.00–3.05.

Debug pass (March 16) — all incorporated:
  DB-01: SiteMarkers latLonToXYZ — +180° longitude offset to align with equirectangular texture UV mapping
         (was placing all markers ~180° off; Australia appeared over South America)
  DB-02: SiteMarkers handleClick — earth occlusion raycast; reject markers behind earth surface
  DB-03: ProcessFlow — STAGE_BOX_W undefined → sl.boxW (was killing RAF loop at first sludge stage)
  DB-04: ProcessFlow — sludgeDiverted boolean → sludgeDivertedAtIdx per-stage index tracking
         (was preventing sludge diversion at all stages after the first)
  DB-05: ProcessFlow — radioactive sludge particle sizing: SLUDGE_FRACTION_RA=0.05, r=4 (vs r=6 bulk)
  DB-06: MolecularLayer — ion spawn distributed throughout reaction zone (was top rail only)
  DB-07: MolecularLayer — feoh3_precip scene duration extended to 20s via SCENE_DUR_MAP override
  DB-08: MolecularLayer — sludge zone text color: #334155 → #94a3b8 (readable on dark background)
  DB-09: TelemetryPanel — "Simulated Live Telemetry" label + updated InfoBadge plain text

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 8 DELIVERABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE8_GATE3_SUBMISSION.md — Gate 3 mass balance (all 10 sites ≤5%), reagent stoichiometry,
  Ra-226 activity balance (0.00%), LI-IX balance. Verdict: APPROVED.
PHASE8_GATE4_FINAL.md — Complete module registry, all 4 gates closed, all corrections
  (R1–R5, AF1–AF3, C1–C7, G3-OP1), stress test certification, ready-for-demo declaration,
  LinkedIn post draft. Awaiting Gate 4 Chemistry Advisor verdict.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLATFORM BUILD STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Last verified build: ✓ CLEAN (post-DB-09, March 16 debug pass)
L1 — Globe (Three.js, contamination plumes, site markers): ✅ — lat/lon fix + occlusion fix applied
L2 — Process Flow (SVG, 500-particle pool, IX regen, AF2 badge): ✅ — RAF fix + per-stage sludge fix
L3 — Molecular (Canvas 2D, 600-particle pool, 5 scene types): ✅ — ion spawn + feoh3 duration + text fix
L4 — Telemetry (500ms tick, pH bars, contaminant meters, AF2 banner): ✅ — "Simulated" labels
L5 — AI Advisor (Claude Haiku streaming, 30–60s, STATUS LEVEL, C7 guardrail): ✅ — no changes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITE VALIDATION STATUS (Phase 9 testing)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SITE-007 Witwatersrand, SA (HM-FULL): ✅ VALIDATED — all 5 layers correct, chemistry credible
SITE-009 Ok Tedi, PNG (PB-AS-COPREC): ✅ VALIDATED — Fe:As 8.75:1 confirmed, ion binding correct
SITE-010 Pilbara, Australia (NI-PRECIP): ⏳ PENDING globe lat/lon fix morning verification
Remaining 7 sites: ⏳ PENDING validation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT ACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Morning: verify globe lat/lon fix in browser (all 10 markers on correct continents)
2. Continue site-by-site validation (8 sites remaining)
3. Submit PHASE8_GATE4_FINAL.md to Chemistry Advisor for Gate 4 verdict
4. Post APPROVED: record demo video → publish LinkedIn post
Recommended demo sequence: Norilsk → Athabasca → Atacama → Sudbury → Sellafield
```

---

*PROJECT AQUA | Michael Fouche & Claude AI | Kickoff March 11, 2026*
*Reference document: PROJECT_AQUA_Phase1_v4.docx*
