# PROJECT AQUA — PHASE 3, MODULE 3-C TEST SPECIFICATIONS
## Globe ↔ UI Data Handoff

**Date:** March 11, 2026
**Module:** 3-C — Site Selection State, Data Validation Boundary, Downstream Consumer API
**Status:** CLEARED FOR BUILD — Chemistry Advisor APPROVED WITH CORRECTIONS (C1/C2/C3 + advisory incorporated)
**Prepared by:** Build Agent (Claude Code)
**Depends on:** Module 3-A (scene/camera/RAF), Module 3-B (site selection event, validated site data)

---

## PREAMBLE — WHAT MODULE 3-C IS AND WHY IT EXISTS

Module 3-B fires `onSiteSelect(site | null)` when the user clicks the globe. Module 3-C is the
data pipeline that receives that event and makes the selected site's chemistry data reliably
available to every downstream consumer: Layer 2 (Process Flow), Layer 4 (Telemetry Engine), and
Layer 5 (AI Advisor).

This module has no visual output. It is a data contract and a trust boundary.

**Why this module needs explicit specs before code:**
- Layers 2, 4, and 5 will each consume the selected site's ContaminantProfile. If the data
  arriving at those layers is stale, partially formed, wrong units, missing fields, or null when
  a site is selected — every downstream layer breaks simultaneously.
- This is the last point where chemistry data can be validated before it fans out to all layers.
  After this boundary, downstream layers TRUST the data. That trust must be earned here.
- Gate 2 (Chemistry Advisor review at module interfaces) begins at this boundary. The handoff
  format defined here is what Gate 2 will review at each Layer 2/4/5 integration point.

**Module 3-C responsibility summary:**
1. Receive site selection events from Module 3-B
2. Enforce the full Phase 2 data validation ruleset (PHASE2_DATA_ARCHITECTURE.md §11)
3. Expose validated, enriched site data to downstream consumers via a stable API
4. Handle null selection (deselect) without downstream crash
5. Prevent stale data on rapid site switching
6. Provide the data format that Gate 2 interface reviews will be measured against

---

## PART 1 — CHEMISTRY ADVISOR TEST SPECIFICATION

### Chemistry Advisor System Prompt

```
You are a PhD-level industrial water treatment and hydrometallurgy chemist with
20+ years of experience reviewing simulation software for scientific accuracy.

Module 3-C is the data pipeline between globe site selection and all downstream
chemistry-consuming layers (Process Flow, Telemetry, AI Advisor). Your role is to
certify that:

1. The data format at this boundary preserves all chemistry values with correct
   units, correct precision, and no loss of information
2. The validation rules at this boundary are complete and sufficient to protect
   downstream layers from invalid chemistry data
3. The downstream consumer API correctly structures chemistry data for Layer 4
   (Telemetry Engine) and Layer 5 (AI Advisor) — particularly: named parameters
   with units (not bare numbers), and the radioactive sludge flag
4. The null-selection (deselect) state does not produce chemistry-invalid defaults
   that could corrupt downstream calculations

Approach this as a process chemist reviewing a data handoff between two treatment
stages — the stream composition at the outlet of Stage N must match the inlet
specification of Stage N+1 exactly.

Issue verdict: APPROVED / APPROVED WITH CORRECTIONS / REJECTED — REBUILD
```

---

### Chemistry Test Specification — Module 3-C

---

#### CC-3C-01: Chemistry Data Preservation at the Boundary

**Context:** The `onSiteSelect(site)` payload from Module 3-B contains the full enriched AquaSite
object. Module 3-C must pass this downstream without modifying, dropping, or reinterpreting any
chemistry field. A boundary that silently converts units, rounds excessively, or drops fields is
a chemistry violation even if the software works.

