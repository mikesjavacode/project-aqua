# PROJECT AQUA — PHASE 5, MODULE 5-A TEST SPECIFICATIONS
## Layer 2 — Process Flow Animation

**Date:** March 12, 2026
**Module:** 5-A — SVG Process Flow Schematic + Animated Particles
**Status:** CLEARED FOR BUILD — Chemistry Advisor APPROVED WITH CORRECTIONS (C1/C2 + advisory incorporated)
**Prepared by:** Build Agent (Claude Code)
**Depends on:** Module 3-C (selectedSite, treatment_train, raw_water, treatment_targets)

---

## PREAMBLE — WHAT MODULE 5-A IS

Module 5-A renders the animated process flow schematic for the active treatment site.
It is the first visible layer added since the globe. When a site is selected, a schematic
panel appears showing the full treatment train as an animated flow diagram: particles move
left-to-right through each process stage, changing colour as contaminants are removed.

**What makes 5-A the chemistry-heaviest spec in the project:**
The treatment train architectures — the exact sequence of stages, the reagents, the
reactions, the mandatory separations, the IX regeneration cycle — are all encoded here
as visual structure. A wrong stage order, a missing separation stage, or an incorrect
reagent is not an invisible data error: it is displayed to viewers as the system's claim
about how industrial water treatment works. The Chemistry Advisor's approval of the
5 train architectures is the primary gate for this module.

