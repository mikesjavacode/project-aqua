/**
 * MODULE 5-B — MolecularLayer (Layer 3)
 * PROJECT AQUA | March 12, 2026
 *
 * Spec: PHASE5_MODULE5B_TEST_SPECS.md — CLEARED FOR BUILD
 * Chemistry Advisor: APPROVED WITH CORRECTIONS
 *   C1: PB-AS-COPREC = feoh3_adsorb (Fe floc Pb²⁺/As⁵⁻ adsorption) — no Pb(OH)₂ nucleation
 *   Q1: Independent internal pH_sim — no useTelemetry coupling
 *   Q3: BaSO₄ scene gated on site.reagent_dose_rates.BaCl2_mgL > 0
 *
 * Canvas 2D molecular visualization. 600-particle JS object pool (no DOM elements).
 * Independent RAF loop registered once. Scenes keyed by treatment_train.
 * SENTINEL: cancelAnimationFrame on unmount; no setState after unmount.
 */

import { useRef, useEffect } from 'react';
import InfoBadge from '../ui/InfoBadge';
import { startRafLoop } from '../../lib/rafLoop';

// ── Dimensions ────────────────────────────────────────────────────────────────
const W        = 460;
const H        = 310;
const HDR_H    = 28;
const SLUDGE_H = 38;
const RXN_Y    = HDR_H;
const RXN_H    = H - HDR_H - SLUDGE_H;   // 244 px
const RXN_BOT  = RXN_Y + RXN_H;          // 272 px

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_POOL       = 600;
const PRECIP_MAX     = 200;   // ST-5B-04j: hard cap for precipitation particles
const SCENE_DUR      = 10;    // s per scene in rotation (default)
const SCENE_DUR_MAP  = { feoh3_precip: 20 };  // per-scene overrides

const BEAD_R  = 44;
const BEAD_CX = W / 2;
const BEAD_CY = RXN_Y + RXN_H / 2;

const IX_K_LOAD    = 0.10;   // logistic shape factor s⁻¹ (Thomas model)
const IX_T_HALF    = 40;     // s to 50% loading
const IX_K_REGEN   = 0.08;   // regen exponential decay s⁻¹
const IX_THRESHOLD = 0.85;   // breakthrough / regen trigger

const G_RATE_DENSE  = 0.30;  // px/s^0.5 — crystalline precipitates
const G_RATE_FLOC   = 0.20;  // px/s^0.5 — amorphous Fe(OH)₃
const K_STOKES_DENSE = 1.50; // px/(s·px²) — Ni(OH)₂, BaSO₄ (Δρ ≈ 2500 kg/m³)
const K_STOKES_FLOC  = 0.60; // px/(s·px²) — Fe(OH)₃ (Δρ ≈ 1100 kg/m³, hydrated)
const SETTLE_R_DENSE = 5;    // px — settling onset for dense precipitates
const SETTLE_R_FLOC  = 7;    // px — settling onset for floc

// Base scene lists per treatment_train — C1 applied (PB-AS-COPREC = feoh3_adsorb only)
const TRAIN_SCENES_BASE = {
  'HM-FULL':      ['feoh3_precip', 'nioh2_precip', 'baso4_coprecip'],
  'RAD-COPREC':   ['feoh3_precip', 'baso4_coprecip'],
  'NI-PRECIP':    ['nioh2_precip'],
  'PB-AS-COPREC': ['feoh3_adsorb'],   // C1: Fe floc adsorption; no Pb(OH)₂ nucleation
  'LI-IX':        ['ix_scene'],
};

// C6 (Gate 2): scene list built dynamically per site — filter baso4_coprecip when
// BaCl2_mgL === 0 so non-radioactive HM-FULL sites (SITE-001) never show a blank scene slot.
function getScenesForSite(site) {
  if (!site) return [];
  const base = TRAIN_SCENES_BASE[site.treatment_train] ?? [];
  if ((site.reagent_dose_rates?.BaCl2_mgL ?? 0) === 0) {
    return base.filter(s => s !== 'baso4_coprecip');
  }
  return base;
}