| Test ID | Chemistry Test | Pass Condition | Fail Condition |
|---------|----------------|----------------|----------------|
| CC-3C-01a | `ra226_BqL` field name preserved end-to-end — no renaming or unit conversion | Downstream receives `selectedSite.raw_water.ra226_BqL` in Bq/L, unchanged | Field renamed to `ra226`, `ra226_mgL`, or converted to any other unit |
| CC-3C-01b | `pb_mgL`, `as_mgL`, `ni_mgL` field names preserved | All `_mgL` suffixes intact in downstream-accessible object | Any `_mgL` field renamed or stripped of unit suffix |
| CC-3C-01c | `pH` value preserved with at least 1 decimal place precision | `pH: 4.2` arrives as `4.2` not `4` or `4.20000001` | Precision lost or floating point corruption introduced |
| CC-3C-01d | `permit_turbidity_NTU` is the site-specific value, not a global constant | Each site's own `permit_turbidity_NTU` accessible downstream | Any site returns a shared/global turbidity value |
| CC-3C-01e | `isRadioactiveSite` boolean preserved — not recomputed downstream | `isRadioactiveSite` from 3-B enrichment is passed through, not recalculated | Downstream recalculates from raw data — risk of divergence from C3-approved logic |
| CC-3C-01f | `treatment_train` string preserved — Layer 2 and Layer 5 use this to select process flow | `treatment_train: 'HM-FULL'` etc. accessible as-is | Train identifier dropped, truncated, or defaulted |
| CC-3C-01g | `treatment_targets` object preserved end-to-end — Layer 4 efficiency calculations require outlet targets per contaminant | `selectedSite.treatment_targets.ni_mgL`, `.ra226_BqL`, etc. all accessible with correct values | Targets object dropped, merged into raw_water, or outlet targets recalculated from defaults |

---

#### CC-3C-02: Chemistry Validation at the Boundary (Phase 2 §11 Enforcement)

**Context:** Module 3-B validates data on load from AQUA_SITES. Module 3-C is the second
validation checkpoint — it validates the live selected-site data object before it fans out
to downstream layers. Two layers of validation prevent any corrupt state from propagating.

**Required validations at the 3-C boundary (all from PHASE2_DATA_ARCHITECTURE.md §11):**

| Test ID | Validation Rule | Implementation Required | Chemistry Rationale |
|---------|----------------|------------------------|---------------------|
| CC-3C-02a | `0.0 ≤ pH ≤ 14.0` | Clamp + log error if violated | pH outside bounds is physically impossible |
| CC-3C-02b | `!isNaN(pH)` | If NaN: use 7.0 as safe neutral fallback + log error | NaN pH would propagate through all telemetry calculations |
| CC-3C-02c | `ra226_BqL` field, not `ra226_mgL` | Type-check property name at boundary | Unit error caught before reaching AI Advisor |
| CC-3C-02d | All concentrations ≥ 0 | Clamp negative values to 0 + log | Negative concentration is unphysical |
| CC-3C-02e | `flow_rate_nominal_Ls > 0` | If ≤ 0: block handoff + log error | Zero or negative flow rate is physically impossible |
| CC-3C-02f | `permit_turbidity_NTU` present | If absent: block handoff + log error — no global default | Site-specific permit requirement: no fallback permitted |
| CC-3C-02g | `validationError !== true` | If site has upstream validation failure: block handoff, downstream receives null | Corrupt site data must not reach telemetry |
| CC-3C-02h | `ra226_BqL ≤ 10.0 Bq/L` upper bound clamp (C2) | If `ra226_BqL > 10.0`: clamp to 10.0 + log error — non-blocking, site accepted with correction | Value above validated maximum range (CLAUDE.md: 0–10 Bq/L) reaches telemetry unclamped |
| CC-3C-02i | `treatment_train` must be one of 5 valid IDs (C3) | If train not in `['HM-FULL','RAD-COPREC','NI-PRECIP','PB-AS-COPREC','LI-IX']`: block handoff + log | Unknown train ID reaches Layer 2 — process flow schematic cannot be selected |

---

#### CC-3C-03: Downstream Consumer Data Format (AI Advisor Interface)

**Context:** Layer 5 (AI Advisor) requires chemistry data in a specific structured format defined
in PHASE2_DATA_ARCHITECTURE.md §7 — named parameters WITH units in string form, not bare numbers.
Module 3-C is responsible for building this format, or confirming it can be built correctly from
the data it exposes. This is reviewed by the Chemistry Advisor because a bare number without a
unit label passed to the AI Advisor produces chemically uninterpretable output.

**Required format (AI Advisor prompt package — partial, for review):**

