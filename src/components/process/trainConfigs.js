/**
 * MODULE 5-A — Treatment Train Stage Configurations
 * PROJECT AQUA | March 12, 2026
 *
 * Spec: PHASE5_MODULE5A_TEST_SPECS.md — CLEARED FOR BUILD (C1/C2 + advisory incorporated)
 *
 * Chemistry Advisor: APPROVED WITH CORRECTIONS — all 5 trains certified.
 * Gate 1 corrections represented: R1 (PH_CORRECT_RA ordering), R2 (dual Pb mechanism),
 *   R3 (LI-IX pre-treatment), R4 (LI-IX energy), AF1 (Li multi-cycle), AF2 (Ni pH floor),
 *   AF3 (Ra polishing conditional).
 *
 * C1: RA226_POLISHING_THRESHOLD_BQL exported as named constant (Chemistry Advisor correction).
 * C2: ProcessFlow evaluates polishing stage from raw_water.ra226_BqL directly — no advisorFormat.js dep.
 * Advisory: HM-FULL FE_DOSE stage documents elevated Fe:As dosing ratio requirement.
 *
 * PURE DATA — no React, no chemistry arithmetic.
 * Each stage definition includes all fields ProcessFlow needs for rendering and animation.
 */

// ---------------------------------------------------------------------------
// C1: Named constant — AF3 Gate 1 advisory threshold
// Chemistry Advisor correction: must be a named constant, not a magic number.
// Used by ProcessFlow to resolve RA_POLISH conditional stage activation.
// ---------------------------------------------------------------------------
export const RA226_POLISHING_THRESHOLD_BQL = 5.0;

// ---------------------------------------------------------------------------
// Particle colour palette — matches Phase 2 animation spec colour table
// ---------------------------------------------------------------------------
const C = {
  RAW:       '#7A0000',  // dark red — raw contaminated water
  ACIDIC:    '#CC4400',  // dark orange-red — pH-corrected but still contaminated
  FE_FLOC:   '#8B4513',  // sienna — Fe(OH)3 floc forming
  PRECIP:    '#CC7700',  // amber — precipitation occurring
  CLEAN_1:   '#4477AA',  // muted blue — partially treated, solids removed
  CLEAR:     '#2299BB',  // clear blue — well-clarified stream
  NEUTRAL:   '#1199AA',  // neutral treated water
  FINAL:     '#009999',  // blue-green — final pH corrected
  TEAL:      '#00CED1',  // teal — fully treated output (matches globe TEAL)
  RA_STREAM: '#883388',  // muted magenta — Ra-226 active stream indicator
  BRINE:     '#7A5A10',  // brown-gold — Li brine
  ELUENT:    '#7A3B10',  // dark brown — IX eluent during regen
  CRYSTAL:   '#AAAAEE',  // pale blue-white — Li crystallisation product
};