const SCENE_LABEL = {
  feoh3_precip:   'Fe(OH)₃ precipitation — As co-removal',
  feoh3_adsorb:   'Fe(OH)₃ floc — Pb²⁺ / As⁵⁻ adsorption',
  nioh2_precip:   'Ni(OH)₂ precipitation  [pH ≥ 9.5]',
  baso4_coprecip: 'BaSO₄ crystallisation — Ra²⁺ co-precipitation',
  ix_scene:       'Li⁺ selective ion exchange',
};

// Colour palette
const CLR = {
  li:'#F59E0B', na:'#64748B', hplus:'#EF4444',
  ba:'#06B6D4', so4:'#EAB308', ra226:'#D946EF', baso4:'#F1F5F9',
  nioh2:'#14B8A6', feoh3:'#B45309', fe3:'#F97316',
  pb2:'#94A3B8', as5:'#A3E635',
  ca:'#E2E8F0', oh:'#7DD3FC',
};

// ── Particle pool ─────────────────────────────────────────────────────────────
function makePart() {
  return {
    active: false, x: 0, y: 0, vx: 0, vy: 0, r: 2, alpha: 1, color: '#fff',
    type: '', state: 'free', age: 0,
    r0: 1.5, gRate: G_RATE_DENSE, kStokes: K_STOKES_DENSE,
    radioactive: false, glowTimer: 0,
    adsorbed: false, adsorbHost: -1, adsorbAng: 0,
  };
}

function createPool() { return Array.from({ length: MAX_POOL }, makePart); }

function acquire(pool) {
  for (let i = 0; i < MAX_POOL; i++) {
    if (!pool[i].active) {
      Object.assign(pool[i], makePart());
      pool[i].active = true;
      return i;
    }
  }
  return -1; // pool full
}

function resetPool(pool) { for (let i = 0; i < MAX_POOL; i++) pool[i].active = false; }

function countType(pool, type) {
  let n = 0;
  for (let i = 0; i < MAX_POOL; i++) if (pool[i].active && pool[i].type === type) n++;
  return n;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function rand(a, b) { return a + Math.random() * (b - a); }

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpClr(a, b, t) {
  const [r1, g1, b1] = hexRgb(a), [r2, g2, b2] = hexRgb(b);
  return `rgb(${~~(r1 + (r2 - r1) * t)},${~~(g1 + (g2 - g1) * t)},${~~(b1 + (b2 - b1) * t)})`;
}

function gauss(σ = 1) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-10, Math.random()))) *
         Math.cos(2 * Math.PI * Math.random()) * σ;
}

// ── Spawn helpers ─────────────────────────────────────────────────────────────
function spawnIon(pool, type, x, y, vx, vy) {
  const i = acquire(pool);
  if (i < 0) return;
  const p = pool[i];
  p.type = type; p.color = CLR[type] ?? '#aaa'; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
  p.r = (type === 'hplus' || type === 'ra226') ? 2.5 : (type === 'li') ? 3 : 4;
}

function spawnNucleus(pool, type) {
  if (countType(pool, type) >= PRECIP_MAX) return;
  const i = acquire(pool);
  if (i < 0) return;
  const p = pool[i];
  p.type = type; p.color = CLR[type]; p.state = 'growing';
  p.x = rand(40, W - 40); p.y = rand(RXN_Y + 30, RXN_BOT - 40);
  p.vx = rand(-6, 6); p.vy = rand(-3, 3);
  p.r = 1.5; p.r0 = 1.5; p.age = 0;
  p.gRate   = (type === 'feoh3') ? G_RATE_FLOC    : G_RATE_DENSE;
  p.kStokes = (type === 'feoh3') ? K_STOKES_FLOC  : K_STOKES_DENSE;
}

