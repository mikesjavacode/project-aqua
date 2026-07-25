# PROJECT AQUA — SYSTEM GATE 1 CHEMISTRY ADVISOR SUBMISSION
**Gate:** System Gate 1 — Whole-Process Architecture Review
**Date:** March 11, 2026
**Submitted by:** Claude Code (Build Agent)
**For review by:** Chemistry Advisor (PhD-level industrial water treatment agent)

---

## CHEMISTRY ADVISOR SYSTEM PROMPT

```
You are a PhD-level industrial water treatment and hydrometallurgy chemist with
20+ years of experience in: selective precipitation of heavy metals and radionuclides,
ion exchange resin systems, hydromet recovery of Ni and Li, nuclear wastewater
treatment, environmental compliance (EPA, WHO, IAEA), and industrial process design.

Your role is to review the PROJECT AQUA SYSTEM GATE 1 ARCHITECTURE for scientific accuracy.
Approach this with the mindset of Craig Gagnon — an expert who has treated 40 billion
litres of industrial wastewater and developed novel radium removal processes.

Find every error, every physically impossible claim, every sequence violation,
every unit inconsistency, every missing separation stage, every wrong pH range,
every incorrect reagent, every violated stoichiometry.

This is a pre-build gate. Nothing gets built until you approve it.

Issue verdict: APPROVED / APPROVED WITH CORRECTIONS / REJECTED — REBUILD

Your review must cover:
1. Treatment train architecture — stage ordering correctness for each archetype
2. Chemistry correctness — pH ranges, reagent selection, reaction feasibility
3. Contamination profiles — are the inlet concentrations physically realistic?
4. Treatment targets — are they achievable with the proposed trains?
5. Mass balance — will the accounting schema close?
6. Stage sequencing — solids separation after every precipitation stage?
7. Ion exchange placement — after solids removal?
8. Regeneration cycle — included?
9. Ra-226 sludge — correctly characterized as radioactive waste?
10. Unit consistency — no mg/L / Bq/L mixing?
11. Contaminant interference — do simultaneous treatments interfere?
12. Any physically impossible claims?
```

---

## GATE 1 SUBMISSION — COMPLETE ARCHITECTURE FOR REVIEW

### SECTION 1: CONTAMINANTS AND TREATMENT TARGETS

| Contaminant | Inlet Range | Treatment Target | Regulatory Standard | Treatment Mechanism |
|---|---|---|---|---|
| Ra-226 | 0–10 Bq/L | < 0.185 Bq/L | EPA MCL | BaSO4 seed co-precipitation |
| Lead (Pb) | 0–5 mg/L | < 0.01 mg/L | EPA MCLG | pH precipitation as Pb(OH)2 |
| Arsenic (As) | 0–2 mg/L | < 0.01 mg/L | EPA MCL 10 µg/L | Iron co-precipitation with FeCl3 |
| Nickel (Ni) | 0–100 mg/L | < 0.1 mg/L | WHO 0.07 mg/L | Precipitation as Ni(OH)2, pH 9.5–10.5 |
| Lithium (Li) | Recovery context | > 90% recovery | — | Selective ion exchange resins |
| pH (outlet) | Variable inlet | 6.5–8.5 | General discharge standard | pH adjustment stages |
| Turbidity | 0–1000 NTU | Site-specific permit | Site permit (not global) | Clarifier/filter press |

**UNIT ARCHITECTURE:**
- Ra-226: ALL representations in Bq/L. The codebase does not contain a mg/L representation for Ra-226.
- Heavy metals (Pb, As, Ni, Li): ALL in mg/L. Never in Bq/L.
- No cross-unit arithmetic performed anywhere.

---

### SECTION 2: TREATMENT TRAIN ARCHITECTURES

#### TRAIN HM-FULL — Hard Rock Mine, Full Contaminant Suite

**Applicable sites:** SITE-001 (Sudbury, Ni/As), SITE-007 (Witwatersrand, Ra/As/Ni/Pb)

**Inlet profile (Witwatersrand worst case):**
- Ra-226: 3.1 Bq/L | As: 0.95 mg/L | Ni: 22.0 mg/L | Pb: 0.55 mg/L | pH: 3.2

**Proposed train sequence:**

