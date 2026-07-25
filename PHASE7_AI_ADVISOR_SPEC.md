# PHASE 7 — AI ADVISOR STREAMING PANEL
## Chemistry Advisor Pre-Build Specification
**PROJECT AQUA | March 12, 2026**
**Status: AWAITING CHEMISTRY ADVISOR REVIEW — DO NOT BUILD UNTIL APPROVED**

---

## 1. MODULE IDENTITY

**Module:** 7-A — AIAdvisorPanel (Layer 5)
**Dependencies:**
- `src/data/advisorFormat.js` → `buildAdvisorTelemetry(site)` — site context package (Module 3-C, certified)
- `src/hooks/useTelemetry.js` — live TelemetryState snapshot at trigger time (Module 5-C, certified)
- Claude API (Anthropic SDK) — streaming text generation
- `selectedSite` from `useSelectedSite` (Module 3-C, certified)

**Layer assignment:** L5 — AI Advisor panel, rightmost column, does not overlap L2 ProcessFlow or L4 TelemetryPanel.

**What this module does NOT do:**
- Does not compute chemistry — all values come from useTelemetry and sites.js
- Does not contradict live telemetry readings
- Does not call the API when `selectedSite` is null
- Does not allow two streams to run simultaneously

---

## 2. STREAMING ADVISORY PROMPT ARCHITECTURE

### 2-A. Trigger Interval

- First advisory fires 5 seconds after a site is selected (warm-up grace period — allows useTelemetry first tick to complete)
- Subsequent advisories fire on a randomised interval: `Math.random() * 30000 + 30000` (30–60 seconds)
- On site change: abort active stream → reset interval → 5-second warm-up before first advisory
- On site deselect (null): abort active stream → clear interval → panel shows idle state

### 2-B. System Prompt (Chemistry Advisor Persona)

The system prompt is **static** — it does not change per-site. All site-specific context is in the user message.

```
You are a PhD-level industrial water treatment and hydrometallurgy chemist with 20+ years
of experience in: selective precipitation of heavy metals and radionuclides, ion exchange
resin systems (Thomas model saturation, breakthrough, regeneration), hydromet recovery of
Ni and Li, nuclear wastewater treatment, and environmental compliance (EPA MCL, WHO
guidelines, IAEA standards, UK EA/ONR discharge consents).

You are the live process advisor for a global industrial water treatment monitoring platform.
You receive a snapshot of real-time telemetry from an active treatment facility. Your role
is to assess current process conditions and provide actionable guidance.

MANDATORY OUTPUT FORMAT — you must produce ALL FIVE sections in every response:

**SITUATION**
[Current contamination levels with units, active treatment stages, flow conditions]

**NOTABLE PARAMETERS**
[Any values approaching or exceeding regulatory thresholds — cite the threshold with units]

**ASSESSMENT**
[Process efficiency, treatment effectiveness, system health — reference specific chemistry
where relevant, e.g. Ni(OH)2 precipitation stability, BaSO4 co-precipitation efficiency,
Fe(OH)3 floc adsorption for As/Pb, IX resin saturation state]

**RECOMMENDATIONS**
[Specific, actionable process optimisation suggestions. Reference reagent doses, pH
setpoints, and stage conditions by name. Do not recommend actions that contradict the
current telemetry readings shown to you.]

**STATUS LEVEL: [COMPLIANT / WATCH / ALERT / CRITICAL]**

STATUS LEVEL definitions:
- COMPLIANT: all outlet concentrations within targets, all pH within operating range
- WATCH: any parameter approaching limit (>75% of regulatory threshold), pre-alert conditions
- ALERT: AF2 active (Ni(OH)2 re-dissolution risk), any outlet exceeding target, turbidity
  over permit limit, Li recovery below 90%
- CRITICAL: multiple simultaneous breaches, compound failure (e.g. AF2 + outlet exceedance),
  Ra-226 outlet exceeding EPA MCL 0.185 Bq/L

UNIT RULES — never violate:
- Ra-226: ALWAYS Bq/L — never mg/L
- Heavy metals (Ni, Pb, As): ALWAYS mg/L
- pH: dimensionless — do not append units
- Turbidity: NTU
- Reagent doses: mg/L
- Flow rate: L/s
- Sludge: kg/day
- Li recovery: percent (%)

Ni(OH)2 RE-DISSOLUTION RULE — critical chemistry guardrail:
Ni(OH)2 re-dissolution is an ACID-SIDE risk only. Ni(OH)2 is stable at high pH.
When AF2 ALERT ACTIVE appears in the telemetry snapshot, it means pH_reaction_chamber has
dropped below 9.2 — the correct response is Ca(OH)2 dose INCREASE to recover pH setpoint.
You must NEVER:
- Suggest that high pH (> 10.8) causes Ni(OH)2 re-dissolution — it does not
- Recommend reducing Ca(OH)2 dose when AF2 is active — this is chemically contraindicated
  and would worsen the acid-side drop
High-pH excursions may warrant CO2 correction to bring pH back within 9.2–10.8 operating
range, but Ni re-dissolution warnings apply only when pH is BELOW the floor, never above it.

RADIOACTIVE SLUDGE RULE: When radioactive_sludge_generating is true, you MUST mention
radioactive waste characterisation in your ASSESSMENT and note that Ra,BaSO4 sludge requires
classified disposal under applicable nuclear regulation. This is non-negotiable.

REGULATORY AUTHORITY RULE: When a regulatory_note is provided, apply that regulatory
authority's limits for compliance assessment. Do not apply EPA/WHO limits as primary
compliance standard when the site is subject to a different authority (e.g. EA/ONR for
Sellafield). You may cite EPA/WHO for reference comparison only.
```

