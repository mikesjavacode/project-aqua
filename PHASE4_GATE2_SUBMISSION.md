# PROJECT AQUA — PHASE 4 GATE 2 SUBMISSION
## Chemistry Advisor Review #2 + System Gate 2 Interface Reviews

**Date:** March 11, 2026
**Submitted by:** Build Agent (Claude Code)
**Receiving:** Chemistry Advisor (Claude Desktop)
**Status:** AWAITING VERDICT — no Phase 5 code written until Gate 2 APPROVED

---

## CHEMISTRY ADVISOR SYSTEM PROMPT

```
You are a PhD-level industrial water treatment and hydrometallurgy chemist with
20+ years of experience in selective precipitation of heavy metals and radionuclides,
ion exchange resin systems, hydromet recovery of Ni and Li, nuclear wastewater
treatment, and environmental compliance (EPA, WHO, IAEA, EA/ONR).

Your role in this review is twofold:

PART A — Chemistry Advisor Review #2:
Review the complete Phase 3 build output as a unified data pipeline. This is the
first time you are seeing all three modules (3-A globe, 3-B site markers, 3-C data
handoff) running as a connected system. Verify that the chemistry data flowing
through this pipeline — from raw inlet concentrations through severity scoring,
visual encoding, validation, and AI Advisor formatting — is scientifically defensible
at every step. Approach this as Craig Gagnon reviewing a simulation system before
trusting it to represent his 40-billion-litre body of treatment work.

PART B — System Gate 2 (Four Interface Reviews):
Review each of the four module-to-module interfaces in the Phase 3 build. For each
seam, verify: stream compatibility (does the outlet of module N match the inlet
specification of module N+1?), unit consistency (no Bq/L-to-mg/L crossing, no
dimensionless confusion), data completeness (no fields dropped or defaulted at the
seam), and scientific accuracy of any chemistry computation happening at or near
the seam.

Issue a verdict for EACH seam independently:
  APPROVED / APPROVED WITH CORRECTIONS / REJECTED — REBUILD

Then issue an OVERALL GATE 2 VERDICT for the system as a whole.

Corrections must be specific: what field, what value, what the error is, what the
correct behaviour should be. Do not issue an APPROVED verdict if any chemistry
concern remains unresolved.
```

---

## SYSTEM OVERVIEW — PHASE 3 COMPLETE BUILD

Phase 3 produced a running Three.js globe with 10 global industrial water treatment
sites, contamination plumes colour-coded by chemistry severity, radioactive site
markers, and a validated data pipeline feeding downstream layers.

### Files in scope for Gate 2

| File | Module | Role |
|------|--------|------|
| `src/data/sites.js` | 3-B data layer | Raw site data, validation, severity computation, enrichment |
| `src/components/globe/SiteMarkers.jsx` | 3-B renderer | Plume colour + ring rendering from enriched data |
| `src/hooks/useSelectedSite.js` | 3-C | Selection state + second-layer validation gate |
| `src/data/advisorFormat.js` | 3-C | `buildAdvisorTelemetry()` — AI Advisor prompt package |

---

## PART A — CHEMISTRY ADVISOR REVIEW #2: COMPLETE DATA PIPELINE

### A1. End-to-End Data Flow

