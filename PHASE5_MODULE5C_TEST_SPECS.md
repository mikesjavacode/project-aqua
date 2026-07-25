# PROJECT AQUA — PHASE 5, MODULE 5-C TEST SPECIFICATIONS
## Telemetry Engine — Live Chemistry Simulation

**Date:** March 12, 2026
**Module:** 5-C — Telemetry Engine (Layer 4)
**Status:** AWAITING CHEMISTRY ADVISOR REVIEW — do not build until APPROVED
**Depends on:** Module 3-C (selectedSite), sites.js C5 additions (this spec defines those additions)

---

## PREAMBLE — WHAT MODULE 5-C IS

Module 5-C is the chemistry computation module. All other layers display data; this layer
generates it. It runs continuously once a site is selected, producing a `TelemetryState`
object that ticks every 500ms. This state drives Layer 4 telemetry gauges, the AI Advisor
(Layer 5), and the AF2 pH alert on the ProcessFlow schematic.

**What 5-C computes:**
- pH at inlet, reaction chamber, and outlet (with realistic operational noise)
- Outlet contaminant concentrations (after treatment, near-target with variation)
- Treatment efficiency percentages per active contaminant
- Flow rate (nominal ± operational variation)
- Turbidity at inlet and outlet (outlet near permit limit)
- Reagent dose rates (from C5 site data)
- Sludge generation rates (computed and displayed)
- IX resin loading % (LI-IX only — mirrors ProcessFlow animation state)
- Radioactive sludge rate kg/day (SITE-002/006/007)
- AF2 alert status (Ni pH floor violation)

**What 5-C does NOT do:**
- No mass balance closure (Gate 3, Phase 8)
- No reagent stock tracking
- No alarm acknowledgement logic

---

## PART 1 — CHEMISTRY ADVISOR TEST SPECIFICATION

### Chemistry Advisor System Prompt

```
You are a PhD-level industrial water treatment and hydrometallurgy chemist with
20+ years of experience in precipitation chemistry, ion exchange, radioactive
wastewater treatment, and environmental compliance.

Module 5-C is the telemetry simulation engine for PROJECT AQUA. Your role is to certify:

1. C5 field values (reagent dose rates, sludge generation rates, HRT) for all 10 sites
   are stoichiometrically defensible — each value must be traceable to a chemical equation
   or established engineering practice.

2. pH simulation methodology is physically plausible — the simulated pH profile at each
   stage follows actual treatment chemistry.

3. Ni(OH)₂ re-dissolution trigger (AF2) fires at the correct pH threshold and for the
   correct treatment trains.

4. Radioactive sludge rates for SITE-002/006/007 correctly represent (Ba,Ra)SO₄ mass
   from BaCl₂ co-precipitation, keyed to actual flow rates and BaCl₂ dose.

5. Contaminant outlet values approach but do not trivially equal treatment targets —
   realistic operational scatter is chemically honest.

Approach this as Craig Gagnon reviewing process design documents that will back an
AI system making real-time treatment assessments. Find every physically impossible
claim, every unit inconsistency, every stoichiometric error.

Issue verdict: APPROVED / APPROVED WITH CORRECTIONS / REJECTED — REBUILD
```

---

## PART 2 — C5 FIELD SCHEMA

These fields are added to each site in `AQUA_SITES_RAW` (sites.js). Module 5-C reads
them; they are not computed by 5-C itself. This prevents re-computation of static
site engineering parameters on every telemetry tick.

```js
// Per-site C5 additions to AQUA_SITES_RAW entries:
reagent_dose_rates: {
  Ca_OH_2_mgL:    number,  // lime for pH elevation + acid neutralisation
  FeCl3_mgL:      number,  // FeCl₃ for As co-precipitation (0 if no As)
  BaCl2_mgL:      number,  // BaCl₂ total for all Ra stages (0 if no Ra)
  CO2_mgL:        number,  // CO₂ total across all pH correction stages
  Al2SO4_mgL:     number,  // alum for LI-IX COAG_FLOC (0 otherwise)
  HCl_eluent_mgL: number,  // HCl IX regen dose, cycle-averaged in feed equiv. (0 otherwise)
},
sludge_generation_rate_kgPerDay: {
  nonradioactive_kgDay: number,  // Ni(OH)₂ + Pb(OH)₂ + Fe(OH)₃ + co-prec. metals
  radioactive_kgDay:    number,  // (Ba,Ra)SO₄ mass; 0 for non-radioactive sites
},
hrt_min: {
  [stageId]: number,  // keyed by stage ID from trainConfigs.js; absent = not applicable
},
```

---

## PART 3 — STOICHIOMETRIC BASIS FOR C5 VALUES

### Reference Equations

All sludge and reagent calculations use the following molar masses (g/mol):
Ni=58.7, Ca(OH)₂=74.1, Ni(OH)₂=92.7, Pb=207.2, Pb(OH)₂=241.2,
Fe=55.8, FeCl₃=162.2, Fe(OH)₃=106.9, Ba=137.3, BaCl₂=208.2, BaSO₄=233.4,
Al=27.0, Al₂(SO₄)₃=342.2, Al(OH)₃=78.0.

**Ni(OH)₂ precipitation (pH 9.5–10.5):**
Ni²⁺ + Ca(OH)₂ → Ni(OH)₂↓ + Ca²⁺
Ca(OH)₂/Ni stoichiometric = 74.1/58.7 = 1.263 g/g.
Practical dose at 1.7× excess: **2.15 g Ca(OH)₂ per g Ni** (accounts for excess OH⁻
needed to maintain pH 9.5–10.5 against CO₂ absorption and buffering losses).
Sludge yield: 92.7/58.7 = **1.580 g Ni(OH)₂ per g Ni**.

**Pb(OH)₂ precipitation (supplementary, pH >9):**
Pb²⁺ + Ca(OH)₂ → Pb(OH)₂↓ + Ca²⁺
Stoich = 74.1/207.2 = 0.358 g/g; practical at 1.5×: **0.537 g Ca(OH)₂ per g Pb**.
Sludge: 241.2/207.2 = **1.164 g Pb(OH)₂ per g Pb**.

Note (R2): In HM-FULL and PB-AS-COPREC, Pb removal is dominated by Fe floc
adsorption, not Pb(OH)₂ precipitation. Pb mass enters sludge via floc at pH 6–7;
Ca(OH)₂ dose is not the controlling reagent for Pb at those trains.

