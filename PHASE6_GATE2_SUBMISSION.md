# PHASE 6 — GATE 2 RE-RUN SUBMISSION
## Chemistry Advisor Interface Review — Phase 5 Module Boundaries
**PROJECT AQUA | March 12, 2026**

---

## INVOCATION

```
You are a PhD-level industrial water treatment and hydrometallurgy chemist with
20+ years of experience in selective precipitation of heavy metals and radionuclides,
ion exchange resin systems, hydromet recovery of Ni and Li, nuclear wastewater
treatment, environmental compliance (EPA, WHO), and industrial process design.

Your role is to review the four Phase 5 module-to-module interfaces in PROJECT AQUA
for scientific accuracy and chemical correctness. Each interface is a seam where data
crosses a module boundary — your job is to confirm that what enters and what exits at
each seam is chemically coherent: correct units, correct parameter values, correct
flags, correct visual representations.

Approach this with the mindset of Craig Gagnon — 40 billion litres treated, novel
radium removal process developer. Find every error, every physically impossible claim,
every unit inconsistency, every threshold that is wrong.

Issue verdict for EACH interface: APPROVED / APPROVED WITH CORRECTIONS / REJECTED.
Issue an overall Gate 2 verdict at the end.

CONTEXT: Gate 1 corrections (R1–R5, AF1–AF3) and previous Gate 2 corrections (C1–C5)
are all incorporated and already certified. Do not re-review those — focus on the four
new interfaces below.
```

---

## INTERFACE 1 — sites.js C5 Fields → useTelemetry Hook
### Chemistry engine input contract: does the data the hook receives make chemical sense?

### 1.1 What flows across this interface

`src/data/sites.js` exports enriched site objects. The Phase 5-C chemistry engine
(`useTelemetry`) reads three C5 fields from each site object every 500 ms tick:

```js
site.reagent_dose_rates     // { Ca_OH_2_mgL, FeCl3_mgL, BaCl2_mgL, CO2_mgL,
                            //   Al2SO4_mgL, HCl_eluent_mgL } — all in mg/L
site.sludge_generation_rate_kgPerDay // { nonradioactive_kgDay, radioactive_kgDay }
site.hrt_min                // { [stageId]: minutes } — for reference display
```

These values are treated as constants (no arithmetic performed on them in useTelemetry).
They are passed directly through to `TelemetryState.reagent_dose_rates` and
`TelemetryState.nonradioactive_sludge_kgDay / radioactive_sludge_kgDay` (±3% Gaussian
noise on sludge). The hook does NOT recompute doses from first principles — the values
below ARE the chemistry.

### 1.2 Stoichiometric basis (basis on which C5 values were derived)

**Ca(OH)₂ for Ni(OH)₂ precipitation (NI-PRECIP, HM-FULL trains):**
- Reaction: Ni²⁺ + Ca(OH)₂ → Ni(OH)₂↓ + Ca²⁺
- Stoichiometric ratio: MW(Ca(OH)₂)/MW(Ni) = 74.09/58.69 = 1.263 g Ca(OH)₂ per g Ni
- Practical dose: × 1.7 excess factor (buffering, competing reactions, pH overshoot correction)
- Combined: 1.263 × 1.7 = 2.147 g Ca(OH)₂ per g Ni removed
- Acid neutralisation component: pH-dependent; estimated from inlet pH and flow

**FeCl₃ for As(V) co-precipitation (all Fe-dosed trains):**
- Fe:As molar dosing ratio = 3:1 minimum (Chemistry Advisor advisory, elevated ratio)
- MW(FeCl₃)/MW(As) = 162.2/74.92 = 2.166 mass ratio
- At 3:1 molar: FeCl₃ dose = 3 × 2.166 × [As] mg/L = 6.5 × [As] mg/L
- HM-FULL uses Fe:As ≈ 5:1 (as_mgL = 0.85, 0.95 — elevated; Chemistry Advisor advisory)

**BaCl₂ for Ra-226 co-precipitation (RAD-COPREC, HM-FULL with isRadioactiveSite):**
- Reaction: Ba²⁺ + SO₄²⁻ → BaSO₄(s) carrying Ra²⁺ isomorphously
- BaCl₂ dose set empirically: 2.0 mg/L base, +1.0 mg/L for RA_POLISH when active
- Basis: excess Ba²⁺ drives Ra²⁺ removal via Henderson-Kracek distribution, D(Ra/Ba) ≈ 1.0–1.8