```
Stage 1:  RAW INTAKE
          → Measure inlet: pH 3.2, As 0.95 mg/L, Ni 22.0 mg/L, Pb 0.55 mg/L, Ra-226 3.1 Bq/L

Stage 2:  pH ADJUSTMENT (UP) — target pH 5.5–6.0
          → Reagent: NaOH or Ca(OH)2
          → Purpose: Raise pH for FeCl3 coagulation / As co-precipitation range
          → At pH 5.5–7.0: Fe(OH)3 forms, adsorbs/co-precipitates As³⁻ and As⁵⁻

Stage 3:  IRON DOSING (FeCl3)
          → Reagent: FeCl3 (ferric chloride)
          → Dose: Stoichiometric to As concentration (Fe:As molar ratio ~3:1 typical)
          → Purpose: Form Fe(OH)3 floc as co-precipitation substrate for As

Stage 4:  REACTION CHAMBER — As Co-precipitation
          → pH 5.5–7.0 maintained
          → As co-precipitates onto Fe(OH)3 floc
          → Pb(OH)2 begins forming at this pH range (Ksp Pb(OH)2 = 1.2×10⁻²⁰)
          → Ni²⁺ remains in solution at pH 5.5–6.0 (requires pH >9 for Ni(OH)2)
          → Retention time: 20–30 minutes

Stage 5:  CLARIFIER 1 — As/Pb/Fe Sludge Separation ← MANDATORY SOLIDS REMOVAL
          → As-iron sludge removed
          → Pb(OH)2 sludge removed (partial — residual Pb treated in Stage 8)
          → Effluent: clarified, As reduced to target, Ni still elevated, Ra-226 still present
          → Sludge: non-zero, non-radioactive (Ra-226 not yet co-precipitated)

Stage 6:  pH ADJUSTMENT (HIGH) — target pH 9.5–10.5
          → Reagent: NaOH or Ca(OH)2
          → Purpose: Raise pH to precipitation range for Ni(OH)2
          → NOTE: At pH 9.5–10.5, remaining Pb also precipitates completely as Pb(OH)2

Stage 7:  REACTION CHAMBER — Ni(OH)2 / Pb(OH)2 Precipitation
          → pH 9.5–10.5 maintained
          → Ni²⁺ + 2OH⁻ → Ni(OH)2 ↓  (Ksp = 5.48×10⁻¹⁶)
          → Pb²⁺ + 2OH⁻ → Pb(OH)2 ↓  (complete at this pH)
          → Ra-226 remains in solution — Ba²⁺/SO₄²⁻ system required separately
          → Retention time: 20–30 minutes

Stage 8:  CLARIFIER 2 — Ni(OH)2 / Pb(OH)2 Sludge Separation ← MANDATORY SOLIDS REMOVAL
          → Ni and Pb hydroxide sludge removed
          → Effluent: clarified, low Ni, low Pb, Ra-226 still present, pH ~10
          → Sludge: non-zero, non-radioactive heavy metal sludge

Stage 9:  BaSO4 SEED DOSING
          → Reagent: BaSO4 seed crystals + Na2SO4 (sulfate source)
          → Purpose: Ra-226 co-precipitation via Ba(Ra)SO4 co-crystal formation
          → pH CONCERN: At pH ~10 (carried from Stage 8), BaSO4 precipitation is feasible.
            However, pH correction to ~7–8 may be preferred before Ra-226 stage to avoid
            carbonate interference. [CHEMISTRY ADVISOR TO REVIEW — pH at Ra-226 stage]

Stage 10: REACTION CHAMBER — Ra-226 Co-precipitation
          → Ra²²⁶ co-precipitates with Ba²⁺ as Ba(Ra)SO4 solid solution
          → This is Craig Gagnon's process area — co-crystal formation with BaSO4 seed
          → Target: Ra-226 outlet < 0.185 Bq/L

Stage 11: FILTER PRESS (Radioactive) — Ra-226 Sludge Separation ← MANDATORY SOLIDS REMOVAL
          → ☢ RADIOACTIVE WASTE sludge — flagged in system
          → Regulatory: CNSC / NRC / state radiation control
          → Effluent: Ra-226 < 0.185 Bq/L, pH needs correction from ~10 to 6.5–8.5

Stage 12: pH CORRECTION (FINAL)
          → Reagent: H2SO4 or CO2 (CO2 preferred — avoids sulfate load)
          → Target: pH 6.5–8.5 discharge standard

Stage 13: CLEAN WATER OUTPUT
          → Outlet compliance: Pb < 0.01 mg/L, As < 0.01 mg/L, Ni < 0.1 mg/L,
            Ra-226 < 0.185 Bq/L, pH 6.5–8.5, turbidity < site permit NTU

Stage 14: SLUDGE HANDLING
          → Sludge 1 (Clarifier 1): Fe/As/Pb sludge — heavy metal waste, not radioactive
          → Sludge 2 (Clarifier 2): Ni(OH)2/Pb(OH)2 — heavy metal waste
          → Sludge 3 (Filter Press): ☢ RADIOACTIVE — Ba(Ra)SO4 co-precipitate
          → All sludge streams: non-zero, mass-balanced
```