**Fe(OH)₃ co-precipitation for As (Fe:As = 3:1 by mass, Advisory):**
FeCl₃ + 3H₂O → Fe(OH)₃↓ + 3HCl
FeCl₃ dose = 3 × (162.2/55.8) = **8.72 g FeCl₃ per g As** (at 3:1 Fe:As by mass).
Fe(OH)₃ yield = 3 × 1.916 = 5.75 g Fe(OH)₃ per g As. Plus co-precipitated As (95%
removal assumed): total sludge ≈ 5.75 + 0.95 = **6.70 g dry sludge per g As**.

**BaSO₄ co-precipitation for Ra-226:**
BaCl₂ (aq) + SO₄²⁻ (from mine water) → BaSO₄↓; Ra²⁺ isomorphically substitutes
into BaSO₄ lattice → (Ba,Ra)SO₄ radioactive waste.
BaCl₂ dose: empirical **2.0 mg/L** (standard for Ra-226 co-precipitation plants).
Polishing stage (RA_POLISH, active when ra226 > 5.0 Bq/L): additional **1.0 mg/L** BaCl₂.
BaSO₄ yield: 233.4/208.2 = **1.121 g BaSO₄ per g BaCl₂**.
At 2.0 mg BaCl₂/L → **2.24 mg/L BaSO₄** (= radioactive sludge per litre treated).

**Al(OH)₃ from alum coagulation (LI-IX COAG_FLOC, R3):**
Al₂(SO₄)₃ → 2Al³⁺ + 3SO₄²⁻; Al³⁺ + 3OH⁻ → Al(OH)₃↓
At 100 mg/L Al₂(SO₄)₃: Al mass = 100 × (54/342.2) = 15.8 mg Al/L.
Al(OH)₃ sludge: 15.8 × (78/27) = **45.6 mg/L Al(OH)₃**.

**Ca(OH)₂ for acid neutralisation — engineering estimates:**
Ca(OH)₂ dose for pH elevation in mine drainage includes both the stoichiometric
metal precipitation component and the acid-neutralisation buffering load
(dissolved CO₂, H₂SO₄, HSO₄⁻, metal complexes). Engineering values below are
derived from the Limestone/Lime-Soda process literature for each feed pH:

| Feed pH | Target pH | Ca(OH)₂ estimate | Basis |
|---------|-----------|-------------------|-------|
| 2.9     | 6.5       | 700 mg/L          | Very high sulphate AMD; buffering-dominated |
| 3.2     | 9.5       | 630 mg/L          | AMD + Ni component = 22×1.263×1.7 = 47.2 mg/L (C1) |
| 3.8     | 10.5      | 550 mg/L          | Ni smelter effluent; Ni component = 87×1.263×1.7 = 187 mg/L (C1) |
| 4.1     | 6.5       | 300 mg/L          | Moderate AMD |
| 4.2     | 9.5       | 400 mg/L          | Hard rock mine + Ni component = 48×1.263×1.7 = 103 mg/L |
| 4.5     | 6.5       | 160 mg/L          | Mild AMD, R2 pH floor 6.0 |
| 4.6     | 10.5      | 440 mg/L          | Process water + Ni component = 35×1.263×1.7 = 75.1 mg/L (C1) |
| 5.1     | 7.0       | —                 | RAD-COPREC: no lime, As co-prec. at natural pH |
| 6.1     | 7.5       | —                 | Nuclear process water: pH within range, no lime |
| 7.1     | 7.0       | —                 | Li brine: no pH adjustment needed |

**CO₂ for pH correction:**
CO₂ dose to neutralise excess OH⁻ varies with the pH drop required.
Empirical range: 180–250 mg CO₂/L for pH 10.5→7.5; 120–180 mg/L for 9.5→7.5.
Final-stage fine-tuning (pH already near target): 15–30 mg CO₂/L.

---

## PART 4 — C5 VALUES: ALL 10 SITES

Flow conversions: L/s × 86,400 s/day ÷ 1,000 L/m³ = m³/day.

---

### SITE-001 — Sudbury Basin Ni-Mine Drainage (HM-FULL)
Flow: 310 L/s = **26,784 m³/day**
Inlet: Ni=48.0, As=0.85, Pb=0.12 mg/L; pH=4.2; Ra=0 (not radioactive)

**Reagent dose rates:**
| Reagent | Stage | Calculation | Dose (mg/L) |
|---------|-------|-------------|-------------|
| Ca(OH)₂ | PH_UP | pH 4.2→9.5 incl. acid neutralisation + Ni/Pb stoich | 400 |
| FeCl₃ | FE_DOSE | 0.85 × 8.72 (Fe:As=3:1) | 7.4 |
| CO₂ | PH_CORRECT_RA | pH 9.5→7.5 (R1 stage, always present in HM-FULL) | 200 |
| CO₂ | PH_FINAL | Fine-tune to 7.5 target | 20 |

sites.js: `Ca_OH_2_mgL: 400, FeCl3_mgL: 7.4, BaCl2_mgL: 0, CO2_mgL: 220, Al2SO4_mgL: 0, HCl_eluent_mgL: 0`

**Sludge generation:**
| Stream | Calculation | kg/day |
|--------|-------------|--------|
| Ni(OH)₂ (NI_CLARIFIER) | 48.0 × 26,784 × 10⁻³ × 1.580 | 2,030 |
| Pb(OH)₂ (NI_CLARIFIER) | 0.12 × 26,784 × 10⁻³ × 1.164 | 3.7 |
| Fe(OH)₃ (AS_PB_CLARIFIER) | 0.85 × 3 × 26,784 × 10⁻³ × 1.916 | 131 |
| As in sludge | 0.85 × 0.95 × 26.784 | 21.6 |
| **Non-radioactive total** | | **2,190** |
| Radioactive (Ba,Ra)SO₄ | None — not radioactive | **0** |

sites.js: `nonradioactive_kgDay: 2190, radioactive_kgDay: 0`

**HRT by stage (min):**
```
INTAKE: 2, PH_UP: 15, NI_PRECIP: 30, NI_CLARIFIER: 150,
FE_DOSE: 5, AS_PB_COPREC: 30, AS_PB_CLARIFIER: 120,
PH_CORRECT_RA: 15, PH_FINAL: 15, MM_FILTER: 20
```
(BA_DOSE / RA_COPREC / RA_FILTER_PRESS absent — not radioactive)
Total system HRT: **402 min (6.7 hours)**