// ---------------------------------------------------------------------------
// Stage object schema:
//   id             — unique string identifier
//   label          — display label (short, fits in 56px box)
//   reagent        — reagent added at this stage, or null
//   colorIn        — particle colour entering this stage
//   colorOut       — particle colour leaving this stage
//   sludgeGenerating  — true → downward sludge stream rendered
//   sludgeRadioactive — true → sludge stream is MAGENTA + ☢ label
//   conditional       — true → stage active/dimmed based on site chemistry
//   conditionalKey    — which site property to evaluate (see ProcessFlow resolveStages)
//   af2Alert          — true → AF2 pH floor alert indicator rendered (NI stages)
//   r1Correction      — true → [R1] label shown on stage (HM-FULL CO2 correction)
//   r2DualPb          — true → [R2] dual mechanism tooltip shown
//   ixLoadStage       — true → IX fill level indicator rendered
//   ixRegenStage      — true → this stage IS the IX regen animation
//   dualOutput        — true → two outlet streams rendered (LI-IX product split)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// TRAIN 1: HM-FULL — Hard Rock Mine (15 stages per chemistry spec;
//   14 sequential flow stages here — SLUDGE_HANDLING rendered as downward
//   branches from sludge-generating stages, not an inline flow stage)
// Sites: SITE-001 Sudbury, SITE-007 Witwatersrand
// ---------------------------------------------------------------------------
const HM_FULL_STAGES = [
  {
    id: 'INTAKE',
    label: 'Raw Intake',
    reagent: null,
    colorIn:  C.RAW,    colorOut: C.RAW,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
  },
  {
    id: 'PH_UP',
    label: 'pH Adjust ↑',
    reagent: 'Ca(OH)₂',
    colorIn:  C.RAW,    colorOut: C.ACIDIC,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // Target pH 9.5–10.5 for Ni(OH)2 precipitation
  },
  {
    id: 'NI_PRECIP',
    label: 'Ni/Pb Precip.',
    reagent: null,
    colorIn:  C.ACIDIC, colorOut: C.PRECIP,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    af2Alert: true,  // AF2: alert if pH drops below 9.2 → Ni(OH)2 re-dissolution
    // Chemistry: Ni²⁺ + 2OH⁻ → Ni(OH)2↓ (pH 9.5–10.5); Pb²⁺ + 2OH⁻ → Pb(OH)2↓; HRT ≥ 30 min
  },
  {
    id: 'NI_CLARIFIER',
    label: 'Ni Clarifier',
    reagent: null,
    colorIn:  C.PRECIP, colorOut: C.CLEAN_1,
    sludgeGenerating: true, sludgeRadioactive: false,  // Ni(OH)2 + Pb(OH)2 sludge — non-radioactive
    conditional: false, conditionalKey: null,
    // MANDATORY separation after Ni/Pb precipitation
  },
  {
    id: 'FE_DOSE',
    label: 'Fe Dosing',
    reagent: 'FeCl₃',
    colorIn:  C.CLEAN_1, colorOut: C.FE_FLOC,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // Chemistry: FeCl3 + 3H2O → Fe(OH)3 + 3HCl
    // Advisory (Chemistry Advisor): elevated Fe:As molar ratio required for effective As removal.
    // Typical dosing: Fe:As ≥ 3:1 by mass (up to 5:1 for As(III)-dominated feed).
    // Under-dosing Fe is the most common cause of As target exceedance in FeCl3 co-precipitation.
  },
  {
    id: 'AS_PB_COPREC',
    label: 'As/Pb Co-precip.',
    reagent: null,
    colorIn:  C.FE_FLOC, colorOut: C.PRECIP,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    r2DualPb: true,  // R2: Fe floc adsorption (dominant) + Pb(OH)2 (supplementary)
    // Chemistry: As(V) adsorbs to Fe(OH)3; Pb: floc adsorption dominant + Pb(OH)2 supplementary
  },
  {
    id: 'AS_PB_CLARIFIER',
    label: 'As/Pb Clarifier',
    reagent: null,
    colorIn:  C.PRECIP, colorOut: C.CLEAR,
    sludgeGenerating: true, sludgeRadioactive: false,  // Fe(OH)3 + As + Pb — non-radioactive
    conditional: false, conditionalKey: null,
    // MANDATORY separation after Fe/As/Pb precipitation
  },
  {
    id: 'PH_CORRECT_RA',
    label: 'pH Correct (CO₂)',
    reagent: 'CO₂',
    colorIn:  C.CLEAR,   colorOut: C.NEUTRAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    r1Correction: true,  // R1: must appear BEFORE BA_DOSE
    // Chemistry: CO2 + H2O → H2CO3; neutralises residual OH⁻; pH 10 → 7–8.
    // Critical: at pH > 9, BaCO3 forms and competes for Ba²⁺, blocking Ra-226 co-precipitation.
    // CO2 preferred over HCl to avoid adding chloride load.
  },
  {
    id: 'BA_DOSE',
    label: 'BaSO₄ Dosing',
    reagent: 'BaCl₂ + seed',
    colorIn:  C.NEUTRAL, colorOut: C.RA_STREAM,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: true, conditionalKey: 'isRadioactiveSite',
    // Active only when site.isRadioactiveSite === true
  },
  {
    id: 'RA_COPREC',
    label: 'Ra Co-precip.',
    reagent: null,
    colorIn:  C.RA_STREAM, colorOut: C.RA_STREAM,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: true, conditionalKey: 'isRadioactiveSite',
    // Chemistry: Ra²⁺ isomorphically substitutes into BaSO4 lattice → (Ba,Ra)SO4; HRT ≥ 20 min
  },
  {
    id: 'RA_FILTER_PRESS',
    label: 'Ra Filter Press ☢',
    reagent: null,
    colorIn:  C.RA_STREAM, colorOut: C.CLEAR,
    sludgeGenerating: true, sludgeRadioactive: true,  // ☢ (Ba,Ra)SO4 → radioactive waste
    conditional: true, conditionalKey: 'isRadioactiveSite',
    // MANDATORY filter press (not gravity clarifier — (Ba,Ra)SO4 particles fine)
  },
  {
    id: 'PH_FINAL',
    label: 'Final pH',
    reagent: 'CO₂',
    colorIn:  C.CLEAR,  colorOut: C.FINAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // Fine-tune pH to discharge standard 6.5–8.5
  },
  {
    id: 'MM_FILTER',
    label: 'MM Filter',
    reagent: null,
    colorIn:  C.FINAL, colorOut: C.TEAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
  },
  {
    id: 'OUTPUT',
    label: 'Clean Output',
    reagent: null,
    colorIn:  C.TEAL,  colorOut: C.TEAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
  },
];

