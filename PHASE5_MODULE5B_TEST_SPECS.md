# PHASE 5 — MODULE 5-B TEST SPECIFICATIONS
## Molecular Visualization Layer (Layer 3)
**PROJECT AQUA | March 12, 2026**
**Status: CLEARED FOR BUILD — pending Chemistry Advisor + Build Agent joint verdict**

---

## PART 1 — CHEMISTRY ADVISOR SPECIFICATION

### Invocation

```
You are a PhD-level industrial water treatment and hydrometallurgy chemist with
20+ years of experience in selective precipitation of heavy metals and radionuclides,
ion exchange resin systems, hydromet recovery of Ni and Li, nuclear wastewater
treatment, environmental compliance (EPA, WHO), and industrial process design.

Your role is to review MODULE 5-B (Molecular Visualization Layer) for scientific accuracy.
Approach this with the mindset of Craig Gagnon — an expert who has treated 40 billion
litres of industrial wastewater and developed novel radium removal processes.
Find every error, every physically impossible claim, every sequence violation,
every unit inconsistency. Issue verdict: APPROVED / APPROVED WITH CORRECTIONS / REJECTED.

[PASTE THIS SPEC OR POST-BUILD CODE HERE]
```

---

### Section 1 — Ion Exchange: Resin Saturation and Breakthrough

#### 1.1 Resin Type and Selectivity

The LI-IX treatment train uses **lithium-selective inorganic sorbents**, specifically
H₂TiO₃ (lithium titanate) or LiMn₂O₄-type materials. These are **not** classical
sulfonated cation exchange resins. Selectivity arises from crystal lattice site geometry
(topotactic extraction): only Li⁺ (ionic radius 0.76 Å) fits the lattice cavities;
competing ions Na⁺ (1.02 Å), K⁺ (1.38 Å), Mg²⁺ (0.72 Å) are excluded by size or
charge mismatch.

Visual accuracy requirements:
- Li⁺ ions MUST be shown as the smallest cation (correct relative size)
- Competing ions (Na⁺, K⁺) shown deflecting off resin bead — NOT binding
- Mg²⁺ may occasionally enter then be ejected (partial affinity)
- No iron, arsenic, or radium ions may interact with the IX resin (these are removed
  upstream and would foul/poison the resin — see R3 correction, Gate 1)

#### 1.2 Saturation Curve — Thomas Model (Simplified)

The fractional resin loading θ follows a logistic (S-shaped) curve:

```
θ(t) = 1 / (1 + exp(−k_load × (t − t_half)))
```

Where:
- θ ∈ [0, 1] — fractional loading (0 = fresh, 1 = saturated)
- k_load = 0.10 s⁻¹ — shape factor (steep breakthrough near θ = 0.85)
- t_half = mid-cycle time where θ = 0.5 (varies by site flow rate and [Li])
- For animation purposes: t_half = 40 s (one animation cycle = ~80 s to saturation)

Chemistry test CC-5B-01a: θ(t=0) ≤ 0.05 (fresh resin, near-zero loading)
Chemistry test CC-5B-01b: θ increases monotonically during loading phase
Chemistry test CC-5B-01c: Breakthrough flag activates at θ ≥ 0.85 (matches IX_REGEN_THRESHOLD)
Chemistry test CC-5B-01d: Some Li⁺ ions pass through without binding when θ ≥ 0.85

#### 1.3 Breakthrough Behaviour

Below breakthrough (θ < 0.85):
- Virtually all Li⁺ ions approaching bead are captured (bind probability ≈ 0.95)
- Effluent Li effectively zero

Breakthrough zone (θ ∈ [0.85, 1.0]):
- Capture probability drops: P_bind = 0.95 × (1 − θ)^0.5 / (1 − 0.85)^0.5
- Li⁺ ions visibly pass through resin without binding
- Corresponds to rising Li⁺ in effluent telemetry (future Phase 6 wire-up)

Chemistry test CC-5B-01e: At θ = 0.95, at least 30% of Li⁺ ions pass through unbound

#### 1.4 Regeneration Cycle

Triggered at θ ≥ IX_REGEN_THRESHOLD (0.85):
- HCl eluent introduced: H⁺ ions compete for lattice sites, displacing Li⁺
- Elution curve: θ decays exponentially: `θ_regen(t) = θ_start × exp(−k_regen × t)`
  - k_regen = 0.08 s⁻¹ → θ drops from 0.85 → ~0.05 over 30 s (IX_REGEN_DURATION)
