/**
 * MODULE 5-A — SVG Particle Pool Engine
 * PROJECT AQUA | March 12, 2026
 *
 * Spec: PHASE5_MODULE5A_TEST_SPECS.md — ST-5A-03 (SENTINEL rule)
 *
 * Pure JS — no React dependency.
 * Pre-allocates all SVG circle elements on pool creation.
 * NEVER creates new elements after mount (ST-5A-03b, SENTINEL memory rule).
 * All pool operations are O(n) worst-case; typically O(1) for spawn if
 * the pool is not highly fragmented.
 */

/**
 * createPool — pre-allocate `count` hidden SVG circle elements in svgEl.
 * Returns a pool object; caller keeps this reference for all subsequent ops.
 *
 * @param {SVGElement} svgEl  — target SVG element to append circles into
 * @param {number}     count  — pool size (MAX_PARTICLES = 500)
 * @returns {PoolObject}
 */
export function createPool(svgEl, count) {
  const circles = [];
  const inUse   = new Array(count).fill(false);

  for (let i = 0; i < count; i++) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r',          '3.5');
    c.setAttribute('cx',         '0');
    c.setAttribute('cy',         '0');
    c.setAttribute('fill',       '#009999');
    c.setAttribute('visibility', 'hidden');
    svgEl.appendChild(c);
    circles.push(c);
  }

  return {
    svgEl,
    circles,
    inUse,
    activeCount: 0,
    capacity:    count,
    // Next-free hint — linear scan starts here (soft optimisation)
    _hint: 0,
  };
}

/**
 * spawnParticle — mark a hidden circle visible and position it at (x, y).
 * Returns a handle { index, el } for later mutation/release, or null if pool full.
 * Never creates a new SVG element (ST-5A-03b).
 *
 * @param {PoolObject} pool
 * @param {number} x
 * @param {number} y
 * @param {string} color  — CSS hex colour
 * @returns {{ index: number, el: SVGCircleElement } | null}
 */
export function spawnParticle(pool, x, y, color) {
  if (pool.activeCount >= pool.capacity) return null;

  // Start scan from hint for O(1) amortised in typical usage
  const start = pool._hint;
  for (let n = 0; n < pool.capacity; n++) {
    const i = (start + n) % pool.capacity;
    if (!pool.inUse[i]) {
      pool.inUse[i]   = true;
      pool.activeCount++;
      pool._hint      = (i + 1) % pool.capacity;

      const el = pool.circles[i];
      el.setAttribute('cx',         String(x));
      el.setAttribute('cy',         String(y));
      el.setAttribute('fill',       color);
      el.setAttribute('visibility', 'visible');

      return { index: i, el };
    }
  }
  return null; // unreachable if activeCount check is correct, but safe
}

/**
 * releaseParticle — hide a particle and return it to the pool.
 * Decrements activeCount. Safe to call with null handle.
 *
 * @param {PoolObject} pool
 * @param {{ index: number, el: SVGCircleElement } | null} handle
 */
export function releaseParticle(pool, handle) {
  if (!handle) return;
  if (!pool.inUse[handle.index]) return; // guard against double-release
  pool.inUse[handle.index] = false;
  pool.activeCount--;
  handle.el.setAttribute('visibility', 'hidden');
}

/**
 * resetPool — hide all particles and reset active count to 0.
 * Used on site switch to clear the animation state (ST-5A-03d).
 *
 * @param {PoolObject} pool
 */
export function resetPool(pool) {
  for (let i = 0; i < pool.capacity; i++) {
    if (pool.inUse[i]) {
      pool.circles[i].setAttribute('visibility', 'hidden');
      pool.inUse[i] = false;
    }
  }
  pool.activeCount = 0;
  pool._hint       = 0;
}

/**
 * destroyPool — remove all circles from the SVG DOM (ST-5A-09a).
 * Called on component unmount. Pool object is unusable after this.
 *
 * @param {PoolObject} pool
 */
export function destroyPool(pool) {
  for (const c of pool.circles) {
    if (pool.svgEl.contains(c)) {
      pool.svgEl.removeChild(c);
    }
  }
  pool.circles.length = 0;
  pool.activeCount    = 0;
}
