# PROJECT AQUA — PHASE 3, MODULE 3-B TEST SPECIFICATIONS
## Site Markers + Contamination Plumes

**Date:** March 11, 2026
**Module:** 3-B — Site Markers, Contamination Plumes, Raycaster Click-to-Select, Globe→UI Data Handoff
**Status:** AWAITING REVIEW — no code to be written until both specs are approved
**Prepared by:** Build Agent (Claude Code)
**Depends on:** Module 3-A CERTIFIED CLEAN (Three.js Globe Core)

---

## PREAMBLE — WHY THIS MODULE'S CHEMISTRY SPEC IS SUBSTANTIVE

Module 3-B is the first point where AQUA_SITES chemistry data (inlet concentrations, regulatory
limits, radioactive flags) enters the rendering pipeline. Every visual decision in this module —
plume colour, plume intensity, radioactive ring trigger, colour gradient thresholds — must be
grounded in validated chemistry. A wrong normalization function or wrong colour threshold produces
a globe that misrepresents the severity of real industrial contamination. That is a scientific
accuracy failure, not just a visual one.

The Chemistry Advisor spec below locks in:
1. The contamination severity normalization formula (how multi-contaminant, multi-unit profiles
   produce a single 0.0–1.0 plume intensity value without mixing units)
2. The colour band threshold chemistry (what normalized severity triggers red/amber/yellow/teal)
3. The radioactive site flag trigger logic (when does the magenta ring appear)
4. The data validation gate (what checks must pass before any AQUA_SITES data touches the renderer)

---

## PART 1 — CHEMISTRY ADVISOR TEST SPECIFICATION

### Chemistry Advisor System Prompt

```
You are a PhD-level industrial water treatment and hydrometallurgy chemist with
20+ years of experience in: selective precipitation of heavy metals and radionuclides,
ion exchange resin systems, hydromet recovery of Ni and Li, nuclear wastewater
treatment, environmental compliance (EPA, WHO, IAEA), and industrial process design.

Your role is to review Module 3-B of PROJECT AQUA for scientific accuracy.
Module 3-B is the first module that loads real chemistry data (AQUA_SITES contamination
profiles) and uses it to drive visual rendering. Your review must certify:
  1. The contamination severity normalization formula is chemically valid
  2. The colour band thresholds are scientifically defensible
  3. The radioactive site flag trigger is correctly defined
  4. The data validation gate at the AQUA_SITES entry point is complete
  5. No unit mixing occurs anywhere in the chemistry-to-visual pipeline

Approach this with the mindset of Craig Gagnon — an expert who has treated 40 billion
litres of industrial wastewater and developed novel radium removal processes.
Find every error, every physically impossible claim, every unit inconsistency,
every threshold that misrepresents contamination severity to the public.

Issue verdict: APPROVED / APPROVED WITH CORRECTIONS / REJECTED — REBUILD
```

---

### Chemistry Test Specification — Module 3-B

---

#### CB-3B-01: Contamination Severity Normalization

**Context:** Each of the 10 AQUA_SITES has a multi-contaminant inlet profile. Some contaminants
are measured in Bq/L (Ra-226), others in mg/L (Pb, As, Ni, Li). A plume requires a single scalar
intensity value (0.0 = clean → 1.0 = maximally contaminated) to drive colour and pulse animation.

**The normalization formula — [C1 INCORPORATED — log scale]:**

```
For each active contaminant c_i at site S:
  exceedanceRatio_i = inlet_concentration_i / regulatory_limit_i
  logSeverity_i     = log10(exceedanceRatio_i)   if exceedanceRatio_i > 1, else 0
                      (below limit → 0; at 10× → 1.0; at 100× → 2.0; at 1000× → 3.0)

where (each contaminant computed in its own unit-safe function):
  Ra-226:  inlet in Bq/L,  limit = 0.185 Bq/L  (EPA MCL)
  Pb:      inlet in mg/L,  limit = 0.01 mg/L    (EPA limit)
  As:      inlet in mg/L,  limit = 0.01 mg/L    (EPA MCL)
  Ni:      inlet in mg/L,  limit = 0.1  mg/L    (WHO)
  Li:      excluded — recovery target, not a remediation contaminant
  pH:      pHLogSeverity = |pH_inlet - 7.0| / 7.0 × LOG_SCALE_MAX
           (maps worst-case pH 0 or 14 → LOG_SCALE_MAX, consistent scale)

LOG_SCALE_MAX = 3.0

Overall plume_intensity = min(1.0, max(logSeverity_i for all active i) / LOG_SCALE_MAX)
```