// ---------------------------------------------------------------------------
// TRAIN 2: RAD-COPREC — Radium Legacy / Nuclear Process Water (11 stages)
// Sites: SITE-002 Athabasca, SITE-006 Sellafield
// Key: NO PH_CORRECT_RA stage — feed is naturally pH 6–7 after As clarifier
// RA_POLISH conditional on ra226_BqL > RA226_POLISHING_THRESHOLD_BQL (AF3, C2)
// ---------------------------------------------------------------------------
const RAD_COPREC_STAGES = [
  {
    id: 'INTAKE',
    label: 'Raw Intake',
    reagent: null,
    colorIn:  C.RAW,    colorOut: C.RAW,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
  },
  {
    id: 'FE_DOSE',
    label: 'Fe Dosing',
    reagent: 'FeCl₃',
    colorIn:  C.RAW,    colorOut: C.FE_FLOC,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // Advisory: Fe:As ratio ≥ 3:1 by mass required
  },
  {
    id: 'AS_COPREC',
    label: 'As/Pb Co-precip.',
    reagent: null,
    colorIn:  C.FE_FLOC, colorOut: C.PRECIP,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    r2DualPb: true,  // R2: dual Pb if Pb present (SITE-002 has pb_mgL: 0.04)
  },
  {
    id: 'AS_CLARIFIER',
    label: 'As Clarifier',
    reagent: null,
    colorIn:  C.PRECIP, colorOut: C.CLEAN_1,
    sludgeGenerating: true, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // MANDATORY. Effluent exits naturally at pH 6–7 — no CO2 correction needed before Ra stage.
  },
  {
    id: 'PH_VERIFY',
    label: 'pH Verify',
    reagent: 'minimal',
    colorIn:  C.CLEAN_1, colorOut: C.NEUTRAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // Minor adjustment only; target pH 6–7; no deliberate alkali elevation
  },
  {
    id: 'BA_DOSE',
    label: 'BaSO₄ Dosing',
    reagent: 'BaCl₂ + seed',
    colorIn:  C.NEUTRAL, colorOut: C.RA_STREAM,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // Not conditional — RAD-COPREC always treats Ra-226
  },
  {
    id: 'RA_COPREC',
    label: 'Ra Co-precip.',
    reagent: null,
    colorIn:  C.RA_STREAM, colorOut: C.RA_STREAM,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
  },
  {
    id: 'RA_FILTER_PRESS',
    label: 'Ra Filter Press ☢',
    reagent: null,
    colorIn:  C.RA_STREAM, colorOut: C.CLEAR,
    sludgeGenerating: true, sludgeRadioactive: true,
    conditional: false, conditionalKey: null,
    // MANDATORY filter press; ☢ radioactive sludge
  },
  {
    id: 'RA_POLISH',
    label: 'Ra Polish',
    reagent: 'BaSO₄ / GAC',
    colorIn:  C.CLEAR,  colorOut: C.NEUTRAL,
    sludgeGenerating: true, sludgeRadioactive: true,  // conditional ☢ if active
    conditional: true, conditionalKey: 'ra226_requires_polishing',
    // C2: ProcessFlow evaluates raw_water.ra226_BqL > RA226_POLISHING_THRESHOLD_BQL directly.
    // SITE-002 (6.8 Bq/L > 5.0) → ACTIVE. SITE-006 (4.2 ≤ 5.0) → DIMMED.
    // AF3 Gate 1 advisory.
  },
  {
    id: 'PH_FINAL',
    label: 'Final pH',
    reagent: 'CO₂',
    colorIn:  C.NEUTRAL, colorOut: C.FINAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
  },
  {
    id: 'OUTPUT',
    label: 'Clean Output',
    reagent: null,
    colorIn:  C.FINAL, colorOut: C.TEAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
  },
];