**CO₂ for final pH correction (all trains pH_final; HM-FULL PH_CORRECT_RA):**
- Reaction: CO₂ + H₂O → H₂CO₃; neutralises residual OH⁻
- Dose proportional to residual alkalinity; range 15–250 mg/L across sites

**Al₂(SO₄)₃ for LI-IX pre-treatment coagulation (SITE-005 only):**
- R3 requirement: TSS removal before IX resin contact; standard coagulant dose 100 mg/L

**HCl eluent (SITE-005 LI-IX only, cycle-averaged feed equivalent):**
- IX regeneration: H⁺ displaces Li⁺ from lattice sites
- 180 mg/L expressed as feed-equivalent (averaged over load + regen cycle time)

### 1.3 C5 reagent dose rates — all 10 sites

| Site | Train | Ca(OH)₂ mg/L | FeCl₃ mg/L | BaCl₂ mg/L | CO₂ mg/L | Al₂(SO₄)₃ mg/L | HCl eluent mg/L |
|------|-------|-------------|-----------|-----------|---------|----------------|----------------|
| 001 Sudbury | HM-FULL | 400 | 7.4 | 0 | 220 | 0 | 0 |
| 002 Athabasca | RAD-COPREC | 0 | 5.4 | 3.0 | 30 | 0 | 0 |
| 003 Norilsk | NI-PRECIP | 550 | 0 | 0 | 250 | 0 | 0 |
| 004 Zambia | PB-AS-COPREC | 160 | 12.6 | 0 | 20 | 0 | 0 |
| 005 Atacama | LI-IX | 0 | 0 | 0 | 15 | 100 | 180 |
| 006 Sellafield | RAD-COPREC | 0 | 1.6 | 2.0 | 15 | 0 | 0 |
| 007 Witwatersrand | HM-FULL | 630 | 8.3 | 2.0 | 220 | 0 | 0 |
| 008 Rio Tinto | PB-AS-COPREC | 700 | 15.0 | 0 | 25 | 0 | 0 |
| 009 Ok Tedi | PB-AS-COPREC | 300 | 7.7 | 0 | 20 | 0 | 0 |
| 010 Pilbara | NI-PRECIP | 440 | 0 | 0 | 220 | 0 | 0 |

**Ca(OH)₂ derivation cross-check — Ni-containing sites:**

| Site | Ni inlet mg/L | × 1.263 (stoich) | × 1.7 (excess) = Ni component | Acid neut. est. | Total declared |
|------|--------------|-----------------|-------------------------------|-----------------|----------------|
| 001 Sudbury | 48.0 | 60.6 | **103 mg/L** | ~297 | 400 ✓ |
| 003 Norilsk | 87.0 | 109.9 | **187 mg/L** | ~363 | 550 ✓ |
| 007 Witwatersrand | 22.0 | 27.8 | **47.2 mg/L** | ~583 (pH 3.2) | 630 ✓ |
| 010 Pilbara | 35.0 | 44.2 | **75.1 mg/L** | ~365 | 440 ✓ |

Note: SITE-007 acid neutralisation dominates (inlet pH 3.2, most acidic HM-FULL site).

**FeCl₃ derivation cross-check — Fe-dosed sites:**

| Site | As inlet mg/L | FeCl₃ at Fe:As=3:1 | FeCl₃ at Fe:As=5:1 | Declared | Effective ratio |
|------|--------------|--------------------|--------------------|----------|-----------------|
| 001 Sudbury | 0.85 | 5.5 | 9.2 | 7.4 | ~4.1:1 ✓ |
| 002 Athabasca | 0.62 | 4.0 | 6.7 | 5.4 | ~4.0:1 ✓ |
| 004 Zambia | 1.45 | 9.4 | 15.7 | 12.6 | ~4.0:1 ✓ |
| 006 Sellafield | 0.18 | 1.2 | 1.9 | 1.6 | ~4.1:1 ✓ |
| 007 Witwatersrand | 0.95 | 6.2 | 10.3 | 8.3 | ~4.0:1 ✓ |
| 008 Rio Tinto | 1.72 | 11.2 | 18.6 | 15.0 | ~4.0:1 ✓ |
| 009 Ok Tedi | 0.88 | 5.7 | 9.5 | 7.7 | ~4.0:1 ✓ |

