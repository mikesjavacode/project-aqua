# PROJECT AQUA — PHASE 3, MODULE 3-A TEST SPECIFICATIONS
## Three.js Globe Core

**Date:** March 11, 2026
**Module:** 3-A — Three.js Globe Core (scene, renderer, Earth sphere, atmosphere, stars, RAF loop)
**Status:** AWAITING REVIEW — no code to be written until both specs are approved
**Prepared by:** Build Agent (Claude Code)

---

## PART 1 — CHEMISTRY ADVISOR TEST SPECIFICATION

### Chemistry Advisor System Prompt

```
You are a PhD-level industrial water treatment and hydrometallurgy chemist with
20+ years of experience reviewing simulation software for scientific accuracy.

Your role is to review Module 3-A of PROJECT AQUA for chemistry isolation correctness.
Module 3-A is a pure rendering module — Three.js globe with Earth geometry, atmosphere,
and stars. It contains NO chemistry data, NO contaminant profiles, NO treatment logic.

Your chemistry test specification for this module serves one purpose:
Confirm that the module is correctly isolated from all chemistry concerns, and define
the chemistry boundary conditions it must NOT violate when chemistry data is later
introduced at the Module 3-B boundary.

Issue your chemistry test specification. Do not approve the build until you have
confirmed the isolation requirements and boundary contracts below.
```

---

### Chemistry Test Specification — Module 3-A

#### CA-3A-01: Chemistry Isolation Confirmation

**What this test verifies:** Module 3-A contains zero chemistry logic.

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| CA-3A-01a | No ContaminantProfile data flows into or out of this module | Module 3-A component accepts no contamination props; exports no chemistry data | Any prop, state, or export references ra226_BqL, pb_mgL, as_mgL, ni_mgL, li_mgL, pH, turbidity_NTU |
| CA-3A-01b | No chemistry calculations performed | Module contains no arithmetic on chemistry parameters | Any formula resembling concentration math, pH calculation, unit conversion |
| CA-3A-01c | No chemistry units referenced in source code | Source contains no strings 'Bq/L', 'mg/L', 'NTU', 'MCL' | Any unit string found in module 3-A source |
| CA-3A-01d | No treatment stage logic referenced | No treatment stage IDs (RAW_INTAKE, PH_ADJUST_UP, etc.) in source | Any ProcessStageID enum or string referenced |
| CA-3A-01e | No site chemistry data loaded | Globe renders with placeholder geometry only — no AQUA_SITES data consumed | Any import or reference to AQUA_SITES array or AquaSite type |

**Rationale:** This module is the scene container. Chemistry data enters at Module 3-B (site markers + plumes). Contaminating Module 3-A with chemistry imports creates coupling that the SENTINEL MEMORY RULE and layer independence rule are designed to prevent.

---

#### CA-3A-02: Chemistry Boundary Contract (pre-conditions for Module 3-B handoff)

These are not tests that run against 3-A code — they are the contract that Module 3-A must honor at its output boundary so that Module 3-B can safely attach chemistry-driven elements.

| Contract ID | Boundary Requirement | Why It Matters |
|-------------|---------------------|----------------|
| CA-3A-BC-01 | Module 3-A exposes a stable Three.js `scene` object to parent context | Module 3-B adds site markers to this scene — scene reference must be stable across renders |
| CA-3A-BC-02 | Module 3-A exposes a stable `camera` object to parent context | Raycaster (Module 3-B) requires camera reference for site click detection |
| CA-3A-BC-03 | Module 3-A RAF loop accepts an external `onBeforeRender` callback or equivalent extension point | Chemistry-driven animations (L1 plumes, L2, L3) need to run inside the same RAF loop — not stack separate loops |
| CA-3A-BC-04 | Module 3-A `dispose()` method removes ALL scene children before geometry/material disposal | When Module 3-B attaches site markers, Module 3-A's dispose must clean them up too — no orphaned chemistry objects |
| CA-3A-BC-05 | Module 3-A does not hardcode any site-specific visual properties | Colors, radii, pulse rates must all be parameterizable — chemistry data will drive them in 3-B |