**CHEMISTRY ADVISOR QUESTIONS FOR HM-FULL:**
1. Is pH ~10 acceptable for the BaSO4/Ra-226 co-precipitation stage, or does pH need to be adjusted first? What is the optimal pH for Ra-226 co-precipitation with BaSO4?
2. Does FeCl3 dosing in Stage 3 interfere with later Ra-226 co-precipitation chemistry?
3. Is the stage ordering (As first, then Ni, then Ra-226) optimal, or is there a better sequence for this mixed contaminant profile?
4. At Witwatersrand inlet pH 3.2, how much NaOH dose is realistically required to reach pH 5.5–6.0 for Stage 2? Is this stoichiometrically consistent with industrial practice?

---

#### TRAIN RAD-COPREC — Radium/Arsenic Co-precipitation

**Applicable sites:** SITE-002 (Athabasca, Ra-226/As), SITE-006 (Sellafield, Ra-226/As/Pb)

**Inlet profile (Athabasca worst case):**
- Ra-226: 6.8 Bq/L | As: 0.62 mg/L | Pb: 0.04 mg/L | pH: 5.1

**Proposed train sequence:**

```
Stage 1:  RAW INTAKE

Stage 2:  pH ADJUSTMENT (UP) — target pH 5.5–7.0
          → Reagent: NaOH
          → Purpose: Optimize pH for FeCl3/As co-precipitation

Stage 3:  IRON DOSING (FeCl3)
          → As co-precipitation substrate

Stage 4:  REACTION CHAMBER — As Co-precipitation
          → pH 5.5–7.0, As co-precipitates onto Fe(OH)3 floc
          → Pb(OH)2 partial precipitation at this pH

Stage 5:  CLARIFIER 1 — As/Fe Sludge ← MANDATORY
          → Sludge: Fe/As/Pb — non-radioactive

Stage 6:  BaSO4 SEED DOSING
          → Ra-226 co-precipitation preparation

Stage 7:  REACTION CHAMBER — Ra-226 Co-precipitation
          → Ra²²⁶ + Ba²⁺ + SO₄²⁻ → Ba(Ra)SO4 ↓
          → [CHEMISTRY ADVISOR: pH at this stage after Stage 5? Confirm optimal pH range for Ra-226 co-precip]

Stage 8:  FILTER PRESS (Radioactive) ← MANDATORY
          → ☢ RADIOACTIVE sludge stream flagged

Stage 9:  pH CORRECTION (FINAL) → 6.5–8.5

Stage 10: CLEAN WATER OUTPUT

Stage 11: SLUDGE HANDLING — radioactive waste disposition pathway
```

**CHEMISTRY ADVISOR QUESTIONS FOR RAD-COPREC:**
1. What is the optimal pH for Ra-226 co-precipitation with BaSO4 seed? Does it conflict with the pH coming out of the As clarifier stage?
2. Is residual Fe³⁺ from Stage 3 carried through to Stage 6? Does it interfere with BaSO4 co-precipitation?
3. At Athabasca inlet Ra-226 of 6.8 Bq/L, what BaSO4 seed dose is required to reach < 0.185 Bq/L? Is this achievable in a single pass or does it require two stages?

---

#### TRAIN NI-PRECIP — Nickel/Lead Precipitation

**Applicable sites:** SITE-003 (Norilsk, Ni/Pb), SITE-010 (Pilbara, Ni/Pb)

**Inlet profile (Norilsk worst case):**
- Ni: 87.0 mg/L | Pb: 2.1 mg/L | pH: 3.8

**Proposed train sequence:**

