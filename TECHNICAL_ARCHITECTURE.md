# PROJECT AQUA — Technical Architecture Reference
**For use at the start of new Claude Code sessions**
Last updated: March 19, 2026 | Build status: ✓ CLEAN (post-March-19 validation pass)

---

## Quick Start

```bash
npm run dev          # dev server at http://localhost:5173
npm run build        # production build (~2.3s, one chunk-size warning — expected)
```

No environment variables. The AI Advisor posts to `/api/advisor/aqua` on the host site, which holds
the Anthropic key server-side; running standalone, the panel uses the bundled advisories in
`src/data/advisorFallbacks.js`.

---

## What This Is

A real-time, animated, AI-powered Global Industrial Water Treatment Intelligence Platform.
Ten real contaminated industrial water sites around the world. Each site runs a physics-grounded
chemistry simulation, five simultaneous animation layers, and a Claude AI advisor that issues
situational assessments every 45–90 seconds.

Built for LinkedIn portfolio demo. Dedicated to Craig Gagnon (Meta Valent Solutions, 40B litres treated).

---

## File Map

```
src/
├── App.jsx                              Root composition — owns all shared state
├── main.jsx                             Vite entry point
├── index.css                            Tailwind + global resets
│
├── data/
│   ├── sites.js                         10 sites, 5 treatment trains, all chemistry data
│   └── advisorFormat.js                 buildAdvisorTelemetry() — formats site data for AI prompt
│
├── hooks/
│   ├── useSelectedSite.js               Selection state + validation gate (Module 3-C)
│   └── useTelemetry.js                  Live telemetry simulation at 500ms tick (Module 5-C)
│
└── components/
    ├── globe/
    │   ├── GlobeScene.jsx               Three.js Earth + RAF loop (Module 3-A)
    │   └── SiteMarkers.jsx              Contamination plumes + clickable markers (Module 3-B)
    ├── process/
    │   ├── ProcessFlow.jsx              SVG animated treatment schematic (Module 5-A)
    │   ├── trainConfigs.js              Stage definitions for all 5 treatment trains
    │   └── particleEngine.js            Fixed-pool SVG particle system
    ├── molecular/
    │   └── MolecularLayer.jsx           Canvas 2D molecular particle system (Module 5-B)
    ├── telemetry/
    │   └── TelemetryPanel.jsx           Live data display panel (Module 5-C display)
    ├── advisor/
    │   └── AIAdvisorPanel.jsx           Claude streaming advisor panel (Module 7-A)
    └── ui/
        └── InfoBadge.jsx                Reusable ⓘ hover annotation badge (all panels L2–L5)
```

---

## Component Tree and Data Flow

```
App.jsx
│
├── useSelectedSite()  →  selectedSite (validated site object or null)
│                         selectSite() callback
│
├── useTelemetry(selectedSite)  →  telemetryState (500ms ticking object)
│   Contains: pH_outlet, pH_inlet, pH_reaction_chamber, af2_alert_active,
│             ni/as/pb/ra226 removal %, outlet concentrations,
│             flow_rate_Ls, turbidity in/out, sludge kg/day,
│             reagent_dose_rates, li_recovery_pct, timestamp_ms
│
├── GlobeScene          (owns Three.js scene/camera/renderer/earth, exposes via onSceneReady)
│   └── SiteMarkers     (headless — ALL meshes added to `earth` object, not `scene`)
│       Fires onSiteSelect(site|null) → App.handleSiteSelect → selectSite()
│
├── ProcessFlow(selectedSite, af2Active)
│   af2Active = telemetryState?.af2_alert_active ?? false
│   Shows AF2 pulsing red badge on Ni reaction stage when pH < 9.2
│
├── TelemetryPanel(selectedSite, telemetryState)
│   Pure display — renders telemetryState, no chemistry logic
│
├── MolecularLayer(selectedSite)
│   Canvas 2D — shows molecular-scale ion exchange / precipitation scenes
│   Switches scene type based on treatment_train
│
└── AIAdvisorPanel(selectedSite, telemetryState)
    Streams Claude API responses every 30–60s
    Reads telemetryState directly — no second useTelemetry call
```