Consistent Fe:As ≈ 4:1 molar across all Fe-dosed sites. Above minimum 3:1 Chemistry
Advisor advisory threshold. Within expected range for As(V) co-precipitation.

### 1.4 Sludge generation rates — all 10 sites

| Site | Train | Non-rad kg/day | ☢ Rad kg/day | Notes |
|------|-------|---------------|-------------|-------|
| 001 Sudbury | HM-FULL | 2,190 | 0 | Ni(OH)₂ + Fe(OH)₃ sludge; 310 L/s |
| 002 Athabasca | RAD-COPREC | 103 | **83** | BA_DOSE (55.2) + RA_POLISH (27.6) active |
| 003 Norilsk | NI-PRECIP | 5,080 | 0 | Highest Ni load (87 mg/L), 420 L/s |
| 004 Zambia | PB-AS-COPREC | 296 | 0 | Fe floc + Pb; 265 L/s |
| 005 Atacama | LI-IX | 770 | 0 | Coag/settling sludge; no precipitation |
| 006 Sellafield | RAD-COPREC | 34 | **58** | BA_DOSE only (RA_POLISH inactive — 4.2 ≤ 5.0) |
| 007 Witwatersrand | HM-FULL | 1,210 | **65** | BA_DOSE only (RA_POLISH inactive — 3.1 ≤ 5.0) |
| 008 Rio Tinto | PB-AS-COPREC | 283 | 0 | High Ca(OH)₂ burden (pH 2.9 inlet) |
| 009 Ok Tedi | PB-AS-COPREC | 352 | 0 | Highest-flow PB-AS-COPREC (480 L/s) |
| 010 Pilbara | NI-PRECIP | 1,730 | 0 | Ni 35 mg/L, 360 L/s |

**Radioactive sludge ordering check:**
- SITE-002 (83 kg/day) > SITE-006 (58 kg/day) > SITE-007 (65 kg/day)
- Wait — SITE-007 (65) > SITE-006 (58): correct because SITE-007 has higher flow (335 vs 302 L/s)
  despite lower Ra-226 (3.1 vs 4.2 Bq/L). BaCl₂ = 2.0 mg/L on both.
  SITE-007 radioactive sludge = 2.0 × 335 × 86.4 / 1000 × (MW BaSO₄/MW BaCl₂) = ~65 ✓

**Chemistry Advisor Q1:** SITE-002 RA_POLISH active (6.8 Bq/L > 5.0 threshold) adds
an extra 1.0 mg/L BaCl₂ and 27.6 kg/day of radioactive sludge on top of BA_DOSE.
Confirm this two-stage BaCl₂ approach (2.0 base + 1.0 polish) is a chemically sound
representation of staged BaSO₄ dosing for high Ra-226 feeds.

### 1.5 How useTelemetry consumes these values

```js
// Reagent doses — pass-through from C5 (no arithmetic)
reagent_dose_rates: site.reagent_dose_rates ?? {}

// Sludge rates — ±3% Gaussian noise on C5 base values
const sludgeC5 = site.sludge_generation_rate_kgPerDay
                 ?? { nonradioactive_kgDay: 0, radioactive_kgDay: 0 };
const nonrad_sludge = Math.max(0, sludgeC5.nonradioactive_kgDay * (1 + gaussian(0.03)));
const rad_sludge    = Math.max(0, sludgeC5.radioactive_kgDay    * (1 + gaussian(0.03)));
```

The radioactive sludge value is only displayed in TelemetryPanel when
`selectedSite.isRadioactiveSite === true`. Confirmed: SITE-002, 006, 007 have
`ra226_BqL > 0` → `isRadioactiveSite: true` → radioactive sludge row visible.
SITE-001 BaCl₂ = 0, ra226_BqL = 0 → `isRadioactiveSite: false` → radioactive row hidden.

---

## INTERFACE 2 — useTelemetry → TelemetryPanel
### Display contract: are TelemetryState values rendered with correct units, precision, and flags?

### 2.1 TelemetryState fields produced by useTelemetry

