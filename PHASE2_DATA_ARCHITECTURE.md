# PROJECT AQUA — PHASE 2: DATA ARCHITECTURE
**Version:** 2.1 | **Date:** March 11, 2026
**Status:** GATE 1 APPROVED WITH CORRECTIONS — R1–R5 incorporated, Advisory Flags AF1–AF3 incorporated

---

## 1. OVERVIEW

This document defines the data architecture for PROJECT AQUA: all site schemas, contamination profiles, treatment train type definitions, telemetry data structures, and the data flow between all system layers.

All chemistry parameters reflect PHASE 1 APPROVED WITH CORRECTIONS values from CLAUDE.md.
Gate 1 corrections incorporated: R1 (HM-FULL pH step before Ra-226), R2 (PB-AS-COPREC dual Pb mechanism), R3 (LI-IX pre-treatment expansion), R4 (LI-IX separate energy range), R5 (Sellafield regulatory reference). Advisory flags AF1–AF3 noted in relevant sections.

---

## 2. INDUSTRIAL SITE TAXONOMY

PROJECT AQUA represents six site archetypes drawn from real-world industrial water treatment scenarios. Each archetype has a distinct contamination profile and treatment train.

| Archetype ID | Name | Primary Contaminants | Treatment Train Type | Data Source Reference |
|---|---|---|---|---|
| ARCH-01 | Hard Rock Mine Drainage | As, Ni, Ra-226, pH | HM-FULL | EPA ECHO, IAEA PRIS |
| ARCH-02 | Uranium/Radium Legacy Site | Ra-226, As | RAD-COPREC | IAEA PRIS, USGS NWIS |
| ARCH-03 | Nickel Smelter Effluent | Ni, Pb, pH | NI-PRECIP | EPA ECHO |
| ARCH-04 | Lead/Arsenic Industrial Discharge | Pb, As | PB-AS-COPREC | EPA ECHO, WHO GEMS |
| ARCH-05 | Lithium Brine Recovery | Li (recovery) | LI-IX | USGS NWIS |
| ARCH-06 | Nuclear Facility Process Water | Ra-226, trace metals | RAD-COPREC | IAEA PRIS |

---

## 3. SITE DATA SCHEMA

Each site object in the data layer conforms to this schema:

```typescript
interface AquaSite {
  // Identity
  site_id: string;              // e.g. "SITE-001"
  name: string;                 // Display name
  archetype: ArchetypeID;       // ARCH-01 through ARCH-06
  operator: string;             // Facility operator (real or representative)
  country: string;
  region: string;

  // Geospatial
  coordinates: {
    lat: number;                // Decimal degrees, -90 to 90
    lon: number;                // Decimal degrees, -180 to 180
  };
  globe_plume_radius_km: number; // Contamination plume visualization radius

  // Hydrology
  flow_rate_nominal_Ls: number;  // Nominal flow in L/s (typical: 300 L/s)
  flow_rate_peak_Ls: number;     // Peak flow in L/s (typical: 500 L/s)
  source_type: SourceType;       // 'mine_drainage' | 'industrial_effluent' | 'nuclear_process' | 'brine_recovery'

  // Regulatory
  regulatory_regime: 'EPA' | 'WHO' | 'IAEA' | 'MIXED';
  permit_turbidity_NTU: number;  // Site-specific turbidity permit limit — NEVER use global default

  // Raw water contamination profile (inlet concentrations)
  raw_water: ContaminantProfile;

  // Treatment targets (outlet concentrations — must be achievable)
  treatment_targets: ContaminantProfile;

  // Treatment configuration
  treatment_train: TreatmentTrainType;

  // Active process stages for this site
  active_stages: ProcessStageID[];
}
```

### 3.1 Contaminant Profile Schema

```typescript
interface ContaminantProfile {
  // Radionuclides — unit: Bq/L
  ra226_BqL?: number;           // Range: 0–10 Bq/L (EPA MCL: 0.185 Bq/L)

  // Heavy metals — unit: mg/L
  pb_mgL?: number;              // Range: 0–5 mg/L (target: <0.01 mg/L)
  as_mgL?: number;              // Range: 0–2 mg/L (target: <0.01 mg/L)
  ni_mgL?: number;              // Range: 0–100 mg/L (target: <0.1 mg/L)

  // Recovery metals — unit: mg/L
  li_mgL?: number;              // Recovery context (target: >90% recovery)

  // Physical/chemical
  pH: number;                   // Range: 0.0–14.0 (NEVER NaN, NEVER out of range)
  turbidity_NTU: number;        // Range: 0–1000 NTU (use site permit limit, not global target)
  flow_rate_Ls: number;         // > 0 L/s at all times

  // Metadata
  timestamp_ms: number;         // Unix ms timestamp
  is_simulated: boolean;        // true = telemetry engine output, false = real API data
}
```

