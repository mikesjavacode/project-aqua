/**
 * MODULE 5-A — Process Flow Schematic + Animated Particles (Layer 2)
 * PROJECT AQUA | March 12, 2026
 *
 * Spec: PHASE5_MODULE5A_TEST_SPECS.md — CLEARED FOR BUILD
 * Chemistry Advisor: APPROVED WITH CORRECTIONS (C1/C2 + advisory incorporated)
 *
 * Renders an animated SVG process flow schematic for the active treatment site.
 * Particles flow left-to-right, colour-shifting as contaminants are removed.
 *
 * Architecture:
 *   — JSX renders static stage layout (re-renders only on site change)
 *   — Imperative refs drive all RAF animation (no setState in hot path)
 *   — RAF loop is ProcessFlow-owned, independent of Globe RAF (ST-5A-07e)
 *   — Particle pool pre-allocated on mount; NEVER grows during runtime (SENTINEL)
 *
 * C2: RA_POLISH conditional resolved from raw_water.ra226_BqL > RA226_POLISHING_THRESHOLD_BQL
 *     — no advisorFormat.js dependency (Chemistry Advisor correction).
 */

import { useRef, useEffect, useMemo } from 'react';
import InfoBadge from '../ui/InfoBadge';
import {
  TRAIN_CONFIGS,
  RA226_POLISHING_THRESHOLD_BQL,
} from './trainConfigs';
import {
  createPool,
  spawnParticle,
  releaseParticle,
  resetPool,
  destroyPool,
} from './particleEngine';
import { startRafLoop } from '../../lib/rafLoop';

// ── Layout constants ────────────────────────────────────────────────────────
const MAX_PARTICLES    = 500;
const MIN_BOX_W        = 64;   // minimum stage box width — fallback for long trains
const MAX_BOX_W        = 112;  // cap — wider than this looks oversized
const STAGE_BOX_H      = 52;
const PIPE_LEN         = 14;   // gap between stage boxes
const FLOW_Y           = 102;  // y-centre of main flow line
const MARGIN           = 14;
const SLUDGE_DROP      = 62;   // downward extent of sludge outlet pipe
const SVG_HEIGHT       = 248;
const TARGET_FILL_W    = 692;  // target SVG content width (panel 720px minus borders)

// ── Animation constants ─────────────────────────────────────────────────────
// Particle speed scales with site flow rate (L/s)
const SPEED_PER_LS         = 0.28;   // px/s per L/s of flow rate
const STAGE_SPEED_MULT     = 0.25;   // slow inside stage boxes (residence time)
const SLUDGE_VY            = 36;     // px/s downward for sludge particles
const SPAWN_RATE           = 9.0;    // particles to spawn per second
const SLUDGE_FRACTION      = 0.15;   // ~15% diverted at each sludge stage
const SLUDGE_FRACTION_RA   = 0.05;   // ~5% for radioactive waste — trace volume (Ra-226 is Bq/L scale)

// ── IX regen constants ──────────────────────────────────────────────────────
const IX_REGEN_THRESHOLD   = 0.85;   // fill level to trigger regen cycle (ST-5A-05b)
const IX_REGEN_DURATION    = 30.0;   // seconds (ST-5A-05g)
const IX_FILL_RATE         = 0.020;  // fill units per second (loading phase)
const IX_ELUENT_COLOR      = '#7A3B10'; // brown-amber during regen (ST-5A-05f)
const IX_LOAD_COLOR        = '#1A4A6E'; // blue during loading

// ── Sludge colours ──────────────────────────────────────────────────────────
const SLUDGE_COLOR            = '#3D1C02';   // dark brown non-radioactive (ST-5A-02f)
const SLUDGE_RADIOACTIVE_COLOR = '#FF00FF';  // magenta ☢ (ST-5A-02e)