---

### SITE-002 — Athabasca Uranium Legacy (RAD-COPREC) ☢
Flow: 285 L/s = **24,624 m³/day**
Inlet: Ra-226=6.8 Bq/L, As=0.62, Pb=0.04 mg/L; pH=5.1
RA_POLISH **ACTIVE** (6.8 > 5.0 Bq/L threshold)

**Reagent dose rates:**
| Reagent | Stage | Calculation | Dose (mg/L) |
|---------|-------|-------------|-------------|
| FeCl₃ | FE_DOSE | 0.62 × 8.72 | 5.4 |
| BaCl₂ | BA_DOSE | Standard Ra co-precipitation dose | 2.0 |
| BaCl₂ | RA_POLISH | Additional polishing dose (ra226>5.0) | 1.0 |
| CO₂ | PH_FINAL | pH already ~6.5 after clarifier; minor correction | 30 |

Note: No Ca(OH)₂. Feed at pH 5.1 is treated at near-natural pH for As/Fe co-precipitation.
After the AS_CLARIFIER, pH 6–7 is ideal for Ra co-precipitation — no alkalisation needed.
This is the chemistry distinction between RAD-COPREC and HM-FULL (R1 in HM-FULL corrects
pH DOWN before Ba dosing; RAD-COPREC feed is naturally in range).

sites.js: `Ca_OH_2_mgL: 0, FeCl3_mgL: 5.4, BaCl2_mgL: 3.0, CO2_mgL: 30, Al2SO4_mgL: 0, HCl_eluent_mgL: 0`

**Sludge generation:**
| Stream | Calculation | kg/day |
|--------|-------------|--------|
| Fe(OH)₃ (AS_CLARIFIER) | 0.62 × 3 × 24,624 × 10⁻³ × 1.916 | 87.7 |
| As in sludge | 0.62 × 0.95 × 24.624 | 14.5 |
| Pb in floc | 0.04 × 0.99 × 24.624 | 1.0 |
| **Non-radioactive total** | | **103** |
| (Ba,Ra)SO₄ — BA_DOSE | 2.0 mg/L × 1.121 × 24,624 × 10⁻³ | 55.2 |
| (Ba,Ra)SO₄ — RA_POLISH | 1.0 mg/L × 1.121 × 24,624 × 10⁻³ | 27.6 |
| **Radioactive total** ☢ | | **83** |

sites.js: `nonradioactive_kgDay: 103, radioactive_kgDay: 83`

**HRT by stage (min):**
```
INTAKE: 2, FE_DOSE: 5, AS_COPREC: 30, AS_CLARIFIER: 90,
PH_VERIFY: 10, BA_DOSE: 10, RA_COPREC: 25, RA_FILTER_PRESS: 60,
RA_POLISH: 30, PH_FINAL: 15
```
(RA_COPREC HRT = 25 min — above 20 min minimum given 6.8 Bq/L high Ra loading)
Total system HRT: **277 min (4.6 hours)**

---

### SITE-003 — Norilsk Ni Smelter Effluent (NI-PRECIP)
Flow: 420 L/s = **36,288 m³/day**
Inlet: Ni=87.0, Pb=2.1 mg/L; pH=3.8; no As, no Ra

**Reagent dose rates:**
| Reagent | Stage | Calculation | Dose (mg/L) |
|---------|-------|-------------|-------------|
| Ca(OH)₂ | PH_UP | pH 3.8→10.5; Ni component = 87.0×1.263×1.7 = 187; acid neut. ≈ 363 (C1) | 550 |
| CO₂ | PH_FINAL | pH 10.5→7.5: large correction, high residual alkalinity | 250 |

sites.js: `Ca_OH_2_mgL: 550, FeCl3_mgL: 0, BaCl2_mgL: 0, CO2_mgL: 250, Al2SO4_mgL: 0, HCl_eluent_mgL: 0`

**Sludge generation:**
| Stream | Calculation | kg/day |
|--------|-------------|--------|
| Ni(OH)₂ (NI_CLARIFIER) | 87.0 × 36,288 × 10⁻³ × 1.580 | 4,990 |
| Pb(OH)₂ (NI_CLARIFIER) | 2.1 × 36,288 × 10⁻³ × 1.164 | 88.7 |
| **Non-radioactive total** | | **5,080** |
| Radioactive | None | **0** |

Note: SITE-003 is the highest sludge-generating site in the network. 87 mg/L Ni at
420 L/s is an extreme industrial load. 5,080 kg/day Ni(OH)₂ sludge is consistent with
reported outputs from large Ni smelter WWT facilities in the Kola peninsula literature.

sites.js: `nonradioactive_kgDay: 5080, radioactive_kgDay: 0`

**HRT by stage (min):**
```
INTAKE: 2, PH_UP: 15, NI_PRECIP: 35, NI_CLARIFIER: 180, PH_FINAL: 15
```
(NI_PRECIP HRT = 35 min — above 30 min minimum given 87 mg/L extreme load;
NI_CLARIFIER HRT = 180 min — extended settling time for very high solids loading)
Total system HRT: **247 min (4.1 hours)**

---

### SITE-004 — Zambian Copperbelt As/Pb Discharge (PB-AS-COPREC)
Flow: 265 L/s = **22,896 m³/day**
Inlet: As=1.45, Pb=3.2 mg/L; pH=4.5; no Ni, no Ra

**Reagent dose rates:**
| Reagent | Stage | Calculation | Dose (mg/L) |
|---------|-------|-------------|-------------|
| Ca(OH)₂ | PH_ADJUST | pH 4.5→6.5 (R2: floor 6.0); moderate neutralisation | 160 |
| FeCl₃ | FE_DOSE | 1.45 × 8.72 | 12.6 |
| CO₂ | PH_FINAL | pH 6.5→7.2 target; minor correction | 20 |

Note on Pb removal (R2): At pH 6.5, Pb removal is dominated by Fe(OH)₃ floc adsorption.
Ca(OH)₂ is dosed to bring pH to 6.5 for Fe(OH)₃ floc formation and Pb adsorption — not
to precipitate Pb(OH)₂ (which requires pH >9). Ca(OH)₂ dose here is acid-neutralisation
dominated, not Pb stoichiometry.

