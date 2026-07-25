/**
 * MODULE 5-C — useTelemetry Hook
 * PROJECT AQUA | March 12, 2026
 *
 * Spec: PHASE5_MODULE5C_TEST_SPECS.md — CLEARED FOR BUILD
 * Chemistry Advisor: APPROVED WITH CORRECTIONS (C1 Ni notation corrected)
 *
 * Produces a TelemetryState object updated every 500ms.
 * All chemistry simulation runs here — no computation in the display layer.
 *
 * pH model: dual-sinusoid + Gaussian noise, clamped to physical bounds.
 * Reaction chamber pH (Ni trains only): triggers AF2 alert at < 9.2, held 30s.
 * Contaminant outlets: ±15% oscillation around treatment target.
 * Radioactive sludge rates: from C5 site data (sites.js), ±5% variation.
 *
 * SENTINEL: setInterval cleared on unmount; no setState after unmount (ST-5C-07).
 */

import { useState, useEffect, useRef } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────
const TICK_MS          = 500;
const AF2_PH_THRESHOLD = 9.2;   // Ni(OH)₂ re-dissolution floor (AF2, Gate 1)
const AF2_HOLD_MS      = 30000; // minimum alert hold duration (ST-5C-03c)

// Treatment trains with a Ni precipitation stage — AF2 trigger applies
const NI_TRAINS = new Set(['HM-FULL', 'NI-PRECIP']);

// ── Gaussian noise (Box-Muller) ────────────────────────────────────────────
function gaussian(σ = 1) {
  const u1 = Math.max(1e-10, Math.random()); // guard log(0)
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * σ;
}