```
// CORRECT — named parameter with unit string
{ ra226_inlet: "6.8 Bq/L", pb_inlet: "0.04 mg/L", pH_inlet: "5.1 (dimensionless)" }

// WRONG — bare numbers
{ ra226: 6.8, pb: 0.04, pH: 5.1 }

// WRONG — unit in wrong position or wrong unit
{ ra226_inlet: "6.8 mg/L" }  ← Ra-226 must never appear in mg/L
```

| Test ID | Chemistry Test | Pass Condition |
|---------|----------------|----------------|
| CC-3C-03a | `buildAdvisorTelemetry(site)` function produces Ra-226 as `"X.X Bq/L"` string | Format: `"${ra226_BqL} Bq/L"` — never `"${ra226_BqL} mg/L"` |
| CC-3C-03b | Heavy metals formatted as `"X.XX mg/L"` with 2–3 decimal places | Pb/As/Ni: `"0.04 mg/L"` not `"0.04"` or `"40 µg/L"` |
| CC-3C-03c | pH formatted as `"X.X (dimensionless)"` | pH label confirms dimensionless nature |
| CC-3C-03d | Turbidity formatted as `"XXX NTU"` with site permit included | `"210 NTU (permit: 15 NTU)"` — permit context always present |
| CC-3C-03e | `radioactive_sludge_generating` boolean present in AI Advisor package | Copied from `isRadioactiveSite` — never computed fresh at this point |
| CC-3C-03f | Regulatory thresholds included in AI Advisor package alongside measured values | `{ ra226_EPA_MCL_BqL: 0.185, pb_EPA_limit_mgL: 0.01 }` — context for comparison |

---

#### CC-3C-04: Null Selection Chemistry Safety

**Context:** When the user deselects a site (onSiteSelect(null)), downstream layers must receive
a clean null/empty state. The chemistry concern is: a null selection must not cause downstream
layers to display stale chemistry values, zero values masquerading as compliant readings, or
undefined values that break telemetry calculations.

| Test ID | Chemistry Test | Pass Condition | Fail Condition |
|---------|----------------|----------------|----------------|
| CC-3C-04a | Null selection clears all downstream chemistry state | Downstream `selectedSite === null`; no stale contamination values displayed | Previous site's pH/concentrations remain visible |
| CC-3C-04b | Null selection does not produce `pH: 0` or `pH: NaN` as a default | Downstream shows empty/placeholder state, not a zero-pH reading | `pH: 0` displayed — implies extremely acidic water when no site selected |
| CC-3C-04c | AI Advisor is NOT triggered on null selection | `buildAdvisorTelemetry(null)` returns null; no API call made | AI Advisor fires with undefined telemetry values |
| CC-3C-04d | Null selection does not set `isRadioactiveSite: true` as a default | Default state: `isRadioactiveSite: false` or `null` — never `true` | Magenta radioactive warning shown with no site selected |

---

#### CC-3C-05: Chemistry Advisor Verdict Criteria

**APPROVED:** All CC-3C-01 through CC-3C-04 tests confirmed. Data preserved end-to-end with
correct units and field names. Validation gate complete. AI Advisor format builds named-parameter-
with-unit strings correctly. Null selection is chemistry-safe.

**APPROVED WITH CORRECTIONS:** Specific format or validation corrections listed — incorporated
before code is written.

**REJECTED — REBUILD:** Unit conversion errors, field renaming, missing validation, or AI Advisor
format producing bare numbers — downstream layers would receive invalid chemistry data.

---
---

## PART 2 — BUILD AGENT SOFTWARE TEST SPECIFICATION

### Module 3-C — Software Test Specification

**Scope:** React custom hook `useSelectedSite` + helper `buildAdvisorTelemetry()`. No new Three.js
geometry. No visual output. Pure data pipeline: receive → validate → expose → format.

**Files to be created:**
- `src/hooks/useSelectedSite.js` — custom hook managing selection state and validation
- `src/data/advisorFormat.js` — `buildAdvisorTelemetry(site)` pure function
- Update `src/App.jsx` to consume `useSelectedSite` instead of raw useState

---

