import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { DimensionId } from '../types';
import { useExperience, type SceneId } from '../store/experienceStore';

/**
 * Lets a scene run its own arrival choreography. The scene compiles its
 * shaders in the background (so the warp never freezes), announces it is
 * ready, then `run` is called when the transition reaches "arrive". The
 * transition finishes when `run` resolves.
 */
export function useArrival(scene: SceneId, run: (via: DimensionId | undefined, from: SceneId | undefined) => Promise<void>) {
  const runRef = useRef(run);
  runRef.current = run;
  const gl = useThree((s) => s.gl);
  const world = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let alive = true;
    const announce = () => alive && useExperience.setState({ arrivalReady: scene });
    // let the first render happen, then make sure every program is compiled
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const compile = (gl as unknown as { compileAsync?: (s: unknown, c: unknown) => Promise<unknown> }).compileAsync;
        if (compile) {
          compile
            .call(gl, world, camera)
            .catch(() => undefined)
            .then(announce);
        } else announce();
      }),
    );
    const unsub = useExperience.subscribe((s, prev) => {
      const t = s.transition;
      if (t && t.stage === 'arrive' && t.to === scene && prev.transition?.stage !== 'arrive') {
        void runRef.current(t.via, t.from).then(() => useExperience.getState().finishTransition());
      }
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      unsub();
      if (useExperience.getState().arrivalReady === scene) useExperience.setState({ arrivalReady: null });
    };
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps
}