```
AQUA_SITES_RAW (10 sites — raw inlet concentrations)
    │
    ▼
validateSite(site)                              [sites.js]
    │  Checks: pH bounds [0,14], concentrations ≥ 0, unit field names,
    │  range bounds (Ra-226 ≤ 10, Pb ≤ 5, As ≤ 2, Ni ≤ 100),
    │  flow_rate > 0, permit_turbidity_NTU present
    │  → If invalid: site marked validationError:true, grey plume rendered
    │
    ▼
enrichSite(site)                                [sites.js]
    │  Adds:
    │    plumeIntensity  — dimensionless 0.0–1.0 (C1 log severity scaling)
    │    isRadioactiveSite — boolean (C3: ra226_BqL > 0)
    │    validationError: false
    │
    ▼
AQUA_SITES (exported — all 10 pass validation)  [sites.js]
    │
    ▼
SiteMarkers.jsx (Module 3-B)                    [Three.js renderer]
    │  Reads plumeIntensity → intensityToColor() → plume colour
    │  Reads isRadioactiveSite → magenta TorusGeometry ring (C3)
    │  Renders teal sphere markers (all sites, always teal)
    │  On click: fires onSiteSelect(site)
    │
    ▼
handleSiteSelect(site) in App.jsx
    │
    ▼
selectSite(site) — useSelectedSite hook         [useSelectedSite.js, 3-C]
    │  BLOCKING checks (5): validationError, flow_rate, permit_turbidity,
    │    ra226_mgL unit error, unknown treatment_train
    │  NON-BLOCKING clamps (3): pH [0,14]/NaN, concentrations ≥ 0,
    │    ra226_BqL ≤ 10.0
    │  → Sets selectedSite (null if blocked)
    │
    ▼
selectedSite                                    [React state, App.jsx]
    │  Full enriched AquaSite — available to all downstream consumers
    │
    ├──► Layer 2 (Process Flow — Phase 5)
    │      consumes: selectedSite.treatment_train → schematic selection
    │                selectedSite.raw_water       → particle colour/flow state
    │
    ├──► Layer 4 (Telemetry Engine — Phase 5)
    │      consumes: selectedSite.raw_water          → inlet concentrations
    │                selectedSite.treatment_targets  → outlet targets
    │                selectedSite.flow_rate_nominal_Ls → flow telemetry
    │
    └──► Layer 5 (AI Advisor — Phase 7)
           consumes: buildAdvisorTelemetry(selectedSite)
                     → AIAdvisorPromptPackage (named params with units)
```

---

### A2. Severity Computation — C1 Log Scaling (sites.js)

**Request for Chemistry Advisor review:** Is the log10-severity approach scientifically sound for visual risk communication? Do the computed intensities produce meaningful differentiation between sites?

```javascript
// src/data/sites.js

const LIMITS = {
  RA226_BQL:  0.185,   // EPA MCL — Bq/L
  PB_MGL:     0.01,    // EPA action level — mg/L
  AS_MGL:     0.01,    // EPA MCL — mg/L
  NI_MGL:     0.1,     // WHO guideline — mg/L
};

const LOG_SCALE_MAX = 3.0;  // 1000× exceedance = intensity 1.0

function computeContaminantSeverity(concentration, limit) {
  if (concentration == null || concentration <= 0 || limit <= 0) return 0;
  const exceedanceRatio = concentration / limit;
  if (exceedanceRatio <= 1) return 0;
  return Math.log10(exceedanceRatio); // 10× → 1.0, 100× → 2.0, 1000× → 3.0
}

export function computePlumeIntensity(rawWater) {
  const logSeverities = [];

  if (rawWater.ra226_BqL != null)
    logSeverities.push(computeContaminantSeverity(rawWater.ra226_BqL, LIMITS.RA226_BQL));
  if (rawWater.pb_mgL != null)
    logSeverities.push(computeContaminantSeverity(rawWater.pb_mgL, LIMITS.PB_MGL));
  if (rawWater.as_mgL != null)
    logSeverities.push(computeContaminantSeverity(rawWater.as_mgL, LIMITS.AS_MGL));
  if (rawWater.ni_mgL != null)
    logSeverities.push(computeContaminantSeverity(rawWater.ni_mgL, LIMITS.NI_MGL));
  // Li EXCLUDED — recovery target, not remediation limit

  // pH — deviation from neutral scaled to LOG_SCALE_MAX space
  if (rawWater.pH != null && !isNaN(rawWater.pH)) {
    const pHLogSeverity = (Math.abs(rawWater.pH - 7.0) / 7.0) * LOG_SCALE_MAX;
    logSeverities.push(pHLogSeverity);
  }

  if (logSeverities.length === 0) return 0;
  const maxLogSeverity = Math.max(...logSeverities);
  return Math.min(1.0, Math.max(0, maxLogSeverity / LOG_SCALE_MAX));
}
```

**Computed plumeIntensity for all 10 sites — dominant driver identified:**