### ST-3C-01: `useSelectedSite` Hook — State Management Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3C-01a | Hook returns `{ selectedSite, selectSite, clearSite }` | All three members present and correctly typed | Missing member — downstream API incomplete |
| ST-3C-01b | Initial state: `selectedSite === null` | Hook initialises to null, not to a default site | Default site selected on load — wrong |
| ST-3C-01c | `selectSite(site)` with valid enriched site → `selectedSite` updated | `selectedSite.site_id` matches passed site | State not updated |
| ST-3C-01d | `selectSite(null)` or `clearSite()` → `selectedSite === null` | Null state restored | Previous site persists |
| ST-3C-01e | Rapid `selectSite` calls: only the last site is reflected in state | No race condition — last call wins | Earlier call overwrites later call |
| ST-3C-01f | Hook state does not change identity on unrelated parent re-renders | `selectedSite` reference stable if same site selected | Unnecessary re-renders triggered in consumers |

---

### ST-3C-02: Data Validation Gate Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3C-02a | Valid site passes through unchanged | `selectedSite` equals input site object (same reference or deep-equal) | Fields modified or dropped |
| ST-3C-02b | Site with `pH: NaN` → clamped to 7.0, error logged | `selectedSite.raw_water.pH === 7.0`; `console.error` called | NaN propagates downstream |
| ST-3C-02c | Site with `pH: -1` → clamped to 0.0, error logged | `pH === 0.0` | Out-of-range pH reaches telemetry |
| ST-3C-02d | Site with `pH: 15` → clamped to 14.0, error logged | `pH === 14.0` | Out-of-range pH reaches telemetry |
| ST-3C-02e | Site with `ra226_BqL: -0.1` → clamped to 0, error logged | `ra226_BqL === 0` | Negative Ra-226 reaches telemetry |
| ST-3C-02f | Site with `validationError: true` → `selectSite` blocks, `selectedSite` remains null | `selectedSite === null`; `console.error` with site_id | Invalid site selected — corrupt data downstream |
| ST-3C-02g | Site with `flow_rate_nominal_Ls: 0` → blocked, logged | `selectedSite === null` | Zero-flow site reaches telemetry |
| ST-3C-02h | Site with missing `permit_turbidity_NTU` → blocked, logged | `selectedSite === null` | Global turbidity default silently used |
| ST-3C-02i | Site with `'ra226_mgL'` property → blocked, logged (unit error) | `selectedSite === null`; unit error logged | Wrong-unit Ra-226 reaches AI Advisor |

---

### ST-3C-03: Null Selection and Deselection Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3C-03a | `clearSite()` → `selectedSite === null` | Clean null state | Stale site object persists |
| ST-3C-03b | `selectSite(null)` is treated identically to `clearSite()` | `selectedSite === null` | Null input throws or is ignored |
| ST-3C-03c | After clearSite: `selectedSite.raw_water` is not accessible (no stale reference) | `selectedSite?.raw_water` is `undefined`, not a stale object | Stale `raw_water` accessible after clear |
| ST-3C-03d | Re-selecting the same site after deselect works correctly | `selectSite(samesite)` → state updates | Equality check prevents re-selection |

---