// ── IX scene ──────────────────────────────────────────────────────────────────
function tickIxScene(pool, ix, sp, dt) {
  ix.t_cycle += dt;

  if (ix.phase === 'loading') {
    // Thomas model logistic saturation curve (CC-5B-01a/b/c)
    ix.theta = 1 / (1 + Math.exp(-IX_K_LOAD * (ix.t_cycle - IX_T_HALF)));
    if (ix.theta >= IX_THRESHOLD) {
      ix.phase = 'regenerating';
      ix.t_regen = 0;
      // Detach bound Li⁺ → move toward concentrate (left) (CC-5B-01g)
      for (let i = 0; i < MAX_POOL; i++) {
        const p = pool[i];
        if (p.active && p.type === 'li' && p.state === 'bound') {
          p.state = 'free'; p.vx = rand(-55, -35); p.vy = rand(-5, 5);
        }
      }
    }
  } else {
    ix.t_regen += dt;
    // Exponential decay: θ → ≤0.10 in 30 s (CC-5B-01f)
    ix.theta = Math.max(0.02, ix.theta * Math.exp(-IX_K_REGEN * dt));
    if (ix.theta <= 0.10) { ix.phase = 'loading'; ix.t_cycle = 0; }
  }

  // Spawn Li⁺ from left (4/s)
  sp.li = (sp.li ?? 0) + dt;
  if (sp.li >= 0.25) {
    sp.li = 0;
    spawnIon(pool, 'li', rand(0, 15), rand(RXN_Y + 10, RXN_BOT - 10), rand(38, 58), rand(-6, 6));
  }

  // Spawn Na⁺ competing ions (2/s)
  sp.na = (sp.na ?? 0) + dt;
  if (sp.na >= 0.50) {
    sp.na = 0;
    spawnIon(pool, 'na', rand(0, 15), rand(RXN_Y + 10, RXN_BOT - 10), rand(30, 45), rand(-5, 5));
  }

  // Spawn H⁺ eluent from right during regen (8/s) (CC-5B-01g)
  if (ix.phase === 'regenerating') {
    sp.h = (sp.h ?? 0) + dt;
    if (sp.h >= 0.12) {
      sp.h = 0;
      spawnIon(pool, 'hplus', rand(W - 15, W), rand(RXN_Y + 10, RXN_BOT - 10), rand(-70, -50), rand(-5, 5));
    }
  }

  // Update IX ions
  for (let i = 0; i < MAX_POOL; i++) {
    const p = pool[i];
    if (!p.active) continue;
    if (p.type !== 'li' && p.type !== 'na' && p.type !== 'hplus') continue;
    if (p.state === 'bound') continue;

    p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt;

    const dx = p.x - BEAD_CX, dy = p.y - BEAD_CY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (p.type === 'li') {
      if (dist < BEAD_R + p.r + 2 && ix.phase === 'loading') {
        // Bind probability drops at breakthrough (CC-5B-01d/e)
        const bindP = ix.theta < IX_THRESHOLD
          ? 0.95
          : 0.95 * Math.sqrt(Math.max(0, 1 - ix.theta) / (1 - IX_THRESHOLD));
        if (Math.random() < bindP) {
          p.state = 'bound'; p.vx = 0; p.vy = 0;
          const ang = Math.atan2(dy, dx);
          p.x = BEAD_CX + Math.cos(ang) * BEAD_R;
          p.y = BEAD_CY + Math.sin(ang) * BEAD_R;
        }
      }
    } else if (p.type === 'na') {
      // Na⁺ deflects — cannot bind (lattice size exclusion)
      if (dist < BEAD_R + p.r + 2 && p.vx > 0) {
        p.vx = -Math.abs(p.vx) * 0.7;
        p.vy += gauss(8) * dt;
      }
    } else {
      // H⁺ absorbed by bead during regen
      if (dist < BEAD_R + p.r + 2) p.active = false;
    }

    if (p.x < -25 || p.x > W + 25 || p.y < RXN_Y - 10 || p.y > RXN_BOT + 10 || p.age > 8) {
      p.active = false;
    }
  }
}