---

#### CA-3A-03: Chemistry Advisor Verdict Criteria

**APPROVED:** All CA-3A-01 isolation tests pass. Boundary contracts CA-3A-BC-01 through BC-05 are confirmed in the software spec. No chemistry data of any kind in Module 3-A source.

**APPROVED WITH CORRECTIONS:** Minor chemistry reference found (e.g., a placeholder color constant that uses a chemistry-associated value) — remove before build.

**REJECTED — REBUILD:** Chemistry data, calculations, or unit references found in Module 3-A — module not isolated. Rebuild with clean separation.

---

**Chemistry Advisor Note for Build Agent:**
The Gate 1 corrections (especially the RAF loop non-stacking requirement and the SENTINEL geometry disposal rule) are software concerns, not chemistry concerns. They are correctly assigned to the Build Agent software spec below. The Chemistry Advisor's role in Module 3-A is to certify the isolation boundary — nothing more.

---
---

## PART 2 — BUILD AGENT SOFTWARE TEST SPECIFICATION

### Module 3-A — Software Test Specification

**Scope:** React component wrapping a Three.js r128 scene. Renders a rotating Earth sphere with atmosphere glow and star field. Provides scene infrastructure for all subsequent modules. No site data, no chemistry data.

**Tech stack:** React (functional component + hooks), Three.js r128, Tailwind (canvas container only)

---

### ST-3A-01: Scene Initialization Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3A-01a | WebGLRenderer created on mount | `renderer instanceof THREE.WebGLRenderer` is true after mount | Renderer not created, or wrong type |
| ST-3A-01b | Scene created on mount | `scene instanceof THREE.Scene` is true | Scene not created |
| ST-3A-01c | PerspectiveCamera created with correct FOV | `camera.fov === 45` (or project-specified value) | Wrong FOV or no camera |
| ST-3A-01d | Canvas element appended to container div | `containerRef.current.querySelector('canvas')` exists after mount | No canvas in DOM |
| ST-3A-01e | WebGL fallback message displayed if WebGL unavailable | Fallback `<div>` shown when `WebGLRenderer` throws | App crashes on no-WebGL hardware |
| ST-3A-01f | Renderer pixel ratio set to `Math.min(window.devicePixelRatio, 2)` | Pixel ratio capped at 2 — prevents excessive resolution on high-DPI displays | Uncapped pixel ratio causes GPU overload |

---

### ST-3A-02: Geometry and Object Inventory Tests

**Expected geometry count at steady state:** 3 (Earth sphere + atmosphere sphere + stars Points)

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3A-02a | Earth SphereGeometry created with correct segment count | `earthGeometry.parameters.widthSegments === 64` | Wrong segment count |
| ST-3A-02b | Atmosphere SphereGeometry radius > Earth radius | `atmosphereGeometry.parameters.radius > earthGeometry.parameters.radius` | Same or smaller radius — z-fighting |
| ST-3A-02c | Stars created as Points (not individual meshes) | `stars instanceof THREE.Points` | Individual Mesh per star — geometry explosion |
| ST-3A-02d | Atmosphere material uses AdditiveBlending | `atmosphereMaterial.blending === THREE.AdditiveBlending` | Atmosphere renders opaque |
| ST-3A-02e | `renderer.info.memory.geometries` baseline equals 3 after mount | Geometry count = 3 | Count != 3 — extra geometries |
| ST-3A-02f | `renderer.info.memory.geometries` returns to 0 after unmount | All geometries disposed | Count > 0 after unmount — leak |
| ST-3A-02g | `renderer.info.memory.textures` returns to baseline after unmount | All textures disposed | Texture count > 0 after unmount |

---

### ST-3A-03: requestAnimationFrame Loop Tests