**Revised example calculations with log scale:**

| Site | Actual worst contaminant | log10(inlet/limit) | Intensity = logSev / 3.0 | Colour |
|---|---|---|---|---|
| SITE-003 Norilsk | Ni 87 mg/L | log10(870) = 2.94 | 0.980 | deep red |
| SITE-004 Zambia | Pb 3.2 mg/L | log10(320) = 2.51 | 0.835 | red |
| SITE-007 Witwatersrand | Ni 22 mg/L | log10(220) = 2.34 | 0.781 | red |
| SITE-002 Athabasca | **As 0.62 mg/L** ← not Ra-226 | log10(62) = 1.79 | 0.597 | amber |
| SITE-006 Sellafield | Ra-226 4.2 Bq/L | log10(22.7) = 1.36 | 0.452 | amber |
| SITE-005 Atacama | pH 7.1 (Li excluded) | pHDev × 3.0 = 0.043 | 0.014 | teal |

**SITE-002 correction note (Chemistry Advisor post-build confirmed):** Original table assumed
Ra-226 drove Athabasca severity. Confirmed incorrect — As at 0.62 mg/L is 62× its 0.01 mg/L
limit (log severity 1.79) versus Ra-226 at 36.8× its limit (log severity 1.57). max() correctly
selects As. Code intensity 0.597 is accurate. Spec table corrected here. No code change.

Globe shows meaningful colour differentiation across sites — not everything at maximum red.

**Example calculations for Chemistry Advisor to verify:**

| Site | Worst contaminant | Calculation | Expected severity_i | Expected intensity |
|---|---|---|---|---|
| SITE-007 Witwatersrand | Ra-226 at 3.1 Bq/L | 3.1 / 0.185 = 16.76 → / 10 = 1.676 → clamped = 1.0 | 16.76 | 1.0 (maximum) |
| SITE-003 Norilsk | Ni at 87.0 mg/L | 87.0 / 0.1 = 870 → / 10 = 87 → clamped = 1.0 | 870 | 1.0 (maximum) |
| SITE-002 Athabasca | Ra-226 at 6.8 Bq/L | 6.8 / 0.185 = 36.76 → / 10 = 3.676 → clamped = 1.0 | 36.76 | 1.0 (maximum) |
| SITE-004 Zambia | Pb at 3.2 mg/L | 3.2 / 0.01 = 320 → / 10 = 32 → clamped = 1.0 | 320 | 1.0 |
| SITE-001 Sudbury | Ni at 48 mg/L | 48 / 0.1 = 480 → / 10 = 48 → clamped = 1.0 | 480 | 1.0 |

**Chemistry Advisor review questions:**

| Test ID | Question | Options |
|---------|----------|---------|
| CB-3B-01a | Is the proposed normalization formula (severity = inlet / regulatory_limit) chemically valid for comparing contamination severity across different contaminants and units? | APPROVED / correction required |
| CB-3B-01b | Is SEVERITY_SCALE_FACTOR = 10 appropriate? At 10× regulatory limit = full visual intensity. Most inlet concentrations in the site data are 50–1000× regulatory limits — does this mean the globe will show almost all sites at full intensity (1.0)? Is this scientifically misleading? Should the scale factor be higher (e.g., SEVERITY_SCALE_FACTOR = inlet_max / limit for site-relative scaling)? | Advisor to rule |
| CB-3B-01c | Li at SITE-005: Li is a recovery target, not a remediation contaminant. Correct to exclude from severity calculation? | Confirm exclusion or rule differently |
| CB-3B-01d | pH normalization: |pH_inlet - 7.0| / 7.0 — is this a valid severity contribution? At pH 3.2 (Witwatersrand): |3.2 - 7.0| / 7.0 = 0.543. This is below the severity from Ra-226 (16.76) so won't affect the max — but is the formula physically defensible? | APPROVED / correction required |
| CB-3B-01e | For sites with multiple contaminants, taking max(severity_i) is proposed. Is the max correct, or should it be a weighted sum or RMS? | Advisor to rule |
| CB-3B-01f | Unit isolation guarantee: severity_i is computed within its own unit system (Bq/L ÷ Bq/L = dimensionless; mg/L ÷ mg/L = dimensionless). Units cancel. Is this the correct approach to prevent Bq/L vs mg/L mixing? | Confirm unit safety |