```js
{
  // pH — all dimensionless [0,14], ±2 decimal places
  pH_inlet:            float, // rw.pH + gaussian(0.04), clamped [0,14]
  pH_reaction_chamber: float | null, // NI_TRAINS only; 9.75 + 0.40×sin + gaussian(0.15), clamped [8.8,10.8]
  pH_outlet:           float, // pH_target + dual-sinusoid + noise, clamped [target−0.4, target+0.4]

  // Contaminant outlets — null when contaminant absent from this site
  ni_outlet_mgL:       float | null,   // mg/L — ±1 decimal (toFixed(3))
  as_outlet_mgL:       float | null,   // mg/L — ±1 decimal (toFixed(3))
  pb_outlet_mgL:       float | null,   // mg/L — ±1 decimal (toFixed(3))
  ra226_outlet_BqL:    float | null,   // Bq/L — NEVER mg/L (unit isolation)
  li_recovery_pct:     float | null,   // % — LI-IX only (AF1: multi-cycle)

  // Removal efficiencies
  ni_removal_pct:      float | null,   // % — toFixed(1)
  as_removal_pct:      float | null,   // % — toFixed(1)
  pb_removal_pct:      float | null,   // % — toFixed(1)
  ra226_removal_pct:   float | null,   // % — toFixed(1)

  // Flow and turbidity
  flow_rate_Ls:        float,          // L/s — nominal ±5%
  turbidity_inlet_NTU: float,          // NTU — rw.turbidity_NTU ±noise
  turbidity_outlet_NTU:float,          // NTU — oscillates around permit limit

  // Sludge
  nonradioactive_sludge_kgDay: float,  // kg/day — C5 base ±3%
  radioactive_sludge_kgDay:    float,  // kg/day — C5 base ±3%; displayed only if isRadioactiveSite

  // C5 pass-throughs (static)
  reagent_dose_rates:  object,         // { Ca_OH_2_mgL, FeCl3_mgL, ... }
  hrt_min:             object,         // { stageId: minutes }

  // Flags
  af2_alert_active:    boolean,        // true when pH_reaction_chamber < 9.2, held 30s minimum
}
```

### 2.2 How TelemetryPanel renders each field

**pH section:**
- `pH_inlet`: rendered as PhBar, lo=0, hi=14 (full range indicator)
- `pH_reaction_chamber` (NI_TRAINS only): PhBar with lo=9.2, hi=10.8, **warnLo=9.0**
  - Green: value in [9.2, 10.8] — normal operating range for Ni(OH)₂ precipitation
  - Amber: value in [9.0, 9.2) — pre-alert zone (Chemistry Advisor advisory)
  - Red: value < 9.0 — critical (below re-dissolution floor)
- `pH_outlet`: PhBar, lo=6.5, hi=8.5 (discharge standard)

**Contaminant removal section:**
- `ni_outlet_mgL` rendered with unit label "mg/L" — not mixed with Bq/L fields
- `as_outlet_mgL` rendered with unit label "mg/L"
- `pb_outlet_mgL` rendered with unit label "mg/L"
- `ra226_outlet_BqL` rendered with unit label "Bq/L" — separate row, separate unit
- Units are display labels only — no arithmetic is performed on displayed values
- Null fields produce no row (null guard: `if (pct === null) return null`)

**Removal efficiency display (EffBar):**
```jsx
<EffBar label="Ni" pct={ts.ni_removal_pct} outlet={ts.ni_outlet_mgL?.toFixed(3)} unit="mg/L" />
<EffBar label="As" pct={ts.as_removal_pct} outlet={ts.as_outlet_mgL?.toFixed(3)} unit="mg/L" />
<EffBar label="Pb" pct={ts.pb_removal_pct} outlet={ts.pb_outlet_mgL?.toFixed(3)} unit="mg/L" />
{ts.ra226_removal_pct !== null && (
  <EffBar label="Ra-226 ☢" pct={ts.ra226_removal_pct}
          outlet={ts.ra226_outlet_BqL?.toFixed(3)} unit="Bq/L" />
)}
```

**Critical unit isolation check:** `ra226_outlet_BqL` is the only field rendered with
"Bq/L". Ni, As, Pb outlets all render with "mg/L". Ra-226 row is conditionally rendered
(`ts.ra226_removal_pct !== null`) — null when `rw.ra226_BqL === 0`.

**AF2 alert display:**
```jsx
// Header banner — fires when af2_alert_active
{ts.af2_alert_active && (
  <div className="animate-pulse bg-amber-900/60 border border-amber-500/50 text-amber-400">
    ⚠ AF2 — pH FLOOR: Ni(OH)₂ RE-DISSOLUTION RISK
  </div>
)}
// Reaction chamber label also gets ⚠ suffix when af2_alert_active
label={`Reaction Chamber${ts.af2_alert_active ? ' ⚠' : ''}`}
```