**CRITICAL UNIT RULES (enforced by telemetry engine):**
- Ra-226 ALWAYS in Bq/L. NEVER mix with mg/L.
- All heavy metals ALWAYS in mg/L. NEVER mix with Bq/L.
- pH is dimensionless (0.0–14.0). NEVER NaN.
- Turbidity ALWAYS in NTU.
- Flow rate ALWAYS in L/s. Craig benchmark: 300 L/s avg, 500 L/s peak.

---

## 4. TREATMENT TRAIN TYPE DEFINITIONS

### 4.1 HM-FULL — Full Heavy Metals Train (ARCH-01: Hard Rock Mine)

Handles simultaneous As, Ni, Ra-226.

```
Stage 1:  RAW_INTAKE        — raw water ingestion, baseline measurement
Stage 2:  PH_ADJUST_UP      — raise pH to 5.5–6.0 (coagulation prep)
Stage 3:  IRON_DOSE         — FeCl3 addition for As co-precipitation
Stage 4:  REACTION_AS       — As co-precipitation with iron floc, pH 5.5–7.0
Stage 5:  CLARIFIER_1       — solids-liquid separation (As-iron sludge)  ← MANDATORY
Stage 6:  PH_ADJUST_HIGH    — raise pH to 9.5–10.5 (Ni precipitation target)
Stage 7:  REACTION_NI       — Ni(OH)2 precipitation at pH 9.5–10.5
                              [AF2] pH floor alert: AI Advisor ALERT if pH < 9.2 in this stage
Stage 8:  CLARIFIER_2       — solids-liquid separation (Ni(OH)2 sludge)  ← MANDATORY
Stage 9:  PH_CORRECT_RA     — [R1 — GATE 1 REQUIRED] pH reduction from ~10 → 7.0–8.0 before BaSO4 stage
                              Reagent: CO2 addition (preferred — avoids adding sulfate load to BaSO4 reaction)
                              Purpose: At pH >9, BaCO3 competes with BaSO4 for Ba²⁺ ions. BaCO3 does NOT
                              co-crystallize Ra-226 (isomorphous substitution requires BaSO4 lattice).
                              BaCO3 formation consumes Ba²⁺ without removing Ra-226 → misses 0.185 Bq/L target.
                              CO2 correction to pH 7–8 eliminates BaCO3 interference entirely.
Stage 10: BASO4_SEED_DOSE   — BaSO4 seed addition for Ra-226 co-precipitation
Stage 11: REACTION_RA226    — Ra-226 co-precipitation with BaSO4 at pH 7.0–8.0
                              Ra²⁺ substitutes isomorphously into BaSO4 crystal lattice at correct pH
Stage 12: FILTER_PRESS_RA   — solids-liquid separation (RADIOACTIVE sludge) ← MANDATORY
Stage 13: PH_CORRECT_FINAL  — pH adjustment to 6.5–8.5 discharge target
Stage 14: CLEAN_OUTPUT      — effluent discharge
Stage 15: SLUDGE_HANDLING   — sludge characterization, radioactive waste flagging
```

### 4.2 RAD-COPREC — Radium Co-precipitation Train (ARCH-02, ARCH-06)

Optimized for Ra-226 with As co-treatment.

**Note:** This train has an inherent pH advantage over HM-FULL for Ra-226 co-precipitation. After
Clarifier 1, pH is naturally ~6–7 — directly within the 7.0–8.5 optimal window for BaSO4 co-
precipitation. No intermediate pH correction stage required (unlike HM-FULL which exits at pH ~10).
**[AF3 — ADVISORY FLAG] Peak Ra-226 concentration:** At Athabasca inlet Ra-226 of 6.8 Bq/L, a
single-pass BaSO4 co-precipitation achieving ~97% removal can meet the 0.185 Bq/L target. However,
at peak concentrations or reduced contact time, a polishing second-pass co-precipitation stage may be
required. AI Advisor logic must flag this risk when Ra-226 inlet approaches upper range.

```
Stage 1:  RAW_INTAKE
Stage 2:  PH_ADJUST_UP      — pH to 5.5–7.0 (Fe co-precipitation range)
Stage 3:  IRON_DOSE         — FeCl3 for As co-precipitation
Stage 4:  REACTION_AS       — As co-precipitation
Stage 5:  CLARIFIER_1       — separation (As-iron sludge)  ← MANDATORY
                              pH after this stage naturally ~6–7 — optimal for BaSO4 co-precipitation
Stage 6:  BASO4_SEED_DOSE   — BaSO4 seed (no pH correction needed — already in optimal window)
Stage 7:  REACTION_RA226    — Ra-226 co-precipitation at pH 6–7
                              [AF3] AI Advisor flag if Ra-226 inlet >5 Bq/L — polishing stage may be needed
                              BaSO4 sludge generation reference: ~2 kg/m³ at mid-range dose
Stage 8:  FILTER_PRESS_RA   — separation (RADIOACTIVE sludge) ← MANDATORY
Stage 9:  PH_CORRECT_FINAL  — pH to 6.5–8.5
Stage 10: CLEAN_OUTPUT
Stage 11: SLUDGE_HANDLING   — radioactive waste flagging REQUIRED
```