// ── Precipitation scene (feoh3_precip, nioh2_precip) ─────────────────────────
function tickPrecipScene(pool, type, precip, sp, dt) {
  precip.timer += dt;

  // Phase 0 (0–1.5 s): reagent ions diffuse, no crystals (CC-5B-02a)
  if (precip.timer < 1.5) {
    sp.rg = (sp.rg ?? 0) + dt;
    if (sp.rg >= 0.33) {
      sp.rg = 0;
      spawnIon(pool, type === 'feoh3' ? 'fe3' : 'ca', rand(10, W - 10), RXN_Y + 5, rand(-20, 20), rand(8, 20));
      spawnIon(pool, 'oh', rand(10, W - 10), RXN_Y + 5, rand(-20, 20), rand(8, 20));
    }
  }

  // Phase 1 (1.5–3.0 s): nucleation burst 5–15 nuclei (CC-5B-02b/c)
  if (precip.timer >= 1.5 && !precip.nucleationDone) {
    precip.nucleationDone = true;
    const n = Math.floor(rand(5, 15));
    for (let k = 0; k < n; k++) spawnNucleus(pool, type);
  }

  // Phase 2 (3 s+): adsorbing species for Fe(OH)₃ scenes
  // Spawn distributed throughout reaction zone (Brownian — not just top rail) so
  // lower floc particles receive equal exposure. (fix: sludge_accumulation isolated floc)
  if (precip.timer >= 3.0 && type === 'feoh3') {
    sp.as5 = (sp.as5 ?? 0) + dt;
    if (sp.as5 >= 0.50) {
      sp.as5 = 0;
      spawnIon(pool, 'as5', rand(0, W), rand(RXN_Y + 5, RXN_BOT - 15), rand(-10, 10), rand(-10, 10));
    }
  }

  tickReagentIons(pool, dt);
  tickPrecipParticles(pool, type, dt);
  tickAdsorbing(pool, dt);
}

// feoh3_adsorb (C1 correction): Fe floc + Pb²⁺ AND As⁵⁻ adsorption — no Pb(OH)₂ nucleation
// CC-5B-04d: PB-AS-COPREC never shows Pb(OH)₂ nucleation
function tickAdsorpScene(pool, precip, sp, dt) {
  tickPrecipScene(pool, 'feoh3', precip, sp, dt);
  // Additionally spawn Pb²⁺ adsorbing ions (Q2 ruling: both species adsorb onto floc)
  if (precip.timer >= 3.0) {
    sp.pb2 = (sp.pb2 ?? 0) + dt;
    if (sp.pb2 >= 0.60) {
      sp.pb2 = 0;
      spawnIon(pool, 'pb2', rand(0, W), rand(RXN_Y + 5, RXN_BOT - 15), rand(-10, 10), rand(-10, 10));
    }
  }
}

