/**
 * MODULE 3-C — useSelectedSite Hook
 * PROJECT AQUA | March 11, 2026
 *
 * Spec: PHASE3_MODULE3C_TEST_SPECS.md — CLEARED FOR BUILD (C1/C2/C3 + advisory incorporated)
 *
 * Responsibility:
 *   - Receive site selection events from Module 3-B (via App's onSiteSelect)
 *   - Run 3-C validation gate on every selectSite() call (ST-3C-02)
 *   - Expose validated, clamped site data to downstream consumers
 *   - Handle null / deselect cleanly (CC-3C-04, ST-3C-03)
 *
 * Validation gate — two categories:
 *   BLOCKING  → selectSite does not update state; selectedSite remains null
 *   NON-BLOCKING CLAMP → value corrected, error logged, site accepted
 */

import { useState, useCallback } from 'react';

// C3: the five valid treatment train identifiers (CC-3C-02i)
const VALID_TRAIN_IDS = ['HM-FULL', 'RAD-COPREC', 'NI-PRECIP', 'PB-AS-COPREC', 'LI-IX'];

// ---------------------------------------------------------------------------
// validateAndClamp
// Returns a (possibly corrected) AquaSite, or null on blocking error.
// Does not mutate the input — returns a shallow clone with corrected raw_water
// only if clamps were applied (ST-3C-02a: valid site preserves reference).
// ---------------------------------------------------------------------------
function validateAndClamp(site) {

  // ---- BLOCKING checks — log and return null ----

  // CC-3C-02g: upstream validation failure
  if (site.validationError === true) {
    console.error(`[AQUA 3-C] Site ${site.site_id}: upstream validationError — blocked`);
    return null;
  }

  // CC-3C-02e: flow rate must be strictly positive
  if (!(site.flow_rate_nominal_Ls > 0)) {
    console.error(`[AQUA 3-C] Site ${site.site_id}: flow_rate_nominal_Ls=${site.flow_rate_nominal_Ls} — blocked`);
    return null;
  }

  // CC-3C-02f: site-specific turbidity permit required — no global default
  if (site.permit_turbidity_NTU == null) {
    console.error(`[AQUA 3-C] Site ${site.site_id}: permit_turbidity_NTU missing — blocked`);
    return null;
  }

  // CC-3C-02c: Ra-226 unit error — field name is the safety contract
  if (site.raw_water && 'ra226_mgL' in site.raw_water) {
    console.error(`[AQUA 3-C] Site ${site.site_id}: UNIT ERROR — ra226_mgL found, must be ra226_BqL — blocked`);
    return null;
  }

  // CC-3C-02i (C3): treatment_train must be one of the 5 known IDs
  if (!VALID_TRAIN_IDS.includes(site.treatment_train)) {
    console.error(`[AQUA 3-C] Site ${site.site_id}: unknown treatment_train '${site.treatment_train}' — blocked`);
    return null;
  }

  // ---- NON-BLOCKING clamps — correct and continue ----

  const rw = { ...site.raw_water };
  let clamped = false;

  // CC-3C-02a/b: pH — NaN and out-of-range
  if (rw.pH == null || isNaN(rw.pH)) {
    console.error(`[AQUA 3-C] Site ${site.site_id}: pH is NaN/missing — clamped to 7.0`);
    rw.pH = 7.0;
    clamped = true;
  } else if (rw.pH < 0) {
    console.error(`[AQUA 3-C] Site ${site.site_id}: pH ${rw.pH} < 0 — clamped to 0.0`);
    rw.pH = 0.0;
    clamped = true;
  } else if (rw.pH > 14) {
    console.error(`[AQUA 3-C] Site ${site.site_id}: pH ${rw.pH} > 14 — clamped to 14.0`);
    rw.pH = 14.0;
    clamped = true;
  }

  // CC-3C-02d: negative concentrations → 0
  ['ra226_BqL', 'pb_mgL', 'as_mgL', 'ni_mgL', 'li_mgL'].forEach((f) => {
    if (rw[f] != null && rw[f] < 0) {
      console.error(`[AQUA 3-C] Site ${site.site_id}: ${f}=${rw[f]} < 0 — clamped to 0`);
      rw[f] = 0;
      clamped = true;
    }
  });

  // CC-3C-02h (C2): Ra-226 upper bound — 10.0 Bq/L maximum (CLAUDE.md valid range)
  if (rw.ra226_BqL != null && rw.ra226_BqL > 10.0) {
    console.error(`[AQUA 3-C] Site ${site.site_id}: ra226_BqL=${rw.ra226_BqL} > 10.0 — clamped to 10.0`);
    rw.ra226_BqL = 10.0;
    clamped = true;
  }

  // Return original reference if no corrections were needed (ST-3C-02a)
  return clamped ? { ...site, raw_water: rw } : site;
}

// ---------------------------------------------------------------------------
// useSelectedSite — custom hook
// Returns: { selectedSite, selectSite, clearSite }
//   selectedSite — validated AquaSite or null (ST-3C-01a/b)
//   selectSite(site)  — validates + clamps before updating state (ST-3C-01c)
//   clearSite()       — resets to null (ST-3C-03a)
// ---------------------------------------------------------------------------
export function useSelectedSite() {
  const [selectedSite, setSelectedSite] = useState(null);

  // selectSite — handles both site objects and null (ST-3C-01c, ST-3C-03b)
  const selectSite = useCallback((site) => {
    if (!site) {
      setSelectedSite(null);
      return;
    }
    const validated = validateAndClamp(site);
    // validated is null if blocked — selectedSite will be set to null (ST-3C-02f)
    setSelectedSite(validated);
  }, []);

  // clearSite — explicit deselect API (ST-3C-03a)
  const clearSite = useCallback(() => {
    setSelectedSite(null);
  }, []);

  return { selectedSite, selectSite, clearSite };
}