**This is the highest-priority test group. RAF stacking is the primary failure mode identified in the SENTINEL MEMORY RULE.**

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3A-03a | Single RAF loop running after mount | Exactly one RAF callback registered; `animFrameId` ref holds a valid ID | Zero or multiple RAF IDs |
| ST-3A-03b | RAF ID stored in a ref (not state) | `animFrameRef.current` is a number; no `useState` for RAF ID | RAF ID in state causes re-render loop |
| ST-3A-03c | `cancelAnimationFrame` called on unmount | `cancelAnimationFrame` invoked with stored RAF ID during cleanup | RAF continues running after unmount |
| ST-3A-03d | RAF loop does NOT stack on React StrictMode double-invoke | After mount → unmount → mount cycle: exactly one RAF running | Two RAFs running after StrictMode cycle |
| ST-3A-03e | RAF loop does NOT stack on hot-reload | After simulated hot-reload: one RAF running | Multiple RAFs accumulate across reloads |
| ST-3A-03f | RAF loop calls `renderer.render(scene, camera)` exactly once per frame | One render call per RAF tick | Zero or multiple render calls per tick |
| ST-3A-03g | Globe rotation delta applied once per RAF frame | `earth.rotation.y` increments by exactly `ROTATION_SPEED * delta` per frame | No rotation, or double-increment |
| ST-3A-03h | Clock delta used for frame-rate-independent rotation | `THREE.Clock` or equivalent used; rotation speed constant in wall-clock time | Rotation tied to frame count — varies with FPS |

---

### ST-3A-04: Memory Management and Disposal Tests

**SENTINEL MEMORY RULE: Every geometry and material created MUST be disposed on removal.**

```javascript
// REQUIRED disposal pattern — must be verified in code review and by test
function disposeGlobe() {
  cancelAnimationFrame(animFrameRef.current);

  // Dispose all geometries
  earthGeometry.dispose();
  atmosphereGeometry.dispose();
  starsGeometry.dispose();

  // Dispose all materials
  earthMaterial.dispose();
  atmosphereMaterial.dispose();
  starsMaterial.dispose();

  // Dispose textures
  earthTexture.dispose();

  // Dispose renderer last
  renderer.dispose();

  // Remove canvas from DOM
  containerRef.current?.removeChild(renderer.domElement);
}
```

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3A-04a | `earthGeometry.dispose()` called on unmount | Verified by spy/mock on dispose | Not called — geometry leak |
| ST-3A-04b | `atmosphereGeometry.dispose()` called on unmount | Verified | Not called |
| ST-3A-04c | `starsGeometry.dispose()` called on unmount | Verified | Not called |
| ST-3A-04d | `earthMaterial.dispose()` called on unmount | Verified | Not called |
| ST-3A-04e | `atmosphereMaterial.dispose()` called on unmount | Verified | Not called |
| ST-3A-04f | `starsMaterial.dispose()` called on unmount | Verified | Not called |
| ST-3A-04g | `earthTexture.dispose()` called on unmount (if texture loaded) | Verified | Not called |
| ST-3A-04h | `renderer.dispose()` called on unmount | Verified | Not called |
| ST-3A-04i | Canvas element removed from DOM on unmount | `containerRef.current.querySelector('canvas') === null` after unmount | Canvas orphaned in DOM |
| ST-3A-04j | All refs set to null after disposal | `rendererRef.current === null`, etc. | Stale refs hold objects in memory |
| ST-3A-04k | Mount → unmount → mount 10 times: heap size does not grow | Heap reading at mount 10 ≈ heap at mount 1 (within 5%) | Monotonic heap growth — leak |
| ST-3A-04l | `renderer.forceContextLoss()` NOT called on unmount — only `renderer.dispose()` | Disposal uses `dispose()` only; context loss is destructive and irreversible | `forceContextLoss()` called — prevents context reuse on remount |
| ST-3A-04m | After `renderer.dispose()`, no further `renderer.render()` calls are made | RAF loop is cancelled (ST-3A-03c) BEFORE renderer.dispose() is called; confirmed by call order in cleanup | `renderer.render()` called after `renderer.dispose()` — Three.js warning, undefined behavior |

---