// ── BaSO₄ / Ra²⁺ co-precipitation scene ──────────────────────────────────────
function tickBaso4Scene(pool, site, precip, sp, dt) {
  precip.timer += dt;
  const hasRa = (site?.raw_water?.ra226_BqL ?? 0) > 0;

  // Spawn Ba²⁺ (3/s)
  sp.ba = (sp.ba ?? 0) + dt;
  if (sp.ba >= 0.33) {
    sp.ba = 0;
    spawnIon(pool, 'ba', rand(0, 25), rand(RXN_Y + 10, RXN_BOT - 10), rand(28, 42), rand(-10, 10));
  }

  // Spawn SO₄²⁻ (3/s)
  sp.so4 = (sp.so4 ?? 0) + dt;
  if (sp.so4 >= 0.33) {
    sp.so4 = 0;
    spawnIon(pool, 'so4', rand(0, 25), rand(RXN_Y + 10, RXN_BOT - 10), rand(28, 42), rand(-10, 10));
  }

  // Spawn Ra²⁺ trace (0.5/s) — only when site has Ra (CC-5B-05i)
  if (hasRa) {
    sp.ra = (sp.ra ?? 0) + dt;
    if (sp.ra >= 2.0) {
      sp.ra = 0;
      spawnIon(pool, 'ra226', rand(0, 25), rand(RXN_Y + 10, RXN_BOT - 10), rand(18, 32), rand(-8, 8));
    }
  }

  // Ba²⁺ + SO₄²⁻ collision → BaSO₄ nucleus (CC-5B-03a: requires both species)
  for (let i = 0; i < MAX_POOL; i++) {
    const p = pool[i];
    if (!p.active || (p.type !== 'ba' && p.type !== 'so4')) continue;

    p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt;
    p.vy += gauss(3) * dt; // Brownian diffusion

    const other = p.type === 'ba' ? 'so4' : 'ba';
    let collided = false;
    for (let j = i + 1; j < MAX_POOL; j++) {
      const q = pool[j];
      if (!q.active || q.type !== other) continue;
      const dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < p.r + q.r + 1) {
        const cx = (p.x + q.x) / 2, cy = (p.y + q.y) / 2;
        p.active = false; q.active = false; collided = true;
        if (countType(pool, 'baso4') < PRECIP_MAX) {
          const ki = acquire(pool);
          if (ki >= 0) {
            const c = pool[ki];
            c.type = 'baso4'; c.color = CLR.baso4;
            c.x = cx; c.y = cy; c.vx = rand(-5, 5); c.vy = rand(-3, 3);
            c.r = 3; c.r0 = 3; c.gRate = G_RATE_DENSE; c.kStokes = K_STOKES_DENSE;
            c.state = 'growing'; c.age = 0;
          }
        }
        break;
      }
    }
    if (!collided && (p.x > W + 15 || p.age > 12)) p.active = false;
  }

  // BaSO₄ crystal growth + Stokes settling
  for (let i = 0; i < MAX_POOL; i++) {
    const p = pool[i];
    if (!p.active || p.type !== 'baso4') continue;
    p.age += dt;
    if (p.state === 'growing') {
      p.r = Math.min(14, p.r0 + p.gRate * Math.sqrt(p.age));
      p.vx *= Math.pow(0.92, 60 * dt); p.vy *= Math.pow(0.92, 60 * dt);
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.r >= 5) p.state = 'settling';
    } else {
      p.vy = p.kStokes * p.r * p.r;
      p.vx *= Math.pow(0.9, 60 * dt);
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y - p.r > RXN_BOT) p.active = false;
    }
    if (p.glowTimer > 0) p.glowTimer = Math.max(0, p.glowTimer - dt);
  }

  // Ra²⁺ → BaSO₄ incorporation (CC-5B-03b/c/d — isomorphous substitution)
  if (hasRa) {
    for (let i = 0; i < MAX_POOL; i++) {
      const p = pool[i];
      if (!p.active || p.type !== 'ra226') continue;
      p.age += dt;

      if (p.state !== 'fading') {
        p.x += p.vx * dt; p.y += p.vy * dt;

        // Find nearest BaSO₄ crystal (CC-5B-03b: Ra²⁺ ONLY targets BaSO₄)
        let nearDist = Infinity, nearIdx = -1;
        for (let j = 0; j < MAX_POOL; j++) {
          const q = pool[j];
          if (!q.active || q.type !== 'baso4') continue;
          const dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < nearDist) { nearDist = d; nearIdx = j; }
        }

        if (nearIdx >= 0) {
          const q = pool[nearIdx];
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          if (nearDist < q.r + 20) {
            p.vx += (dx / d) * 35 * dt; p.vy += (dy / d) * 35 * dt;
          }
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (spd > 45) { p.vx = p.vx / spd * 45; p.vy = p.vy / spd * 45; }

          if (nearDist < q.r + p.r) {
            // Begin incorporation — Ra²⁺ merges into crystal lattice (CC-5B-03c)
            p.state = 'fading';
            p.adsorbHost = nearIdx;
          }
        }
      } else {
        // Alpha fade — Ra²⁺ disappears into crystal body (CC-5B-03c)
        p.alpha -= dt / 0.5;
        if (p.alpha <= 0) {
          p.active = false;
          // Activate radioactive glow on host crystal (CC-5B-03d)
          if (p.adsorbHost >= 0 && pool[p.adsorbHost]?.active) {
            pool[p.adsorbHost].radioactive = true;
            pool[p.adsorbHost].glowTimer = 0.3;
          }
        }
      }

      if (p.age > 15 || p.x > W + 15) p.active = false;
    }
  }
}

// ── Reagent ions (Ca²⁺, OH⁻, Fe³⁺) — Phase 0 drift and fade ─────────────────
function tickReagentIons(pool, dt) {
  for (let i = 0; i < MAX_POOL; i++) {
    const p = pool[i];
    if (!p.active || (p.type !== 'ca' && p.type !== 'oh' && p.type !== 'fe3')) continue;
    p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt;
    p.vy += 4 * dt; // gentle downward drift
    if (p.age > 3 || p.y > RXN_BOT) p.active = false;
  }
}