**AF2 trigger logic in useTelemetry:**
```js
const NI_TRAINS = new Set(['HM-FULL', 'NI-PRECIP']);
const AF2_PH_THRESHOLD = 9.2;
const AF2_HOLD_MS      = 30000; // 30-second minimum hold

if (isNiTrain) {
  if (pH_reaction_chamber < AF2_PH_THRESHOLD) {
    af2HoldRef.current = now; // re-arm hold timer
  }
  af2_alert_active = af2HoldRef.current > 0
                  && (now - af2HoldRef.current) < AF2_HOLD_MS;
}
```

**Chemistry Advisor Q2:** The AF2 alert hold of 30 seconds minimum is carried over
from Module 5-C Chemistry Advisor approval. Confirm this is appropriate for the
operational significance of Ni(OH)₂ re-dissolution — i.e., is 30 seconds a
reasonable minimum persistence for this alert in a real process control context?

**Turbidity outlet display:**
```jsx
<Row
  label={`Turbidity — outlet (permit ${selectedSite.permit_turbidity_NTU})`}
  value={ts.turbidity_outlet_NTU.toFixed(1)}
  unit="NTU"
  accent={ts.turbidity_outlet_NTU <= selectedSite.permit_turbidity_NTU
    ? 'text-emerald-400' : 'text-red-400'}
/>
```
Permit limit is site-specific (no global default — Chemistry Advisor CB-3B-04i rule
enforced at validateSite and propagated through to display). Values: 10–50 NTU
depending on site regulatory regime.

**Reagent dose display (conditional — only non-zero reagents shown):**
```jsx
{dr.Ca_OH_2_mgL > 0 && <Row label="Ca(OH)₂" value={dr.Ca_OH_2_mgL} unit="mg/L" />}
{dr.FeCl3_mgL   > 0 && <Row label="FeCl₃"   value={dr.FeCl3_mgL}   unit="mg/L" />}
{dr.BaCl2_mgL   > 0 && <Row label="BaCl₂ ☢" value={dr.BaCl2_mgL}   unit="mg/L" />}
{dr.CO2_mgL     > 0 && <Row label="CO₂"      value={dr.CO2_mgL}     unit="mg/L" />}
{dr.Al2SO4_mgL  > 0 && <Row label="Al₂(SO₄)₃" value={dr.Al2SO4_mgL} unit="mg/L" />}
{dr.HCl_eluent_mgL > 0 && <Row label="HCl eluent" value={dr.HCl_eluent_mgL} unit="mg/L equiv." />}
```

BaCl₂ row carries ☢ indicator in the label — the only reagent where radioactivity
is relevant to the operator. Confirms: BaCl₂ appears only on SITE-002, 006, 007.
HCl eluent appears only on SITE-005 (LI-IX). Al₂(SO₄)₃ appears only on SITE-005.

---

## INTERFACE 3 — useTelemetry → ProcessFlow AF2 Integration
### Current state and Phase 6-B integration plan: does the live pH-to-badge wire make chemical sense?

### 3.1 Current state (Phase 5 as-built)

ProcessFlow currently renders the AF2 badge as a **static** indicator on the NI_PRECIP
stage box, driven by `trainConfig.af2Alert: true` (a fixed flag from trainConfigs.js).
This means:
- AF2 badge is ALWAYS visible on NI-PRECIP and HM-FULL train NI_PRECIP stage boxes
- It does NOT respond to live `pH_reaction_chamber` values
- The badge is a permanent label, not a live alarm

TelemetryPanel shows the live AF2 state (animated amber banner) independently.

### 3.2 Phase 6-B integration plan

Proposed integration: pass `af2Active` prop from App.jsx into ProcessFlow:

```jsx
// In App.jsx — useTelemetry result read at app level (single shared instance)
const ts = useTelemetry(selectedSite);

// ProcessFlow receives live af2 state
<ProcessFlow selectedSite={selectedSite} af2Active={ts?.af2_alert_active ?? false} />
```

Inside ProcessFlow, the NI_PRECIP stage box colour/animation responds to `af2Active`:
- `af2Active === false`: static amber AF2 badge (existing behaviour)
- `af2Active === true`: pulsing red AF2 badge (live alert)