### 4.3 NI-PRECIP — Nickel Precipitation Train (ARCH-03)

Optimized for Ni and Pb.

**[AF2 — ADVISORY FLAG] Ni(OH)2 re-dissolution risk:** If reaction chamber pH drops below 8.5–9.0
due to process variation, partial Ni(OH)2 re-dissolution can occur, returning Ni to solution.
Telemetry engine must model a tight pH control band. AI Advisor must issue an ALERT if pH drops
below 9.2 in the reaction chamber (Stage 3). This applies identically to Stage 7 in HM-FULL.

```
Stage 1:  RAW_INTAKE
Stage 2:  PH_ADJUST_HIGH    — pH to 9.5–10.5 for Ni(OH)2 precipitation
Stage 3:  REACTION_NI       — Ni(OH)2 + Pb(OH)2 co-precipitation at pH 9.5–10.5
                              [AF2] pH floor alert: AI Advisor ALERT if pH < 9.2 in this stage
                              Pb precipitation essentially complete at pH 9.5 (theoretical dissolved
                              Pb < 0.001 mg/L — well below 0.01 mg/L target, no polishing needed)
Stage 4:  CLARIFIER_1       — separation (hydroxide sludge) ← MANDATORY
Stage 5:  PH_CORRECT_FINAL  — pH adjustment to 6.5–8.5
Stage 6:  CLEAN_OUTPUT
Stage 7:  SLUDGE_HANDLING   — heavy metal sludge characterization
                              Sludge generation reference: Ni(OH)2 at 87 mg/L Ni ≈ 0.137 kg/m³
```

### 4.4 PB-AS-COPREC — Lead/Arsenic Co-precipitation Train (ARCH-04)

**[R2 — GATE 1 REQUIRED] DUAL Pb REMOVAL MECHANISM:**
At pH 5.5–7.0, Pb(OH)2 equilibrium alone gives ~0.25 mg/L dissolved Pb at pH 5.5 — insufficient to
reach the <0.01 mg/L target. However, Pb adsorbs strongly onto Fe(OH)3 floc surfaces. The combined
mechanism (Pb adsorption/co-precipitation onto Fe floc + Pb(OH)2 precipitation) IS sufficient at pH ≥6.0.
The chemistry model MUST implement BOTH mechanisms. Coding only Pb(OH)2 equilibrium produces incorrect
results at the lower pH range. Operational pH floor: 6.0 (not 5.5). AI Advisor alert if pH < 6.2 in
reaction chamber.

```
Stage 1:  RAW_INTAKE
Stage 2:  PH_ADJUST_UP      — pH to 6.0–7.0 (Fe range — floor raised from 5.5 to 6.0 per R2)
Stage 3:  IRON_DOSE         — FeCl3 for As co-precipitation and Pb floc adsorption substrate
Stage 4:  REACTION_AS_PB    — DUAL Pb MECHANISM [R2]:
                              Mechanism 1 (dominant): Pb adsorption/co-precipitation onto Fe(OH)3 floc
                              Mechanism 2 (supplementary): Pb(OH)2 precipitation
                              As: iron co-precipitation with Fe(OH)3 floc at pH 6.0–7.0
                              pH floor enforced at 6.0 — AI Advisor ALERT if pH drops below 6.2
Stage 5:  CLARIFIER_1       — separation ← MANDATORY
Stage 6:  PH_CORRECT_FINAL  — pH to 6.5–8.5
Stage 7:  CLEAN_OUTPUT
Stage 8:  SLUDGE_HANDLING
```

### 4.5 LI-IX — Lithium Ion Exchange Recovery Train (ARCH-05)

Separate process train — recovery context, not remediation.

**[R3 — GATE 1 REQUIRED] Pre-treatment expansion:** A single multimedia filter at 95 NTU brine is
insufficient. High ionic strength affects coagulation — a single-pass filter cannot consistently reach
<5 mg/L SS. Required sequence: Coagulation/flocculation → Settling → Multimedia filtration.
**[AF1 — ADVISORY FLAG] >90% Li recovery:** At Atacama Mg/Li ~6:1, a single IX pass may achieve
70–85% Li recovery. The >90% target is achievable over multiple regeneration cycles, not guaranteed
in a single bed-volume pass. This caveat must appear in the AI Advisor output for SITE-005.
**[R4 — GATE 1 REQUIRED] Separate energy range:** LI-IX with evaporation/crystallization operates
at 10–60 kWh/m³, NOT the 0.5–5.0 kWh/m³ range used for precipitation trains. Energy model must
use train-specific bounds. See Section 9.