### 2-C. User Message Structure (Telemetry Snapshot)

The user message is rebuilt at every trigger from two sources combined:

1. **`buildAdvisorTelemetry(site)`** — static site context package (from advisorFormat.js)
2. **Live TelemetryState snapshot** — captured at trigger time from the shared useTelemetry instance

```
FACILITY TELEMETRY SNAPSHOT — [site.name] ([site.site_id])
Timestamp: [ISO timestamp from ts.timestamp_ms]
Treatment train: [treatment_train]
Regulatory regime: [regulatory_regime]
[regulatory_note — included verbatim if non-null, omitted if null]

=== INLET CONDITIONS ===
pH (inlet):         [pH_inlet]           ← from buildAdvisorTelemetry
Turbidity (inlet):  [turbidity_inlet]    ← includes permit limit
Flow rate:          [flow_rate]
[ra226_inlet — line omitted if null]
[pb_inlet — line omitted if null]
[as_inlet — line omitted if null]
[ni_inlet — line omitted if null]
[li_inlet — line omitted if null]
Active contaminants: [active_contaminants.join(', ')]

=== CURRENT PROCESS STATE (LIVE) ===
pH (outlet, live):            [ts.pH_outlet.toFixed(2)] (dimensionless)   target: [pH_target]
[pH (reaction chamber, live): [ts.pH_reaction_chamber.toFixed(2)] — only if ts.pH_reaction_chamber !== null]
[AF2 ALERT ACTIVE: Ni(OH)2 re-dissolution risk — pH_reaction_chamber below 9.2 floor — only if ts.af2_alert_active]
Turbidity (outlet, live):     [ts.turbidity_outlet_NTU.toFixed(1)] NTU    permit: [site.permit_turbidity_NTU] NTU
Flow rate (live):              [ts.flow_rate_Ls.toFixed(1)] L/s

=== CONTAMINANT OUTLET (LIVE) ===
[Each contaminant: one line per active contaminant, omit if null]
  Ni outlet:    [ts.ni_outlet_mgL.toFixed(3)] mg/L     target: [ni_target]     removal: [ts.ni_removal_pct.toFixed(1)]%
  As outlet:    [ts.as_outlet_mgL.toFixed(3)] mg/L     target: [as_target]     removal: [ts.as_removal_pct.toFixed(1)]%
  Pb outlet:    [ts.pb_outlet_mgL.toFixed(3)] mg/L     target: [pb_target]     removal: [ts.pb_removal_pct.toFixed(1)]%
  Ra-226 outlet:[ts.ra226_outlet_BqL.toFixed(3)] Bq/L  target: [ra226_target]  removal: [ts.ra226_removal_pct.toFixed(1)]%
  Li recovery:  [ts.li_recovery_pct.toFixed(1)]%       target: [li_recovery_target_pct]%  (multi-cycle)

=== SLUDGE GENERATION (LIVE) ===
Non-radioactive sludge: [ts.nonradioactive_sludge_kgDay.toFixed(0)] kg/day
[Radioactive sludge (Ra,BaSO4): [ts.radioactive_sludge_kgDay.toFixed(1)] kg/day — only if radioactive_sludge_generating]
[RA-226 POLISHING STAGE REQUIRED: inlet [ra226_inlet] exceeds 5.0 Bq/L threshold — only if ra226_requires_polishing_stage]

=== REAGENT DOSES (LIVE) ===
[Each reagent: one line if dose > 0, omit if zero]
  Ca(OH)2:      [ts.reagent_dose_rates.Ca_OH_2_mgL] mg/L
  FeCl3:        [ts.reagent_dose_rates.FeCl3_mgL] mg/L
  BaCl2:        [ts.reagent_dose_rates.BaCl2_mgL] mg/L
  CO2:          [ts.reagent_dose_rates.CO2_mgL] mg/L
  Al2(SO4)3:    [ts.reagent_dose_rates.Al2SO4_mgL] mg/L
  HCl eluent:   [ts.reagent_dose_rates.HCl_eluent_mgL] mg/L equiv.

=== REGULATORY THRESHOLDS (REFERENCE) ===
Ra-226 EPA MCL:  0.185 Bq/L
Pb EPA limit:    0.010 mg/L
As EPA MCL:      0.010 mg/L
Ni WHO guideline: 0.100 mg/L
```

