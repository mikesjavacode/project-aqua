/**
 * MODULE 3-B — AQUA_SITES Data Layer
 * PROJECT AQUA | March 11, 2026
 *
 * Source: PHASE2_DATA_ARCHITECTURE.md (v2.1) — Gate 1 corrections incorporated
 * Chemistry Advisor: APPROVED WITH CORRECTIONS (C1/C2/C3)
 *
 * UNIT RULES (enforced here — CB-3B-04c/d, ST-3B-08a):
 *   Ra-226: ALWAYS Bq/L — field name ra226_BqL, never ra226_mgL
 *   Metals: ALWAYS mg/L — fields pb_mgL, as_mgL, ni_mgL, li_mgL
 *   pH: dimensionless [0–14], never NaN
 *   Li: EXCLUDED from severity calculation (recovery target, not remediation)
 */

// ---------------------------------------------------------------------------
// Regulatory limits — each in its own unit space (CB-3B-01f, ST-3B-08a)
// ---------------------------------------------------------------------------
const LIMITS = {
  RA226_BQL:  0.185,   // EPA MCL — Bq/L
  PB_MGL:     0.01,    // EPA limit — mg/L
  AS_MGL:     0.01,    // EPA MCL — mg/L
  NI_MGL:     0.1,     // WHO — mg/L
  // Li: no remediation limit — excluded
};

// Log severity scale (C1 — Chemistry Advisor correction)
const LOG_SCALE_MAX = 3.0;

// ---------------------------------------------------------------------------
// computeContaminantSeverity
// Returns log10-scale severity for a single contaminant in its own unit space.
// Units cancel within each call: Bq/L ÷ Bq/L = dimensionless, mg/L ÷ mg/L = dimensionless.
// NEVER call with cross-unit values (ST-3B-08a, CB-3B-05a).
// ---------------------------------------------------------------------------
function computeContaminantSeverity(concentration, limit) {
  if (concentration == null || concentration <= 0 || limit <= 0) return 0;
  const exceedanceRatio = concentration / limit;
  if (exceedanceRatio <= 1) return 0; // within limit — no severity
  return Math.log10(exceedanceRatio);  // log10: 10× → 1.0, 100× → 2.0, 1000× → 3.0
}

// ---------------------------------------------------------------------------
// computePlumeIntensity
// Produces a single dimensionless 0.0–1.0 intensity value from a multi-contaminant
// raw_water profile. Each contaminant computed in its own unit-safe call (ST-3B-08b).
// Li excluded (ST-3B-01f, CB-3B-01c). pH normalized to LOG_SCALE_MAX space (CB-3B-01d).
// Takes max across contaminants, not sum (CB-3B-01e — Chemistry Advisor ruling).
// ---------------------------------------------------------------------------
export function computePlumeIntensity(rawWater) {
  const logSeverities = [];

  // Ra-226 — Bq/L context only (ST-3B-08b: isolated function)
  if (rawWater.ra226_BqL != null) {
    logSeverities.push(computeContaminantSeverity(rawWater.ra226_BqL, LIMITS.RA226_BQL));
  }

  // Pb — mg/L context only
  if (rawWater.pb_mgL != null) {
    logSeverities.push(computeContaminantSeverity(rawWater.pb_mgL, LIMITS.PB_MGL));
  }

  // As — mg/L context only
  if (rawWater.as_mgL != null) {
    logSeverities.push(computeContaminantSeverity(rawWater.as_mgL, LIMITS.AS_MGL));
  }

  // Ni — mg/L context only
  if (rawWater.ni_mgL != null) {
    logSeverities.push(computeContaminantSeverity(rawWater.ni_mgL, LIMITS.NI_MGL));
  }

  // Li — EXCLUDED (recovery target, not remediation) (ST-3B-01f)

  // pH — deviation from neutral, scaled to LOG_SCALE_MAX space (CB-3B-01d)
  if (rawWater.pH != null && !isNaN(rawWater.pH)) {
    const pHLogSeverity = (Math.abs(rawWater.pH - 7.0) / 7.0) * LOG_SCALE_MAX;
    logSeverities.push(pHLogSeverity);
  }

  if (logSeverities.length === 0) return 0;

  const maxLogSeverity = Math.max(...logSeverities);
  return Math.min(1.0, Math.max(0, maxLogSeverity / LOG_SCALE_MAX));
}