// ── Precipitation particle physics (nucleation, growth, aggregation, settling) ─
function tickPrecipParticles(pool, type, dt) {
  const settleR = type === 'feoh3' ? SETTLE_R_FLOC : SETTLE_R_DENSE;
  for (let i = 0; i < MAX_POOL; i++) {
    const p = pool[i];
    if (!p.active || p.type !== type) continue;
    p.age += dt;

    if (p.state === 'growing') {
      // Parabolic growth — diffusion-limited (CC-5B-02d)
      p.r = Math.min(14, p.r0 + p.gRate * Math.sqrt(p.age));
      p.vx *= Math.pow(0.95, 60 * dt); p.vy *= Math.pow(0.95, 60 * dt);
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.r >= settleR) p.state = 'settling';

      // Aggregation — volume conservation (CC-5B-02e)
      for (let j = i + 1; j < MAX_POOL; j++) {
        const q = pool[j];
        if (!q.active || q.type !== type || q.state === 'settling') continue;
        const dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < p.r + q.r) {
          p.r = Math.min(14, Math.sqrt(p.r * p.r + q.r * q.r)); // r = √(r₁²+r₂²)
          q.active = false;
          if (p.r >= settleR) p.state = 'settling';
          break;
        }
      }
    } else if (p.state === 'settling') {
      // Stokes' law: v ∝ r² (CC-5B-02f/g)
      p.vy = p.kStokes * p.r * p.r;
      p.vx *= Math.pow(0.9, 60 * dt);
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y - p.r > RXN_BOT) p.active = false; // enters sludge zone
    }
  }
}

// ── Adsorbing ions (As⁵⁻, Pb²⁺) — drift toward and bind Fe(OH)₃ floc ─────────
function tickAdsorbing(pool, dt) {
  for (let i = 0; i < MAX_POOL; i++) {
    const p = pool[i];
    if (!p.active || (p.type !== 'as5' && p.type !== 'pb2')) continue;

    if (p.adsorbed) {
      const host = pool[p.adsorbHost];
      if (!host?.active) { p.active = false; continue; }
      // Follow host (settling floc carries adsorbed species)
      p.x = host.x + Math.cos(p.adsorbAng) * (host.r + p.r * 0.5);
      p.y = host.y + Math.sin(p.adsorbAng) * (host.r + p.r * 0.5);
      continue;
    }

    p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt;

    // Find nearest Fe(OH)₃ floc particle
    let nearDist = Infinity, nearIdx = -1;
    for (let j = 0; j < MAX_POOL; j++) {
      const q = pool[j];
      if (!q.active || q.type !== 'feoh3') continue;
      const dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < nearDist) { nearDist = d; nearIdx = j; }
    }

    if (nearIdx >= 0) {
      const q = pool[nearIdx];
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      p.vx += (dx / d) * 22 * dt; p.vy += (dy / d) * 22 * dt;
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > 32) { p.vx = p.vx / spd * 32; p.vy = p.vy / spd * 32; }
      if (nearDist < q.r + p.r) {
        p.adsorbed = true; p.adsorbHost = nearIdx;
        p.adsorbAng = Math.atan2(p.y - q.y, p.x - q.x);
        p.vx = 0; p.vy = 0;
      }
    }

    if (p.age > 12 || p.x < -10 || p.x > W + 10 || p.y > H + 10) p.active = false;
  }
}

