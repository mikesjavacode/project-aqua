/**
 * MODULE 3-A — Three.js Globe Core
 * PROJECT AQUA | March 11, 2026
 *
 * Spec: PHASE3_MODULE3A_TEST_SPECS.md
 * Chemistry isolation: APPROVED (no chemistry data, no unit strings, no ContaminantProfile)
 * Software spec: APPROVED — 58 tests, pre-build checklist complete
 *
 * SENTINEL MEMORY RULE:
 *   Every geometry and material created MUST be disposed on unmount.
 *   The RAF loop MUST be stopped before renderer.dispose() (ST-3A-04m).
 *   RAF handle stored in useRef, never useState (ST-3A-03b).
 *   Resize handler stored as named ref to allow proper removeEventListener (ST-3A-05b).
 */

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { startRafLoop } from '../../lib/rafLoop';

// ---------------------------------------------------------------------------
// Constants — all visual parameters externally configurable via props
// (satisfies CA-3A-BC-05: no hardcoded visual properties)
// ---------------------------------------------------------------------------
const DEFAULT_CONFIG = {
  fov: 45,
  near: 0.1,
  far: 1000,
  cameraZ: 2.5,
  earthRadius: 1.0,
  atmosphereRadius: 1.02,
  earthSegments: 64,
  rotationSpeed: 0.05,   // rad/s
  starCount: 6000,
  starRadius: 80,
  maxPixelRatio: 2,
};

