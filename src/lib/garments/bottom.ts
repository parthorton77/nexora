import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BottomSpec } from '../../types';
import { legPath, torsoLevels, type BodyFrame } from './body';
import { indexAtY, loft, ringsBetweenY, sampleRings, surfacePoint, tube, type Ctrl, type DispFn, type LoftResult } from '../geometry/loft';
import { noise3 } from '../noise';
import { angleDelta, lerp, smoothstep } from '../math';
import { ensureAttrs, finalize, instance, UNIT, type Anchor, type BuildOpts, type GarmentBuild, type GarmentPart } from './common';

const HALF_PI = Math.PI / 2;

export function buildBottom(spec: BottomSpec, body: BodyFrame, o: BuildOpts): GarmentBuild {
  const parts: GarmentPart[] = [];
  const anchors: Record<string, Anchor> = {};
  const stitches: THREE.BufferGeometry[] = [];
  const radial = o.lite ? 32 : 48;
  const flat = body.flat;
  const E = o.ease;
  const dz = flat ? body.legDepth : 1;
  const seed = o.seed;
  const ph = (seed % 89) * 0.41;
  const L = torsoLevels(body);
  const rise = flat ? 0 : spec.pleats ? 0.02 : 0.32;
  const waistY = flat ? body.waistY : lerp(body.waistY, body.hipY, rise);
  const waistW = lerp(L.waist.w, L.hip.w, flat ? 0 : rise) + 0.008 + E * 0.12;
  const waistD = lerp(L.waist.d, L.hip.d, flat ? 0 : rise) + 0.008 + E * 0.1 * dz;
  const hipW = L.hip.w + 0.009 + E * 0.8;
  const hipD = L.hip.d + 0.009 + E * 0.8 * dz;

  // ---------- upper (seat) ----------
  // the seat never gets deeper than the legs at the crotch, so no bulge shows between them
  const legDepth = (body.thighR + E + 0.01) * dz;
  const crotchD = Math.min(L.crotch.d + 0.01 + E * dz, legDepth * 0.96);
  const upperCtrls: Ctrl[] = [
    { p: [0, waistY, 0], rx: waistW, rz: waistD, n: 2.4 },
    { p: [0, lerp(waistY, body.hipY, 0.5), 0], rx: lerp(waistW, hipW, 0.6), rz: lerp(waistD, hipD, 0.6), n: 2.45 },
    { p: [0, body.hipY, 0], rx: hipW, rz: hipD, n: 2.5 },
    { p: [0, body.crotchY + 0.014, 0], rx: L.crotch.w + 0.012 + E, rz: crotchD, n: 2.5 },
    { p: [0, body.crotchY - 0.03, 0], rx: (L.crotch.w + E) * 0.6, rz: crotchD * 0.55, n: 2.2 },
    { p: [0, body.crotchY - 0.042, 0], rx: 0.02, rz: 0.012, n: 2 },
  ];
  const ampU = flat ? 0.003 + E * 0.05 : 0.0018 + E * 0.04;
  const pleatThetas = [HALF_PI - 0.42, HALF_PI - 0.6, HALF_PI + 0.42, HALF_PI + 0.6];
  const upperDisp: DispFn = (th, p) => {
    let d = ampU * noise3(p.x * 8 + ph, p.y * 6, p.z * 8);
    if (spec.pleats) {
      const k = smoothstep(body.hipY - 0.08, waistY - 0.03, p.y);
      for (const pt of pleatThetas) {
        const a = angleDelta(th, pt);
        d += 0.0055 * k * Math.exp((-a * a) / 0.0012);
      }
    }
    return d * smoothstep(waistY + 0.004, waistY - 0.03, p.y) + (spec.pleats ? 0 : 0);
  };
  const upper = loft(sampleRings(upperCtrls, 0.014), { radial, disp: upperDisp, capEnd: true, ao: 0.25 });
  parts.push({ geometry: upper.geometry, role: 'fabric', castShadow: true }, { geometry: upper.geometry, role: 'inner' });
  const onUpper = (y: number, th: number, extra = 0) => surfacePoint(upper, indexAtY(upper.rings, y), th, extra);

  // ---------- legs ----------
  const hemY = flat
    ? body.ankleY
    : body.ankleY + (spec.hem === 'stacked' ? 0.004 : spec.hem === 'cuffed' ? 0.03 : spec.leg === 'wide' ? 0.008 : 0.02);
  const thighG = body.thighR + E + 0.01;
  let kneeG: number;
  let hemG: number;
  if (spec.leg === 'wide') {
    kneeG = thighG * 1.02;
    hemG = thighG * 1.1;
  } else if (spec.leg === 'tapered') {
    kneeG = Math.max(body.kneeR + E * 0.9 + 0.014, thighG * 0.78);
    hemG = body.ankleR + 0.014 + E * 0.2;
  } else {
    kneeG = Math.max(body.kneeR + E * 0.9 + 0.012, thighG * 0.82);
    hemG = Math.max(body.ankleR + 0.032 + E * 0.4, kneeG * 0.9);
  }
  const ampL = flat ? 0.0028 + E * 0.05 : 0.0016 + E * 0.035;
  let rightLeg: LoftResult | null = null;
  const legs: LoftResult[] = [];
  for (const side of [1, -1] as const) {
    const lp = legPath(body, side);
    const hipP = lp[0];
    const crotchP = lp[1];
    const kneeP = lp[3];
    const ankleP = lp[6];
    const xFor = (x: number, r: number) => side * Math.max(Math.abs(x), r * 0.96);
    const kneeY = kneeP.p[1];
    const hemX = lerp(kneeP.p[0], ankleP.p[0], (kneeY - hemY) / Math.max(0.01, kneeY - ankleP.p[1]));
    const ctrls: Ctrl[] = [
      { p: [xFor(hipP.p[0], thighG * 0.98), body.hipY + 0.03, 0], rx: thighG * 1.02, rz: thighG * 1.02 * dz, n: 2.3 },
      { p: [xFor(crotchP.p[0], thighG), body.crotchY, 0], rx: thighG, rz: thighG * dz, n: 2.3 },
      { p: [xFor(lerp(crotchP.p[0], kneeP.p[0], 0.5), lerp(thighG, kneeG, 0.5)), lerp(body.crotchY, kneeY, 0.5), 0], rx: lerp(thighG, kneeG, 0.5), rz: lerp(thighG, kneeG, 0.5) * dz, n: 2.3 },
      { p: [xFor(kneeP.p[0], kneeG), kneeY, flat ? 0 : 0.006], rx: kneeG, rz: kneeG * dz, n: 2.3 },
      { p: [xFor(hemX, hemG), hemY, 0], rx: hemG, rz: hemG * dz, n: 2.3 },
    ];
    const legDisp: DispFn = (th, p, u) => {
      let d = ampL * noise3(p.x * 7 + ph + side, p.y * 5, p.z * 7) * (0.5 + 0.5 * u);
      if (flat) d += ampL * 0.8 * Math.sin(th * 3 + ph + p.y * 3) * u;
      else d += ampL * 0.6 * Math.sin(th * 2 + p.y * 9 + ph) * u;
      if (spec.crease) {
        const a = angleDelta(th, HALF_PI);
        const b = angleDelta(th, -HALF_PI);
        d += 0.005 * (Math.exp((-a * a) / 0.004) + 0.7 * Math.exp((-b * b) / 0.004));
      }
      if (spec.hem === 'stacked' && !flat) d += 0.0065 * Math.sin(p.y * 80 + th * 2 + side) * smoothstep(hemY + 0.17, hemY + 0.03, p.y);
      if (spec.hem === 'cuffed') d += 0.0045 * Math.sin(th * 11 + p.y * 30) * smoothstep(hemY + 0.14, hemY + 0.05, p.y);
      return d * smoothstep(0, 0.1, u);
    };
    const leg = loft(sampleRings(ctrls, 0.022), { radial: Math.round(radial * 0.75), disp: legDisp, ao: 0.3 });
    legs.push(leg);
    parts.push({ geometry: leg.geometry, role: 'fabric', castShadow: true }, { geometry: leg.geometry, role: 'inner' });
    if (side === 1) rightLeg = leg;

    // hem treatment
    const end = leg.rings[leg.rings.length - 1];
    const T = leg.frames[leg.frames.length - 1].t;
    const ec = end.c;
    const at = (k: number) => ec.clone().addScaledVector(T, k);
    let hemCtrls: Ctrl[];
    if (spec.hem === 'cuffed') {
      hemCtrls = [
        { p: [at(-0.004).x, at(-0.004).y, at(-0.004).z], rx: end.rx, rz: end.rz, n: 2.2 },
        { p: [at(0.02).x, at(0.02).y, at(0.02).z], rx: end.rx * 0.86, rz: end.rz * 0.86, n: 2.2 },
        { p: [at(0.045).x, at(0.045).y, at(0.045).z], rx: end.rx * 0.82, rz: end.rz * 0.82, n: 2.2 },
      ];
    } else {
      hemCtrls = [
        { p: [at(-0.028).x, at(-0.028).y, at(-0.028).z], rx: end.rx + 0.0026, rz: end.rz + 0.0026, n: 2.3 },
        { p: [at(0.0015).x, at(0.0015).y, at(0.0015).z], rx: end.rx + 0.003, rz: end.rz + 0.003, n: 2.3 },
      ];
    }
    const hem = loft(sampleRings(hemCtrls, 0.01), { radial: Math.round(radial * 0.75), ao: 0 });
    parts.push({ geometry: hem.geometry, role: spec.hem === 'cuffed' ? 'rib' : 'fabric' }, { geometry: hem.geometry, role: 'inner' });
    if (side === 1) {
      const ha = surfacePoint(hem, 0.5, HALF_PI + 0.3, 0.006);
      anchors[spec.hem === 'cuffed' ? 'cuff' : 'hem'] = { p: ha.p, n: ha.n };
    }

    // cargo pocket on the outer thigh
    if (spec.pockets === 'cargo') {
      const outer = side === 1 ? 0 : Math.PI;
      const yT = body.crotchY - 0.1;
      const yB = lerp(body.crotchY, kneeY, 0.72);
      const pocket = loft(ringsBetweenY(leg.rings, yT, yB), { radial: 18, thetaStart: outer - 0.52, thetaLength: 1.04, offset: 0.008, disp: legDisp, ao: 0.2 });
      const flap = loft(ringsBetweenY(leg.rings, yT + 0.018, yT - 0.045), { radial: 18, thetaStart: outer - 0.56, thetaLength: 1.12, offset: 0.0135, disp: legDisp, ao: 0.1 });
      parts.push({ geometry: pocket.geometry, role: 'fabric' }, { geometry: flap.geometry, role: 'fabric' }, { geometry: flap.geometry, role: 'inner' });
      const fi = indexAtY(leg.rings, yT - 0.03);
      const sp = surfacePoint(leg, fi, outer, 0.017);
      parts.push({ geometry: UNIT.button, role: 'metal', instances: [instance(sp.p, sp.n, [0.0075, 0.0075, 0.004])] });
      if (side === 1) {
        const pa = surfacePoint(leg, indexAtY(leg.rings, lerp(yT, yB, 0.55)), outer, 0.014);
        anchors.cargo = { p: pa.p, n: pa.n };
        anchors.button = { p: sp.p.clone().addScaledVector(sp.n, 0.006), n: sp.n };
      }
      // bellows stitch outline
      const outline: THREE.Vector3[] = [];
      for (let k = 0; k <= 6; k++) outline.push(surfacePoint(leg, indexAtY(leg.rings, lerp(yT - 0.045, yB + 0.006, k / 6)), outer - 0.48, 0.0115).p);
      for (let k = 1; k <= 6; k++) outline.push(surfacePoint(leg, indexAtY(leg.rings, yB + 0.006), outer - 0.48 + (0.96 * k) / 6, 0.0115).p);
      for (let k = 1; k <= 6; k++) outline.push(surfacePoint(leg, indexAtY(leg.rings, lerp(yB + 0.006, yT - 0.045, k / 6)), outer + 0.48, 0.0115).p);
      stitches.push(tube(outline, 0.001, 4));
    }
  }

  // ---------- waistband ----------
  const wbTop = waistY + 0.003;
  const wbBot = waistY - 0.04;
  const band = loft(
    sampleRings(
      [
        { p: [0, wbTop, 0], rx: waistW + 0.0035, rz: waistD + 0.0035, n: 2.4 },
        { p: [0, wbBot, 0], rx: lerp(waistW, hipW, 0.08) + 0.0035, rz: lerp(waistD, hipD, 0.08) + 0.0035, n: 2.42 },
      ],
      0.01,
    ),
    { radial, ao: 0 },
  );
  parts.push({ geometry: band.geometry, role: 'fabric' }, { geometry: band.geometry, role: 'inner' });
  const onBand = (fy: number, th: number, extra = 0) => surfacePoint(band, fy * (band.rings.length - 1), th, extra);
  const btn = onBand(0.45, HALF_PI, 0.004);
  parts.push({ geometry: UNIT.button, role: 'metal', instances: [instance(btn.p, btn.n, [0.0085, 0.0085, 0.005])] });
  if (!anchors.button) anchors.button = { p: btn.p.clone().addScaledVector(btn.n, 0.006), n: btn.n };
  anchors.waistband = { ...(() => { const s = onBand(0.5, HALF_PI + 0.45, 0.006); return { p: s.p, n: s.n }; })() };

  if (spec.beltLoops) {
    const loops: THREE.Matrix4[] = [];
    for (const th of [HALF_PI - 0.55, HALF_PI + 0.55, HALF_PI - 1.35, HALF_PI + 1.35, -HALF_PI - 0.42, -HALF_PI + 0.42, -HALF_PI]) {
      const s = onBand(0.5, th, 0.0035);
      loops.push(instance(s.p, s.n, [0.011, 0.05, 0.004]));
    }
    parts.push({ geometry: UNIT.box, role: 'fabric', instances: loops });
  }

  // ---------- fly + seams ----------
  const fly: THREE.Vector3[] = [];
  for (let k = 0; k <= 10; k++) fly.push(onUpper(lerp(wbBot - 0.004, body.crotchY + 0.075, k / 10), HALF_PI - 0.085, 0.0014).p);
  for (let k = 1; k <= 4; k++) fly.push(onUpper(body.crotchY + 0.075 - 0.025 * (k / 4), HALF_PI - 0.085 * (1 - k / 4), 0.0014).p);
  stitches.push(tube(fly, 0.001, 4));

  // ---------- pockets ----------
  if (spec.pockets === 'five') {
    for (const s of [1, -1]) {
      const tc = -HALF_PI + s * 0.5;
      const yT = body.hipY + 0.07;
      const yB = body.hipY - 0.075;
      const pk = loft(ringsBetweenY(upper.rings, yT, yB), { radial: 16, thetaStart: tc - 0.27, thetaLength: 0.54, offset: 0.0038, disp: upperDisp, ao: 0.15 });
      parts.push({ geometry: pk.geometry, role: 'fabric' });
      const outline: THREE.Vector3[] = [];
      for (let k = 0; k <= 6; k++) outline.push(onUpper(lerp(yT, yB + 0.012, k / 6), tc - 0.25, 0.0054).p);
      outline.push(onUpper(yB, tc, 0.0054).p);
      for (let k = 0; k <= 6; k++) outline.push(onUpper(lerp(yB + 0.012, yT, k / 6), tc + 0.25, 0.0054).p);
      stitches.push(tube(outline, 0.001, 4));
      const arc: THREE.Vector3[] = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        arc.push(onUpper(yT - 0.035 - Math.sin(t * Math.PI) * 0.022, tc - 0.2 + 0.4 * t, 0.0056).p);
      }
      stitches.push(tube(arc, 0.001, 4));
      if (s === 1) {
        const pa = onUpper(lerp(yT, yB, 0.5), tc, 0.01);
        anchors.backpocket = { p: pa.p, n: pa.n };
      }
    }
  }
  if (spec.pockets === 'five' || spec.pockets === 'slant' || spec.pockets === 'cargo') {
    const rivets: THREE.Matrix4[] = [];
    for (const s of [1, -1]) {
      const curve: THREE.Vector3[] = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        const y = lerp(wbBot - 0.002, body.hipY + (spec.pockets === 'slant' ? 0.0 : 0.035), t);
        const th = HALF_PI + s * lerp(0.62, spec.pockets === 'slant' ? 1.22 : 1.3, Math.pow(t, spec.pockets === 'five' ? 0.6 : 1));
        curve.push(onUpper(y, th, 0.0016).p);
      }
      stitches.push(tube(curve, 0.0012, 4));
      if (spec.rivets) {
        for (const p of [curve[0], curve[curve.length - 1]]) {
          const nn = p.clone().setY(0).normalize();
          rivets.push(instance(p.clone().addScaledVector(nn, 0.002), nn, [0.0042, 0.0042, 0.003]));
        }
      }
      if (s === 1) {
        const pa = onUpper(lerp(wbBot, body.hipY, 0.5), HALF_PI + 0.95, 0.01);
        if (!anchors.pocket) anchors.pocket = { p: pa.p, n: pa.n };
        if (spec.rivets) anchors.rivet = { p: curve[curve.length - 1].clone().add(new THREE.Vector3(0, 0, 0.008)), n: pa.n };
      }
    }
    if (rivets.length) parts.push({ geometry: UNIT.button, role: 'metal', instances: rivets });
  }
  if (spec.pleats) {
    const pa = onUpper(lerp(waistY, body.hipY, 0.35), HALF_PI - 0.42, 0.01);
    anchors.pleat = { p: pa.p, n: pa.n };
  }

  // side seam stitch (shows the construction)
  if (spec.stitch && rightLeg) {
    const seam: THREE.Vector3[] = [];
    for (let k = 0; k <= 30; k++) seam.push(surfacePoint(rightLeg, (k / 30) * (rightLeg.rings.length - 1), 0, 0.0014).p);
    stitches.push(tube(seam, 0.001, 4));
    anchors.stitch = { p: seam[12].clone().add(new THREE.Vector3(0.008, 0, 0)), n: new THREE.Vector3(1, 0, 0.3).normalize() };
  }
  if (rightLeg) {
    const ta = surfacePoint(rightLeg, indexAtY(rightLeg.rings, body.crotchY - 0.11), HALF_PI - 0.2, 0.01);
    anchors.thigh = { p: ta.p, n: ta.n };
  }

  if (stitches.length) parts.push({ geometry: mergeGeometries(stitches.map((g) => ensureAttrs(g))) ?? stitches[0], role: 'stitch' });
  return finalize(parts, anchors);
}
