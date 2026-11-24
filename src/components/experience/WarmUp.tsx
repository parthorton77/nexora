import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { FabricKind } from '../../types';
import { FASHION } from '../../data/products';
import { warmFabrics } from '../../lib/fabric';
import { productBuild } from '../../lib/models';
import { useExperience } from '../../store/experienceStore';
import { preloadScene } from '../../scenes/registry';

const idle = (fn: () => void) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 300 });
  else window.setTimeout(fn, 16);
};

const KINDS: FabricKind[] = ['jersey', 'fleece', 'rib', 'denim', 'nylon', 'satin', 'twill', 'wool', 'leather', 'knit', 'canvas'];

/**
 * Real loading progress: universe mounted → fabrics woven (in idle slices,
 * never blocking a frame for long) → shaders compiled → ready. After that it
 * quietly pre-builds the Fashion Dimension's garments and scene chunk.
 */
export function WarmUp() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let cancelled = false;
    const set = (progress: number, status: string) => !cancelled && useExperience.setState({ progress, status });
    set(0.55, 'Building the universe');
    let i = 0;
    const weave = () => {
      if (cancelled) return;
      if (i < KINDS.length) {
        warmFabrics([KINDS[i]]);
        i++;
        set(0.55 + (i / KINDS.length) * 0.3, 'Weaving fabrics');
        idle(weave);
        return;
      }
      set(0.9, 'Compiling light');
      requestAnimationFrame(() => {
        try {
          gl.compile(scene, camera);
        } catch {
          /* compile is an optimisation only */
        }
        requestAnimationFrame(() => {
          set(1, 'Ready');
          prebuild();
        });
      });
    };
    const lite = useExperience.getState().quality === 'lite';
    let k = 0;
    const prebuild = () => {
      preloadScene('fashion');
      const step = () => {
        if (cancelled || k >= FASHION.length) return;
        productBuild(FASHION[k++], lite);
        idle(step);
      };
      idle(step);
    };
    idle(weave);
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