```
Stage 1:  RAW INTAKE

Stage 2:  pH ADJUSTMENT (HIGH) — target pH 9.5–10.5
          → Reagent: NaOH or Ca(OH)2
          → Purpose: Reach pH for Ni(OH)2 AND Pb(OH)2 precipitation

Stage 3:  REACTION CHAMBER — Ni(OH)2 + Pb(OH)2 Precipitation
          → Ni²⁺ + 2OH⁻ → Ni(OH)2 ↓  at pH 9.5–10.5
          → Pb²⁺ + 2OH⁻ → Pb(OH)2 ↓  complete at pH >9
          → Retention time: 20–30 minutes
          → NOTE: At Norilsk with 87 mg/L Ni, NaOH demand is very high

Stage 4:  CLARIFIER 1 — Ni(OH)2/Pb(OH)2 Sludge ← MANDATORY
          → Heavy metal hydroxide sludge — non-radioactive

Stage 5:  pH CORRECTION (FINAL) — target 6.5–8.5
          → Reagent: H2SO4 or CO2

Stage 6:  CLEAN WATER OUTPUT

Stage 7:  SLUDGE HANDLING — heavy metal waste
```

**CHEMISTRY ADVISOR QUESTIONS FOR NI-PRECIP:**
1. At Norilsk inlet pH 3.8 with Ni at 87 mg/L, what is the realistic NaOH dose (mg/L) required to reach pH 9.5? Is this stoichiometrically consistent?
2. At pH 9.5–10.5, does Pb precipitate completely as Pb(OH)2, or does residual Pb require a polishing step?
3. Is there risk of Ni(OH)2 re-dissolution if pH drops below 9 in the reaction chamber? Should the system hold pH more tightly?

---

#### TRAIN PB-AS-COPREC — Lead/Arsenic Co-precipitation

**Applicable sites:** SITE-004 (Zambia), SITE-008 (Rio Tinto), SITE-009 (Ok Tedi)

**Inlet profile (Rio Tinto worst case):**
- As: 1.72 mg/L | Pb: 1.85 mg/L | pH: 2.9

**Proposed train sequence:**

```
Stage 1:  RAW INTAKE

Stage 2:  pH ADJUSTMENT (UP) — target pH 5.5–7.0
          → Reagent: NaOH or Ca(OH)2
          → From pH 2.9 — significant reagent demand

Stage 3:  IRON DOSING (FeCl3)
          → As co-precipitation substrate

Stage 4:  REACTION CHAMBER — As Co-precipitation + Pb Precipitation
          → As co-precipitates with Fe(OH)3 at pH 5.5–7.0
          → Pb(OH)2 precipitates (Ksp = 1.2×10⁻²⁰, partial precipitation at pH 5.5–7)
          → Retention time: 20–30 minutes

Stage 5:  CLARIFIER 1 — As/Fe/Pb Sludge ← MANDATORY

Stage 6:  pH CORRECTION (FINAL) → 6.5–8.5

Stage 7:  CLEAN WATER OUTPUT

Stage 8:  SLUDGE HANDLING
```

**CHEMISTRY ADVISOR QUESTIONS FOR PB-AS-COPREC:**
1. At pH 5.5–7.0, does Pb precipitate sufficiently to reach < 0.01 mg/L target? Or is a higher pH stage required for complete Pb removal?
2. Rio Tinto inlet at pH 2.9 with As 1.72 mg/L — is a single FeCl3 + clarifier stage sufficient to reach < 0.01 mg/L As? What Fe:As dose ratio is needed?
3. Is there chemical interference between FeCl3 co-precipitation (for As) and Pb(OH)2 precipitation at the same pH and in the same reaction chamber?

---

#### TRAIN LI-IX — Lithium Ion Exchange Recovery

**Applicable sites:** SITE-005 (Atacama, Li brine)

**Inlet profile:**
- Li: 1850 mg/L | pH: 7.1 | Turbidity: 95 NTU

**Proposed train sequence:**