```
Stage 1:  RAW_INTAKE        — lithium brine feed (Li ~1850 mg/L, turbidity ~95 NTU)
Stage 2:  COAG_FLOC         — [R3] coagulation/flocculation — required for high-ionic-strength brine
                              Reagent: coagulant aid (brine-compatible)
Stage 3:  SETTLING          — [R3] settling to reduce suspended solids load before filtration
Stage 4:  MULTIMEDIA_FILTER — [R3] multimedia filtration → <5 mg/L SS (resin fouling threshold)
Stage 5:  IX_LOADING        — selective Li-Mn oxide (LMO) ion sieve resin loading
                              Li⁺ adsorbs preferentially; Na⁺, K⁺, Mg²⁺, Ca²⁺ partially excluded
                              Resin loading tracked 0–100%; regeneration triggered at >85%
Stage 6:  IX_REGENERATION   — resin regeneration cycle (MUST be animated)
                              Eluent: dilute HCl (0.1–0.5M) — acid strips Li from Mn oxide lattice
                              Flow reversal (backwash); resin returns to service after completion
Stage 7:  ELUTION           — Li-rich eluate collection in product tank
Stage 8:  EVAP_CRYSTALLIZE  — evaporation/crystallization → Li2CO3 or LiOH·H2O
                              [R4] Energy: 10–60 kWh/m³ for this stage — not 0.5–5.0 kWh/m³
Stage 9:  PRODUCT_OUTPUT    — lithium product stream
                              [AF1] >90% Li recovery achievable over multiple regen cycles, not
                              guaranteed single-pass at Mg/Li ~6:1. AI Advisor output must include
                              this caveat for SITE-005.
Stage 10: RAFFINATE_TREAT   — spent brine: Mg²⁺, Ca²⁺, Na⁺, K⁺ dominant; pH correction + disposal
```

---

## 5. REPRESENTATIVE SITE INSTANCES

Ten sites providing geographic and contamination diversity for globe visualization:

```javascript
const AQUA_SITES = [
  {
    site_id: "SITE-001",
    name: "Sudbury Basin Ni-Mine Drainage",
    archetype: "ARCH-01",
    country: "Canada",
    coordinates: { lat: 46.49, lon: -81.00 },
    globe_plume_radius_km: 35,
    flow_rate_nominal_Ls: 310,
    flow_rate_peak_Ls: 520,
    source_type: "mine_drainage",
    regulatory_regime: "MIXED",        // Ontario MOE + federal
    permit_turbidity_NTU: 25,
    raw_water: {
      ni_mgL: 48.0, as_mgL: 0.85, pb_mgL: 0.12,
      ra226_BqL: 0.0, pH: 4.2, turbidity_NTU: 380
    },
    treatment_targets: {
      ni_mgL: 0.1, as_mgL: 0.01, pb_mgL: 0.01,
      ra226_BqL: 0.0, pH: 7.5, turbidity_NTU: 25
    },
    treatment_train: "HM-FULL"
  },
  {
    site_id: "SITE-002",
    name: "Athabasca Uranium Legacy — Saskatchewan",
    archetype: "ARCH-02",
    country: "Canada",
    coordinates: { lat: 58.60, lon: -109.40 },
    globe_plume_radius_km: 50,
    flow_rate_nominal_Ls: 285,
    flow_rate_peak_Ls: 490,
    source_type: "mine_drainage",
    regulatory_regime: "MIXED",        // CNSC + provincial
    permit_turbidity_NTU: 15,
    raw_water: {
      ra226_BqL: 6.8, as_mgL: 0.62, pb_mgL: 0.04,
      ni_mgL: 0.0, pH: 5.1, turbidity_NTU: 210
    },
    treatment_targets: {
      ra226_BqL: 0.185, as_mgL: 0.01, pb_mgL: 0.01,
      ni_mgL: 0.0, pH: 7.0, turbidity_NTU: 15
    },
    treatment_train: "RAD-COPREC"
  },
  {
    site_id: "SITE-003",
    name: "Norilsk Ni Smelter Effluent",
    archetype: "ARCH-03",
    country: "Russia",
    coordinates: { lat: 69.33, lon: 88.20 },
    globe_plume_radius_km: 60,
    flow_rate_nominal_Ls: 420,
    flow_rate_peak_Ls: 580,
    source_type: "industrial_effluent",
    regulatory_regime: "WHO",
    permit_turbidity_NTU: 30,
    raw_water: {
      ni_mgL: 87.0, pb_mgL: 2.1, as_mgL: 0.0,
      ra226_BqL: 0.0, pH: 3.8, turbidity_NTU: 520
    },
    treatment_targets: {
      ni_mgL: 0.1, pb_mgL: 0.01, as_mgL: 0.0,
      ra226_BqL: 0.0, pH: 7.5, turbidity_NTU: 30
    },
    treatment_train: "NI-PRECIP"
  },
  {
    site_id: "SITE-004",
    name: "Zambian Copperbelt As/Pb Discharge",
    archetype: "ARCH-04",
    country: "Zambia",
    coordinates: { lat: -13.05, lon: 27.85 },
    globe_plume_radius_km: 40,
    flow_rate_nominal_Ls: 265,
    flow_rate_peak_Ls: 440,
    source_type: "mine_drainage",
    regulatory_regime: "WHO",
    permit_turbidity_NTU: 50,
    raw_water: {
      as_mgL: 1.45, pb_mgL: 3.2, ni_mgL: 0.0,
      ra226_BqL: 0.0, pH: 4.5, turbidity_NTU: 445
    },
    treatment_targets: {
      as_mgL: 0.01, pb_mgL: 0.01, ni_mgL: 0.0,
      ra226_BqL: 0.0, pH: 7.2, turbidity_NTU: 50
    },
    treatment_train: "PB-AS-COPREC"
  },
  {
    site_id: "SITE-005",
    name: "Salar de Atacama Li Recovery",
    archetype: "ARCH-05",
    country: "Chile",
    coordinates: { lat: -23.50, lon: -68.25 },
    globe_plume_radius_km: 30,
    flow_rate_nominal_Ls: 195,
    flow_rate_peak_Ls: 320,
    source_type: "brine_recovery",
    regulatory_regime: "MIXED",
    permit_turbidity_NTU: 20,
    raw_water: {
      li_mgL: 1850, pH: 7.1, turbidity_NTU: 95
    },
    treatment_targets: {
      li_mgL: 185,    // > 90% recovery (1850 → <185 in raffinate = >90% into product)
      pH: 7.0, turbidity_NTU: 10
    },
    treatment_train: "LI-IX"
  },
  {
    site_id: "SITE-006",
    name: "Sellafield Nuclear Process Water — UK",
    archetype: "ARCH-06",
    country: "UK",
    coordinates: { lat: 54.42, lon: -3.50 },
    globe_plume_radius_km: 25,
    flow_rate_nominal_Ls: 302,
    flow_rate_peak_Ls: 505,
    source_type: "nuclear_process",
    regulatory_regime: "IAEA",  // [R5 GATE 1] UK regulatory bodies: Environment Agency (EA) + Office for
                                 // Nuclear Regulation (ONR). CNSC has no jurisdiction at Sellafield.
                                 // Display: "EA / ONR (UK)" in AI Advisor and telemetry panel.
    permit_turbidity_NTU: 10,
    raw_water: {
      ra226_BqL: 4.2, as_mgL: 0.18, pb_mgL: 0.08,
      ni_mgL: 0.0, pH: 6.1, turbidity_NTU: 145
    },
    treatment_targets: {
      ra226_BqL: 0.185, as_mgL: 0.01, pb_mgL: 0.01,
      ni_mgL: 0.0, pH: 7.5, turbidity_NTU: 10
    },
    treatment_train: "RAD-COPREC"
  },
  {
    site_id: "SITE-007",
    name: "Witwatersrand Gold Mine AMD — South Africa",
    archetype: "ARCH-01",
    country: "South Africa",
    coordinates: { lat: -26.20, lon: 27.85 },
    globe_plume_radius_km: 45,
    flow_rate_nominal_Ls: 335,
    flow_rate_peak_Ls: 510,
    source_type: "mine_drainage",
    regulatory_regime: "MIXED",
    permit_turbidity_NTU: 20,
    raw_water: {
      ra226_BqL: 3.1, as_mgL: 0.95, ni_mgL: 22.0,
      pb_mgL: 0.55, pH: 3.2, turbidity_NTU: 610
    },
    treatment_targets: {
      ra226_BqL: 0.185, as_mgL: 0.01, ni_mgL: 0.1,
      pb_mgL: 0.01, pH: 7.5, turbidity_NTU: 20
    },
    treatment_train: "HM-FULL"
  },
  {
    site_id: "SITE-008",
    name: "Rio Tinto Cu/As Drainage — Spain",
    archetype: "ARCH-04",
    country: "Spain",
    coordinates: { lat: 37.72, lon: -6.58 },
    globe_plume_radius_km: 35,
    flow_rate_nominal_Ls: 245,
    flow_rate_peak_Ls: 395,
    source_type: "mine_drainage",
    regulatory_regime: "WHO",
    permit_turbidity_NTU: 25,
    raw_water: {
      as_mgL: 1.72, pb_mgL: 1.85, ni_mgL: 0.0,
      ra226_BqL: 0.0, pH: 2.9, turbidity_NTU: 780
    },
    treatment_targets: {
      as_mgL: 0.01, pb_mgL: 0.01, ni_mgL: 0.0,
      ra226_BqL: 0.0, pH: 7.2, turbidity_NTU: 25
    },
    treatment_train: "PB-AS-COPREC"
  },
  {
    site_id: "SITE-009",
    name: "Ok Tedi Cu Mine Drainage — Papua New Guinea",
    archetype: "ARCH-04",
    country: "Papua New Guinea",
    coordinates: { lat: -5.22, lon: 141.19 },
    globe_plume_radius_km: 55,
    flow_rate_nominal_Ls: 480,
    flow_rate_peak_Ls: 520,
    source_type: "mine_drainage",
    regulatory_regime: "WHO",
    permit_turbidity_NTU: 50,
    raw_water: {
      as_mgL: 0.88, pb_mgL: 2.60, ni_mgL: 0.0,
      ra226_BqL: 0.0, pH: 4.1, turbidity_NTU: 550
    },
    treatment_targets: {
      as_mgL: 0.01, pb_mgL: 0.01, ni_mgL: 0.0,
      ra226_BqL: 0.0, pH: 7.0, turbidity_NTU: 50
    },
    treatment_train: "PB-AS-COPREC"
  },
  {
    site_id: "SITE-010",
    name: "Pilbara Iron Ore / Ni Process Water — Australia",
    archetype: "ARCH-03",
    country: "Australia",
    coordinates: { lat: -22.30, lon: 118.60 },
    globe_plume_radius_km: 40,
    flow_rate_nominal_Ls: 360,
    flow_rate_peak_Ls: 500,
    source_type: "industrial_effluent",
    regulatory_regime: "MIXED",
    permit_turbidity_NTU: 20,
    raw_water: {
      ni_mgL: 35.0, pb_mgL: 0.38, as_mgL: 0.0,
      ra226_BqL: 0.0, pH: 4.6, turbidity_NTU: 320
    },
    treatment_targets: {
      ni_mgL: 0.1, pb_mgL: 0.01, as_mgL: 0.0,
      ra226_BqL: 0.0, pH: 7.5, turbidity_NTU: 20
    },
    treatment_train: "NI-PRECIP"
  }
];
```