// ── Scene dispatcher ──────────────────────────────────────────────────────────
function tickScene(pool, site, sim, dt) {
  const sc = sim.scenes[sim.sceneIdx];
  sim.sceneTimer += dt;

  // Advance scene rotation
  const sceneDur = SCENE_DUR_MAP[sc] ?? SCENE_DUR;
  if (sim.sceneTimer >= sceneDur && sim.scenes.length > 1) {
    sim.sceneIdx = (sim.sceneIdx + 1) % sim.scenes.length;
    sim.sceneTimer = 0;
    sim.precip = { timer: 0, nucleationDone: false };
    sim.spawnTimers = {};
    // Clear precipitation/ion particles; preserve IX ions across scene switch
    for (let i = 0; i < MAX_POOL; i++) {
      const p = pool[i];
      if (p.active && p.type !== 'li' && p.type !== 'na' && p.type !== 'hplus') {
        p.active = false;
      }
    }
  }

  switch (sc) {
    case 'ix_scene':
      tickIxScene(pool, sim.ix, sim.spawnTimers, dt);
      break;
    case 'nioh2_precip':
      tickPrecipScene(pool, 'nioh2', sim.precip, sim.spawnTimers, dt);
      break;
    case 'feoh3_precip':
      tickPrecipScene(pool, 'feoh3', sim.precip, sim.spawnTimers, dt);
      break;
    case 'feoh3_adsorb':
      // C1: PB-AS-COPREC — Fe floc with Pb²⁺ + As⁵⁻ adsorption; no Pb(OH)₂ nucleation
      tickAdsorpScene(pool, sim.precip, sim.spawnTimers, dt);
      break;
    case 'baso4_coprecip':
      // Q3: gated on BaCl₂ > 0 (CC-5B-03e/ST-5B-05h)
      if ((site?.reagent_dose_rates?.BaCl2_mgL ?? 0) > 0) {
        tickBaso4Scene(pool, site, sim.precip, sim.spawnTimers, dt);
      }
      break;
    default:
      break;
  }
}

