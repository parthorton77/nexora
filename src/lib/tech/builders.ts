import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Product, TechSpec } from '../../types';
import { strap, tube } from '../geometry/loft';
import { ensureAttrs, finalize, type Anchor, type GarmentBuild, type GarmentPart } from '../garments/common';
import { memoBuild } from '../garments';

/**
 * Procedural Tech Dimension products. Same GarmentBuild contract as the
 * garments (parts by material role + named anchors), so the inspector,
 * hotspots and displays work unchanged. Real-world scale, in metres.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const geo = (g: THREE.BufferGeometry) => ensureAttrs(g);

function headphones(lite: boolean): GarmentBuild {
  const parts: GarmentPart[] = [];
  const anchors: Record<string, Anchor> = {};
  const seg = lite ? 24 : 48;
  const R = 0.088;
  const arc = (r: number, y0: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 28; i++) {
      const a = Math.PI * (0.06 + 0.88 * (i / 28));
      pts.push(v(Math.cos(a) * r * 1.02, y0 + Math.sin(a) * r * 1.08, 0));
    }
    return pts;
  };
  parts.push({ geometry: geo(tube(arc(R, 0.1), 0.0085, 10)), role: 'fabric', castShadow: true });
  parts.push({ geometry: geo(strap(arc(R - 0.012, 0.1), 0.03, 0.007, v(0, 0, 1))), role: 'trim' });
  for (const s of [1, -1]) {
    const x = s * (R * 1.02 * Math.cos(Math.PI * 0.06) + 0.002);
    // yoke
    const yoke = new THREE.TorusGeometry(0.05, 0.004, 8, seg, Math.PI);
    yoke.rotateY(Math.PI / 2);
    yoke.translate(x, 0.098, 0);
    parts.push({ geometry: geo(yoke), role: 'metal' });
    // cup
    const cup = new THREE.CylinderGeometry(0.046, 0.05, 0.032, seg, 1, false);
    cup.rotateZ(Math.PI / 2);
    cup.translate(x + s * 0.004, 0.072, 0);
    parts.push({ geometry: geo(cup), role: 'fabric', castShadow: true });
    // cushion
    const cushion = new THREE.TorusGeometry(0.037, 0.014, lite ? 10 : 16, seg);
    cushion.rotateY(Math.PI / 2);
    cushion.translate(x - s * 0.016, 0.072, 0);
    parts.push({ geometry: geo(cushion), role: 'trim' });
    // outer cap + light line
    const cap = new THREE.CylinderGeometry(0.036, 0.036, 0.004, seg);
    cap.rotateZ(Math.PI / 2);
    cap.translate(x + s * 0.022, 0.072, 0);
    parts.push({ geometry: geo(cap), role: 'metal' });
    const ring = new THREE.TorusGeometry(0.041, 0.0012, 6, seg);
    ring.rotateY(Math.PI / 2);
    ring.translate(x + s * 0.0215, 0.072, 0);
    parts.push({ geometry: geo(ring), role: 'glow' });
  }
  const xr = R * 1.02 * Math.cos(Math.PI * 0.06) + 0.03;
  anchors.cushion = { p: v(-xr + 0.035, 0.05, 0.03), n: v(0, 0, 1) };
  anchors.control = { p: v(xr - 0.004, 0.072, 0.0), n: v(1, 0, 0) };
  anchors.logo = { p: v(-xr + 0.004, 0.072, 0.0), n: v(-1, 0, 0) };
  anchors.band = { p: v(0, 0.1 + R * 1.08 + 0.01, 0), n: v(0, 1, 0) };
  return finalize(parts, anchors);
}

function watch(lite: boolean): GarmentBuild {
  const parts: GarmentPart[] = [];
  const anchors: Record<string, Anchor> = {};
  const W = 0.04;
  const H = 0.047;
  const D = 0.011;
  const body = new RoundedBoxGeometry(W, H, D, lite ? 2 : 4, 0.009);
  body.translate(0, 0, 0);
  parts.push({ geometry: geo(body), role: 'fabric', castShadow: true });
  const glass = new RoundedBoxGeometry(W - 0.004, H - 0.004, 0.002, 2, 0.008);
  glass.translate(0, 0, D / 2 + 0.0002);
  parts.push({ geometry: geo(glass), role: 'dark' });
  // UI: two activity arcs
  for (const [r, len] of [
    [0.013, 4.6],
    [0.0095, 3.4],
  ] as const) {
    const ring = new THREE.TorusGeometry(r, 0.0011, 6, 40, len);
    ring.rotateZ(Math.PI / 2);
    ring.translate(0, 0.001, D / 2 + 0.0016);
    parts.push({ geometry: geo(ring), role: 'glow' });
  }
  const crown = new THREE.CylinderGeometry(0.0034, 0.0034, 0.004, 20);
  crown.rotateZ(Math.PI / 2);
  crown.translate(W / 2 + 0.002, 0.006, 0);
  parts.push({ geometry: geo(crown), role: 'metal' });
  // woven loop band: a closed strap around the wrist, through the case lugs
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    pts.push(v(0, Math.sin(a) * 0.036 + 0.0, Math.cos(a) * 0.028 - 0.022));
  }
  parts.push({ geometry: geo(strap(pts, 0.022, 0.0025, v(1, 0, 0), true)), role: 'trim', castShadow: true });
  anchors.crown = { p: v(W / 2 + 0.005, 0.006, 0), n: v(1, 0, 0) };
  anchors.face = { p: v(-0.008, 0.01, D / 2 + 0.003), n: v(0, 0, 1) };
  anchors.band = { p: v(0, -0.036, -0.022), n: v(0, -1, 0) };
  return finalize(parts, anchors);
}

function phone(lite: boolean): GarmentBuild {
  const parts: GarmentPart[] = [];
  const anchors: Record<string, Anchor> = {};
  const W = 0.074;
  const H = 0.156;
  const D = 0.0082;
  const body = new RoundedBoxGeometry(W, H, D, lite ? 3 : 5, 0.0038);
  parts.push({ geometry: geo(body), role: 'trim', castShadow: true });
  const back = new RoundedBoxGeometry(W - 0.002, H - 0.002, 0.001, 2, 0.008);
  back.translate(0, 0, -D / 2 - 0.0002);
  parts.push({ geometry: geo(back), role: 'fabric' });
  const screen = new RoundedBoxGeometry(W - 0.004, H - 0.004, 0.001, 2, 0.008);
  screen.translate(0, 0, D / 2 + 0.0002);
  parts.push({ geometry: geo(screen), role: 'dark' });
  const island = new RoundedBoxGeometry(0.03, 0.036, 0.0026, 2, 0.008);
  island.translate(-W / 2 + 0.021, H / 2 - 0.024, -D / 2 - 0.0012);
  parts.push({ geometry: geo(island), role: 'metal' });
  for (const [x, y] of [
    [-W / 2 + 0.014, H / 2 - 0.014],
    [-W / 2 + 0.014, H / 2 - 0.033],
    [-W / 2 + 0.03, H / 2 - 0.023],
  ]) {
    const lens = new THREE.CylinderGeometry(0.0052, 0.0056, 0.003, 24);
    lens.rotateX(Math.PI / 2);
    lens.translate(x, y, -D / 2 - 0.0028);
    parts.push({ geometry: geo(lens), role: 'lens' });
  }
  const key = new RoundedBoxGeometry(0.0016, 0.014, 0.0034, 1, 0.0007);
  key.translate(W / 2 + 0.0004, 0.03, 0);
  parts.push({ geometry: geo(key), role: 'metal' });
  // faint lock-screen glow line
  const line = new THREE.BoxGeometry(0.03, 0.0012, 0.0004);
  line.translate(0, -H / 2 + 0.008, D / 2 + 0.001);
  parts.push({ geometry: geo(line), role: 'glow' });
  anchors.camera = { p: v(-W / 2 + 0.021, H / 2 - 0.024, -D / 2 - 0.004), n: v(0, 0, -1) };
  anchors.button = { p: v(W / 2 + 0.003, 0.03, 0), n: v(1, 0, 0) };
  anchors.logo = { p: v(0, -0.02, -D / 2 - 0.0008), n: v(0, 0, -1) };
  return finalize(parts, anchors);
}

function earbuds(lite: boolean): GarmentBuild {
  const parts: GarmentPart[] = [];
  const anchors: Record<string, Anchor> = {};
  const seg = lite ? 24 : 40;
  const half = (top: boolean) => {
    const g = new THREE.SphereGeometry(1, seg, 16, 0, Math.PI * 2, top ? 0 : Math.PI / 2, Math.PI / 2);
    g.scale(0.034, top ? 0.016 : 0.02, 0.024);
    g.translate(0, top ? 0.0225 : 0.0215, 0);
    return geo(g);
  };
  parts.push({ geometry: half(true), role: 'fabric', castShadow: true }, { geometry: half(false), role: 'fabric', castShadow: true });
  const seam = new THREE.TorusGeometry(1, 0.03, 6, seg);
  seam.rotateX(Math.PI / 2);
  seam.scale(0.0338, 1, 0.0238);
  seam.translate(0, 0.022, 0);
  parts.push({ geometry: geo(seam), role: 'dark' });
  const led = new THREE.SphereGeometry(0.0016, 10, 8);
  led.translate(0, 0.016, 0.0235);
  parts.push({ geometry: geo(led), role: 'glow' });
  // the two buds resting in front of the case
  for (const s of [1, -1]) {
    const bud = new THREE.SphereGeometry(0.0095, seg, 14);
    bud.scale(1, 0.9, 1);
    bud.translate(s * 0.02, 0.009, 0.042);
    parts.push({ geometry: geo(bud), role: 'trim', castShadow: true });
    const stem = new THREE.CapsuleGeometry(0.0034, 0.018, 4, 12);
    stem.rotateZ(s * 0.5);
    stem.translate(s * 0.026, 0.0035, 0.046);
    parts.push({ geometry: geo(stem), role: 'trim' });
    const tip = new THREE.SphereGeometry(0.0055, 16, 10);
    tip.translate(s * 0.015, 0.012, 0.036);
    parts.push({ geometry: geo(tip), role: 'dark' });
  }
  anchors.case = { p: v(0.016, 0.036, 0.008), n: v(0.2, 1, 0.3).normalize() };
  anchors.hinge = { p: v(0, 0.024, -0.026), n: v(0, 0.3, -1).normalize() };
  anchors.logo = { p: v(-0.012, 0.014, 0.021), n: v(0, -0.2, 1).normalize() };
  return finalize(parts, anchors);
}

function speaker(lite: boolean): GarmentBuild {
  const parts: GarmentPart[] = [];
  const anchors: Record<string, Anchor> = {};
  const R = 0.09;
  const sphere = new THREE.SphereGeometry(R, lite ? 40 : 72, lite ? 28 : 48);
  // knit UVs in metres so the knit texture tiles at a real scale
  const uv = sphere.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * R, uv.getY(i) * Math.PI * R);
  sphere.translate(0, R + 0.012, 0);
  parts.push({ geometry: geo(sphere), role: 'fabric', castShadow: true });
  const ring = new THREE.TorusGeometry(R * 1.004, 0.0035, 8, 96);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, R + 0.012 - 0.02, 0);
  parts.push({ geometry: geo(ring), role: 'glow' });
  const top = new THREE.CylinderGeometry(0.03, 0.03, 0.004, 40);
  top.translate(0, 2 * R + 0.0105, 0);
  parts.push({ geometry: geo(top), role: 'metal' });
  const base = new THREE.CylinderGeometry(0.05, 0.056, 0.016, 40);
  base.translate(0, 0.008, 0);
  parts.push({ geometry: geo(base), role: 'dark' });
  anchors.knit = { p: v(R * 0.55, R + 0.05, R * 0.6), n: v(0.55, 0.4, 0.6).normalize() };
  anchors.ring = { p: v(-R * 0.72, R - 0.008, R * 0.72), n: v(-0.7, 0, 0.7).normalize() };
  anchors.top = { p: v(0, 2 * R + 0.016, 0), n: v(0, 1, 0.2).normalize() };
  return finalize(parts, anchors);
}

const BUILDERS: Record<TechSpec['kind'], (lite: boolean) => GarmentBuild> = { headphones, watch, phone, earbuds, speaker };

export function techBuild(p: Product, lite: boolean): GarmentBuild {
  if (p.model.type !== 'tech') throw new Error(`${p.id} is not a tech product`);
  const kind = p.model.spec.kind;
  return memoBuild(`tech:${p.id}:${lite ? 1 : 0}`, () => BUILDERS[kind](lite));
}