// ── Clamp ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ── useTelemetry ──────────────────────────────────────────────────────────
export function useTelemetry(selectedSite) {
  const [telemetryState, setTelemetryState] = useState(null);

  // Simulation state held in refs — survives re-renders, never triggers one
  const phaseRef        = useRef({ p1: 0, p2: 0, p3: 0, p4: 0 }); // oscillator phases
  const af2HoldRef      = useRef(0);   // timestamp of last AF2 trigger
  const intervalRef     = useRef(null);
  const mountedRef      = useRef(false);

  // Track mounted state for setState guard (ST-5C-07d)
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Clear any previous interval before registering a new one (ST-5C-07c)
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!selectedSite) {
      setTelemetryState(null);
      return;
    }

    // Randomise phase offsets — ensures distinct oscillation pattern per site (ST-5C-08b)
    phaseRef.current = {
      p1: Math.random() * Math.PI * 2,
      p2: Math.random() * Math.PI * 2,
      p3: Math.random() * Math.PI * 2,
      p4: Math.random() * Math.PI * 2,
    };
    af2HoldRef.current = 0;

    function computeTick() {
      const site  = selectedSite; // captured once per tick; never stale within a tick
      const rw    = site.raw_water;
      const tg    = site.treatment_targets;
      const train = site.treatment_train;
      const t     = Date.now() / 1000; // seconds since epoch (monotonic for oscillators)
      const { p1, p2, p3, p4 } = phaseRef.current;

      const isNiTrain = NI_TRAINS.has(train);
      const isLiIx    = train === 'LI-IX';

      // ── pH outlet ─────────────────────────────────────────────────────────
      // Dual sinusoid + Gaussian noise; clamped to [target−0.4, target+0.4] (ST-5C-02a)
      const pH_target = tg.pH;
      const pH_outlet = clamp(
        pH_target
          + 0.12 * Math.sin(2 * Math.PI * t / 480 + p1)
          + 0.05 * Math.sin(2 * Math.PI * t / 30  + p2)
          + gaussian(0.04),
        pH_target - 0.4,
        pH_target + 0.4,
      );

      // pH inlet — site characteristic; measurement noise only (ST-5C-02f)
      const pH_inlet = clamp(rw.pH + gaussian(0.04), 0, 14);

      // ── Reaction chamber pH and AF2 alert (Ni trains only) ───────────────
      // pH_reaction nominal = 9.75; roams 9.0–10.8; AF2 fires below 9.2 (ST-5C-03a)
      let pH_reaction_chamber = null;
      let af2_alert_active    = false;

      if (isNiTrain) {
        pH_reaction_chamber = clamp(
          9.75
            + 0.40 * Math.sin(2 * Math.PI * t / 480 + p3)
            + gaussian(0.15),
          8.8,
          10.8,
        );

        const now = Date.now();
        if (pH_reaction_chamber < AF2_PH_THRESHOLD) {
          af2HoldRef.current = now; // re-arm hold timer
        }
        // Alert active while within hold window (ST-5C-03c — minimum 30s hold)
        af2_alert_active = af2HoldRef.current > 0 && (now - af2HoldRef.current) < AF2_HOLD_MS;
      }

      // ── Contaminant outlet concentrations ─────────────────────────────────
      // ±15% oscillation around target; never below 0, never above 99% of inlet (ST-5C-04a/b)
      function contaminantOutlet(inlet, target) {
        if (inlet == null || inlet === 0 || target == null) return null;
        const raw = target * (
          1.0
          + 0.15 * Math.sin(2 * Math.PI * t / 300 + p4)
          + gaussian(0.02)
        );
        return clamp(raw, target * 0.30, inlet * 0.99);
      }

      function removalPct(inlet, outlet) {
        if (inlet == null || inlet === 0 || outlet === null) return null;
        return ((inlet - outlet) / inlet) * 100;
      }

      const ni_out    = contaminantOutlet(rw.ni_mgL,    tg.ni_mgL);
      const as_out    = contaminantOutlet(rw.as_mgL,    tg.as_mgL);
      const pb_out    = contaminantOutlet(rw.pb_mgL,    tg.pb_mgL);
      const ra226_out = contaminantOutlet(rw.ra226_BqL, tg.ra226_BqL);

      // ── Flow rate — nominal ±5% (ST-5C) ──────────────────────────────────
      const flow_rate_Ls = site.flow_rate_nominal_Ls
        * clamp(1 + 0.05 * Math.sin(2 * Math.PI * t / 180 + p1), 0.90, 1.10);

      // ── Turbidity ─────────────────────────────────────────────────────────
      const turbidity_inlet_NTU  = Math.max(0, rw.turbidity_NTU * (1 + gaussian(0.04)));
      const permit               = site.permit_turbidity_NTU;
      const turbidity_outlet_NTU = Math.max(
        0,
        permit * clamp(0.80 + 0.12 * Math.sin(2 * Math.PI * t / 600 + p2) + gaussian(0.03), 0.5, 1.2),
      );

      // ── Li recovery (LI-IX only, AF1: multi-cycle >90%) ──────────────────
      const li_recovery_pct = isLiIx
        ? clamp(90 + 3 * Math.sin(2 * Math.PI * t / 420 + p3) + gaussian(0.5), 85, 96)
        : null;

      // ── Sludge rates — from C5 site data ±5% variation (ST-5C-05) ────────
      const sludgeC5   = site.sludge_generation_rate_kgPerDay ?? { nonradioactive_kgDay: 0, radioactive_kgDay: 0 };
      const nonrad_sludge = Math.max(0, sludgeC5.nonradioactive_kgDay * (1 + gaussian(0.03)));
      const rad_sludge    = Math.max(0, sludgeC5.radioactive_kgDay    * (1 + gaussian(0.03)));

      // ── Assemble TelemetryState ───────────────────────────────────────────
      const newState = {
        timestamp_ms:           Date.now(),
        site_id:                site.site_id,

        // pH
        pH_inlet:               parseFloat(clamp(pH_inlet, 0, 14).toFixed(2)),
        pH_reaction_chamber:    pH_reaction_chamber !== null
                                  ? parseFloat(pH_reaction_chamber.toFixed(2))
                                  : null,
        pH_outlet:              parseFloat(clamp(pH_outlet, 0, 14).toFixed(2)),

        // Contaminant outlets (null = not present on this site)
        ni_outlet_mgL:          ni_out    !== null ? parseFloat(ni_out.toFixed(3))    : null,
        as_outlet_mgL:          as_out    !== null ? parseFloat(as_out.toFixed(3))    : null,
        pb_outlet_mgL:          pb_out    !== null ? parseFloat(pb_out.toFixed(3))    : null,
        ra226_outlet_BqL:       ra226_out !== null ? parseFloat(ra226_out.toFixed(3)) : null,
        li_recovery_pct:        li_recovery_pct !== null ? parseFloat(li_recovery_pct.toFixed(1)) : null,

        // Removal efficiencies
        ni_removal_pct:         removalPct(rw.ni_mgL,    ni_out)    !== null ? parseFloat(removalPct(rw.ni_mgL,    ni_out).toFixed(1))    : null,
        as_removal_pct:         removalPct(rw.as_mgL,    as_out)    !== null ? parseFloat(removalPct(rw.as_mgL,    as_out).toFixed(1))    : null,
        pb_removal_pct:         removalPct(rw.pb_mgL,    pb_out)    !== null ? parseFloat(removalPct(rw.pb_mgL,    pb_out).toFixed(1))    : null,
        ra226_removal_pct:      removalPct(rw.ra226_BqL, ra226_out) !== null ? parseFloat(removalPct(rw.ra226_BqL, ra226_out).toFixed(1)) : null,

        // Flow and turbidity
        flow_rate_Ls:           parseFloat(flow_rate_Ls.toFixed(1)),
        turbidity_inlet_NTU:    parseFloat(turbidity_inlet_NTU.toFixed(0)),
        turbidity_outlet_NTU:   parseFloat(turbidity_outlet_NTU.toFixed(1)),

        // Sludge
        nonradioactive_sludge_kgDay: parseFloat(nonrad_sludge.toFixed(1)),
        radioactive_sludge_kgDay:    parseFloat(rad_sludge.toFixed(1)),

        // C5 pass-throughs (ST-5C-06a/b)
        reagent_dose_rates: site.reagent_dose_rates ?? {},
        hrt_min:            site.hrt_min ?? {},

        // Flags
        af2_alert_active,
        ix_resin_loading_pct: null, // Phase 6: wired from ProcessFlow particleEngine state
      };

      if (mountedRef.current) {
        setTelemetryState(newState);
      }
    }

    // First tick fires immediately; then every TICK_MS
    computeTick();
    intervalRef.current = setInterval(computeTick, TICK_MS);

    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [selectedSite]); // re-runs when site changes (ST-5C-08a)

  return telemetryState;
}