- Regeneration yield: (θ_start − θ_end) / θ_start ≥ 0.94 (> 90% Li recovery per AF1)

Visual accuracy requirements for regen:
- H⁺ ions (tiny, red/crimson, 2 px) arrive from eluent inlet direction
- Li⁺ ions detach from bead and move toward the concentrate/eluate outlet
- Bead colour desaturates from amber (loaded) back toward slate (fresh)
- H⁺ ions must NOT be shown remaining in the bead after regen — they are also rinsed
- After regen: brief rinse phase (1-2 s), then fresh Li⁺ loading resumes

Chemistry test CC-5B-01f: θ after regeneration ≤ 0.10 (effectively reset)
Chemistry test CC-5B-01g: Li⁺ exit trajectory during regen is toward eluate outlet
  (opposite direction to feed flow) — not toward clean water outlet

---

### Section 2 — Precipitation: Nucleation, Growth, and Settling

#### 2.1 Applicable Precipitates

| Precipitate | Treatment train | pH trigger | Morphology | Colour |
|-------------|----------------|------------|------------|--------|
| Fe(OH)₃     | HM-FULL, RAD-COPREC, PB-AS-COPREC | pH > 3.5 | Amorphous floc, irregular | Red-brown #B45309 |
| Ni(OH)₂     | HM-FULL, NI-PRECIP | pH ≥ 9.5 | Crystalline | Blue-green #14B8A6 |
| Pb(OH)₂     | HM-FULL, NI-PRECIP **only** | pH ≥ 9.0 | Fine crystalline | Pale #94A3B8 |
| BaSO₄       | HM-FULL, RAD-COPREC | Any pH | Dense crystalline, cubic | White #F1F5F9 |

**C1 CORRECTION (Chemistry Advisor):** PB-AS-COPREC operates at pH 6–7 where Pb removal
is dominated by Fe floc adsorption, NOT Pb(OH)₂ precipitation. At pH 6–7, Pb(OH)₂
precipitation is incomplete (Ksp = 1.2×10⁻²⁰, requires pH >9 for quantitative removal).
Pb²⁺ is instead co-adsorbed onto Fe(OH)₃ floc surfaces by electrostatic and surface
complexation mechanisms. The molecular scene for PB-AS-COPREC must show Pb²⁺ ions
adsorbing onto Fe(OH)₃ floc — the same mechanism as As⁵⁻. Scene type: `feoh3_adsorb`.

Note: Fe(OH)₃ is shown as the primary precipitate for As co-precipitation. As⁵⁻ is
adsorbed onto the Fe(OH)₃ floc surface — it does not form a distinct precipitate.
The molecular animation must NOT show separate As-precipitate particles.
The molecular animation must NOT show Pb(OH)₂ nucleation for PB-AS-COPREC (C1).

#### 2.2 Classical Nucleation Theory — Four-Phase Animation Model

**Phase 1 — Induction (0 to 1.5 s after reagent addition)**
- No visible particles
- Conceptual: supersaturation S = c/c_sat is building
- Visual cue only: reagent ions (Ca²⁺, OH⁻, Fe³⁺) shown diffusing, no collision products

**Phase 2 — Primary Nucleation Burst (1.5 s to 3.0 s)**
- Supersaturation threshold crossed; nucleation rate J surges
- Visual: simultaneous appearance of 5–15 nuclei (radius r₀ = 1.5 px)
- Nuclei appear quasi-randomly distributed in the reaction zone (not all at centre)
- Ni(OH)₂, Pb(OH)₂: nuclei appear as compact dots
- Fe(OH)₃: nuclei appear as irregular blobs (2 px, slightly smeared)

Chemistry test CC-5B-02a: Ni(OH)₂ nucleation phase MUST NOT begin if simulated pH < 9.5
Chemistry test CC-5B-02b: Fe(OH)₃ nucleation occurs at pH > 3.5 — always active in
  HM-FULL, PB-AS-COPREC trains (these stages operate at correct pH per treatment sequence)
Chemistry test CC-5B-02c: Nuclei count at burst ∈ [5, 15] — not a single particle,
  not an explosion of 50+

**Phase 3 — Crystal Growth by Diffusion (3.0 s onward)**
- Parabolic growth law (diffusion-limited): r(t) = r₀ + g_rate × √(t − t_nucleation)
  - g_rate = 0.30 px/s^0.5 for crystalline precipitates (Ni(OH)₂, Pb(OH)₂, BaSO₄)
  - g_rate = 0.20 px/s^0.5 for amorphous floc (Fe(OH)₃) — slower, fluffier growth
