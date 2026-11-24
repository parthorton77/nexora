import * as THREE from 'three';
import type { BodyProfile, Product } from '../../types';
import { hashString, lerp } from '../math';
import { HANGER_BOTTOM, HANGER_TOP, bodyFromProfile, torsoLevels, type BodyFrame } from './body';
import { buildTop } from './top';
import { buildBottom } from './bottom';
import { buildBag, buildCap, buildSneaker } from './accessories';
import { buildShades } from './shades';
import { buildMannequin } from './mannequin';
import type { GarmentBuild } from './common';

export type { GarmentBuild, GarmentPart, Anchor, MatRole } from './common';
export { bodyFromProfile } from './body';
export type { BodyFrame } from './body';

import { garmentOf } from './spec';
export { garmentOf };

/** How a product is displayed: hanging from a hook, or standing on a surface. */
export type DisplayKind = 'hang-top' | 'hang-bottom' | 'stand';

export function displayKind(p: Product): DisplayKind {
  const g = garmentOf(p);
  if (g?.kind === 'top') return 'hang-top';
  if (g?.kind === 'bottom') return 'hang-bottom';
  return 'stand';
}

/* small LRU so worn variants (product × avatar × size) don't grow forever */
const MAX = 90;
const cache = new Map<string, GarmentBuild>();
export function memoBuild(key: string, make: () => GarmentBuild) {
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const v = make();
  cache.set(key, v);
  if (cache.size > MAX) {
    const oldest = cache.keys().next().value as string;
    const old = cache.get(oldest);
    cache.delete(oldest);
    old?.parts.forEach((part) => {
      if (!part.instances) part.geometry.dispose();
    });
  }
  return v;
}

/** The piece as it hangs on a rail / stands on a platform. */
export function hangingBuild(p: Product, lite: boolean): GarmentBuild {
  const g = garmentOf(p);
  if (!g) throw new Error(`${p.id} is not a garment`);
  return memoBuild(`hang:${p.id}:${lite ? 1 : 0}`, () => {
    const seed = hashString(p.id);
    if (g.kind === 'top') return buildTop(g.top, HANGER_TOP, { worn: false, ease: g.top.ease, seed, lite });
    if (g.kind === 'bottom') return buildBottom(g.bottom, HANGER_BOTTOM, { worn: false, ease: g.bottom.ease, seed, lite });
    if (g.kind === 'sneaker') return buildSneaker(g.sneaker, { worn: false, ease: 0, seed, lite });
    if (g.kind === 'cap') return buildCap({ worn: false, ease: 0, seed, lite });
    if (g.kind === 'shades') return buildShades({ worn: false, ease: 0, seed, lite });
    return buildBag({ worn: false, ease: 0, seed, lite });
  });
}

/** Crossbody strap path for a body (used when the sling is worn). Expressed in bag-local space. */
function crossbodyStrap(b: BodyFrame, bagPos: THREE.Vector3, clearance: number): THREE.Vector3[] {
  const L = torsoLevels(b);
  const out = Math.max(0.05, clearance + 0.012);
  const world = [
    new THREE.Vector3(0.12, 0.15, -0.01).add(bagPos),
    new THREE.Vector3(0.07, lerp(L.waist.y, L.chest.y, 0.55), lerp(L.waist.d, L.chest.d, 0.55) + out),
    new THREE.Vector3(L.shoulderTop.w * 0.85, L.shoulderTop.y + 0.04 + clearance * 0.5, 0.0),
    new THREE.Vector3(0.0, L.chest.y - 0.02, -(L.chest.d + out)),
    new THREE.Vector3(-L.waist.w - out * 0.9, L.waist.y - 0.02, -(L.waist.d * 0.3)),
    new THREE.Vector3(-0.165, 0.07, -0.01).add(bagPos),
  ];
  return world.map((v) => v.sub(bagPos));
}

export interface WornPlacement {
  build: GarmentBuild;
  /** extra transform applied to the build (accessories) */
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  /** sneakers render as a left/right pair */
  pair?: boolean;
}

/** Same product, re-lofted around an avatar body with size-dependent ease. */
export function wornBuild(p: Product, profile: BodyProfile, ease: number, lite: boolean): WornPlacement {
  const g = garmentOf(p);
  if (!g) throw new Error(`${p.id} is not a garment`);
  const body = bodyFromProfile(profile);
  const seed = hashString(p.id);
  const key = `worn:${p.id}:${profile.id}:${ease.toFixed(4)}:${lite ? 1 : 0}`;
  if (g.kind === 'top') {
    const e = ease + (g.top.layer === 1 ? 0.016 : 0);
    return { build: memoBuild(key, () => buildTop(g.top, body, { worn: true, ease: e, seed, lite })) };
  }
  if (g.kind === 'bottom') return { build: memoBuild(key, () => buildBottom(g.bottom, body, { worn: true, ease, seed, lite })) };
  if (g.kind === 'sneaker') {
    const scale = (body.footLength + 0.022) / 0.3;
    return { build: hangingBuild(p, lite), pair: true, scale };
  }
  if (g.kind === 'cap') {
    const s = body.head.r[0] / 0.086;
    return {
      build: hangingBuild(p, lite),
      position: [body.head.c[0], body.head.c[1] + body.head.r[1] * 0.12, body.head.c[2] - 0.006],
      rotation: [-0.12, 0, 0],
      scale: s,
    };
  }
  if (g.kind === 'shades') {
    const s = body.head.r[0] / 0.078;
    return {
      build: hangingBuild(p, lite),
      position: [body.head.c[0], body.head.c[1] + body.head.r[1] * 0.08, body.head.c[2] + body.head.r[2] * 0.92],
      rotation: [0.04, 0, 0],
      scale: s,
    };
  }
  const L = torsoLevels(body);
  // for the bag, `ease` is the clearance needed to sit over the outfit's outer layer
  const bagPos = new THREE.Vector3(-L.hip.w * 0.5, L.hip.y - 0.04, L.hip.d + Math.max(0.06, ease + 0.035));
  return {
    build: memoBuild(key, () => buildBag({ worn: true, ease: 0, seed, lite }, crossbodyStrap(body, bagPos, ease))),
    position: [bagPos.x, bagPos.y, bagPos.z],
    rotation: [0, 0, 0],
    scale: 1,
  };
}

export function mannequinBuild(profile: BodyProfile, lite: boolean, feet: boolean) {
  return memoBuild(`mannequin:${profile.id}:${lite ? 1 : 0}:${feet ? 1 : 0}`, () => buildMannequin(bodyFromProfile(profile), { lite, feet }));
}