```
Stage 1:  RAW INTAKE — lithium brine feed

Stage 2:  PRE-FILTER
          → Target: TSS < 5 mg/L before resin bed (prevent fouling)
          → Method: multimedia filter or cartridge filter
          → From 95 NTU → < 5 mg/L SS

Stage 3:  IX LOADING — selective Li resin
          → Selective lithium ion exchange resin (e.g., Li-Mn oxide type or proprietary)
          → Li⁺ adsorbs preferentially
          → Co-ions (Na⁺, K⁺, Mg²⁺, Ca²⁺ in brine) partially excluded
          → Resin loading tracked: 0–100%, triggers regen at >85%
          → Bed volumes processed: tracked

Stage 4:  IX REGENERATION CYCLE ← MANDATORY ANIMATION
          → Eluent: dilute acid (HCl) or water (depending on resin type)
          → Flow reversal: backwash
          → Eluate: Li-rich strip solution
          → Duration: ~30 minute cycle
          → Resin returns to service after regen completion

Stage 5:  ELUTION / COLLECTION
          → Li-rich eluate collected in product tank
          → Target: > 90% Li recovery from feed

Stage 6:  EVAPORATION / CRYSTALLIZATION
          → Li-rich eluate concentrated
          → Li2CO3 or LiOH·H2O crystallized
          → Product: battery-grade lithium salt

Stage 7:  PRODUCT OUTPUT
          → Li recovery: > 90% of inlet Li mass
          → Recovery check: mass_in × 0.90 ≤ mass_product

Stage 8:  RAFFINATE TREATMENT
          → Spent brine: Mg²⁺, Ca²⁺, Na⁺, K⁺ dominant
          → pH correction if needed
          → Return to evaporation pond or discharge per permit
```

**CHEMISTRY ADVISOR QUESTIONS FOR LI-IX:**
1. Is the Li-Mn oxide (LMO) ion sieve resin the correct resin type for brine processing at this scale? What are alternatives?
2. Is HCl the correct eluent for LMO resin regeneration, or is water stripping used?
3. At Atacama brine with Mg/Li ratio ~6:1 (typical), what selectivity factor is realistic for Li over Mg? Does this affect achievability of >90% recovery?
4. Is the pre-filter (95 NTU → <5 mg/L SS) realistic with a single multimedia filter pass?

---

### SECTION 3: MASS BALANCE ARCHITECTURE

The simulation enforces mass balance closure within 5% for:

**Water balance (per site, per tick):**
```
Input_flow (L/s) = Clean_output (L/s) + Sludge_water (L/s) + Evaporation_losses (L/s)
Closure = |Input - Sum(outputs)| / Input × 100%
Requirement: < 5%
```

**Contaminant mass balance (per contaminant, per tick):**
```
Mass_in (g/hr) = Mass_clean_out (g/hr) + Mass_sludge (g/hr) + Mass_waste_streams (g/hr)
Closure = |Mass_in - Sum(mass_out)| / Mass_in × 100%
Requirement: < 5%
```

**Sludge non-zero check:**
```
For any active precipitation stage: sludge_generation_g_hr > 0 (MANDATORY)
If sludge_generation = 0 when precipitation is active → CHEMISTRY VIOLATION, logged
```

**Energy range:**
- Target: 0.5–5.0 kWh/m³ (realistic industrial water treatment range)
- Flagged if outside this range

**CHEMISTRY ADVISOR — Mass Balance Review Request:**
1. Is 0.5–5.0 kWh/m³ a correct realistic range for the treatment trains specified? Are any trains (e.g., LI-IX with crystallization) likely to exceed this?
2. For BaSO4 seed co-precipitation: what is the expected sludge generation rate (kg/m³ treated) at Ra-226 inlet of 6.8 Bq/L?
3. For NI-PRECIP at 87 mg/L Ni inlet: what is the expected Ni(OH)2 sludge generation (kg/m³ treated)? Is this visually/numerically realistic?

---

### SECTION 4: PHASE 1 CORRECTION INCORPORATION AUDIT

The Chemistry Advisor issued 5 corrections at Phase 1. Confirm each is incorporated:

| # | Correction Required | Incorporated In | Status |
|---|---|---|---|
| 1 | Arsenic: iron co-precipitation ONLY (not IX) | All trains — no IX step for As; FeCl3 dosing + clarifier in all As trains | ✅ INCORPORATED |
| 2 | Nickel pH: 9.5–10.5 (not 9–10) | NI-PRECIP Stage 2 and HM-FULL Stage 6 both specify 9.5–10.5 | ✅ INCORPORATED |
| 3 | Solids separation after every precipitation stage | HM-FULL: 3 clarifiers/filter presses. RAD-COPREC: 2. NI-PRECIP: 1. PB-AS: 1. LI-IX: pre-filter. All have mandatory separation | ✅ INCORPORATED |
| 4 | IX regeneration cycle animated | LI-IX Stage 4 is dedicated regeneration cycle. L2 animation spec includes flow reversal, resin loading indicator, regeneration trigger at >85% | ✅ INCORPORATED |
| 5 | Ra-226 sludge flagged as radioactive waste | Filter Press stage in HM-FULL and RAD-COPREC explicitly flagged ☢. AI Advisor prompt package includes `radioactive_sludge_generating` boolean. L2 sludge particles magenta for Ra-226 streams | ✅ INCORPORATED |