- Aggregation: when two particles of the same type have r > 3.5 px and separation
  < 2 px, merge into single particle with r = √(r₁² + r₂²) (volume conservation)
- Maximum particle radius before settling dominates: 8 px for dense, 10 px for floc

Chemistry test CC-5B-02d: r(t) curve is concave-down (parabolic) — NOT linear growth
Chemistry test CC-5B-02e: After aggregation, combined radius satisfies volume conservation
  (within ±5% tolerance): r_merged ≈ √(r₁² + r₂²)

**Phase 4 — Stokes Settling (r > 5 px for dense; r > 7 px for floc)**
- Stokes' law: v_settle = (2/9) × r² × Δρ × g / μ
- For animation, simplified to: v_settle = k_stokes × r²
  - k_stokes = 1.5 px/(s·px²) for dense precipitates (Ni(OH)₂, BaSO₄) — Δρ ≈ 2500 kg/m³
  - k_stokes = 0.6 px/(s·px²) for Fe(OH)₃ floc — Δρ ≈ 1100 kg/m³ (hydrated)
- Settling direction: downward (+y in canvas coordinates)
- On reaching bottom of reaction zone: particle joins sludge accumulation graphic

Chemistry test CC-5B-02f: Larger particles settle faster (monotonic v_settle vs r)
Chemistry test CC-5B-02g: Fe(OH)₃ floc settles at least 2× slower than Ni(OH)₂ at
  equal radius (k_stokes ratio 1.5/0.6 = 2.5)
Chemistry test CC-5B-02h: Particles never move upward after settling phase begins
  (no buoyancy reversal)

---

### Section 3 — BaSO₄ Co-precipitation of Ra²⁺

#### 3.1 Reaction and Mechanism

Primary reaction:
```
Ba²⁺(aq) + SO₄²⁻(aq) → BaSO₄(s)    Ksp = 1.1 × 10⁻¹⁰
```

Ra²⁺ incorporation:
```
Ra²⁺(aq) + BaSO₄(s) growing → (Ba,Ra)SO₄(s)
```

This is **isomorphous co-precipitation** (solid solution formation), NOT simple
surface adsorption. Ra²⁺ (ionic radius 1.43 Å) substitutes for Ba²⁺ (1.35 Å) in the
crystal lattice as the crystal grows. The Henderson-Kracek distribution coefficient:

```
D(Ra/Ba) = (X_Ra / X_Ba)_crystal / (m_Ra / m_Ba)_solution ≈ 1.0 – 1.8
```

At [Ra²⁺] << [Ba²⁺] (which is always true — Ra is pCi/L vs Ba in mg/L range), Ra²⁺
removal efficiency → 95–99%+ once sufficient BaSO₄ seed crystal is present.

#### 3.2 Visual Accuracy Requirements

**Mandatory visual sequences for BaSO₄ scene:**

1. Ba²⁺ ions (cyan #06B6D4, 4 px) and SO₄²⁻ ions (yellow #EAB308, 4 px, slightly
   elongated to represent tetrahedral sulfate) diffuse in solution
2. Ba²⁺ + SO₄²⁻ collision: when separation < 3 px AND relative velocity within
   convergence threshold → BaSO₄ nucleation event
