import * as THREE from 'three';
import { armPath, legPath, torsoLevels, type BodyFrame } from './body';
import { loft, sampleRings, type Ctrl } from '../geometry/loft';
import { ensureAttrs, finalize, type GarmentBuild, type GarmentPart } from './common';

/**
 * Faceless gallery mannequin built from the same body form garments are
 * lofted around — so worn garments always enclose it.
 */
export function buildMannequin(b: BodyFrame, opts: { lite: boolean; feet: boolean }): GarmentBuild {
  const parts: GarmentPart[] = [];
  const radial = opts.lite ? 36 : 56;
  const L = torsoLevels(b);
  const lv = (l: { y: number; w: number; d: number; n: number }): Ctrl => ({ p: [0, l.y, 0], rx: l.w, rz: l.d, n: l.n });
  const torso: Ctrl[] = [
    lv(L.neckTop),
    lv(L.neckBase),
    lv(L.shoulderTop),
    lv(L.shoulder),
    lv(L.chest),
    lv(L.waist),
    lv(L.hip),
    lv(L.crotch),
    { p: [0, b.crotchY - 0.01, 0], rx: b.hip[0] * 0.55, rz: b.hip[1] * 0.6, n: 2 },
    { p: [0, b.crotchY - 0.022, 0], rx: 0.02, rz: 0.02, n: 2 },
  ];
  parts.push({ geometry: loft(sampleRings(torso, 0.016), { radial, capStart: true, capEnd: true, ao: 0 }).geometry, role: 'skin', castShadow: true });

  for (const side of [1, -1] as const) {
    const leg = legPath(b, side).map((p) => ({ p: p.p, rx: p.r, rz: p.r * 0.94, n: 2 }) as Ctrl);
    parts.push({ geometry: loft(sampleRings(leg, 0.02), { radial: Math.round(radial * 0.7), capEnd: true, ao: 0 }).geometry, role: 'skin', castShadow: true });

    const arm = armPath(b, side);
    const s = new THREE.Vector3(...arm[0].p);
    const e = new THREE.Vector3(...arm[1].p);
    const w = new THREE.Vector3(...arm[2].p);
    const d0 = e.clone().sub(s).normalize();
    const pin = s.clone().addScaledVector(d0, -0.025);
    const armCtrls: Ctrl[] = [
      { p: [pin.x, pin.y, pin.z], rx: arm[0].r * 0.95, rz: arm[0].r * 0.95, n: 2 },
      { p: [s.x, s.y, s.z], rx: arm[0].r, rz: arm[0].r, n: 2 },
      { p: [e.x, e.y, e.z], rx: arm[1].r, rz: arm[1].r * 0.95, n: 2 },
      { p: [w.x, w.y, w.z], rx: arm[2].r, rz: arm[2].r * 0.8, n: 2 },
    ];
    parts.push({ geometry: loft(sampleRings(armCtrls, 0.02), { radial: Math.round(radial * 0.6), ao: 0 }).geometry, role: 'skin', castShadow: true });
    // shoulder ball
    const ball = new THREE.SphereGeometry(arm[0].r * 1.08, 24, 16);
    ball.translate(s.x, s.y, s.z);
    parts.push({ geometry: ensureAttrs(ball), role: 'skin' });
    // hand
    const dir = w.clone().sub(e).normalize();
    const hand = new THREE.SphereGeometry(1, 20, 14);
    hand.scale(arm[2].r * 0.95, 0.085 * (b.heightM / 1.75), arm[2].r * 1.65);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    hand.applyQuaternion(q);
    const hc = w.clone().addScaledVector(dir, 0.07 * (b.heightM / 1.75));
    hand.translate(hc.x, hc.y, hc.z);
    parts.push({ geometry: ensureAttrs(hand), role: 'skin' });
    // wrist joint line
    const wj = new THREE.TorusGeometry(arm[2].r * 1.01, 0.0016, 6, 28);
    wj.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir));
    wj.translate(w.x, w.y, w.z);
    parts.push({ geometry: ensureAttrs(wj), role: 'joint' });

    if (opts.feet) {
      const fl = b.footLength;
      const foot = new THREE.SphereGeometry(1, 20, 14);
      foot.scale(0.043 * (b.heightM / 1.75), 0.034, fl / 2);
      foot.translate(side * b.ankleX, 0.034, fl * 0.27);
      parts.push({ geometry: ensureAttrs(foot), role: 'skin', castShadow: true });
    }
  }
  // head
  const head = new THREE.SphereGeometry(1, 40, 28);
  head.scale(b.head.r[0], b.head.r[1], b.head.r[2]);
  head.translate(...b.head.c);
  parts.push({ geometry: ensureAttrs(head), role: 'skin', castShadow: true });
  // neck joint line
  const nj = new THREE.TorusGeometry(1, 0.03, 6, 40);
  nj.rotateX(Math.PI / 2);
  nj.scale(L.neckBase.w * 0.97, 0.06, L.neckBase.d * 0.97);
  nj.translate(0, L.neckBase.y + 0.035, 0);
  parts.push({ geometry: ensureAttrs(nj), role: 'joint' });
  return finalize(parts, {});
}
