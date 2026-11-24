import * as THREE from 'three';
import type { FabricKind } from '../types';
import { makeTileNoise } from './noise';

/**
 * Procedural fabric surfaces. Each fabric gets a tileable height field that is
 * turned into a normal map (weave relief) and a detail map (subtle albedo
 * variation). UVs on lofted garments are in metres, so `tile` is the physical
 * size of one texture repeat.
 */

export interface FabricLook {
  roughness: number;
  sheen: number;
  sheenRoughness: number;
  normalScale: number;
  /** metres per texture repeat */
  tile: number;
  /** how strongly the detail map darkens recesses */
  detail: number;
  clearcoat?: number;
  anisotropy?: number;
}

export const FABRIC_LOOK: Record<FabricKind, FabricLook> = {
  jersey: { roughness: 0.92, sheen: 0.6, sheenRoughness: 0.75, normalScale: 0.55, tile: 0.05, detail: 0.14 },
  fleece: { roughness: 0.96, sheen: 0.8, sheenRoughness: 0.85, normalScale: 0.45, tile: 0.07, detail: 0.16 },
  rib: { roughness: 0.9, sheen: 0.55, sheenRoughness: 0.7, normalScale: 0.9, tile: 0.045, detail: 0.2 },
  denim: { roughness: 0.88, sheen: 0.25, sheenRoughness: 0.6, normalScale: 0.75, tile: 0.06, detail: 0.36 },
  nylon: { roughness: 0.5, sheen: 0.2, sheenRoughness: 0.4, normalScale: 0.18, tile: 0.06, detail: 0.05, clearcoat: 0.25 },
  satin: { roughness: 0.3, sheen: 0.9, sheenRoughness: 0.28, normalScale: 0.12, tile: 0.1, detail: 0.04, anisotropy: 0.6 },
  twill: { roughness: 0.86, sheen: 0.3, sheenRoughness: 0.6, normalScale: 0.6, tile: 0.05, detail: 0.16 },
  wool: { roughness: 0.94, sheen: 0.7, sheenRoughness: 0.8, normalScale: 0.4, tile: 0.05, detail: 0.12 },
  leather: { roughness: 0.42, sheen: 0.1, sheenRoughness: 0.5, normalScale: 0.4, tile: 0.08, detail: 0.08, clearcoat: 0.35 },
  knit: { roughness: 0.85, sheen: 0.5, sheenRoughness: 0.6, normalScale: 0.9, tile: 0.045, detail: 0.22 },
  canvas: { roughness: 0.78, sheen: 0.25, sheenRoughness: 0.6, normalScale: 0.65, tile: 0.04, detail: 0.15, clearcoat: 0.12 },
};

const SIZE = 256;
const TAU = Math.PI * 2;
const fract = (v: number) => v - Math.floor(v);

type HeightFn = (x: number, y: number) => number;

function heightFor(kind: FabricKind): HeightFn {
  const n8 = makeTileNoise(8, 8, 11);
  const n32 = makeTileNoise(32, 32, 23);
  const n64 = makeTileNoise(64, 64, 37);
  const slub = makeTileNoise(96, 6, 51);
  const knitV = (x: number, y: number, cols: number, rows: number) => {
    const u = fract(x * cols) - 0.5;
    const v = fract(y * rows + Math.abs(u) * 1.4);
    return Math.pow(Math.sin(Math.PI * v), 2) * (1 - Math.pow(Math.abs(u) * 2, 2));
  };
  switch (kind) {
    case 'jersey':
      return (x, y) => knitV(x, y, 40, 56) * 0.8 + n64(x, y) * 0.12 + n8(x, y) * 0.08;
    case 'fleece':
      return (x, y) => knitV(x, y, 32, 44) * 0.4 + n32(x, y) * 0.3 + n64(x, y) * 0.2 + n8(x, y) * 0.1;
    case 'rib':
      return (x, y) => Math.pow(0.5 + 0.5 * Math.cos(TAU * x * 14), 0.7) * 0.85 + knitV(x, y, 28, 40) * 0.15;
    case 'denim':
      return (x, y) => {
        const t = 0.5 + 0.5 * Math.sin(TAU * (x * 40 + y * 40));
        return Math.pow(t, 1.6) * 0.65 + slub(x, y) * 0.25 + n64(x, y) * 0.1;
      };
    case 'nylon':
      return (x, y) => {
        const gx = fract(x * 12);
        const gy = fract(y * 12);
        const grid = gx < 0.07 || gy < 0.07 ? 0.55 : 0;
        return grid + n64(x, y) * 0.08 + 0.5 * Math.sin(TAU * y * 96) * 0.05;
      };
    case 'satin':
      return (x, y) => n8(x, y) * 0.2 + Math.sin(TAU * y * 128) * 0.04;
    case 'twill':
      return (x, y) => Math.pow(0.5 + 0.5 * Math.sin(TAU * (x * 32 - y * 32)), 1.4) * 0.7 + n64(x, y) * 0.2 + n8(x, y) * 0.1;
    case 'wool':
      return (x, y) => (0.5 + 0.5 * Math.sin(TAU * (x * 48 + y * 48))) * 0.3 + n64(x, y) * 0.45 + n32(x, y) * 0.25;
    case 'leather':
      return (x, y) => {
        const a = n32(x, y);
        const b = n64(x, y);
        return 1 - Math.pow(Math.abs(a), 0.6) * 0.7 - Math.abs(b) * 0.3;
      };
    case 'knit':
      return (x, y) => {
        const rows = 18;
        const cols = 18;
        const r = Math.floor(y * rows);
        const ox = r % 2 === 0 ? 0 : 0.5;
        const cx = fract(x * cols + ox) - 0.5;
        const cy = fract(y * rows) - 0.5;
        const d = Math.hypot(cx, cy * 1.15);
        const hole = d < 0.2 ? 0 : d < 0.32 ? (d - 0.2) / 0.12 : 1;
        return hole * 0.8 + knitV(x, y, 54, 72) * 0.2;
      };
    case 'canvas':
      return (x, y) => {
        const a = Math.sin(TAU * x * 36);
        const b = Math.sin(TAU * y * 36);
        return 0.5 + 0.35 * a * b + n64(x, y) * 0.15;
      };
  }
}

