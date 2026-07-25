# PROJECT AQUA — PHASE 2: ANIMATION LAYER SPECIFICATION
**Version:** 2.1 | **Date:** March 11, 2026
**Status:** GATE 1 APPROVED WITH CORRECTIONS — R1, R2, R4, AF2, AF3 incorporated

---

## PREAMBLE — ALL FIVE LAYERS RUN IN PARALLEL AT ALL TIMES

A static screen at any point is a build failure. All five animation layers must be running simultaneously from app load. Each layer has independent animation loops; a failure in one layer must not crash any other layer.

---

## LAYER 1 — THREE.JS GLOBE (L1)

### Overview
Rotating Three.js r128 Earth with contamination plumes and treatment node markers. This is the primary visual entry point for the application.

### Geometry and Object Inventory

| Object | Type | Count | Notes |
|--------|------|-------|-------|
| Earth sphere | SphereGeometry | 1 | 64 segments, phong material with texture |
| Atmosphere glow | SphereGeometry | 1 | Slightly larger radius, additive blending |
| Contamination plumes | SphereGeometry (instanced) | 1 per site (10 total) | Pulsing, color driven by contamination level |
| Treatment node markers | SphereGeometry | 1 per site (10 total) | Teal pulse, teal = treatment active |
| Plume connection arcs | Line/TubeGeometry | On-demand | For selected site highlighting |
| Stars background | Points | 1 system | Static |

**SENTINEL MEMORY RULE:** Every geometry and material created MUST have a corresponding `.dispose()` call when the component unmounts or site is removed. Geometry count must be identical before and after 100 site switches.

### Animation Behavior

**Earth rotation:**
- Continuous Y-axis rotation at 0.05 rad/s (slow, majestic)
- Driven by `requestAnimationFrame` — single loop, no stacking
- Never pause (rotation continues during site selection)