| Site | Location | Dominant Contaminant | Exceedance | Log Severity | plumeIntensity | Plume Colour |
|------|----------|---------------------|------------|-------------|----------------|-------------|
| SITE-001 | Sudbury, Canada | Ni: 48 mg/L (480× limit) | 480× | 2.681 | **0.894** | RED |
| SITE-002 | Athabasca, Canada | As: 0.62 mg/L (62× limit) | 62× | 1.792 | **0.597** | AMBER |
| SITE-003 | Norilsk, Russia | Ni: 87 mg/L (870× limit) | 870× | 2.939 | **0.980** | RED |
| SITE-004 | Zambia | Pb: 3.2 mg/L (320× limit) | 320× | 2.505 | **0.835** | RED |
| SITE-005 | Atacama, Chile | pH 7.1 only (Li excluded) | — | 0.043 | **0.014** | TEAL |
| SITE-006 | Sellafield, UK | Ra-226: 4.2 Bq/L (22.7× limit) | 22.7× | 1.356 | **0.452** | AMBER |
| SITE-007 | Witwatersrand, SA | Ni: 22 mg/L (220× limit) | 220× | 2.342 | **0.781** | RED |
| SITE-008 | Rio Tinto, Spain | Pb: 1.85 mg/L (185× limit) | 185× | 2.267 | **0.756** | RED |
| SITE-009 | Ok Tedi, PNG | Pb: 2.60 mg/L (260× limit) | 260× | 2.415 | **0.805** | RED |
| SITE-010 | Pilbara, Australia | Ni: 35 mg/L (350× limit) | 350× | 2.544 | **0.848** | RED |

**Note on SITE-002 (Athabasca):** Ra-226 is 6.8 Bq/L (36.8× limit, log severity 1.566) but As at 0.62 mg/L (62× limit, log severity 1.792) drives the intensity. This is scientifically correct — As presents the greater proportional exceedance. Ra-226 is flagged separately via `isRadioactiveSite` and the magenta ring regardless of which contaminant drives the plume colour.

**Note on SITE-005 (Atacama):** Li at 1850 mg/L is excluded from severity (recovery target, not remediation). The near-neutral pH (7.1) produces a near-zero intensity (0.014), rendering a teal plume. This is the correct visual representation: Li recovery brine is not a contamination scenario.

---

### A3. Colour Encoding — C2 Thresholds (SiteMarkers.jsx)

**Request for Chemistry Advisor review:** Do the colour threshold boundaries correctly communicate risk gradient to a non-specialist viewer?

```javascript
// src/components/globe/SiteMarkers.jsx

const COLOR_STOPS = [
  { at: 0.00, color: new THREE.Color(0x00CED1) }, // teal   — within/near limit
  { at: 0.15, color: new THREE.Color(0xFFD700) }, // yellow — low exceedance (~1.4× limit)
  { at: 0.35, color: new THREE.Color(0xFF8C00) }, // amber  — moderate exceedance (~10× limit)
  { at: 0.65, color: new THREE.Color(0xFF2200) }, // red    — high exceedance (~100× limit)
  { at: 1.00, color: new THREE.Color(0xFF2200) }, // red    — extreme (≥ 1000× limit)
];

// Continuous lerp between stops — no hard colour jumps
function intensityToColor(intensity) {
  const t = Math.min(1, Math.max(0, intensity));
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const lo = COLOR_STOPS[i];
    const hi = COLOR_STOPS[i + 1];
    if (t <= hi.at) {
      const alpha = (t - lo.at) / (hi.at - lo.at);
      return lo.color.clone().lerp(hi.color, alpha);
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1].color.clone();
}

// Applied in buildSiteObjects:
const plumeColor = site.validationError
  ? new THREE.Color(0x888888)      // grey — data error
  : intensityToColor(site.plumeIntensity);
```

**Colour–exceedance correspondence (approximate):**

| Colour | Intensity range | Log severity range | Approx. exceedance multiple |
|--------|----------------|-------------------|---------------------------|
| Teal | 0.00 – 0.15 | 0.00 – 0.45 | ≤ 2.8× limit |
| Yellow | 0.15 – 0.35 | 0.45 – 1.05 | 2.8× – 11× limit |
| Amber | 0.35 – 0.65 | 1.05 – 1.95 | 11× – 89× limit |
| Red | 0.65 – 1.00 | 1.95 – 3.00 | 89× – 1000× limit |

---

### A4. Radioactive Site Flag — C3 (sites.js + SiteMarkers.jsx)