// ---------------------------------------------------------------------------
// validateSite
// Data validation gate — all checks must pass before site reaches renderer.
// Returns { valid: true } or { valid: false, errors: string[] }.
// CB-3B-04a through CB-3B-04j.
// ---------------------------------------------------------------------------
export function validateSite(site) {
  const errors = [];
  const rw = site.raw_water;

  // pH: bounds and NaN (CB-3B-04a, CB-3B-04b)
  if (rw.pH == null || isNaN(rw.pH))        errors.push('pH is NaN or missing');
  else if (rw.pH < 0 || rw.pH > 14)         errors.push(`pH ${rw.pH} out of [0,14]`);

  // Concentrations ≥ 0 (CB-3B-04e)
  const numericFields = ['ra226_BqL', 'pb_mgL', 'as_mgL', 'ni_mgL', 'li_mgL'];
  numericFields.forEach((f) => {
    if (rw[f] != null && rw[f] < 0) errors.push(`${f} is negative: ${rw[f]}`);
  });

  // Unit safety — Ra-226 field must not contain mgL suffix (CB-3B-04c)
  if ('ra226_mgL' in rw) errors.push('UNIT ERROR: ra226_mgL property found — must be ra226_BqL');

  // Unit safety — metal fields must not contain BqL suffix (CB-3B-04d)
  ['pb_BqL', 'as_BqL', 'ni_BqL'].forEach((f) => {
    if (f in rw) errors.push(`UNIT ERROR: ${f} found — metals must use _mgL suffix`);
  });

  // Range bounds (CB-3B-04f, CB-3B-04g)
  if (rw.ra226_BqL != null && rw.ra226_BqL > 10)   errors.push(`Ra-226 ${rw.ra226_BqL} Bq/L exceeds validated max (10)`);
  if (rw.pb_mgL    != null && rw.pb_mgL    > 5)    errors.push(`Pb ${rw.pb_mgL} mg/L exceeds validated max (5)`);
  if (rw.as_mgL    != null && rw.as_mgL    > 2)    errors.push(`As ${rw.as_mgL} mg/L exceeds validated max (2)`);
  if (rw.ni_mgL    != null && rw.ni_mgL    > 100)  errors.push(`Ni ${rw.ni_mgL} mg/L exceeds validated max (100)`);

  // Flow rate (CB-3B-04h)
  if (!(site.flow_rate_nominal_Ls > 0)) errors.push('flow_rate_nominal_Ls must be > 0');

  // Site-specific turbidity permit (CB-3B-04i)
  if (site.permit_turbidity_NTU == null) errors.push('permit_turbidity_NTU missing — no global default allowed');

  return errors.length === 0
    ? { valid: true }
    : { valid: false, errors };
}

// ---------------------------------------------------------------------------
// enrichSite
// Adds computed fields used by the renderer. Runs after validateSite passes.
// ---------------------------------------------------------------------------
export function enrichSite(site) {
  return {
    ...site,
    plumeIntensity:    computePlumeIntensity(site.raw_water),
    isRadioactiveSite: (site.raw_water.ra226_BqL ?? 0) > 0,  // C3: any presence
    validationError:   false,
  };
}

