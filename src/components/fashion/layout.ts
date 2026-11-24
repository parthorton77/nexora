import * as THREE from 'three';
import type { DimensionDef, ZoneDef } from '../../data/dimensions';
import type { ZoneId } from '../../types';

/**
 * Spatial layout shared by every dimension hall. Zones sit on an arc around a
 * central atrium; each zone has its own local frame where local -Z points
 * away from the atrium and the visitor stands at +Z.
 */
export const ZONE_RADIUS = 26;
export const VIEW_DIST = 4.0;
export const ARC_R = 3.4;
export const ARC_STEP = 0.36;
export const HANG_Y = 2.28;
export const STAND_Y = 1.12;
export const INSPECT: [number, number, number] = [0, 1.55, 2.15];

export const OVERVIEW = { pos: new THREE.Vector3(0, 7.2, 36), look: new THREE.Vector3(0, 2.0, -6) };
export const ARRIVAL = { from: new THREE.Vector3(0, 3.4, 58), look: new THREE.Vector3(0, 3, 20) };
export const FITTING = {
  fit: { pos: new THREE.Vector3(0, 1.32, 3.5), look: new THREE.Vector3(0, 1.05, 0) },
  compose: { pos: new THREE.Vector3(0, 1.9, 5.1), look: new THREE.Vector3(0, 1.0, 0) },
};
export const DAIS_TOP = 0.28;

export function zoneAngle(dim: DimensionDef, zone: ZoneId): number {
  const n = dim.zones.length;
  const i = Math.max(0, dim.zones.findIndex((z) => z.id === zone));
  if (n <= 1) return 0;
  const span = Math.min((144 * Math.PI) / 180, (n - 1) * ((36 * Math.PI) / 180));
  return -span / 2 + (i * span) / (n - 1);
}

export function zoneFrame(angle: number) {
  return {
    position: new THREE.Vector3(Math.sin(angle) * ZONE_RADIUS, 0, -Math.cos(angle) * ZONE_RADIUS),
    rotationY: -angle,
  };
}

/** zone-local → world */
export function zoneToWorld(angle: number, local: THREE.Vector3Like, out = new THREE.Vector3()) {
  const f = zoneFrame(angle);
  out.set(local.x, local.y, local.z).applyAxisAngle(THREE.Object3D.DEFAULT_UP, f.rotationY).add(f.position);
  return out;
}

export function browseShot(angle: number) {
  return {
    pos: zoneToWorld(angle, { x: 0, y: 1.74, z: VIEW_DIST }),
    look: zoneToWorld(angle, { x: 0, y: 1.55, z: 0 }),
  };
}

/** carousel slot transform in zone-local space */
export function slotTransform(offset: number, display: ZoneDef['display']) {
  const phi = offset * ARC_STEP;
  const x = Math.sin(phi) * ARC_R;
  const z = -ARC_R + Math.cos(phi) * ARC_R;
  const y = display === 'helix' ? offset * 0.34 : 0;
  return { x, y, z, rot: phi };
}