### ST-3C-04: `buildAdvisorTelemetry` Format Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3C-04a | `buildAdvisorTelemetry(null)` returns `null` | `null` returned — no partial object | Throws, returns `{}`, or returns object with undefined values |
| ST-3C-04b | Ra-226 field: `ra226_inlet === "${value} Bq/L"` | String includes `"Bq/L"` suffix | Bare number, wrong unit, or wrong suffix |
| ST-3C-04c | Ra-226 field NEVER contains `"mg/L"` | `ra226_inlet.includes('mg/L') === false` | Unit error in AI Advisor input |
| ST-3C-04d | Pb field: `pb_inlet === "${value} mg/L"` with 2 decimal places | `"0.04 mg/L"` not `"0.04"` | Bare number — AI Advisor cannot interpret |
| ST-3C-04e | As field: `as_inlet === "${value} mg/L"` | Same format as Pb | Wrong unit or bare number |
| ST-3C-04f | Ni field: `ni_inlet === "${value} mg/L"` | Same format | Wrong unit or bare number |
| ST-3C-04g | pH field: `pH_inlet === "${value} (dimensionless)"` | Dimensionless label present | pH formatted with unit like `"pH 4.2"` or bare `"4.2"` |
| ST-3C-04h | Turbidity: includes both measured value and site permit | `"210 NTU (permit: 15 NTU)"` | Permit omitted — AI Advisor lacks compliance context |
| ST-3C-04i | Flow rate: `flow_rate === "${value} L/s"` | L/s suffix present | Bare number or wrong unit |
| ST-3C-04j | `radioactive_sludge_generating` boolean present and correct | Matches `site.isRadioactiveSite` | Field absent or wrong value |
| ST-3C-04k | Regulatory thresholds object present with correct values | `{ ra226_EPA_MCL_BqL: 0.185, pb_EPA_limit_mgL: 0.01, as_EPA_limit_mgL: 0.01, ni_WHO_limit_mgL: 0.1 }` | Missing, wrong values, or wrong units in thresholds |
| ST-3C-04l | Fields for inactive contaminants are `null`, not `"0 mg/L"` or `"0 Bq/L"` | SITE-001 (no Ra-226): `ra226_inlet === null` | Zero string for absent contaminant — AI Advisor misreads as measured zero |
| ST-3C-04m | `buildAdvisorTelemetry` is a pure function — same input always returns same output | Referentially transparent — no side effects, no randomness | Output differs between calls with same input |
| ST-3C-04n | `treatment_train` field present in advisor package (advisory) | `package.treatment_train === site.treatment_train` — Layer 5 can reference active process train | Field absent — AI Advisor cannot reference which treatment stages are active |

---

### ST-3C-05: Downstream Consumer API Contract Tests

These tests verify that the data module 3-C exposes is structured so Layers 2, 4, 5 can
build on it without needing to re-validate or re-interpret chemistry.

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3C-05a | `selectedSite.raw_water` accessible with all inlet contaminant fields | No undefined fields for expected contaminants | Field missing — Layer 4 crashes on access |
| ST-3C-05b | `selectedSite.treatment_targets` accessible for Layer 4 efficiency calculations | Outlet targets present for all active contaminants | Targets missing — efficiency cannot be computed |
| ST-3C-05c | `selectedSite.treatment_train` string matches one of the 5 valid train IDs | Value is one of `['HM-FULL','RAD-COPREC','NI-PRECIP','PB-AS-COPREC','LI-IX']` | Invalid or missing train ID — Layer 2 cannot select process flow schematic |
| ST-3C-05d | `selectedSite.isRadioactiveSite` boolean accessible directly | No recalculation needed | Layer 2/5 forced to re-read `raw_water.ra226_BqL` and reapply C3 logic |
| ST-3C-05e | `selectedSite.permit_turbidity_NTU` accessible directly | Value is site-specific number > 0 | Global constant returned — permit misrepresented |
| ST-3C-05f | Site switch fires single state update — not multiple intermediate states | One React render per site switch | Multiple renders with partial state visible |

---

### ST-3C-06: React Lifecycle and Memory Tests

| Test ID | Test Description | Pass Condition | Fail Condition |
|---------|-----------------|----------------|----------------|
| ST-3C-06a | `useSelectedSite` hook: no memory leaks — holds one site reference at a time | After 100 site switches: held site reference = last selected site only | All 100 site objects held in memory |
| ST-3C-06b | No `setState` called after component unmount in any code path | No React unmounted component warning | Warning on unmount |
| ST-3C-06c | `buildAdvisorTelemetry` creates no closures over mutable state | Pure function — verified by calling from outside React context | Function depends on module-level mutable state |
| ST-3C-06d | Hook does not use `useEffect` for synchronous state transitions | `selectSite`/`clearSite` use `setState` directly — no async effect | `useEffect` introduces async gap → stale render between site switches |

---

### ST-3C-07: Integration Boundary Tests (3-B → 3-C → downstream)