sites.js: `Ca_OH_2_mgL: 160, FeCl3_mgL: 12.6, BaCl2_mgL: 0, CO2_mgL: 20, Al2SO4_mgL: 0, HCl_eluent_mgL: 0`

**Sludge generation:**
| Stream | Calculation | kg/day |
|--------|-------------|--------|
| Fe(OH)₃ (AS_PB_CLARIFIER) | 1.45 × 3 × 22,896 × 10⁻³ × 1.916 | 191 |
| As in sludge | 1.45 × 0.95 × 22.896 | 31.5 |
| Pb in floc (Fe adsorption) | 3.2 × 0.997 × 22.896 | 73.0 |
| **Non-radioactive total** | | **296** |
| Radioactive | None | **0** |

sites.js: `nonradioactive_kgDay: 296, radioactive_kgDay: 0`

**HRT by stage (min):**
```
INTAKE: 2, PH_ADJUST: 15, FE_DOSE: 5, AS_PB_COPREC: 30, AS_PB_CLARIFIER: 120, PH_FINAL: 15
```
Total system HRT: **187 min (3.1 hours)**

---

### SITE-005 — Salar de Atacama Li Recovery (LI-IX)
Flow: 195 L/s = **16,848 m³/day**
Inlet: Li=1,850 mg/L; pH=7.1; no heavy metals, no Ra

**Reagent dose rates:**
| Reagent | Stage | Calculation | Dose (mg/L) |
|---------|-------|-------------|-------------|
| Al₂(SO₄)₃ | COAG_FLOC | R3: standard brine pre-treatment dose | 100 |
| HCl eluent | IX_REGEN | Cycle-averaged equivalent in feed volume; HCl elutes Li⁺ from resin | 180 |
| CO₂ | PH_FINAL | Permeate pH correction; pH 7.1 near target | 15 |

Note on HCl dose: IX_REGEN uses concentrated HCl solution (~5–10% w/v) to strip Li⁺
from resin. Expressed as feed-equivalent: 180 mg/L is the cycle-averaged HCl
consumption per litre of feed water processed, accounting for regen cycle duration
(30 min) relative to loading cycle (60 min → 85% saturation). Actual regen stream
concentration is ~50–100× higher but confined to the eluent loop.

Note on Na₂CO₃ (ELUENT_PROCESS): Li₂CO₃ precipitation uses 7.64 g Na₂CO₃ per g Li
recovered. Expressed in terms of Li product output, not feed equivalent. This is a
product-stream reagent, not a feed-stream dose, and is tracked separately in the Li
recovery accounting — not included in the feed-normalised dose table above.

sites.js: `Ca_OH_2_mgL: 0, FeCl3_mgL: 0, BaCl2_mgL: 0, CO2_mgL: 15, Al2SO4_mgL: 100, HCl_eluent_mgL: 180`

**Sludge generation:**
| Stream | Calculation | kg/day |
|--------|-------------|--------|
| Al(OH)₃ (SETTLING) | 45.6 mg/L × 16,848 m³/day × 10⁻³ | 768 |
| **Non-radioactive total** | | **770** |
| Radioactive | None | **0** |

sites.js: `nonradioactive_kgDay: 770, radioactive_kgDay: 0`

**HRT by stage (min):**
```
INTAKE: 2, COAG_FLOC: 20, SETTLING: 120, MM_FILTER: 20,
LI_IX_LOAD: 60, IX_REGEN: 30, ELUENT_PROCESS: 60, PH_FINAL: 15
```
(LI_IX_LOAD HRT = 60 min at full-speed loading; regen triggers at 85% loading ≈ 51 min)
(R4: Energy 10–60 kWh/m³; SITE-005 representative value: 40 kWh/m³)
Total system HRT: **327 min (5.5 hours)**

---

### SITE-006 — Sellafield Nuclear Process Water (RAD-COPREC) ☢
Flow: 302 L/s = **26,093 m³/day**
Inlet: Ra-226=4.2 Bq/L, As=0.18, Pb=0.08 mg/L; pH=6.1
RA_POLISH **INACTIVE** (4.2 ≤ 5.0 Bq/L threshold)
Regulatory: EA/ONR (UK) — Gate 2 C3 note in advisorFormat.js

**Reagent dose rates:**
| Reagent | Stage | Calculation | Dose (mg/L) |
|---------|-------|-------------|-------------|
| FeCl₃ | FE_DOSE | 0.18 × 8.72 | 1.6 |
| BaCl₂ | BA_DOSE | Standard Ra co-precipitation dose | 2.0 |
| CO₂ | PH_FINAL | pH 6.1, near target; minimal correction | 15 |

sites.js: `Ca_OH_2_mgL: 0, FeCl3_mgL: 1.6, BaCl2_mgL: 2.0, CO2_mgL: 15, Al2SO4_mgL: 0, HCl_eluent_mgL: 0`

**Sludge generation:**
| Stream | Calculation | kg/day |
|--------|-------------|--------|
| Fe(OH)₃ (AS_CLARIFIER) | 0.18 × 3 × 26,093 × 10⁻³ × 1.916 | 27.0 |
| As in sludge | 0.18 × 0.95 × 26.093 | 4.5 |
| Pb in floc | 0.08 × 0.99 × 26.093 | 2.1 |
| **Non-radioactive total** | | **34** |
| (Ba,Ra)SO₄ — BA_DOSE only | 2.0 × 1.121 × 26,093 × 10⁻³ | 58.5 |
| RA_POLISH — inactive | 0 | 0 |
| **Radioactive total** ☢ | | **58** |

sites.js: `nonradioactive_kgDay: 34, radioactive_kgDay: 58`

**HRT by stage (min):**
```
INTAKE: 2, FE_DOSE: 5, AS_COPREC: 30, AS_CLARIFIER: 90,
PH_VERIFY: 10, BA_DOSE: 10, RA_COPREC: 20, RA_FILTER_PRESS: 60,
PH_FINAL: 15
```
(RA_POLISH absent — inactive; RA_COPREC = 20 min minimum; nuclear facility precision)
Total system HRT: **242 min (4.0 hours)**

---

