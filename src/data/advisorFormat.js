/**
 * MODULE 3-C — buildAdvisorTelemetry
 * PROJECT AQUA | March 11, 2026
 *
 * Spec: PHASE3_MODULE3C_TEST_SPECS.md (ST-3C-04) — CLEARED FOR BUILD
 * Gate 2 corrections: C1/C2/C3/C4 incorporated (March 12, 2026)
 *
 * Pure function — no React dependency, no side effects (ST-3C-04m).
 * Builds an AIAdvisorPromptPackage from a validated AquaSite.
 *
 * UNIT RULES (CC-3C-03):
 *   Ra-226: ALWAYS formatted as "X.XX Bq/L" — NEVER "X.XX mg/L"
 *   Heavy metals: ALWAYS "X.XX mg/L"
 *   pH: "X.X (dimensionless)"
 *   Turbidity: "XXX NTU (permit: YYY NTU)" — site-specific permit always present
 *   Flow: "XXX L/s"
 *
 * Inactive contaminants → null (not "0 mg/L") — ST-3C-04l.
 *
 * Gate 2 additions:
 *   C1: ra226_requires_polishing_stage — AF3 Gate 1 advisory (inlet > 5.0 Bq/L)
 *   C2: active_contaminants — explicit list disambiguates null fields for AI Advisor
 *   C3: regulatory_note — EA/ONR context for non-EPA/WHO regulatory regimes
 *   C4: li_recovery_target_pct — Li recovery target for LI-IX sites
 */

// Regulatory thresholds — included in every advisor package for AI context (CC-3C-03f)
const THRESHOLDS = {
  ra226_EPA_MCL_BqL: 0.185,   // Bq/L — EPA MCL
  pb_EPA_limit_mgL:  0.01,    // mg/L — EPA action level
  as_EPA_limit_mgL:  0.01,    // mg/L — EPA MCL
  ni_WHO_limit_mgL:  0.1,     // mg/L — WHO guideline
};

// ---------------------------------------------------------------------------
// buildRegulatoryNote — C3: non-null only for non-EPA/WHO regulatory regimes
// Identifies the applicable authority so AI Advisor does not misapply US/WHO limits.
// ---------------------------------------------------------------------------
function buildRegulatoryNote(site) {
  if (site.regulatory_regime === 'IAEA' && site.country === 'UK') {
    return (
      'Regulatory authority: EA/ONR (UK). Applicable standards: ' +
      'Environment Agency / Office for Nuclear Regulation discharge consent limits. ' +
      'EPA/WHO thresholds shown in this package for reference comparison only — ' +
      'EA/ONR limits apply for compliance assessment.'
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// buildAdvisorTelemetry
// Input:  validated AquaSite from useSelectedSite, or null
// Output: AIAdvisorPromptPackage or null (CC-3C-04c — no API call on null)
// ---------------------------------------------------------------------------
export function buildAdvisorTelemetry(site) {
  if (!site) return null;

  const rw = site.raw_water;
  const tg = site.treatment_targets;

  // Helpers: format inlet — returns null if contaminant absent/zero (ST-3C-04l)
  const fmtBqL  = (v) => (v != null && v > 0) ? `${v.toFixed(2)} Bq/L`  : null;
  const fmtMgL2 = (v) => (v != null && v > 0) ? `${v.toFixed(2)} mg/L`  : null;
  const fmtMgL1 = (v) => (v != null && v > 0) ? `${v.toFixed(1)} mg/L`  : null;

  // Formatted inlet values — computed once, used for both the fields and active_contaminants
  const ra226_inlet = fmtBqL(rw.ra226_BqL);
  const pb_inlet    = fmtMgL2(rw.pb_mgL);
  const as_inlet    = fmtMgL2(rw.as_mgL);
  const ni_inlet    = fmtMgL1(rw.ni_mgL);
  const li_inlet    = rw.li_mgL != null && rw.li_mgL > 0
                        ? `${rw.li_mgL.toFixed(0)} mg/L`
                        : null;

  // C2: active_contaminants — explicit list of non-null inlets (disambiguates null for AI)
  const active_contaminants = [];
  if (ra226_inlet !== null) active_contaminants.push('ra226');
  if (pb_inlet    !== null) active_contaminants.push('pb');
  if (as_inlet    !== null) active_contaminants.push('as');
  if (ni_inlet    !== null) active_contaminants.push('ni');
  if (li_inlet    !== null) active_contaminants.push('li');

  return {
    // ---- Site identity ----
    site_id:           site.site_id,
    site_name:         site.name,
    country:           site.country,
    treatment_train:   site.treatment_train,   // ST-3C-04n
    regulatory_regime: site.regulatory_regime,

    // ---- Inlet concentrations — named parameter + unit (CC-3C-03a–e) ----
    // Ra-226: ALWAYS Bq/L — never mg/L (CC-3C-03a, ST-3C-04b/c)
    ra226_inlet,
    pb_inlet,
    as_inlet,
    ni_inlet,
    li_inlet,
    // pH — dimensionless label always present (CC-3C-03c, ST-3C-04g)
    pH_inlet:         `${rw.pH.toFixed(1)} (dimensionless)`,
    // Turbidity — site-specific permit always included (CC-3C-03d, ST-3C-04h)
    turbidity_inlet:  `${rw.turbidity_NTU.toFixed(0)} NTU (permit: ${site.permit_turbidity_NTU} NTU)`,
    // Flow rate (ST-3C-04i)
    flow_rate:        `${site.flow_rate_nominal_Ls.toFixed(0)} L/s`,

    // ---- Treatment targets — AI Advisor efficiency context ----
    // Only populated when corresponding inlet is active (ST-3C-04l pattern)
    ra226_target: ra226_inlet !== null ? `${tg.ra226_BqL} Bq/L`  : null,
    pb_target:    pb_inlet    !== null ? `${tg.pb_mgL} mg/L`      : null,
    as_target:    as_inlet    !== null ? `${tg.as_mgL} mg/L`      : null,
    ni_target:    ni_inlet    !== null ? `${tg.ni_mgL} mg/L`      : null,
    pH_target:    `${tg.pH.toFixed(1)} (dimensionless)`,
    turbidity_target: `${tg.turbidity_NTU} NTU`,

    // ---- Contaminant inventory (C2) ----
    // Explicit list — AI Advisor must not infer presence from non-null check alone
    active_contaminants,

    // ---- Operational flags ----
    // Copied from enriched boolean — not recomputed (CC-3C-03e, CC-3C-01e)
    radioactive_sludge_generating: site.isRadioactiveSite,  // ST-3C-04j
    // C1: AF3 Gate 1 advisory — polishing stage required when Ra-226 inlet > 5.0 Bq/L
    ra226_requires_polishing_stage: site.isRadioactiveSite && (rw.ra226_BqL ?? 0) > 5.0,

    // ---- Regulatory thresholds — AI Advisor compliance context (CC-3C-03f, ST-3C-04k) ----
    thresholds: THRESHOLDS,
    // C3: non-null for non-EPA/WHO regimes — prevents AI Advisor misapplying US limits
    regulatory_note: buildRegulatoryNote(site),

    // ---- Recovery context (C4) ----
    // Li recovery target — relevant only for LI-IX sites; null for all others
    li_recovery_target_pct: site.treatment_train === 'LI-IX' ? 90 : null,
  };
}
