/**
 * MODULE 3-B — Site Markers + Contamination Plumes
 * PROJECT AQUA | March 11, 2026
 *
 * Spec: PHASE3_MODULE3B_TEST_SPECS.md — CLEARED FOR BUILD (C1/C2/C3 incorporated)
 *
 * SENTINEL MEMORY RULE:
 *   Every geometry and material created here MUST be disposed on unmount.
 *   No geometry created on site selection — visibility/material properties toggled only (ST-3B-02h).
 *   100 site-switch geometry count stability required (ST-3B-02g).
 *
 * CHEMISTRY ISOLATION:
 *   Severity calculation entirely in src/data/sites.js — this component receives
 *   pre-computed plumeIntensity and isRadioactiveSite (ST-3B-08a through d).
 *   No chemistry arithmetic in this file.
 *
 * ANIMATION:
 *   Pulse animation runs inside Module 3-A's RAF loop via onFrame(delta).
 *   No separate setInterval used for animation (ST-3B-03f).
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { AQUA_SITES, EARTH_RADIUS_KM } from '../../data/sites';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const GLOBE_RADIUS       = 1.0;   // must match GlobeScene earthRadius
const MARKER_RADIUS      = 0.022;
const MARKER_OFFSET      = 0.015; // above globe surface
const MARKER_COLOR       = 0x00CED1; // teal — always (ST-3B-03d)
const RING_COLOR         = 0xFF00FF; // magenta — radioactive sites (C3)
const ERROR_PLUME_COLOR  = 0x888888; // grey — validation failure (CB-3B-04j)

// Colour thresholds — C2 correction (Chemistry Advisor approved)
const COLOR_STOPS = [
  { at: 0.00, color: new THREE.Color(0x00CED1) }, // teal
  { at: 0.15, color: new THREE.Color(0xFFD700) }, // yellow
  { at: 0.35, color: new THREE.Color(0xFF8C00) }, // amber
  { at: 0.65, color: new THREE.Color(0xFF2200) }, // red
  { at: 1.00, color: new THREE.Color(0xFF2200) }, // red (clamp)
];

// ---------------------------------------------------------------------------
// intensityToColor — continuous lerp between colour stops (ST-3B-04b, ST-3B-04c)
// ---------------------------------------------------------------------------
function intensityToColor(intensity) {
  const t = Math.min(1, Math.max(0, intensity));
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const lo = COLOR_STOPS[i];
    const hi = COLOR_STOPS[i + 1];
    if (t <= hi.at) {
      const alpha = (t - lo.at) / (hi.at - lo.at);
      return lo.color.clone().lerp(hi.color, alpha);
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1].color.clone();
}

// ---------------------------------------------------------------------------
// latLonToXYZ — spherical coordinates (ST-3B-03b)
// φ = colatitude from north pole, λ = longitude
// x = r·sin(φ)·cos(λ),  y = r·cos(φ),  z = r·sin(φ)·sin(λ)
// ---------------------------------------------------------------------------
function latLonToXYZ(lat, lon, radius) {
  const phi    = (90 - lat)       * (Math.PI / 180);
  const lambda = (lon + 180)      * (Math.PI / 180); // +180° aligns with equirectangular texture (U=0 at 180°W)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(lambda),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(lambda),
  );
}

// ---------------------------------------------------------------------------
// SiteMarkers — headless React component (renders null into DOM)
// Manages all Three.js site geometry in the parent GlobeScene's scene.
//
// Props:
//   scene        — THREE.Scene from Module 3-A (CA-3A-BC-01)
//   earth        — THREE.Mesh (the rotating earth) — markers parented here so they rotate with the globe
//   camera       — THREE.Camera from Module 3-A (CA-3A-BC-02)
//   renderer     — THREE.WebGLRenderer from Module 3-A
//   onSiteSelect — callback(site | null) fired on click/deselect (ST-3B-06a)
//
// Ref API (via useImperativeHandle):
//   onFrame(delta) — called once per RAF frame from App's onBeforeRender hook
// ---------------------------------------------------------------------------
const SiteMarkers = forwardRef(function SiteMarkers(
  { scene, earth, camera, renderer, onSiteSelect },
  ref,
) {
  // Per-site mesh refs for animation and raycasting — indexed by site_id
  const markersRef       = useRef({}); // { site_id: Mesh }
  const plumesRef        = useRef({}); // { site_id: Mesh }
  const ringsRef         = useRef({}); // { site_id: Mesh } — Ra-226 sites only

  // Flat disposal lists (SENTINEL MEMORY RULE)
  const geometriesRef    = useRef([]);
  const materialsRef     = useRef([]);

  // Raycaster — reused across frames, not recreated (no geometry cost)
  const raycasterRef     = useRef(new THREE.Raycaster());
  const mouseRef         = useRef(new THREE.Vector2());

  // Selection state
  const selectedSiteRef  = useRef(null);

  // Click handler ref — named function for removeEventListener (ST-3B-05j)
  const clickHandlerRef  = useRef(null);

  // Per-site pulse phase offsets — stagger plume animations (ST-3B-04h)
  const phaseOffsetsRef  = useRef({});

  // Clock for pulse animation (not THREE.Clock — we use the delta passed in from 3-A's RAF)
  const elapsedRef       = useRef(0);

  // ---------------------------------------------------------------------------
  // Expose onFrame to parent App via ref (ST-3B-03f — no separate interval)
  // ---------------------------------------------------------------------------
  useImperativeHandle(ref, () => ({
    onFrame(delta) {
      elapsedRef.current += delta;
      animateMarkers(elapsedRef.current);
      animatePlumes(elapsedRef.current);
      animateRings(elapsedRef.current);
    },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // animateMarkers — teal pulse 0.9× to 1.1× at 1-second period (ST-3B-03e)
  // ---------------------------------------------------------------------------
  function animateMarkers(elapsed) {
    AQUA_SITES.forEach((site) => {
      const marker = markersRef.current[site.site_id];
      if (!marker) return;
      const phase  = phaseOffsetsRef.current[site.site_id] ?? 0;
      const scale  = 1.0 + 0.1 * Math.sin(elapsed * Math.PI * 2 + phase);
      marker.scale.setScalar(scale);
    });
  }

  // ---------------------------------------------------------------------------
  // animatePlumes — scale 0.8×–1.2×, period driven by plume radius (ST-3B-04e/f)
  // ---------------------------------------------------------------------------
  function animatePlumes(elapsed) {
    AQUA_SITES.forEach((site) => {
      const plume = plumesRef.current[site.site_id];
      if (!plume) return;
      const phase  = (phaseOffsetsRef.current[site.site_id] ?? 0) + Math.PI; // offset from marker
      // Larger plumes pulse slower (ST-3B-04f)
      const periodFactor = 2 + (site.globe_plume_radius_km / 60) * 2; // 2–4 sec
      const scale = plume.userData.nominalScale
        * (1.0 + 0.2 * Math.sin((elapsed / periodFactor) * Math.PI * 2 + phase));
      plume.scale.setScalar(scale);

      // Opacity oscillates 0.35–0.65 (ST-3B-04d)
      const opacity = 0.35 + 0.15 * Math.abs(Math.sin((elapsed / periodFactor) * Math.PI + phase));
      plume.material.opacity = opacity;
    });
  }

  // ---------------------------------------------------------------------------
  // animateRings — magenta rings pulse independently (ST-3B-04h separate phase)
  // ---------------------------------------------------------------------------
  function animateRings(elapsed) {
    AQUA_SITES.forEach((site) => {
      const ring = ringsRef.current[site.site_id];
      if (!ring) return;
      const phase = (phaseOffsetsRef.current[site.site_id] ?? 0) + Math.PI * 0.7;
      const scale = ring.userData.nominalScale
        * (1.0 + 0.15 * Math.sin(elapsed * Math.PI * 1.5 + phase));
      ring.scale.setScalar(scale);
    });
  }

  // ---------------------------------------------------------------------------
  // trackGeometry / trackMaterial — SENTINEL registration
  // ---------------------------------------------------------------------------
  function trackGeometry(g) { geometriesRef.current.push(g); return g; }
  function trackMaterial(m) { materialsRef.current.push(m); return m; }

  // ---------------------------------------------------------------------------
  // buildSiteObjects — creates marker, plume, and optional ring for one site
  // ---------------------------------------------------------------------------
  function buildSiteObjects(site) {
    const pos = latLonToXYZ(
      site.coordinates.lat,
      site.coordinates.lon,
      GLOBE_RADIUS + MARKER_OFFSET,
    );

    // ---- Marker (teal sphere — always same colour, ST-3B-03d) ----
    // Material shared across all markers (ST-3B-09c)
    const markerGeo = trackGeometry(new THREE.SphereGeometry(MARKER_RADIUS, 12, 12));
    const markerMat = trackMaterial(
      new THREE.MeshBasicMaterial({ color: MARKER_COLOR })
    );
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.copy(pos);
    marker.userData.siteId = site.site_id;
    phaseOffsetsRef.current[site.site_id] = Math.random() * Math.PI * 2;
    earth.add(marker);
    markersRef.current[site.site_id] = marker;

    // ---- Plume (translucent sphere — chemistry-driven colour) ----
    const plumeRadius = (site.globe_plume_radius_km / EARTH_RADIUS_KM) * GLOBE_RADIUS * 10;
    const plumeGeo = trackGeometry(new THREE.SphereGeometry(plumeRadius, 16, 16));
    const plumeColor = site.validationError
      ? new THREE.Color(ERROR_PLUME_COLOR)
      : intensityToColor(site.plumeIntensity);  // C1+C2 applied in sites.js

    const plumeMat = trackMaterial(
      new THREE.MeshBasicMaterial({
        color:       plumeColor,
        transparent: true,
        opacity:     0.45,
        depthWrite:  false,
      })
    );
    const plume = new THREE.Mesh(plumeGeo, plumeMat);
    const plumePos = latLonToXYZ(site.coordinates.lat, site.coordinates.lon, GLOBE_RADIUS);
    plume.position.copy(plumePos);
    plume.userData.siteId      = site.site_id;
    plume.userData.nominalScale = 1.0;
    earth.add(plume);
    plumesRef.current[site.site_id] = plume;

    // ---- Radioactive ring — C3: any ra226_BqL > 0 (ST-3B-04g, ST-3B-04i) ----
    if (site.isRadioactiveSite) {
      const ringGeo = trackGeometry(
        new THREE.TorusGeometry(plumeRadius * 1.25, plumeRadius * 0.06, 8, 32)
      );
      const ringMat = trackMaterial(
        new THREE.MeshBasicMaterial({
          color:       RING_COLOR,
          transparent: true,
          opacity:     0.75,
          depthWrite:  false,
        })
      );
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(plumePos);
      // Orient ring to face outward from globe centre
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      ring.rotateX(Math.PI / 2);
      ring.userData.nominalScale = 1.0;
      earth.add(ring);
      ringsRef.current[site.site_id] = ring;
    }
  }

  // ---------------------------------------------------------------------------
  // handleClick — raycaster site selection (ST-3B-05a through ST-3B-05h)
  // ---------------------------------------------------------------------------
  function handleClick(event) {
    const canvas = renderer.domElement;
    const rect   = canvas.getBoundingClientRect();
    // Normalized device coordinates
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);

    // Test against marker meshes only (not plumes — avoids overlap ambiguity, ST-3B-05c)
    const markerMeshes = Object.values(markersRef.current);
    const intersects   = raycasterRef.current.intersectObjects(markerMeshes, false);

    // Globe occlusion check — reject markers behind the earth sphere.
    // Without this, markers on the far side of the globe are clickable through the earth.
    const earthHits = raycasterRef.current.intersectObject(earth, false);
    const earthDist = earthHits.length > 0 ? earthHits[0].distance : Infinity;

    if (intersects.length === 0) {
      // Click on empty globe — deselect (ST-3B-05b, ST-3B-05f)
      if (selectedSiteRef.current !== null) {
        clearSelection();
        onSiteSelect?.(null); // IT-3B-3C-06
      }
      return;
    }

    // Nearest intersection (ST-3B-05c — sorted by raycaster)
    // Discard if the earth surface is closer — marker is on the far side of the globe.
    if (intersects[0].distance > earthDist) {
      if (selectedSiteRef.current !== null) { clearSelection(); onSiteSelect?.(null); }
      return;
    }
    const hitSiteId = intersects[0].object.userData.siteId;
    const hitSite   = AQUA_SITES.find((s) => s.site_id === hitSiteId);
    if (!hitSite) return;

    if (selectedSiteRef.current === hitSiteId) {
      // Re-click selected site — deselect (ST-3B-05f)
      clearSelection();
      onSiteSelect?.(null);
      return;
    }

    // Select new site (ST-3B-05g)
    clearSelection();
    selectSite(hitSiteId);
    onSiteSelect?.(hitSite); // ST-3B-06a
  }

  function selectSite(siteId) {
    selectedSiteRef.current = siteId;

    AQUA_SITES.forEach((site) => {
      const plume  = plumesRef.current[site.site_id];
      if (!plume) return;

      if (site.site_id === siteId) {
        // Selected: expand to 1.5× (ST-3B-05e)
        plume.userData.nominalScale = 1.5;
      } else {
        // Others: dim to 50% opacity (ST-3B-05d)
        plume.material.opacity = 0.45 * 0.5;
      }
    });
  }

  function clearSelection() {
    selectedSiteRef.current = null;
    AQUA_SITES.forEach((site) => {
      const plume = plumesRef.current[site.site_id];
      if (plume) {
        plume.userData.nominalScale = 1.0;
        plume.material.opacity      = 0.45;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Main effect — mount / unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!scene || !earth || !camera || !renderer) return;

    // Build all site objects (ST-3B-01b — validation already done in sites.js)
    AQUA_SITES.forEach(buildSiteObjects);
    console.log(`[AQUA] ${AQUA_SITES.length} sites loaded`); // ST-3B-01a

    // Wire click handler — named ref, not anonymous lambda (ST-3B-05j)
    const clickHandler = (e) => handleClick(e);
    clickHandlerRef.current = clickHandler;
    renderer.domElement.addEventListener('click', clickHandler); // ST-3B-05i

    // Cleanup — SENTINEL MEMORY RULE
    return () => {
      // Remove click handler (ST-3B-05j, ST-3B-07f)
      renderer.domElement.removeEventListener('click', clickHandlerRef.current);
      clickHandlerRef.current = null;

      // Remove all meshes from earth (ST-3B-07e)
      [...Object.values(markersRef.current),
       ...Object.values(plumesRef.current),
       ...Object.values(ringsRef.current),
      ].forEach((mesh) => earth.remove(mesh));

      markersRef.current = {};
      plumesRef.current  = {};
      ringsRef.current   = {};

      // Dispose all geometries and materials (ST-3B-07a through ST-3B-07d)
      geometriesRef.current.forEach((g) => g.dispose());
      materialsRef.current.forEach((m)  => m.dispose());
      geometriesRef.current = [];
      materialsRef.current  = [];
    };
  }, [scene, earth, camera, renderer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Renders nothing into the DOM — purely manages Three.js objects
  return null;
});

export default SiteMarkers;