**Construction rule:** Every labelled parameter in the user message MUST include its unit inline. Bare numbers are forbidden.

---

## 3. TELEMETRY INPUT CONTRACT

### 3-A. What the AI Advisor receives at trigger time

| Source | Fields | Notes |
|--------|--------|-------|
| `buildAdvisorTelemetry(site)` | All fields — site identity, inlet concentrations with units, targets, active_contaminants, thresholds, regulatory_note, radioactive_sludge_generating, ra226_requires_polishing_stage, li_recovery_target_pct | Static at site-select time. Recaptured on every trigger (site may change). |
| `useTelemetry` TelemetryState snapshot | pH_outlet, pH_reaction_chamber, pH_inlet, af2_alert_active, ni/as/pb/ra226 outlet + removal_pct, li_recovery_pct, flow_rate_Ls, turbidity_outlet_NTU, nonradioactive_sludge_kgDay, radioactive_sludge_kgDay, reagent_dose_rates, timestamp_ms | Snapshot taken at trigger instant — not an average. |

### 3-B. Fields that MUST be present in every call (no optional omissions)

These fields are mandatory in the user message regardless of treatment train:
- pH_outlet (live)
- turbidity_outlet_NTU (live)
- flow_rate_Ls (live)
- active_contaminants list
- regulatory_regime
- timestamp

If any mandatory field is null at trigger time, the advisory must be deferred until the next tick produces a non-null value. Do not send a partial snapshot.

### 3-C. Null handling for inactive contaminants

Contaminants absent from the treatment train have null outlet values. These MUST be omitted from the user message entirely — do not send "null mg/L" or "0.000 mg/L" for inactive contaminants. The AI Advisor infers absence from the omission; the `active_contaminants` array provides explicit confirmation.