// ---------------------------------------------------------------------------
// TRAIN 3: NI-PRECIP — Nickel Smelter (7 stages)
// Sites: SITE-003 Norilsk, SITE-010 Pilbara
// Key: pH direction UP to 9.5–10.5, then DOWN to 6.5–8.5; AF2 pH floor alert
// ---------------------------------------------------------------------------
const NI_PRECIP_STAGES = [
  {
    id: 'INTAKE',
    label: 'Raw Intake',
    reagent: null,
    colorIn:  C.RAW,    colorOut: C.RAW,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
  },
  {
    id: 'PH_UP',
    label: 'pH Adjust ↑',
    reagent: 'Ca(OH)₂',
    colorIn:  C.RAW,    colorOut: C.ACIDIC,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // Target pH 9.5–10.5 for Ni(OH)2
  },
  {
    id: 'NI_PRECIP',
    label: 'Ni/Pb Precip.',
    reagent: null,
    colorIn:  C.ACIDIC, colorOut: C.PRECIP,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    af2Alert: true,  // AF2: alert if pH < 9.2 → Ni(OH)2 re-dissolution
    // Chemistry: Ni²⁺ + 2OH⁻ → Ni(OH)2↓ (pH 9.5–10.5); HRT ≥ 30 min
  },
  {
    id: 'NI_CLARIFIER',
    label: 'Ni/Pb Clarifier',
    reagent: null,
    colorIn:  C.PRECIP, colorOut: C.CLEAN_1,
    sludgeGenerating: true, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // MANDATORY. Ni(OH)2 + Pb(OH)2 sludge — non-radioactive hazardous
  },
  {
    id: 'PH_FINAL',
    label: 'Final pH ↓',
    reagent: 'CO₂',
    colorIn:  C.CLEAN_1, colorOut: C.FINAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // Direction: DOWN from 9.5–10.5 to 6.5–8.5 discharge standard
  },
  {
    id: 'SLUDGE_HANDLING',
    label: 'Sludge',
    reagent: null,
    colorIn:  C.FE_FLOC, colorOut: C.FE_FLOC,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    isParallel: true,  // Rendered as side branch, not inline flow stage
  },
  {
    id: 'OUTPUT',
    label: 'Clean Output',
    reagent: null,
    colorIn:  C.FINAL, colorOut: C.TEAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
  },
];

// ---------------------------------------------------------------------------
// TRAIN 4: PB-AS-COPREC — Lead/Arsenic Co-precipitation (8 stages)
// Sites: SITE-004 Zambia, SITE-008 Rio Tinto, SITE-009 Ok Tedi
// Key: pH floor 6.0 [R2]; dual Pb mechanism [R2]
// ---------------------------------------------------------------------------
const PB_AS_COPREC_STAGES = [
  {
    id: 'INTAKE',
    label: 'Raw Intake',
    reagent: null,
    colorIn:  C.RAW,    colorOut: C.RAW,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
  },
  {
    id: 'PH_ADJUST',
    label: 'pH Adjust',
    reagent: 'Ca(OH)₂',
    colorIn:  C.RAW,    colorOut: C.ACIDIC,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // R2: target pH 6.0–7.0; FLOOR 6.0 (below this Pb removal inadequate)
    // Note: label shows "pH Adjust" (not "↑") — direction is up but floor matters
  },
  {
    id: 'FE_DOSE',
    label: 'Fe Dosing',
    reagent: 'FeCl₃',
    colorIn:  C.ACIDIC, colorOut: C.FE_FLOC,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // Advisory: Fe:As ratio ≥ 3:1 by mass
  },
  {
    id: 'AS_PB_COPREC',
    label: 'As/Pb Co-precip.',
    reagent: null,
    colorIn:  C.FE_FLOC, colorOut: C.PRECIP,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    r2DualPb: true,  // R2: Fe floc adsorption (dominant) + Pb(OH)2 (supplementary); pH floor 6.0
  },
  {
    id: 'AS_PB_CLARIFIER',
    label: 'As/Pb Clarifier',
    reagent: null,
    colorIn:  C.PRECIP, colorOut: C.CLEAR,
    sludgeGenerating: true, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // MANDATORY. Fe(OH)3 + Pb + As sludge — non-radioactive, hazardous (Pb)
  },
  {
    id: 'PH_FINAL',
    label: 'Final pH',
    reagent: 'CO₂',
    colorIn:  C.CLEAR,  colorOut: C.FINAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
  },
  {
    id: 'SLUDGE_HANDLING',
    label: 'Sludge',
    reagent: null,
    colorIn:  C.FE_FLOC, colorOut: C.FE_FLOC,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    isParallel: true,
  },
  {
    id: 'OUTPUT',
    label: 'Clean Output',
    reagent: null,
    colorIn:  C.FINAL, colorOut: C.TEAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
  },
];