interface FabricTextures {
  normal: THREE.DataTexture;
  detail: THREE.DataTexture;
}

const cache = new Map<FabricKind, FabricTextures>();

function makeTexture(data: Uint8Array, srgb: boolean, repeat: number) {
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.repeat.set(1 / repeat, 1 / repeat);
  tex.needsUpdate = true;
  return tex;
}

export function getFabricTextures(kind: FabricKind): FabricTextures {
  const hit = cache.get(kind);
  if (hit) return hit;
  const look = FABRIC_LOOK[kind];
  const h = heightFor(kind);
  const height = new Float32Array(SIZE * SIZE);
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = h(x / SIZE, y / SIZE);
      height[y * SIZE + x] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  const range = max - min || 1;
  for (let i = 0; i < height.length; i++) height[i] = (height[i] - min) / range;

  const normal = new Uint8Array(SIZE * SIZE * 4);
  const detail = new Uint8Array(SIZE * SIZE * 4);
  const strength = 3.2;
  const at = (x: number, y: number) => height[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * SIZE + x) * 4;
      normal[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      normal[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      normal[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;
      const hv = at(x, y);
      const shade = (1 - look.detail) + look.detail * hv;
      const g = Math.round(Math.min(1, shade) * 255);
      detail[i] = g;
      detail[i + 1] = g;
      detail[i + 2] = g;
      detail[i + 3] = 255;
    }
  }
  const tex: FabricTextures = {
    normal: makeTexture(normal, false, look.tile),
    detail: makeTexture(detail, true, look.tile),
  };
  cache.set(kind, tex);
  return tex;
}

/** Pre-generate textures (called during the intro so the first frame is smooth). */
export function warmFabrics(kinds: FabricKind[]) {
  for (const k of kinds) getFabricTextures(k);
}

/**
 * Darken back faces in the shader so one double-sided draw shows both the
 * outside and the shadowed inside of a garment (collars, hems, cuffs).
 */
function shadeInside<T extends THREE.Material>(mat: T, k = 0.38): T {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>\n  if (!gl_FrontFacing) diffuseColor.rgb *= ${k.toFixed(2)};`,
    );
  };
  mat.customProgramCacheKey = () => `fv-inside-${k}`;
  return mat;
}

export function makeFabricMaterial(kind: FabricKind, hex: string, lite: boolean, side: THREE.Side = THREE.DoubleSide) {
  const mat = makeFabricBase(kind, hex, lite, side);
  return side === THREE.DoubleSide ? shadeInside(mat) : mat;
}

function makeFabricBase(kind: FabricKind, hex: string, lite: boolean, side: THREE.Side) {
  const look = FABRIC_LOOK[kind];
  const tex = getFabricTextures(kind);
  if (lite) {
    return new THREE.MeshStandardMaterial({
      color: hex,
      map: tex.detail,
      normalMap: tex.normal,
      normalScale: new THREE.Vector2(look.normalScale, look.normalScale),
      roughness: look.roughness,
      vertexColors: true,
      side,
    });
  }
  const mat = new THREE.MeshPhysicalMaterial({
    color: hex,
    map: tex.detail,
    normalMap: tex.normal,
    normalScale: new THREE.Vector2(look.normalScale, look.normalScale),
    roughness: look.roughness,
    sheen: look.sheen,
    sheenRoughness: look.sheenRoughness,
    sheenColor: new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), 0.35),
    clearcoat: look.clearcoat ?? 0,
    clearcoatRoughness: 0.5,
    vertexColors: true,
    side,
  });
  if (look.anisotropy) mat.anisotropy = look.anisotropy;
  return mat;
}