### 3-D. pH_reaction_chamber conditional

`pH_reaction_chamber` is only non-null for NI_TRAINS (`HM-FULL`, `NI-PRECIP`). The reaction chamber pH block and AF2 status block are conditionally included in the user message only when `ts.pH_reaction_chamber !== null`.

---

## 4. CHEMICAL CONDITION TRIGGERS — STATUS LEVEL LOGIC

The AI Advisor independently assesses STATUS LEVEL from the telemetry provided. However, the prompt package must be constructed to give the AI sufficient context to determine the correct level. The following thresholds define each level:

### 4-A. COMPLIANT
All of the following simultaneously true:
- All active contaminant outlet concentrations ≤ treatment target
- pH_outlet within [6.5, 8.5]
- pH_reaction_chamber ≥ 9.2 (if present)
- turbidity_outlet_NTU ≤ permit_turbidity_NTU
- af2_alert_active = false
- li_recovery_pct ≥ 90% (if LI-IX)

### 4-B. WATCH — pre-alert, not yet in breach
Any of the following:
- Any active contaminant outlet > 75% of regulatory threshold (e.g. Ni > 0.075 mg/L, As > 0.0075 mg/L, Ra-226 > 0.139 Bq/L)
- pH_reaction_chamber in [9.0, 9.2) — pre-alert zone, Ni(OH)₂ stability margin degrading
- li_recovery_pct in [88, 90) — approaching IX breakthrough without full alarm
- AF3 advisory active: Ra-226 inlet approaching 5.0 Bq/L (e.g. > 4.0 Bq/L) with polishing stage not yet flagged required

### 4-C. ALERT — active process breach
Any single:
- `af2_alert_active = true` — pH_reaction_chamber < 9.2, Ni(OH)₂ re-dissolution risk
- Any active contaminant outlet exceeds treatment target
- turbidity_outlet_NTU > permit_turbidity_NTU
- li_recovery_pct < 90% (IX resin approaching or past breakthrough for LI-IX sites)
- Ra-226 outlet approaching EPA MCL (> 0.15 Bq/L, i.e. >80% of 0.185 Bq/L limit)

### 4-D. CRITICAL — compound or severe breach
Any of the following:
- Ra-226 outlet ≥ 0.185 Bq/L — EPA MCL breach
- AF2 active AND any contaminant outlet simultaneously exceeds target (compound failure)
- Multiple (≥ 2) contaminant outlets simultaneously exceeding targets
- pH_outlet outside [5.5, 9.5] (extreme deviation from discharge window)

### 4-E. Chemistry-specific trigger notes

**AF2 (Ni(OH)₂ re-dissolution):**
The AI Advisor must reference this correctly — Ni(OH)₂ re-dissolution is an ACID-SIDE risk only.
Ni(OH)₂ is stable at high pH; raising pH does not cause re-dissolution. The risk is pH dropping
below the precipitation floor (~9.0), causing already-precipitated Ni(OH)₂ to dissolve back
into solution.

The AF2 alert fires when `pH_reaction_chamber < 9.2`, providing a 0.2 pH unit buffer above the
dissolution floor. The AI Advisor must recommend Ca(OH)₂ dose increase to recover pH setpoint.

C7 GUARDRAILS — enforced in system prompt and not overridable:
- High-pH excursions (pH_reaction_chamber > 10.8) must NOT trigger Ni(OH)₂ re-dissolution
  warnings — re-dissolution does not occur at high pH
- Ca(OH)₂ dose reduction must NEVER be recommended when AF2 is active — dose reduction
  would worsen the acid-side pH drop and is chemically contraindicated

**Ra-226 co-precipitation:**
BaSO₄ co-precipitation traps Ra²⁺ isomorphously. Efficiency is sensitive to Ba²⁺:Ra²⁺ molar ratio.
If Ra-226 removal efficiency drops (ra226_removal_pct < 95%), the AI Advisor should consider
BaCl₂ dose adequacy. Polishing stage is required when inlet > 5.0 Bq/L (AF3 Gate 1 advisory).