---

## 6. TELEMETRY ENGINE DATA FLOW

### 6.1 Per-Tick Data Envelope

The telemetry engine fires at ~1 Hz (1-second intervals) and produces this envelope:

```typescript
interface TelemetryTick {
  site_id: string;
  timestamp_ms: number;
  tick_number: number;

  // Stage-by-stage chemistry state (one entry per active stage)
  stages: StageState[];

  // Derived system metrics
  system: {
    overall_removal_efficiency_pct: number;  // % contaminant removed vs. inlet
    energy_kWh_per_m3: number;               // must be in realistic industrial range
    sludge_generation_kg_per_hr: number;     // MUST be non-zero when precipitation active
    radioactive_sludge_active: boolean;      // true when any Ra-226 stage active
    mass_balance_closure_pct: number;        // must be within 5% tolerance
  };

  // Outlet stream (what goes to AI Advisor)
  outlet: ContaminantProfile;

  // Sludge stream
  sludge: {
    total_kg_per_hr: number;
    is_radioactive: boolean;      // flagged for Ra-226 streams
    stages_contributing: ProcessStageID[];
  };
}
```

### 6.2 Stage State Schema

```typescript
interface StageState {
  stage_id: ProcessStageID;
  stage_name: string;
  inlet: ContaminantProfile;
  outlet: ContaminantProfile;

  // Stage-specific operating parameters
  operating: {
    pH_target?: number;
    pH_actual?: number;
    reagent_dose_mg_per_L?: number;
    reagent_type?: string;        // 'FeCl3' | 'NaOH' | 'H2SO4' | 'BaSO4_seed' | 'HCl'
    temperature_C?: number;
    retention_time_min?: number;
  };

  // Ion exchange specific
  ix_state?: {
    resin_loading_pct: number;    // 0–100%, triggers regeneration animation when >85%
    in_regeneration: boolean;
    regeneration_pct_complete: number;
    bed_volumes_processed: number;
  };

  // Status
  removal_efficiency_pct: number;
  stage_health: 'NORMAL' | 'WATCH' | 'ALERT' | 'BYPASSED';
}
```