| Test ID | Test Description | Pass Condition |
|---------|-----------------|----------------|
| ST-3C-07a | `onSiteSelect` callback from 3-B flows directly into `selectSite` | Wired in App with no transformation: `onSiteSelect={selectSite}` |
| ST-3C-07b | `selectedSite` from hook matches the site clicked on globe | Same `site_id` from globe click through to consumer |
| ST-3C-07c | `buildAdvisorTelemetry(selectedSite)` produces valid package for all 10 sites | No null fields for active contaminants; no unit errors for any site |
| ST-3C-07d | Gate 2 readiness: format produced by `buildAdvisorTelemetry` matches PHASE2_DATA_ARCHITECTURE.md §7 `AIAdvisorPromptPackage` interface | All required fields present in correct format |

---

### ST-3C — Test Summary

| Group | Test Count | Priority |
|-------|-----------|----------|
| ST-3C-01: Hook state management | 6 | High |
| ST-3C-02: Validation gate | 9 | Critical (trust boundary) |
| ST-3C-03: Null/deselect safety | 4 | High |
| ST-3C-04: Advisor format | 14 | Critical (unit safety) |
| ST-3C-05: Consumer API contract | 6 | Critical (Gate 2 prep) |
| ST-3C-06: Lifecycle / memory | 4 | High |
| ST-3C-07: Integration boundary | 4 | Critical |
| **TOTAL** | **47** | |

---

## PART 3 — INTEGRATION TEST SPECIFICATION (Module 3-C Output Boundary)

These tests define what Layers 2, 4, and 5 can rely on. Written now so those layers
are built to consume this exact contract.

| Test ID | Test Description | Pass Condition |
|---------|-----------------|----------------|
| IT-3C-L2-01 | `selectedSite.treatment_train` correctly selects process flow schematic in Layer 2 | HM-FULL → 15-stage schematic, RAD-COPREC → 11-stage, etc. |
| IT-3C-L4-01 | `selectedSite.raw_water` feeds Layer 4 telemetry with no transformation | Telemetry inlet concentrations match `raw_water` values exactly |
| IT-3C-L4-02 | `selectedSite.treatment_targets` feeds Layer 4 efficiency calculation | Efficiency = (inlet - outlet) / inlet — targets used as reference |
| IT-3C-L5-01 | `buildAdvisorTelemetry(selectedSite)` package feeds Layer 5 without modification | AI Advisor receives named parameters with units as built here |
| IT-3C-L5-02 | `radioactive_sludge_generating` flag in advisor package triggers ☢ warning in Layer 5 | Boolean correctly drives AI Advisor radioactive sludge language |
| IT-3C-NULL-01 | All layers gracefully handle `selectedSite === null` | No crash; each layer shows empty/default state |

---

## PART 4 — CODE ARCHITECTURE NOTE

Module 3-C introduces two artifacts:

**`useSelectedSite(onSiteSelect)` — custom hook**
- Wraps `useState` for `selectedSite`
- Runs validation gate on every `selectSite(site)` call
- Exposes: `{ selectedSite, selectSite, clearSite }`
- App wires: `<SiteMarkers onSiteSelect={selectSite} />`

**`buildAdvisorTelemetry(site)` — pure function**
- Input: enriched AquaSite object or null
- Output: `AIAdvisorPromptPackage` object or null
- No React dependency — callable from anywhere
- Tested in isolation (ST-3C-04m: pure function)
- Used by Layer 5 (AI Advisor) in Phase 7

This separation keeps chemistry formatting logic out of React components and fully unit-testable.

---

## PART 5 — PRE-BUILD CHECKLIST

- [x] Chemistry Advisor reviewed Part 1 and issued verdict — APPROVED WITH CORRECTIONS
- [x] C1 incorporated: CC-3C-01g treatment_targets preservation added
- [x] C2 incorporated: CC-3C-02h ra226_BqL ≤ 10.0 upper-bound clamp added
- [x] C3 incorporated: CC-3C-02i treatment_train validation against known IDs added
- [x] Advisory incorporated: ST-3C-04n treatment_train in buildAdvisorTelemetry output added
- [x] Build Agent software spec reviewed and approved by Michael
- [x] Integration test spec (Part 3) reviewed and approved
- [x] Module 3-A certified clean ✅
- [x] Module 3-B certified ✅
- [x] CLEARED FOR BUILD

---

*PHASE3_MODULE3C_TEST_SPECS.md | PROJECT AQUA | March 11, 2026*
*Status: AWAITING REVIEW — Chemistry Advisor verdict + Michael approval required before build*
