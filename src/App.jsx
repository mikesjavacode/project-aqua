/**
 * PROJECT AQUA — App Root
 * Phase 3-A + 3-B + 3-C: Globe core + site markers + data handoff pipeline.
 * Phase 5-A: Process flow schematic + particle animation (Layer 2).
 * Phase 7-A: AI Advisor panel (Layer 5).
 * No chemistry data computed here — passed through from sites.js via SiteMarkers.
 * Module 3-C: useSelectedSite hook owns selection state and validation gate.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { AQUA_SITES } from './data/sites';
import { useTelemetry } from './hooks/useTelemetry';
import GlobeScene from './components/globe/GlobeScene';
import SiteMarkers from './components/globe/SiteMarkers';
import ProcessFlow from './components/process/ProcessFlow';
import TelemetryPanel from './components/telemetry/TelemetryPanel';
import MolecularLayer from './components/molecular/MolecularLayer';
import AIAdvisorPanel from './components/advisor/AIAdvisorPanel';
import DesktopOnlyNotice from './components/ui/DesktopOnlyNotice';
import NoWebGLNotice from './components/ui/NoWebGLNotice';
import { useSelectedSite } from './hooks/useSelectedSite';
import { useDesktopViewport } from './hooks/useDesktopViewport';
import { useWebGL } from './hooks/useWebGL';
import './index.css';

export default function App() {
  // Scene objects from Module 3-A — stored in state so 3-B renders when ready
  const [sceneData, setSceneData] = useState(null);

  // Ref to SiteMarkers — exposes onFrame() for animation (ST-3B-03f)
  const siteMarkersRef = useRef(null);

  // Module 3-C: validated selection state + 3-C validation gate (ST-3C-01a)
  const { selectedSite, selectSite } = useSelectedSite();

  // The layer stack is fixed-width by design — narrow viewports get a notice
  const isDesktop = useDesktopViewport();

  // Layer 1 is a Three.js globe; without WebGL it never appears and the console
  // looks half-built rather than unsupported.
  const hasWebGL = useWebGL();

  // Module 5-C: single useTelemetry instance — shared source of truth for
  // TelemetryPanel (display) and ProcessFlow (AF2 live wire, 6-B)
  const telemetryState = useTelemetry(selectedSite);

  // Stable callback: scene ready from Module 3-A (CA-3A-BC-01/02)
  const handleSceneReady = useCallback((data) => {
    setSceneData(data);
  }, []);

  // Stable callback: RAF hook — drives all module animations (CA-3A-BC-03)
  const handleBeforeRender = useCallback((delta) => {
    siteMarkersRef.current?.onFrame(delta);
  }, []);

  // ?site=SITE-003 opens straight onto a site. Landing on the unselected globe
  // means four of the five layers sit idle until the visitor happens to hit a
  // marker, and the markers are small. The id still goes through the 3-C
  // validation gate — an unknown or malformed one just leaves the globe as it
  // was. CLAUDE.md's recommended demo order starts at Norilsk.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('site');
    if (!requested) return;
    const site = AQUA_SITES.find((s) => s.site_id === requested.toUpperCase());
    if (site) selectSite(site);
  }, [selectSite]);

  if (!isDesktop) return <DesktopOnlyNotice />;
  if (!hasWebGL) return <NoWebGLNotice />;

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">

      {/* Module 3-A — Globe Core */}
      <GlobeScene
        config={{ rotationSpeed: 0.05 }}
        onSceneReady={handleSceneReady}
        onBeforeRender={handleBeforeRender}
      />

      {/* Module 3-B — Site Markers (mounts once scene is ready) */}
      {/* Selection goes straight into the 3-C gate (ST-3C-07a) — selectSite
          handles null (deselect) and validation blocking transparently */}
      {sceneData && (
        <SiteMarkers
          ref={siteMarkersRef}
          scene={sceneData.scene}
          earth={sceneData.earth}
          camera={sceneData.camera}
          renderer={sceneData.renderer}
          onSiteSelect={selectSite}
        />
      )}

      {/* Module 5-A — Process Flow Schematic + Particle Animation (Layer 2) */}
      {/* af2Active: live AF2 wire from useTelemetry — badges pulse red when pH < 9.2 (6-B) */}
      <ProcessFlow
        selectedSite={selectedSite}
        af2Active={telemetryState?.af2_alert_active ?? false}
      />

      {/* Module 5-C — Live Telemetry Panel (Layer 4) */}
      {/* telemetryState passed from shared useTelemetry instance above (6-B) */}
      <TelemetryPanel selectedSite={selectedSite} telemetryState={telemetryState} />

      {/* Module 5-B — Molecular Visualization (Layer 3) */}
      <MolecularLayer selectedSite={selectedSite} />

      {/* Module 7-A — AI Advisor Panel (Layer 5) */}
      {/* telemetryState from shared useTelemetry instance — no duplicate hook */}
      <AIAdvisorPanel selectedSite={selectedSite} telemetryState={telemetryState} />

    </div>
  );
}