**Contamination plumes:**
- Pulse in-and-out: scale oscillates between 0.8× and 1.2× nominal radius
- Period: 2–4 seconds (site-dependent, driven by `globe_plume_radius_km`)
- Color interpolates from RED (#FF2200) toward TEAL (#00CED1) as treatment progresses
- Radioactive sites (Ra-226 active): add MAGENTA (#FF00FF) secondary pulse ring
- Opacity: 0.35–0.65 (semi-transparent)
- Plumes ALWAYS visible (even when treatment is compliant — show treated teal state)

**Treatment node markers:**
- Teal (#00CED1) fixed color
- Pulsing scale: 0.9× to 1.1× at 1-second period
- On site selection: expand to 1.5× and hold, surrounding ring appears

**Site selection behavior:**
- User clicks globe → raycaster detects site marker hit
- Selected site: plume highlights, connection line to UI panel appears
- All other sites: dim to 50% opacity
- NO geometry creation on selection — toggle visibility/material properties only (avoid geometry leak)

### Memory Management Requirements

```javascript
// REQUIRED — dispose pattern for every geometry/material
function disposeSiteMarker(marker) {
  marker.geometry.dispose();
  marker.material.dispose();
  scene.remove(marker);
}

// REQUIRED — cleanup on unmount
useEffect(() => {
  return () => {
    renderer.dispose();
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    cancelAnimationFrame(animFrameRef.current);
  };
}, []);
```

### Performance Targets
- Target: 60 FPS on mid-range GPU
- Minimum: 30 FPS sustained at 60-min runtime
- Particle/geometry count: stable — no growth over time
- Geometry audit test: count `renderer.info.memory.geometries` before and after 100 site switches — must be equal

---

## LAYER 2 — PROCESS FLOW ANIMATION (L2)

### Overview
SVG-based animated schematic of the active treatment train. Particles flow left-to-right through each stage. Particle color shifts as contaminants are removed. Stage boxes pulse with activity.

### Process Stage Visual Catalog

Each process stage is an SVG group containing:
- Stage box (rect) with stage label
- Inlet pipe (line/path)
- Outlet pipe (line/path)
- Reagent injection indicator (if applicable)
- Activity indicator (pulsing border or glow)

### Stage-by-Stage Particle Color Logic

Particles change color as they pass through each stage, representing chemical transformation:

| Entering Stage | Particle Color Before | Particle Color After | Chemical Meaning |
|---|---|---|---|
| Raw Intake | Dark Red `#8B0000` | Dark Red | Contaminated raw water |
| pH Adjustment (up — As range) | Dark Red | Orange `#FF6600` | pH corrected to 5.5–7.0, still contaminated |
| Iron Dose (FeCl3) | Orange | Orange-Brown `#A0522D` | Iron floc forming |
| Reaction (As co-precip) | Orange-Brown | Lighter Orange | As being removed via Fe floc |
| Coag/Floc (LI-IX only) [R3] | Dark turbid | Brown-turbid | Brine coagulation |
| Settling (LI-IX only) [R3] | Brown-turbid | Less turbid | Settling solids |
| Pre-filter / Multimedia filter | Turbid | Cleaner | TSS removal |
| Clarifier/Filter Press | Turbid colors | Cleaner blue | Solids removed |
| pH Adjustment (high — Ni range) | Orange | Lighter orange | pH raised to 9.5–10.5 |
| Precipitation (Ni/Pb) | Lighter Orange | Light Yellow | Hydroxides forming |
| Clarifier (Ni sludge) | Turbid | Cleaner | Solids removed |
| [R1] pH Correction before Ra-226 (HM-FULL) | Cleaner (pH ~10) | Clear (pH 7–8) | CO2 correction — eliminates BaCO3 interference |
| Ra-226 seed dose + reaction | Any | Faint Magenta tinge | Radioactive stream indicator |
| Filter Press (Ra) | Magenta tinge | Clear Blue | Radioactive solids separated — ☢ SLUDGE |
| Ion Exchange (IX loading) | Clear Blue | Slightly cleaner | Selective adsorption onto resin |
| [R2] Dual Pb / As reaction (PB-AS-COPREC) | Orange-Brown | Lighter | Fe floc adsorbs Pb (dominant) + Pb(OH)2 (supplementary) |
| IX Regeneration | Clear Blue | Briefly Brown `#8B4513` | Eluent (HCl) flushing resin |
| pH Correction (final) | Clear Blue | Blue-Green `#0099AA` | Final pH adjustment to 6.5–8.5 |
| Evaporation/Crystallization (LI-IX) [R4] | Clear Blue | White crystal particles | Li2CO3/LiOH crystallization |
| Clean Output | Blue-Green | Teal `#00CED1` | Treated compliant water |

### Particle Flow Mechanics

- Particles: 15–40 SVG circles per visible pipe segment (count bounded by pipe length)
- Flow velocity: driven by `flow_rate_Ls` — faster flow = faster particle movement
- Particle spacing: evenly distributed in pipe, new particles enter as others exit
- Stage residence time: particle slows in stage box (simulating retention time)
- Clarifier stages: particles "sink" downward into sludge animation, clean fraction exits right

**CRITICAL — Particle Count Bound:**
```javascript
// REQUIRED — never exceed MAX_PARTICLES
const MAX_PARTICLES = 500;
let particleCount = 0;

function spawnParticle() {
  if (particleCount >= MAX_PARTICLES) return; // hard cap
  particleCount++;
  // ... create particle
}

function removeParticle(p) {
  particleCount--;
  p.remove(); // remove from SVG DOM
}
```

### Ion Exchange Regeneration Cycle Animation — REQUIRED

The regeneration cycle is mandatory and must be visually distinct.

**Cycle logic:**
1. Loading phase (normal): particles flow left-to-right through IX column — color gradually shifts as ions adsorb
2. Saturation indicator: IX column box fills with color from bottom up as `resin_loading_pct` increases
3. Trigger: at `resin_loading_pct > 85%`, regeneration cycle begins
4. Regeneration phase:
   - Flow direction REVERSES in IX section (backwash visual)
   - IX column box color: flushes to brown/amber (eluent visualization)
   - Bypass route activates — dotted line shows feed water routing around IX
   - Duration: ~30 seconds animation cycle
   - Small "REGEN CYCLE" label flashes on IX stage
5. Completion: IX column resets to 0% loaded, normal flow resumes

**Regeneration flow reversal implementation:**
```javascript
// Particles in IX section reverse direction during regeneration
if (ixState.in_regeneration) {
  particle.velocityX *= -1; // reverse horizontal velocity
  particle.color = '#8B4513'; // eluent color (brown)
}
```

### Sludge Stream Animation

- Each clarifier and filter press has a downward sludge outlet
- Sludge particles: dark brown `#3D1C02`, flow downward
- For Ra-226 stages: sludge particles are MAGENTA `#FF00FF` with "☢ RADIOACTIVE WASTE" label
- Sludge collects in a holding tank at the bottom of the schematic
- Sludge tank fill level tracks `sludge_generation_kg_per_hr`

### SVG Layout Grid

```
[RAW INTAKE] → [pH ADJ] → [CHEM DOSE] → [REACTION] → [CLARIFIER] → [IX*] → [pH CORRECT] → [OUTPUT]
                                                            ↓
                                                     [SLUDGE STREAM]
                                                            ↓
                                                     [SLUDGE TANK]
                                          (*IX shown only when applicable to site archetype)
```

### Interval and Cleanup Requirements

```javascript
useEffect(() => {
  const animInterval = setInterval(updateParticles, 16); // ~60fps
  return () => clearInterval(animInterval); // REQUIRED on unmount
}, []);
```

---

## LAYER 3 — MOLECULAR VISUALIZATION (L3)

### Overview
Three.js particle system showing molecular-level chemistry. Runs in a dedicated Three.js canvas (separate renderer from L1 globe). Shows ion exchange adsorption, precipitation nucleation, and crystallization at the particle level.

### Visualization Modes

The molecular view switches mode based on the active process stage currently highlighted in L2:

| Active Stage | Molecular Mode | Visual Description |
|---|---|---|
| pH Adjustment | PROTON_EXCHANGE | H⁺ ions (red spheres) or OH⁻ (blue) moving through solution |
| Iron Dosing | COAGULATION | Fe³⁺ ions (orange) forming clusters, drawing contaminant particles |
| As Co-precipitation | ADSORPTION | As³⁻/As⁵⁻ (yellow) drawn toward Fe(OH)₃ floc (orange cluster) |
| Ni Precipitation | PRECIPITATION | Ni²⁺ (green spheres) + OH⁻ → green-white Ni(OH)₂ crystal forming |
| Ra-226 Co-precipitation | RA226_COPRECIP | Ba²⁺ seed crystals (purple) with Ra²⁺ (magenta, pulsing) co-precipitating |
| Clarifier | SETTLING | Floc particles sinking under gravity simulation, clear layer above |
| Ion Exchange (loading) | IX_LOADING | Target ions (colored) binding to resin beads (grey spheres) |
| Ion Exchange (regen) | IX_REGEN | Eluent ions (brown) displacing bound ions, resin beads clearing |
| Clean Output | CLEAN_WATER | Blue-teal water molecules, minimal solute particles |

### Particle Definitions

```javascript
const PARTICLE_TYPES = {
  WATER:        { color: 0x0088CC, size: 0.08, count: 200 },
  H_PLUS:       { color: 0xFF4444, size: 0.06, count: 50  },
  OH_MINUS:     { color: 0x4444FF, size: 0.06, count: 50  },
  FE3_PLUS:     { color: 0xFF8800, size: 0.10, count: 30  },
  FE_FLOC:      { color: 0xA05010, size: 0.25, count: 15  }, // large aggregate
  AS_ION:       { color: 0xDDDD00, size: 0.07, count: 20  },
  NI2_PLUS:     { color: 0x00CC44, size: 0.08, count: 25  },
  NI_OH2:       { color: 0xAAFFBB, size: 0.20, count: 15  }, // precipitate crystal
  PB2_PLUS:     { color: 0x888888, size: 0.09, count: 20  },
  BA2_PLUS:     { color: 0xAA44FF, size: 0.10, count: 15  },
  RA_COPRECIP:  { color: 0xFF00FF, size: 0.12, count: 10  }, // magenta, pulsing
  RESIN_BEAD:   { color: 0x666666, size: 0.30, count: 20  }, // IX resin
  BOUND_ION:    { color: 0x00FFAA, size: 0.06, count: 0   }, // dynamically added
};
```

**PARTICLE COUNT BOUND:**
```javascript
const MAX_MOLECULAR_PARTICLES = 600; // hard cap across all types
```

### Physics — Simplified Brownian + Attraction

- All particles have random Brownian motion (small random velocity perturbation each tick)
- During reaction stages: contaminant ions have attraction force toward precipitant/floc
- During IX loading: target ions move toward nearest resin bead if within range
- During settling: floc particles have gravity component (downward Y velocity)
- Ra-226 co-precip particles: pulse in size (0.8× to 1.2× at 1 Hz) — radioactive visual cue

### Memory Management

```javascript
// REQUIRED — dispose on mode switch (not just on unmount)
function clearMolecularScene() {
  molecularParticles.forEach(p => {
    p.geometry.dispose();
    p.material.dispose();
    molecularScene.remove(p);
  });
  molecularParticles = [];
}

// Call clearMolecularScene() before switching molecular mode
```

---

## LAYER 4 — TELEMETRY ENGINE (L4)

### Overview
Real-time ticking display of chemistry parameters. All values update continuously (~1 Hz). No value is ever static. This layer IS the data that drives Layers 2, 3, and 5.

### Display Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│  SITE: Sudbury Basin Ni-Mine  |  FLOW: 312 L/s  |  ⏱ 00:14:32 │
├────────────────┬────────────────┬────────────────┬──────────┤
│  INLET         │  TREATMENT     │  OUTLET        │  STATUS  │
├────────────────┼────────────────┼────────────────┼──────────┤
│ pH    4.2      │ pH Target 9.8  │ pH    7.4      │  ✓ PASS  │
│ Turb  382 NTU  │ Stage: CLARIF  │ Turb  21 NTU   │  ✓ PASS  │
│ Ni    48.0mg/L │ Efficiency 99% │ Ni    0.09mg/L │  ✓ PASS  │
│ As    0.85mg/L │ FeCl3: 45mg/L  │ As    0.007mg/L│  ✓ PASS  │
│ Pb    0.12mg/L │ Sludge: 24kg/h │ Pb    0.006mg/L│  ✓ PASS  │
│ Ra226 n/a      │ ☢ Sludge: N/A  │ Ra226 n/a      │  —       │
├────────────────┴────────────────┴────────────────┴──────────┤
│  MASS BALANCE: 98.7% ✓  |  ENERGY: 2.4 kWh/m³  |  ✓ VALID  │
└─────────────────────────────────────────────────────────────┘
```

### Telemetry Tick Behavior

- **Base tick rate:** 1 Hz (setInterval at 1000ms)
- **Display refresh:** requestAnimationFrame (smooth number transitions via lerp)
- **Simulated noise:** each parameter gets ±2–5% random noise per tick (makes it feel live)
- **pH never NaN:** enforced at telemetry engine level with clamp + fallback
- **Treatment always reduces:** outlet concentration < inlet concentration, always enforced

### Parameter Update Rules

```javascript
function updateTelemetry(siteData, currentStage) {
  // RULE 1: pH never NaN
  const newPH = calculatePH(currentStage);
  state.pH = isNaN(newPH) ? state.pH : Math.max(0, Math.min(14, newPH));

  // RULE 2: Treatment always reduces
  state.outlet.ni_mgL = Math.min(
    state.inlet.ni_mgL * 0.999,   // outlet can never exceed inlet
    Math.max(0, calculateNiOutput(currentStage))
  );

  // RULE 3: Ra-226 in Bq/L only — never mg/L
  if (siteData.raw_water.ra226_BqL !== undefined) {
    state.outlet.ra226_BqL = calculateRa226Output(currentStage); // Bq/L
    // state.outlet.ra226_mgL ← THIS PROPERTY MUST NOT EXIST
  }

  // RULE 4: Turbidity uses site permit limit, not global target
  state.permit_turbidity_NTU = siteData.permit_turbidity_NTU;

  // RULE 5 [R4]: Energy range is train-specific — not a single global constant
  const energyRanges = {
    'HM-FULL':      { min: 0.5, max: 5.0 },
    'RAD-COPREC':   { min: 0.5, max: 5.0 },
    'NI-PRECIP':    { min: 0.5, max: 5.0 },
    'PB-AS-COPREC': { min: 0.5, max: 5.0 },
    'LI-IX':        { min: 10,  max: 60   },  // includes evaporation/crystallization
  };
  const range = energyRanges[siteData.treatment_train];
  state.energy_range_valid = state.energy_kWh_per_m3 >= range.min
                          && state.energy_kWh_per_m3 <= range.max;

  // RULE 6 [AF2]: Ni reaction chamber pH floor alert
  if (currentStage.stage_id === 'REACTION_NI' && state.pH < 9.2) {
    state.ni_ph_alert = true; // triggers AI Advisor ALERT flag
  }

  // RULE 7 [R2]: PB-AS-COPREC reaction chamber pH floor
  if (currentStage.stage_id === 'REACTION_AS_PB' && state.pH < 6.2) {
    state.pb_ph_alert = true; // triggers AI Advisor ALERT flag
  }
}
```

### Regulatory Status Indicators

| Parameter | Threshold | Status Color |
|---|---|---|
| Ra-226 | < 0.185 Bq/L | Green ✓ / Red ✗ |
| Pb | < 0.01 mg/L | Green ✓ / Red ✗ |
| As | < 0.01 mg/L | Green ✓ / Red ✗ |
| Ni | < 0.1 mg/L | Green ✓ / Red ✗ |
| pH | 6.5–8.5 | Green ✓ / Red ✗ |
| Turbidity | < site permit NTU | Green ✓ / Red ✗ |

### Cleanup Requirements

```javascript
useEffect(() => {
  const tickInterval = setInterval(runTelemetryTick, 1000);
  return () => clearInterval(tickInterval); // REQUIRED
}, [activeSiteId]);
```

---

## LAYER 5 — AI ADVISOR STREAMING PANEL (L5)

### Overview
Streaming Claude AI industrial water treatment advisor. Fires every 30–60 seconds. Output is structured (see AI_ADVISOR_OUTPUT_STRUCTURE in CLAUDE.md). Appears as a streaming text panel — characters appear live as the API streams.

### Streaming Architecture

```javascript
async function streamAIAdvisorUpdate(promptPackage) {
  // AbortController for cleanup — REQUIRED
  const controller = new AbortController();
  abortControllerRef.current = controller;

  try {
    const stream = await fetch('/api/advisor', {
      method: 'POST',
      body: JSON.stringify(promptPackage),
      signal: controller.signal
    });

    // Stream to UI character by character
    const reader = stream.body.getReader();
    // ... streaming read loop

  } catch (err) {
    if (err.name === 'AbortError') return; // normal cleanup, not an error
    console.error('AI Advisor stream error:', err);
  }
}

// REQUIRED — abort on unmount and on new stream start
useEffect(() => {
  return () => {
    abortControllerRef.current?.abort();
    clearTimeout(advisorTimerRef.current);
  };
}, []);
```

### Output Format — MANDATORY STRUCTURE

Every response MUST contain all five sections:

```
**SITUATION**
Flow rate: [X] L/s through [TREATMENT TRAIN TYPE]. Inlet [contaminants with units].
Active stages: [list]. [Radioactive sludge note if Ra-226 active].

**NOTABLE PARAMETERS**
[Any parameter within 20% of regulatory threshold — listed with value, unit, and threshold]
[If all compliant: "All parameters within regulatory thresholds at current operating conditions."]

**ASSESSMENT**
Overall removal efficiency: [X]%. [Stage-by-stage efficiency commentary].
[Mass balance status]. [Energy consumption comment].

**RECOMMENDATIONS**
[1–3 specific actionable suggestions based on current telemetry]
[If IX nearing saturation: regeneration timing recommendation]
[If pH drift observed: adjustment recommendation]

**STATUS LEVEL: [COMPLIANT / WATCH / ALERT / CRITICAL]**
```

**STATUS LEVEL logic:**
- `COMPLIANT` — all outlet parameters within regulatory limits
- `WATCH` — any parameter within 20% of limit, or mass balance closure 3–5%, or Ra-226 inlet >5 Bq/L [AF3]
- `ALERT` — any parameter exceeding limit, or mass balance closure > 5%, or Ni reaction pH < 9.2 [AF2], or PB-AS reaction pH < 6.2 [R2]
- `CRITICAL` — multiple parameters exceeding limits, or radioactive sludge handling issue

**[AF3] RAD-COPREC peak Ra-226 flag:** When Ra-226 inlet >5 Bq/L, AI Advisor NOTABLE PARAMETERS section must include:
`"Ra-226 inlet at [X] Bq/L approaches upper treatment range. Single-pass BaSO4 co-precipitation achieving >97% removal required. Polishing second-pass stage may be needed at sustained peak concentrations."`

**[AF2] Ni re-dissolution flag:** When Ni reaction chamber pH < 9.2, AI Advisor ASSESSMENT section must include:
`"ALERT: Reaction chamber pH [X] below 9.2 threshold. Risk of Ni(OH)2 re-dissolution — Ni returning to solution. Increase NaOH dose immediately."`

**[R2] PB-AS pH floor flag:** When PB-AS reaction chamber pH < 6.2, AI Advisor ASSESSMENT section must include:
`"ALERT: Reaction chamber pH [X] below 6.2 operational floor. Pb removal via Fe floc adsorption is marginal below pH 6.0. Risk of Pb target exceedance at outlet."`

**[AF1] LI-IX recovery caveat:** AI Advisor output for SITE-005 must include in ASSESSMENT:
`"Li recovery efficiency at [X]% this cycle. Target >90% is achievable across multiple regeneration cycles given Mg/Li ~6:1 selectivity challenge. Single-pass recovery may be 70–85%."`

### Trigger Interval

```javascript
// Fire AI Advisor update every 30–60 seconds (randomized to feel natural)
function scheduleNextAdvisorUpdate() {
  const delay = 30000 + Math.random() * 30000; // 30–60 seconds
  advisorTimerRef.current = setTimeout(async () => {
    await streamAIAdvisorUpdate(buildPromptPackage());
    scheduleNextAdvisorUpdate(); // re-schedule after completion
  }, delay);
}
```

**CRITICAL — No stacking:** New stream must ALWAYS abort any in-progress stream before starting. The `scheduleNextAdvisorUpdate` call happens AFTER stream completion, not before. This prevents simultaneous streams.

### UI Panel Requirements

- Streaming text appears in a dark-themed scrollable panel
- Historical responses: keep last 3 responses in scrollable history (ring buffer)
- STATUS LEVEL displayed as a colored badge:
  - COMPLIANT: Green
  - WATCH: Amber
  - ALERT: Orange
  - CRITICAL: Red (pulsing)
- "☢ RADIOACTIVE SLUDGE GENERATING" warning badge visible when active — MAGENTA
- Panel must NOT freeze or block other animation layers during API call

---

## CROSS-LAYER SYNCHRONIZATION

### Data Flow Architecture

```
[SITE SELECTION — Globe L1]
          ↓
    [SITE DATA LOAD]
          ↓
    [TELEMETRY ENGINE — L4 master clock]
          ↓ (1 Hz ticks)
     ┌────┴────┬────────────────┬─────────────────┐
     ↓         ↓                ↓                 ↓
  [L1 Globe] [L2 Process]   [L3 Molecular]    [L5 AI Advisor]
  plume color particle color  mode selection  (every 30–60 sec)
  intensity   + flow speed    + parameters
```

### Layer Independence Rule

Each layer has its own animation loop (RAF or interval). A thrown error in one layer must be caught at that layer's boundary — it must not propagate to other layers. Implement per-layer error boundaries.

---

## ANIMATION LAYER TEST REQUIREMENTS

Before Phase 3 build, these test specifications are agreed:

### L1 Tests
- [ ] Globe renders without artifacts on Chrome, Firefox, Safari
- [ ] `renderer.info.memory.geometries` count stable over 100 site switches
- [ ] `cancelAnimationFrame` called on unmount — no stacking after remount
- [ ] Plume color correctly reflects contamination level (red → teal as treatment improves)
- [ ] Radioactive sites show magenta ring

### L2 Tests
- [ ] Particle count never exceeds `MAX_PARTICLES` (500)
- [ ] IX regeneration cycle triggers at >85% resin loading
- [ ] Regeneration flow reversal visible in particle direction
- [ ] Sludge stream particles appear after every clarifier/filter press stage
- [ ] Ra-226 sludge particles are magenta with radioactive warning label
- [ ] `clearInterval` called on unmount
- [ ] [R1] HM-FULL stage sequence includes pH correction stage (PH_CORRECT_RA) between Ni clarifier and BaSO4 seed dosing — particle color shows "Clear (pH 7–8)" transition
- [ ] [R2] PB-AS-COPREC reaction chamber shows dual Pb mechanism visual — Fe floc adsorption dominant
- [ ] [R3] LI-IX pre-treatment shows three stages: COAG_FLOC → SETTLING → MULTIMEDIA_FILTER
- [ ] [R4] LI-IX evaporation/crystallization stage shows white crystal particles

### L3 Tests
- [ ] Molecular particle count never exceeds `MAX_MOLECULAR_PARTICLES` (600)
- [ ] Mode switches correctly dispose previous mode's particles
- [ ] `geometry.dispose()` and `material.dispose()` called on every mode switch
- [ ] Ra-226 particles pulse visually

### L4 Tests
- [ ] pH never NaN at any site, at any tick
- [ ] pH never outside [0, 14]
- [ ] Outlet concentration always < inlet concentration for every parameter
- [ ] Ra-226 values always in Bq/L — no mg/L representation exists in code
- [ ] Turbidity status check uses `site.permit_turbidity_NTU`, not a hardcoded constant
- [ ] `clearInterval` called on site switch and unmount
- [ ] [R4] LI-IX energy validated against 10–60 kWh/m³ (not 0.5–5.0 kWh/m³)
- [ ] [AF2] Ni reaction chamber pH < 9.2 sets `ni_ph_alert: true` in telemetry state
- [ ] [R2] PB-AS reaction chamber pH < 6.2 sets `pb_ph_alert: true` in telemetry state

### L5 Tests
- [ ] No simultaneous streams (abort enforced before new stream)
- [ ] `AbortController.abort()` called on unmount
- [ ] `clearTimeout` called on unmount
- [ ] All 5 output sections present in every response
- [ ] STATUS LEVEL present in every response
- [ ] Radioactive sludge warning appears when `radioactive_sludge_generating: true`
- [ ] No setState called after unmount
- [ ] [AF2] Ni pH floor ALERT message appears in AI Advisor when `ni_ph_alert: true`
- [ ] [R2] PB-AS pH floor ALERT message appears when `pb_ph_alert: true`
- [ ] [AF3] Ra-226 peak warning appears in NOTABLE PARAMETERS when Ra-226 inlet > 5 Bq/L
- [ ] [AF1] Li recovery caveat appears in ASSESSMENT for SITE-005

---

## GATE 1 CORRECTIONS AUDIT — INCORPORATED IN ANIMATION SPEC

| ID | Correction | Layer(s) Affected | Status |
|---|---|---|---|
| R1 | New stage PH_CORRECT_RA in HM-FULL particle color table + L2 stage sequence | L2 | ✅ INCORPORATED |
| R2 | Dual Pb mechanism in L2 color table + L4 pH floor alert + L5 ALERT message | L2, L4, L5 | ✅ INCORPORATED |
| R3 | LI-IX pre-treatment expanded to 3 stages in L2 color table and test list | L2 | ✅ INCORPORATED |
| R4 | LI-IX energy range 10–60 kWh/m³ in L4 parameter update rules + test | L4 | ✅ INCORPORATED |
| R5 | No animation impact — administrative only | — | N/A |
| AF1 | Li recovery caveat in L5 AI Advisor output + test | L5 | ✅ INCORPORATED |
| AF2 | Ni pH floor alert in L4 telemetry state + L5 AI Advisor output + tests | L4, L5 | ✅ INCORPORATED |
| AF3 | Ra-226 peak flag in L5 AI Advisor WATCH logic + test | L5 | ✅ INCORPORATED |

---

*PHASE2_ANIMATION_SPEC.md | PROJECT AQUA | March 11, 2026*
*Gate 1 corrections incorporated. Ready for Phase 3 build.*