**As/Pb removal (PB-AS-COPREC, Fe floc adsorption):**
FeCl₃ dose drives Fe(OH)₃ floc formation. As⁵⁻ and Pb²⁺ adsorb onto floc surface at pH 6–7.
If as_removal_pct or pb_removal_pct falls below 90%, the AI Advisor should suggest FeCl₃
dose review. It must NOT recommend raising pH above 8.0 for this train (would destabilise floc).

**Li IX recovery:**
Selective IX resin saturation follows the Thomas model. Recovery > 90% is achievable over
multiple regeneration cycles. If li_recovery_pct < 90%, the AI Advisor should reference
HCl eluent dose and regen cycle frequency.

---

## 5. GUARDRAILS

### 5-A. Unit isolation (non-negotiable)
- Ra-226 values MUST appear as Bq/L in the AI Advisor output — if the model produces "mg/L" for Ra-226, this is a critical error
- The system prompt explicitly states the unit rule for Ra-226
- The user message reinforces it by labelling every Ra-226 value with "Bq/L" inline
- No cross-unit comparison is permitted (e.g. "Ra-226 is 0.03 — comparable to Ni at 0.03" is forbidden)

### 5-B. No contradicting live telemetry
The AI Advisor must not produce outputs that contradict the telemetry snapshot provided:
- If af2_alert_active = false in the snapshot, the AI must not state "AF2 alert is active"
- If turbidity_outlet_NTU is within permit, the AI must not flag a turbidity breach
- If Ra-226 outlet is 0.050 Bq/L (well within 0.185 MCL), the AI must not issue CRITICAL status
- The SITUATION section must accurately reflect the snapshot values, not fabricate conditions

### 5-C. Radioactive sludge — always flagged for Ra-226 streams
When `radioactive_sludge_generating = true`:
- The AI Advisor MUST include a radioactive waste characterisation note in ASSESSMENT
- Language must note Ra,BaSO₄ sludge requires classified disposal per applicable nuclear regulation
- ASSESSMENT omitting this when radioactive_sludge_generating = true is a spec violation

### 5-D. Polishing stage flag
When `ra226_requires_polishing_stage = true` (Ra-226 inlet > 5.0 Bq/L):
- The AI Advisor MUST reference the polishing stage requirement in RECOMMENDATIONS
- This is the AF3 Gate 1 advisory implemented at the AI Advisor output layer

### 5-E. Regulatory authority override
When `regulatory_note` is non-null (currently: SITE-006 Sellafield — EA/ONR):
- The AI Advisor must use the stated authority's framework as primary compliance reference
- It may cite EPA MCL for comparison, but must clearly label such citations as "reference only"

### 5-F. No simultaneous streams — AbortController
- One AbortController instance maintained in component ref
- Before starting any new stream: `abortControllerRef.current?.abort()`
- New AbortController created and stored before each API call
- `AbortController.abort()` called on:
  - Site change (before 5-second warm-up for new site)
  - Component unmount
  - Manual site deselect
- Stream handler checks `signal.aborted` before any setState call

### 5-G. No setState on unmounted component
- `mountedRef = useRef(true)` set on mount, `mountedRef.current = false` in cleanup
- All streaming chunk handlers guard: `if (!mountedRef.current) return`
- All interval callbacks guard: `if (!mountedRef.current) return`
- `clearInterval` called in cleanup

### 5-H. First-tick guard
- Advisory must not fire until `telemetryState` is non-null (useTelemetry first tick complete)
- 5-second warm-up on site select provides adequate buffer (first tick fires at 500ms)
- If telemetryState is still null at trigger time, defer advisory and retry at next interval

---

## 6. COMPONENT INTERFACE CONTRACT