```javascript
// sites.js — enrichSite
isRadioactiveSite: (site.raw_water.ra226_BqL ?? 0) > 0,  // any Ra-226 presence

// SiteMarkers.jsx — ring rendered only for radioactive sites
if (site.isRadioactiveSite) {
  const ringGeo = new THREE.TorusGeometry(plumeRadius * 1.25, plumeRadius * 0.06, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xFF00FF,  // magenta
    transparent: true, opacity: 0.75, depthWrite: false,
  });
  // Ring oriented to face outward from globe centre, pulsing independently
}
```

**Radioactive sites (ra226_BqL > 0):**
- SITE-002 Athabasca: 6.8 Bq/L → `isRadioactiveSite: true` ✓ magenta ring
- SITE-006 Sellafield: 4.2 Bq/L → `isRadioactiveSite: true` ✓ magenta ring
- SITE-007 Witwatersrand: 3.1 Bq/L → `isRadioactiveSite: true` ✓ magenta ring
- All other sites: 0.0 Bq/L → `isRadioactiveSite: false` ✓ no ring

**Chemistry Advisor review question:** Is the C3 threshold correct — any Ra-226 presence (`> 0`) — or should there be a de minimis floor (e.g., > 0.01 Bq/L) below which the radioactive ring would be misleading? The current threshold follows the Chemistry Advisor's approved correction: "any ra226_BqL > 0."

---

---

## PART B — SYSTEM GATE 2: FOUR INTERFACE REVIEWS

---

## SEAM G2-01: Module 3-A → Module 3-B

### What crosses this seam

Three.js scene infrastructure: `scene`, `camera`, `renderer`. No chemistry crosses this seam. This review is architectural — confirming the Three.js substrate is in correct state for marker injection.

### How the handoff works

```javascript
// GlobeScene.jsx (Module 3-A) — fires once when Three.js scene is ready
onSceneReady({
  scene,     // THREE.Scene — earth mesh, stars, atmosphere already added
  camera,    // THREE.PerspectiveCamera — positioned at z=2.5
  renderer,  // THREE.WebGLRenderer — canvas in DOM, antialiased
});

// App.jsx — stores and passes to SiteMarkers
const [sceneData, setSceneData] = useState(null);
const handleSceneReady = useCallback((data) => { setSceneData(data); }, []);

// SiteMarkers mounts only when sceneData is non-null
{sceneData && (
  <SiteMarkers
    scene={sceneData.scene}
    camera={sceneData.camera}
    renderer={sceneData.renderer}
    onSiteSelect={handleSiteSelect}
  />
)}

// SiteMarkers.jsx (Module 3-B) — receives and injects into scene
useEffect(() => {
  if (!scene || !camera || !renderer) return;
  AQUA_SITES.forEach(buildSiteObjects);  // adds marker/plume/ring meshes to scene
  // ...
}, [scene, camera, renderer]);
```

### Chemistry Advisor assessment requested

- Confirms: no chemistry data passes this seam — this is a rendering substrate handoff only.
- Verdict scope: architectural correctness, not chemistry.

---

## SEAM G2-02: Module 3-B → Module 3-C

### What crosses this seam

The full enriched `AquaSite` object, fired via `onSiteSelect(site)` on globe click.
This is the first seam where chemistry data moves from the renderer into the data pipeline.

### The AquaSite object at this seam

The object passed to `onSiteSelect` is the enriched site from `AQUA_SITES`. Full structure for a representative radioactive site (SITE-002 Athabasca):

