import gsap from 'gsap';
import * as THREE from 'three';
import { rig } from '../../store/rig';
import { useExperience } from '../../store/experienceStore';

let current: gsap.core.Tween | null = null;

export interface FlyOpts {
  duration?: number;
  ease?: string;
  fov?: number;
  /** lift the path into an arc (metres) so moves read as flights, not slides */
  arc?: number;
  /** look interpolation leads (>1) or lags (<1) the position */
  lookLead?: number;
  onProgress?: (t: number) => void;
}

const bez = (a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3) => {
  const u = 1 - t;
  return out.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  );
};

/**
 * Choreographed camera flight along a gentle arc. Resolves when done.
 * With reduced motion it becomes a cut.
 */
export function fly(toPos: THREE.Vector3Like, toLook: THREE.Vector3Like, opts: FlyOpts = {}): Promise<void> {
  current?.kill();
  const to = new THREE.Vector3(toPos.x, toPos.y, toPos.z);
  const toL = new THREE.Vector3(toLook.x, toLook.y, toLook.z);
  const fov0 = rig.fov;
  const fov1 = opts.fov ?? rig.fov;
  if (useExperience.getState().reducedMotion) {
    rig.pos.copy(to);
    rig.look.copy(toL);
    rig.actualLook.copy(toL);
    rig.fov = fov1;
    rig.snap = 2;
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }
  const from = rig.actualPos.clone();
  const fromL = rig.actualLook.clone();
  const ctrl = from.clone().lerp(to, 0.5);
  ctrl.y += opts.arc ?? 0;
  const p = new THREE.Vector3();
  const state = { t: 0 };
  rig.flying = true;
  return new Promise((resolve) => {
    current = gsap.to(state, {
      t: 1,
      duration: opts.duration ?? 1.6,
      ease: opts.ease ?? 'power2.inOut',
      onUpdate: () => {
        const t = state.t;
        bez(from, ctrl, to, t, p);
        rig.pos.copy(p);
        const tl = Math.min(1, Math.pow(t, 1 / (opts.lookLead ?? 1)));
        rig.look.copy(fromL).lerp(toL, tl);
        rig.actualLook.copy(rig.look);
        rig.fov = fov0 + (fov1 - fov0) * t;
        opts.onProgress?.(t);
      },
      onComplete: () => {
        rig.flying = false;
        current = null;
        resolve();
      },
      onInterrupt: () => {
        rig.flying = false;
        resolve();
      },
    });
  });
}

export function cancelFlight() {
  current?.kill();
  current = null;
  rig.flying = false;
}

/** Hard cut (used when a new scene mounts). */
export function cut(pos: THREE.Vector3Like, look: THREE.Vector3Like, fov?: number) {
  cancelFlight();
  rig.pos.set(pos.x, pos.y, pos.z);
  rig.look.set(look.x, look.y, look.z);
  rig.actualPos.copy(rig.pos);
  rig.actualLook.copy(rig.look);
  if (fov) rig.fov = fov;
  rig.snap = 2;
}
