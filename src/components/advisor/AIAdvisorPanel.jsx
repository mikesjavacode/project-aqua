/**
 * MODULE 7-A — AIAdvisorPanel (Layer 5)
 * PROJECT AQUA | March 12, 2026
 *
 * Spec: PHASE7_AI_ADVISOR_SPEC.md — CLEARED FOR BUILD
 * Chemistry Advisor: APPROVED WITH CORRECTIONS (C7 incorporated)
 *
 * Claude AI situational advisor. Receives selectedSite + telemetryState as props
 * from App.jsx shared instance. Does NOT call useTelemetry internally
 * (SENTINEL single-source-of-truth rule).
 *
 * The browser holds no API key and never calls api.anthropic.com. It POSTs the
 * telemetry snapshot built below to /api/advisor/aqua on the host site, which
 * pins the chemistry system prompt server-side, caches advisories per site, and
 * always returns usable text. The typewriter render is local — nothing streams.
 *
 * C7 now lives in the server prompt (site/services/prompts_aqua.py): Ni(OH)2
 * re-dissolution is acid-side only, and a Ca(OH)2 dose reduction must never be
 * recommended while AF2 is active.
 *
 * SENTINEL: AbortController aborted on site-change/unmount. Timers cleared on
 * cleanup. No setState after unmount (mountedRef guard). No overlapping requests.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { buildAdvisorTelemetry } from '../../data/advisorFormat';
import { BUNDLED_ADVISORIES, DEFAULT_ADVISORY } from '../../data/advisorFallbacks';
import InfoBadge from '../ui/InfoBadge';

const ENDPOINT  = '/api/advisor/aqua';
const WARMUP_MS = 5000;               // Grace period after site select (ST-7A-04)

// Refresh cadence. Slower than the original 30–60 s: advisories are generated
// once per site and shared, so a faster poll mostly re-reads the same text.
const REFRESH_MIN_MS    = 45000;
const REFRESH_JITTER_MS = 45000;      // 45–90 s

// Session ceiling. A tab left open overnight used to request advisories forever;
// this bounds it. The last advisory stays on screen once the ceiling is reached.
const MAX_ADVISORIES_PER_SESSION = 20;
let advisoriesThisSession = 0;

// Typewriter — keeps the sense of the panel composing its assessment
const TYPE_INTERVAL_MS    = 16;
const TYPE_CHARS_PER_STEP = 5;

// ── STATUS LEVEL visual mapping ─────────────────────────────────────────────
const LEVEL_STYLE = {
  COMPLIANT: { border: 'border-emerald-400/30', badge: 'bg-emerald-900/40 text-emerald-400 border-emerald-500/40', label: 'text-emerald-400' },
  WATCH:     { border: 'border-amber-400/30',   badge: 'bg-amber-900/40 text-amber-400 border-amber-500/40',     label: 'text-amber-400' },
  ALERT:     { border: 'border-red-500/40',     badge: 'bg-red-900/40 text-red-400 border-red-500/40',           label: 'text-red-400' },
  CRITICAL:  { border: 'border-fuchsia-400/40', badge: 'bg-fuchsia-900/40 text-fuchsia-400 border-fuchsia-500/40 animate-pulse', label: 'text-fuchsia-400' },
};

// A reused advisory is labelled rather than passed off as fresh; a live one
// carries no tag.
const SOURCE_LABEL = { cache: 'CACHED', stale: 'ARCHIVED', fallback: 'ARCHIVED' };

// ── Build user message from spec Section 2-C ────────────────────────────────
// This is the whole of what the client sends: factual telemetry, no persona and
// no instructions.
function buildUserMessage(site, ts) {
  const pkg = buildAdvisorTelemetry(site);
  if (!pkg || !ts) return '';

  const lines = [];

  lines.push(`FACILITY TELEMETRY SNAPSHOT — ${pkg.site_name} (${pkg.site_id})`);
  lines.push(`Timestamp: ${new Date(ts.timestamp_ms).toISOString()}`);
  lines.push(`Treatment train: ${pkg.treatment_train}`);
  lines.push(`Regulatory regime: ${pkg.regulatory_regime}`);
  if (pkg.regulatory_note) {
    lines.push('');
    lines.push(`REGULATORY NOTE: ${pkg.regulatory_note}`);
  }

  lines.push('');
  lines.push('=== INLET CONDITIONS ===');
  lines.push(`pH (inlet):        ${pkg.pH_inlet}`);
  lines.push(`Turbidity (inlet): ${pkg.turbidity_inlet}`);
  lines.push(`Flow rate:         ${pkg.flow_rate}`);
  if (pkg.ra226_inlet) lines.push(`Ra-226 (inlet):    ${pkg.ra226_inlet}`);
  if (pkg.pb_inlet)    lines.push(`Pb (inlet):        ${pkg.pb_inlet}`);
  if (pkg.as_inlet)    lines.push(`As (inlet):        ${pkg.as_inlet}`);
  if (pkg.ni_inlet)    lines.push(`Ni (inlet):        ${pkg.ni_inlet}`);
  if (pkg.li_inlet)    lines.push(`Li (inlet):        ${pkg.li_inlet}`);
  lines.push(`Active contaminants: ${pkg.active_contaminants.join(', ')}`);

  lines.push('');
  lines.push('=== CURRENT PROCESS STATE (LIVE) ===');
  lines.push(`pH (outlet, live):            ${ts.pH_outlet.toFixed(2)} (dimensionless)   target: ${pkg.pH_target}`);
  if (ts.pH_reaction_chamber !== null) {
    lines.push(`pH (reaction chamber, live):  ${ts.pH_reaction_chamber.toFixed(2)} (dimensionless)`);
    if (ts.af2_alert_active) {
      lines.push('⚠ AF2 ALERT ACTIVE: Ni(OH)2 re-dissolution risk — pH_reaction_chamber below 9.2 floor');
    }
  }
  lines.push(`Turbidity (outlet, live):     ${ts.turbidity_outlet_NTU.toFixed(1)} NTU    permit: ${site.permit_turbidity_NTU} NTU`);
  lines.push(`Flow rate (live):             ${ts.flow_rate_Ls.toFixed(1)} L/s`);

  lines.push('');
  lines.push('=== CONTAMINANT OUTLET (LIVE) ===');
  if (ts.ni_outlet_mgL !== null) {
    lines.push(`Ni outlet:     ${ts.ni_outlet_mgL.toFixed(3)} mg/L   target: ${pkg.ni_target}   removal: ${ts.ni_removal_pct?.toFixed(1)}%`);
  }
  if (ts.as_outlet_mgL !== null) {
    lines.push(`As outlet:     ${ts.as_outlet_mgL.toFixed(3)} mg/L   target: ${pkg.as_target}   removal: ${ts.as_removal_pct?.toFixed(1)}%`);
  }
  if (ts.pb_outlet_mgL !== null) {
    lines.push(`Pb outlet:     ${ts.pb_outlet_mgL.toFixed(3)} mg/L   target: ${pkg.pb_target}   removal: ${ts.pb_removal_pct?.toFixed(1)}%`);
  }
  if (ts.ra226_outlet_BqL !== null) {
    // Ra-226: ALWAYS Bq/L — unit enforced at construction (spec ST-7A-05)
    lines.push(`Ra-226 outlet: ${ts.ra226_outlet_BqL.toFixed(3)} Bq/L  target: ${pkg.ra226_target}   removal: ${ts.ra226_removal_pct?.toFixed(1)}%`);
  }
  if (ts.li_recovery_pct !== null) {
    lines.push(`Li recovery:   ${ts.li_recovery_pct.toFixed(1)}%   target: ${pkg.li_recovery_target_pct}%  (multi-cycle)`);
  }

  // Gate 3 operational note: Fe:As mass ratio for FeCl3-dosed As-removal sites
  // Chemistry Advisor: SITE-004 Zambia at margin (2.99) — flag in RECOMMENDATIONS
  const dr_raw = site.reagent_dose_rates ?? {};
  const rw_raw = site.raw_water ?? {};
  if ((dr_raw.FeCl3_mgL ?? 0) > 0 && (rw_raw.as_mgL ?? 0) > 0) {
    const feAdded_mgL = dr_raw.FeCl3_mgL * (55.85 / 162.2); // Fe fraction of FeCl3
    const feAsRatio   = feAdded_mgL / rw_raw.as_mgL;
    lines.push('');
    lines.push(`Fe:As mass ratio (advisory ≥ 3.0): ${feAsRatio.toFixed(2)}${feAsRatio < 3.0 ? ' ⚠ BELOW MINIMUM' : feAsRatio < 3.05 ? ' (at margin)' : ''}`);
  }

  lines.push('');
  lines.push('=== SLUDGE GENERATION (LIVE) ===');
  lines.push(`Non-radioactive sludge: ${ts.nonradioactive_sludge_kgDay.toFixed(0)} kg/day`);
  if (pkg.radioactive_sludge_generating) {
    lines.push(`Radioactive sludge (Ra,BaSO4): ${ts.radioactive_sludge_kgDay.toFixed(1)} kg/day`);
    lines.push('radioactive_sludge_generating: true');
  }
  if (pkg.ra226_requires_polishing_stage) {
    lines.push(`RA-226 POLISHING STAGE REQUIRED: inlet ${pkg.ra226_inlet} exceeds 5.0 Bq/L threshold`);
  }

  const dr = ts.reagent_dose_rates ?? {};
  const reagentLines = [];
  if (dr.Ca_OH_2_mgL  > 0) reagentLines.push(`  Ca(OH)2:       ${dr.Ca_OH_2_mgL} mg/L`);
  if (dr.FeCl3_mgL    > 0) reagentLines.push(`  FeCl3:         ${dr.FeCl3_mgL} mg/L`);
  if (dr.BaCl2_mgL    > 0) reagentLines.push(`  BaCl2:         ${dr.BaCl2_mgL} mg/L`);
  if (dr.CO2_mgL      > 0) reagentLines.push(`  CO2:           ${dr.CO2_mgL} mg/L`);
  if (dr.Al2SO4_mgL   > 0) reagentLines.push(`  Al2(SO4)3:     ${dr.Al2SO4_mgL} mg/L`);
  if (dr.HCl_eluent_mgL > 0) reagentLines.push(`  HCl eluent:   ${dr.HCl_eluent_mgL} mg/L equiv.`);
  if (reagentLines.length > 0) {
    lines.push('');
    lines.push('=== REAGENT DOSES (LIVE) ===');
    lines.push(...reagentLines);
  }

  lines.push('');
  lines.push('=== REGULATORY THRESHOLDS (REFERENCE) ===');
  lines.push(`Ra-226 EPA MCL:   0.185 Bq/L`);
  lines.push(`Pb EPA limit:     0.010 mg/L`);
  lines.push(`As EPA MCL:       0.010 mg/L`);
  lines.push(`Ni WHO guideline: 0.100 mg/L`);

  return lines.join('\n');
}

// ── Advisory request ────────────────────────────────────────────────────────
// Cache key is the site id, so everyone looking at the same site shares one
// advisory. Throws on any non-200; the caller falls back to the bundled set.
async function requestAdvisory(site, context, signal) {
  const response = await fetch(ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ key: site.site_id, context }),
    signal,
  });
  if (!response.ok) throw new Error(`advisor endpoint returned ${response.status}`);
  return response.json();
}

function bundledAdvisory(site) {
  return {
    text:         BUNDLED_ADVISORIES[site.site_id] ?? DEFAULT_ADVISORY,
    source:       'fallback',
    generated_at: null,
  };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AIAdvisorPanel({ selectedSite, telemetryState }) {
  const [displayText, setDisplayText]     = useState('');
  const [isRequesting, setIsRequesting]   = useState(false);
  const [isTyping, setIsTyping]           = useState(false);
  const [statusLevel, setStatusLevel]     = useState(null);
  const [source, setSource]               = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);

  // Refs — avoid stale closures in interval/timeout callbacks (ST-7A-10/11)
  const abortControllerRef = useRef(null);
  const mountedRef         = useRef(true);
  const nextTimerRef       = useRef(null);   // setTimeout handle for next advisory
  const typeTimerRef       = useRef(null);   // setInterval handle for the typewriter
  const deferredRef        = useRef(false);  // a refresh fell due while tab hidden
  const latestSiteRef      = useRef(selectedSite);
  const latestTelemetryRef = useRef(telemetryState);

  // Keep latest refs current on every render
  useEffect(() => { latestSiteRef.current      = selectedSite;   }, [selectedSite]);
  useEffect(() => { latestTelemetryRef.current = telemetryState; }, [telemetryState]);

  const stopTypewriter = useCallback(() => {
    clearInterval(typeTimerRef.current);
    typeTimerRef.current = null;
  }, []);

  // Unmount cleanup (ST-7A-03)
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      clearTimeout(nextTimerRef.current);
      clearInterval(typeTimerRef.current);
    };
  }, []);

  // ── Schedule next advisory (recursive setTimeout for randomised interval) ─
  const scheduleNext = useCallback(() => {
    clearTimeout(nextTimerRef.current);
    if (advisoriesThisSession >= MAX_ADVISORIES_PER_SESSION) return;

    nextTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      if (document.visibilityState === 'hidden') {
        // Nobody is reading it and it still costs a request — wait for focus.
        deferredRef.current = true;
        return;
      }
      fireAdvisory(); // eslint-disable-line no-use-before-define
    }, REFRESH_MIN_MS + Math.random() * REFRESH_JITTER_MS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Type an advisory out in place of the old token stream ────────────────
  const runTypewriter = useCallback((text) => {
    stopTypewriter();
    let shown = 0;
    setIsTyping(true);
    typeTimerRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      shown += TYPE_CHARS_PER_STEP;
      setDisplayText(text.slice(0, shown));
      if (shown >= text.length) {
        stopTypewriter();
        setIsTyping(false);
        scheduleNext();
      }
    }, TYPE_INTERVAL_MS);
  }, [scheduleNext, stopTypewriter]);

  // ── Fetch one advisory and render it ─────────────────────────────────────
  const fireAdvisory = useCallback(async () => {
    const site = latestSiteRef.current;
    const ts   = latestTelemetryRef.current;
    if (!mountedRef.current || !site || !ts) return;

    // Abort any in-flight request — no overlapping advisories (ST-7A-01)
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    stopTypewriter();
    setIsRequesting(true);
    setIsTyping(false);
    setDisplayText('');
    advisoriesThisSession += 1;

    let advisory;
    try {
      advisory = await requestAdvisory(site, buildUserMessage(site, ts), controller.signal);
    } catch (err) {
      // AbortError is expected on site-change / unmount (ST-7A-02)
      if (!mountedRef.current || controller.signal.aborted || err.name === 'AbortError') {
        setIsRequesting(false);
        return;
      }
      // No endpoint (running standalone) or the request failed — the bundled set
      // keeps Layer 5 showing a real assessment instead of an error line.
      advisory = bundledAdvisory(site);
    }

    if (!mountedRef.current || controller.signal.aborted) return;

    // Parse STATUS LEVEL from the complete text (spec Section 6-D)
    const match = advisory.text.match(/\*\*STATUS LEVEL:\s*(COMPLIANT|WATCH|ALERT|CRITICAL)\*\*/);
    if (match) setStatusLevel(match[1]);

    setSource(advisory.source);
    setLastTimestamp(advisory.generated_at ? advisory.generated_at * 1000 : Date.now());
    setIsRequesting(false);
    runTypewriter(advisory.text);
  }, [runTypewriter, stopTypewriter]);

  // ── Pick up a refresh that fell due while the tab was hidden ─────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' || !deferredRef.current) return;
      deferredRef.current = false;
      fireAdvisory();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fireAdvisory]);

  // ── Site-change effect — reset, warm-up, fire first advisory (ST-7A-11) ──
  useEffect(() => {
    // Abort in-flight request and clear any pending timer
    abortControllerRef.current?.abort();
    clearTimeout(nextTimerRef.current);
    stopTypewriter();
    deferredRef.current = false;

    setDisplayText('');
    setStatusLevel(null);
    setSource(null);
    setIsRequesting(false);
    setIsTyping(false);

    if (!selectedSite) return;

    // 5-second warm-up — useTelemetry first tick arrives at 500ms (ST-7A-04)
    const warmup = setTimeout(() => {
      if (!mountedRef.current) return;
      fireAdvisory();
    }, WARMUP_MS);

    return () => {
      clearTimeout(warmup);
      clearTimeout(nextTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, [selectedSite, fireAdvisory, stopTypewriter]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const style       = statusLevel ? LEVEL_STYLE[statusLevel] : LEVEL_STYLE.COMPLIANT;
  const isIdle      = !selectedSite;
  const sourceLabel = SOURCE_LABEL[source] ?? null;

  return (
    <div
      className={`absolute right-6 bottom-6 w-[720px] max-h-[380px] bg-black/85 border ${style.border} rounded-lg flex flex-col overflow-hidden`}
      style={{ top: 'auto' }}
    >
      {/* ── Header ── */}
      <div className="flex-none px-3 py-2.5 border-b border-cyan-400/20">
        <div className="flex items-center justify-between">
          <div className="text-cyan-400 text-[10px] font-mono uppercase tracking-widest">
            Layer 5 — AI Advisor
          </div>
          <div className="flex items-center gap-1.5">
            {(isRequesting || isTyping) && (
              <span className="text-[9px] font-mono text-cyan-400 animate-pulse">advising</span>
            )}
            {sourceLabel && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-slate-600/50 text-slate-400">
                {sourceLabel}
              </span>
            )}
            {statusLevel && (
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${style.badge}`}>
                {statusLevel}
              </span>
            )}
            <span className="text-slate-400 text-[10px] font-mono">~45–90s</span>
            <InfoBadge
              popover="bottom-left"
              plain="A Claude AI is continuously watching the plant's live data — acting like an on-call process engineer. It assesses treatment performance, flags anything approaching legal limits, and recommends what operators should adjust. The colour of this panel's border reflects overall system health."
              technical="Claude claude-haiku-4-5 advisor, refreshing every 45–90 seconds. The browser posts telemetry to a same-origin endpoint and holds no API key; the chemistry system prompt is pinned server-side and advisories are cached per site, so a CACHED or ARCHIVED tag means this assessment was generated for an earlier visitor. Structured output: SITUATION / NOTABLE PARAMETERS / ASSESSMENT / RECOMMENDATIONS / STATUS LEVEL. Border: COMPLIANT (teal) → WATCH (amber) → ALERT (red) → CRITICAL (fuchsia pulse). C7 guardrail: Ni(OH)₂ re-dissolution warnings suppressed at high pH; Ca(OH)₂ dose reduction never recommended when AF2 active."
            />
          </div>
        </div>

        {selectedSite && (
          <div className="text-white text-sm font-semibold mt-0.5 leading-tight truncate">
            {selectedSite.name}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {isIdle ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-slate-300 text-[10px] font-mono uppercase tracking-widest">
              Select a site to activate AI Advisor
            </span>
          </div>
        ) : displayText === '' ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-slate-300 text-[10px] font-mono animate-pulse">
              Initialising — advisory in ~5s…
            </span>
          </div>
        ) : (
          <pre className="text-xs font-mono text-slate-100 whitespace-pre-wrap leading-relaxed">
            {displayText}
            {isTyping && <span className="text-cyan-400 animate-pulse">█</span>}
          </pre>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex-none px-3 py-1.5 border-t border-cyan-400/20 flex justify-between items-center">
        <span className="text-slate-400 text-[10px] font-mono">
          {selectedSite?.regulatory_regime ?? '—'}
        </span>
        <span className="text-slate-500 text-[10px] font-mono">
          {lastTimestamp
            ? new Date(lastTimestamp).toLocaleTimeString()
            : '—'}
        </span>
      </div>
    </div>
  );
}
