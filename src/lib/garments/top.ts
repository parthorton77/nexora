import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { TopSpec } from '../../types';
import { armPath, torsoLevels, type BodyFrame } from './body';
import {
  indexAtY,
  loft,
  ringsBetweenY,
  sampleRings,
  surfacePoint,
  tube,
  type Ctrl,
  type DispFn,
  type LoftResult,
  type V3,
} from '../geometry/loft';
import { noise3 } from '../noise';
import { clamp, deg, lerp, smoothstep } from '../math';
import { buildZip, ensureAttrs, finalize, flatTape, instance, UNIT, type Anchor, type BuildOpts, type GarmentBuild, type GarmentPart } from './common';

const HALF_PI = Math.PI / 2;

/** theta (0..pi/2) on a super-ellipse front face where |x| == x */
const thetaForX = (rx: number, n: number, x: number) => Math.acos(Math.pow(clamp(x / rx, 0, 1), n / 2));

export function buildTop(spec: TopSpec, body: BodyFrame, o: BuildOpts): GarmentBuild {
  const parts: GarmentPart[] = [];
  const anchors: Record<string, Anchor> = {};
  const stitches: THREE.BufferGeometry[] = [];
  const radial = o.lite ? 32 : 52;
  const E = o.ease;
  const flat = body.flat;
  const seed = o.seed;
  const dz = flat ? 0.45 : 1;
  const L = torsoLevels(body);
  const off = 0.007 + E;
  const offD = 0.006 + E * dz;
  const drop = spec.dropShoulder;
  const hemY = lerp(body.waistY, body.crotchY, spec.length);
  const ribH = spec.hem === 'rib' ? 0.06 : spec.hem === 'band' ? 0.045 : 0;
  const bodyHemY = hemY + ribH * 0.92;
  const taper = spec.taper ?? 0.03;
  const ribRole = spec.ribUsesTrim ? 'trim' : 'rib';

  // ---------- torso ----------
  const formAt = (y: number) => {
    const lv = [L.shoulder, L.chest, L.waist, L.hip, L.crotch];
    for (let i = 0; i < lv.length - 1; i++) {
      if (y <= lv[i].y && y >= lv[i + 1].y) {
        const t = (y - lv[i].y) / (lv[i + 1].y - lv[i].y);
        return { w: lerp(lv[i].w, lv[i + 1].w, t), d: lerp(lv[i].d, lv[i + 1].d, t) };
      }
    }
    return y > L.shoulder.y ? { w: L.shoulder.w, d: L.shoulder.d } : { w: L.crotch.w, d: L.crotch.d };
  };

  // when worn, everything below the waist must clear a pair of trousers underneath
  const clearAt = (y: number) => (flat ? 0 : y > L.waist.y ? 0.02 : lerp(0.024, 0.06, clamp((L.waist.y - y) / Math.max(0.01, L.waist.y - L.hip.y), 0, 1)));
  const chestW = Math.max(L.chest.w, L.shoulder.w * 0.97) + off + drop * 0.25;
  const chestD = L.chest.d + offD;
  const ctrls: Ctrl[] = [];
  const push = (y: number, w: number, d: number, n: number) => ctrls.push({ p: [0, y, 0], rx: w, rz: d, n });
  const neckY = L.neckBase.y + 0.012;
  const neckW = L.neckBase.w + 0.016 + E * 0.12;
  const neckD = L.neckBase.d + 0.014 + E * 0.06 * dz;
  push(neckY, neckW, neckD, 2.1);
  push(L.shoulderTop.y + 0.004, Math.max(L.shoulderTop.w + off * 0.85 + 0.004, neckW + 0.03), L.shoulderTop.d + offD * 0.9, 2.3);
  push(L.shoulder.y, L.shoulder.w + off + drop * 0.6, L.shoulder.d + offD, 2.6);
  push(L.chest.y, chestW, chestD, 2.7);
  let lastW = chestW;
  let lastD = chestD;
  if (bodyHemY < L.waist.y - 0.025) {
    lastW = Math.max(L.waist.w + off, chestW * (1 - taper), L.waist.w + clearAt(L.waist.y));
    lastD = Math.max(L.waist.d + offD, chestD * (1 - taper * 0.8), L.waist.d + clearAt(L.waist.y));
    push(L.waist.y, lastW, lastD, 2.7);
  }
  if (bodyHemY < L.hip.y - 0.03) {
    lastW = Math.max(L.hip.w + off * 0.9 + 0.004, lastW, L.hip.w + clearAt(L.hip.y));
    lastD = Math.max(L.hip.d + offD * 0.9 + 0.004, lastD, L.hip.d + clearAt(L.hip.y));
    push(L.hip.y, lastW, lastD, 2.7);
  }
  const fHem = formAt(bodyHemY);
  const hemW = Math.max(lastW, fHem.w + off * 0.9 + 0.004, fHem.w + clearAt(bodyHemY));
  const hemD = Math.max(lastD * 0.99, fHem.d + offD * 0.9 + 0.004, fHem.d + clearAt(bodyHemY));
  push(bodyHemY, hemW, hemD, 2.7);

  const amp = flat ? 0.004 + E * 0.09 : 0.0022 + E * 0.06;
  const k1 = 5 + (seed % 3);
  const ph = (seed % 97) * 0.37;
  const ySpan = Math.max(0.15, L.shoulder.y - bodyHemY);
  const torsoDisp: DispFn = (th, p) => {
    const t = clamp((L.shoulder.y - p.y) / ySpan, 0, 1);
    const fall = flat ? 0.12 + 0.88 * t * t : 0.4 + 0.6 * t;
    const face = 0.35 + 0.65 * Math.abs(Math.sin(th));
    const folds = Math.sin(th * k1 + ph + p.y * 2.2) * 0.6 + Math.sin(th * (k1 * 2 + 1) + ph * 2.1) * 0.25;
    const n = noise3(p.x * 6 + ph, p.y * 4, p.z * 6);
    const top = smoothstep(0, 0.06, L.neckBase.y - p.y + 0.02);
    return amp * top * (fall * face * folds + n * 0.55 * (0.4 + t));
  };

  const torsoRings = sampleRings(ctrls, 0.02);
  const torso = loft(torsoRings, { radial, disp: torsoDisp, ao: 0.32 });
  parts.push({ geometry: torso.geometry, role: 'fabric', castShadow: true }, { geometry: torso.geometry, role: 'inner' });
  const tIdx = (y: number) => indexAtY(torso.rings, y);
  const onTorso = (y: number, th: number, extra = 0) => surfacePoint(torso, tIdx(y), th, extra);

  // ---------- hem band ----------
  if (ribH > 0) {
    const fh = formAt(hemY);
    const gather = spec.hem === 'rib' ? 0.93 : 1.0;
    const w2 = Math.max(hemW * gather, fh.w + 0.008 + clearAt(hemY));
    const d2 = Math.max(hemD * gather, fh.d + 0.008 + clearAt(hemY));
    const band = loft(
      sampleRings(
        [
          { p: [0, bodyHemY + 0.008, 0], rx: hemW * 0.995, rz: hemD * 0.995, n: 2.7 },
          { p: [0, lerp(bodyHemY, hemY, 0.5), 0], rx: lerp(hemW, w2, 0.7) + 0.002, rz: lerp(hemD, d2, 0.7) + 0.002, n: 2.7 },
          { p: [0, hemY, 0], rx: w2, rz: d2, n: 2.7 },
        ],
        0.01,
      ),
      { radial, ao: 0 },
    );
    parts.push({ geometry: band.geometry, role: spec.hem === 'rib' ? ribRole : 'fabric' }, { geometry: band.geometry, role: 'inner' });
    if (spec.stitch) {
      for (const yy of [hemY + 0.008, bodyHemY - 0.004]) {
        const pts: THREE.Vector3[] = [];
        const fi = indexAtY(band.rings, yy);
        for (let k = 0; k <= 48; k++) pts.push(surfacePoint(band, fi, (k / 48) * Math.PI * 2, 0.0014).p);
        stitches.push(tube(pts, 0.0011, 4));
      }
    }
  }

  // ---------- sleeves ----------
  const sleeveFrac = spec.sleeve;
  const longSleeve = sleeveFrac > 0.6;
  const cuffLen = spec.cuff === 'rib' ? 0.055 : 0;
  let cuffAnchor: Anchor | null = null;
  for (const side of [1, -1] as const) {
    const ctrlS: Ctrl[] = [];
    if (flat) {
      const a = longSleeve ? deg(80) : deg(48);
      const dir = new THREE.Vector3(Math.cos(a) * side, -Math.sin(a), 0);
      const r0 = 0.072 + E * 0.5;
      // place the armhole so the sleeve's top edge meets the shoulder line
      // (the ring is perpendicular to the sleeve: its upper rim sits r0·cos(a) above centre)
      const edge = L.shoulder.w + off + drop * 0.6;
      const sx = (edge - r0 * Math.sin(a) * 0.9) * side;
      const sy = L.shoulder.y + 0.012 - r0 * Math.cos(a);
      const start = new THREE.Vector3(sx, sy, 0);
      const len = 0.62 * sleeveFrac - cuffLen;
      const rEnd = longSleeve ? 0.048 + E * 0.25 : r0 * 0.92;
      const pin = start.clone().add(new THREE.Vector3(-side * 0.035, -0.014, 0));
      const pts = [pin, start, start.clone().addScaledVector(dir, len * 0.5).add(new THREE.Vector3(0, 0, 0.012)), start.clone().addScaledVector(dir, len).add(new THREE.Vector3(longSleeve ? 0.012 * side : 0, 0, 0.02))];
      const rs = [r0 * 0.95, r0, lerp(r0, rEnd, 0.55), rEnd];
      pts.forEach((p, i) => ctrlS.push({ p: [p.x, p.y, p.z], rx: rs[i], rz: rs[i] * 0.62, n: 2.3 }));
    } else {
      const ap = armPath(body, side);
      const P = ap.map((a) => new THREE.Vector3(...a.p));
      const seg1 = P[0].distanceTo(P[1]);
      const seg2 = P[1].distanceTo(P[2]);
      const total = seg1 + seg2;
      const want = total * sleeveFrac - cuffLen;
      const along = (s: number) => {
        if (s <= seg1) return P[0].clone().lerp(P[1], s / seg1);
        if (s <= total) return P[1].clone().lerp(P[2], (s - seg1) / seg2);
        return P[2].clone().addScaledVector(P[2].clone().sub(P[1]).normalize(), s - total);
      };
      const rAt = (s: number) => {
        if (s <= seg1) return lerp(ap[0].r, ap[1].r, s / seg1);
        return lerp(ap[1].r, ap[2].r, Math.min(1, (s - seg1) / seg2));
      };
      const outward = new THREE.Vector3(side * (drop * 0.35 + E * 0.22), 0, 0);
      const pin = P[0].clone().add(new THREE.Vector3(-side * 0.035, -0.018, 0));
      const r0 = ap[0].r * 1.12 + off * 0.7 + drop * 0.1;
      ctrlS.push({ p: [pin.x, pin.y, pin.z], rx: r0 * 0.96, rz: r0 * 0.9, n: 2.2 });
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const s = (want * i) / steps;
        const p = along(s).add(outward.clone().multiplyScalar(1 - i / steps));
        let r = i === 0 ? r0 : rAt(s) + off * 0.62 + 0.009;
        if (!longSleeve && i === steps) r += E * 0.22 + 0.008;
        if (longSleeve && i === steps) r = Math.max(r, rAt(s) + 0.012);
        ctrlS.push({ p: [p.x, p.y, p.z], rx: r, rz: r * 0.94, n: 2.2 });
      }
    }
    const ampS = flat ? 0.003 + E * 0.05 : 0.0018 + E * 0.04;
    const sleeveDisp: DispFn = (th, p, u) => {
      const n = noise3(p.x * 9 + ph, p.y * 9, p.z * 9);
      let d = ampS * n * (0.4 + u);
      if (flat) d += ampS * 0.8 * Math.sin(th * 4 + ph) * u;
      else if (longSleeve) d += ampS * 1.2 * Math.sin(u * 34 + th * 1.5) * smoothstep(0.55, 0.95, u);
      else d += ampS * 0.6 * Math.sin(th * 3 + ph) * u;
      return d * smoothstep(0, 0.12, u);
    };
    const sRings = sampleRings(ctrlS, 0.02);
    const sleeve = loft(sRings, { radial: Math.round(radial * 0.6), disp: sleeveDisp, ao: 0.3 });
    parts.push({ geometry: sleeve.geometry, role: 'fabric', castShadow: true }, { geometry: sleeve.geometry, role: 'inner' });

    // cuff / sleeve hem
    const end = sRings[sRings.length - 1];
    const fr = sleeve.frames[sleeve.frames.length - 1];
    const ec = end.c;
    const T = fr.t;
    const cuffCtrls: Ctrl[] =
      spec.cuff === 'rib'
        ? [
            { p: v3(ec.clone().addScaledVector(T, -0.004)), rx: end.rx * 1.0, rz: end.rz * 1.0, n: 2.2 },
            { p: v3(ec.clone().addScaledVector(T, 0.02)), rx: end.rx * 0.9, rz: end.rz * 0.9, n: 2.2 },
            { p: v3(ec.clone().addScaledVector(T, cuffLen)), rx: end.rx * 0.84, rz: end.rz * 0.84, n: 2.2 },
          ]
        : [
            { p: v3(ec.clone().addScaledVector(T, -0.024)), rx: end.rx + 0.0028, rz: end.rz + 0.0028, n: 2.2 },
            { p: v3(ec.clone().addScaledVector(T, 0.0015)), rx: end.rx + 0.0032, rz: end.rz + 0.0032, n: 2.2 },
          ];
    const cuff = loft(sampleRings(cuffCtrls, 0.01), { radial: Math.round(radial * 0.6), ao: 0 });
    parts.push({ geometry: cuff.geometry, role: spec.cuff === 'rib' ? ribRole : 'fabric' }, { geometry: cuff.geometry, role: 'inner' });
    if (spec.stitch) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 32; k++) pts.push(surfacePoint(cuff, 0.5, (k / 32) * Math.PI * 2, 0.0014).p);
      stitches.push(tube(pts, 0.001, 4));
    }
    if (side === 1) {
      const sp = surfacePoint(cuff, cuff.rings.length * 0.5, HALF_PI, 0.004);
      cuffAnchor = { p: sp.p, n: sp.n };
    }
  }

  // ---------- collar ----------
  let collar: LoftResult | null = null;
  const ring = (dy: number, dw: number, dd: number, n = 2.1): Ctrl => ({ p: [0, neckY + dy, 0], rx: neckW + dw, rz: neckD + dd, n });
  if (spec.collar === 'crew') {
    collar = loft(sampleRings([ring(-0.004, 0.002, 0.002), ring(0.008, -0.001, -0.001), ring(0.016, -0.006, -0.006)], 0.006), { radial, ao: 0 });
    parts.push({ geometry: collar.geometry, role: 'rib' }, { geometry: collar.geometry, role: 'inner' });
  } else if (spec.collar === 'rib') {
    collar = loft(sampleRings([ring(-0.004, 0.003, 0.003), ring(0.016, 0.0, 0.0), ring(0.032, -0.004, -0.004)], 0.006), { radial, ao: 0 });
    parts.push({ geometry: collar.geometry, role: ribRole }, { geometry: collar.geometry, role: 'inner' });
  } else if (spec.collar === 'stand') {
    collar = loft(sampleRings([ring(-0.004, 0.004, 0.004), ring(0.04, 0.009, 0.012), ring(0.078, 0.013, 0.018)], 0.008), { radial, ao: 0 });
    parts.push({ geometry: collar.geometry, role: 'fabric' }, { geometry: collar.geometry, role: 'inner' });
  } else if (spec.collar === 'point') {
    collar = loft(sampleRings([ring(-0.004, 0.003, 0.003), ring(0.024, 0.006, 0.006)], 0.006), { radial, ao: 0 });
    parts.push({ geometry: collar.geometry, role: 'fabric' }, { geometry: collar.geometry, role: 'inner' });
    const leaf = loft(
      sampleRings([ring(0.026, 0.012, 0.012), ring(0.006, 0.04, 0.034, 2.3), ring(-0.032, 0.072, 0.06, 2.5)], 0.006),
      { radial, thetaStart: HALF_PI + 0.42, thetaLength: Math.PI * 2 - 0.84, ao: 0 },
    );
    parts.push({ geometry: leaf.geometry, role: 'fabric' }, { geometry: leaf.geometry, role: 'inner' });
  } else if (spec.collar === 'hood') {
    collar = loft(sampleRings([ring(-0.004, 0.004, 0.004), ring(0.016, 0.008, 0.01), ring(0.03, 0.006, 0.012)], 0.006), { radial, ao: 0 });
    parts.push({ geometry: collar.geometry, role: 'fabric' }, { geometry: collar.geometry, role: 'inner' });
    // hood lying down behind the neck
    const hood = new THREE.SphereGeometry(1, 40, 26);
    const hp = hood.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < hp.count; i++) {
      const x = hp.getX(i);
      const y = hp.getY(i);
      const z = hp.getZ(i);
      const n = noise3(x * 2.4 + ph, y * 2.4, z * 2.4) * 0.09 + Math.sin(y * 6 + x * 3) * 0.03;
      const k = 1 + n;
      hp.setXYZ(i, x * k, y * k, z * k * (z > 0 ? 0.6 : 1));
    }
    if (flat) {
      hood.scale(0.15 + E * 0.4, 0.16, 0.04);
      hood.translate(0, neckY - 0.13, -(chestD + 0.025));
    } else {
      hood.scale(0.15 + E * 0.3, 0.12, 0.07);
      hood.rotateX(-0.35);
      hood.translate(0, L.neckBase.y - 0.035, -(L.neckBase.d + 0.085 + E * 0.4));
    }
    hood.computeVertexNormals();
    parts.push({ geometry: ensureAttrs(hood, 0.92), role: 'fabric', castShadow: true });
    anchors.hood = { p: new THREE.Vector3(0, flat ? neckY - 0.12 : L.neckBase.y - 0.03, flat ? -(chestD + 0.07) : -(L.neckBase.d + 0.16)), n: new THREE.Vector3(0, 0.2, -1).normalize() };
    // drawcords
    const aglets: THREE.Matrix4[] = [];
    for (const s of [1, -1]) {
      const x0 = s * (neckW * 0.42);
      const startP = new THREE.Vector3(x0, neckY - 0.004, neckD + 0.01);
      const low = onTorso(neckY - 0.19, HALF_PI - s * 0.18, 0.012).p;
      const mid = onTorso(neckY - 0.09, HALF_PI - s * 0.14, 0.012).p;
      const pts = [startP, mid, low];
      parts.push({ geometry: tube(pts, 0.0042, 6), role: ribRole });
      const dirDown = low.clone().sub(mid).normalize();
      aglets.push(instance(low.clone().addScaledVector(dirDown, 0.012), dirDown, [0.0052, 0.0052, 0.026]));
      if (s === 1) anchors.drawcord = { p: low.clone().add(new THREE.Vector3(0, 0, 0.01)), n: new THREE.Vector3(0, 0, 1) };
    }
    parts.push({ geometry: UNIT.button, role: 'metal', instances: aglets });
  }
  anchors.collar = { p: new THREE.Vector3(0, neckY + 0.014, neckD + (spec.collar === 'stand' ? 0.016 : 0.006)), n: new THREE.Vector3(0, 0.35, 1).normalize() };

  // ---------- pockets ----------
  if (spec.pockets === 'kangaroo') {
    const yT = Math.min(L.waist.y + 0.01, bodyHemY + 0.19);
    const yB = bodyHemY + 0.012;
    const pr = ringsBetweenY(torso.rings, yT, yB);
    const ranges: [number, number][] = spec.closure === 'zip' ? [[HALF_PI + 0.035, 0.6], [HALF_PI - 0.635, 0.6]] : [[HALF_PI - 0.62, 1.24]];
    for (const [ts, tl] of ranges) {
      const pocket = loft(pr, { radial: 24, thetaStart: ts, thetaLength: tl, offset: 0.0045, disp: torsoDisp, ao: 0.2 });
      parts.push({ geometry: pocket.geometry, role: 'fabric' });
    }
    for (const s of [1, -1]) {
      const edge = HALF_PI + s * 0.62;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 8; k++) {
        const y = lerp(yT, lerp(yT, yB, 0.72), k / 8);
        pts.push(onTorso(y, edge, 0.0068).p);
      }
      parts.push({ geometry: tube(pts, 0.0032, 5), role: ribRole });
    }
    const pa = onTorso(lerp(yT, yB, 0.45), HALF_PI + 0.3, 0.012);
    anchors.pocket = { p: pa.p, n: pa.n };
  } else if (spec.pockets === 'chest-zip') {
    const pts: THREE.Vector3[] = [];
    const nrm: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const y = lerp(L.chest.y + 0.055, L.chest.y - 0.1, k / 10);
      const sp = onTorso(y, HALF_PI - lerp(0.42, 0.56, k / 10), 0.001);
      pts.push(sp.p);
      nrm.push(sp.n);
    }
    pts.reverse();
    nrm.reverse();
    parts.push(...buildZip(pts, nrm, { tape: 0.015, tooth: 0.0038, tapeRole: 'trim', teethRole: 'trim' }));
    anchors.pocket = { p: pts[5].clone().addScaledVector(nrm[5], 0.008), n: nrm[5] };
  } else if (spec.pockets === 'flap-chest') {
    for (const s of [1, -1]) {
      const tc = HALF_PI - s * 0.48;
      const body = loft(ringsBetweenY(torso.rings, L.chest.y + 0.03, L.chest.y - 0.095), { radial: 18, thetaStart: tc - 0.25, thetaLength: 0.5, offset: 0.0042, disp: torsoDisp, ao: 0.15 });
      const flap = loft(ringsBetweenY(torso.rings, L.chest.y + 0.05, L.chest.y + 0.006), { radial: 18, thetaStart: tc - 0.28, thetaLength: 0.56, offset: 0.0085, disp: torsoDisp, ao: 0.15 });
      parts.push({ geometry: body.geometry, role: 'fabric' }, { geometry: flap.geometry, role: 'fabric' }, { geometry: flap.geometry, role: 'inner' });
      const bp = onTorso(L.chest.y + 0.016, tc, 0.013);
      parts.push({ geometry: UNIT.button, role: 'metal', instances: [instance(bp.p, bp.n, [0.0072, 0.0072, 0.004])] });
      if (spec.stitch) {
        const outline: THREE.Vector3[] = [];
        for (let k = 0; k <= 6; k++) outline.push(onTorso(lerp(L.chest.y + 0.006, L.chest.y - 0.088, k / 6), tc - 0.23, 0.0058).p);
        for (let k = 1; k <= 6; k++) outline.push(onTorso(L.chest.y - 0.088, tc - 0.23 + (0.46 * k) / 6, 0.0058).p);
        for (let k = 1; k <= 6; k++) outline.push(onTorso(lerp(L.chest.y - 0.088, L.chest.y + 0.006, k / 6), tc + 0.23, 0.0058).p);
        stitches.push(tube(outline, 0.001, 4));
      }
      if (s === 1) {
        const pa = onTorso(L.chest.y - 0.045, tc, 0.01);
        anchors.pocket = { p: pa.p, n: pa.n };
      }
    }
  } else if (spec.pockets === 'welt') {
    for (const s of [1, -1]) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        pts.push(onTorso(lerp(L.waist.y + 0.03, L.waist.y - 0.09, t), HALF_PI + s * lerp(0.55, 0.8, t), 0.002).p);
      }
      parts.push({ geometry: tube(pts, 0.0042, 6), role: 'trim' });
      if (s === 1) {
        const pa = onTorso(L.waist.y - 0.03, HALF_PI + 0.68, 0.01);
        anchors.pocket = { p: pa.p, n: pa.n };
      }
    }
  }

  // ---------- closure ----------
  const closureBottom = ribH > 0 ? bodyHemY + 0.004 : bodyHemY + 0.006;
  if (spec.closure === 'zip') {
    const pts: THREE.Vector3[] = [];
    const nrm: THREE.Vector3[] = [];
    const steps = 40;
    for (let k = 0; k <= steps; k++) {
      const y = lerp(closureBottom, neckY - 0.002, k / steps);
      const sp = onTorso(y, HALF_PI, 0.0012);
      pts.push(sp.p);
      nrm.push(sp.n);
    }
    if (collar && spec.collar !== 'hood' && spec.collar !== 'crew') {
      const top = spec.collar === 'stand' ? collar.rings.length - 1.2 : collar.rings.length - 1.5;
      for (let k = 1; k <= 6; k++) {
        const sp = surfacePoint(collar, (top * k) / 6, HALF_PI, 0.0012);
        pts.push(sp.p);
        nrm.push(sp.n);
      }
    }
    parts.push(
      ...buildZip(pts, nrm, {
        tape: 0.02,
        tooth: spec.collar === 'stand' ? 0.0042 : 0.0052,
        tapeRole: 'trim',
        teethRole: spec.collar === 'stand' ? 'trim' : 'metal',
      }),
    );
    const zi = Math.round(pts.length * 0.62);
    anchors.zipper = { p: pts[zi].clone().addScaledVector(nrm[zi], 0.01), n: nrm[zi] };
  } else if (spec.closure === 'buttons') {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 30; k++) pts.push(onTorso(lerp(closureBottom - (ribH > 0 ? ribH * 0.85 : 0), neckY - 0.004, k / 30), HALF_PI, 0.0022).p);
    parts.push({ geometry: flatTape(pts, 0.036, 0.003, new THREE.Vector3(0, 0, 1)), role: 'fabric' });
    const btns: THREE.Matrix4[] = [];
    const count = 5;
    for (let k = 0; k < count; k++) {
      const y = lerp(neckY - 0.03, closureBottom - ribH * 0.5, k / (count - 1));
      const sp = onTorso(y, HALF_PI, 0.0062);
      btns.push(instance(sp.p, sp.n, [0.0078, 0.0078, 0.0045]));
      if (k === 1) anchors.button = { p: sp.p.clone().addScaledVector(sp.n, 0.006), n: sp.n };
    }
    parts.push({ geometry: UNIT.button, role: 'metal', instances: btns });
    if (spec.stitch) {
      for (const s of [1, -1]) {
        const line: THREE.Vector3[] = [];
        for (let k = 0; k <= 24; k++) {
          const y = lerp(closureBottom - ribH * 0.85, neckY - 0.006, k / 24);
          const fi = tIdx(y);
          const r = torso.rings[Math.round(clamp(fi, 0, torso.rings.length - 1))];
          const th = thetaForX(r.rx, r.n, 0.017);
          line.push(onTorso(y, s > 0 ? th : Math.PI - th, 0.0042).p);
        }
        stitches.push(tube(line, 0.001, 4));
      }
    }
  }

  // ---------- yoke stitching ----------
  if (spec.stitch) {
    for (const [y, a, b] of [
      [L.chest.y + 0.068, 0.32, Math.PI - 0.32],
      [L.chest.y + 0.05, Math.PI + 0.3, Math.PI * 2 - 0.3],
    ] as [number, number, number][]) {
      for (const dyy of [0, -0.007]) {
        const line: THREE.Vector3[] = [];
        for (let k = 0; k <= 24; k++) line.push(onTorso(y + dyy, lerp(a, b, k / 24), 0.0014).p);
        stitches.push(tube(line, 0.001, 4));
      }
    }
    const sp = onTorso(L.chest.y + 0.064, HALF_PI - 0.75, 0.006);
    anchors.stitch = { p: sp.p, n: sp.n };
  }

  // ---------- anchors ----------
  const chestA = onTorso(L.chest.y - 0.02, HALF_PI - 0.28, 0.008);
  anchors.chest = { p: chestA.p, n: chestA.n };
  const backA = onTorso(L.chest.y - 0.05, Math.PI * 1.5, 0.008);
  anchors.back = { p: backA.p, n: backA.n };
  const shA = onTorso(L.shoulder.y + 0.02, 0.5, 0.008);
  anchors.shoulder = { p: shA.p, n: shA.n.clone().add(new THREE.Vector3(0, 0.6, 0.4)).normalize() };
  const hemA = onTorso(bodyHemY + 0.025, HALF_PI + 0.55, 0.008);
  anchors.hem = { p: hemA.p, n: hemA.n };
  if (cuffAnchor) anchors.cuff = cuffAnchor;
  // NEXORA: chest mark on the wearer's left
  const logoA = onTorso(L.chest.y + 0.035, HALF_PI + 0.42, 0.0035);
  anchors.logo = { p: logoA.p, n: logoA.n };

  if (stitches.length) parts.push({ geometry: mergeGeometries(stitches.map((g) => ensureAttrs(g))) ?? stitches[0], role: 'stitch' });

  return finalize(parts, anchors);
}

const v3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];