---

## 7. AI ADVISOR DATA INTERFACE

The AI Advisor receives a structured prompt package (NOT raw data) every 30–60 seconds:

```typescript
interface AIAdvisorPromptPackage {
  site: {
    site_id: string;
    name: string;
    treatment_train: string;
    regulatory_regime: string;
  };

  // Current telemetry — NAMED parameters WITH units, not bare numbers
  telemetry: {
    flow_rate: string;          // e.g. "312 L/s"
    pH_inlet: string;           // e.g. "4.2 (dimensionless)"
    pH_outlet: string;          // e.g. "7.4 (dimensionless)"
    turbidity_inlet: string;    // e.g. "380 NTU"
    turbidity_outlet: string;   // e.g. "22 NTU"
    ra226_inlet?: string;       // e.g. "6.8 Bq/L"
    ra226_outlet?: string;      // e.g. "0.14 Bq/L"
    pb_inlet?: string;          // e.g. "2.1 mg/L"
    pb_outlet?: string;         // e.g. "0.008 mg/L"
    as_inlet?: string;          // e.g. "0.85 mg/L"
    as_outlet?: string;         // e.g. "0.007 mg/L"
    ni_inlet?: string;          // e.g. "48.0 mg/L"
    ni_outlet?: string;         // e.g. "0.09 mg/L"
    overall_efficiency: string; // e.g. "97.2%"
    energy_consumption: string; // e.g. "2.8 kWh/m³"
  };

  // Regulatory thresholds in context (for AI to compare against)
  thresholds: {
    ra226_EPA_MCL_BqL?: 0.185;
    pb_EPA_limit_mgL?: 0.01;
    as_EPA_limit_mgL?: 0.01;
    ni_WHO_limit_mgL?: 0.1;
    pH_discharge_range?: "6.5–8.5";
    turbidity_permit_NTU: number;  // site-specific
  };

  // Operational context
  context: {
    active_treatment_stages: string[];
    radioactive_sludge_generating: boolean;
    ix_in_regeneration: boolean;
    any_stage_in_alert: boolean;
    runtime_minutes: number;
  };
}
```

---

## 8. GLOBE VISUALIZATION DATA

### 8.1 Plume Data

```typescript
interface PlumeData {
  site_id: string;
  coordinates: { lat: number; lon: number };
  radius_km: number;
  pulse_intensity: number;           // 0.0–1.0, driven by inlet contamination severity
  color_hex: string;                 // Red (#FF2200) = high contamination → Teal (#00CED1) = treated
  treatment_active: boolean;
  node_pulse_color: string;          // '#00CED1' (teal) for treatment nodes
}
```

### 8.2 Color Coding Convention

| State | Color | Hex |
|-------|-------|-----|
| Untreated / high contamination | Red | `#FF2200` |
| Active treatment | Amber | `#FF8C00` |
| Near-compliant | Yellow | `#FFD700` |
| Compliant / treated | Teal | `#00CED1` |
| Treatment node (always) | Teal pulse | `#00CED1` |
| Radioactive site flag | Magenta | `#FF00FF` |

---

## 9. MASS BALANCE ACCOUNTING SCHEMA

Per the CLAUDE.md requirement — mass balance must close within 5%:

```typescript
interface MassBalance {
  site_id: string;
  timestamp_ms: number;

  // Water balance (m³/hr)
  water: {
    input_m3_hr: number;
    clean_output_m3_hr: number;
    sludge_water_m3_hr: number;
    losses_m3_hr: number;
    closure_pct: number;          // |input - (output + sludge_water + losses)| / input * 100
    within_tolerance: boolean;    // closure_pct < 5%
  };

  // Contaminant balance (g/hr) — unit-normalized to grams for balance calc
  contaminants: {
    [key: string]: {
      mass_in_g_hr: number;
      mass_clean_output_g_hr: number;
      mass_sludge_g_hr: number;
      mass_waste_streams_g_hr: number;
      closure_pct: number;
      within_tolerance: boolean;
    };
  };

  // Reagent check
  reagents: {
    fecl3_dose_mg_per_L?: number;   // Stoichiometrically consistent with As removal
    naoh_dose_mg_per_L?: number;    // Consistent with pH target
    baso4_seed_dose_mg_per_L?: number; // Consistent with Ra-226 co-precipitation
  };

  // Sludge non-zero check
  sludge: {
    total_g_hr: number;
    is_nonzero: boolean;            // MUST be true when any precipitation stage active
    radioactive: boolean;
  };

  // Energy — [R4 GATE 1] TRAIN-SPECIFIC BOUNDS (not a single global range)
  energy_kWh_per_m3: number;
  energy_range_valid: boolean;      // validated against train-specific bounds below:
  // HM-FULL, RAD-COPREC, NI-PRECIP, PB-AS-COPREC: valid range 0.5–5.0 kWh/m³
  // LI-IX (with evaporation/crystallization):       valid range 10–60 kWh/m³
  // Coding LI-IX against 0.5–5.0 produces energy range violation on every simulation tick

  // Overall
  balance_valid: boolean;           // all closure_pct values < 5% AND sludge is_nonzero AND energy_range_valid
}
```