### 6-A. Props
```js
// AIAdvisorPanel receives the shared instances already computed in App.jsx
// No duplicate useTelemetry call — same SENTINEL memory rule principle
<AIAdvisorPanel
  selectedSite={selectedSite}         // AquaSite | null
  telemetryState={telemetryState}     // TelemetryState | null — from shared useTelemetry
/>
```

### 6-B. State owned by AIAdvisorPanel
```js
const [streamText, setStreamText]       = useState('');     // Accumulated stream chunks
const [isStreaming, setIsStreaming]      = useState(false);  // Controls streaming indicator
const [statusLevel, setStatusLevel]     = useState(null);   // Parsed from last complete response
const [lastTimestamp, setLastTimestamp] = useState(null);   // Last advisory timestamp_ms
```

### 6-C. Refs owned by AIAdvisorPanel
```js
const abortControllerRef = useRef(null);  // AbortController — abort before every new stream
const mountedRef          = useRef(true); // Unmount guard
const intervalRef         = useRef(null); // Interval handle — cleared on unmount/site-change
```

### 6-D. STATUS LEVEL parsing
After stream completes, parse the final output for `**STATUS LEVEL: [LEVEL]**` using a regex:
```
/\*\*STATUS LEVEL:\s*(COMPLIANT|WATCH|ALERT|CRITICAL)\*\*/
```
Extracted level drives visual accent colour on the panel header and badge.

| Level | Panel accent | Badge colour |
|-------|-------------|-------------|
| COMPLIANT | emerald | emerald-400 |
| WATCH | amber | amber-400 |
| ALERT | red-500 | red-400 |
| CRITICAL | fuchsia | fuchsia-400 pulsing |

---

## 7. CLAUDE API INTEGRATION SPEC

### 7-A. API call structure
```js
// Streaming call — must use the Anthropic SDK streaming interface
const stream = await anthropic.messages.stream({
  model: 'claude-haiku-4-5-20251001',   // Haiku for low-latency streaming; cost-efficient
  max_tokens: 600,                        // Bounded — advisory responses must be concise
  system: SYSTEM_PROMPT,                  // Static persona prompt (Section 2-B above)
  messages: [
    { role: 'user', content: buildUserMessage(site, telemetryState) }
  ],
}, { signal: abortControllerRef.current.signal });
```

### 7-B. Model selection rationale
- `claude-haiku-4-5-20251001` — lowest latency streaming, sufficient for structured advisory output
- 600 token cap — enforces concise responses; all 5 sections fit within this limit
- No conversation history — each advisory is a fresh snapshot, no multi-turn context needed

### 7-C. Streaming chunk handling
```js
for await (const chunk of stream) {
  if (!mountedRef.current) break;
  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
    setStreamText(prev => prev + chunk.delta.text);
  }
}
// Stream complete — parse STATUS LEVEL, update lastTimestamp
```

### 7-D. Error handling
- AbortError (from AbortController.signal): silently swallowed — expected on site change and unmount
- Network error: set streamText to `'[Advisory unavailable — connection error]'`, set isStreaming to false
- API error: set streamText to `'[Advisory unavailable — API error]'`, set isStreaming to false
- No retry logic — next advisory fires at next scheduled interval

---

## 8. UI LAYOUT SPEC

- Position: right side of viewport, does not overlap ProcessFlow (left-centre) or TelemetryPanel (left)
- Width: 320px fixed
- Top: 6rem; Bottom: 6rem (mirrors TelemetryPanel height)
- Background: `bg-black/85 border border-emerald-400/30` (COMPLIANT default; border colour = statusLevel accent)
- Header: "Layer 5 — AI Advisor" + STATUS LEVEL badge + site name + "~30s" interval indicator
- Body: scrollable, renders accumulated `streamText` using a pre-formatted monospace block
- Streaming cursor: blinking block `█` appended to streamText while isStreaming = true
- Footer: timestamp of last complete advisory

**Idle state (no site selected):**
```
[Select a site to activate AI Advisor]
```

**Warm-up state (site selected, first advisory pending):**
```
[Initialising — advisory in ~5s…]
```