### ST-3A-05: Window Resize Handling Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3A-05a | `window.addEventListener('resize', handleResize)` called on mount | Verified by spy | Not called — resize ignored |
| ST-3A-05b | `window.removeEventListener('resize', handleResize)` called on unmount with SAME function reference | Same reference confirmed — not an anonymous lambda | Anonymous function — removeEventListener is no-op, listener leaks |
| ST-3A-05c | On resize: `camera.aspect` updated to new `width / height` | `camera.aspect` changes after resize event | Aspect ratio frozen at initial value |
| ST-3A-05d | On resize: `camera.updateProjectionMatrix()` called | Verified | Not called — distorted projection |
| ST-3A-05e | On resize: `renderer.setSize(width, height)` called | Verified | Not called — canvas wrong size |
| ST-3A-05f | No memory leak from resize listener after unmount | Firing resize event after unmount does not trigger handler | Handler fires on unmounted component — setState violation |

---

### ST-3A-06: React Lifecycle Safety Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3A-06a | All Three.js initialization inside `useEffect`, not render body | Three.js code not executed during render phase | Three.js code in render body — SSR crash, double-init |
| ST-3A-06b | No `setState` called after unmount | Component unmounts cleanly; no "Can't perform state update on unmounted component" warning | React warning in console |
| ST-3A-06c | `useEffect` cleanup function runs before next effect | Confirmed by React StrictMode test (cleanup + re-init) | No cleanup — double RAF, double renderer |
| ST-3A-06d | `useEffect` dependency array is correct and stable | Effect runs once on mount; no unintended re-runs | Missing/incorrect deps cause re-init on every render |
| ST-3A-06e | RAF loop callback does not capture stale closure values | Refs used for values that change (camera, renderer, rotation speed) — not captured via closure | Stale rotation speed, stale camera reference |

---

### ST-3A-07: External Extension Point Tests

These tests verify the boundary contracts defined in the Chemistry Advisor spec (CA-3A-BC-01 through BC-05).

| Test ID | Chemistry Contract | Test Description | Pass Condition |
|---------|--------------------|-----------------|----------------|
| ST-3A-07a | CA-3A-BC-01 | `scene` reference accessible to parent/siblings via ref or context | `sceneRef.current instanceof THREE.Scene` accessible from parent |
| ST-3A-07b | CA-3A-BC-02 | `camera` reference accessible externally | `cameraRef.current instanceof THREE.PerspectiveCamera` accessible from parent |
| ST-3A-07c | CA-3A-BC-03 | RAF loop accepts `onBeforeRender` callback | Callback fires once per RAF frame; adding/removing it does not affect RAF timing |
| ST-3A-07d | CA-3A-BC-04 | `dispose()` clears all scene children before disposal | `scene.children.length === 0` before geometry/material dispose calls |
| ST-3A-07e | CA-3A-BC-05 | Earth, atmosphere, stars accept configurable visual parameters via props | Color, rotation speed, star count parameterizable without hardcoding |

---

### ST-3A-08: Performance Baseline Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3A-08a | FPS ≥ 30 sustained over 5-minute runtime on mid-range hardware | FPS reading at t=5min ≥ 30 | FPS degrades below 30 at any point |
| ST-3A-08b | RAF frame budget: render completes within 16ms at 60fps target | `performance.now()` delta per frame ≤ 16ms | Consistent frame budget overrun |
| ST-3A-08c | GPU memory stable over 5-minute runtime | `renderer.info.memory.geometries` constant | Geometry count grows over time |
| ST-3A-08d | No console errors or warnings during 5-minute runtime | Zero errors/warnings | Any Three.js or React warning |

---

### ST-3A-09: Cross-Browser Rendering Tests

| Test ID | Test Description | Pass Condition |
|---------|-----------------|----------------|
| ST-3A-09a | Globe renders on Chrome (latest) | Sphere visible, rotating, no artifacts |
| ST-3A-09b | Globe renders on Firefox (latest) | Sphere visible, rotating, no artifacts |
| ST-3A-09c | Globe renders on Safari (latest) | Sphere visible, rotating, no artifacts — WebGL context confirmed |
| ST-3A-09d | WebGL context loss handled | `webglcontextlost` event triggers graceful fallback, not crash |