**Critical**: `useTelemetry` is instantiated ONCE in App.jsx and passed down. Never instantiate
it again inside a child component — that creates duplicate simulation intervals.

---

## The Ten Sites

| ID       | Name                  | Train       | Key Contaminants      |
|----------|-----------------------|-------------|----------------------|
| SITE-001 | Sudbury, Canada       | HM-FULL     | Ni, As, Ra-226, Pb   |
| SITE-002 | Athabasca, Canada     | RAD-COPREC  | Ra-226, As           |
| SITE-003 | Norilsk, Russia       | NI-PRECIP   | Ni, Pb               |
| SITE-004 | Zambia Copperbelt     | PB-AS-COPREC| Pb, As               |
| SITE-005 | Atacama, Chile        | LI-IX       | Li (recovery)        |
| SITE-006 | Sellafield, UK        | RAD-COPREC  | Ra-226, As           |
| SITE-007 | Witwatersrand, SA     | HM-FULL     | Ni, As, Ra-226, Pb   |
| SITE-008 | Rio Tinto, Spain      | PB-AS-COPREC| Pb, As               |
| SITE-009 | Ok Tedi, PNG          | PB-AS-COPREC| Pb, As               |
| SITE-010 | Pilbara, Australia    | NI-PRECIP   | Ni, Pb               |

`isRadioactiveSite` = true for SITE-001, 002, 006, 007 (any `ra226_BqL > 0`).
`NI_TRAINS` = { 'HM-FULL', 'NI-PRECIP' } — sites with Ni reaction chamber and AF2 wire.

---

## The Five Treatment Trains

| Key          | Description                        | Stages |
|--------------|------------------------------------|--------|
| HM-FULL      | Hard rock mine (Ni+As+Ra-226+Pb)   | 15     |
| RAD-COPREC   | Radium legacy / nuclear            | 11     |
| NI-PRECIP    | Ni smelter (Ni+Pb)                 | 7      |
| PB-AS-COPREC | Pb/As discharge                    | 8      |
| LI-IX        | Lithium brine recovery             | 10     |

Defined in `src/components/process/trainConfigs.js`. Each stage has:
`{ id, label, colorIn, colorOut, reagent, sludgeGenerating, sludgeRadioactive,
   conditional, conditionalKey, isParallel, af2Alert, r1Correction, r2DualPb }`

---

## Five Animation Layers (all run simultaneously)

| Layer | Component | Technology | Key Details |
|-------|-----------|------------|-------------|
| L1 | GlobeScene + SiteMarkers | Three.js | Rotating Earth; plumes pulse at 0.35–0.65 opacity; teal markers pulse 0.9–1.1× |
| L2 | ProcessFlow | SVG + RAF | 500-particle fixed pool; particles flow L→R, colour-shift by stage; IX regen cycle; dynamic box sizing |
| L3 | MolecularLayer | Canvas 2D | 600-particle fixed pool; 5 scene types keyed by treatment_train + site |
| L4 | TelemetryPanel | React state | 500ms setInterval tick; pH bars, contaminant eff bars, reagent doses |
| L5 | AIAdvisorPanel | Claude API | Streaming; 5s warmup then 30–60s random interval; STATUS LEVEL badge |

---

## Panel Layout (CSS positions — current sizes)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TelemetryPanel         GLOBE (full screen)         ProcessFlow          │
│  left-6 top-6           Three.js canvas             right-6 top-6        │
│  w-[320px]              behind all panels           w-[720px] h-[340px]  │
│  bottom: 6rem                                                             │
│                                                                           │
│              MolecularLayer                                               │
│              left: 350px, bottom-24                                       │
│              460×310px canvas                                             │
│                                                                           │
│                                             AIAdvisorPanel                │
│                                             right-6 bottom-6             │
│                                             w-[720px] max-h-[380px]      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Layout notes:**
- TelemetryPanel: stops at `bottom: 6rem` (~96px from bottom); `overflow-y-auto` inner scroll; **no** `overflow-hidden` on outer div (would clip InfoBadge popover)
- ProcessFlow: top-right; dynamic box width (`computeLayout`) fills TARGET_FILL_W=692px for short trains
- MolecularLayer: left-anchored at 350px (clear of Telemetry panel); InfoBadge sits on outer wrapper div, canvas clipped separately with `overflow-hidden`
- AIAdvisorPanel: bottom-right; both right panels (ProcessFlow + AIAdvisor) are 720px wide