**What 5-A does NOT do:**
- No chemistry computed here (all values from 3-C's selectedSite)
- No real-time telemetry simulation (that is Module 5-C)
- No molecular-level visualization (that is Module 5-B)
- Particle colours are driven by static inlet/outlet chemistry from selectedSite,
  not live telemetry ticks — those wire in at Phase 6 integration

---

## PART 1 — CHEMISTRY ADVISOR TEST SPECIFICATION

### Chemistry Advisor System Prompt

```
You are a PhD-level industrial water treatment and hydrometallurgy chemist with
20+ years of experience in selective precipitation of heavy metals and radionuclides,
ion exchange resin systems, hydromet recovery of Ni and Li, nuclear wastewater
treatment, and environmental compliance.

Module 5-A is the process flow schematic layer of PROJECT AQUA. Your role is to
certify that all five treatment train architectures are:
1. Correctly sequenced — stages appear in the right order, no stage is missing
2. Chemically accurate at each stage — correct reagent, correct reaction, correct product
3. Compliant with Gate 1 corrections (R1 HM-FULL pH correction; R2 PB-AS-COPREC dual
   Pb mechanism; R3 LI-IX pre-treatment; R4 LI-IX energy; AF2 Ni pH floor; AF3 Ra-226
   polishing stage)
4. Structurally complete — solids-liquid separation present after EVERY precipitation stage
5. Correct in what particles represent — colour transitions at each stage reflect actual
   chemical transformations, not arbitrary aesthetics

Approach this as Craig Gagnon reviewing a schematic that will be watched by LinkedIn
viewers who work in water treatment. Find every sequence violation, every missing stage,
every wrong reagent, every physically impossible colour claim.

Issue verdict: APPROVED / APPROVED WITH CORRECTIONS / REJECTED — REBUILD
```

---

## TREATMENT TRAIN ARCHITECTURES — FULL DETAIL

---

### TRAIN 1: HM-FULL — Hard Rock Mine (15 stages)

**Sites:** SITE-001 Sudbury (Ni+As+Pb, no Ra-226), SITE-007 Witwatersrand (Ni+As+Pb+Ra-226)
**Key corrections:** R1 (PH_CORRECT_RA before BaSO4), R2 (dual Pb mechanism)

**Stage sequence and chemistry:**

| Stage # | Stage ID | Display Label | Reagent(s) | Chemistry | Products | Sludge? |
|---------|----------|--------------|------------|-----------|----------|---------|
| 1 | INTAKE | Raw Water Intake | — | Influent characterisation; flow measurement | Untreated raw water stream | — |
| 2 | PH_UP | pH Adjustment ↑ | Ca(OH)₂ slurry (lime milk) | Ca(OH)₂ → Ca²⁺ + 2OH⁻; drives bulk pH to 9.5–10.5 for Ni precipitation | Alkaline effluent pH 9.5–10.5 | — |
| 3 | NI_PRECIP | Ni/Pb Precipitation | — (using OH⁻ from stage 2) | Ni²⁺ + 2OH⁻ → Ni(OH)₂↓; Pb²⁺ + 2OH⁻ → Pb(OH)₂↓; HRT ≥ 30 min; AF2: alert if pH < 9.2 | Ni(OH)₂ + Pb(OH)₂ precipitate slurry | — |
| 4 | NI_CLARIFIER | Ni Clarifier | — | Gravity clarification; Ni(OH)₂ and Pb(OH)₂ settle; clarified liquor decants | Clarified liquor (still contains As, Ra-226); sludge: Ni(OH)₂ + Pb(OH)₂ | ✓ Non-radioactive |
| 5 | FE_DOSE | Iron Dosing | FeCl₃ solution | FeCl₃ + 3H₂O → Fe(OH)₃ + 3HCl; Fe(OH)₃ floc nucleates; pH ≥ 6 required for effective floc | Fe(OH)₃ floc in suspension | — |
| 6 | AS_PB_COPREC | As/Pb Co-precipitation | — (using Fe(OH)₃ from stage 5) | As(V) adsorbs to Fe(OH)₃ surface; As(III) partially; Pb: adsorption onto Fe floc (dominant, R2) + residual Pb(OH)₂ (supplementary, R2); HRT ≥ 20 min | Fe(OH)₃–As–Pb floc slurry | — |
| 7 | AS_PB_CLARIFIER | As/Pb Clarifier + Filter Press | — | Gravity clarifier + filter press polishing; removes Fe(OH)₃–As–Pb sludge; MANDATORY | Clarified liquor; sludge: Fe(OH)₃ + As + Pb | ✓ Non-radioactive |
| 8 | PH_CORRECT_RA | pH Correction (CO₂) [R1] | CO₂ gas (sparging) | CO₂ + H₂O → H₂CO₃; H₂CO₃ neutralises residual OH⁻; pH 10 → 7–8. Critical: at pH > 9, BaCO₃ would form and compete for Ba²⁺ sites, preventing Ra-226 co-precipitation. CO₂ preferred over HCl to avoid chloride load. | pH 7–8 effluent; no BaCO₃ precipitation | — |
| 9 | BA_DOSE | BaSO₄ Seed Dosing | BaSO₄ seed crystals + BaCl₂ solution (+ Na₂SO₄ if SO₄²⁻ deficient) | BaCl₂ → Ba²⁺ + 2Cl⁻; SO₄²⁻ present or dosed; BaSO₄ seed crystals provide nucleation surface | Ba²⁺ and SO₄²⁻ in solution; seed crystals suspended | — |
| 10 | RA_COPREC | Ra-226 Co-precipitation | — (using BaSO₄ system from stage 9) | Ra²⁺ isomorphically substitutes into BaSO₄ crystal lattice: (Ba,Ra)SO₄ solid solution; HRT ≥ 20 min; pH 7–8 optimal; C1 Gate 2: ra226_requires_polishing_stage active when inlet > 5.0 Bq/L | (Ba,Ra)SO₄ precipitate slurry | — |
| 11 | RA_FILTER_PRESS | Ra Filter Press ☢ | — | Filter press (gravity clarifier insufficient — (Ba,Ra)SO₄ particles fine); MANDATORY; radioactive sludge segregated from all other sludge streams | Clarified liquor; sludge: (Ba,Ra)SO₄ → radioactive waste, licensed disposal required | ✓ ☢ RADIOACTIVE |
| 12 | PH_FINAL | Final pH Correction | CO₂ or H₂SO₄ (minimal) | Fine-tune pH to discharge standard 6.5–8.5; correct for any residual alkalinity from lime addition | Discharge-ready liquor pH 6.5–8.5 | — |
| 13 | MM_FILTER | Multi-Media Filter | — | Sand/anthracite/garnet polishing filter; removes residual TSS; turbidity to permit level | Polished effluent | — |
| 14 | SLUDGE_HANDLING | Sludge Handling | — | Non-radioactive sludge (Ni/Pb/Fe–As streams): classified non-hazardous or hazardous depending on metals load; Ra-226 sludge: licensed radioactive waste — physically segregated at source. SITE-001: no radioactive sludge. SITE-007: radioactive sludge from stage 11 segregated. | — | — |
| 15 | OUTPUT | Clean Water Output | — | Compliant effluent; continuous monitoring; discharge permit compliance | Treated water to environment | — |

**HM-FULL chemistry test cases:**

| Test ID | Chemistry Test | Pass Condition |
|---------|----------------|----------------|
| CC-5A-HM-01 | Stage 4 (NI_CLARIFIER) present between stages 3 and 5 | Solids-liquid separation mandatory after Ni/Pb precipitation — no direct feed of precipitate slurry to FE_DOSE |
| CC-5A-HM-02 | Stage 7 (AS_PB_CLARIFIER) present between stages 6 and 8 | Mandatory after Fe/As/Pb precipitation — Fe(OH)₃ floc must be removed before Ra-226 stage |
| CC-5A-HM-03 | Stage 8 (PH_CORRECT_RA, CO₂) appears BEFORE stage 9 (BA_DOSE) [R1] | pH must be 7–8 before BaSO₄ dosing; BaCO₃ interference at pH > 9 |
| CC-5A-HM-04 | Stage 11 (RA_FILTER_PRESS) is a filter press, not a gravity clarifier | (Ba,Ra)SO₄ particles fine enough to require filter press — gravity alone insufficient |
| CC-5A-HM-05 | Stage 11 sludge flagged ☢ RADIOACTIVE for SITE-007 (ra226=3.1 Bq/L) | Any Ra-226 co-precipitation sludge = radioactive waste |
| CC-5A-HM-06 | Stage 11 sludge NOT flagged radioactive for SITE-001 (ra226=0.0) | No Ra-226 present → no radioactive sludge |
| CC-5A-HM-07 | Stage 3 (NI_PRECIP) pH range displays as 9.5–10.5, AF2 alert shown if pH < 9.2 | Ni(OH)₂ requires pH 9.5–10.5; re-dissolution below 9.2 |
| CC-5A-HM-08 | Stage 6 (AS_PB_COPREC) label/tooltip references dual Pb mechanism [R2] | Fe floc adsorption (dominant) + Pb(OH)₂ (supplementary) — not either/or |
| CC-5A-HM-09 | Stage 10 (RA_COPREC) active only when isRadioactiveSite is true | Stage present but dimmed for SITE-001; active for SITE-007 |
| CC-5A-HM-10 | 15 stages total; no stage omitted | Full train architecture rendered |

---

### TRAIN 2: RAD-COPREC — Radium Legacy / Nuclear Process Water (11 stages)

**Sites:** SITE-002 Athabasca (Ra-226 6.8 Bq/L; ra226_requires_polishing_stage: true),
          SITE-006 Sellafield (Ra-226 4.2 Bq/L; ra226_requires_polishing_stage: false)
**Key notes:** No deliberate pH elevation to 10 — naturally acidic to neutral feed.
No PH_CORRECT_RA stage needed (Gate 1 Chemistry Advisor: "naturally pH 6–7 after As clarifier").
AF3: RA_POLISH stage active when ra226_BqL > 5.0 Bq/L.

**Stage sequence and chemistry:**

| Stage # | Stage ID | Display Label | Reagent(s) | Chemistry | Products | Sludge? |
|---------|----------|--------------|------------|-----------|----------|---------|
| 1 | INTAKE | Raw Water Intake | — | Influent characterisation; Ra-226, As, Pb measured; pH typically 5–7 for uranium legacy sites | Untreated raw water | — |
| 2 | FE_DOSE | Iron Dosing | FeCl₃ solution | FeCl₃ + 3H₂O → Fe(OH)₃ + 3HCl; floc nucleates in slightly acidic feed; pH 5–7 acceptable for As co-precipitation | Fe(OH)₃ floc in suspension | — |
| 3 | AS_COPREC | As (+ Pb) Co-precipitation | — (using Fe(OH)₃ from stage 2) | As(V) adsorbs strongly to Fe(OH)₃; As(III) partially; Pb if present: Fe floc adsorption dominant [R2] + Pb(OH)₂ supplementary; HRT ≥ 20 min | Fe(OH)₃–As–Pb floc slurry | — |
| 4 | AS_CLARIFIER | As Clarifier | — | Gravity clarifier; Fe/As/Pb sludge settles; clarified liquor typically exits at pH 6–7 naturally (no deliberate alkali added → no BaCO₃ risk at subsequent Ra-226 stage); MANDATORY | Clarified liquor pH 6–7; sludge: Fe(OH)₃ + As + Pb | ✓ Non-radioactive |
| 5 | PH_VERIFY | pH Verify / Adjust | Minimal Ca(OH)₂ or HCl (if needed) | Check pH of clarifier effluent; target 6–7 for optimal BaSO₄ co-precipitation. Minor adjustment only — bulk pH not deliberately elevated, so no BaCO₃ correction needed (confirmed by Gate 1 Chemistry Advisor). | pH 6–7 effluent | — |
| 6 | BA_DOSE | BaSO₄ Seed Dosing | BaSO₄ seed crystals + BaCl₂ + SO₄²⁻ if needed | Ba²⁺ in solution; SO₄²⁻ present or dosed; seed crystals provide nucleation sites for (Ba,Ra)SO₄ | Ba²⁺ and SO₄²⁻ in solution; seeds suspended | — |
| 7 | RA_COPREC | Ra-226 Co-precipitation | — (using BaSO₄ system) | Ra²⁺ co-precipitates as (Ba,Ra)SO₄; HRT ≥ 20 min; pH 6–7 optimal; for SITE-002: ra226_requires_polishing_stage = true (6.8 > 5.0 Bq/L) | (Ba,Ra)SO₄ precipitate slurry | — |
| 8 | RA_FILTER_PRESS | Ra Filter Press ☢ | — | Filter press; (Ba,Ra)SO₄ sludge separated; MANDATORY; radioactive sludge → licensed disposal both sites | Clarified liquor; sludge: (Ba,Ra)SO₄ → radioactive waste | ✓ ☢ RADIOACTIVE |
| 9 | RA_POLISH | Ra Polishing Stage | BaSO₄ secondary dose or GAC/resin | Conditional (AF3): active when ra226_BqL > 5.0 Bq/L. Secondary BaSO₄ polishing pass or GAC adsorption to capture residual Ra-226 below first-pass removal. SITE-002 (6.8): ACTIVE. SITE-006 (4.2): PRESENT but DIMMED (inactive). | Further reduced Ra-226; sludge if second BaSO₄ pass used | Conditional ☢ |
| 10 | PH_FINAL | Final pH Correction | CO₂ or dilute acid if needed | Fine-tune to discharge pH 6.5–8.5 | Discharge-ready effluent | — |
| 11 | OUTPUT | Clean Water Output | — | Compliant effluent; Ra-226 ≤ 0.185 Bq/L (EPA MCL); continuous monitoring | Treated water | — |

*Parallel stream:* SLUDGE_HANDLING — non-radioactive (stage 4) and radioactive (stages 8, 9 if active) sludge streams physically segregated; licensed disposal for radioactive fraction.

**RAD-COPREC chemistry test cases:**

| Test ID | Chemistry Test | Pass Condition |
|---------|----------------|----------------|
| CC-5A-RC-01 | NO PH_CORRECT_RA (CO₂) stage present in RAD-COPREC train | Unlike HM-FULL, no pH elevation to 10 was performed; CO₂ correction unnecessary and would be wrong |
| CC-5A-RC-02 | Stage 4 (AS_CLARIFIER) present between stages 3 and 6 | Mandatory separation after Fe/As precipitation; also allows natural pH equilibration before BaSO₄ |
| CC-5A-RC-03 | Stage 5 (PH_VERIFY) shows only minor adjustment, not deliberate alkali elevation | pH 6–7 naturally achieved; bulk lime dosing absent |
| CC-5A-RC-04 | Stage 9 (RA_POLISH) ACTIVE (highlighted) for SITE-002 (ra226=6.8 > 5.0); DIMMED for SITE-006 (ra226=4.2 ≤ 5.0) | AF3: polishing stage conditional on inlet > 5.0 Bq/L |
| CC-5A-RC-05 | Both SITE-002 and SITE-006 show ☢ radioactive sludge at stage 8 | Both have ra226_BqL > 0 → any Ra-226 co-precipitation sludge = radioactive waste |
| CC-5A-RC-06 | RA_POLISH (stage 9) also generates ☢ radioactive sludge when active | Any BaSO₄-Ra sludge from polishing stage = radioactive |
| CC-5A-RC-07 | SITE-006 regulatory_note displayed: "EA/ONR (UK)" not "EPA" | Gate 2 C3: IAEA+UK → EA/ONR regulatory context shown |
| CC-5A-RC-08 | Thresholds displayed reference 0.185 Bq/L EPA MCL for Ra-226 | Regulatory threshold for AI Advisor and display context |
| CC-5A-RC-09 | 11 stages total in architecture | Full train rendered |

---

### TRAIN 3: NI-PRECIP — Nickel Smelter Effluent (7 stages)

**Sites:** SITE-003 Norilsk (Ni 87 mg/L, Pb 2.1 mg/L), SITE-010 Pilbara (Ni 35 mg/L, Pb 0.38 mg/L)
**Key corrections:** AF2 (Ni(OH)₂ re-dissolution pH floor alert at 9.2 in reaction chamber)

**Stage sequence and chemistry:**

| Stage # | Stage ID | Display Label | Reagent(s) | Chemistry | Products | Sludge? |
|---------|----------|--------------|------------|-----------|----------|---------|
| 1 | INTAKE | Raw Water Intake | — | Influent; high Ni (35–87 mg/L), moderate Pb; strongly acidic pH 3.8–4.6 | Untreated raw water | — |
| 2 | PH_UP | pH Adjustment ↑ | Ca(OH)₂ slurry or NaOH solution | Raises bulk pH from 3.8–4.6 to target 9.5–10.5; NaOH preferred for tighter pH control at high Ni loads; lime for cost efficiency at scale | Alkaline effluent pH 9.5–10.5 | — |
| 3 | NI_PRECIP | Ni/Pb Precipitation | — (using OH⁻ from stage 2) | Ni²⁺ + 2OH⁻ → Ni(OH)₂↓ (complete above pH 9.5); Pb²⁺ + 2OH⁻ → Pb(OH)₂↓ (complete above pH 9); HRT ≥ 30 min. AF2 ALERT: if pH drops below 9.2 in reaction chamber, Ni(OH)₂ begins to re-dissolve — alert must fire and reagent dose must increase. | Ni(OH)₂ + Pb(OH)₂ precipitate slurry | — |
| 4 | NI_CLARIFIER | Ni/Pb Clarifier | — | Gravity clarifier; Ni(OH)₂ and Pb(OH)₂ sludge settles; MANDATORY separation; clarified liquor still at pH 9.5–10.5 | Clarified liquor; sludge: Ni(OH)₂ + Pb(OH)₂ | ✓ Non-radioactive |
| 5 | PH_FINAL | Final pH Correction | CO₂ sparging or dilute H₂SO₄ | Reduces pH from 9.5–10.5 to discharge standard 6.5–8.5; CO₂ preferred to avoid adding SO₄²⁻ load unnecessarily | Discharge-ready effluent pH 6.5–8.5 | — |
| 6 | SLUDGE_HANDLING | Sludge Handling | — | Ni(OH)₂ + Pb(OH)₂ sludge characterisation; non-radioactive; classified hazardous due to Ni/Pb content; dewatered and sent to licensed hazardous waste disposal or metals recovery | — | — |
| 7 | OUTPUT | Clean Water Output | — | Compliant effluent; Ni ≤ 0.1 mg/L (WHO), Pb ≤ 0.01 mg/L | Treated water | — |

**NI-PRECIP chemistry test cases:**

| Test ID | Chemistry Test | Pass Condition |
|---------|----------------|----------------|
| CC-5A-NP-01 | Stage 3 (NI_PRECIP) pH range displayed as 9.5–10.5 (not 9–10 — pre-correction value) | Correct pH range for Ni(OH)₂ precipitation; 9–10 is wrong per Gate 1 |
| CC-5A-NP-02 | AF2 alert indicator visible at stage 3: fires when pH < 9.2 in reaction chamber | Ni(OH)₂ re-dissolution begins below 9.2; alert must be visually present in schematic |
| CC-5A-NP-03 | Stage 4 (NI_CLARIFIER) present immediately after stage 3 | MANDATORY separation; no precipitation product may bypass clarification |
| CC-5A-NP-04 | No IX stage present in NI-PRECIP train | Ni precipitation is the treatment mechanism; ion exchange not part of this train |
| CC-5A-NP-05 | No Ra-226 stages (no BaSO₄, no filter press labelled ☢) | Ni/Pb smelter — no radionuclide treatment |
| CC-5A-NP-06 | Stage 5 (PH_FINAL) brings pH DOWN from 9.5–10.5 to 6.5–8.5 | Direction: down, not up — NI-PRECIP elevates pH then must correct for discharge |
| CC-5A-NP-07 | 7 stages total | Full train rendered |

---

### TRAIN 4: PB-AS-COPREC — Lead/Arsenic Co-precipitation (8 stages)

**Sites:** SITE-004 Zambia (As 1.45, Pb 3.2 mg/L; pH 4.5), SITE-008 Rio Tinto (As 1.72, Pb 1.85 mg/L; pH 2.9), SITE-009 Ok Tedi (As 0.88, Pb 2.60 mg/L; pH 4.1)
**Key correction:** R2 (dual Pb mechanism: Fe floc adsorption dominant, Pb(OH)₂ supplementary; pH floor 6.0)

**Stage sequence and chemistry:**

| Stage # | Stage ID | Display Label | Reagent(s) | Chemistry | Products | Sludge? |
|---------|----------|--------------|------------|-----------|----------|---------|
| 1 | INTAKE | Raw Water Intake | — | Influent; As 0.88–1.72 mg/L, Pb 1.85–3.20 mg/L; strongly acidic pH 2.9–4.5 | Untreated raw water | — |
| 2 | PH_ADJUST | pH Adjustment | Ca(OH)₂ or NaOH | Raise pH to 6.0–7.0. Floor: pH 6.0 [R2]: below this, Pb(OH)₂ equilibrium gives ~0.25 mg/L Pb in solution — insufficient for < 0.01 mg/L target; Fe floc also less effective below pH 5.5. Upper limit: 7.0–7.5 (no need to go higher; Fe floc works well in this range) | Effluent pH 6.0–7.0 | — |
| 3 | FE_DOSE | Iron Dosing | FeCl₃ solution | FeCl₃ + 3H₂O → Fe(OH)₃ + 3HCl; Fe(OH)₃ forms readily at pH 6–7; high surface area floc for Pb/As adsorption | Fe(OH)₃ floc in suspension | — |
| 4 | AS_PB_COPREC | As/Pb Co-precipitation [R2] | — (using Fe(OH)₃ from stage 3) | Two simultaneous mechanisms [R2]: (1) Pb adsorption onto Fe(OH)₃ floc surface — DOMINANT, achieves < 0.01 mg/L Pb at pH 6; (2) Pb(OH)₂ precipitation — SUPPLEMENTARY, augments Pb removal; As: As(V) strong adsorption to Fe(OH)₃; As(III) partial; HRT ≥ 20 min | Fe(OH)₃–Pb–As floc slurry | — |
| 5 | AS_PB_CLARIFIER | As/Pb Clarifier + Filter Press | — | Gravity clarifier + filter press polishing; MANDATORY; removes Fe(OH)₃–Pb–As aggregate; sludge is non-radioactive but contains Pb — classified hazardous | Clarified liquor; sludge: Fe(OH)₃ + Pb + As | ✓ Non-radioactive (hazardous Pb) |
| 6 | PH_FINAL | Final pH Correction | CO₂ or minimal acid if pH too high | Fine-tune to 6.5–8.5; pH after stage 4 is typically 6–7 already — minor adjustment | Discharge-ready effluent | — |
| 7 | SLUDGE_HANDLING | Sludge Handling | — | Fe(OH)₃–Pb–As sludge; classified hazardous (Pb); dewatered; licensed hazardous waste disposal or smelter feed for Pb recovery | — | — |
| 8 | OUTPUT | Clean Water Output | — | Compliant effluent; As ≤ 0.01 mg/L (EPA MCL), Pb ≤ 0.01 mg/L | Treated water | — |

**PB-AS-COPREC chemistry test cases:**

| Test ID | Chemistry Test | Pass Condition |
|---------|----------------|----------------|
| CC-5A-PA-01 | Stage 2 (PH_ADJUST) pH target range shown as 6.0–7.0; floor label shows minimum pH 6.0 [R2] | pH floor 6.0 is the R2 correction — below this, Pb removal inadequate |
| CC-5A-PA-02 | Stage 4 (AS_PB_COPREC) label/tooltip explicitly describes DUAL mechanism [R2]: Fe floc adsorption (dominant) + Pb(OH)₂ (supplementary) | R2 correction must be represented — not a single Pb(OH)₂ mechanism |
| CC-5A-PA-03 | Stage 5 (AS_PB_CLARIFIER) present immediately after stage 4 | MANDATORY separation after precipitation |
| CC-5A-PA-04 | No Ni stages, no Ra-226 stages, no IX stages in PB-AS-COPREC | Only As and Pb treatment — other trains not mixed in |
| CC-5A-PA-05 | Stage 5 sludge flagged as HAZARDOUS (Pb content) but NOT radioactive | Pb sludge = hazardous, not radioactive — correct classification |
| CC-5A-PA-06 | Stage 2 pH direction: UP from pH 2.9–4.5 to 6.0–7.0 (not down) | All PB-AS sites are acidic; pH raised, not lowered |
| CC-5A-PA-07 | 8 stages total | Full train rendered |

---

### TRAIN 5: LI-IX — Lithium Brine Ion Exchange Recovery (10 stages)

**Site:** SITE-005 Salar de Atacama (Li 1850 mg/L, pH 7.1)
**Key corrections:** R3 (COAG_FLOC + SETTLING + MM_FILTER pre-treatment), R4 (energy 10–60 kWh/m³), AF1 (>90% Li recovery over multiple regen cycles, not single-pass)
**Special:** IX regeneration cycle animation is MANDATORY for this train (Phase 1 requirement)

**Stage sequence and chemistry:**

| Stage # | Stage ID | Display Label | Reagent(s) | Chemistry | Products | Sludge? |
|---------|----------|--------------|------------|-----------|----------|---------|
| 1 | INTAKE | Brine Intake | — | High-TDS lithium brine; Li⁺ 1850 mg/L; also contains Mg²⁺, Na⁺, K⁺, Ca²⁺, Cl⁻, SO₄²⁻; pH 7.1; TSS present from evaporation pond | Untreated brine | — |
| 2 | COAG_FLOC | Coagulation/Flocculation [R3] | Al₂(SO₄)₃ or FeCl₃ + polymer flocculant | Coagulant destabilises suspended colloidal solids; polymer bridges floc; TSS removed before resin contact to prevent fouling; pH-neutral addition | Flocculated brine | — |
| 3 | SETTLING | Gravity Settling [R3] | — | Flocculated solids settle under gravity; clarified brine decants; residence time 1–2 hours | Clarified brine; sludge: floc + TSS | ✓ Non-radioactive |
| 4 | MM_FILTER | Multi-Media Filter [R3] | — | Sand/anthracite/garnet filter; polishes TSS to protect IX resin below fouling threshold; critical — IX resin irreversibly fouled by solids above ~5 NTU | Filtered brine; TSS < 5 NTU | — |
| 5 | LI_IX_LOAD | Li Ion Exchange — Loading | — (selective IX resin) | Selective Li⁺ IX resin (Mn-oxide based or LISICON-type sorbent); Li⁺ adsorbs preferentially onto resin; Mg²⁺, Na⁺, K⁺ pass through (selectivity for Li over Mg essential for brine application); resin loading % displayed as fill level rising from 0 to 85% | Li-depleted brine effluent (Mg/Na/K present); Li adsorbed on resin | — |
| 6 | IX_REGEN | IX Regeneration Cycle [MANDATORY] | HCl eluent (dilute) or water rinse depending on resin type | Triggered at resin_loading > 85%; HCl eluent contacts resin, displacing Li⁺ into Li-rich eluate; flow direction REVERSES (backwash); bypass route activates for feed water; "REGEN CYCLE" label flashes; ~30 second cycle. AF1: recovery target >90% Li over multiple regen cycles — not single-pass efficiency claim. Resin regenerates → loading % resets to 0%. | Li-rich eluate (HCl + LiCl); regenerated resin | — |
| 7 | ELUENT_PROCESS | Eluent Processing / Li Recovery | Evaporation + crystallisation reagents (Na₂CO₃ or NaOH) | Li-rich eluate concentrated; Li₂CO₃ or LiOH precipitated by carbonate addition or evaporative crystallisation; product stream to Li product handling; R4 energy: 10–60 kWh/m³ (distinct from precipitation trains 0.5–5.0 kWh/m³) | Li₂CO₃ or LiOH product crystals (white); depleted eluate | ✓ Non-radioactive (floc from brine pre-treatment) |
| 8 | PH_FINAL | Final pH Correction | CO₂ or HCl (minimal) | Permeate stream (non-Li brine) pH adjustment to 6.5–8.5 for discharge | Discharge-ready permeate | — |
| 9 | SLUDGE_HANDLING | Sludge Handling | — | Flocculation sludge from stages 2–3; non-radioactive; may contain Mg/Ca precipitates; licensed disposal | — | — |
| 10 | OUTPUT | Clean Water / Li Product | — | Two output streams: (1) treated permeate for discharge; (2) Li₂CO₃ or LiOH product crystals. Recovery displayed as % of inlet Li₁ recovered as product (target >90%, AF1) | Treated water + Li product | — |

**LI-IX chemistry test cases:**

| Test ID | Chemistry Test | Pass Condition |
|---------|----------------|----------------|
| CC-5A-LX-01 | Stages 2 (COAG_FLOC) + 3 (SETTLING) + 4 (MM_FILTER) all present in sequence BEFORE stage 5 (IX) [R3] | Pre-treatment sequence mandatory to protect resin |
| CC-5A-LX-02 | Stage 5 (LI_IX_LOAD) shows resin loading fill level rising from 0% to 85% | Visual representation of resin capacity usage |
| CC-5A-LX-03 | Stage 6 (IX_REGEN) triggers at >85% loading; flow direction reverses in IX column; bypass route appears | Mandatory regen cycle visual; flow reversal is the key animation |
| CC-5A-LX-04 | IX_REGEN label shows "REGEN CYCLE" flashing during cycle; resin fill resets to 0% on completion | Regen cycle must be visually unambiguous |
| CC-5A-LX-05 | Stage 7 (ELUENT_PROCESS) energy label shows 10–60 kWh/m³ range [R4] | Distinct energy range from precipitation trains; not 0.5–5.0 kWh/m³ |
| CC-5A-LX-06 | Stage 10 (OUTPUT) shows TWO streams: treated water + Li product | LI-IX is a recovery process, not purely remediation — product stream is the value output |
| CC-5A-LX-07 | AF1: recovery display reads ">90% over multiple regen cycles" — NOT "90% per pass" | Single-pass efficiency claim is incorrect per Gate 1 AF1 |
| CC-5A-LX-08 | No precipitation stages in LI-IX (no clarifier labelled for metal hydroxide removal) | Li recovery is IX-based, not precipitation-based |
| CC-5A-LX-09 | No Ra-226 stages, no ☢ sludge labels | Li brine — no radionuclide treatment |
| CC-5A-LX-10 | 10 stages total | Full train rendered |

---

### Cross-Train Chemistry Tests

| Test ID | Chemistry Test | Pass Condition |
|---------|----------------|----------------|
| CC-5A-XT-01 | Every precipitation stage in EVERY train is immediately followed by a solids-liquid separation stage (clarifier or filter press) | Non-negotiable process rule: precipitate must be separated before next chemical stage |
| CC-5A-XT-02 | Ra-226 sludge is ☢ RADIOACTIVE in ALL trains where it appears (HM-FULL stage 11, RAD-COPREC stages 8/9) | Any (Ba,Ra)SO₄ sludge = radioactive waste — no exceptions |
| CC-5A-XT-03 | No train shows Ra-226 stages for sites with ra226_BqL = 0.0 (SITE-001, SITE-004, SITE-008, SITE-009, SITE-010) | Stages present but dimmed, OR stage opacity = 0 for non-radioactive sites |
| CC-5A-XT-04 | Particle colours change direction is always contaminated → clean — never reverse | Chemistry is progressive remediation — particles cannot "un-treat" as they move right |
| CC-5A-XT-05 | IX stages appear ONLY in LI-IX train for Phase 5 | IX is not part of HM-FULL, RAD-COPREC, NI-PRECIP, or PB-AS-COPREC in Phase 3 data |
| CC-5A-XT-06 | Phase 2 animation spec particle color table correctly maps: after every clarifier, particle becomes "cleaner" (lower contamination colour); after IX loading, particle becomes slightly cleaner; after final pH correction, particle → teal | Directional colour logic confirmed chemically accurate |
| CC-5A-XT-07 | HM-FULL Ra-226 stages (9–11) are ACTIVE for SITE-007 (ra226=3.1) and DIMMED for SITE-001 (ra226=0.0) | Same train, site-specific stage activation |

---

### Chemistry Advisor Verdict Criteria

**APPROVED:** All five train architectures correctly sequenced, all chemistry accurate at every stage, all mandatory separations present, Gate 1 corrections (R1/R2/R3/R4/AF1/AF2/AF3) represented visually, sludge radioactive flags correct, particle colour logic chemically defensible.

**APPROVED WITH CORRECTIONS:** Specific stage errors listed — incorporated before code.

**REJECTED — REBUILD:** Incorrect stage sequence, missing mandatory separation, wrong reagent, or particle colour logic that misrepresents the chemistry.

---
---

## PART 2 — BUILD AGENT SOFTWARE TEST SPECIFICATION

### Module 5-A Scope

**Component:** `ProcessFlow` — React component, SVG-based, sits as an overlay panel on the main app.
**Files to create:**
- `src/components/process/ProcessFlow.jsx` — main component
- `src/components/process/trainConfigs.js` — stage definitions for all 5 trains
- `src/components/process/particleEngine.js` — particle pool logic (pure JS, no React)

**Key constraints from Phase 2 animation spec:**
- MAX_PARTICLES = 500 (hard cap; never exceeded at any time)
- Particle pool pre-allocated on component mount; never created during animation
- Animation via `requestAnimationFrame` (stored in ref, cancelled on unmount) OR
  `setInterval` at 16ms (cleared on unmount) — spec allows either; RAF preferred for sync with browser paint
- No chemistry computed here — all values from `selectedSite` prop

---

### ST-5A-01: Train Configuration Tests

| Test ID | Test | Pass Condition | Fail Condition |
|---------|------|----------------|----------------|
| ST-5A-01a | `trainConfigs.js` exports a config object for each of the 5 train IDs | `TRAIN_CONFIGS['HM-FULL']`, `['RAD-COPREC']`, `['NI-PRECIP']`, `['PB-AS-COPREC']`, `['LI-IX']` all present | Missing train ID — unknown treatment_train crashes ProcessFlow |
| ST-5A-01b | Each train config contains a `stages[]` array with correct stage count | HM-FULL: 15, RAD-COPREC: 11, NI-PRECIP: 7, PB-AS-COPREC: 8, LI-IX: 10 | Wrong count — chemistry spec violated |
| ST-5A-01c | Each stage object has: `id`, `label`, `reagent`, `sludgeGenerating`, `sludgeRadioactive`, `conditional`, `colorIn`, `colorOut` | All fields present on every stage object | Missing fields — ProcessFlow cannot render stage correctly |
| ST-5A-01d | `conditional: true` stages are: RA_COPREC, RA_FILTER_PRESS, RA_POLISH in trains where site may have ra226=0 | Conditional stages rendered dimmed when `!site.isRadioactiveSite` or when `ra226_BqL ≤ 5.0` for RA_POLISH | Conditional stage always active or always hidden |
| ST-5A-01e | `sludgeRadioactive: true` ONLY on stages: HM-FULL RA_FILTER_PRESS; RAD-COPREC RA_FILTER_PRESS and RA_POLISH | Radioactive sludge flag matches chemistry exactly | Non-radioactive sludge stage marked ☢, or radioactive stage not marked |
| ST-5A-01f | Train config for an unknown `treatment_train` value: `ProcessFlow` renders placeholder "Unknown treatment train" | Graceful degradation — does not crash | Exception thrown on unknown train |

---

### ST-5A-02: Stage Rendering Tests

| Test ID | Test | Pass Condition | Fail Condition |
|---------|------|----------------|----------------|
| ST-5A-02a | Each stage rendered as SVG `<rect>` with label; stages laid out left-to-right in array order | Visual order matches stage array index | Stages rendered out of order |
| ST-5A-02b | Conditional Ra-226 stages render at 30% opacity when `!site.isRadioactiveSite` | Dimmed but present — schematic shows full train architecture | Hidden entirely (wrong) or full opacity (wrong) |
| ST-5A-02c | RA_POLISH stage renders at 30% opacity for SITE-006 (ra226=4.2 ≤ 5.0), full opacity for SITE-002 (ra226=6.8 > 5.0) | `ra226_requires_polishing_stage` from advisorFormat drives stage opacity | Polishing stage always active or always dimmed |
| ST-5A-02d | Each sludge-generating stage has a downward SVG pipe connecting to sludge stream | Visual sludge outlet present for every `sludgeGenerating: true` stage | Sludge outlet absent — process incorrectly implies no waste |
| ST-5A-02e | Radioactive sludge streams render in MAGENTA (#FF00FF) with "☢ RADIOACTIVE WASTE" text | Visual distinction from non-radioactive sludge (dark brown) | ☢ stages show wrong colour, or label absent |
| ST-5A-02f | Non-radioactive sludge streams render in dark brown #3D1C02 | Correct sludge colour for non-radioactive streams | Non-radioactive sludge magenta (false alarm) |
| ST-5A-02g | Reagent injection shown on stages with `reagent !== null` — small annotation or indicator | FE_DOSE, PH_UP, BA_DOSE, etc. show reagent label or icon | Reagent addition visually invisible |
| ST-5A-02h | AF2 alert indicator present at NI-PRECIP stage 3; shown in ALERT colour (amber/orange); tooltip: "pH floor 9.2 — Ni(OH)₂ re-dissolution risk" | AF2 is visually present in schematic | AF2 alert absent |
| ST-5A-02i | IX column in LI-IX shows fill level indicator (0–100% resin loading) | Fill level rises during loading phase | Fill level static |

---

### ST-5A-03: Particle Pool Tests

| Test ID | Test | Pass Condition | Fail Condition |
|---------|------|----------------|----------------|
| ST-5A-03a | Particle pool created on mount: exactly `MAX_PARTICLES` (500) SVG circle elements allocated, all initially hidden | `svgParticles.length === 500`; all `visibility: hidden` | Pool not pre-allocated; particles created dynamically |
| ST-5A-03b | `particleEngine.spawnParticle()` marks a hidden particle visible; never creates a new SVG element | DOM particle count constant after spawn calls | New `<circle>` elements created after mount |
| ST-5A-03c | Active particle count never exceeds `MAX_PARTICLES` at any time | `activeCount ≤ 500`; `spawnParticle()` returns null if pool exhausted | Particles created beyond cap; DOM grows unboundedly |
| ST-5A-03d | On train switch: all particles hidden, positions reset, active count reset to 0 before new train initialises | Clean particle state on every site switch | Old train particles visible briefly during new train render |
| ST-5A-03e | 100 site switches: active SVG circle count equals initial pool count (500 pre-allocated, same 500 circles reused) | SVG DOM particle count constant at 500 throughout | DOM circle count grows with each switch |
| ST-5A-03f | `particleEngine.releaseParticle(p)` hides the particle and decrements active count | Particle returned to pool correctly | Released particles remain visible or active count drifts |

---

### ST-5A-04: Particle Movement and Colour Tests

| Test ID | Test | Pass Condition | Fail Condition |
|---------|------|----------------|----------------|
| ST-5A-04a | Particles enter from left (INTAKE stage) and exit at right (OUTPUT stage); continuous flow | Particle positions range from x=intake.left to x=output.right | Particles spawn outside valid x range |
| ST-5A-04b | Particle colour interpolates from stage `colorIn` to stage `colorOut` as particle traverses each stage | Colour is a function of particle's position within the stage bounds | Colour jumps abruptly at stage entry rather than interpolating |
| ST-5A-04c | After passing through a clarifier stage: subset of particles exit downward (sludge stream), remainder continue rightward | Sludge fraction: approximately 10–20% of particles at each clarifier | 100% continue right (no sludge animation) or 100% drop (no effluent) |
| ST-5A-04d | Sludge stream particles adopt sludge colour (dark brown or magenta) when exiting downward | Sludge particle colour matches `sludgeRadioactive` flag | Sludge particles retain inlet colour |
| ST-5A-04e | Particle speed in pipe segments proportional to `selectedSite.flow_rate_nominal_Ls` | Athabasca (285 L/s) slower than Ok Tedi (480 L/s) | All sites animate at same speed regardless of flow rate |
| ST-5A-04f | Particle slows (25% speed) inside stage reaction box to simulate residence time | Visible pause in stage box vs. pipe segment | Particles pass through stages at same speed as pipes |
| ST-5A-04g | Final OUTPUT particles are teal (#00CED1) — treatment complete | Colour at output end matches treated water colour | Output particles still contaminated colour |

---

### ST-5A-05: IX Regeneration Cycle Tests (LI-IX only)

| Test ID | Test | Pass Condition | Fail Condition |
|---------|------|----------------|----------------|
| ST-5A-05a | IX resin fill level starts at 0% on site selection; rises toward 100% during animation | Fill indicator animates upward over time | Fill static at 0% or static at any other value |
| ST-5A-05b | Regeneration cycle triggers when fill level exceeds 85% | Regen begins at 85%, not 80% or 90% | Regen never triggers, or triggers at wrong threshold |
| ST-5A-05c | During regen: particles in IX section reverse horizontal direction | `velocityX *= -1` for particles in IX column bounds | Particles continue forward flow during regen |
| ST-5A-05d | During regen: bypass route activates — particles skip IX column via dashed bypass path | Bypass path becomes visible and particle stream diverts | Feed water halts during regen (wrong — bypass maintains flow) |
| ST-5A-05e | During regen: "REGEN CYCLE" label visible and flashing at IX stage | Label present with CSS animation | Label absent or static |
| ST-5A-05f | During regen: IX column box colour transitions to brown-amber (eluent colour) | Colour shift distinct from loading phase | Column colour unchanged during regen |
| ST-5A-05g | Regen cycle lasts approximately 30 seconds of animation time; fill level resets to 0% on completion | Cycle duration 28–32 seconds; fill resets exactly to 0% | Cycle duration wrong; fill does not reset |
| ST-5A-05h | After regen completion: normal forward flow resumes; bypass deactivates; IX fill begins rising again | Seamless cycle restart | Flow does not resume; bypass remains active |

---

### ST-5A-06: Site Switch and State Management Tests

| Test ID | Test | Pass Condition | Fail Condition |
|---------|------|----------------|----------------|
| ST-5A-06a | Switching from SITE-001 (HM-FULL) to SITE-003 (NI-PRECIP): schematic completely rebuilds — 15-stage layout replaced by 7-stage layout | Stage count changes; old stage SVG groups removed; new ones rendered | Old stages persist; layout broken |
| ST-5A-06b | Switching to same train type (e.g., SITE-002 → SITE-006, both RAD-COPREC): stages update with new site's chemistry values; RA_POLISH activates/deactivates | Stage conditional states update; RA_POLISH active for SITE-002, dimmed for SITE-006 | Conditional stages do not update on same-train site switch |
| ST-5A-06c | `selectedSite === null` (deselect): ProcessFlow renders "SELECT A SITE" placeholder; no stages, no particles | Clean empty state | Previous site's schematic remains visible |
| ST-5A-06d | Rapid site switching (10 switches in 2 seconds): final state reflects only the last selected site | No visual fragments from intermediate sites | Ghosted stage elements from earlier sites remain |
| ST-5A-06e | 100 site switches: SVG group count equals baseline (one group per stage for the active train) | Stage group count stable; no accumulation | SVG group count grows with each switch |

---

### ST-5A-07: Animation Loop and Timing Tests

| Test ID | Test | Pass Condition | Fail Condition |
|---------|------|----------------|----------------|
| ST-5A-07a | Animation RAF loop started on mount; RAF ID stored in `useRef`; `cancelAnimationFrame` called in `useEffect` cleanup | RAF cancelled on unmount — no loop continues after component removed | RAF continues after unmount; memory leak |
| ST-5A-07b | Animation loop does not stack — only one RAF callback registered at any time | Single RAF loop runs for lifetime of component | Multiple RAF loops registered; CPU spirals |
| ST-5A-07c | `delta` passed from 3-A's RAF via `onFrame` prop is used for particle position updates (time-based, not frame-based) | Particle speed consistent regardless of frame rate | Speed tied to frame count — variable on different machines |
| ST-5A-07d | 30-minute runtime: particle count stable at pool size (500); no DOM circle element growth | `document.querySelectorAll('circle').length` stable over 30 minutes | Circle count grows — pool leak |
| ST-5A-07e | ProcessFlow animation independent of Globe RAF — ProcessFlow can render even if Globe is not animating | ProcessFlow has its own RAF; does not depend on 3-A's onBeforeRender | ProcessFlow stops animating when Globe pauses |

---

### ST-5A-08: No-Site-Selected and Null Safety Tests

| Test ID | Test | Pass Condition | Fail Condition |
|---------|------|----------------|----------------|
| ST-5A-08a | `ProcessFlow` with `selectedSite={null}`: renders placeholder, no errors | No console errors; no null reference exceptions | Crash or blank screen |
| ST-5A-08b | `selectedSite.treatment_train` not in known trains: renders "Unknown treatment train" placeholder | Graceful fallback; no crash | Exception on unknown train |
| ST-5A-08c | `selectedSite.raw_water.ra226_BqL === 0.0`: Ra-226 stages dimmed in HM-FULL (SITE-001); no radioactive sludge stream | Conditional logic handles zero value correctly | Zero treated as truthy; stages incorrectly activated |
| ST-5A-08d | Component unmounts mid-animation: RAF cancelled, SVG elements removed, no residual animation | Clean unmount | Animation continues after unmount; SVG elements orphaned |

---

### ST-5A-09: SENTINEL Memory Tests

| Test ID | Test | Pass Condition | Fail Condition |
|---------|------|----------------|----------------|
| ST-5A-09a | SVG particle pool removed from DOM on unmount | Post-unmount: 0 `<circle>` elements in SVG container | Circles remain in DOM |
| ST-5A-09b | SVG stage groups removed from DOM on unmount | Post-unmount: 0 `<g>` stage groups in SVG | Stage groups remain |
| ST-5A-09c | No `setInterval` / RAF registered after unmount | Checked via mock: interval/RAF IDs cleared to null in ref on cleanup | Stale interval fires post-unmount; `setState` on unmounted component |
| ST-5A-09d | `particleEngine` holds no references to SVG elements after pool release | Pool array cleared on reset; no closures retaining DOM element references | 500 SVG element references held in JS heap after unmount |
| ST-5A-09e | 100 site switches: JS heap size does not grow continuously (plateau expected) | Heap plateaus within first 10 switches; no sustained growth | Heap grows linearly with switch count — closure/element leak |

---

### ST-5A Test Summary

| Group | Tests | Priority |
|-------|-------|----------|
| ST-5A-01: Train configuration | 6 | Critical |
| ST-5A-02: Stage rendering | 9 | Critical |
| ST-5A-03: Particle pool | 6 | Critical (SENTINEL) |
| ST-5A-04: Particle movement + colour | 7 | High |
| ST-5A-05: IX regen cycle | 8 | Critical (mandatory Phase 1 requirement) |
| ST-5A-06: Site switch / state | 5 | High |
| ST-5A-07: Animation loop / timing | 5 | High |
| ST-5A-08: Null safety | 4 | High |
| ST-5A-09: SENTINEL memory | 5 | Critical |
| **TOTAL** | **55** | |

---

## PART 3 — INTEGRATION TEST SPECIFICATION (3-C → 5-A)

| Test ID | Test | Pass Condition |
|---------|------|----------------|
| IT-5A-01 | `selectedSite.treatment_train` correctly selects train config: 'HM-FULL' → 15-stage config, 'RAD-COPREC' → 11-stage, 'NI-PRECIP' → 7-stage, 'PB-AS-COPREC' → 8-stage, 'LI-IX' → 10-stage | Train selection exact; no default fallback masking an error |
| IT-5A-02 | `selectedSite.raw_water` inlet concentrations drive stage activation: `ra226_BqL > 0` activates Ra stages; `ra226_BqL > 5.0` activates RA_POLISH | Site chemistry data directly controls schematic stage states |
| IT-5A-03 | `selectedSite.flow_rate_nominal_Ls` drives particle speed | Flow rate from 3-C used as-is; no re-reading from raw data |
| IT-5A-04 | `selectedSite.isRadioactiveSite` flag drives radioactive sludge stream colour without re-computation | Boolean from useSelectedSite used directly; not re-derived from raw_water |
| IT-5A-05 | `selectedSite.treatment_targets` values displayed as outlet targets in stage tooltip/panel | Targets accessible at 5-A boundary without transformation |
| IT-5A-06 | `selectedSite === null` → ProcessFlow shows placeholder; no attempt to read train config | Null safety passes through correctly from 3-C |
| IT-5A-07 | Gate 2 pre-certification: the `treatment_train` field in the format produced by `buildAdvisorTelemetry` matches the train that `ProcessFlow` renders | 3-C → 5-A train contract consistent |

---

## PART 4 — CODE ARCHITECTURE NOTE

**Three files:**

**`src/components/process/trainConfigs.js`** — pure data, no React
- Exports `TRAIN_CONFIGS`: object keyed by train ID, each value is `{ stages: StageDefinition[] }`
- Each `StageDefinition`: `{ id, label, reagent, colorIn, colorOut, sludgeGenerating, sludgeRadioactive, conditional, conditionalKey }`
- `conditionalKey`: optional string — e.g., `'isRadioactiveSite'` or `'ra226_requires_polishing_stage'` — ProcessFlow resolves against selectedSite at render time
- No chemistry arithmetic; purely structural definitions

**`src/components/process/particleEngine.js`** — pure JS, no React
- `createPool(svgElement, count)` — pre-allocates circle elements, returns pool object
- `spawnParticle(pool, x, y, color)` — marks hidden circle visible, returns particle handle or null if pool full
- `releaseParticle(pool, handle)` — hides circle, decrements active count
- `resetPool(pool)` — hides all, resets active count to 0
- `destroyPool(pool)` — removes all circles from SVG DOM

**`src/components/process/ProcessFlow.jsx`** — React component
- Receives: `selectedSite` (from App via useSelectedSite)
- Reads: `selectedSite.treatment_train` → selects config from `TRAIN_CONFIGS`
- Reads: `selectedSite.raw_water`, `selectedSite.isRadioactiveSite`, `selectedSite.ra226_requires_polishing_stage` → resolves conditional stage visibility (Note: `ra226_requires_polishing_stage` comes from `buildAdvisorTelemetry`, so ProcessFlow may read directly from `selectedSite.raw_water.ra226_BqL > 5.0` since it doesn't have the advisorFormat output — this is a design decision to clarify at build time)
- RAF loop for particle animation (stored in `useRef`, cancelled on unmount)
- SVG rendered with `<svg>` in JSX; stage groups as `<g>` elements; particles via particleEngine

---

## PART 5 — PRE-BUILD CHECKLIST

- [x] Chemistry Advisor reviewed Part 1 — APPROVED WITH CORRECTIONS
- [x] C1 incorporated: RA226_POLISHING_THRESHOLD_BQL = 5.0 exported as named constant from trainConfigs.js
- [x] C2 incorporated: ProcessFlow evaluates ra226_requires_polishing from raw_water.ra226_BqL > RA226_POLISHING_THRESHOLD_BQL directly (no advisorFormat.js dependency)
- [x] Advisory noted: elevated Fe:As dosing ratio (≥3:1 Fe:As by mass) documented in HM-FULL FE_DOSE stage comment
- [x] All five train architectures certified by Chemistry Advisor
- [x] Build Agent software spec reviewed and approved by Michael
- [x] Integration test spec (Part 3) reviewed and approved
- [x] Module 3-A ✅, 3-B ✅, 3-C ✅ certified clean
- [x] Gate 2 ✅ CLOSED
- [x] CLEARED FOR BUILD

---

*PHASE5_MODULE5A_TEST_SPECS.md | PROJECT AQUA | March 12, 2026*
*Status: AWAITING REVIEW — Chemistry Advisor verdict + Michael approval required before build*