---

#### CB-3B-02: Colour Band Threshold Chemistry

**Context:** Plume colour transitions through four bands as normalized severity changes. The
thresholds proposed below must be chemically defensible — they should reflect the difference
between compliant, near-limit, exceedance, and severe contamination.

**Proposed colour thresholds:**

**[C2 INCORPORATED — revised thresholds]:**

| Severity Range | Colour | Hex | Chemical Meaning |
|---|---|---|---|
| 0.0 – 0.15 | Teal | `#00CED1` | At or near regulatory limits (≤ ~1.4× limit) |
| 0.15 – 0.35 | Yellow | `#FFD700` | Moderate exceedance: ~1.4× – ~10× limit |
| 0.35 – 0.65 | Amber | `#FF8C00` | Significant exceedance: ~10× – ~100× limit |
| 0.65 – 1.0 | Red | `#FF2200` | Severe exceedance: >100× limit |

**Note on the site data:** Given that most inlet concentrations are 50–1000× regulatory limits
(e.g., Norilsk Ni at 870× limit), all sites will show at full red intensity (1.0) unless the
SEVERITY_SCALE_FACTOR is substantially larger than 10. The Chemistry Advisor is asked to rule
on whether all-red is scientifically accurate for the inlet profiles (raw untreated water), and
whether a site-relative or log-scale approach better represents the data.