---

### SECTION 5: CONTAMINATION PROFILE REALISM CHECK

**CHEMISTRY ADVISOR — Please verify these inlet concentrations are physically realistic for the stated site types:**

| Site | Type | Key Inlet Values | Realistic? |
|---|---|---|---|
| Sudbury (SITE-001) | Hard rock Ni mine | Ni 48 mg/L, As 0.85 mg/L, pH 4.2 | [Advisor to assess] |
| Athabasca (SITE-002) | Uranium legacy | Ra-226 6.8 Bq/L, As 0.62 mg/L, pH 5.1 | [Advisor to assess] |
| Norilsk (SITE-003) | Ni smelter effluent | Ni 87 mg/L, Pb 2.1 mg/L, pH 3.8 | [Advisor to assess] |
| Zambia (SITE-004) | Cu/Pb mine AMD | As 1.45 mg/L, Pb 3.2 mg/L, pH 4.5 | [Advisor to assess] |
| Atacama (SITE-005) | Li brine | Li 1850 mg/L, pH 7.1 | [Advisor to assess] |
| Sellafield (SITE-006) | Nuclear process water | Ra-226 4.2 Bq/L, As 0.18 mg/L, pH 6.1 | [Advisor to assess] |
| Witwatersrand (SITE-007) | Deep gold mine AMD | Ra-226 3.1 Bq/L, As 0.95 mg/L, Ni 22 mg/L, Pb 0.55 mg/L, pH 3.2 | [Advisor to assess] |
| Rio Tinto (SITE-008) | Ancient Cu mine AMD | As 1.72 mg/L, Pb 1.85 mg/L, pH 2.9 | [Advisor to assess] |
| Ok Tedi (SITE-009) | PNG Cu mine | As 0.88 mg/L, Pb 2.60 mg/L, pH 4.1 | [Advisor to assess] |
| Pilbara (SITE-010) | Ni/Fe mine effluent | Ni 35 mg/L, Pb 0.38 mg/L, pH 4.6 | [Advisor to assess] |

---

### SECTION 6: CONTAMINANT INTERFERENCE REVIEW

**CHEMISTRY ADVISOR — Please assess potential interference between simultaneous treatments:**

1. **FeCl3 + BaSO4 in same train (HM-FULL):** Does residual Fe³⁺ from Stage 3 interfere with BaSO4 co-precipitation in Stage 9? Does Fe interfere with Ra-226 co-precipitation mechanism?

2. **High-pH Ni precipitation followed by Ra-226 co-precipitation:** HM-FULL operates at pH ~10 through Stage 8. Does this pH affect BaSO4 seed stability or Ra-226 co-precipitation efficiency?

3. **Pb + As in same reaction chamber (PB-AS-COPREC):** Is there chemical interference between Pb(OH)2 precipitation and As co-precipitation with Fe(OH)3 at pH 5.5–7.0?

4. **Cl⁻ load from FeCl3:** FeCl3 dosing adds chloride to the effluent. Is this significant at the dose rates implied by the As concentrations (0.5–2 mg/L As range)?

---

### SECTION 7: GATE 1 VERDICT REQUEST

**Please issue your verdict on:**

A. **Treatment Train Architecture** — Are the stage sequences chemically correct and physically feasible?

B. **Chemistry Parameters** — Are pH ranges, reagent selections, and removal mechanisms correct?

C. **Contamination Profiles** — Are the inlet concentrations realistic for the site types?

D. **Treatment Targets** — Are the outlet targets achievable with the proposed trains?

E. **Phase 1 Corrections** — Are all 5 corrections fully and correctly incorporated?

F. **Mass Balance Schema** — Is the accounting approach sound?

G. **Any additional issues** not captured above

**VERDICT (APPROVED / APPROVED WITH CORRECTIONS / REJECTED — REBUILD):**

---

*PHASE2_GATE1_CHEMISTRY_ADVISOR_SUBMISSION.md | PROJECT AQUA | March 11, 2026*
*This document is the Gate 1 submission package. Copy the system prompt + submission to the Chemistry Advisor.*
*Do not begin Phase 3 build until APPROVED verdict is received.*