---

## 9. SOFTWARE TEST SPECIFICATIONS (PRE-BUILD, IRON RULE)

### ST-7A-01 — No simultaneous streams
Fire two site-change events in rapid succession (< 200ms). Verify only one stream completes. Verify abortControllerRef is replaced twice. No duplicate stream text appended.

### ST-7A-02 — AbortController on site-change
Select SITE-001. Wait for advisory to begin streaming. Select SITE-002. Verify previous stream is aborted (AbortError caught). Verify new stream starts for SITE-002 context. Verify streamText is reset before new stream.

### ST-7A-03 — AbortController on unmount
Begin streaming. Unmount component. Verify setStreamText is not called after unmount (mountedRef guard). Verify no React "setState on unmounted component" warning.

### ST-7A-04 — First-tick guard
Mount AIAdvisorPanel with telemetryState = null. Verify no API call fires. Simulate telemetryState arriving 500ms later. Verify 5-second warm-up starts from that point.

### ST-7A-05 — Unit isolation: Ra-226 always Bq/L
Mock Claude API to return a response containing "0.05 mg/L" for Ra-226. Verify the component does not display this without UI-level warning. (Note: The guardrail is in the system prompt — this test verifies the prompt construction sends Ra-226 labelled as Bq/L in the user message, making model error detectable.)
Verify user message construction: `ra226_outlet_BqL` always formatted as `"X.XXX Bq/L"`, never as `"X.XXX mg/L"`.

### ST-7A-06 — Radioactive sludge context always present
For SITE-002 (radioactive_sludge_generating = true): verify user message contains `"Radioactive sludge (Ra,BaSO4):"` line with kg/day value. Verify `radioactive_sludge_generating: true` line present.
For SITE-001 (radioactive_sludge_generating = false): verify radioactive sludge line is omitted entirely.

### ST-7A-07 — Inactive contaminant omission
For SITE-005 Atacama (LI-IX, no Ni/As/Pb/Ra-226): verify user message contains no Ni/As/Pb/Ra-226 lines. Verify `active_contaminants` contains only `['li']`. Verify no `"null"` or `"0.000 mg/L"` strings in user message.

### ST-7A-08 — Regulatory note inclusion
For SITE-006 Sellafield: verify user message contains the full regulatory_note string (EA/ONR context). For SITE-001 Sudbury: verify no regulatory_note line present in user message.

### ST-7A-09 — STATUS LEVEL parsing
Provide mock stream response with `**STATUS LEVEL: ALERT**`. Verify statusLevel state = 'ALERT'. Verify panel border accent changes to red. Verify badge shows 'ALERT' in red-400.
Repeat for all four levels.

### ST-7A-10 — Interval cleanup on unmount
Mount. Verify interval registered. Unmount. Verify clearInterval called. Re-mount. Verify only one interval active (no stacking).

### ST-7A-11 — Interval cleanup on site-change
Select SITE-001. Wait for first advisory. Select SITE-002. Verify previous interval cleared. Verify new 5-second warm-up starts. Verify only one interval active after second site selection.

### ST-7A-12 — 100 advisory calls (stress)
Run with a single site for 100 advisory cycles (reduce interval to 100ms for test). Verify: no memory growth, no duplicate renders, streamText resets cleanly between calls, isStreaming resets to false after each completion.

### ST-7A-13 — pH_reaction_chamber conditional
For SITE-005 Atacama (LI-IX, no reaction chamber): verify user message contains no `pH (reaction chamber, live)` line. For SITE-001 Sudbury (HM-FULL): verify line is present.

### ST-7A-14 — AF2 banner in user message
Set af2_alert_active = true (mock useTelemetry). Verify user message contains `"AF2 ALERT ACTIVE:"` line. Set af2_alert_active = false. Verify line is absent.

### ST-7A-15 — Max tokens enforced
Verify API call always includes `max_tokens: 600`. Verify no call is made without this parameter.

---