```javascript
// What Module 3-B fires to Module 3-C on click:
{
  // Identity
  site_id:               'SITE-002',
  name:                  'Athabasca Uranium Legacy — Saskatchewan',
  country:               'Canada',
  archetype:             'ARCH-02',
  source_type:           'mine_drainage',
  regulatory_regime:     'MIXED',

  // Geography
  coordinates:           { lat: 58.60, lon: -109.40 },
  globe_plume_radius_km: 50,

  // Operational
  flow_rate_nominal_Ls:  285,
  flow_rate_peak_Ls:     490,
  permit_turbidity_NTU:  15,         // site-specific — no global default
  treatment_train:       'RAD-COPREC',

  // Raw inlet concentrations — ALL in correct unit-safe fields
  raw_water: {
    ra226_BqL:     6.8,   // Bq/L — ALWAYS this field name, NEVER ra226_mgL
    as_mgL:        0.62,  // mg/L
    pb_mgL:        0.04,  // mg/L
    ni_mgL:        0.0,   // mg/L — present but zero
    pH:            5.1,   // dimensionless
    turbidity_NTU: 210,   // NTU
  },

  // Treatment targets — outlet concentrations Layers 4/5 will compare against
  treatment_targets: {
    ra226_BqL:     0.185, // Bq/L — EPA MCL
    as_mgL:        0.01,  // mg/L — EPA MCL
    pb_mgL:        0.01,  // mg/L — EPA action level
    ni_mgL:        0.0,   // mg/L — none required
    pH:            7.0,   // dimensionless — discharge target
    turbidity_NTU: 15,    // NTU — site permit
  },

  // Enriched fields (added by enrichSite in sites.js)
  plumeIntensity:    0.597,   // As dominates (62× limit, log 1.792 / 3.0)
  isRadioactiveSite: true,    // ra226_BqL 6.8 > 0
  validationError:   false,   // passed all 9 validation checks
}
```

### Chemistry Advisor review questions for G2-02

1. **treatment_targets completeness:** Do the outlet targets in SITE-002's `treatment_targets` represent achievable chemistry for the RAD-COPREC train? Specifically: Ra-226 target 0.185 Bq/L (EPA MCL), As target 0.01 mg/L (EPA MCL), Pb target 0.01 mg/L. Are these targets realistic for BaSO4 co-precipitation + iron co-precipitation in a single treatment train?

2. **plumeIntensity driver:** Athabasca has Ra-226 at 6.8 Bq/L (radioactive, high-profile) but As at 0.62 mg/L drives the plume intensity. Is it scientifically defensible to use the highest-severity contaminant (by log-exceedance ratio) as the plume colour driver, rather than Ra-226 which is the more dangerous compound? Does this mislead a viewer about the risk profile of this site?

3. **SITE-005 Atacama near-zero intensity:** Li at 1850 mg/L excluded from severity; pH 7.1 yields intensity 0.014 (teal plume). Is this the correct visual for a lithium brine recovery site — essentially "clean" appearance — or does the high TDS of brine warrant a warning indicator that the current model doesn't capture?

4. **ni_mgL: 0.0 in raw_water:** Several sites carry zero-value fields for contaminants that are absent (e.g., SITE-002 `ni_mgL: 0.0`). The severity function returns 0 for these (exceedance ≤ 1). Is there any chemistry concern with carrying explicit zero fields rather than omitting them, particularly at the Layer 4 telemetry interface?

---

## SEAM G2-03: Module 3-C → Layer 4 (Telemetry Engine)

### What crosses this seam

`selectedSite` from `useSelectedSite` hook — specifically `raw_water` and `treatment_targets`. Layer 4 (Telemetry Engine, Phase 5) will use these to simulate real-time telemetry: inlet concentrations ticking with noise, outlet concentrations showing treatment progression, efficiency metrics.

### Data available to Layer 4 at this seam

```javascript
// What Layer 4 receives (via selectedSite):

selectedSite.raw_water = {
  ra226_BqL:     Number | undefined,  // Bq/L
  pb_mgL:        Number | undefined,  // mg/L
  as_mgL:        Number | undefined,  // mg/L
  ni_mgL:        Number | undefined,  // mg/L
  li_mgL:        Number | undefined,  // mg/L
  pH:            Number,              // [0, 14], never NaN (3-C clamped)
  turbidity_NTU: Number,              // ≥ 0
};

selectedSite.treatment_targets = {
  ra226_BqL:     Number | undefined,  // Bq/L — outlet target
  pb_mgL:        Number | undefined,  // mg/L
  as_mgL:        Number | undefined,  // mg/L
  ni_mgL:        Number | undefined,  // mg/L
  li_mgL:        Number | undefined,  // mg/L
  pH:            Number,              // discharge pH target
  turbidity_NTU: Number,              // site permit
};

selectedSite.flow_rate_nominal_Ls: Number   // > 0, 3-C blocking check
selectedSite.flow_rate_peak_Ls:    Number   // > flow_rate_nominal_Ls (by data)
selectedSite.permit_turbidity_NTU: Number   // > 0, 3-C blocking check
selectedSite.treatment_train:      String   // one of 5 valid IDs
selectedSite.regulatory_regime:    String   // 'EPA', 'WHO', 'IAEA', 'MIXED'
```