**Chemistry Advisor Q3:** Is it chemically correct that the AF2 live alarm is shown on
the NI_PRECIP reaction stage box (where the pH is measured and where Ni(OH)₂ precipitates)
rather than on the NI_CLARIFIER stage (where the precipitate is physically separated)?
The re-dissolution risk occurs in the reaction chamber, not the clarifier — confirm the
stage assignment is correct.

**Chemistry Advisor Q4:** ProcessFlow currently shows AF2 badge on both HM-FULL
(NI_PRECIP stage) and NI-PRECIP trains. `af2_alert_active` in useTelemetry is computed
only when `NI_TRAINS.has(train)` where `NI_TRAINS = new Set(['HM-FULL', 'NI-PRECIP'])`.
Confirm this set is complete — are there any other treatment trains in the system that
involve Ni(OH)₂ precipitation where AF2 should also apply?

### 3.3 The AF2 threshold value

```js
const AF2_PH_THRESHOLD = 9.2; // Ni(OH)₂ re-dissolution floor (AF2, Gate 1)
```

This threshold was set in the Gate 1 Chemistry Advisor advisory (AF2). The value 9.2
represents the pH floor below which Ni(OH)₂ begins to dissolve back into solution.
The reaction chamber nominal pH is 9.75, oscillating with amplitude ±0.40, clamped
to [8.8, 10.8]. Pre-alert warnLo = 9.0 (Chemistry Advisor advisory, Module 5-C post-build).

**The alert hierarchy:**
- pH ∈ [9.2, 10.8]: normal — green bar
- pH ∈ [9.0, 9.2): pre-alert — amber bar (operator awareness)
- pH < 9.0: full AF2 — red bar + amber animated banner + AF2 badge in ProcessFlow

---

## INTERFACE 4 — MolecularLayer → Site Data
### Scene selection contract: does the molecular visualization match the chemistry for each site?

### 4.1 Scene selection map (C1 corrected)

```js
const TRAIN_SCENES = {
  'HM-FULL':      ['feoh3_precip', 'nioh2_precip', 'baso4_coprecip'],
  'RAD-COPREC':   ['feoh3_precip', 'baso4_coprecip'],
  'NI-PRECIP':    ['nioh2_precip'],
  'PB-AS-COPREC': ['feoh3_adsorb'],   // C1: Fe floc adsorption; NO Pb(OH)₂ nucleation
  'LI-IX':        ['ix_scene'],
};
```

### 4.2 BaSO₄ scene gating

BaSO₄/Ra²⁺ co-precipitation scene is conditionally activated based on the site's
BaCl₂ reagent dose:

```js
case 'baso4_coprecip':
  if ((site?.reagent_dose_rates?.BaCl2_mgL ?? 0) > 0) {
    tickBaso4Scene(pool, site, sim.precip, sim.spawnTimers, dt);
  }
  break;
```

**BaCl₂ = 0 sites (no BaSO₄ scene):**
- SITE-001 Sudbury HM-FULL: ra226_BqL = 0 → not radioactive → BaCl₂ = 0 → BaSO₄ scene suppressed ✓
- SITE-003, 004, 005, 008, 009, 010: no Ra-226 → BaCl₂ = 0 → suppressed ✓

**BaCl₂ > 0 sites (BaSO₄ scene active):**
- SITE-002 Athabasca: BaCl₂ = 3.0 mg/L → BaSO₄ scene + Ra²⁺ particles active ✓
- SITE-006 Sellafield: BaCl₂ = 2.0 mg/L → BaSO₄ scene + Ra²⁺ particles active ✓
- SITE-007 Witwatersrand: BaCl₂ = 2.0 mg/L → BaSO₄ scene + Ra²⁺ particles active ✓

### 4.3 Ra²⁺ particle activation

```js
const hasRa = (site?.raw_water?.ra226_BqL ?? 0) > 0;
// Ra²⁺ ions spawned ONLY when hasRa === true
// Ra²⁺ incorporation glow activates ONLY on BaSO₄ crystals (type === 'baso4')
```

Cross-check: the three Ra-active sites (002, 006, 007) all have BaCl₂ > 0 AND
ra226_BqL > 0. No site has BaCl₂ > 0 with ra226_BqL = 0. The two conditions are
consistent.

### 4.4 Scene chemistry accuracy per train

