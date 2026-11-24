import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { placeOnSurface } from '../geometry/loft';

/** Material roles a garment part can ask for. GarmentMesh maps them to materials. */
export type MatRole = 'fabric' | 'inner' | 'rib' | 'trim' | 'metal' | 'stitch' | 'sole' | 'dark' | 'gum' | 'skin' | 'joint' | 'lens' | 'glow';

export interface GarmentPart {
  geometry: THREE.BufferGeometry;
  role: MatRole;
  /** if set the part is rendered as an InstancedMesh */
  instances?: THREE.Matrix4[];
  castShadow?: boolean;
}

export interface Anchor {
  p: THREE.Vector3;
  n: THREE.Vector3;
}

export interface GarmentBuild {
  parts: GarmentPart[];
  anchors: Record<string, Anchor>;
  box: THREE.Box3;
  center: THREE.Vector3;
  size: THREE.Vector3;
}

export interface BuildOpts {
  worn: boolean;
  /** radial ease in metres */
  ease: number;
  seed: number;
  lite: boolean;
}

/**
 * Merge every non-instanced part that shares a material role into one
 * geometry (one draw call per role). Interior faces are no longer separate
 * meshes — fabric materials are double-sided and shade their back faces.
 */
function mergeByRole(parts: GarmentPart[]): GarmentPart[] {
  const groups = new Map<MatRole, GarmentPart[]>();
  const out: GarmentPart[] = [];
  for (const p of parts) {
    if (p.role === 'inner') continue;
    if (p.instances) {
      out.push(p);
      continue;
    }
    const list = groups.get(p.role) ?? [];
    list.push(p);
    groups.set(p.role, list);
  }
  for (const [role, list] of groups) {
    if (list.length === 1) {
      out.push(list[0]);
      continue;
    }
    const geos = list.map((p) => {
      const g = ensureAttrs(p.geometry.index ? p.geometry : withIndex(p.geometry));
      // keep only the attributes every part has
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
      if (!g.getAttribute('normal')) g.computeVertexNormals();
      g.clearGroups();
      return g;
    });
    const merged = mergeGeometries(geos, false);
    if (merged) out.push({ geometry: merged, role, castShadow: list.some((p) => p.castShadow) });
    else out.push(...list);
  }
  return out;
}

function withIndex(g: THREE.BufferGeometry) {
  const count = g.getAttribute('position').count;
  const idx = new (count > 65535 ? Uint32Array : Uint16Array)(count);
  for (let i = 0; i < count; i++) idx[i] = i;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

export function finalize(rawParts: GarmentPart[], anchors: Record<string, Anchor>): GarmentBuild {
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  const parts = mergeByRole(rawParts);
  for (const part of parts) {
    ensureAttrs(part.geometry);
    part.geometry.computeBoundingBox();
    const gb = part.geometry.boundingBox!;
    if (part.instances) {
      for (const m of part.instances) {
        tmp.copy(gb).applyMatrix4(m);
        box.union(tmp);
      }
    } else box.union(gb);
  }
  return { parts, anchors, box, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) };
}

/** Shared unit geometries (created once) */
export const UNIT = {
  box: ensureAttrs(new THREE.BoxGeometry(1, 1, 1)),
  button: (() => {
    const g = new THREE.CylinderGeometry(1, 1, 1, 20, 1);
    g.rotateX(Math.PI / 2); // face +Z
    return ensureAttrs(g);
  })(),
  sphere: ensureAttrs(new THREE.SphereGeometry(1, 16, 12)),
  torus: ensureAttrs(new THREE.TorusGeometry(1, 0.3, 8, 20)),
};

export function instance(p: THREE.Vector3, n: THREE.Vector3, scale: [number, number, number], up?: THREE.Vector3) {
  return placeOnSurface(p, n, up, new THREE.Vector3(...scale));
}