// ---------------------------------------------------------------------------
// TRAIN 5: LI-IX — Lithium Brine Ion Exchange Recovery (10 stages)
// Site: SITE-005 Salar de Atacama
// Key: R3 pre-treatment, IX regen cycle mandatory, AF1 multi-cycle recovery, R4 energy
// ---------------------------------------------------------------------------
const LI_IX_STAGES = [
  {
    id: 'INTAKE',
    label: 'Brine Intake',
    reagent: null,
    colorIn:  C.BRINE,  colorOut: C.BRINE,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // High-TDS Li brine; Li 1850 mg/L; Mg, Na, K, Ca also present
  },
  {
    id: 'COAG_FLOC',
    label: 'Coag / Floc',
    reagent: 'Al₂(SO₄)₃',
    colorIn:  C.BRINE,  colorOut: C.FE_FLOC,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // R3: MANDATORY pre-treatment to protect IX resin from fouling
  },
  {
    id: 'SETTLING',
    label: 'Settling',
    reagent: null,
    colorIn:  C.FE_FLOC, colorOut: C.CLEAN_1,
    sludgeGenerating: true, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // R3: gravity settling; coagulated solids removed
  },
  {
    id: 'MM_FILTER',
    label: 'MM Filter',
    reagent: null,
    colorIn:  C.CLEAN_1, colorOut: C.CLEAR,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // R3: TSS < 5 NTU required before IX resin contact to prevent irreversible fouling
  },
  {
    id: 'LI_IX_LOAD',
    label: 'Li IX Loading',
    reagent: null,
    colorIn:  C.CLEAR,  colorOut: C.NEUTRAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    ixLoadStage: true,  // IX fill-level indicator rendered for this stage
    // Li⁺ adsorbs onto selective resin; Mg²⁺, Na⁺, K⁺ pass through
    // Fill level rises from 0% → 85% before regen triggers
  },
  {
    id: 'IX_REGEN',
    label: 'IX Regen Cycle',
    reagent: 'HCl eluent',
    colorIn:  C.ELUENT, colorOut: C.CLEAR,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    ixRegenStage: true,   // triggers flow reversal animation, bypass route, REGEN label
    // AF1: recovery target >90% Li over multiple regen cycles — not single-pass
    // Triggered when ixResinLoading > 85%; ~30 second cycle; resets loading to 0%
  },
  {
    id: 'ELUENT_PROCESS',
    label: 'Li Recovery',
    reagent: 'Na₂CO₃',
    colorIn:  C.ELUENT, colorOut: C.CRYSTAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // Li-rich eluate → Li2CO3 or LiOH crystallisation; R4: energy 10–60 kWh/m³
  },
  {
    id: 'PH_FINAL',
    label: 'Final pH',
    reagent: 'CO₂',
    colorIn:  C.CLEAR,  colorOut: C.FINAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    // Permeate (non-Li) stream pH adjustment
  },
  {
    id: 'SLUDGE_HANDLING',
    label: 'Sludge',
    reagent: null,
    colorIn:  C.FE_FLOC, colorOut: C.FE_FLOC,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    isParallel: true,
  },
  {
    id: 'OUTPUT',
    label: 'Water + Li Product',
    reagent: null,
    colorIn:  C.FINAL,  colorOut: C.TEAL,
    sludgeGenerating: false, sludgeRadioactive: false,
    conditional: false, conditionalKey: null,
    dualOutput: true,  // Two streams: treated water + Li2CO3/LiOH product
    // AF1: display recovery as ">90% over multiple regen cycles" — not single-pass
  },
];

// ---------------------------------------------------------------------------
// TRAIN_CONFIGS — exported map keyed by treatment_train string
// ---------------------------------------------------------------------------
export const TRAIN_CONFIGS = {
  'HM-FULL':      { label: 'Hard Rock Mine — Full Treatment',         stages: HM_FULL_STAGES },
  'RAD-COPREC':   { label: 'Radium Co-precipitation',                 stages: RAD_COPREC_STAGES },
  'NI-PRECIP':    { label: 'Ni Smelter Effluent Treatment',           stages: NI_PRECIP_STAGES },
  'PB-AS-COPREC': { label: 'Pb / As Co-precipitation',                stages: PB_AS_COPREC_STAGES },
  'LI-IX':        { label: 'Li Brine Ion Exchange Recovery',          stages: LI_IX_STAGES },
};