### SITE-007 — Witwatersrand Gold Mine AMD (HM-FULL) ☢
Flow: 335 L/s = **28,944 m³/day**
Inlet: Ra-226=3.1 Bq/L, As=0.95, Ni=22.0, Pb=0.55 mg/L; pH=3.2
isRadioactiveSite: **true** (ra226=3.1 > 0)
RA_POLISH **INACTIVE** (3.1 ≤ 5.0 Bq/L threshold) — BA_DOSE/RA_COPREC/RA_FILTER_PRESS active

**Reagent dose rates:**
| Reagent | Stage | Calculation | Dose (mg/L) |
|---------|-------|-------------|-------------|
| Ca(OH)₂ | PH_UP | pH 3.2→9.5 AMD; Ni component = 22.0×1.263×1.7 = 47.2; acid neut. ≈ 583 (C1) | 630 |
| FeCl₃ | FE_DOSE | 0.95 × 8.72 | 8.3 |
| BaCl₂ | BA_DOSE | isRadioactiveSite=true; ra226=3.1 > 0 | 2.0 |
| CO₂ | PH_CORRECT_RA | R1: pH 9.5→7.5 before BaSO₄ dosing | 200 |
| CO₂ | PH_FINAL | Fine-tune to 7.5 | 20 |

sites.js: `Ca_OH_2_mgL: 630, FeCl3_mgL: 8.3, BaCl2_mgL: 2.0, CO2_mgL: 220, Al2SO4_mgL: 0, HCl_eluent_mgL: 0`

**Sludge generation:**
| Stream | Calculation | kg/day |
|--------|-------------|--------|
| Ni(OH)₂ (NI_CLARIFIER) | 22.0 × 28,944 × 10⁻³ × 1.580 | 1,006 |
| Pb(OH)₂ (NI_CLARIFIER) | 0.55 × 28,944 × 10⁻³ × 1.164 | 18.5 |
| Fe(OH)₃ (AS_PB_CLARIFIER) | 0.95 × 3 × 28,944 × 10⁻³ × 1.916 | 158 |
| As in sludge | 0.95 × 0.95 × 28.944 | 26.1 |
| **Non-radioactive total** | | **1,210** |
| (Ba,Ra)SO₄ — BA_DOSE | 2.0 × 1.121 × 28,944 × 10⁻³ | 64.9 |
| RA_POLISH — inactive | 0 | 0 |
| **Radioactive total** ☢ | | **65** |

sites.js: `nonradioactive_kgDay: 1210, radioactive_kgDay: 65`

**HRT by stage (min):**
```
INTAKE: 2, PH_UP: 15, NI_PRECIP: 30, NI_CLARIFIER: 120,
FE_DOSE: 5, AS_PB_COPREC: 30, AS_PB_CLARIFIER: 90,
PH_CORRECT_RA: 15, BA_DOSE: 10, RA_COPREC: 20,
RA_FILTER_PRESS: 60, PH_FINAL: 15, MM_FILTER: 20
```
Total system HRT: **432 min (7.2 hours)**

---

### SITE-008 — Rio Tinto Cu/As Drainage (PB-AS-COPREC)
Flow: 245 L/s = **21,168 m³/day**
Inlet: As=1.72, Pb=1.85 mg/L; pH=2.9 (most acidic site)

**Reagent dose rates:**
| Reagent | Stage | Calculation | Dose (mg/L) |
|---------|-------|-------------|-------------|
| Ca(OH)₂ | PH_ADJUST | pH 2.9→6.5: highest lime requirement in network | 700 |
| FeCl₃ | FE_DOSE | 1.72 × 8.72 | 15.0 |
| CO₂ | PH_FINAL | pH 6.5→7.2 | 25 |

Note: pH 2.9 is dominated by H₂SO₄ from pyrite oxidation (Rio Tinto). Lime demand
is buffering-controlled, not stoichiometry-controlled. 700 mg/L Ca(OH)₂ is consistent
with published lime treatment data for highly acidic Rio Tinto-type AMD.

sites.js: `Ca_OH_2_mgL: 700, FeCl3_mgL: 15.0, BaCl2_mgL: 0, CO2_mgL: 25, Al2SO4_mgL: 0, HCl_eluent_mgL: 0`

**Sludge generation:**
| Stream | Calculation | kg/day |
|--------|-------------|--------|
| Fe(OH)₃ (AS_PB_CLARIFIER) | 1.72 × 3 × 21,168 × 10⁻³ × 1.916 | 209 |
| As in sludge | 1.72 × 0.95 × 21.168 | 34.6 |
| Pb in floc | 1.85 × 0.997 × 21.168 | 39.0 |
| **Non-radioactive total** | | **283** |
| Radioactive | None | **0** |

sites.js: `nonradioactive_kgDay: 283, radioactive_kgDay: 0`

**HRT by stage (min):**
```
INTAKE: 2, PH_ADJUST: 20, FE_DOSE: 5, AS_PB_COPREC: 30, AS_PB_CLARIFIER: 120, PH_FINAL: 15
```
(PH_ADJUST = 20 min — extended for very acidic feed at pH 2.9)
Total system HRT: **192 min (3.2 hours)**

---

### SITE-009 — Ok Tedi Cu Mine Drainage (PB-AS-COPREC)
Flow: 480 L/s = **41,472 m³/day**
Inlet: As=0.88, Pb=2.60 mg/L; pH=4.1

**Reagent dose rates:**
| Reagent | Stage | Calculation | Dose (mg/L) |
|---------|-------|-------------|-------------|
| Ca(OH)₂ | PH_ADJUST | pH 4.1→6.5; moderate AMD | 300 |
| FeCl₃ | FE_DOSE | 0.88 × 8.72 | 7.7 |
| CO₂ | PH_FINAL | pH 6.5→7.0 | 20 |

sites.js: `Ca_OH_2_mgL: 300, FeCl3_mgL: 7.7, BaCl2_mgL: 0, CO2_mgL: 20, Al2SO4_mgL: 0, HCl_eluent_mgL: 0`

**Sludge generation:**
| Stream | Calculation | kg/day |
|--------|-------------|--------|
| Fe(OH)₃ (AS_PB_CLARIFIER) | 0.88 × 3 × 41,472 × 10⁻³ × 1.916 | 210 |
| As in sludge | 0.88 × 0.95 × 41.472 | 34.7 |
| Pb in floc | 2.60 × 0.997 × 41.472 | 107 |
| **Non-radioactive total** | | **352** |
| Radioactive | None | **0** |

sites.js: `nonradioactive_kgDay: 352, radioactive_kgDay: 0`