---

### ST-3A-10: Code-Level Requirements (Non-Test Checklist)

These must be confirmed by code review before Module 3-A is considered complete:

- [ ] `THREE.WebGLRenderer` instantiated with `{ antialias: true }`
- [ ] `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — capped at 2
- [ ] `THREE.Clock` used for delta-time rotation (frame-rate independent)
- [ ] RAF ID stored in `useRef` — never in `useState`
- [ ] Resize handler stored in `useRef` or as named function — never anonymous lambda
- [ ] All `useEffect` hooks have explicit cleanup return functions
- [ ] Three.js objects stored in `useRef` — never in `useState` (avoids re-render on Three.js updates)
- [ ] No direct DOM manipulation outside of renderer canvas management
- [ ] Earth texture loaded via `THREE.TextureLoader` with error callback
- [ ] Stars created as a single `THREE.Points` object — never individual `Mesh` per star
- [ ] `renderer.info.memory.geometries` accessible in development for audit

---

### ST-3A — Test Summary

| Group | Test Count | Priority |
|-------|-----------|----------|
| ST-3A-01: Scene Initialization | 6 | High |
| ST-3A-02: Geometry Inventory | 7 | Critical (SENTINEL) |
| ST-3A-03: RAF Loop | 8 | Critical (SENTINEL) |
| ST-3A-04: Memory Management | 11 | Critical (SENTINEL) |
| ST-3A-05: Resize Handling | 6 | High |
| ST-3A-06: React Lifecycle | 5 | High |
| ST-3A-07: Extension Points | 5 | High (Gate 2 prep) |
| ST-3A-08: Performance | 4 | Medium |
| ST-3A-09: Cross-Browser | 4 | Medium |
| **TOTAL** | **58** | |

---

## PART 3 — INTEGRATION TEST SPECIFICATION (Module 3-A Output Boundary)

These tests verify the handoff point from 3-A to 3-B. They cannot be run until 3-B exists, but are specified now so both modules are built to satisfy them.

| Test ID | Test Description | Pass Condition |
|---------|-----------------|----------------|
| IT-3A-3B-01 | Scene ref stable across parent re-renders | `sceneRef.current` identity unchanged after parent state update |
| IT-3A-3B-02 | Camera ref stable across parent re-renders | `cameraRef.current` identity unchanged |
| IT-3A-3B-03 | Adding site marker mesh to scene from 3-B does not break RAF loop | Globe continues rotating after `scene.add(siteMarker)` called externally |
| IT-3A-3B-04 | Removing site marker mesh from scene and calling dispose from 3-B does not affect globe geometries | Earth, atmosphere, stars still present after 3-B cleanup |
| IT-3A-3B-05 | `renderer.info.memory.geometries` after 3-B adds 10 site markers = 3 (globe) + 10 (markers) = 13 | Exact geometry count confirmed |
| IT-3A-3B-06 | After full 3-B cleanup: geometry count returns to 3 (globe only) | 10 site marker geometries disposed; globe intact |

---

## PART 4 — PRE-BUILD CHECKLIST

Before writing Module 3-A code, confirm:

- [x] Chemistry Advisor has reviewed and issued verdict — APPROVED (isolation + boundary contracts)
- [x] Build Agent software spec reviewed and approved by Michael
- [x] ST-3A-04m added (renderer.dispose() call order — RAF cancelled before dispose)
- [x] Integration test spec (Part 3) reviewed and approved
- [x] Three.js r128 confirmed as version (same as SENTINEL — not r150+)
- [x] React version confirmed (project will use React 18)
- [x] No code written prior to this approval

PRE-BUILD CHECKLIST: ✅ COMPLETE — Module 3-A build cleared to proceed

---

*PHASE3_MODULE3A_TEST_SPECS.md | PROJECT AQUA | March 11, 2026*
*Status: ✅ CLEARED FOR BUILD — Chemistry Advisor APPROVED, Michael APPROVED, ST-3A-04m added*