### Intended Layer 4 telemetry computation (for Chemistry Advisor preview)

The Telemetry Engine (Phase 5) will simulate a continuous 1 Hz tick using:

```
// Efficiency per contaminant:
efficiency(c) = (inlet_c - outlet_c) / inlet_c × 100%

// Where outlet_c is simulated as ticking toward treatment_targets with noise

// pH: simulated treatment progression from raw_water.pH toward treatment_targets.pH
// Turbidity: ticking from raw_water.turbidity_NTU toward treatment_targets.turbidity_NTU
// Flow: nominal ± 10% Gaussian noise around flow_rate_nominal_Ls
```

### Chemistry Advisor review questions for G2-03

1. **treatment_targets as telemetry outlet anchors:** Are the `treatment_targets` values appropriate as the outlet reference points for a real-time telemetry simulation? For example: SITE-007 Witwatersrand has Ni inlet 22.0 mg/L, target 0.1 mg/L — a 99.5% removal requirement. Is it misleading to show continuous 99.5% efficiency, or should Layer 4 simulate realistic treatment variance around this target?

2. **Zero-concentration contaminants in telemetry:** Sites carry zero-value contaminants (e.g., SITE-001 Sudbury `ra226_BqL: 0.0`). Should Layer 4 display these as "ND (non-detect)" rather than "0.000 Bq/L" to match real analytical reporting? Or is "0.000" acceptable in a simulation context?

3. **pH telemetry direction:** Raw pH values range from 2.9 (Rio Tinto) to 7.1 (Atacama). Treatment targets range from 7.0 to 7.5. The Telemetry Engine will simulate pH rising from acidic inlet toward neutral target. Is there a chemistry concern with showing continuous linear pH progression, given that pH adjustment involves reagent dose steps rather than smooth transitions?

4. **Flow rate units:** `flow_rate_nominal_Ls` is in L/s. Craig Gagnon's benchmark is 300 L/s average, 500 L/s peak. All 10 sites are within 195–480 L/s nominal and 320–580 L/s peak. Are these ranges realistic for the source types represented (mine drainage, industrial effluent, nuclear process, brine recovery)?

5. **Missing fields for Layer 4:** Are there any fields that Layer 4 will need for chemistry-correct telemetry simulation that are NOT currently present in the `selectedSite` object? For example: reagent dose rates, sludge generation estimates, reaction chamber residence time?

---

## SEAM G2-04: Module 3-C → Layer 5 (AI Advisor)

### What crosses this seam

`buildAdvisorTelemetry(selectedSite)` output — the `AIAdvisorPromptPackage`. Layer 5 (Phase 7) will embed this package in the Claude API system prompt to generate situational assessments.

### Complete AIAdvisorPromptPackage output — SITE-002 Athabasca example

```javascript
// buildAdvisorTelemetry(selectedSite) output for SITE-002:
{
  // Site identity
  site_id:           'SITE-002',
  site_name:         'Athabasca Uranium Legacy — Saskatchewan',
  country:           'Canada',
  treatment_train:   'RAD-COPREC',          // ST-3C-04n — AI context
  regulatory_regime: 'MIXED',

  // Inlet concentrations — named parameter + unit strings (CC-3C-03)
  ra226_inlet:      '6.80 Bq/L',           // ALWAYS Bq/L, never mg/L
  pb_inlet:         '0.04 mg/L',
  as_inlet:         '0.62 mg/L',
  ni_inlet:         null,                   // 0.0 → null (inactive contaminant)
  li_inlet:         null,
  pH_inlet:         '5.1 (dimensionless)',
  turbidity_inlet:  '210 NTU (permit: 15 NTU)',
  flow_rate:        '285 L/s',

  // Treatment targets
  ra226_target:     '0.185 Bq/L',
  pb_target:        '0.01 mg/L',
  as_target:        '0.01 mg/L',
  ni_target:        null,                   // inactive
  pH_target:        '7.0 (dimensionless)',
  turbidity_target: '15 NTU',

  // Operational flags
  radioactive_sludge_generating: true,      // isRadioactiveSite passed through

  // Regulatory thresholds — AI comparison context
  thresholds: {
    ra226_EPA_MCL_BqL: 0.185,
    pb_EPA_limit_mgL:  0.01,
    as_EPA_limit_mgL:  0.01,
    ni_WHO_limit_mgL:  0.1,
  },
}
```