---

## 10. EXTERNAL DATA SOURCE INTEGRATION

| Source | Data Type | API / Method | Update Frequency |
|--------|-----------|--------------|------------------|
| WHO GEMS/Water | Global water quality baselines | Public dataset download | Annual reference data |
| EPA ECHO | US industrial discharge permits | REST API | Baseline reference |
| IAEA PRIS | Nuclear facility locations | Public dataset | Reference (site positions) |
| USGS NWIS | US water quality monitoring | REST API | Real-time (where available) |

**Phase 2 Decision:** Real API data feeds used for site position and baseline contamination profiles only. Real-time telemetry is SIMULATED by the telemetry engine using validated chemistry equations. This avoids API rate limits and ensures continuous animation.

---

## 11. DATA VALIDATION RULES

These rules are enforced at every layer boundary. Any violation triggers a console error and freezes that stage's animation (does not crash the app):

| Rule | Check | Action on Fail |
|------|-------|----------------|
| pH bounds | 0.0 ≤ pH ≤ 14.0 | Clamp + log error |
| pH NaN | !isNaN(pH) | Use last valid value + alert |
| Ra-226 units | ra226_BqL, not mg/L | Throw type error |
| Metal units | pb/as/ni in mg/L, not Bq/L | Throw type error |
| Flow rate positive | flow_rate_Ls > 0 | Use last valid value |
| Output < Input | outlet[param] < inlet[param] | Log chemistry violation |
| Mass balance | closure_pct < 5% | Log warning, flag in telemetry |
| Sludge non-zero | sludge_g_hr > 0 when precip active | Log chemistry violation |
| Turbidity site-specific | use permit_turbidity_NTU, not global default | Enforce at site load |
| [R2] Pb dual mechanism | PB-AS-COPREC uses both Fe floc adsorption + Pb(OH)2 | Log chemistry violation if single mechanism |
| [R2] PB-AS pH floor | pH ≥ 6.0 in reaction chamber | AI Advisor ALERT if pH < 6.2 |
| [AF2] Ni pH floor | pH ≥ 9.2 in Ni reaction chamber | AI Advisor ALERT |
| [R4] LI-IX energy | 10–60 kWh/m³ for LI-IX train | Log range violation |
| [R4] Precip energy | 0.5–5.0 kWh/m³ for precipitation trains | Log range violation |

---

## 12. GATE 1 CORRECTIONS AUDIT — INCORPORATED

| ID | Correction | Train(s) | Location in Doc | Status |
|---|---|---|---|---|
| R1 | pH correction step (pH 10→7–8, CO2) before Ra-226 BaSO4 stage | HM-FULL | Section 4.1, new Stage 9 | ✅ INCORPORATED |
| R2 | Dual Pb mechanism (Fe floc adsorption + Pb(OH)2) + pH floor 6.0 | PB-AS-COPREC | Section 4.4, Stage 2+4 | ✅ INCORPORATED |
| R3 | Coagulation/flocculation + settling before multimedia filter | LI-IX | Section 4.5, Stages 2-4 | ✅ INCORPORATED |
| R4 | Separate energy range: LI-IX 10–60 kWh/m³ | LI-IX | Section 4.5 + Section 9 | ✅ INCORPORATED |
| R5 | Sellafield regulatory reference: EA/ONR (not CNSC) | SITE-006 | Section 5 site object | ✅ INCORPORATED |
| AF1 | LI-IX >90% recovery: over multiple regen cycles, not single pass | LI-IX | Section 4.5, Stage 9 | ✅ NOTED |
| AF2 | Ni(OH)2 re-dissolution: pH floor alert at 9.2 in reaction chamber | NI-PRECIP, HM-FULL | Section 4.3 + 4.1 Stage 7 | ✅ NOTED |
| AF3 | RAD-COPREC peak Ra-226: flag need for polishing pass at inlet >5 Bq/L | RAD-COPREC | Section 4.2, Stage 7 | ✅ NOTED |

---

*PHASE2_DATA_ARCHITECTURE.md | PROJECT AQUA | March 11, 2026*
*Gate 1 corrections R1–R5 and advisory flags AF1–AF3 incorporated. Ready for Phase 3 build.*
