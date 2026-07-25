/**
 * MODULE 5-C — TelemetryPanel (Layer 4)
 * PROJECT AQUA | March 12, 2026
 *
 * Spec: PHASE5_MODULE5C_TEST_SPECS.md — CLEARED FOR BUILD
 *
 * Displays live telemetry from useTelemetry. Pure display — no chemistry computed here.
 * All values come from TelemetryState produced by the useTelemetry hook.
 *
 * Layout: left-side panel (280px), positioned to not overlap ProcessFlow (right side).
 * Renders: pH gauges, contaminant meters, flow/turbidity, sludge rates, AF2 alert.
 */

// telemetryState is provided by parent (App.jsx calls useTelemetry once — single source of truth)

// ── Helpers ─────────────────────────────────────────────────────────────────
function Row({ label, value, unit, accent, dim }) {
  return (
    <div className={`flex justify-between items-baseline py-1 ${dim ? 'opacity-40' : ''}`}>
      <span className="text-slate-300 text-xs font-mono truncate pr-2">{label}</span>
      <span className={`text-[13px] font-mono tabular-nums whitespace-nowrap ${accent ?? 'text-cyan-300'}`}>
        {value}<span className="text-slate-400 text-[10px] ml-0.5">{unit}</span>
      </span>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mt-3 mb-1 border-b border-slate-700 pb-0.5">
      {title}
    </div>
  );
}