### buildAdvisorTelemetry source code

```javascript
// src/data/advisorFormat.js

const THRESHOLDS = {
  ra226_EPA_MCL_BqL: 0.185,
  pb_EPA_limit_mgL:  0.01,
  as_EPA_limit_mgL:  0.01,
  ni_WHO_limit_mgL:  0.1,
};

export function buildAdvisorTelemetry(site) {
  if (!site) return null;

  const rw = site.raw_water;
  const tg = site.treatment_targets;

  const fmtBqL  = (v) => (v != null && v > 0) ? `${v.toFixed(2)} Bq/L`  : null;
  const fmtMgL2 = (v) => (v != null && v > 0) ? `${v.toFixed(2)} mg/L`  : null;
  const fmtMgL1 = (v) => (v != null && v > 0) ? `${v.toFixed(1)} mg/L`  : null;

  return {
    site_id:           site.site_id,
    site_name:         site.name,
    country:           site.country,
    treatment_train:   site.treatment_train,
    regulatory_regime: site.regulatory_regime,

    // Inlet — null for inactive contaminants (not "0 mg/L")
    ra226_inlet:      fmtBqL(rw.ra226_BqL),
    pb_inlet:         fmtMgL2(rw.pb_mgL),
    as_inlet:         fmtMgL2(rw.as_mgL),
    ni_inlet:         fmtMgL1(rw.ni_mgL),
    li_inlet:         rw.li_mgL != null && rw.li_mgL > 0
                        ? `${rw.li_mgL.toFixed(0)} mg/L` : null,
    pH_inlet:         `${rw.pH.toFixed(1)} (dimensionless)`,
    turbidity_inlet:  `${rw.turbidity_NTU.toFixed(0)} NTU (permit: ${site.permit_turbidity_NTU} NTU)`,
    flow_rate:        `${site.flow_rate_nominal_Ls.toFixed(0)} L/s`,

    // Targets — null when inlet is inactive
    ra226_target: (rw.ra226_BqL > 0) ? `${tg.ra226_BqL} Bq/L`  : null,
    pb_target:    (rw.pb_mgL    > 0) ? `${tg.pb_mgL} mg/L`      : null,
    as_target:    (rw.as_mgL    > 0) ? `${tg.as_mgL} mg/L`      : null,
    ni_target:    (rw.ni_mgL    > 0) ? `${tg.ni_mgL} mg/L`      : null,
    pH_target:    `${tg.pH.toFixed(1)} (dimensionless)`,
    turbidity_target: `${tg.turbidity_NTU} NTU`,

    radioactive_sludge_generating: site.isRadioactiveSite,

    thresholds: THRESHOLDS,
  };
}
```

### Chemistry Advisor review questions for G2-04

1. **Completeness of the prompt package for AI Advisor chemistry accuracy:** Given this package, can a Claude AI assistant generate a scientifically correct situational assessment — including correct treatment chemistry language, correct regulatory threshold comparisons, and correct radioactive sludge flagging? What fields, if any, are missing?

2. **Inactive contaminant as null vs. absent:** Ni, Li, and Ra-226 are `null` when not present. If the AI Advisor receives `ni_inlet: null`, will it correctly interpret this as "not present" rather than "unknown" or "not reported"? Should the package include an explicit `active_contaminants: ['ra226', 'as', 'pb']` list to remove ambiguity?

3. **Regulatory thresholds completeness:** The `thresholds` object includes EPA MCL for Ra-226, EPA limits for Pb/As, and WHO for Ni. For SITE-006 Sellafield (UK, regulatory_regime: 'IAEA'), the EA/ONR standard applies rather than EPA. Does the current thresholds object misrepresent the applicable regulatory context for non-US/non-WHO sites? Should the package include a `regulatory_note` field for non-EPA/WHO regimes?