**HRT by stage (min):**
```
INTAKE: 2, PH_ADJUST: 15, FE_DOSE: 5, AS_PB_COPREC: 30, AS_PB_CLARIFIER: 120, PH_FINAL: 15
```
Total system HRT: **187 min (3.1 hours)**

---

### SITE-010 — Pilbara Ni Process Water (NI-PRECIP)
Flow: 360 L/s = **31,104 m³/day**
Inlet: Ni=35.0, Pb=0.38 mg/L; pH=4.6; no As, no Ra

**Reagent dose rates:**
| Reagent | Stage | Calculation | Dose (mg/L) |
|---------|-------|-------------|-------------|
| Ca(OH)₂ | PH_UP | pH 4.6→10.5; Ni component = 35.0×1.263×1.7 = 75.1; acid neut. ≈ 365 (C1) | 440 |
| CO₂ | PH_FINAL | pH 10.5→7.5 | 220 |

sites.js: `Ca_OH_2_mgL: 440, FeCl3_mgL: 0, BaCl2_mgL: 0, CO2_mgL: 220, Al2SO4_mgL: 0, HCl_eluent_mgL: 0`

**Sludge generation:**
| Stream | Calculation | kg/day |
|--------|-------------|--------|
| Ni(OH)₂ (NI_CLARIFIER) | 35.0 × 31,104 × 10⁻³ × 1.580 | 1,720 |
| Pb(OH)₂ (NI_CLARIFIER) | 0.38 × 31,104 × 10⁻³ × 1.164 | 13.7 |
| **Non-radioactive total** | | **1,730** |
| Radioactive | None | **0** |

sites.js: `nonradioactive_kgDay: 1730, radioactive_kgDay: 0`

**HRT by stage (min):**
```
INTAKE: 2, PH_UP: 15, NI_PRECIP: 30, NI_CLARIFIER: 150, PH_FINAL: 15
```
(NI_CLARIFIER = 150 min; 35 mg/L Ni is high but not extreme — between SITE-001 and SITE-003)
Total system HRT: **212 min (3.5 hours)**

---

## PART 5 — C5 SUMMARY TABLE

| Site | Train | Ca(OH)₂ | FeCl₃ | BaCl₂ | CO₂ | Al₂(SO₄)₃ | Non-rad | ☢ Rad |
|------|-------|---------|-------|-------|-----|-----------|---------|-------|
| 001 | HM-FULL | 400 | 7.4 | 0 | 220 | 0 | 2,190 | 0 |
| 002 | RAD-COPREC | 0 | 5.4 | 3.0 | 30 | 0 | 103 | **83** |
| 003 | NI-PRECIP | 550 | 0 | 0 | 250 | 0 | 5,080 | 0 |
| 004 | PB-AS-COPREC | 160 | 12.6 | 0 | 20 | 0 | 296 | 0 |
| 005 | LI-IX | 0 | 0 | 0 | 15 | 100 | 770 | 0 |
| 006 | RAD-COPREC | 0 | 1.6 | 2.0 | 15 | 0 | 34 | **58** |
| 007 | HM-FULL | 630 | 8.3 | 2.0 | 220 | 0 | 1,210 | **65** |
| 008 | PB-AS-COPREC | 700 | 15.0 | 0 | 25 | 0 | 283 | 0 |
| 009 | PB-AS-COPREC | 300 | 7.7 | 0 | 20 | 0 | 352 | 0 |
| 010 | NI-PRECIP | 440 | 0 | 0 | 220 | 0 | 1,730 | 0 |

Dose rates in mg/L. Sludge in kg/day.

---

## PART 6 — pH SIMULATION METHODOLOGY

### Principle
The telemetry engine simulates pH as a time-varying signal — not a static value.
This reflects real plant operation: pH fluctuates due to flow variation, reagent
feed lag, CO₂ absorption, and measurement noise. The simulation is honest — it never
shows impossible values and it surfaces the AF2 Ni pH floor condition realistically.

### Outlet pH Model
Simulated outlet pH oscillates around the treatment target with bounded noise:

```
pH_outlet(t) = pH_target + A_slow × sin(2π t / T_slow + φ₁)
                          + A_fast × sin(2π t / T_fast + φ₂)
                          + ε_gaussian(σ = 0.04)
where:
  pH_target   = selectedSite.treatment_targets.pH
  A_slow      = 0.12   (slow operational drift amplitude)
  T_slow      = 480 s  (8-minute process response cycle)
  A_fast      = 0.05   (pump/dosing noise)
  T_fast      = 30 s
  φ₁, φ₂     = random phase offsets set on site selection
  ε_gaussian  = white noise, σ = 0.04 pH units
```

Outlet pH is clamped to [pH_target − 0.4, pH_target + 0.4] — operational normal range.
pH never leaves [0, 14] under any simulation path.

### Reaction Chamber pH Model (AF2 trigger path)
For treatment trains with Ni precipitation (HM-FULL, NI-PRECIP), the reaction chamber
pH is tracked as a separate variable that can breach the 9.2 AF2 floor:

```
pH_reaction(t) = pH_reaction_nominal + 0.4 × sin(2π t / T_slow + φ₃)
                                      + 0.15 × gaussian_noise()
where:
  pH_reaction_nominal = 9.75  (nominal operating point, mid-range 9.5–10.5)
  T_slow = 480 s
```

This gives a reaction chamber pH that roams between approximately 9.0 and 10.5 over time.

**AF2 alert fires when: `pH_reaction < 9.2` AND `treatment_train` ∈ {HM-FULL, NI-PRECIP}**

Alert state persists for minimum 30 seconds (one AI Advisor assessment cycle) before
auto-clearing. This prevents flickering.

AF2 fires roughly 8–12% of runtime at nominal simulation parameters — frequently enough
to demonstrate the alert, rarely enough to feel realistic.

### Inlet pH
Displayed as `selectedSite.raw_water.pH ± 0.10` (measurement noise only). Never changes
to a different operating point — the inlet condition is a fixed site characteristic.

---

## PART 7 — CONTAMINANT OUTLET CONCENTRATION MODEL

Each active contaminant outlet concentration oscillates near the treatment target:

```
c_outlet(t) = c_target × (1.0 + R_excursion × sin(2π t / T_c + φ)
                               + 0.02 × gaussian_noise())
where:
  c_target     = selectedSite.treatment_targets.[contaminant]
  R_excursion  = 0.15  (outlet excursions ±15% around target — realistic scatter)
  T_c          = 300 s (5-minute treatment response cycle)
```