// pH bar — colour shifts green → amber → red
// warnLo: optional pre-alert floor — value in [warnLo, lo) renders amber (pre-alert zone)
function PhBar({ label, value, lo = 6.5, hi = 8.5, warnLo }) {
  if (value === null) return null;
  const inRange = value >= lo && value <= hi;
  const inWarn  = warnLo !== undefined && value >= warnLo && value < lo;
  const colour  = inRange ? 'bg-emerald-400'
                : inWarn  ? 'bg-amber-400'
                : value < (warnLo ?? 4) ? 'bg-red-500'
                : 'bg-amber-400';
  const textCol = inRange ? 'text-emerald-400' : inWarn ? 'text-amber-400' : 'text-red-400';
  const pct     = Math.min(100, (value / 14) * 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[11px] font-mono mb-0.5">
        <span className="text-slate-300">{label}</span>
        <span className={textCol}>{value.toFixed(2)}</span>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${colour}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Efficiency bar — green fill
function EffBar({ label, pct, outlet, unit }) {
  if (pct === null) return null;
  const good = pct >= 90;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[11px] font-mono mb-0.5">
        <span className="text-slate-300">{label}</span>
        <span className={good ? 'text-emerald-400' : 'text-amber-400'}>
          {pct.toFixed(1)}%{' '}
          <span className="text-slate-400">→ {outlet} {unit}</span>
        </span>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${good ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
import InfoBadge from '../ui/InfoBadge';

export default function TelemetryPanel({ selectedSite, telemetryState }) {
  const ts = telemetryState;

  // No site selected
  if (!selectedSite) {
    return (
      <div className="absolute left-6 top-6 w-[320px] bg-black/80 border border-cyan-400/20 rounded-lg flex items-center justify-center" style={{ bottom: '6rem' }}>
        <span className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">Select a site</span>
      </div>
    );
  }

  // Site selected but first tick not yet computed
  if (!ts) {
    return (
      <div className="absolute left-6 top-6 w-[320px] bg-black/80 border border-cyan-400/20 rounded-lg flex items-center justify-center" style={{ bottom: '6rem' }}>
        <span className="text-slate-500 text-[10px] font-mono animate-pulse">Initialising…</span>
      </div>
    );
  }

  const rw   = selectedSite.raw_water;
  const dr   = ts.reagent_dose_rates;
  const isRa = selectedSite.isRadioactiveSite;

  return (
    <div className="absolute left-6 top-6 w-[320px] bg-black/85 border border-cyan-400/30 rounded-lg flex flex-col" style={{ bottom: '6rem' }}>

      {/* ── Header ── */}
      <div className="flex-none px-3 py-2.5 border-b border-cyan-400/20">
        <div className="flex items-center justify-between">
          <div className="text-cyan-400 text-[10px] font-mono uppercase tracking-widest">
            Layer 4 — Simulated Live Telemetry
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-mono text-slate-600">500ms</div>
            <InfoBadge
              popover="bottom-right"
              plain="Simulated readings modelled on real industrial treatment plant data, updated every half second. pH measures water acidity — 7 is neutral and this process needs tight control. The coloured bars show how much of each contaminant has been removed and whether levels are within legal discharge limits."
              technical="500ms simulated telemetry. pH bars: inlet, reaction chamber (Ni trains only), and outlet vs. 6.5–8.5 discharge standard. Contaminant removal (%): outlet concentrations vs. EPA MCL (Ra-226: 0.185 Bq/L, Pb: 0.01 mg/L, As: 0.01 mg/L, Ni: 0.1 mg/L) and WHO guidelines. Flow rate (L/s), turbidity (NTU vs. site permit), reagent dose rates (mg/L), sludge generation (kg/day) with radioactive stream separated."
            />
          </div>
        </div>
        <div className="text-white text-sm font-semibold mt-0.5 leading-tight truncate">
          {selectedSite.name}
        </div>

        {/* AF2 alert banner — fires when pH_reaction_chamber < 9.2 (AF2, Gate 1) */}
        {ts.af2_alert_active && (
          <div className="mt-1.5 px-2 py-1 bg-amber-900/60 border border-amber-500/50 rounded text-amber-400 text-[11px] font-mono animate-pulse">
            ⚠ AF2 — pH FLOOR: Ni(OH)₂ RE-DISSOLUTION RISK
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">

        {/* ── pH ── */}
        <SectionHeader title="pH" />
        <PhBar label="Inlet" value={ts.pH_inlet} lo={0} hi={14} />
        {ts.pH_reaction_chamber !== null && (
          <PhBar
            label={`Reaction Chamber${ts.af2_alert_active ? ' ⚠' : ''}`}
            value={ts.pH_reaction_chamber}
            lo={9.2}
            hi={10.8}
            warnLo={9.0}
          />
        )}
        <PhBar label="Outlet" value={ts.pH_outlet} lo={6.5} hi={8.5} />

        {/* ── Contaminant removal ── */}
        {(ts.ni_removal_pct !== null || ts.as_removal_pct !== null ||
          ts.pb_removal_pct !== null || ts.ra226_removal_pct !== null) && (
          <SectionHeader title="Contaminant Removal" />
        )}
        <EffBar label="Ni" pct={ts.ni_removal_pct} outlet={ts.ni_outlet_mgL?.toFixed(3)} unit="mg/L" />
        <EffBar label="As" pct={ts.as_removal_pct} outlet={ts.as_outlet_mgL?.toFixed(3)} unit="mg/L" />
        <EffBar label="Pb" pct={ts.pb_removal_pct} outlet={ts.pb_outlet_mgL?.toFixed(3)} unit="mg/L" />
        {ts.ra226_removal_pct !== null && (
          <EffBar label="Ra-226 ☢" pct={ts.ra226_removal_pct} outlet={ts.ra226_outlet_BqL?.toFixed(3)} unit="Bq/L" />
        )}
        {ts.li_recovery_pct !== null && (
          <div className="mb-2">
            <div className="flex justify-between text-[11px] font-mono mb-0.5">
              <span className="text-slate-500">Li Recovery</span>
              <span className="text-amber-300">{ts.li_recovery_pct.toFixed(1)}% <span className="text-slate-400">(multi-cycle)</span></span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${ts.li_recovery_pct}%` }} />
            </div>
          </div>
        )}

        {/* ── Flow and turbidity ── */}
        <SectionHeader title="Hydraulics" />
        <Row label="Flow rate" value={ts.flow_rate_Ls.toFixed(1)} unit="L/s" />
        <Row label="Turbidity — inlet" value={ts.turbidity_inlet_NTU} unit="NTU" />
        <Row
          label={`Turbidity — outlet (permit ${selectedSite.permit_turbidity_NTU})`}
          value={ts.turbidity_outlet_NTU.toFixed(1)}
          unit="NTU"
          accent={ts.turbidity_outlet_NTU <= selectedSite.permit_turbidity_NTU ? 'text-emerald-400' : 'text-red-400'}
        />

        {/* ── Sludge ── */}
        <SectionHeader title="Sludge Generation" />
        <Row label="Non-radioactive" value={ts.nonradioactive_sludge_kgDay.toFixed(0)} unit="kg/day" accent="text-amber-600/80" />
        {isRa && (
          <Row label="Radioactive ☢ (Ba,Ra)SO₄" value={ts.radioactive_sludge_kgDay.toFixed(1)} unit="kg/day" accent="text-fuchsia-400" />
        )}

        {/* ── Reagent doses (pass-through from C5) ── */}
        <SectionHeader title="Reagent Doses" />
        {dr.Ca_OH_2_mgL > 0 && <Row label="Ca(OH)₂" value={dr.Ca_OH_2_mgL} unit="mg/L" accent="text-slate-300" />}
        {dr.FeCl3_mgL   > 0 && <Row label="FeCl₃"   value={dr.FeCl3_mgL}   unit="mg/L" accent="text-orange-400/80" />}
        {dr.BaCl2_mgL   > 0 && <Row label="BaCl₂ ☢" value={dr.BaCl2_mgL}   unit="mg/L" accent="text-fuchsia-400" />}
        {dr.CO2_mgL     > 0 && <Row label="CO₂"      value={dr.CO2_mgL}     unit="mg/L" accent="text-slate-400" />}
        {dr.Al2SO4_mgL  > 0 && <Row label="Al₂(SO₄)₃" value={dr.Al2SO4_mgL} unit="mg/L" accent="text-slate-300" />}
        {dr.HCl_eluent_mgL > 0 && <Row label="HCl eluent" value={dr.HCl_eluent_mgL} unit="mg/L equiv." accent="text-yellow-600/80" />}

      </div>

      {/* ── Footer ── */}
      <div className="flex-none px-3 py-1.5 border-t border-cyan-400/20 flex justify-between items-center">
        <span className="text-slate-400 text-[10px] font-mono">{selectedSite.regulatory_regime}</span>
        <span className="text-slate-500 text-[10px] font-mono">{new Date(ts.timestamp_ms).toLocaleTimeString()}</span>
      </div>

    </div>
  );
}