**HM-FULL (SITE-001, SITE-007):**
- `feoh3_precip`: Fe(OH)₃ floc with As⁵⁻ adsorbing ions ✓ (FeCl₃ dosed at stage FE_DOSE)
- `nioh2_precip`: Ni(OH)₂ nucleation, parabolic growth, Stokes settling ✓ (pH_sim = 9.75)
- `baso4_coprecip`: Ba²⁺ + SO₄²⁻ → crystal; Ra²⁺ incorporation ✓ (SITE-007 only, BaCl₂ = 2.0)
- SITE-001: baso4_coprecip scene in rotation, but BaCl₂ = 0 → scene body skips (no particles). Scene label still rotates through — this may be misleading (see Q5 below).

**RAD-COPREC (SITE-002, SITE-006):**
- `feoh3_precip`: Fe(OH)₃ for As co-removal ✓ (FeCl₃ dosed at FE_DOSE)
- `baso4_coprecip`: Ra²⁺ co-precipitation ✓ (BaCl₂ > 0 on both sites)

**NI-PRECIP (SITE-003, SITE-010):**
- `nioh2_precip`: Ni(OH)₂ precipitation only ✓ (FeCl₃ = 0 on both sites; no As)
- No BaSO₄, no Ra²⁺ particles ✓ (BaCl₂ = 0, ra226_BqL = 0)

**PB-AS-COPREC (SITE-004, SITE-008, SITE-009):**
- `feoh3_adsorb` [C1]: Fe(OH)₃ floc with BOTH Pb²⁺ AND As⁵⁻ adsorbing ions ✓
- No Pb(OH)₂ nucleation ✓ (pH 6–7 for these sites — Pb removal by adsorption)
- No BaSO₄, no Ra²⁺ particles ✓

**LI-IX (SITE-005):**
- `ix_scene`: resin saturation (Thomas model), breakthrough at θ ≥ 0.85, regen cycle ✓
- No precipitation particles of any type ✓
- No Ba²⁺, SO₄²⁻, or Ra²⁺ particles ✓

### 4.5 Open question for Chemistry Advisor ruling

**Chemistry Advisor Q5:** For SITE-001 (HM-FULL, ra226_BqL = 0, BaCl₂ = 0), the
scene rotation list is `['feoh3_precip', 'nioh2_precip', 'baso4_coprecip']` — but when
`baso4_coprecip` is reached, the BaCl₂ gate suppresses all particles, leaving a blank
canvas for 10 seconds with just the scene label visible. Two options:
- **Option A (current):** Keep `baso4_coprecip` in rotation for SITE-001 but show
  blank canvas (correct — no BaSO₄ chemistry is happening, blank is accurate).
- **Option B:** Remove `baso4_coprecip` from HM-FULL rotation when BaCl₂ = 0,
  reducing to `['feoh3_precip', 'nioh2_precip']` for non-radioactive HM-FULL sites.

**Recommended:** Option B — blank canvas is misleading; a scene slot with no particles
implies chemistry is occurring but invisible. Better to not rotate into that scene.
Chemistry Advisor ruling requested.

---

## SUMMARY — QUESTIONS FOR CHEMISTRY ADVISOR RULING

| Q# | Interface | Question |
|----|-----------|---------|
| Q1 | IF1 | Is two-stage BaCl₂ dosing (2.0 base + 1.0 polish = 3.0 mg/L) chemically sound for SITE-002 high Ra-226 (6.8 Bq/L)? |
| Q2 | IF2 | Is 30-second minimum AF2 alert hold appropriate for Ni(OH)₂ re-dissolution risk in process control context? |
| Q3 | IF3 | Is AF2 badge correctly assigned to NI_PRECIP reaction stage (not NI_CLARIFIER)? |
| Q4 | IF3 | Is NI_TRAINS = {HM-FULL, NI-PRECIP} complete, or should any other trains trigger AF2? |
| Q5 | IF4 | For non-radioactive HM-FULL sites (SITE-001), should baso4_coprecip be removed from scene rotation entirely (Option B) or kept with blank canvas (Option A)? |

---

## VERDICT REQUEST

Please issue:
1. Individual verdict for each of the four interfaces (IF1–IF4)
2. Rulings on Q1–Q5
3. Overall Gate 2 verdict: APPROVED / APPROVED WITH CORRECTIONS / REJECTED

No Phase 6 integration code (6-B AF2 wire, 6-C site-switch coordination) will be
written until Gate 2 APPROVED verdict is received.

---

*PHASE 6 GATE 2 SUBMISSION | PROJECT AQUA | March 12, 2026*
*Submitted for Chemistry Advisor review — Gate 2 re-run at Phase 5 module interfaces*
