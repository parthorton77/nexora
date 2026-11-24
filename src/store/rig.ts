import * as THREE from 'three';

/** The camera "shot" the CameraRig damps toward, plus flight bookkeeping (3D chunk only). */
export const rig = {
  pos: new THREE.Vector3(0, 9, 70),
  look: new THREE.Vector3(0, 7, 0),
  fov: 50,
  /** damping speed toward the shot (higher = tighter) */
  lambda: 3,
  /** 0..1 pointer parallax strength */
  parallax: 1,
  /** true while a choreographed flight owns the camera */
  flying: false,
  /** frames to snap the camera exactly onto the shot (cuts) */
  snap: 0,
  /** actual camera state, written by CameraRig every frame */
  actualPos: new THREE.Vector3(0, 9, 70),
  actualLook: new THREE.Vector3(0, 7, 0),
};

export function setShot(pos: THREE.Vector3Like, look: THREE.Vector3Like, opts: { fov?: number; lambda?: number } = {}) {
  rig.pos.set(pos.x, pos.y, pos.z);
  rig.look.set(look.x, look.y, look.z);
  if (opts.fov) rig.fov = opts.fov;
  if (opts.lambda) rig.lambda = opts.lambda;
}