/** Zip: tape + instanced teeth + slider, along points with surface normals. */
export function buildZip(
  points: THREE.Vector3[],
  normals: THREE.Vector3[],
  opts: { tape: number; tooth: number; tapeRole?: MatRole; teethRole?: MatRole; puller?: boolean; pullerAtEnd?: boolean },
): GarmentPart[] {
  const parts: GarmentPart[] = [];
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const len = curve.getLength();
  const avgN = normals.reduce((a, n) => a.add(n), new THREE.Vector3()).normalize();
  // tape
  const tapePts = curve.getSpacedPoints(Math.max(8, Math.ceil(len / 0.012))).map((p, i, arr) => {
    const k = Math.min(normals.length - 1, Math.round((i / (arr.length - 1)) * (normals.length - 1)));
    return p.clone().addScaledVector(normals[k], 0.0012);
  });
  const tapeCurve = new THREE.CatmullRomCurve3(tapePts);
  const tapeSamples = tapeCurve.getSpacedPoints(Math.max(8, Math.ceil(len / 0.01)));
  parts.push({ geometry: flatTape(tapeSamples, opts.tape, 0.0016, avgN), role: opts.tapeRole ?? 'trim' });

  // teeth
  const step = opts.tooth * 0.85;
  const count = Math.max(2, Math.floor(len / step));
  const mats: THREE.Matrix4[] = [];
  const T = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const u = i / (count - 1);
    const p = curve.getPointAt(u);
    curve.getTangentAt(u, T);
    const k = Math.min(normals.length - 1, Math.round(u * (normals.length - 1)));
    const n = normals[k];
    const side = new THREE.Vector3().crossVectors(T, n).normalize();
    const q = p.clone().addScaledVector(n, 0.0028).addScaledVector(side, (i % 2 === 0 ? 1 : -1) * opts.tooth * 0.28);
    mats.push(placeOnSurface(q, n, T, new THREE.Vector3(opts.tooth * 0.9, opts.tooth * 0.55, opts.tooth * 0.5)));
  }
  parts.push({ geometry: UNIT.box, role: opts.teethRole ?? 'metal', instances: mats });

  if (opts.puller !== false) {
    const u = opts.pullerAtEnd ? 1 : 0.985;
    const p = curve.getPointAt(u);
    curve.getTangentAt(u, T);
    const n = normals[opts.pullerAtEnd ? normals.length - 1 : normals.length - 1];
    const slider = placeOnSurface(p.clone().addScaledVector(n, 0.005), n, T, new THREE.Vector3(opts.tooth * 2.4, opts.tooth * 3.2, opts.tooth * 1.2));
    const pullPos = p.clone().addScaledVector(n, 0.007).addScaledVector(T, -opts.tooth * 4.5);
    const pull = placeOnSurface(pullPos, n, T, new THREE.Vector3(opts.tooth * 1.6, opts.tooth * 6, opts.tooth * 0.6));
    parts.push({ geometry: UNIT.box, role: 'metal', instances: [slider, pull] });
  }
  return parts;
}

/** Flat ribbon: thin rectangle swept along points, flat face toward `normal`. */
export function flatTape(points: THREE.Vector3[], width: number, thickness: number, normal: THREE.Vector3) {
  const pos: number[] = [];
  const idx: number[] = [];
  const T = new THREE.Vector3();
  const S = new THREE.Vector3();
  const corners: [number, number][] = [
    [-0.5, 0.5],
    [0.5, 0.5],
    [0.5, -0.5],
    [-0.5, -0.5],
  ];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    T.subVectors(b, a).normalize();
    S.crossVectors(T, normal).normalize();
    const N = new THREE.Vector3().crossVectors(S, T).normalize();
    for (const [sx, sy] of corners) {
      const v = points[i].clone().addScaledVector(S, sx * width).addScaledVector(N, sy * thickness);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < points.length - 1; i++) {
    for (let k = 0; k < 4; k++) {
      const a = i * 4 + k;
      const b = i * 4 + ((k + 1) % 4);
      const c = (i + 1) * 4 + ((k + 1) % 4);
      const d = (i + 1) * 4 + k;
      idx.push(a, d, b, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const count = pos.length / 3;
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3));
  return g;
}

/** Ensure geometry has uv + color attributes so it can share vertex-coloured fabric materials. */
export function ensureAttrs(g: THREE.BufferGeometry, shade = 1) {
  const count = g.getAttribute('position').count;
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  if (!g.getAttribute('color')) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(shade), 3));
  return g;
}