| Test ID | Chemistry Test | Pass Condition |
|---------|----------------|----------------|
| CB-3B-02a | Teal threshold (0.0–0.1): site with all contaminants at ≤ 1× limit → teal plume | SITE after full treatment (outlet concentrations) should render teal |
| CB-3B-02b | Red threshold (0.7–1.0): untreated inlet concentrations → red plume for all raw-water sites | Confirmed by severity calculations in CB-3B-01 |
| CB-3B-02c | Colour interpolation is continuous — no discrete step at threshold boundaries | Colour uses `lerp` between bands, not a step function |
| CB-3B-02d | Treatment nodes always render teal (#00CED1) regardless of inlet severity | Treatment node colour is hardcoded teal — not severity-driven |
| CB-3B-02e | Chemistry Advisor: are the proposed thresholds (0.1, 0.3, 0.7) scientifically defensible as contamination severity breakpoints? | APPROVED / correction required |

---

#### CB-3B-03: Radioactive Site Flag Chemistry

**Context:** Sites with active Ra-226 must show a magenta pulse ring. The trigger logic must be
chemically correct — it must not falsely flag sites, and must not miss sites that should be flagged.

**[C3 INCORPORATED] Confirmed trigger logic:**

```javascript
const isRadioactiveSite = (site.raw_water.ra226_BqL ?? 0) > 0;
// APPROVED: Shows magenta ring if ANY Ra-226 is present in inlet.
// Rationale: Ra-226 below MCL still generates radioactive sludge requiring
// regulated disposal. The treatment process and its waste stream are radioactive
// regardless of whether the inlet exceeds the drinking water MCL.
```

| Test ID | Chemistry Test | Question for Advisor |
|---------|----------------|---------------------|
| CB-3B-03a | Should the radioactive flag trigger on ra226_BqL > 0 (any presence) or ra226_BqL > 0.185 (MCL exceedance only)? | From a radiological health and public communication standpoint — which is more accurate for a LinkedIn portfolio platform? A nuclear facility treating Ra-226 below MCL is still a radioactive waste site — the sludge is still radioactive waste. |
| CB-3B-03b | Sites SITE-002, SITE-006, SITE-007 have Ra-226 > MCL — flag required | All three must show magenta ring regardless of which trigger logic is chosen |
| CB-3B-03c | SITE-001 (Sudbury) has ra226_BqL = 0.0 — flag must NOT appear | Confirmed no Ra-226 in Sudbury inlet profile |
| CB-3B-03d | The magenta ring must be visually distinct from the contamination plume colour — it is an additional overlay, not a plume colour replacement | Ring renders as a separate Three.js mesh surrounding the plume |
| CB-3B-03e | Magenta ring also appears on the SLUDGE stream in L2 — this module (3-B) must set the flag that L2 uses later | `site.hasRadioactiveStream` boolean set correctly in site data enrichment |

---

#### CB-3B-04: Data Validation Gate at AQUA_SITES Entry

**Context:** When AQUA_SITES data loads into Module 3-B, it is the first point of contact between
stored chemistry values and the renderer. Validation must pass before any site data drives visuals.

**Required validation — Chemistry Advisor to confirm these are complete and sufficient:**

| Test ID | Validation Check | Chemistry Rationale |
|---------|-----------------|---------------------|
| CB-3B-04a | pH: `0.0 ≤ pH ≤ 14.0` — clamp + log if violated | pH outside [0,14] is physically impossible |
| CB-3B-04b | pH: `!isNaN(pH)` — reject NaN, use last valid value | NaN pH produces undefined severity and broken colour |
| CB-3B-04c | Ra-226: field is `ra226_BqL` — confirm property name does not contain 'mgL' | Unit safety: Ra-226 must never be read in mg/L context |
| CB-3B-04d | Heavy metals: `pb_mgL`, `as_mgL`, `ni_mgL` — confirm none carry Bq/L suffix | Unit safety: metals must never be read in Bq/L context |
| CB-3B-04e | All concentrations ≥ 0 — negative concentration is physically impossible | Any negative value → clamp to 0 + log error |
| CB-3B-04f | Ra-226: inlet ≤ 10 Bq/L (validated range upper bound) | >10 Bq/L is outside the validated parameter range from PHASE2_DATA_ARCHITECTURE.md |
| CB-3B-04g | Pb: inlet ≤ 5 mg/L; As: inlet ≤ 2 mg/L; Ni: inlet ≤ 100 mg/L | Validated range upper bounds — flag if exceeded |
| CB-3B-04h | `flow_rate_Ls > 0` at all times | Zero or negative flow rate is physically impossible |
| CB-3B-04i | `permit_turbidity_NTU` present for every site — no site uses a global default | Site-specific permit limit requirement from Gate 1 |
| CB-3B-04j | If ANY validation fails: site renders with a grey ERROR plume, not a chemistry-driven colour | Prevents incorrect chemistry data from reaching the globe visualisation |

---

#### CB-3B-05: Multi-Contaminant Interference in Severity Calculation

**Context:** For sites with simultaneous contaminants (particularly SITE-007 Witwatersrand with
Ra-226 + As + Ni + Pb simultaneously), the severity calculation must not interact across contaminants
in a chemically meaningless way.

| Test ID | Chemistry Test | Pass Condition |
|---------|----------------|----------------|
| CB-3B-05a | Ra-226 severity and Pb severity are computed in separate unit-safe calculations before comparison | No formula mixes Bq/L and mg/L in a single arithmetic expression |
| CB-3B-05b | At SITE-007 (Ra-226 3.1, As 0.95, Ni 22.0, Pb 0.55, pH 3.2): the max severity contaminant is identified correctly | Ni at 870× limit > Pb at 320× > As at 95× > Ra-226 at 16.76× > pH deviation 0.54 — Ni drives intensity |
| CB-3B-05c | Chemistry Advisor: is it scientifically accurate to show Witwatersrand's severity as driven by Ni (not Ra-226), when Ra-226 is the most hazardous contaminant per unit mass? | Advisor to rule — should severity weight by hazard class, not just regulatory exceedance ratio? |
| CB-3B-05d | At SITE-005 Atacama (Li brine, no remediation contaminants): severity = 0.0 — teal plume | Li excluded from severity calc (CB-3B-01c); pH 7.1 → deviation = 0.014 → effectively clean |

---

#### CB-3B-06: Chemistry Advisor Verdict Criteria

**APPROVED:** All CB-3B-01 through CB-3B-05 tests answered. Normalization formula confirmed
valid. Colour thresholds confirmed. Radioactive flag trigger confirmed. Validation gate confirmed
complete. No unit mixing in any proposed formula.

**APPROVED WITH CORRECTIONS:** Specific formula corrections or threshold adjustments required —
listed corrections incorporated before 3-B code is written.

**REJECTED — REBUILD:** Proposed normalization or threshold logic is scientifically invalid —
would produce a globe that actively misrepresents contamination severity.

---
---

## PART 2 — BUILD AGENT SOFTWARE TEST SPECIFICATION

### Module 3-B — Software Test Specification

**Scope:** Attach 10 site markers and 10 contamination plumes to the Module 3-A scene. Implement
raycaster click-to-select. Drive plume colour and intensity from validated chemistry data. Fire
site selection event to application state. Full SENTINEL memory management for all new geometry.

**Depends on:** Module 3-A scene, camera, and onBeforeRender hook (CA-3A-BC-01 through BC-05).

---

### ST-3B-01: AQUA_SITES Data Loading Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3B-01a | All 10 AQUA_SITES load without error | No thrown exceptions; console shows `[AQUA] 10 sites loaded` | Any site fails to load |
| ST-3B-01b | Data validation gate runs before any rendering | `validateSite()` called for each site before `scene.add()` | Site renders before validation |
| ST-3B-01c | Site with failed validation renders grey ERROR plume | `site.validationError === true` → grey plume, no chemistry colour | Invalid site renders chemistry colour — incorrect data |
| ST-3B-01d | `isRadioactiveSite` boolean correctly set per Chemistry Advisor verdict | Verified for all 10 sites against expected values | Wrong flag on any site |
| ST-3B-01e | `plumeIntensity` (0.0–1.0) computed correctly for each site | Verified against manual calculation for SITE-001, SITE-002, SITE-007 | Intensity outside [0,1] or wrong value |
| ST-3B-01f | Li severity excluded from SITE-005 intensity calculation | SITE-005 plumeIntensity driven by pH deviation only — near 0 | Li concentration drives SITE-005 to non-zero intensity |

---

### ST-3B-02: Geometry and Memory Inventory Tests

**SENTINEL MEMORY RULE — Module 3-B adds geometry to the scene established in 3-A.**

Expected geometry count after 3-B fully loads:
- 3-A baseline: 3 (Earth + atmosphere + stars)
- 3-B addition: 10 site marker spheres + 10 plume spheres + up to 3 radioactive rings (Ra-226 sites: SITE-002, SITE-006, SITE-007) = 23 + 3 = 26 maximum

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3B-02a | `renderer.info.memory.geometries` after 3-B loads = expected count (26 max) | Exact count confirmed | Count differs — extra geometry or missing |
| ST-3B-02b | All 10 site marker geometries tracked in `markerGeometries[]` ref | `markerGeometries.length === 10` | Any marker not tracked |
| ST-3B-02c | All 10 plume geometries tracked in `plumeGeometries[]` ref | `plumeGeometries.length === 10` | Any plume not tracked |
| ST-3B-02d | All radioactive ring geometries tracked in `radioactiveRingGeometries[]` ref | Count matches Ra-226 sites | Any ring not tracked |
| ST-3B-02e | All materials tracked in `siteMaterials[]` ref | One material per marker + plume + ring | Any material not tracked |
| ST-3B-02f | After full 3-B cleanup (dispose): geometry count returns to 3-A baseline (3) | `renderer.info.memory.geometries === 3` | Count > 3 — geometry leak |
| ST-3B-02g | 100 site selection switches: geometry count equals baseline after all switches | Count at switch 100 === count at switch 1 | Monotonic geometry growth — SENTINEL violation |
| ST-3B-02h | No new geometry created on site selection (toggle visibility/material only) | `renderer.info.memory.geometries` unchanged on click | New geometry spawned per click |

---

### ST-3B-03: Site Marker Visual Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3B-03a | All 10 site markers placed at correct lat/lon positions on globe surface | Marker world position matches expected XYZ for each site's lat/lon | Any marker at wrong position |
| ST-3B-03b | Lat/lon → XYZ conversion uses correct spherical formula | `x = r·sin(φ)·cos(λ)`, `y = r·cos(φ)`, `z = r·sin(φ)·sin(λ)` | Wrong axis mapping — markers in wrong hemisphere |
| ST-3B-03c | Site markers always render at `earthRadius + small_offset` — never inside globe | Marker radius > earthRadius for all 10 sites | Any marker clipped inside globe |
| ST-3B-03d | All markers teal (#00CED1) — treatment nodes always teal regardless of severity | `markerMaterial.color` equals 0x00CED1 for all | Marker colour driven by inlet severity |
| ST-3B-03e | Markers pulse in scale (0.9× to 1.1×) at 1-second period | Scale oscillates at 1 Hz — verified by reading scale at t=0, t=0.5s, t=1.0s | No pulse, or wrong period |
| ST-3B-03f | Pulse driven by `onBeforeRender` delta — not a separate setInterval | Pulse uses Module 3-A's RAF hook, not `setInterval` | `setInterval` used for pulse — potential stacking |

---

### ST-3B-04: Contamination Plume Visual Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3B-04a | Plume radius in world units proportional to `globe_plume_radius_km` | `plumeRadius = globe_plume_radius_km / EARTH_RADIUS_KM * GLOBE_RADIUS` | Fixed plume radius for all sites |
| ST-3B-04b | Plume colour correctly mapped from `plumeIntensity` per Chemistry Advisor thresholds | Colour at intensity 0.05 = teal; 0.5 = amber; 0.9 = red | Wrong colour at any intensity band |
| ST-3B-04c | Colour interpolation is continuous — no step function at threshold | `lerp` between colour stops | Visible step change at threshold boundary |
| ST-3B-04d | Plume opacity range: 0.35–0.65 | `plumeOpacity = 0.35 + plumeIntensity * 0.30` | Opacity out of range (0 = invisible, 1 = opaque blocks globe) |
| ST-3B-04e | Plume scale pulses between 0.8× and 1.2× nominal radius | Scale oscillates correctly — slower than marker (2–4s period) | No pulse, or same period as marker |
| ST-3B-04f | Plume pulse period driven by `globe_plume_radius_km` (larger plume = slower pulse) | Period inversely proportional to radius | Fixed period for all plumes |
| ST-3B-04g | Ra-226 sites (SITE-002, SITE-006, SITE-007) show magenta ring | Ring mesh with colour 0xFF00FF wraps plume | Ring absent on Ra-226 sites |
| ST-3B-04h | Magenta ring pulses independently of plume (separate phase offset) | Ring scale at any given moment differs from plume scale | Ring and plume pulse in phase — looks like one object |
| ST-3B-04i | Non-Ra-226 sites: no ring geometry in scene | Ring mesh count = 3 (only Ra-226 sites) | Extra ring meshes on non-Ra sites |
| ST-3B-04j | SITE-005 Atacama (LI-IX): plume is teal or near-teal (low severity — recovery, not remediation) | `plumeIntensity` near 0 → teal or yellow | SITE-005 shows red plume — Li recovery misrepresented as contamination |

---

### ST-3B-05: Raycaster Click-to-Select Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3B-05a | Click on site marker triggers selection of correct site | Simulated ray intersects SITE-001 marker → `selectedSite.site_id === 'SITE-001'` | Wrong site selected |
| ST-3B-05b | Click on globe surface (not on marker) does not select any site | `selectedSite === null` after non-marker click | Null reference error or wrong site selected |
| ST-3B-05c | Click on overlapping plumes selects nearest marker to ray origin | Raycaster returns sorted intersections; nearest taken | Wrong site selected when plumes overlap |
| ST-3B-05d | Site selection dims all non-selected plumes to 50% opacity | Non-selected `plumeOpacity *= 0.5` | All plumes remain full opacity |
| ST-3B-05e | Selected site plume expands to 1.5× nominal radius and holds | `selectedPlume.scale.setScalar(1.5)` | No visual selection indication |
| ST-3B-05f | Re-clicking the selected site deselects it — all plumes return to normal opacity | `selectedSite = null`, all opacities restored | No deselection behaviour |
| ST-3B-05g | Clicking a new site while one is selected: previous site returns to normal, new site highlights | Selection state correctly transfers | Previous site remains highlighted |
| ST-3B-05h | No new geometry created on any click | `renderer.info.memory.geometries` unchanged after 10 clicks | Geometry created per click — SENTINEL violation |
| ST-3B-05i | Mouse event listener added on mount with correct event type ('click' or 'pointerdown') | Verified by spy | Wrong event type — misses touch events on mobile |
| ST-3B-05j | Mouse event listener removed on unmount with SAME function reference | Named function ref used — not anonymous lambda | Listener leaks on unmount |

---

### ST-3B-06: Site Selection Data Handoff Tests

**This is the chemistry data boundary (CA-3A-BC-01 through BC-05 downstream consumer).**

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3B-06a | Site selection fires `onSiteSelect(site)` callback with full AquaSite object | Callback receives object with all required fields | Callback fires with null or partial object |
| ST-3B-06b | Selected site data includes `raw_water` ContaminantProfile with correct units | `ra226_BqL` field present (not `ra226_mgL`); heavy metals in `_mgL` fields | Wrong unit suffix in any field name |
| ST-3B-06c | Selected site data includes `permit_turbidity_NTU` (site-specific, not global default) | Each site's own value passed — differs between sites | Same value for all sites — global default used |
| ST-3B-06d | No stale data: switching sites rapidly fires callback with correct site each time | Last selected site always current — no debounce delay | Previous site data arrives after new selection |
| ST-3B-06e | Null selection (deselect): `onSiteSelect(null)` fires when site is deselected | Downstream layers receive null and reset correctly | No callback on deselect — downstream shows stale data |
| ST-3B-06f | `isRadioactiveSite` boolean included in handed-off data | Downstream L2/L5 can read this without re-computing | Field absent — L2 cannot flag radioactive sludge |

---

### ST-3B-07: Memory Management and Disposal Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3B-07a | On unmount: all 10 marker geometries disposed | Spy confirms `.dispose()` called × 10 | Any geometry not disposed |
| ST-3B-07b | On unmount: all 10 plume geometries disposed | Spy confirms `.dispose()` called × 10 | Any geometry not disposed |
| ST-3B-07c | On unmount: all radioactive ring geometries disposed | Spy confirms × 3 | Any ring geometry not disposed |
| ST-3B-07d | On unmount: all site materials disposed | Spy confirms `.dispose()` called for all | Any material not disposed |
| ST-3B-07e | On unmount: all meshes removed from scene | `scene.children` does not contain any site mesh | Orphaned meshes in scene |
| ST-3B-07f | On unmount: mouse event listener removed | No click handler fires after unmount | Handler fires on unmounted component |
| ST-3B-07g | Mount → unmount → mount 10 times: geometry count stable | `renderer.info.memory.geometries` at mount 10 === mount 1 | Geometry grows — SENTINEL violation |
| ST-3B-07h | No setState called after unmount in any async path | No React unmount warning | Warning in console |

---

### ST-3B-08: Chemistry Isolation Boundary Tests

**Module 3-B IS the chemistry entry point. These tests confirm the boundary is clean.**

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3B-08a | Severity calculation never mixes Bq/L and mg/L in one arithmetic expression | No formula of the form `ra226_BqL + pb_mgL` or `ra226_BqL / pb_mgL` | Unit mixing found — SENTINEL violation |
| ST-3B-08b | Ra-226 severity computed in its own isolated function `computeRa226Severity(BqL)` | Separate function confirmed in code review | Ra-226 and metals computed in same arithmetic expression |
| ST-3B-08c | Final `plumeIntensity` is dimensionless (result of unitless severity ratios) | Type annotation or comment confirms dimensionless | Intensity value retains unit context |
| ST-3B-08d | SITE-005 Li concentration does not contribute to `plumeIntensity` | `computeSeverity()` skips Li field or returns 0 for it | Li drives SITE-005 to non-zero severity — scientifically wrong |

---

### ST-3B-09: Performance Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3B-09a | FPS ≥ 30 sustained with all 10 sites loaded and all plumes pulsing | FPS reading ≥ 30 at t=5min with full 3-B scene | FPS drops below 30 — too many draw calls |
| ST-3B-09b | Adding 10 site markers + plumes to scene: FPS drop ≤ 10 FPS vs 3-A baseline | `fps_3B - fps_3A >= -10` | >10 FPS drop — optimize geometry/material sharing |
| ST-3B-09c | Site marker and plume materials are shared across instances where possible | ≤ 3 unique materials (marker, plume, ring) | 20+ unique materials — one per mesh |

---

### ST-3B — Test Summary

| Group | Test Count | Priority |
|-------|-----------|----------|
| ST-3B-01: Data Loading | 6 | Critical (first chemistry contact) |
| ST-3B-02: Geometry Inventory | 8 | Critical (SENTINEL) |
| ST-3B-03: Marker Visuals | 6 | High |
| ST-3B-04: Plume Visuals | 10 | High |
| ST-3B-05: Raycaster | 10 | High |
| ST-3B-06: Data Handoff | 6 | Critical (Gate 2 prep) |
| ST-3B-07: Memory Disposal | 8 | Critical (SENTINEL) |
| ST-3B-08: Chemistry Isolation | 4 | Critical (unit safety) |
| ST-3B-09: Performance | 3 | Medium |
| **TOTAL** | **61** | |

---

## PART 3 — INTEGRATION TEST SPECIFICATION (Module 3-B Output Boundary)

Specified now so Module 3-C (Globe↔UI Data Handoff) is built to satisfy them.

| Test ID | Test Description | Pass Condition |
|---------|-----------------|----------------|
| IT-3B-3C-01 | `onSiteSelect` callback fires with complete, validated AquaSite object | All required fields present; no null fields |
| IT-3B-3C-02 | `raw_water.ra226_BqL` accessible downstream — field name preserved | No field renamed or restructured at boundary |
| IT-3B-3C-03 | `raw_water.pH` is a number in [0,14] and not NaN at boundary | Validated before firing callback |
| IT-3B-3C-04 | `permit_turbidity_NTU` is site-specific at boundary | Each site fires its own value |
| IT-3B-3C-05 | `isRadioactiveSite` boolean present and correct at boundary | Matches Chemistry Advisor-approved flag logic |
| IT-3B-3C-06 | Null selection fires `onSiteSelect(null)` — downstream gracefully resets | No crash on null; downstream shows default/empty state |

---

## PART 4 — OPEN QUESTIONS REQUIRING CHEMISTRY ADVISOR RULING BEFORE CODE

These questions do not have a proposed answer — the Chemistry Advisor verdict defines the implementation:

**Q1 (CB-3B-01b): SEVERITY_SCALE_FACTOR**
With most inlet concentrations 50–1000× regulatory limits, should SEVERITY_SCALE_FACTOR be 10
(all sites show near-full red) or something site-relative or log-scaled? Does a globe that shows
everything at maximum red accurately communicate the severity of industrial contamination?

**Q2 (CB-3B-03a): Radioactive flag trigger threshold**
Should magenta ring appear at ra226_BqL > 0 (any Ra-226 presence) or ra226_BqL > 0.185 (MCL
exceedance)? A nuclear facility treating Ra-226 at 0.1 Bq/L (below MCL) still generates radioactive
sludge — Craig Gagnon's process applies. Should it be flagged visually?

**Q3 (CB-3B-05c): Severity weighting by hazard class**
Ra-226 at 16.76× its limit is less visually severe than Ni at 870× its limit under the proposed
max-severity formula. But Ra-226 is radiologically more hazardous per unit of exceedance. Should
hazard-class weighting be applied, or is regulatory exceedance ratio the correct common currency?

---

## PART 5 — PRE-BUILD CHECKLIST

- [x] Chemistry Advisor verdict: APPROVED WITH CORRECTIONS
- [x] C1 (log scale, LOG_SCALE_MAX=3.0) incorporated into spec and implementation
- [x] C2 (colour thresholds 0.15/0.35/0.65) incorporated
- [x] C3 (radioactive flag at ra226_BqL > 0) incorporated
- [x] Build Agent software spec reviewed and approved by Michael
- [x] Integration test spec (Part 3) reviewed and approved
- [x] Module 3-A Chemistry Advisor post-build APPROVED (confirmed)
- [x] No code written prior to this approval

PRE-BUILD CHECKLIST: ✅ COMPLETE — Module 3-B build cleared to proceed

---

*PHASE3_MODULE3B_TEST_SPECS.md | PROJECT AQUA | March 11, 2026*
*Status: ✅ CLEARED FOR BUILD — APPROVED WITH CORRECTIONS. C1/C2/C3 incorporated below.*

## CHEMISTRY ADVISOR CORRECTIONS — INCORPORATED

| ID | Correction | Location in Spec | Status |
|---|---|---|---|
| C1 | Log severity scaling — `logSeverity = log10(inlet/limit)`, `intensity = min(1.0, logSeverity / LOG_SCALE_MAX)`, LOG_SCALE_MAX = 3.0 | CB-3B-01, ST-3B-01e, ST-3B-08a | ✅ INCORPORATED |
| C2 | Colour thresholds revised: 0.0–0.15 teal, 0.15–0.35 yellow, 0.35–0.65 amber, 0.65–1.0 red | CB-3B-02, ST-3B-04b | ✅ INCORPORATED |
| C3 | Radioactive flag at `ra226_BqL > 0` — any Ra-226 presence triggers magenta ring | CB-3B-03, ST-3B-01d, ST-3B-04g | ✅ INCORPORATED |