4. **Li recovery sites — advisory content:** SITE-005 Atacama has `li_inlet: "1850 mg/L"` but no regulatory limit for Li in the thresholds object. The AI Advisor will receive a Li concentration without a reference threshold. Is this acceptable (the AI advisor can reference typical recovery targets of >90%), or should `li_recovery_target_pct: 90` be added to the package?

5. **AF3 advisory flag (from Gate 1):** The Chemistry Advisor issued AF3: "RAD-COPREC peak Ra-226 — polishing stage flag when inlet >5 Bq/L." SITE-002 has Ra-226 at 6.8 Bq/L. The current package does not include an explicit `ra226_requires_polishing_stage: true` flag. Should this field be added to `buildAdvisorTelemetry` output for the AI Advisor to reference?

---

## COMPLETE ALL-SITE ADVISOR PACKAGE SUMMARY

For Gate 2 completeness — the key chemistry fields that `buildAdvisorTelemetry` produces for all 10 sites:

| Site | ra226_inlet | dominant_metal_inlet | pH_inlet | radioactive_sludge | treatment_train |
|------|------------|---------------------|----------|--------------------|----------------|
| SITE-001 Sudbury | null | ni: 48.00 mg/L | 4.2 | false | HM-FULL |
| SITE-002 Athabasca | 6.80 Bq/L | as: 0.62 mg/L | 5.1 | **true** | RAD-COPREC |
| SITE-003 Norilsk | null | ni: 87.0 mg/L | 3.8 | false | NI-PRECIP |
| SITE-004 Zambia | null | pb: 3.20 mg/L | 4.5 | false | PB-AS-COPREC |
| SITE-005 Atacama | null | li: 1850 mg/L | 7.1 | false | LI-IX |
| SITE-006 Sellafield | 4.20 Bq/L | as: 0.18 mg/L | 6.1 | **true** | RAD-COPREC |
| SITE-007 Witwatersrand | 3.10 Bq/L | ni: 22.0 mg/L | 3.2 | **true** | HM-FULL |
| SITE-008 Rio Tinto | null | pb: 1.85 mg/L | 2.9 | false | PB-AS-COPREC |
| SITE-009 Ok Tedi | null | pb: 2.60 mg/L | 4.1 | false | PB-AS-COPREC |
| SITE-010 Pilbara | null | ni: 35.0 mg/L | 4.6 | false | NI-PRECIP |

---

## GATE 2 VERDICT REQUEST

Chemistry Advisor is requested to issue:

### Per-seam verdicts:
- **G2-01 (3-A → 3-B):** APPROVED / APPROVED WITH CORRECTIONS / REJECTED
- **G2-02 (3-B → 3-C):** APPROVED / APPROVED WITH CORRECTIONS / REJECTED
- **G2-03 (3-C → Layer 4):** APPROVED / APPROVED WITH CORRECTIONS / REJECTED
- **G2-04 (3-C → Layer 5):** APPROVED / APPROVED WITH CORRECTIONS / REJECTED

### Overall Gate 2 verdict:
- APPROVED — Phase 5 build may begin
- APPROVED WITH CORRECTIONS — listed corrections applied before Phase 5
- REJECTED — specified seam(s) rebuilt before Phase 5

### Specific questions requiring Chemistry Advisor ruling:

1. Is log10 severity scaling with LOG_SCALE_MAX=3.0 the correct approach, or should a different scaling be applied?
2. Should As drive SITE-002's plume colour (highest log-exceedance), or should Ra-226 be weighted differently given its radiotoxicological significance?
3. Is SITE-005 (Atacama) correctly represented as near-zero intensity (Li excluded, pH neutral)?
4. Are all 10 treatment_targets values achievable by their respective treatment trains?
5. Should `ra226_requires_polishing_stage` be added to the AI Advisor package for AF3 compliance?
6. Should `active_contaminants` list be added to the AI Advisor package to disambiguate null fields?
7. Is the `thresholds` object adequate for non-EPA/WHO regulatory regimes (Sellafield)?

---

*PHASE4_GATE2_SUBMISSION.md | PROJECT AQUA | March 11, 2026*
*Gate 2 submission — awaiting Chemistry Advisor verdict. No Phase 5 code written until APPROVED.*