// ── Colour utilities ────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(hexA, hexB, t) {
  const a  = hexToRgb(hexA);
  const b  = hexToRgb(hexB);
  const r  = Math.round(a[0] + (b[0] - a[0]) * t);
  const g  = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

// ── Stage resolution ─────────────────────────────────────────────────────────
// C2: ra226_requires_polishing resolved directly from raw_water — no advisorFormat.js dep.
function resolveStageActive(stage, site) {
  if (!stage.conditional) return true;
  if (stage.conditionalKey === 'isRadioactiveSite') {
    return !!site.isRadioactiveSite;
  }
  if (stage.conditionalKey === 'ra226_requires_polishing') {
    return (site.raw_water?.ra226_BqL ?? 0) > RA226_POLISHING_THRESHOLD_BQL;
  }
  return true;
}

// ── Layout computation ───────────────────────────────────────────────────────
// Returns { items[], svgW, totalRight, boxW, labelFontSize }
// Box width is computed dynamically to fill TARGET_FILL_W for short trains,
// clamped to MIN_BOX_W for long trains (which then scroll horizontally).
// Parallel stages (SLUDGE_HANDLING) are excluded from the sequential layout.
function computeLayout(stages) {
  const seq = stages.filter(s => !s.isParallel);
  const n   = seq.length;

  // Dynamic box width: expand to fill panel, cap at MAX_BOX_W, floor at MIN_BOX_W
  const usable  = TARGET_FILL_W - 2 * MARGIN;
  const rawBoxW = (usable - (n - 1) * PIPE_LEN) / n;
  const boxW    = Math.round(Math.max(MIN_BOX_W, Math.min(MAX_BOX_W, rawBoxW)));

  const svgW = MARGIN * 2 + n * boxW + (n - 1) * PIPE_LEN;

  const items = seq.map((s, i) => {
    const x = MARGIN + i * (boxW + PIPE_LEN);
    return {
      ...s,
      idx:       i,
      x,
      y:         FLOW_Y - STAGE_BOX_H / 2,
      cx:        x + boxW / 2,
      cy:        FLOW_Y,
      rightEdge: x + boxW,
      boxW,
    };
  });

  // Font size scales with box width, capped at 11px
  const labelFontSize = Math.min(11, Math.round(8 * boxW / MIN_BOX_W));

  return {
    items,
    svgW,
    totalRight:    items.length > 0 ? items[items.length - 1].rightEdge : MARGIN,
    boxW,
    labelFontSize,
  };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ProcessFlow({ selectedSite, af2Active = false }) {
  // DOM refs
  const svgRef           = useRef(null);
  const particleLayerRef = useRef(null);

  // Animation state refs (never trigger re-renders)
  const poolRef            = useRef(null);
  const particlesRef       = useRef([]);
  const layoutRef          = useRef({ items: [], svgW: 400, totalRight: 0 });
  const stopLoopRef        = useRef(null);
  const lastTsRef          = useRef(null);
  const spawnAccRef        = useRef(0);

  // IX regen refs (LI-IX only)
  const ixLoadingRef       = useRef(0);    // 0..1
  const ixRegenRef         = useRef(false);
  const ixRegenElapsedRef  = useRef(0);
  const ixFillElRef        = useRef(null); // <rect> fill indicator
  const ixColourElRef      = useRef(null); // <rect> IX column background
  const ixLabelElRef       = useRef(null); // "REGEN" text element

  // Warm-start flag: set true on site load so the first RAF tick pre-seeds
  // particles across all stages rather than waiting for them to travel from stage 0.
  const needsWarmStartRef  = useRef(false);

  // Stable ref to selectedSite — avoids stale closure in RAF loop
  const siteRef = useRef(selectedSite);
  useEffect(() => { siteRef.current = selectedSite; }, [selectedSite]);

  // ── Derived data (memoised) ───────────────────────────────────────────────
  const trainConfig = useMemo(() => {
    if (!selectedSite) return null;
    return TRAIN_CONFIGS[selectedSite.treatment_train] ?? null;
  }, [selectedSite]);

  const layout = useMemo(() => {
    if (!trainConfig) return { items: [], svgW: 400, totalRight: 0, boxW: MIN_BOX_W, labelFontSize: 8 };
    return computeLayout(trainConfig.stages);
  }, [trainConfig]);

  // ── Site / train switch effect ────────────────────────────────────────────
  // Runs when layout changes (which changes whenever selectedSite changes train).
  // Resets all particle state cleanly before new animation begins (ST-5A-03d).
  useEffect(() => {
    layoutRef.current = layout;

    if (poolRef.current) resetPool(poolRef.current);
    particlesRef.current    = [];
    spawnAccRef.current     = 0;
    needsWarmStartRef.current = true;  // trigger pre-seed on next RAF tick

    // Reset IX regen state
    ixLoadingRef.current      = 0;
    ixRegenRef.current        = false;
    ixRegenElapsedRef.current = 0;
    // Reset visual IX elements if present
    if (ixFillElRef.current) {
      ixFillElRef.current.setAttribute('height', '0');
      ixFillElRef.current.setAttribute('y', String(FLOW_Y + STAGE_BOX_H / 2));
    }
    if (ixColourElRef.current) {
      ixColourElRef.current.setAttribute('fill', IX_LOAD_COLOR);
    }
    if (ixLabelElRef.current) {
      ixLabelElRef.current.setAttribute('visibility', 'hidden');
    }
  }, [layout]);

  // ── Pool lifecycle ────────────────────────────────────────────────────────
  // Created once on mount if the SVG layer is already in the DOM.
  // If not (no site selected on first render → SVG not rendered yet), the RAF
  // tick creates the pool lazily the first frame the layer becomes available.
  useEffect(() => {
    const layer = particleLayerRef.current;
    if (layer) {
      poolRef.current = createPool(layer, MAX_PARTICLES);
    }

    return () => {
      // Stop RAF before destroying pool (ST-5A-07a, ST-5A-09a)
      if (stopLoopRef.current) {
        stopLoopRef.current();
        stopLoopRef.current = null;
      }
      // Use poolRef.current — pool may have been created lazily in tick()
      if (poolRef.current) {
        destroyPool(poolRef.current);
        poolRef.current = null;
      }
      particlesRef.current = [];
    };
  }, []); // mount/unmount only

  // ── RAF animation loop ────────────────────────────────────────────────────
  // Single loop registered once on mount — never re-registered (ST-5A-07b).
  // Reads from refs on every tick to stay current without stale closures.
  useEffect(() => {
    function tick(timestamp) {
      // Delta — clamped to 50ms to avoid large jumps after tab comes back (ST-5A-07c)
      if (lastTsRef.current === null) lastTsRef.current = timestamp;
      const delta = Math.min((timestamp - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = timestamp;

      const site   = siteRef.current;
      const layout = layoutRef.current;
      const { items } = layout;

      // Lazy pool creation — SVG <g> not in DOM at mount when no site is pre-selected
      if (!poolRef.current && particleLayerRef.current) {
        poolRef.current = createPool(particleLayerRef.current, MAX_PARTICLES);
      }
      const pool = poolRef.current;

      if (site && pool && items.length > 0) {
        // Warm-start: pre-seed particles distributed across all stages so all
        // boxes are visually populated immediately on site load (no ~44s fill lag).
        if (needsWarmStartRef.current) {
          needsWarmStartRef.current = false;
          const WARM_PER_STAGE = 8;
          for (let si = 0; si < items.length; si++) {
            const stage = items[si];
            for (let pi = 0; pi < WARM_PER_STAGE; pi++) {
              const wx = stage.x + Math.random() * stage.boxW;
              const wy = FLOW_Y + (Math.random() - 0.5) * 3;
              const wh = spawnParticle(pool, wx, wy, stage.colorIn);
              if (!wh) break;
              particlesRef.current.push({
                handle: wh, x: wx, y: wy,
                stageIdx: si,
                sludge: false,
                sludgeDivertedAtIdx: -1,
                sludgeRadioactive:   false,
              });
            }
          }
        }

        const flowRate  = Math.max(10, site.flow_rate_nominal_Ls ?? 100);
        const baseSpeed = flowRate * SPEED_PER_LS; // px/s (ST-5A-04e)
        const isLiIx    = site.treatment_train === 'LI-IX';

        // ── IX resin loading / regen update (LI-IX only) ─────────────────
        if (isLiIx) {
          if (!ixRegenRef.current) {
            // Loading phase: fill level rises
            ixLoadingRef.current = Math.min(1.0, ixLoadingRef.current + IX_FILL_RATE * delta);

            if (ixFillElRef.current) {
              const fillH = ixLoadingRef.current * STAGE_BOX_H;
              ixFillElRef.current.setAttribute('height', fillH.toFixed(1));
              ixFillElRef.current.setAttribute('y',
                (FLOW_Y + STAGE_BOX_H / 2 - fillH).toFixed(1));
            }

            // Trigger regen at threshold (ST-5A-05b)
            if (ixLoadingRef.current >= IX_REGEN_THRESHOLD) {
              ixRegenRef.current        = true;
              ixRegenElapsedRef.current = 0;
              if (ixColourElRef.current) ixColourElRef.current.setAttribute('fill', IX_ELUENT_COLOR);
              if (ixLabelElRef.current)  ixLabelElRef.current.setAttribute('visibility', 'visible');
            }
          } else {
            // Regen phase: count down
            ixRegenElapsedRef.current += delta;

            if (ixRegenElapsedRef.current >= IX_REGEN_DURATION) {
              // End regen — reset fill and resume (ST-5A-05g/h)
              ixRegenRef.current        = false;
              ixLoadingRef.current      = 0;
              ixRegenElapsedRef.current = 0;

              if (ixFillElRef.current) {
                ixFillElRef.current.setAttribute('height', '0');
                ixFillElRef.current.setAttribute('y', String(FLOW_Y + STAGE_BOX_H / 2));
              }
              if (ixColourElRef.current) ixColourElRef.current.setAttribute('fill', IX_LOAD_COLOR);
              if (ixLabelElRef.current)  ixLabelElRef.current.setAttribute('visibility', 'hidden');
            }
          }
        }

        // ── Spawn new particles ───────────────────────────────────────────
        spawnAccRef.current += SPAWN_RATE * delta;
        while (spawnAccRef.current >= 1.0 && pool.activeCount < MAX_PARTICLES) {
          spawnAccRef.current -= 1.0;
          const first = items[0];
          if (!first) break;

          const handle = spawnParticle(
            pool,
            first.x,
            FLOW_Y + (Math.random() - 0.5) * 3,
            first.colorIn,
          );
          if (!handle) break;

          particlesRef.current.push({
            handle,
            x:            first.x,
            y:            FLOW_Y + (Math.random() - 0.5) * 3,
            stageIdx:     0,
            sludge:              false,  // true once diverted to sludge stream
            sludgeDivertedAtIdx: -1,   // stageIdx at which diversion was last evaluated (per-stage)
            sludgeRadioactive:   false, // true if diverted at a radioactive sludge stage
          });
        }

        // ── Update active particles ───────────────────────────────────────
        const toRelease = [];

        for (const p of particlesRef.current) {
          // ── Sludge particles move downward only ───────────────────────
          if (p.sludge) {
            p.y += SLUDGE_VY * delta;
            if (p.y > FLOW_Y + STAGE_BOX_H / 2 + SLUDGE_DROP + 12) {
              toRelease.push(p);
            } else {
              p.handle.el.setAttribute('cy', p.y.toFixed(1));
            }
            continue;
          }

          // ── Forward-flow particles ────────────────────────────────────
          const curStage = items[p.stageIdx];
          if (!curStage) { toRelease.push(p); continue; }

          const inBox    = p.x >= curStage.x && p.x < curStage.rightEdge;
          const prevX    = p.x;

          // IX regen: particles inside LI_IX_LOAD column reverse (ST-5A-05c)
          let dx = baseSpeed * (inBox ? STAGE_SPEED_MULT : 1.0) * delta;
          if (isLiIx && ixRegenRef.current && curStage.id === 'LI_IX_LOAD') {
            dx = -dx;
          }
          p.x += dx;

          // Advance stageIdx when particle exits stage box (forward only)
          if (dx > 0) {
            while (p.stageIdx < items.length - 1 && p.x >= items[p.stageIdx].rightEdge) {
              const next = items[p.stageIdx + 1];
              // IX bypass: during regen, skip LI_IX_LOAD+IX_REGEN stages (ST-5A-05d)
              if (isLiIx && ixRegenRef.current && next?.id === 'LI_IX_LOAD') {
                const regenIdx = items.findIndex(s => s.id === 'IX_REGEN');
                if (regenIdx >= 0) {
                  p.stageIdx = regenIdx + 1;
                  if (items[p.stageIdx]) p.x = items[p.stageIdx].x;
                } else {
                  p.stageIdx++;
                }
              } else {
                p.stageIdx++;
              }
            }
          }

          // Release particle once it clears the output end
          if (p.stageIdx >= items.length || p.x > layout.totalRight + 24) {
            toRelease.push(p);
            continue;
          }

          // ── Colour ────────────────────────────────────────────────────
          const sl = items[p.stageIdx];
          let color = sl.colorIn;
          if (sl.rightEdge > sl.x) {
            const tInStage = Math.max(0, Math.min(1, (p.x - sl.x) / (sl.rightEdge - sl.x)));
            color = lerpColor(sl.colorIn, sl.colorOut, tInStage);
          }

          // ── Sludge diversion — fires once per particle at stage midpoint ──
          // ~SLUDGE_FRACTION of particles are diverted downward at each sludge
          // stage (ST-5A-04c/d). Checked at crossing of stage midpoint.
          // Per-stage diversion check: sludgeDivertedAtIdx tracks the last stage evaluated
          // so particles can be independently diverted at every sludge-generating stage.
          if (p.sludgeDivertedAtIdx !== p.stageIdx && sl.sludgeGenerating) {
            const midX = sl.x + sl.boxW / 2;
            if (prevX < midX && p.x >= midX) {
              p.sludgeDivertedAtIdx = p.stageIdx; // one chance per stage
              const fraction = sl.sludgeRadioactive ? SLUDGE_FRACTION_RA : SLUDGE_FRACTION;
              if (Math.random() < fraction) {
                p.sludge            = true;
                p.sludgeRadioactive = sl.sludgeRadioactive;
                p.y                 = FLOW_Y + STAGE_BOX_H / 2;
                color               = sl.sludgeRadioactive ? SLUDGE_RADIOACTIVE_COLOR : SLUDGE_COLOR;
                // Larger radius so bulges protrude visibly beyond pipe strokeWidth=3
                p.handle.el.setAttribute('r', sl.sludgeRadioactive ? '4' : '6');
              }
            }
          }

          p.handle.el.setAttribute('cx',   p.x.toFixed(1));
          p.handle.el.setAttribute('cy',   p.y.toFixed(1));
          p.handle.el.setAttribute('fill', color);
        }

        // Release completed particles (batch to avoid mid-iteration mutation)
        for (const p of toRelease) {
          if (p.sludge) p.handle.el.setAttribute('r', '3.5'); // restore pool default radius
          releaseParticle(pool, p.handle);
        }
        if (toRelease.length > 0) {
          particlesRef.current = particlesRef.current.filter(p => !toRelease.includes(p));
        }
      }

    }

    lastTsRef.current = null;

    // Suspends while the tab is hidden; lastTsRef reset avoids a delta spike
    stopLoopRef.current = startRafLoop(tick, {
      onResume: () => { lastTsRef.current = null; },
    });

    return () => {
      stopLoopRef.current?.();
      stopLoopRef.current = null;
    };
  }, []); // registered once — reads via refs to stay current (ST-5A-07b)

  // ── Null / unknown-train states ───────────────────────────────────────────
  if (!selectedSite) {
    return (
      <div className="absolute right-6 top-6 w-[720px] h-[340px] bg-black/80 border border-cyan-400/20 rounded-lg flex items-center justify-center">
        <span className="text-slate-300 text-xs font-mono uppercase tracking-widest">
          Select a site
        </span>
      </div>
    );
  }

  if (!trainConfig) {
    return (
      <div className="absolute right-6 top-6 w-[720px] h-[340px] bg-black/80 border border-red-500/30 rounded-lg flex items-center justify-center">
        <span className="text-red-400 text-xs font-mono">
          Unknown treatment train: {selectedSite.treatment_train}
        </span>
      </div>
    );
  }

  // ── SVG stage layout ──────────────────────────────────────────────────────
  const { items: stages, svgW, labelFontSize } = layout;
  const isLiIxTrain = selectedSite.treatment_train === 'LI-IX';

  // Find IX stage indices for bypass path geometry
  const ixLoadIdx  = isLiIxTrain ? stages.findIndex(s => s.id === 'LI_IX_LOAD')  : -1;
  const ixRegenIdx = isLiIxTrain ? stages.findIndex(s => s.id === 'IX_REGEN')    : -1;

  return (
    <div className="absolute right-6 top-6 w-[720px] h-[340px] bg-black/85 border border-cyan-400/30 rounded-lg flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-none px-4 py-3 border-b border-cyan-400/20">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-cyan-400 text-[10px] font-mono uppercase tracking-widest mb-0.5">
              {selectedSite.site_id} — Layer 2: Process Flow
            </div>
            <div className="text-white text-sm font-semibold leading-tight">
              {trainConfig.label}
            </div>
            {selectedSite.isRadioactiveSite && (
              <div className="text-fuchsia-400 text-[10px] font-mono mt-1">
                ☢ RADIOACTIVE STREAM — CONTROLLED WASTE HANDLING
              </div>
            )}
          </div>
          <InfoBadge
            popover="bottom-left"
            plain="This shows the step-by-step process for cleaning contaminated industrial water. The moving dots represent water flowing left to right — watch their colour change from red/amber to teal as contaminants are removed at each stage."
            technical="Treatment train selected by site contamination profile. Stages: pH adjustment → chemical dosing (FeCl₃ for As, Ca(OH)₂ for Ni/Pb, BaCl₂ for Ra-226) → precipitation reaction chamber → clarifier/filter press (mandatory solids removal) → ion exchange with animated regeneration cycle → final pH correction to discharge standard (6.5–8.5). Downward particles = sludge; Ra-226 sludge flagged ☢."
          />
        </div>
      </div>

      {/* ── SVG schematic (scrollable) ── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ minHeight: SVG_HEIGHT + 24 }}>
        <svg
          ref={svgRef}
          width={svgW}
          height={SVG_HEIGHT}
          className="block mt-2"
        >
          {/* ── Pipe connectors ── */}
          {stages.map((s, i) => {
            if (i === stages.length - 1) return null;
            const next = stages[i + 1];
            if (!next) return null;
            return (
              <line
                key={`pipe-${s.id}`}
                x1={s.rightEdge} y1={FLOW_Y}
                x2={next.x}      y2={FLOW_Y}
                stroke="#1A3A5A"
                strokeWidth={5}
              />
            );
          })}

          {/* ── IX Bypass path (LI-IX only) — always rendered; ST-5A-05d ── */}
          {isLiIxTrain && ixLoadIdx >= 0 && ixRegenIdx >= 0 && (() => {
            const fromStage = stages[ixLoadIdx];
            const toStage   = stages[ixRegenIdx];
            if (!fromStage || !toStage) return null;
            const byY = FLOW_Y - STAGE_BOX_H - 20;
            return (
              <g key="ix-bypass">
                <path
                  d={[
                    `M ${fromStage.x} ${FLOW_Y - STAGE_BOX_H / 2}`,
                    `L ${fromStage.x} ${byY}`,
                    `L ${toStage.rightEdge} ${byY}`,
                    `L ${toStage.rightEdge} ${FLOW_Y - STAGE_BOX_H / 2}`,
                  ].join(' ')}
                  fill="none"
                  stroke="#7A5A10"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  opacity={0.55}
                />
                <text
                  x={(fromStage.x + toStage.rightEdge) / 2}
                  y={byY - 3}
                  textAnchor="middle"
                  fill="#7A5A10"
                  fontSize={8.5}
                  fontFamily="monospace"
                >
                  BYPASS (regen)
                </text>
              </g>
            );
          })()}

          {/* ── Stage boxes ── */}
          {stages.map((s) => {
            const isActive = resolveStageActive(s, selectedSite);
            const opacity  = isActive ? 1.0 : 0.30; // ST-5A-02b/c — dimmed, not hidden
            const isIxLoad = s.id === 'LI_IX_LOAD';
            const isIxRegen = s.id === 'IX_REGEN';

            const boxBorderColor = s.sludgeRadioactive
              ? '#DD00DD'
              : s.sludgeGenerating
                ? '#5A2A00'
                : '#1E4A6E';

            return (
              <g key={s.id} opacity={opacity}>

                {/* Stage box background */}
                <rect
                  ref={isIxLoad ? ixColourElRef : undefined}
                  x={s.x}   y={s.y}
                  width={s.boxW}
                  height={STAGE_BOX_H}
                  fill={isIxLoad ? IX_LOAD_COLOR : '#0A1A2E'}
                  stroke={boxBorderColor}
                  strokeWidth={1}
                  rx={3}
                />

                {/* IX fill level indicator — animated via ixFillElRef (ST-5A-02i) */}
                {isIxLoad && (
                  <rect
                    ref={ixFillElRef}
                    x={s.x + 2}
                    y={FLOW_Y + STAGE_BOX_H / 2}  /* starts at bottom */
                    width={s.boxW - 4}
                    height={0}
                    fill="#005577"
                    opacity={0.75}
                  />
                )}

                {/* IX regen cycle label — visibility toggled imperatively (ST-5A-05e) */}
                {isIxRegen && (
                  <text
                    ref={ixLabelElRef}
                    x={s.cx}
                    y={s.y + STAGE_BOX_H / 2 - 4}
                    textAnchor="middle"
                    fill="#CC8800"
                    fontSize={labelFontSize}
                    fontFamily="monospace"
                    fontWeight="bold"
                    visibility="hidden"
                  >
                    REGEN
                  </text>
                )}

                {/* Stage label (below box) */}
                <text
                  x={s.cx}
                  y={s.y + STAGE_BOX_H + 12}
                  textAnchor="middle"
                  fill={isActive ? '#A8D8F0' : '#2A4A58'}
                  fontSize={labelFontSize}
                  fontFamily="monospace"
                >
                  {s.label}
                </text>

                {/* Reagent label (above box) — ST-5A-02g */}
                {s.reagent && (
                  <text
                    x={s.cx}
                    y={s.y - 3}
                    textAnchor="middle"
                    fill="#5ABDA0"
                    fontSize={labelFontSize}
                    fontFamily="monospace"
                  >
                    {s.reagent}
                  </text>
                )}

                {/* R1 correction badge — HM-FULL CO₂ stage (ST-5A-02) */}
                {s.r1Correction && (
                  <text
                    x={s.x + 2} y={s.y + 10}
                    fill="#00AAFF"
                    fontSize={Math.max(7, labelFontSize - 1)}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    R1
                  </text>
                )}

                {/* R2 dual-Pb badge */}
                {s.r2DualPb && (
                  <text
                    x={s.x + 2} y={s.y + 10}
                    fill="#FF8800"
                    fontSize={Math.max(7, labelFontSize - 1)}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    R2
                  </text>
                )}

                {/* AF2 Ni pH floor alert indicator (ST-5A-02h / 6-B live wire)
                    Static amber = train has Ni precipitation stage (always shown).
                    Pulsing red  = live af2_alert_active from useTelemetry (pH < 9.2). */}
                {s.af2Alert && (
                  <g>
                    <circle
                      cx={s.rightEdge - 7} cy={s.y + 7}
                      r={5}
                      fill={af2Active ? '#EF4444' : '#DD5500'}
                    >
                      {af2Active && (
                        <animate
                          attributeName="opacity"
                          values="1;0.25;1"
                          dur="0.9s"
                          repeatCount="indefinite"
                        />
                      )}
                    </circle>
                    <text
                      x={s.rightEdge - 7} y={s.y + 10}
                      textAnchor="middle"
                      fill="white"
                      fontSize={7}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      !
                    </text>
                  </g>
                )}

                {/* Radioactive ☢ centre icon */}
                {s.sludgeRadioactive && (
                  <text
                    x={s.cx} y={s.cy + 5}
                    textAnchor="middle"
                    fill="#FF00FF"
                    fontSize={11}
                    opacity={isActive ? 0.5 : 0.15}
                  >
                    ☢
                  </text>
                )}

                {/* Sludge outlet pipe — downward from sludge-generating stages (ST-5A-02d) */}
                {s.sludgeGenerating && (
                  <g>
                    <line
                      x1={s.cx} y1={s.y + STAGE_BOX_H}
                      x2={s.cx} y2={s.y + STAGE_BOX_H + SLUDGE_DROP}
                      stroke={s.sludgeRadioactive ? SLUDGE_RADIOACTIVE_COLOR : SLUDGE_COLOR}
                      strokeWidth={3}
                      opacity={isActive ? 0.8 : 0.2}
                    />
                    <rect
                      x={s.cx - 14}
                      y={s.y + STAGE_BOX_H + SLUDGE_DROP}
                      width={28}
                      height={12}
                      fill={s.sludgeRadioactive ? '#2A0030' : '#1A0A00'}
                      stroke={s.sludgeRadioactive ? SLUDGE_RADIOACTIVE_COLOR : SLUDGE_COLOR}
                      strokeWidth={1}
                      rx={2}
                      opacity={isActive ? 0.85 : 0.2}
                    />
                    <text
                      x={s.cx}
                      y={s.y + STAGE_BOX_H + SLUDGE_DROP + 9}
                      textAnchor="middle"
                      fill={s.sludgeRadioactive ? '#FF00FF' : '#C87830'}
                      fontSize={7}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {s.sludgeRadioactive ? '☢ WASTE' : 'SLUDGE'}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Particle layer — managed imperatively by particleEngine ── */}
          <g ref={particleLayerRef} />

        </svg>
      </div>

      {/* ── Footer ── */}
      <div className="flex-none px-4 py-2 border-t border-cyan-400/20 flex justify-between items-center">
        <span className="text-slate-300 text-[10px] font-mono">
          Flow: {selectedSite.flow_rate_nominal_Ls} L/s
        </span>
        {isLiIxTrain && (
          <span className="text-amber-400 text-[10px] font-mono">
            Li recovery &gt;90% (multi-cycle)
          </span>
        )}
        <span className="text-slate-400 text-[10px] font-mono">
          {selectedSite.country}
        </span>
      </div>

    </div>
  );
}