// ---------------------------------------------------------------------------
// GlobeScene
//
// Props:
//   config          — override any DEFAULT_CONFIG values
//   onBeforeRender  — callback fired once per RAF frame (CA-3A-BC-03)
//   onSceneReady    — called with { scene, camera, renderer } when scene is initialised
//                     (satisfies CA-3A-BC-01, CA-3A-BC-02)
//   className       — applied to the container div
// ---------------------------------------------------------------------------
export default function GlobeScene({
  config: configOverrides = {},
  onBeforeRender = null,
  onSceneReady = null,
  className = '',
}) {
  const cfg = { ...DEFAULT_CONFIG, ...configOverrides };

  const containerRef = useRef(null);

  // Three.js object refs — never useState (ST-3A-03b, ST-3A-06a)
  const rendererRef  = useRef(null);
  const sceneRef     = useRef(null);
  const cameraRef    = useRef(null);
  const clockRef     = useRef(null);
  const earthRef     = useRef(null);
  const stopLoopRef  = useRef(null);  // ST-3A-03a: single RAF handle storage

  // Dispose-tracking refs — kept to guarantee cleanup (SENTINEL MEMORY RULE)
  const geometriesRef = useRef([]);
  const materialsRef  = useRef([]);
  const texturesRef   = useRef([]);

  // Resize handler ref — must be a stable named reference (ST-3A-05b)
  const handleResizeRef = useRef(null);

  // ResizeObserver ref — catches the container's first real layout after CSS lands.
  const resizeObserverRef = useRef(null);

  // onBeforeRender callback ref — avoids stale closure (ST-3A-06e)
  const onBeforeRenderRef = useRef(onBeforeRender);
  useEffect(() => {
    onBeforeRenderRef.current = onBeforeRender;
  }, [onBeforeRender]);

  // ---------------------------------------------------------------------------
  // trackGeometry / trackMaterial / trackTexture
  // Register objects for guaranteed disposal (SENTINEL MEMORY RULE)
  // ---------------------------------------------------------------------------
  const trackGeometry = useCallback((g) => { geometriesRef.current.push(g); return g; }, []);
  const trackMaterial = useCallback((m) => { materialsRef.current.push(m); return m; }, []);
  const trackTexture  = useCallback((t) => { texturesRef.current.push(t); return t; }, []);

  // ---------------------------------------------------------------------------
  // buildScene — creates all Three.js objects
  // Returns { scene, camera, renderer, clock, earth }
  // ---------------------------------------------------------------------------
  const buildScene = useCallback((container) => {
    // Scene
    const scene = new THREE.Scene();

    // Camera (ST-3A-01c)
    const { clientWidth: w, clientHeight: h } = container;
    const camera = new THREE.PerspectiveCamera(cfg.fov, w / h, cfg.near, cfg.far);
    camera.position.z = cfg.cameraZ;

    // Renderer (ST-3A-01a, ST-3A-01f)
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      return null; // WebGL unavailable — caller renders fallback
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, cfg.maxPixelRatio));
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement); // ST-3A-01d

    // Clock — frame-rate-independent rotation (ST-3A-03h)
    const clock = new THREE.Clock();

    // ---- Earth ----
    const earthGeo = trackGeometry(
      new THREE.SphereGeometry(cfg.earthRadius, cfg.earthSegments, cfg.earthSegments)
    );

    // Load earth texture with error callback (ST-3A-10 checklist).
    // BASE_URL, not a leading slash: Vite rewrites bundled imports for the
    // deployment base but leaves runtime strings alone, and a bare /textures/…
    // 404s wherever the app is not served from the domain root — which drops the
    // globe to its flat fallback colour.
    const loader = new THREE.TextureLoader();
    const earthTex = trackTexture(
      loader.load(
        `${import.meta.env.BASE_URL}textures/earth.jpg`,
        undefined,
        undefined,
        () => { /* texture load failed — material falls back to colour */ }
      )
    );

    const earthMat = trackMaterial(
      new THREE.MeshPhongMaterial({
        map: earthTex,
        color: 0x2266aa,   // fallback colour if texture fails
        shininess: 15,
      })
    );

    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // ---- Atmosphere (ST-3A-02b — radius > earth radius; ST-3A-02d — AdditiveBlending) ----
    const atmosphereGeo = trackGeometry(
      new THREE.SphereGeometry(cfg.atmosphereRadius, cfg.earthSegments, cfg.earthSegments)
    );
    const atmosphereMat = trackMaterial(
      new THREE.MeshPhongMaterial({
        color: 0x0088ff,
        transparent: true,
        opacity: 0.08,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphere);

    // ---- Stars — single Points object, never individual Mesh (ST-3A-02c, ST-3A-10) ----
    const starsGeo = trackGeometry(new THREE.BufferGeometry());
    const positions = new Float32Array(cfg.starCount * 3);
    for (let i = 0; i < cfg.starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = cfg.starRadius * (0.85 + 0.15 * Math.random());
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starsMat = trackMaterial(
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, sizeAttenuation: true })
    );
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // Ambient + directional light
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    return { scene, camera, renderer, clock, earth };
  }, [cfg, trackGeometry, trackMaterial, trackTexture]);

  // ---------------------------------------------------------------------------
  // dispose — SENTINEL MEMORY RULE cleanup
  // CRITICAL ORDER (ST-3A-04m): cancelAnimationFrame BEFORE renderer.dispose()
  // ---------------------------------------------------------------------------
  const dispose = useCallback(() => {
    // 1. Stop the RAF loop first — no render calls after this (ST-3A-04m, ST-3A-03c)
    if (stopLoopRef.current !== null) {
      stopLoopRef.current();
      stopLoopRef.current = null;
    }

    // 2. Remove resize listener (ST-3A-05b)
    if (handleResizeRef.current) {
      window.removeEventListener('resize', handleResizeRef.current);
      handleResizeRef.current = null;
    }
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    // 3. Remove scene children before disposal (CA-3A-BC-04)
    if (sceneRef.current) {
      while (sceneRef.current.children.length > 0) {
        sceneRef.current.remove(sceneRef.current.children[0]);
      }
    }

    // 4. Dispose all tracked geometries (ST-3A-04a–c)
    geometriesRef.current.forEach((g) => g.dispose());
    geometriesRef.current = [];

    // 5. Dispose all tracked materials (ST-3A-04d–f)
    materialsRef.current.forEach((m) => m.dispose());
    materialsRef.current = [];

    // 6. Dispose all tracked textures (ST-3A-04g)
    texturesRef.current.forEach((t) => t.dispose());
    texturesRef.current = [];

    // 7. Dispose renderer LAST — after RAF cancelled and geometries/materials gone (ST-3A-04h)
    // Do NOT call forceContextLoss() — that is destructive (ST-3A-04l)
    if (rendererRef.current) {
      const canvas = rendererRef.current.domElement;
      rendererRef.current.dispose();
      canvas.parentNode?.removeChild(canvas); // ST-3A-04i
      rendererRef.current = null;
    }

    // 8. Null all refs (ST-3A-04j)
    sceneRef.current    = null;
    cameraRef.current   = null;
    clockRef.current    = null;
    earthRef.current    = null;
  }, []);

  // ---------------------------------------------------------------------------
  // Main effect — mount/unmount lifecycle
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Build scene
    const result = buildScene(container);
    if (!result) return; // WebGL unavailable

    const { scene, camera, renderer, clock, earth } = result;
    sceneRef.current   = scene;
    cameraRef.current  = camera;
    rendererRef.current = renderer;
    clockRef.current   = clock;
    earthRef.current   = earth;

    // Resize handler — named function stored in ref (ST-3A-05a, ST-3A-05b)
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;  // pre-layout: skip until the container has real dimensions
      camera.aspect = w / h;          // ST-3A-05c
      camera.updateProjectionMatrix(); // ST-3A-05d
      renderer.setSize(w, h);          // ST-3A-05e
    };
    handleResizeRef.current = handleResize;
    window.addEventListener('resize', handleResize); // ST-3A-05a

    // Vite emits the module <script> before the <link rel=stylesheet>, and a module
    // script does not block on a following stylesheet — so the container can measure
    // 0 height on mount, and no window 'resize' fires when the CSS later lands,
    // leaving the renderer stuck at that stale 0 (a permanent black globe). A
    // ResizeObserver fires on that first real layout (and every one after).
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    resizeObserverRef.current = resizeObserver;

    // RAF loop — single, non-stacking (ST-3A-03a, ST-3A-03d), suspended while hidden
    stopLoopRef.current = startRafLoop(
      () => {
        const delta = clock.getDelta(); // ST-3A-03h: frame-rate-independent

        // External callback fires before render (CA-3A-BC-03)
        onBeforeRenderRef.current?.(delta, scene, camera);

        // Rotate globe (ST-3A-03g)
        earth.rotation.y += cfg.rotationSpeed * delta;

        // Single render call per frame (ST-3A-03f)
        renderer.render(scene, camera);
      },
      // Discard the hidden-tab interval, or the globe snaps forward on return
      { onResume: () => clock.getDelta() },
    );

    // Expose scene, camera, renderer, and earth to parent (CA-3A-BC-01, CA-3A-BC-02)
    onSceneReady?.({ scene, camera, renderer, earth });

    // Cleanup — runs before next effect or on unmount (ST-3A-06c)
    return dispose;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Empty deps: intentional — scene built once on mount.
  // Config changes do not rebuild the scene; they are handled via refs.

  // ---------------------------------------------------------------------------
  // Render — minimal: just a container div + WebGL fallback
  // No chemistry data rendered here (CA-3A-01a)
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      aria-label="PROJECT AQUA — Global Water Treatment Globe"
    >
      {/* Canvas injected by Three.js renderer — ST-3A-01d */}
      <noscript>
        <div className="flex items-center justify-center w-full h-full text-white">
          WebGL is required to view the PROJECT AQUA globe.
        </div>
      </noscript>
    </div>
  );
}