---

## InfoBadge — Reusable Annotation Component

`src/components/ui/InfoBadge.jsx`

Every panel L2–L5 has an ⓘ badge in its header. Props:
- `plain` — layman's description ("What you're seeing")
- `technical` — technical detail
- `popover` — card position: `'bottom-left'` | `'bottom-right'` | `'top-left'` | `'top-right'`

Uses Tailwind `group-hover` (CSS-only show/hide, no JS state). `z-50` ensures it floats above other panels.

**Critical**: The panel containing an InfoBadge must NOT have `overflow-hidden` on its outer wrapper — that clips the absolutely-positioned popover card. Inner scrollable areas can still use `overflow-y-auto`.

---

## Globe Marker Architecture (SiteMarkers.jsx)

All Three.js meshes (markers, plumes, rings) are added to the `earth` mesh object, NOT to `scene`:

```js
earth.add(marker);   // ✅ rotates with globe
scene.add(marker);   // ❌ fixed in world space — bug patched March 14
```

`GlobeScene.jsx` passes `earth` through its `onSceneReady` callback:
```js
onSceneReady?.({ scene, camera, renderer, earth });
```

`App.jsx` stores it in `sceneData.earth` and passes `earth={sceneData.earth}` to `SiteMarkers`.

Cleanup also uses `earth.remove()` (not `scene.remove()`).

---

## ProcessFlow — Dynamic Box Sizing

`computeLayout(stages)` in `ProcessFlow.jsx` calculates `boxW` per treatment train:

```js
const TARGET_FILL_W = 692;   // fills the 720px panel with margin
const MIN_BOX_W = 64;
const MAX_BOX_W = 112;
// rawBoxW = (usable - (n-1) * PIPE_LEN) / n
// boxW = clamp(rawBoxW, MIN_BOX_W, MAX_BOX_W)
// labelFontSize = min(11, 8 * boxW / MIN_BOX_W)
```

Short trains (NI-PRECIP 7 stages, LI-IX 10) expand to fill the panel with no scrollbar.
Long trains (HM-FULL 15 stages) exceed TARGET_FILL_W and require minimal horizontal scroll.

**Particle pool lazy init**: The SVG `<g>` particle layer doesn't exist when `selectedSite` is null
(placeholder rendered instead). Pool creation is deferred to the first RAF tick where
`particleLayerRef.current` is non-null, not in a mount-time `useEffect`.

---

## MolecularLayer — Canvas Dimensions

```js
const W        = 460;   // canvas width px
const H        = 310;   // canvas height px
const HDR_H    = 28;    // header bar height
const SLUDGE_H = 38;    // sludge zone height
const BEAD_R   = 44;    // IX resin bead radius
```

Font sizes in canvas draw calls: header label 11px, theta/sludge labels 10px.

Positioned at `left: 350px, bottom-24` — anchored left of center, clear of the AI Advisor panel
on the right. Outer wrapper div has no `overflow-hidden`; inner div wraps the canvas with
`overflow-hidden rounded-lg` for border-radius; InfoBadge lives on the outer wrapper.

---

## Key Implementation Rules (SENTINEL Memory Rule)

These are non-negotiable — violations cause memory leaks visible over 30–60 min runtime:

1. **Three.js disposal**: Every geometry and material created in SiteMarkers MUST be disposed
   on unmount. Lists tracked in `geometriesRef` and `materialsRef`. Test: geometry count must
   be identical before and after 100 site switches.

2. **Particle pool**: L2 (ProcessFlow) hard-capped at 500 particles. L3 (MolecularLayer) at 600.
   Pools are pre-allocated on mount, never grown. `createPool`/`destroyPool` in `particleEngine.js`.