// ---------------------------------------------------------------------------
// AQUA_SITES — 10 representative global industrial sites
// Source: PHASE2_DATA_ARCHITECTURE.md §5 (Gate 1 v2.1)
// ---------------------------------------------------------------------------
export const AQUA_SITES_RAW = [
  {
    site_id: 'SITE-001',
    name: 'Sudbury Basin Ni-Mine Drainage',
    archetype: 'ARCH-01',
    country: 'Canada',
    coordinates: { lat: 46.49, lon: -81.00 },
    globe_plume_radius_km: 35,
    flow_rate_nominal_Ls: 310,
    flow_rate_peak_Ls: 520,
    source_type: 'mine_drainage',
    regulatory_regime: 'MIXED',
    permit_turbidity_NTU: 25,
    raw_water: { ni_mgL: 48.0, as_mgL: 0.85, pb_mgL: 0.12, ra226_BqL: 0.0, pH: 4.2, turbidity_NTU: 380 },
    treatment_targets: { ni_mgL: 0.1, as_mgL: 0.01, pb_mgL: 0.01, ra226_BqL: 0.0, pH: 7.5, turbidity_NTU: 25 },
    treatment_train: 'HM-FULL',
    // C5 — Gate 2 advisory. Ca(OH)₂ Ni component = 48×1.263×1.7 = 103 mg/L; acid neut. ≈ 297 mg/L; total 400.
    reagent_dose_rates:              { Ca_OH_2_mgL: 400, FeCl3_mgL: 7.4,  BaCl2_mgL: 0,   CO2_mgL: 220, Al2SO4_mgL: 0,   HCl_eluent_mgL: 0   },
    sludge_generation_rate_kgPerDay: { nonradioactive_kgDay: 2190, radioactive_kgDay: 0  },
    hrt_min: { INTAKE: 2, PH_UP: 15, NI_PRECIP: 30, NI_CLARIFIER: 150, FE_DOSE: 5, AS_PB_COPREC: 30, AS_PB_CLARIFIER: 120, PH_CORRECT_RA: 15, PH_FINAL: 15, MM_FILTER: 20 },
  },
  {
    site_id: 'SITE-002',
    name: 'Athabasca Uranium Legacy — Saskatchewan',
    archetype: 'ARCH-02',
    country: 'Canada',
    coordinates: { lat: 58.60, lon: -109.40 },
    globe_plume_radius_km: 50,
    flow_rate_nominal_Ls: 285,
    flow_rate_peak_Ls: 490,
    source_type: 'mine_drainage',
    regulatory_regime: 'MIXED',
    permit_turbidity_NTU: 15,
    raw_water: { ra226_BqL: 6.8, as_mgL: 0.62, pb_mgL: 0.04, ni_mgL: 0.0, pH: 5.1, turbidity_NTU: 210 },
    treatment_targets: { ra226_BqL: 0.185, as_mgL: 0.01, pb_mgL: 0.01, ni_mgL: 0.0, pH: 7.0, turbidity_NTU: 15 },
    treatment_train: 'RAD-COPREC',
    // C5 — RA_POLISH active (6.8 > 5.0); BaCl₂ = 2.0 (BA_DOSE) + 1.0 (RA_POLISH) = 3.0 total.
    // Radioactive sludge: BA_DOSE 55.2 + RA_POLISH 27.6 = 82.8 ≈ 83 kg/day (Ba,Ra)SO₄.
    reagent_dose_rates:              { Ca_OH_2_mgL: 0,   FeCl3_mgL: 5.4,  BaCl2_mgL: 3.0, CO2_mgL: 30,  Al2SO4_mgL: 0,   HCl_eluent_mgL: 0   },
    sludge_generation_rate_kgPerDay: { nonradioactive_kgDay: 103,  radioactive_kgDay: 83 },
    hrt_min: { INTAKE: 2, FE_DOSE: 5, AS_COPREC: 30, AS_CLARIFIER: 90, PH_VERIFY: 10, BA_DOSE: 10, RA_COPREC: 25, RA_FILTER_PRESS: 60, RA_POLISH: 30, PH_FINAL: 15 },
  },
  {
    site_id: 'SITE-003',
    name: 'Norilsk Ni Smelter Effluent',
    archetype: 'ARCH-03',
    country: 'Russia',
    coordinates: { lat: 69.33, lon: 88.20 },
    globe_plume_radius_km: 60,
    flow_rate_nominal_Ls: 420,
    flow_rate_peak_Ls: 580,
    source_type: 'industrial_effluent',
    regulatory_regime: 'WHO',
    permit_turbidity_NTU: 30,
    raw_water: { ni_mgL: 87.0, pb_mgL: 2.1, as_mgL: 0.0, ra226_BqL: 0.0, pH: 3.8, turbidity_NTU: 520 },
    treatment_targets: { ni_mgL: 0.1, pb_mgL: 0.01, as_mgL: 0.0, ra226_BqL: 0.0, pH: 7.5, turbidity_NTU: 30 },
    treatment_train: 'NI-PRECIP',
    // C5 — Ca(OH)₂ Ni component = 87×1.263×1.7 = 187 mg/L (C1 corrected); acid neut. ≈ 363 mg/L; total 550.
    reagent_dose_rates:              { Ca_OH_2_mgL: 550, FeCl3_mgL: 0,    BaCl2_mgL: 0,   CO2_mgL: 250, Al2SO4_mgL: 0,   HCl_eluent_mgL: 0   },
    sludge_generation_rate_kgPerDay: { nonradioactive_kgDay: 5080, radioactive_kgDay: 0  },
    hrt_min: { INTAKE: 2, PH_UP: 15, NI_PRECIP: 35, NI_CLARIFIER: 180, PH_FINAL: 15 },
  },
  {
    site_id: 'SITE-004',
    name: 'Zambian Copperbelt As/Pb Discharge',
    archetype: 'ARCH-04',
    country: 'Zambia',
    coordinates: { lat: -13.05, lon: 27.85 },
    globe_plume_radius_km: 40,
    flow_rate_nominal_Ls: 265,
    flow_rate_peak_Ls: 440,
    source_type: 'mine_drainage',
    regulatory_regime: 'WHO',
    permit_turbidity_NTU: 50,
    raw_water: { as_mgL: 1.45, pb_mgL: 3.2, ni_mgL: 0.0, ra226_BqL: 0.0, pH: 4.5, turbidity_NTU: 445 },
    treatment_targets: { as_mgL: 0.01, pb_mgL: 0.01, ni_mgL: 0.0, ra226_BqL: 0.0, pH: 7.2, turbidity_NTU: 50 },
    treatment_train: 'PB-AS-COPREC',
    // C5 — R2: pH 4.5→6.5 for Fe floc formation (Pb adsorption dominant, not Pb(OH)₂).
    reagent_dose_rates:              { Ca_OH_2_mgL: 160, FeCl3_mgL: 12.6, BaCl2_mgL: 0,   CO2_mgL: 20,  Al2SO4_mgL: 0,   HCl_eluent_mgL: 0   },
    sludge_generation_rate_kgPerDay: { nonradioactive_kgDay: 296,  radioactive_kgDay: 0  },
    hrt_min: { INTAKE: 2, PH_ADJUST: 15, FE_DOSE: 5, AS_PB_COPREC: 30, AS_PB_CLARIFIER: 120, PH_FINAL: 15 },
  },
  {
    site_id: 'SITE-005',
    name: 'Salar de Atacama Li Recovery',
    archetype: 'ARCH-05',
    country: 'Chile',
    coordinates: { lat: -23.50, lon: -68.25 },
    globe_plume_radius_km: 30,
    flow_rate_nominal_Ls: 195,
    flow_rate_peak_Ls: 320,
    source_type: 'brine_recovery',
    regulatory_regime: 'MIXED',
    permit_turbidity_NTU: 20,
    raw_water: { li_mgL: 1850, pH: 7.1, turbidity_NTU: 95 },
    treatment_targets: { li_mgL: 185, pH: 7.0, turbidity_NTU: 10 },
    treatment_train: 'LI-IX',
    // C5 — R3 pre-treatment. HCl eluent = 180 mg/L feed-equiv. (cycle-averaged). R4 energy: 40 kWh/m³.
    reagent_dose_rates:              { Ca_OH_2_mgL: 0,   FeCl3_mgL: 0,    BaCl2_mgL: 0,   CO2_mgL: 15,  Al2SO4_mgL: 100, HCl_eluent_mgL: 180 },
    sludge_generation_rate_kgPerDay: { nonradioactive_kgDay: 770,  radioactive_kgDay: 0  },
    hrt_min: { INTAKE: 2, COAG_FLOC: 20, SETTLING: 120, MM_FILTER: 20, LI_IX_LOAD: 60, IX_REGEN: 30, ELUENT_PROCESS: 60, PH_FINAL: 15 },
  },
  {
    site_id: 'SITE-006',
    name: 'Sellafield Nuclear Process Water — UK',
    archetype: 'ARCH-06',
    country: 'UK',
    coordinates: { lat: 54.42, lon: -3.50 },
    globe_plume_radius_km: 25,
    flow_rate_nominal_Ls: 302,
    flow_rate_peak_Ls: 505,
    source_type: 'nuclear_process',
    regulatory_regime: 'IAEA', // R5: EA / ONR (UK) — display label only, no CNSC
    permit_turbidity_NTU: 10,
    raw_water: { ra226_BqL: 4.2, as_mgL: 0.18, pb_mgL: 0.08, ni_mgL: 0.0, pH: 6.1, turbidity_NTU: 145 },
    treatment_targets: { ra226_BqL: 0.185, as_mgL: 0.01, pb_mgL: 0.01, ni_mgL: 0.0, pH: 7.5, turbidity_NTU: 10 },
    treatment_train: 'RAD-COPREC',
    // C5 — RA_POLISH inactive (4.2 ≤ 5.0). Radioactive sludge = BA_DOSE only: 58 kg/day.
    // R5: EA/ONR UK regulatory authority — reflected in advisorFormat.js regulatory_note.
    reagent_dose_rates:              { Ca_OH_2_mgL: 0,   FeCl3_mgL: 1.6,  BaCl2_mgL: 2.0, CO2_mgL: 15,  Al2SO4_mgL: 0,   HCl_eluent_mgL: 0   },
    sludge_generation_rate_kgPerDay: { nonradioactive_kgDay: 34,   radioactive_kgDay: 58 },
    hrt_min: { INTAKE: 2, FE_DOSE: 5, AS_COPREC: 30, AS_CLARIFIER: 90, PH_VERIFY: 10, BA_DOSE: 10, RA_COPREC: 20, RA_FILTER_PRESS: 60, PH_FINAL: 15 },
  },
  {
    site_id: 'SITE-007',
    name: 'Witwatersrand Gold Mine AMD — South Africa',
    archetype: 'ARCH-01',
    country: 'South Africa',
    coordinates: { lat: -26.20, lon: 27.85 },
    globe_plume_radius_km: 45,
    flow_rate_nominal_Ls: 335,
    flow_rate_peak_Ls: 510,
    source_type: 'mine_drainage',
    regulatory_regime: 'MIXED',
    permit_turbidity_NTU: 20,
    raw_water: { ra226_BqL: 3.1, as_mgL: 0.95, ni_mgL: 22.0, pb_mgL: 0.55, pH: 3.2, turbidity_NTU: 610 },
    treatment_targets: { ra226_BqL: 0.185, as_mgL: 0.01, ni_mgL: 0.1, pb_mgL: 0.01, pH: 7.5, turbidity_NTU: 20 },
    treatment_train: 'HM-FULL',
    // C5 — Ca(OH)₂ Ni component = 22×1.263×1.7 = 47.2 mg/L (C1 corrected); acid neut. ≈ 583 mg/L; total 630.
    // RA_POLISH inactive (3.1 ≤ 5.0); BA_DOSE active (isRadioactiveSite=true). ☢ sludge = 65 kg/day.
    reagent_dose_rates:              { Ca_OH_2_mgL: 630, FeCl3_mgL: 8.3,  BaCl2_mgL: 2.0, CO2_mgL: 220, Al2SO4_mgL: 0,   HCl_eluent_mgL: 0   },
    sludge_generation_rate_kgPerDay: { nonradioactive_kgDay: 1210, radioactive_kgDay: 65 },
    hrt_min: { INTAKE: 2, PH_UP: 15, NI_PRECIP: 30, NI_CLARIFIER: 120, FE_DOSE: 5, AS_PB_COPREC: 30, AS_PB_CLARIFIER: 90, PH_CORRECT_RA: 15, BA_DOSE: 10, RA_COPREC: 20, RA_FILTER_PRESS: 60, PH_FINAL: 15, MM_FILTER: 20 },
  },
  {
    site_id: 'SITE-008',
    name: 'Rio Tinto Cu/As Drainage — Spain',
    archetype: 'ARCH-04',
    country: 'Spain',
    coordinates: { lat: 37.72, lon: -6.58 },
    globe_plume_radius_km: 35,
    flow_rate_nominal_Ls: 245,
    flow_rate_peak_Ls: 395,
    source_type: 'mine_drainage',
    regulatory_regime: 'WHO',
    permit_turbidity_NTU: 25,
    raw_water: { as_mgL: 1.72, pb_mgL: 1.85, ni_mgL: 0.0, ra226_BqL: 0.0, pH: 2.9, turbidity_NTU: 780 },
    treatment_targets: { as_mgL: 0.01, pb_mgL: 0.01, ni_mgL: 0.0, ra226_BqL: 0.0, pH: 7.2, turbidity_NTU: 25 },
    treatment_train: 'PB-AS-COPREC',
    // C5 — pH 2.9 most acidic site; 700 mg/L Ca(OH)₂ buffering-dominated (H₂SO₄ from pyrite oxidation).
    // PH_ADJUST HRT = 20 min (extended for very acidic feed).
    reagent_dose_rates:              { Ca_OH_2_mgL: 700, FeCl3_mgL: 15.0, BaCl2_mgL: 0,   CO2_mgL: 25,  Al2SO4_mgL: 0,   HCl_eluent_mgL: 0   },
    sludge_generation_rate_kgPerDay: { nonradioactive_kgDay: 283,  radioactive_kgDay: 0  },
    hrt_min: { INTAKE: 2, PH_ADJUST: 20, FE_DOSE: 5, AS_PB_COPREC: 30, AS_PB_CLARIFIER: 120, PH_FINAL: 15 },
  },
  {
    site_id: 'SITE-009',
    name: 'Ok Tedi Cu Mine Drainage — Papua New Guinea',
    archetype: 'ARCH-04',
    country: 'Papua New Guinea',
    coordinates: { lat: -5.22, lon: 141.19 },
    globe_plume_radius_km: 55,
    flow_rate_nominal_Ls: 480,
    flow_rate_peak_Ls: 520,
    source_type: 'mine_drainage',
    regulatory_regime: 'WHO',
    permit_turbidity_NTU: 50,
    raw_water: { as_mgL: 0.88, pb_mgL: 2.60, ni_mgL: 0.0, ra226_BqL: 0.0, pH: 4.1, turbidity_NTU: 550 },
    treatment_targets: { as_mgL: 0.01, pb_mgL: 0.01, ni_mgL: 0.0, ra226_BqL: 0.0, pH: 7.0, turbidity_NTU: 50 },
    treatment_train: 'PB-AS-COPREC',
    // C5 — highest-flow PB-AS-COPREC site (480 L/s); Pb sludge = 107 kg/day via Fe floc adsorption.
    reagent_dose_rates:              { Ca_OH_2_mgL: 300, FeCl3_mgL: 7.7,  BaCl2_mgL: 0,   CO2_mgL: 20,  Al2SO4_mgL: 0,   HCl_eluent_mgL: 0   },
    sludge_generation_rate_kgPerDay: { nonradioactive_kgDay: 352,  radioactive_kgDay: 0  },
    hrt_min: { INTAKE: 2, PH_ADJUST: 15, FE_DOSE: 5, AS_PB_COPREC: 30, AS_PB_CLARIFIER: 120, PH_FINAL: 15 },
  },
  {
    site_id: 'SITE-010',
    name: 'Pilbara Iron Ore / Ni Process Water — Australia',
    archetype: 'ARCH-03',
    country: 'Australia',
    coordinates: { lat: -22.30, lon: 118.60 },
    globe_plume_radius_km: 40,
    flow_rate_nominal_Ls: 360,
    flow_rate_peak_Ls: 500,
    source_type: 'industrial_effluent',
    regulatory_regime: 'MIXED',
    permit_turbidity_NTU: 20,
    raw_water: { ni_mgL: 35.0, pb_mgL: 0.38, as_mgL: 0.0, ra226_BqL: 0.0, pH: 4.6, turbidity_NTU: 320 },
    treatment_targets: { ni_mgL: 0.1, pb_mgL: 0.01, as_mgL: 0.0, ra226_BqL: 0.0, pH: 7.5, turbidity_NTU: 20 },
    treatment_train: 'NI-PRECIP',
    // C5 — Ca(OH)₂ Ni component = 35×1.263×1.7 = 75.1 mg/L (C1 corrected); acid neut. ≈ 365 mg/L; total 440.
    reagent_dose_rates:              { Ca_OH_2_mgL: 440, FeCl3_mgL: 0,    BaCl2_mgL: 0,   CO2_mgL: 220, Al2SO4_mgL: 0,   HCl_eluent_mgL: 0   },
    sludge_generation_rate_kgPerDay: { nonradioactive_kgDay: 1730, radioactive_kgDay: 0  },
    hrt_min: { INTAKE: 2, PH_UP: 15, NI_PRECIP: 30, NI_CLARIFIER: 150, PH_FINAL: 15 },
  },
];

// ---------------------------------------------------------------------------
// AQUA_SITES — validated and enriched, ready for renderer consumption.
// Sites that fail validation are marked with validationError: true and
// render a grey ERROR plume (ST-3B-01c, CB-3B-04j).
// ---------------------------------------------------------------------------
export const AQUA_SITES = AQUA_SITES_RAW.map((site) => {
  const result = validateSite(site);
  if (!result.valid) {
    console.error(`[AQUA] Site ${site.site_id} failed validation:`, result.errors);
    return { ...site, plumeIntensity: 0, isRadioactiveSite: false, validationError: true, validationErrors: result.errors };
  }
  return enrichSite(site);
});

// Earth radius in km — used for plume radius world-unit scaling (ST-3B-04a)
export const EARTH_RADIUS_KM = 6371;
