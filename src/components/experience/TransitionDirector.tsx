import { useEffect } from 'react';
import * as THREE from 'three';
import { DIMENSION_BY_ID } from '../../data/dimensions';
import { useExperience, type Transition } from '../../store/experienceStore';
import { fly } from './flight';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = (test: () => boolean, timeout = 20000) =>
  new Promise<void>((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      if (test() || performance.now() - t0 > timeout) resolve();
      else requestAnimationFrame(tick);
    };
    tick();
  });

/** Fly up to the portal, then dive through it; the warp starts mid-dive. */
async function approach(t: Transition) {
  const def = DIMENSION_BY_ID[t.via ?? 'fashion'];
  const p = new THREE.Vector3(...def.portal.position);
  const R = def.portal.radius;
  const n = new THREE.Vector3(Math.sin(def.portal.tilt ?? 0), 0, Math.cos(def.portal.tilt ?? 0));
  const reduced = useExperience.getState().reducedMotion;
  if (!reduced) {
    await fly(p.clone().addScaledVector(n, R * 2.3), p, { duration: 1.8, ease: 'power2.inOut', fov: 54, arc: 1.2 });
    let warped = false;
    await fly(p.clone().addScaledVector(n, -1.5), p.clone().addScaledVector(n, -30), {
      duration: 1.05,
      ease: 'power3.in',
      fov: 82,
      onProgress: (k) => {
        if (k > 0.5 && !warped) {
          warped = true;
          useExperience.getState().setTransitionStage('warp');
        }
      },
    });
    if (!warped) useExperience.getState().setTransitionStage('warp');
  } else {
    useExperience.getState().setTransitionStage('warp');
  }
}

/** Hold the tunnel while the destination scene loads and mounts. */
async function warp(t: Transition) {
  const reduced = useExperience.getState().reducedMotion;
  const start = performance.now();
  await wait(reduced ? 60 : 340);
  useExperience.getState().setScene(t.to);
  await until(() => useExperience.getState().arrivalReady === t.to && performance.now() - start > (reduced ? 150 : 1400));
  useExperience.getState().setTransitionStage('arrive');
}

/**
 * Orchestrates spatial transitions between the universe and dimensions:
 * approach → warp (scene swap happens inside the tunnel) → arrive (the
 * destination scene runs its own arrival shot, see useArrival).
 */
export function TransitionDirector() {
  useEffect(
    () =>
      useExperience.subscribe((s, prev) => {
        const t = s.transition;
        if (!t) return;
        const pt = prev.transition;
        if (t.stage === 'approach' && pt?.stage !== 'approach') void approach(t);
        if (t.stage === 'warp' && pt?.stage !== 'warp') void warp(t);
      }),
    [],
  );
  return null;
}