// ── Drawing ───────────────────────────────────────────────────────────────────
function drawFrame(ctx, pool, sim, site) {
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, W, H);

  // Reaction zone border
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
  ctx.strokeRect(0.5, RXN_Y + 0.5, W - 1, RXN_H - 1);

  // Sludge accumulation zone
  const isRa = site?.isRadioactiveSite;
  ctx.fillStyle = isRa ? '#2d0a2e' : '#0a0f1a';
  ctx.fillRect(0, RXN_BOT, W, SLUDGE_H);
  ctx.strokeStyle = isRa ? '#7e22ce44' : '#1e293b66';
  ctx.strokeRect(0.5, RXN_BOT + 0.5, W - 1, SLUDGE_H - 1);
  ctx.fillStyle = isRa ? '#d946ef' : '#94a3b8';
  ctx.font = '10px monospace'; ctx.textAlign = 'center';
  ctx.fillText(isRa ? '☢  radioactive sludge' : 'sludge accumulation', W / 2, RXN_BOT + 22);

  const sc = sim.scenes[sim.sceneIdx];

  // IX resin bead
  if (sc === 'ix_scene') {
    const theta = sim.ix.theta;
    const beadFill = lerpClr('#1e293b', '#F59E0B', theta);

    ctx.beginPath(); ctx.arc(BEAD_CX, BEAD_CY, BEAD_R, 0, Math.PI * 2);
    ctx.fillStyle = beadFill; ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.stroke();

    // Theta label
    ctx.fillStyle = '#94a3b8'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`θ = ${theta.toFixed(2)}  [${sim.ix.phase}]`, BEAD_CX, BEAD_CY + BEAD_R + 12);

    // Breakthrough ring
    if (theta >= IX_THRESHOLD) {
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.arc(BEAD_CX, BEAD_CY, BEAD_R + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Particles
  for (let i = 0; i < MAX_POOL; i++) {
    const p = pool[i];
    if (!p.active) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

    if (p.type === 'baso4') {
      // Angular crystal — rotated square (cubic lattice hint)
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4);
      if (p.radioactive && p.glowTimer > 0) {
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 8 * (p.glowTimer / 0.3);
      }
      const s = p.r * 0.9;
      ctx.fillStyle = p.color;
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if (p.type === 'feoh3') {
      // Slightly irregular floc — ellipse with rotation varying by age
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.82, p.age * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
    } else if (p.type === 'so4') {
      // Elongated (tetrahedral SO₄²⁻ hint)
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.58, Math.PI * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Header bar
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, HDR_H);
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, HDR_H - 0.5); ctx.lineTo(W, HDR_H - 0.5); ctx.stroke();

  ctx.fillStyle = '#e2e8f0'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
  ctx.fillText(SCENE_LABEL[sc] ?? '', 6, HDR_H - 7);

  // Scene rotation dots
  if (sim.scenes.length > 1) {
    sim.scenes.forEach((_, k) => {
      ctx.beginPath();
      ctx.arc(W - 8 - (sim.scenes.length - 1 - k) * 10, HDR_H / 2, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = k === sim.sceneIdx ? '#22d3ee' : '#475569';
      ctx.fill();
    });
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MolecularLayer({ selectedSite }) {
  const canvasRef  = useRef(null);
  const poolRef    = useRef(null);
  const stopLoopRef = useRef(null);
  const lastTRef   = useRef(null);
  const mountedRef = useRef(false);
  const siteRef    = useRef(null);
  const simRef     = useRef({
    scenes: [], sceneIdx: 0, sceneTimer: 0,
    ix: { theta: 0, t_cycle: 0, phase: 'loading', t_regen: 0 },
    precip: { timer: 0, nucleationDone: false },
    spawnTimers: {},
  });

  // Mounted guard (ST-5B-07c)
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Keep site ref current for RAF (no stale closure)
  useEffect(() => { siteRef.current = selectedSite; }, [selectedSite]);

  // Site change → reset simulation state (ST-5B-02a/b/c/d/e)
  useEffect(() => {
    if (!poolRef.current) return;
    resetPool(poolRef.current);
    const scenes = getScenesForSite(selectedSite);
    simRef.current = {
      scenes, sceneIdx: 0, sceneTimer: 0,
      ix: { theta: 0, t_cycle: 0, phase: 'loading', t_regen: 0 },
      precip: { timer: 0, nucleationDone: false },
      spawnTimers: {},
    };
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, W, H);
  }, [selectedSite]);

  // Pool + RAF — registered once, never stacked (ST-5B-07d)
  useEffect(() => {
    poolRef.current = createPool();
    // Seed scene list for initial site (if already set before this effect runs)
    simRef.current.scenes = getScenesForSite(siteRef.current);

    function tick(ts) {
      if (!mountedRef.current) return;
      const dt = lastTRef.current === null ? 0.016 : Math.min(0.05, (ts - lastTRef.current) / 1000);
      lastTRef.current = ts;

      const canvas = canvasRef.current;
      const pool   = poolRef.current;
      const site   = siteRef.current;
      if (canvas && pool && site) {
        tickScene(pool, site, simRef.current, dt);
        drawFrame(canvas.getContext('2d'), pool, simRef.current, site);
      }
    }

    // Suspends while the tab is hidden; lastTRef reset keeps dt sane on return
    stopLoopRef.current = startRafLoop(tick, {
      onResume: () => { lastTRef.current = null; },
    });

    return () => {
      stopLoopRef.current?.();
      stopLoopRef.current = null;
      lastTRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) canvas.getContext('2d').clearRect(0, 0, W, H);
    };
  }, []); // [] — registered once (ST-5B-07d)

  if (!selectedSite) return null;

  return (
    <div
      className="absolute bottom-24"
      style={{ left: 350, width: W + 2 }}
    >
      {/* Canvas clipped to rounded corners separately so badge can sit outside */}
      <div className="bg-black/85 border border-cyan-400/30 rounded-lg overflow-hidden">
        <canvas ref={canvasRef} width={W} height={H} className="block" />
      </div>
      {/* Info badge — top-right corner, outside overflow-hidden so popover isn't clipped */}
      <div className="absolute top-1 right-1">
        <InfoBadge
          popover="bottom-left"
          plain="A close-up of what's happening at the microscopic level — showing individual ions and particles being captured and removed from the water. Each site uses a different chemical removal method, visualised here."
          technical="Animates the dominant removal mechanism by treatment train: Fe(OH)₃ floc adsorption for As/Pb (PB-AS-COPREC), Ni(OH)₂ precipitation at pH 9.5–10.5 (NI-PRECIP), BaSO₄ co-precipitation for Ra-226 (RAD-COPREC/HM-FULL), or selective resin IX loading and regeneration for Li recovery (LI-IX). Particle physics approximate Stokes settling (dense vs. floc); IX kinetics follow Thomas model with θ saturation curve."
        />
      </div>
    </div>
  );
}