Outlet concentrations are clamped: never below 0, never above inlet concentration.
Treatment efficiency = (c_inlet − c_outlet) / c_inlet × 100%.
Efficiency is always positive (output < input — chemistry law, ST-5C-04a).

### Radioactive sludge rate display
For SITE-002/006/007: `radioactive_sludge_rate_kgPerDay` displayed as:
  - Base value from `sludge_generation_rate_kgPerDay.radioactive_kgDay`
  - ±5% variation over time (pump/filter variation)
  - Displayed to 1 decimal place with "kg/day ☢" unit

---

## PART 8 — TelemetryState OBJECT SCHEMA

Module 5-C emits this schema every 500ms tick:

```js
{
  timestamp_ms:          number,   // Date.now()
  site_id:               string,   // matches selectedSite.site_id

  // ── pH ──────────────────────────────────────────────────────────────────
  pH_inlet:              number,   // raw_water.pH ± noise
  pH_reaction_chamber:   number | null,  // HM-FULL + NI-PRECIP only; null otherwise
  pH_outlet:             number,   // near treatment_targets.pH

  // ── Contaminant outlets (null if not active on this site) ────────────────
  ni_outlet_mgL:         number | null,
  as_outlet_mgL:         number | null,
  pb_outlet_mgL:         number | null,
  ra226_outlet_BqL:      number | null,
  li_recovery_pct:       number | null,   // LI-IX only; near 90%, varies ±5%

  // ── Treatment efficiency (null if contaminant not active) ────────────────
  ni_removal_pct:        number | null,
  as_removal_pct:        number | null,
  pb_removal_pct:        number | null,
  ra226_removal_pct:     number | null,

  // ── Flow and turbidity ───────────────────────────────────────────────────
  flow_rate_Ls:          number,   // nominal ± 5%
  turbidity_inlet_NTU:   number,   // raw_water.turbidity_NTU ± 5%
  turbidity_outlet_NTU:  number,   // near permit_turbidity_NTU ± 10%

  // ── Sludge ───────────────────────────────────────────────────────────────
  nonradioactive_sludge_kgDay:    number,   // from C5; ± 5% variation
  radioactive_sludge_kgDay:       number,   // 0 for non-radioactive sites; ☢ for 002/006/007

  // ── Reagent dose rates (pass-through from C5 site data) ─────────────────
  reagent_dose_rates:    object,   // direct from selectedSite.reagent_dose_rates

  // ── Operational flags ────────────────────────────────────────────────────
  af2_alert_active:      boolean,  // Ni pH floor violation (pH_reaction < 9.2)
  ix_resin_loading_pct:  number | null,  // LI-IX only; mirrors particleEngine state

  // ── HRT (pass-through from C5 site data) ────────────────────────────────
  hrt_min:               object,   // direct from selectedSite.hrt_min
}
```

---

## PART 9 — SOFTWARE TEST SPECIFICATION (Build Agent)

### ST-5C-01: TelemetryState Output Correctness

| Test ID | Test | Pass Condition |
|---------|------|----------------|
| ST-5C-01a | All required schema fields present in every tick | No missing fields; no undefined values |
| ST-5C-01b | `site_id` matches `selectedSite.site_id` on every tick | No stale site_id after switch |
| ST-5C-01c | `treatment_efficiency` for each active contaminant is always positive | outlet < inlet — never negative removal |
| ST-5C-01d | Null fields on inactive contaminants: SITE-005 ni_outlet = null | Correct null propagation from site schema |
| ST-5C-01e | `ra226_outlet_BqL` and `ra226_removal_pct` null for all non-radioactive sites | No spurious radioactive readings |
| ST-5C-01f | `radioactive_sludge_kgDay` = 0 for SITE-001/003/004/005/008/009/010 | Never shows radioactive sludge for clean sites |

### ST-5C-02: pH Simulation

| Test ID | Test | Pass Condition |
|---------|------|----------------|
| ST-5C-02a | `pH_outlet` always within [pH_target − 0.4, pH_target + 0.4] over 1000 ticks | Clamped correctly |
| ST-5C-02b | `pH_outlet` is never NaN, never < 0, never > 14 | pH physically bounded always |
| ST-5C-02c | `pH_reaction_chamber` null for SITE-002 (RAD-COPREC, no Ni) | Not exposed for non-Ni trains |
| ST-5C-02d | `pH_reaction_chamber` non-null for SITE-001 (HM-FULL) and SITE-003 (NI-PRECIP) | Present for all Ni trains |
| ST-5C-02e | Over 1000 ticks on SITE-001: `pH_reaction_chamber` dips below 9.2 at least once | AF2 condition observable |
| ST-5C-02f | `pH_inlet` stays within [raw_water.pH − 0.15, raw_water.pH + 0.15] | Inlet pH is a site characteristic, not simulated |

### ST-5C-03: AF2 Alert

| Test ID | Test | Pass Condition |
|---------|------|----------------|
| ST-5C-03a | `af2_alert_active = true` if and only if `pH_reaction_chamber < 9.2` AND train is HM-FULL or NI-PRECIP | Correct condition and scope |
| ST-5C-03b | `af2_alert_active = false` for SITE-002, 004, 005, 006, 008, 009 (no Ni trains) | AF2 never fires on non-Ni sites |
| ST-5C-03c | AF2 alert persists for minimum 30 seconds once triggered | No flickering per-tick |
| ST-5C-03d | AF2 state correctly resets when site switches to non-Ni train | No stale alert after switch |

### ST-5C-04: Contaminant Values

| Test ID | Test | Pass Condition |
|---------|------|----------------|
| ST-5C-04a | All outlet concentrations > 0 (treatment reduces but never eliminates) | No zero or negative outputs |
| ST-5C-04b | All outlet concentrations < inlet concentrations (treatment always improves) | Output < input — law of conservation |
| ST-5C-04c | Outlet concentrations remain within [target × 0.5, target × 2.0] in normal simulation | Realistic scatter; not wildly off-target |
| ST-5C-04d | SITE-002 `ra226_outlet_BqL` approaches but stays near 0.185 Bq/L target | RA removal is effective but not perfect |
| ST-5C-04e | SITE-006 `ra226_outlet_BqL` approaches 0.185 Bq/L; RA_POLISH inactive → slightly higher than SITE-002 | Polish stage absence is reflected in outlet |
| ST-5C-04f | `li_recovery_pct` for SITE-005 oscillates near 90% (AF1: multi-cycle) | Target stated as >90% over multiple cycles |

