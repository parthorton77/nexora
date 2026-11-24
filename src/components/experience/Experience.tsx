import { Suspense, lazy, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { useExperience } from '../../store/experienceStore';
import { lowerQuality } from '../../lib/platform';
import { SCENES } from '../../scenes/registry';
import { CameraRig } from './CameraRig';
import { TransitionDirector } from './TransitionDirector';
import { WarpTunnel } from './WarpTunnel';
import { WarmUp } from './WarmUp';

const Effects = lazy(() => import('./Effects'));

const DPR: Record<string, [number, number]> = { high: [1, 2], balanced: [0.8, 1.35], lite: [0.6, 1.15] };

/**
 * The single persistent WebGL canvas. Scenes swap inside it (never a page
 * change), so the camera, the warp and shopping state carry across worlds.
 */
export default function Experience() {
  const quality = useExperience((s) => s.quality);
  const sceneId = useExperience((s) => s.scene);
  const Scene = SCENES[sceneId];
  const [range, setRange] = useState(DPR[quality]);
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, DPR[quality][1]));

  useEffect(() => {
    setRange(DPR[quality]);
    setDpr((d) => Math.max(DPR[quality][0], Math.min(d, DPR[quality][1])));
  }, [quality]);

  if (import.meta.env.DEV) (window as unknown as { __dpr: number }).__dpr = dpr;

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: quality === 'balanced', powerPreference: 'high-performance', alpha: false, stencil: false }}
      camera={{ fov: 42, near: 0.05, far: 1400, position: [6, 38, 170] }}
      onCreated={({ gl, scene, camera }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.localClippingEnabled = true;
        if (import.meta.env.DEV) Object.assign(window, { __gl: gl, __scene: scene, __camera: camera });
      }}
      onPointerMissed={() => undefined}
    >
      <PerformanceMonitor
        bounds={(refresh) => (refresh > 90 ? [58, 90] : [52, 59])}
        flipflops={4}
        onDecline={() => {
          // ignore measurements while the tab is hidden or a transition is running
          if (document.hidden || useExperience.getState().transition) return;
          const next = Math.max(range[0], +(dpr - 0.2).toFixed(2));
          if (next !== dpr) {
            setDpr(next);
            return;
          }
          const q = useExperience.getState().quality;
          if (q !== 'lite' && !useExperience.getState().qualityLocked) {
            useExperience.getState().setQuality(lowerQuality(q));
            useExperience.getState().toast(`Switched to ${lowerQuality(q) === 'balanced' ? 'Balanced' : 'Lite'} quality to keep motion smooth`, 'info');
          }
        }}
        onIncline={() => setDpr(Math.min(range[1], +(dpr + 0.1).toFixed(2)))}
      />
      <CameraRig />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
      <WarpTunnel />
      <TransitionDirector />
      <WarmUp />
      {quality === 'high' && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </Canvas>
  );
}