3. BaSO₄ crystal (white #F1F5F9) grows from collision point: starts 3 px → grows
   to max 14 px via parabolic law (k_stokes = 1.5, angular/square shape to hint
   cubic crystal habit)
4. Ra²⁺ ions (magenta #D946EF, 3 px) diffuse in solution
5. Ra²⁺ approaching a BaSO₄ crystal within 4 px: Ra²⁺ trajectory bends toward
   crystal (electrostatic/lattice attraction)
6. Ra²⁺ incorporation: Ra²⁺ particle smoothly translates into crystal body and
   DISAPPEARS (alpha fade to 0 over 0.5 s) — it is now inside the crystal lattice
7. Incorporated crystal: brief fuchsia pulse/glow (border color #D946EF, 300 ms decay
   to white) indicating radioactive content
8. Crystal settles toward sludge zone (k_stokes × r²)

**What is FORBIDDEN in the animation:**
- Ra²⁺ shown adsorbing ONTO crystal surface and remaining visible as a surface particle
- Ra²⁺ attaching to Fe(OH)₃ or Ni(OH)₂ particles (wrong precipitate)
- Ra²⁺ forming standalone RaSO₄ crystals (RaSO₄ Ksp = 4.3×10⁻¹¹, close to BaSO₄;
  but at trace Ra concentrations, formation of pure RaSO₄ crystals is physically
  implausible — Ra²⁺ always co-precipitates with BaSO₄ at realistic water treatment
  concentrations)
- BaSO₄ crystals forming without BOTH Ba²⁺ AND SO₄²⁻ ions being present

Chemistry test CC-5B-03a: BaSO₄ nucleation event requires Ba²⁺ + SO₄²⁻ pair — no
  self-nucleation from single species
Chemistry test CC-5B-03b: Ra²⁺ incorporation events ONLY occur on BaSO₄ crystals —
  never on Fe(OH)₃ or other particles
Chemistry test CC-5B-03c: Ra²⁺ particle must DISAPPEAR on incorporation (alpha → 0) —
  not remain visible as surface dot
Chemistry test CC-5B-03d: Radioactive glow activates ONLY on BaSO₄ crystals that have
  incorporated at least one Ra²⁺, and ONLY on RAD-COPREC and HM-FULL sites with
  ra226_BqL > 0
Chemistry test CC-5B-03e: Scene uses BaSO₄ crystallization only on sites with
  BaCl₂ reagent dose > 0 (SITE-001, SITE-002, SITE-006, SITE-007)

---

### Section 4 — Scene-to-Train Mapping

| Treatment train | Primary scene shown | Secondary scene | Tertiary scene |
|----------------|--------------------|-----------------|-|
| HM-FULL        | Fe(OH)₃ precipitation (As co-precip) | Ni(OH)₂ precipitation | BaSO₄/Ra co-precipitation |
| RAD-COPREC     | Fe(OH)₃ precipitation | BaSO₄/Ra co-precipitation | — |
| NI-PRECIP      | Ni(OH)₂ precipitation | — | — |
| PB-AS-COPREC   | Fe(OH)₃ floc — Pb²⁺ + As⁵⁻ adsorption (`feoh3_adsorb`) [C1] | — | — |
| LI-IX          | IX saturation/breakthrough | IX regeneration | — |

Scene rotation: cycle through available scenes on a 10 s timer. Scene transitions:
crossfade over 0.5 s (clear canvas to black, fade in new scene).

Chemistry test CC-5B-04a: LI-IX train NEVER shows precipitation nucleation scene
  (no precipitation stages in LI-IX — process uses COAG_FLOC + IX only)
Chemistry test CC-5B-04b: NI-PRECIP train NEVER shows BaSO₄ or Ra²⁺ particles
  (no radium, no barium dosing on NI-PRECIP sites)
Chemistry test CC-5B-04c: RAD-COPREC scene includes BaSO₄/Ra co-precipitation
  regardless of whether ra226 polishing stage is active (BaSO₄ stage is always
  present in RAD-COPREC train)
Chemistry test CC-5B-04d [C1]: PB-AS-COPREC scene NEVER shows Pb(OH)₂ nucleation —
  only Fe(OH)₃ floc with Pb²⁺ and As⁵⁻ adsorbing ions (`feoh3_adsorb` scene only)

---

### Section 5 — Chemistry Advisor Test Summary

| Test ID | Description | Pass criterion |
|---------|-------------|----------------|
| CC-5B-01a | IX resin fresh loading | θ(t=0) ≤ 0.05 |
| CC-5B-01b | θ monotonicity | θ increases only during loading |
| CC-5B-01c | Breakthrough threshold | Breakthrough flag at θ ≥ 0.85 |
| CC-5B-01d | Breakthrough visual | Li⁺ pass-through visible at θ ≥ 0.85 |
| CC-5B-01e | Capture probability at θ=0.95 | ≥ 30% Li⁺ ions unbound |
| CC-5B-01f | Post-regen loading | θ_regen ≤ 0.10 after 30 s |
| CC-5B-01g | Regen eluate direction | Li⁺ exits toward concentrate, not product |
| CC-5B-02a | Ni(OH)₂ pH gate | No nucleation if pH_sim < 9.5 |
| CC-5B-02b | Fe(OH)₃ active in HM-FULL | Nucleation always present in Fe-dose stages |
| CC-5B-02c | Nucleation burst count | 5–15 nuclei per burst |
| CC-5B-02d | Growth curve shape | r(t) concave-down (parabolic) |
| CC-5B-02e | Aggregation volume conservation | r_merged = √(r₁²+r₂²) ±5% |
| CC-5B-02f | Stokes monotonicity | v_settle monotone in r |
| CC-5B-02g | Floc vs dense settling ratio | Fe(OH)₃ ≥ 2× slower than Ni(OH)₂ |
| CC-5B-02h | No upward settling | v_y ≥ 0 once settling begins |
| CC-5B-03a | BaSO₄ requires Ba²⁺+SO₄²⁻ pair | No single-species nucleation |
| CC-5B-03b | Ra²⁺ target specificity | Ra²⁺ only binds BaSO₄ crystals |
| CC-5B-03c | Ra²⁺ incorporation disappearance | Alpha → 0 on incorporation |
| CC-5B-03d | Radioactive glow gate | Glow only on Ra-incorporating crystals |
| CC-5B-03e | BaSO₄ scene gating | Only on sites with BaCl₂ > 0 |
| CC-5B-04a | LI-IX no precipitation | IX scene only — no nucleation particles |
| CC-5B-04b | NI-PRECIP no Ra | No BaSO₄, no Ra²⁺ particles |
| CC-5B-04c | RAD-COPREC includes BaSO₄ | BaSO₄/Ra scene in rotation |

---

## PART 2 — BUILD AGENT SOFTWARE SPECIFICATION

### Architecture Overview

**Component**: `src/components/molecular/MolecularLayer.jsx`
**Rendering**: HTML5 Canvas 2D (not WebGL — 2D particle physics sufficient, lower memory)
**Position**: Fixed panel, bottom-centre of viewport, 320×220 px canvas inside a
  dark glass container. Does not overlap TelemetryPanel (left) or ProcessFlow (right)
  at standard desktop widths. Hides gracefully if no site selected.
**RAF loop**: Independent of Globe RAF and ProcessFlow RAF — registered once on mount,
  never stacked. Uses `cancelAnimationFrame` on unmount.
**Max particles**: 600 JS objects (pre-allocated pool array). Canvas draws from this
  array — no DOM particle elements (canvas 2D draws are ephemeral).

---

### Data Structures

#### Particle Object (600 pre-allocated)
```js
{
  active: false,       // pool slot occupied
  x: 0, y: 0,         // canvas px position
  vx: 0, vy: 0,       // velocity px/s
  r: 2,               // radius px
  alpha: 1.0,         // opacity [0,1]
  color: '#FFFFFF',   // hex fill color
  type: '',           // 'li'|'na'|'hplus'|'ba'|'so4'|'ra226'|
                      // 'nioh2'|'feoh3'|'pboh2'|'baso4_crystal'
  state: 'free',      // 'free'|'bound'|'growing'|'settling'|'fading'
  age: 0,             // seconds since activation
  t_nucleation: 0,    // time when growth phase began (precipitate types)
  r0: 1.5,            // initial radius at nucleation (precipitate types)
  g_rate: 0.3,        // growth rate px/s^0.5
  k_stokes: 1.5,      // settling coefficient
  bindTarget: -1,     // index in crystals[] this particle is bound to
  radioactive: false, // true for baso4_crystal that incorporated Ra²⁺
  glowTimer: 0,       // fuchsia glow countdown seconds (radioactive crystals)
}
```

#### IX State Object (LI-IX scene only)
```js
{
  theta: 0,           // fractional loading [0, 1]
  t_cycle: 0,         // elapsed seconds in current load/regen cycle
  phase: 'loading',   // 'loading'|'breakthrough'|'regenerating'|'rinsing'
  regen_triggered: false,
}
```

#### Scene State Object
```js
{
  trainType: '',      // current treatment_train string
  sceneIndex: 0,      // which scene in rotation is active
  sceneTimer: 0,      // seconds elapsed in current scene
  SCENE_DURATION: 10, // seconds per scene
  transitioning: false,
  transitionAlpha: 1.0,
}
```

---

### Software Test Groups

#### ST-5B-01 — Particle Pool Initialization
- ST-5B-01a: `createMolecularPool(600)` returns array of 600 objects, all `active: false`
- ST-5B-01b: No canvas draw calls occur before `active: true`
- ST-5B-01c: Pool size never exceeds 600 at any simulation time (hard assert)
- ST-5B-01d: `activeCount()` returns correct count matching `active: true` entries

#### ST-5B-02 — Scene Switching and Site Change
- ST-5B-02a: On `selectedSite` change, all particles reset (`active: false`, pool cleared)
- ST-5B-02b: `ixState.theta` resets to 0 on site change
- ST-5B-02c: `sceneState.sceneIndex` resets to 0 on site change
- ST-5B-02d: No particle state leaks across site changes (simulate 5 rapid switches)
- ST-5B-02e: After 5 switches, `activeCount()` returns 0 at t=0 of new scene

#### ST-5B-03 — IX Scene (LI-IX train)
- ST-5B-03a: Only `type: 'li'`, `'na'`, `'hplus'` particles spawned in IX scene
  (no nucleation types)
- ST-5B-03b: Li⁺ bind probability ≈ 0.95 when `ixState.theta < 0.85`
- ST-5B-03c: Li⁺ bind probability drops per formula when `theta ≥ 0.85`
- ST-5B-03d: `ixState.theta` follows logistic curve — verify θ(t=40) ≈ 0.5 ± 0.05
- ST-5B-03e: Regen triggers when `theta ≥ 0.85` → `phase` changes to `'regenerating'`
- ST-5B-03f: `theta` decreases during regen, reaches ≤ 0.10 within 30 s
- ST-5B-03g: Li⁺ exit direction during regen: `vx < 0` (eluate direction, opposite to feed)
- ST-5B-03h: After regen + rinse, `phase` returns to `'loading'` and theta starts fresh
- ST-5B-03i: IX scene never spawns nucleation/precipitation particles (asserting type whitelist)

#### ST-5B-04 — Precipitation Scene
- ST-5B-04a: Nucleation burst spawns 5–15 particles within 0.2 s at Phase 2 onset
- ST-5B-04b: `r(t)` for each particle follows `r₀ + g_rate × √(t − t_nucleation)` ±2%
  — sample at t_nucleation + 1, 4, 9 s
- ST-5B-04c: No particle has `r > r0` before `t_nucleation` (no pre-growth)
- ST-5B-04d: Aggregation: merged particle radius = √(r₁² + r₂²) ±5%
- ST-5B-04e: Settling begins when r > 5 px (dense) or r > 7 px (floc)
- ST-5B-04f: `vy` of settling particle proportional to `r²` (verify at r=5 and r=8)
- ST-5B-04g: Fe(OH)₃ k_stokes = 0.6, Ni(OH)₂ k_stokes = 1.5 — verify from particle config
- ST-5B-04h: `vy ≥ 0` for all particles in settling state (no upward reversal)
- ST-5B-04i: Ni(OH)₂ nucleation: `pH_sim` must be ≥ 9.5 — tested by passing mock
  pH values of 9.0 (no nucleation) and 9.5 (nucleation allowed)
- ST-5B-04j: Particle count within scene never exceeds 200 (precipitation particle cap)

#### ST-5B-05 — BaSO₄ / Ra²⁺ Scene
- ST-5B-05a: BaSO₄ nucleation event only when a Ba²⁺ and SO₄²⁻ pair reach separation < 3 px
- ST-5B-05b: On nucleation, both parent ions are released back to pool (consumed →
  replaced by crystal particle)
- ST-5B-05c: Ra²⁺ trajectory bends toward nearest BaSO₄ crystal once within 4 px
- ST-5B-05d: On Ra²⁺ incorporation: `alpha` of Ra²⁺ particle decreases to 0 within 0.5 s,
  then `active` set to false
- ST-5B-05e: `radioactive: true` flag set on crystal after incorporating Ra²⁺
- ST-5B-05f: `glowTimer` set to 0.3 s on each Ra²⁺ incorporation event
- ST-5B-05g: Ra²⁺ particles NEVER change `bindTarget` to non-BaSO₄-crystal particles
  (assert: bindTarget particle type must be `'baso4_crystal'`)
- ST-5B-05h: BaSO₄ scene does NOT spawn on NI-PRECIP or LI-IX sites
  (verify `site.reagent_dose_rates.BaCl2_mgL === 0` check)
- ST-5B-05i: No Ra²⁺ particles spawned on sites where `rw.ra226_BqL === 0`

#### ST-5B-06 — Particle Count and Performance Bounds
- ST-5B-06a: Total `activeCount()` never exceeds 600 at any simulation tick
- ST-5B-06b: At 30 min simulated runtime, activeCount stable (no monotonic growth)
- ST-5B-06c: At 30 min simulated runtime, no JS heap growth > 5 MB above baseline
  (sample via `performance.memory.usedJSHeapSize` if available)
- ST-5B-06d: Canvas clear + redraw completes within 8 ms per frame (target 60 fps)
- ST-5B-06e: Scene rotation timer fires every 10 s ± 0.1 s (no timer drift)

#### ST-5B-07 — Memory Management (SENTINEL)
- ST-5B-07a: On component unmount, `cancelAnimationFrame(rafId)` is called
- ST-5B-07b: On unmount, `canvasRef.current` context is cleared (`clearRect` on
  full canvas) before ref is released
- ST-5B-07c: No `setState` after unmount — `mountedRef.current` guard identical to
  Module 5-C pattern (ST-5C-07d)
- ST-5B-07d: RAF loop registered ONCE with `[]` dependency — never re-registered on
  re-render (verify with render count mock)
- ST-5B-07e: On site change useEffect, scene and particle state is reset via function
  calls — NOT by re-mounting the component (no canvas element recreation)

#### ST-5B-08 — Chemistry Accuracy Integration
- ST-5B-08a: Scene-to-train map enforced: LI-IX → IX scene only (no precip types)
- ST-5B-08b: NI-PRECIP → no BaSO₄ crystal or Ra²⁺ particles ever spawned
- ST-5B-08c: HM-FULL rotation includes all three scene types
- ST-5B-08d: RAD-COPREC rotation includes Fe(OH)₃ scene and BaSO₄/Ra scene
- ST-5B-08e: No particle type mismatches (Ra²⁺ never attaches to feoh3/nioh2)

#### ST-5B-09 — Layer Independence
- ST-5B-09a: MolecularLayer mounts and runs correctly when ProcessFlow is not mounted
- ST-5B-09b: MolecularLayer mounts and runs correctly when TelemetryPanel is not mounted
- ST-5B-09c: MolecularLayer does not import from `particleEngine.js` (different pool)
- ST-5B-09d: MolecularLayer does not import from `useTelemetry.js` — it derives scene
  context from `selectedSite` directly (pH state for nucleation gating is computed
  independently from a scene-internal simulation, not from live telemetry)
- ST-5B-09e: MolecularLayer does not expose or mutate any external state (no callbacks
  to parent, no context writes in Phase 5)

---

## PART 3 — INTEGRATION TEST SPECIFICATION

### IT-5B-01: Site switch → molecular scene reset
Precondition: MolecularLayer running with SITE-002 (RAD-COPREC), BaSO₄ scene active,
crystals mid-growth.
Action: Switch to SITE-003 (NI-PRECIP).
Expected:
- All active particles immediately cleared (activeCount = 0)
- Canvas cleared (black frame rendered)
- New scene starts: Ni(OH)₂ precipitation (scene index 0)
- No BaSO₄ or Ra²⁺ particles appear in new scene

### IT-5B-02: LI-IX breakthrough → telemetry correlation
Precondition: SITE-005 selected, IX scene, theta approaching 0.85.
Expected:
- When `ixState.theta ≥ 0.85`, Li⁺ pass-through particles visible in animation
- TelemetryPanel (5-C) continues to show high Li recovery % (telemetry is independent
  — Phase 6 will wire the two together; in Phase 5 they run in parallel independently)
- No crash, no cross-state contamination

### IT-5B-03: null selectedSite → graceful hide
Precondition: MolecularLayer mounted with no site selected.
Expected: Canvas element hidden (CSS `display: none` or null-guard returning null)
Action: Select a site.
Expected: Canvas appears, scene starts within one RAF tick.

### IT-5B-04: Ra²⁺ glow gate — radioactive vs non-radioactive sites
Precondition: SITE-007 (HM-FULL, isRadioactiveSite=true, ra226_BqL=3.1).
Expected: BaSO₄ scene is in rotation; Ra²⁺ particles present; radioactive glow active
  when incorporation occurs.
Action: Switch to SITE-001 (HM-FULL, isRadioactiveSite=false, ra226_BqL=0).
Expected: BaSO₄ scene still in rotation (BaCl₂ > 0 for HM-FULL SITE-001? → check
  sites.js: SITE-001 BaCl2_mgL = 0 → BaSO₄ scene NOT shown for SITE-001).
Revised expected: SITE-001 shows Fe(OH)₃ + Ni(OH)₂ scenes only. No Ba²⁺, SO₄²⁻,
  Ra²⁺ particles.

### IT-5B-05: 100 site switches — no memory leak
Action: Rapid-fire 100 site switches (mix of all 5 treatment trains).
Expected:
- activeCount = 0 ± small active set at each switch boundary
- JS heap size at switch 100 within 5 MB of switch 1 baseline
- RAF loop still registered once (not stacked from repeated mount/unmount)

---

## PART 4 — IMPLEMENTATION NOTES (Build Agent guidance)

### Canvas layout (320 × 220 px)
```
┌─────────────────────────────────────┐
│ SCENE LABEL   [species legend]       │  ← h:20px header
├─────────────────────────────────────┤
│                                      │
│         REACTION ZONE                │  ← h:160px main canvas area
│   (particles, crystals, bead)        │
│                                      │
├─────────────────────────────────────┤
│ ░░░░░░ sludge accumulation ░░░░░░   │  ← h:28px sludge zone (settling target)
│ [☢ radioactive sludge if Ra active] │
└─────────────────────────────────────┘
```

### IX scene layout (LI-IX only)
```
                  feed →
  ●  ●  ●  →  [RESIN BEAD 30px]  →  ●  ●  (effluent)
  Li⁺             Na⁺ deflects         Li⁺ pass-through (at breakthrough)
                  H⁺ during regen: ← ← ← (concentrate)
```
- Resin bead: drawn as filled circle, 30 px radius, colour interpolated
  slate (#334155) → amber (#F59E0B) as theta increases

### Reagent ion spawning rates (per second, approximate)
| Scene | Ion | Spawn rate |
|-------|-----|------------|
| IX loading | Li⁺ | 4/s |
| IX loading | Na⁺ (competing) | 2/s |
| IX regen | H⁺ | 8/s |
| Precip | Reagent ions | 3/s |
| BaSO₄ | Ba²⁺ | 3/s |
| BaSO₄ | SO₄²⁻ | 3/s |
| BaSO₄ | Ra²⁺ | 0.5/s (trace — matches trace Ra concentration) |

### Particle colour reference
| Type | Hex | Notes |
|------|-----|-------|
| Li⁺ | #F59E0B | Warm amber — lithium flame colour |
| Na⁺ | #64748B | Slate — inert competing ion |
| K⁺  | #7C3AED | Violet |
| H⁺  | #EF4444 | Red — eluent, acidic |
| Ba²⁺ | #06B6D4 | Cyan |
| SO₄²⁻ | #EAB308 | Yellow, elongated (tetrahedral hint) |
| Ra²⁺ | #D946EF | Magenta — radioactive, trace |
| BaSO₄ crystal | #F1F5F9 | White, angular |
| Ni(OH)₂ | #14B8A6 | Teal-green |
| Fe(OH)₃ | #B45309 | Red-brown, irregular |
| Pb(OH)₂ | #94A3B8 | Pale slate |
| Ca²⁺ (reagent) | #E2E8F0 | Near-white |
| OH⁻ (reagent) | #7DD3FC | Light blue |

---

## PART 5 — OPEN QUESTIONS FOR CHEMISTRY ADVISOR PRE-BUILD REVIEW

**Q1 RESOLVED (Chemistry Advisor):** Independent internal pH_sim — no useTelemetry
coupling. Nucleation gating uses scene-internal fixed pH_sim = 9.75 for NI-PRECIP and
HM-FULL Ni(OH)₂ scenes (always ≥ 9.5, so nucleation always fires in correct scenes).

**Q2 RESOLVED (Chemistry Advisor):** PB-AS-COPREC uses `feoh3_adsorb` scene — single
Fe(OH)₃ co-precipitation visual with BOTH Pb²⁺ and As⁵⁻ adsorbing onto floc surface.
No Pb(OH)₂ nucleation (see C1 correction above).

**Q3 RESOLVED (Chemistry Advisor):** SITE-001 BaCl₂ = 0 is correct — Ra-226 load too
low to require BaSO₄ seeding. BaSO₄ scene suppressed for SITE-001 (gated on
`site.reagent_dose_rates.BaCl2_mgL > 0`). SITE-001 shows feoh3_precip + nioh2_precip only.

---

*MODULE 5-B TEST SPECIFICATIONS | PROJECT AQUA | March 12, 2026*
*Chemistry Advisor verdict required before any build begins — Iron Rule*