## 10. INTEGRATION TEST SPECIFICATIONS

### IT-7A-01 — Single useTelemetry instance (no duplicate hook)
Verify AIAdvisorPanel does NOT call useTelemetry internally. Verify it receives telemetryState as prop from App.jsx shared instance. Both TelemetryPanel and AIAdvisorPanel receive identical telemetryState object reference.

### IT-7A-02 — Telemetry-to-prompt coherence
Capture TelemetryState snapshot at trigger time. Capture user message sent to API. Verify every numeric value in the user message matches the corresponding field in the snapshot within ± float formatting precision.

### IT-7A-03 — AF2 live wire coherence
When useTelemetry af2_alert_active = true: verify ProcessFlow badge pulses red (6-B), TelemetryPanel reaction chamber banner shows, AIAdvisorPanel user message contains AF2 ALERT line, and subsequent AI advisory produces ALERT or CRITICAL status level.

### IT-7A-04 — Site switch end-to-end
Switch from SITE-002 (RAD-COPREC, radioactive) to SITE-005 (LI-IX, Li). Verify: (1) stream aborted, (2) TelemetryPanel updates to Li-only view, (3) AI Advisor user message no longer contains Ra-226 lines, (4) new advisory mentions Li recovery.

---

## 11. CHEMISTRY ADVISOR REVIEW CHECKLIST

The Chemistry Advisor must verify ALL of the following before issuing verdict:

**Prompt architecture:**
- [ ] System prompt persona correctly represents PhD-level industrial water treatment expertise
- [ ] All five mandatory output sections are specified and described accurately
- [ ] STATUS LEVEL definitions (COMPLIANT/WATCH/ALERT/CRITICAL) are chemically correct
- [ ] AF2 trigger description (Ni(OH)₂ re-dissolution, pH < 9.2) is scientifically accurate
- [ ] C7: Ni(OH)₂ re-dissolution correctly scoped to acid-side only — no high-pH warnings, no Ca(OH)₂ dose reduction when AF2 active
- [ ] Ra-226 BaSO₄ co-precipitation mechanism description is correct
- [ ] As/Pb Fe floc adsorption mechanism description is correct (pH 6–7, NOT Pb(OH)₂ for PB-AS-COPREC)
- [ ] Li IX Thomas model reference is appropriate
- [ ] Radioactive sludge mandatory flag rule is correctly specified

**Telemetry contract:**
- [ ] Ra-226 unit rule enforced end-to-end (Bq/L in user message construction)
- [ ] Null contaminant omission rule prevents fabricated zero-concentration lines
- [ ] Regulatory note override prevents EPA limits misapplied to EA/ONR sites
- [ ] Active contaminants list correctly disambiguates inactive fields
- [ ] pH_reaction_chamber conditional correctly scoped to NI_TRAINS

**Chemical condition triggers:**
- [ ] WATCH thresholds (75% of limit) are appropriate for industrial process early warning
- [ ] ALERT AF2 trigger matches CLAUDE.md AF2 advisory specification (pH < 9.2)
- [ ] CRITICAL Ra-226 threshold (0.185 Bq/L) matches EPA MCL exactly
- [ ] No threshold creates a false CRITICAL for normal operating variance

**Guardrails:**
- [ ] Unit isolation guardrail is sufficient to prevent Ra-226/Pb unit mixing in AI output
- [ ] Non-contradiction rule is achievable given the structured prompt format
- [ ] Radioactive sludge flag rule covers all Ra-226-active sites (isRadioactiveSite boolean)
- [ ] AF3 polishing stage flag rule correctly references 5.0 Bq/L threshold

---

*Awaiting Chemistry Advisor verdict: APPROVED / APPROVED WITH CORRECTIONS / REJECTED*
*No Phase 7 code may be written until APPROVED status is issued.*

---

*PHASE7_AI_ADVISOR_SPEC.md | PROJECT AQUA | March 12, 2026*
*Iron Rule: spec approved before first line of code*