3. **RAF cancel**: Every `requestAnimationFrame` loop stores the ID in a ref and calls
   `cancelAnimationFrame` in its cleanup function. No stacking.

4. **Interval clear**: Every `setInterval`/`setTimeout` ref-stored and cleared on unmount.
   `useTelemetry` clears previous interval before starting a new one on site change.

5. **Mounted guard**: `mountedRef.current` checked before every `setState` call in async contexts
   (`useTelemetry`, `AIAdvisorPanel`). Prevents setState on unmounted component.

6. **AbortController**: `AIAdvisorPanel` calls `abortControllerRef.current?.abort()` before
   every new request. Aborts on site-change, unmount, and new trigger. No overlapping requests.

7. **Stale closure prevention**: `AIAdvisorPanel` uses `latestSiteRef` + `latestTelemetryRef`
   updated on every render. `fireAdvisory` reads from refs, has zero deps, is stable.

---

## Claude API Integration (AIAdvisorPanel)

```js
const ENDPOINT  = '/api/advisor/aqua';   // same-origin; no key in the browser
const WARMUP_MS = 5000;
const REFRESH_MIN_MS = 45000, REFRESH_JITTER_MS = 45000;   // 45–90 s
const MAX_ADVISORIES_PER_SESSION = 20;
```

**Flow**: site selected → 5s warmup → `fireAdvisory()` → POST `{ key: site_id, context }` →
regex parses STATUS LEVEL → `runTypewriter()` reveals the text locally → `scheduleNext()` sets
recursive `setTimeout(45000 + Math.random() * 45000)`.

The system prompt is pinned server-side (`site/services/prompts_aqua.py`), not sent by the client —
otherwise the endpoint is an open LLM relay. Advisories are cached per site id, and the response
carries `source: live|cache|stale|fallback`; anything but `live` is labelled CACHED or ARCHIVED in
the header. The endpoint always returns usable text, and a failed fetch (standalone `npm run dev`)
falls back to `src/data/advisorFallbacks.js`. No error string ever reaches the panel.

Refreshes pause while `document.visibilityState === 'hidden'` and stop after
`MAX_ADVISORIES_PER_SESSION`. Model and token cap now live server-side (claude-haiku-4-5, 950).

**STATUS LEVEL** parsed via: `/\*\*STATUS LEVEL:\s*(COMPLIANT|WATCH|ALERT|CRITICAL)\*\*/`
Drives panel border colour + badge (emerald / amber / red / fuchsia-pulse).

**C7 guardrail** (critical — embedded in the server system prompt):
Ni(OH)₂ re-dissolution is acid-side risk ONLY. High-pH excursions must NOT trigger
re-dissolution warnings. Ca(OH)₂ dose reduction must NEVER be recommended when AF2 active.

**G3-OP1** (in `buildUserMessage`): Fe:As mass ratio computed inline for sites with FeCl₃ dose.
SITE-004 Zambia sits at 2.99 (advisory minimum 3.0) — annotated "⚠ BELOW MINIMUM" in prompt.

**Required prompt sections**: SITUATION / NOTABLE PARAMETERS / ASSESSMENT / RECOMMENDATIONS /
STATUS LEVEL. All telemetry passed with named parameters AND units, never bare numbers.

---

## Chemistry Rules (locked — do not change without Chemistry Advisor approval)

| Parameter | Rule |
|-----------|------|
| Ra-226 | Always Bq/L. Target < 0.185 Bq/L. BaSO₄ co-precipitation. Sludge = radioactive waste. |
| Arsenic | Iron co-precipitation (FeCl₃) ONLY. Never ion exchange for industrial WWT. |
| Nickel | Ni(OH)₂ precipitation at pH 9.5–10.5. AF2 alert at pH < 9.2 in reaction chamber. |
| Lead | Pb(OH)₂ precipitation. Dual mechanism: Fe floc adsorption dominant + Pb(OH)₂. pH floor 6.0. |
| Lithium | Selective IX resins. >90% recovery over multiple regen cycles (not single-pass). |
| pH output | Always 6.5–8.5. Never NaN. Clamped [0, 14]. |
| Turbidity | Site-specific permit limit. Never a global default. |
| Solids separation | MANDATORY clarifier/filter press after every precipitation stage. |
| IX regeneration | Must be animated. Regen cycle visible in ProcessFlow L2. |