### ST-5C-05: Radioactive Sludge Rates

| Test ID | Test | Pass Condition |
|---------|------|----------------|
| ST-5C-05a | SITE-002 `radioactive_sludge_kgDay` oscillates near 83 kg/day | BaCl₂ BA_DOSE (55 kg) + RA_POLISH (28 kg) = 83 |
| ST-5C-05b | SITE-006 `radioactive_sludge_kgDay` oscillates near 58 kg/day | BA_DOSE only; no polish |
| ST-5C-05c | SITE-007 `radioactive_sludge_kgDay` oscillates near 65 kg/day | BA_DOSE at 335 L/s; no polish (ra=3.1≤5.0) |
| ST-5C-05d | Radioactive sludge rate for SITE-007 < SITE-002 despite larger flow | SITE-002 gets polishing stage; higher BaCl₂ total |
| ST-5C-05e | Radioactive sludge rate variation: ±5% of base value across 1000 ticks | Realistic operational variation |

### ST-5C-06: C5 Data Pass-Through

| Test ID | Test | Pass Condition |
|---------|------|----------------|
| ST-5C-06a | `reagent_dose_rates` in TelemetryState matches sites.js C5 field exactly | No transformation; direct pass-through |
| ST-5C-06b | `hrt_min` in TelemetryState matches sites.js C5 field exactly | No recomputation |
| ST-5C-06c | sites.js passes existing `validateSite()` after C5 fields added | C5 additions do not break 3-B validation gate |
| ST-5C-06d | C5 fields absent from `validateSite()` checks — they are not validated (optional enrichment) | No false validation failures |

### ST-5C-07: Timing and Interval Management (SENTINEL)

| Test ID | Test | Pass Condition |
|---------|------|----------------|
| ST-5C-07a | Telemetry engine uses `setInterval` at 500ms tick; interval ID stored in ref | Interval registered once, ID accessible |
| ST-5C-07b | `clearInterval` called on component unmount; interval ID ref set to null | No interval continues after unmount |
| ST-5C-07c | Interval does not stack: if `useTelemetry` hook re-runs its effect, old interval cleared before new one starts | Only one interval at any time |
| ST-5C-07d | No `setState` on unmounted component: `isMounted` guard or AbortController pattern | React warning never fires |
| ST-5C-07e | 30-minute runtime: heap does not grow linearly; plateau expected | No closure-based memory leak from interval |

### ST-5C-08: Site Switch Behaviour

| Test ID | Test | Pass Condition |
|---------|------|----------------|
| ST-5C-08a | On site switch: new tick immediately reflects new site_id | No lag of even one tick on wrong site |
| ST-5C-08b | Phase offsets (φ₁, φ₂, φ₃) randomised on each new site selection | Different oscillation pattern per site; not periodic carry-over |
| ST-5C-08c | On deselect (selectedSite = null): interval cleared; no telemetry output | No null-ref errors on tick with no site |
| ST-5C-08d | 100 rapid site switches: final TelemetryState reflects only the last selected site | No data bleed from previous sites |

### ST-5C-09: Null Safety

| Test ID | Test | Pass Condition |
|---------|------|----------------|
| ST-5C-09a | SITE-005 (LI-IX): `ni_outlet_mgL = null`, `as_outlet_mgL = null`, `pb_outlet_mgL = null`, `ra226_outlet_BqL = null` | Null propagated correctly for absent contaminants |
| ST-5C-09b | HM-FULL site with no Ra (SITE-001): `ra226_outlet_BqL = null`, `radioactive_sludge_kgDay = 0` | Zero-Ra site never shows radioactive output |
| ST-5C-09c | `useTelemetry(null)`: returns null TelemetryState immediately; no interval started | Null site handled at hook boundary |

---

## PART 10 — CODE ARCHITECTURE NOTE

**`src/hooks/useTelemetry.js`** — custom React hook
- Receives: `selectedSite` (from App via useSelectedSite)
- Returns: `telemetryState` (TelemetryState object, updated every 500ms)
- Owns `setInterval` lifecycle (start on mount/site-change, clear on unmount)
- Reads C5 data directly from `selectedSite.reagent_dose_rates`, `.hrt_min`, `.sludge_generation_rate_kgPerDay`
- Maintains simulation state in `useRef` (phase offsets, AF2 timer)
- Emits via `useState` — one setState per tick

**`src/data/sites.js`** — add C5 fields to AQUA_SITES_RAW
- Add `reagent_dose_rates`, `sludge_generation_rate_kgPerDay`, `hrt_min` to each site object
- Values per Part 4 of this spec
- `validateSite()` unchanged — C5 fields are not validated (post-validation enrichment)

**`src/components/telemetry/TelemetryPanel.jsx`** — Layer 4 display (Phase 5-C)
- Consumes `telemetryState` from `useTelemetry`
- Renders pH gauges, contaminant concentration bars, efficiency indicators, sludge rates
- AF2 alert: reads `af2_alert_active` → highlights pH_reaction gauge amber

---

## PART 11 — PRE-BUILD CHECKLIST

- [ ] Chemistry Advisor reviews Part 1–7 — verdict required
- [ ] All C5 stoichiometric calculations verified by Chemistry Advisor
- [ ] pH simulation methodology approved
- [ ] AF2 trigger conditions (pH_reaction < 9.2, Ni trains only) approved
- [ ] Radioactive sludge rates for SITE-002/006/007 approved
- [ ] C5 fields added to sites.js (per Part 4 values)
- [ ] Build Agent software spec (Part 9) reviewed and approved by Michael
- [ ] sites.js C5 additions: existing `validateSite()` still passes
- [ ] Module 3-A ✅, 3-B ✅, 3-C ✅, 5-A ✅ certified clean
- [ ] Gate 2 ✅ CLOSED
- [ ] CLEARED FOR BUILD — pending Chemistry Advisor verdict

---

*PHASE5_MODULE5C_TEST_SPECS.md | PROJECT AQUA | March 12, 2026*
*Status: AWAITING CHEMISTRY ADVISOR REVIEW*