**Ni(OH)₂ re-dissolution** (C7): Acid-side risk only — stable at high pH. High-pH excursions
must NOT trigger re-dissolution warnings anywhere in the system.

---

## useTelemetry — What It Produces

500ms interval. Returns `TelemetryState`:

```js
{
  pH_outlet,            // clamped [pH_target±0.4]; dual sinusoid + Gaussian noise
  pH_inlet,             // site raw_water.pH + noise
  pH_reaction_chamber,  // Ni trains only: nominal 9.75, roams 9.0–10.8; null otherwise
  af2_alert_active,     // true if pH_reaction < 9.2 within last 30s hold window
  ni_outlet_mgL,        // ±15% oscillation around treatment_targets.Ni; null if site has no Ni
  ni_removal_pct,       // (inlet - outlet) / inlet * 100
  as_outlet_mgL,        // same pattern
  as_removal_pct,
  pb_outlet_mgL,
  pb_removal_pct,
  ra226_outlet_BqL,     // null if site has no Ra-226
  ra226_removal_pct,
  li_recovery_pct,      // LI-IX only: nominal 90% + noise; null otherwise
  flow_rate_Ls,         // nominal ± 10% sinusoidal variation
  turbidity_inlet_NTU,  // raw_water value + noise
  turbidity_outlet_NTU, // target ± noise; compared against permit_turbidity_NTU
  nonradioactive_sludge_kgDay,
  radioactive_sludge_kgDay,   // null if !isRadioactiveSite
  reagent_dose_rates,   // { Ca_OH_2_mgL, FeCl3_mgL, BaCl2_mgL, CO2_mgL, Al2SO4_mgL, HCl_eluent_mgL }
  timestamp_ms,
}
```

---

## Visual Polish Pass — Changes Applied (March 14 session)

All the following bugs/polish items were resolved this session:

| Issue | Fix |
|-------|-----|
| Globe site markers fixed in world space (didn't rotate with Earth) | All meshes moved from `scene.add()` to `earth.add()` in SiteMarkers; `earth` passed through `onSceneReady` |
| InfoBadge (ⓘ) annotations | New `InfoBadge.jsx` component; added to L2, L3, L4, L5 with plain + technical descriptions |
| TelemetryPanel InfoBadge popover clipped | Removed `overflow-hidden` from outer panel div; inner scroll div unaffected |
| MolecularLayer InfoBadge popover clipped | Split into outer wrapper (no overflow-hidden) + inner canvas div (overflow-hidden); badge on outer |
| MolecularLayer header text too dark | Color: `#475569` → `#e2e8f0` |
| ProcessFlow particles invisible on first load | Lazy pool creation in RAF tick (was failing because `particleLayerRef.current` was null at mount when no site selected) |
| Panel sizes too small / font too small | TelemetryPanel: 268→320px; ProcessFlow: 520×300→720×340px; AIAdvisorPanel: 520×340→720×380px; MolecularLayer: 380×260→460×310px |
| ProcessFlow horizontal scrollbar | Dynamic `computeLayout()` fills 692px target width; short trains expand boxes to fill; no scrollbar on 7 of 10 sites |
| Chemical reagent labels (above boxes) smaller than stage labels | Both now use same `labelFontSize` from `computeLayout` |
| MolecularLayer overlap with AI Advisor | Repositioned from `left-1/2 -translate-x-1/2` (centered) to `left: 350px` (left-anchored) |
| MolecularLayer too small | W: 380→460, H: 260→310, BEAD_R: 36→44, font sizes bumped |

---

## Debug & Polish Pass — March 16 Session

All the following bugs and polish items were identified and resolved during the March 16 validation run:

### SiteMarkers.jsx (Module 3-B)

| Bug | Fix |
|-----|-----|
| All site markers placed ~180° off — Australia appeared over South America | `latLonToXYZ` used raw `lon` for lambda; Three.js equirectangular UV mapping has U=0 at 180°W (International Date Line). Fix: `lambda = (lon + 180) * (PI/180)`. Root cause: coordinate system origin mismatch with texture origin. |
| Markers on back of globe were clickable (click-through) | Raycaster only tested marker meshes — no earth occlusion check. Fix: added `intersectObject(earth, false)`; reject any marker hit whose distance > earth surface distance. |

**latLonToXYZ corrected formula:**
```js
const lambda = (lon + 180) * (Math.PI / 180);  // +180° aligns with equirectangular texture (U=0 at 180°W)
return new THREE.Vector3(
  -radius * Math.sin(phi) * Math.cos(lambda),
   radius * Math.cos(phi),
   radius * Math.sin(phi) * Math.sin(lambda),
);
```

### ProcessFlow.jsx (Module 5-A)

| Bug | Fix |
|-----|-----|
| RAF loop died at first sludge-generating stage → all animation frozen | Hot path referenced `STAGE_BOX_W` (undefined variable) → ReferenceError killed `requestAnimationFrame(tick)`. Fix: replaced with `sl.boxW` (per-stage dynamic value from `computeLayout`). |
| Only first sludge pipe received any particles; middle and right pipes empty | `sludgeDiverted` was a single boolean set true at the first sludge stage — subsequent stages could never divert. Fix: replaced with `sludgeDivertedAtIdx` (stage index), allowing independent diversion at every sludge-generating stage. |
| Radioactive sludge particle sizing indistinguishable from bulk sludge | Added `SLUDGE_FRACTION_RA = 0.05` constant (vs 0.15 for bulk sludge) reflecting trace Bq/L volumes. Radioactive bulge radius set to 4; brown sludge bulge radius set to 6. Reset to 3.5 on pool release. |

**Sludge diversion fix (key ref):**
```js
// Particle spawn init:
sludgeDivertedAtIdx: -1,   // tracks which stageIdx diversion was last evaluated at

// Per-frame check:
if (p.sludgeDivertedAtIdx !== p.stageIdx && sl.sludgeGenerating) {
  const midX = sl.x + sl.boxW / 2;
  if (prevX < midX && p.x >= midX) {
    p.sludgeDivertedAtIdx = p.stageIdx;
    // ... divert particle to sludge pipe
  }
}
```

### MolecularLayer.jsx (Module 5-B)

| Issue | Fix |
|-------|-----|
| Ion particles (As⁵⁻, Pb²⁺) only spawned at top of reaction zone — lower floc particles never received adsorbed ions | Changed spawn from fixed `RXN_Y + 5` (top rail) to `rand(RXN_Y + 5, RXN_BOT - 15)` (distributed throughout reaction zone); velocity changed from directional to Brownian `rand(-10, 10)` both axes. |
| FeOH₃ precipitation scene too brief — ion binding sequence cut off before it could be observed | Added `SCENE_DUR_MAP = { feoh3_precip: 20 }` per-scene duration override (was global `SCENE_DUR = 10s`). Only feoh3_precip extended — other scenes unchanged. |
| Sludge zone text unreadable (dark slate on dark background) | Text color: `#334155` → `#94a3b8`. Radioactive variant lost erroneous `44` hex alpha suffix. |

### TelemetryPanel.jsx (Module 5-C display)

| Change | Detail |
|--------|--------|
| Panel title updated | "Layer 4 — Live Telemetry" → "Layer 4 — Simulated Live Telemetry" |
| InfoBadge plain text updated | "Live readings from the treatment plant" → "Simulated readings modelled on real industrial treatment plant data" |

---

## Debug & Polish Pass — March 19 Session

### ProcessFlow.jsx (Module 5-A)

| Bug | Fix |
|-----|-----|
| Last 2–3 stage boxes appeared empty for ~44 seconds after site load | All particles spawn at stage 0 and take ~44s to traverse all 9 LI-IX stages. Stages 7–8 had no particles until the front of the queue arrived. Fix: `needsWarmStartRef` flag triggers a one-time warm-start burst on the first RAF tick after site load — 8 particles pre-seeded directly into every stage at random positions within each box. All stages visually populated from frame 1. |

**Warm-start implementation:**
```js
const needsWarmStartRef = useRef(false);

// In layout useEffect (after pool reset):
needsWarmStartRef.current = true;

// In RAF tick (first block inside site && pool && items check):
if (needsWarmStartRef.current) {
  needsWarmStartRef.current = false;
  const WARM_PER_STAGE = 8;
  for (let si = 0; si < items.length; si++) {
    const stage = items[si];
    for (let pi = 0; pi < WARM_PER_STAGE; pi++) {
      const wx = stage.x + Math.random() * stage.boxW;
      const wy = FLOW_Y + (Math.random() - 0.5) * 3;
      const wh = spawnParticle(pool, wx, wy, stage.colorIn);
      if (!wh) break;
      particlesRef.current.push({ handle: wh, x: wx, y: wy, stageIdx: si,
        sludge: false, sludgeDivertedAtIdx: -1, sludgeRadioactive: false });
    }
  }
}
```
9 stages × 8 particles = 72 pre-seeded particles (well under 500 pool cap). Normal stage-0 spawning continues alongside.

### AIAdvisorPanel.jsx (Module 7-A)

| Bug | Fix |
|-----|-----|
| Advisories truncated mid-sentence — cut off before reaching ASSESSMENT, RECOMMENDATIONS, or STATUS LEVEL | `MAX_TOKENS = 600` too tight for a 5-section response. Model was writing verbose early sections and hitting the hard wall mid-Notable-Parameters. Symptoms: dangling `- **` markdown, mid-word cutoff (`non-radioactive s`). Fix 1: `MAX_TOKENS` raised `600 → 950`. Fix 2: new `RESPONSE LENGTH RULE` added to system prompt instructing 2–3 bullets max per section and requiring STATUS LEVEL to always be reached. |

---

## Remaining Polish Items (identified, not yet done)

- Continued site-by-site visual validation (South Africa SITE-007 ✅, Papua New Guinea SITE-009 ✅, Atacama SITE-005 ✅; 7 sites remaining)
- Any further items identified by Michael during validation run

---

## Corrections History (all incorporated)

- Gate 1: R1–R5, AF1–AF3
- Gate 2 Phase 4: C1–C4 (interface chemistry corrections)
- Gate 2 Phase 6: C5, C6 (MolecularLayer scene filtering; AF2 live wire)
- Module 7-A: C7 (Ni(OH)₂ acid-side only — in system prompt)
- Gate 3: G3-OP1 (Fe:As ratio injection for SITE-004)
- Visual pass (March 14): globe marker fix, InfoBadge system, panel resizing, ProcessFlow dynamic layout, particle lazy init, MolecularLayer reposition
- Debug pass (March 16): latLonToXYZ +180° texture alignment, globe occlusion raycast, ProcessFlow RAF-kill fix (sl.boxW), per-stage sludge diversion (sludgeDivertedAtIdx), radioactive sludge particle sizing, MolecularLayer ion spawn distribution, feoh3_precip 20s duration, sludge zone text color, TelemetryPanel "Simulated" labels
- Validation pass (March 19): ProcessFlow warm-start pre-seed (needsWarmStartRef, 8 particles/stage), AIAdvisorPanel MAX_TOKENS 600→950 + RESPONSE LENGTH RULE to prevent truncation

---

## Recommended Demo Sequence

1. **Norilsk** (NI-PRECIP) — watch AF2 badge pulse when pH dips
2. **Athabasca** (RAD-COPREC) — Ra-226 ☢ stream, radioactive sludge, polishing stage
3. **Atacama** (LI-IX) — IX regen cycle animation, Li recovery meter
4. **Sudbury** (HM-FULL) — full 15-stage train, dual Pb mechanism, R1 CO₂ stage
5. **Sellafield** (RAD-COPREC) — EA/ONR regulatory regime, UK nuclear site

---

*PROJECT AQUA | Michael Fouche & Claude AI | March 2026*
