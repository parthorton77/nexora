import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SneakerSpec } from '../../types';
import { loft, sampleRings, surfacePoint, tube, strap, type Ctrl, type LoftResult } from '../geometry/loft';
import { noise3 } from '../noise';
import { lerp } from '../math';
import { buildZip, ensureAttrs, finalize, instance, UNIT, type Anchor, type BuildOpts, type GarmentBuild, type GarmentPart } from './common';

const HALF_PI = Math.PI / 2;
const Y = new THREE.Vector3(0, 1, 0);

/* ------------------------------------------------------------------ */
/* Sneaker — single shoe, origin at sole bottom centre, toe toward +Z */
/* ------------------------------------------------------------------ */

export function buildSneaker(spec: SneakerSpec, o: BuildOpts): GarmentBuild {
  const parts: GarmentPart[] = [];
  const anchors: Record<string, Anchor> = {};
  const runner = spec.profile === 'runner';
  const radial = o.lite ? 32 : 48;
  const soleH = runner ? 0.03 : 0.032;
  const lift = soleH - 0.004;

  // upper loft from heel (-z) to toe (+z); rx = half width, rz = half height
  const prof: [number, number, number, number][] = runner
    ? [
        [-0.143, 0.054, 0.012, 0.014],
        [-0.136, 0.06, 0.034, 0.042],
        [-0.11, 0.063, 0.043, 0.048],
        [-0.06, 0.06, 0.047, 0.044],
        [0.0, 0.054, 0.05, 0.036],
        [0.06, 0.049, 0.051, 0.029],
        [0.11, 0.045, 0.045, 0.023],
        [0.14, 0.043, 0.03, 0.016],
        [0.153, 0.042, 0.01, 0.006],
      ]
    : [
        [-0.142, 0.052, 0.012, 0.012],
        [-0.135, 0.057, 0.034, 0.037],
        [-0.108, 0.059, 0.042, 0.042],
        [-0.06, 0.056, 0.045, 0.037],
        [0.0, 0.05, 0.048, 0.029],
        [0.06, 0.046, 0.05, 0.023],
        [0.112, 0.043, 0.045, 0.018],
        [0.142, 0.042, 0.031, 0.013],
        [0.156, 0.041, 0.012, 0.006],
      ];
  const ctrls: Ctrl[] = prof.map(([z, y, w, h]) => ({ p: [0, y + lift - 0.02, z], rx: w, rz: h, n: runner ? 2.5 : 2.8 }));
  const rings = sampleRings(ctrls, 0.01);
  const upperDisp = (_th: number, p: THREE.Vector3) => (runner ? 0.0006 : 0.0009) * noise3(p.x * 40, p.y * 40, p.z * 40);
  const upper = loft(rings, { radial, ref: Y, capStart: true, capEnd: true, disp: upperDisp, ao: 0.2 });
  parts.push({ geometry: upper.geometry, role: 'fabric', castShadow: true });
  const at = (z: number) => {
    const zs = upper.rings.map((r) => r.c.z);
    for (let i = 0; i < zs.length - 1; i++) if (z >= zs[i] && z <= zs[i + 1]) return i + (z - zs[i]) / (zs[i + 1] - zs[i]);
    return z < zs[0] ? 0 : zs.length - 1;
  };
  const sub = (z0: number, z1: number) => {
    const i0 = Math.max(0, Math.floor(at(z0)));
    const i1 = Math.min(upper.rings.length - 1, Math.ceil(at(z1)));
    return upper.rings.slice(i0, i1 + 1);
  };

  // overlays: heel counter + toe bumper (+ side cage on the runner)
  const heel = loft(sub(-0.15, -0.06), { radial: 24, ref: Y, thetaStart: Math.PI - 0.32, thetaLength: Math.PI + 0.64, offset: 0.0026, ao: 0 });
  const toe = loft(sub(0.085, 0.156), { radial: 24, ref: Y, thetaStart: Math.PI - 0.1, thetaLength: Math.PI + 0.2, offset: 0.0022, ao: 0 });
  parts.push({ geometry: heel.geometry, role: 'trim' }, { geometry: toe.geometry, role: 'trim' });
  if (runner) {
    for (const [ts, tl] of [
      [-0.62, 0.95],
      [Math.PI - 0.33, 0.95],
    ]) {
      const cage = loft(sub(-0.07, 0.07), { radial: 16, ref: Y, thetaStart: ts, thetaLength: tl, offset: 0.0018, ao: 0 });
      parts.push({ geometry: cage.geometry, role: 'trim' });
    }
  } else {
    // court: perforated toe hint via a slim side stripe
    const stripe = loft(sub(-0.04, 0.05), { radial: 12, ref: Y, thetaStart: -0.18, thetaLength: 0.2, offset: 0.0016, ao: 0 });
    parts.push({ geometry: stripe.geometry, role: 'trim' });
  }

  // sole
  const half = runner
    ? [
        [0.0, -0.152],
        [0.03, -0.146],
        [0.044, -0.122],
        [0.046, -0.08],
        [0.041, -0.03],
        [0.048, 0.02],
        [0.056, 0.07],
        [0.054, 0.112],
        [0.042, 0.146],
        [0.019, 0.164],
      ]
    : [
        [0.0, -0.15],
        [0.032, -0.145],
        [0.046, -0.12],
        [0.048, -0.08],
        [0.045, -0.03],
        [0.051, 0.02],
        [0.057, 0.07],
        [0.056, 0.112],
        [0.046, 0.146],
        [0.022, 0.166],
      ];
  const outline = [...half.map(([x, z]) => new THREE.Vector2(x, z)), new THREE.Vector2(0, half[half.length - 1][1] + 0.004), ...half.slice().reverse().map(([x, z]) => new THREE.Vector2(-x, z))];
  const shape = new THREE.Shape();
  shape.moveTo(outline[0].x, outline[0].y);
  shape.splineThru(outline.slice(1));
  shape.closePath();
  const makeSole = (depth: number, bevel: number, scale: number) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 40 });
    g.rotateX(HALF_PI);
    g.translate(0, depth + bevel, 0);
    g.scale(scale, 1, scale);
    return g;
  };
  const sole = makeSole(soleH - 0.008, 0.004, 1);
  parts.push({ geometry: sole, role: 'sole', castShadow: true });
  const gum = makeSole(0.003, 0.0015, 0.985);
  parts.push({ geometry: gum, role: runner ? 'gum' : 'sole' });
  if (runner) {
    const stripe = makeSole(0.004, 0.001, 1.012);
    stripe.translate(0, soleH * 0.42, 0);
    parts.push({ geometry: stripe, role: 'trim' });
  } else {
    // cupsole stitch line
    const pts = outline.map((v) => new THREE.Vector3(v.x * 1.03, soleH - 0.006, v.y * 1.012));
    parts.push({ geometry: tube([...pts, pts[0]], 0.0009, 4), role: 'stitch' });
  }

  // collar + opening
  const zc = -0.088;
  const topAt = (z: number) => surfacePoint(upper, at(z), HALF_PI, 0).p.y;
  const collarY = topAt(zc) - 0.004;
  const opening = new THREE.CircleGeometry(1, 32);
  opening.rotateX(-HALF_PI);
  opening.scale(0.031, 1, 0.048);
  opening.rotateX(-0.12);
  opening.translate(0, collarY + 0.002, zc);
  parts.push({ geometry: opening, role: 'dark' });
  const collar = new THREE.TorusGeometry(1, 0.18, 10, 40);
  collar.rotateX(HALF_PI);
  collar.scale(0.034, 0.05, 0.052);
  collar.rotateX(-0.12);
  collar.translate(0, collarY + 0.002, zc);
  parts.push({ geometry: collar, role: runner ? 'fabric' : 'trim' });

  // tongue
  const tongue = new THREE.CapsuleGeometry(1, 2, 6, 12);
  tongue.rotateX(HALF_PI);
  tongue.scale(0.021, 0.0045, 0.03);
  tongue.rotateX(0.22);
  tongue.translate(0, topAt(-0.03) + 0.01, -0.03);
  parts.push({ geometry: tongue, role: runner ? 'trim' : 'fabric' });

  // laces
  const laces: THREE.Matrix4[] = [];
  const laceUnit = new THREE.CapsuleGeometry(0.0026, 0.04, 4, 8);
  laceUnit.rotateZ(HALF_PI);
  for (let i = 0; i < 6; i++) {
    const z = lerp(-0.045, 0.06, i / 5);
    const y = topAt(z) + 0.0035;
    for (const s of [1, -1]) {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(0, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.18, s * 0.38, 0)),
        new THREE.Vector3(1, 1, 1),
      );
      laces.push(m);
    }
  }
  parts.push({ geometry: ensureAttrs(laceUnit), role: runner ? 'sole' : 'trim', instances: laces });

  // heel tab
  parts.push({ geometry: UNIT.box, role: 'trim', instances: [instance(new THREE.Vector3(0, collarY - 0.006, -0.146), new THREE.Vector3(0, 0, -1), [0.02, 0.032, 0.004])] });

  const side = surfacePoint(upper, at(0.0), 0.15, 0.006);
  anchors.upper = { p: side.p, n: side.n };
  anchors.sole = { p: new THREE.Vector3(0.056, soleH * 0.5, 0.03), n: new THREE.Vector3(1, 0, 0.2).normalize() };
  anchors.heel = { p: new THREE.Vector3(0, collarY - 0.02, -0.152), n: new THREE.Vector3(0, 0.2, -1).normalize() };
  anchors.laces = { p: new THREE.Vector3(0, topAt(0.02) + 0.012, 0.02), n: new THREE.Vector3(0, 1, 0.3).normalize() };
  anchors.toe = { p: new THREE.Vector3(0, topAt(0.12) + 0.004, 0.13), n: new THREE.Vector3(0, 0.6, 1).normalize() };
  return finalize(parts, anchors);
}

/* ------------------------------------------------------------------ */
/* Cap — origin at the centre of the crown rim                         */
/* ------------------------------------------------------------------ */

export function buildCap(o: BuildOpts): GarmentBuild {
  const parts: GarmentPart[] = [];
  const anchors: Record<string, Anchor> = {};
  const rx = 0.094;
  const ry = 0.088;
  const rz = 0.104;
  const crown = new THREE.SphereGeometry(1, o.lite ? 32 : 56, 20, 0, Math.PI * 2, 0, HALF_PI);
  const cp = crown.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i);
    const y = cp.getY(i);
    const z = cp.getZ(i);
    const front = Math.max(0, z) * 0.06;
    const k = 1 + noise3(x * 3, y * 3, z * 3) * 0.012;
    cp.setXYZ(i, x * rx * k, y * ry * (1 + front) * k, z * rz * k);
  }
  crown.computeVertexNormals();
  parts.push({ geometry: ensureAttrs(crown), role: 'fabric', castShadow: true }, { geometry: crown, role: 'inner' });
  const onCrown = (theta: number, phi: number, extra = 0) => {
    const s = Math.sin(theta);
    const n = new THREE.Vector3(s * Math.cos(phi) / rx, Math.cos(theta) / ry, s * Math.sin(phi) / rz).normalize();
    const p = new THREE.Vector3(rx * s * Math.cos(phi), ry * Math.cos(theta) * (1 + Math.max(0, s * Math.sin(phi)) * 0.06), rz * s * Math.sin(phi));
    return { p: p.addScaledVector(n, extra), n };
  };
  // panel seams
  const seams: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 6; k++) {
    const phi = HALF_PI + (k * Math.PI) / 3;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) pts.push(onCrown(0.06 + (i / 16) * (HALF_PI - 0.08), phi, 0.0012).p);
    seams.push(ensureAttrs(tube(pts, 0.0011, 4)));
  }
  parts.push({ geometry: mergeGeometries(seams) ?? seams[0], role: 'stitch' });
  // eyelets
  const eyelets: THREE.Matrix4[] = [];
  for (let k = 0; k < 6; k++) {
    const phi = HALF_PI + (k + 0.5) * (Math.PI / 3);
    const e = onCrown(0.55, phi, 0.0008);
    eyelets.push(instance(e.p, e.n, [0.0042, 0.0042, 0.0042]));
  }
  parts.push({ geometry: UNIT.torus, role: 'trim', instances: eyelets });
  // button
  parts.push({ geometry: UNIT.sphere, role: 'fabric', instances: [new THREE.Matrix4().compose(new THREE.Vector3(0, ry + 0.002, 0), new THREE.Quaternion(), new THREE.Vector3(0.011, 0.005, 0.011))] });

  // brim: region between the crown ellipse and a larger front arc
  const pts: THREE.Vector2[] = [];
  const a0 = 0.08;
  const a1 = Math.PI - 0.08;
  for (let i = 0; i <= 30; i++) {
    const a = lerp(a0, a1, i / 30);
    pts.push(new THREE.Vector2(Math.cos(a) * (rx + 0.004), Math.sin(a) * (rz + 0.078)));
  }
  for (let i = 30; i >= 0; i--) {
    const a = lerp(a0, a1, i / 30);
    pts.push(new THREE.Vector2(Math.cos(a) * rx * 0.97, Math.sin(a) * rz * 0.97));
  }
  const brim = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2, curveSegments: 12 });
  brim.rotateX(HALF_PI);
  const bp = brim.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i);
    const z = bp.getZ(i);
    bp.setY(i, bp.getY(i) + 0.006 - 2.4 * x * x - Math.max(0, z - rz) * 0.18);
  }
  brim.computeVertexNormals();
  parts.push({ geometry: ensureAttrs(brim), role: 'fabric', castShadow: true });

  // back strap
  const strapPts = [-0.6, -0.3, 0, 0.3, 0.6].map((a) => new THREE.Vector3(Math.sin(a) * rx * 1.01, 0.012, -Math.cos(a) * rz * 1.01));
  parts.push({ geometry: strap(strapPts, 0.014, 0.003, new THREE.Vector3(0, 0, -1)), role: 'trim' });
  parts.push({ geometry: UNIT.box, role: 'metal', instances: [instance(new THREE.Vector3(0.0, 0.012, -rz * 1.03), new THREE.Vector3(0, 0, -1), [0.016, 0.012, 0.003])] });

  const seamA = onCrown(0.9, HALF_PI + Math.PI / 3, 0.006);
  anchors.seam = { p: seamA.p, n: seamA.n };
  const eyeA = onCrown(0.55, HALF_PI + 0.5 * (Math.PI / 3), 0.006);
  anchors.eyelet = { p: eyeA.p, n: eyeA.n };
  anchors.brim = { p: new THREE.Vector3(0.03, 0.004, rz + 0.05), n: new THREE.Vector3(0, 1, 0.4).normalize() };
  anchors.crown = { p: onCrown(0.6, HALF_PI, 0.006).p, n: onCrown(0.6, HALF_PI).n };
  return finalize(parts, anchors);
}

/* ------------------------------------------------------------------ */
/* Sling bag — origin at the bottom centre                              */
/* ------------------------------------------------------------------ */

export function buildBag(o: BuildOpts, wornStrap?: THREE.Vector3[]): GarmentBuild {
  const parts: GarmentPart[] = [];
  const anchors: Record<string, Anchor> = {};
  const radial = o.lite ? 32 : 48;
  const prof: [number, number, number][] = [
    [-0.168, 0.012, 0.02],
    [-0.16, 0.034, 0.058],
    [-0.13, 0.045, 0.076],
    [-0.06, 0.05, 0.084],
    [0.0, 0.051, 0.085],
    [0.06, 0.05, 0.084],
    [0.13, 0.045, 0.076],
    [0.16, 0.034, 0.058],
    [0.168, 0.012, 0.02],
  ];
  // path along +x: n1 = -z (depth), n2 = +y (height)
  const ctrls: Ctrl[] = prof.map(([x, d, h]) => ({ p: [x, h, 0], rx: d, rz: h, n: 2.7 }));
  const disp = (_th: number, p: THREE.Vector3) => 0.0012 * noise3(p.x * 30, p.y * 30, p.z * 30);
  const bodyL: LoftResult = loft(sampleRings(ctrls, 0.01), { radial, ref: Y, capStart: true, capEnd: true, disp, ao: 0.2 });
  parts.push({ geometry: bodyL.geometry, role: 'fabric', castShadow: true });
  const fi = (x: number) => {
    const xs = bodyL.rings.map((r) => r.c.x);
    for (let i = 0; i < xs.length - 1; i++) if (x >= xs[i] && x <= xs[i + 1]) return i + (x - xs[i]) / (xs[i + 1] - xs[i]);
    return 0;
  };
  // front pocket (front = theta PI → +z)
  const i0 = Math.floor(fi(-0.11));
  const i1 = Math.ceil(fi(0.11));
  const pocket = loft(bodyL.rings.slice(i0, i1 + 1), { radial: 20, ref: Y, thetaStart: Math.PI - 0.15, thetaLength: 1.05, offset: 0.006, ao: 0.1 });
  parts.push({ geometry: pocket.geometry, role: 'trim' });
  // main zip along the top-front
  const zPts: THREE.Vector3[] = [];
  const zN: THREE.Vector3[] = [];
  for (let k = 0; k <= 20; k++) {
    const sp = surfacePoint(bodyL, fi(lerp(-0.13, 0.13, k / 20)), HALF_PI + 0.35, 0.001);
    zPts.push(sp.p);
    zN.push(sp.n);
  }
  parts.push(...buildZip(zPts, zN, { tape: 0.018, tooth: 0.0042, tapeRole: 'trim', teethRole: 'trim' }));
  // pocket zip
  const pzPts: THREE.Vector3[] = [];
  const pzN: THREE.Vector3[] = [];
  for (let k = 0; k <= 12; k++) {
    const sp = surfacePoint(bodyL, fi(lerp(-0.1, 0.1, k / 12)), Math.PI - 0.14, 0.007);
    pzPts.push(sp.p);
    pzN.push(sp.n);
  }
  parts.push(...buildZip(pzPts, pzN, { tape: 0.012, tooth: 0.0034, tapeRole: 'trim', teethRole: 'trim' }));
  // logo patch
  const lp = surfacePoint(bodyL, fi(0.06), Math.PI + 0.45, 0.0075);
  parts.push({ geometry: UNIT.box, role: 'metal', instances: [instance(lp.p, lp.n, [0.03, 0.012, 0.002])] });

  // strap
  const strapPts =
    wornStrap ??
    [
      new THREE.Vector3(-0.166, 0.07, -0.01),
      new THREE.Vector3(-0.22, 0.012, -0.08),
      new THREE.Vector3(-0.12, 0.006, -0.17),
      new THREE.Vector3(0.12, 0.006, -0.17),
      new THREE.Vector3(0.22, 0.012, -0.08),
      new THREE.Vector3(0.166, 0.07, -0.01),
    ];
  const strapRef = wornStrap ? new THREE.Vector3(0, 0, 1) : Y;
  parts.push({ geometry: strap(strapPts, 0.03, 0.003, strapRef), role: 'trim', castShadow: true });
  // buckle on the strap
  const bIdx = Math.floor(strapPts.length / 2);
  const bA = strapPts[bIdx - 1];
  const bB = strapPts[bIdx];
  const buckleP = bA.clone().lerp(bB, 0.5);
  const tangent = bB.clone().sub(bA).normalize();
  const bn = wornStrap ? new THREE.Vector3(0, 0, 1) : Y.clone();
  parts.push({ geometry: UNIT.box, role: 'metal', instances: [instance(buckleP.clone().addScaledVector(bn, 0.004), bn, [0.04, 0.026, 0.006], tangent)] });

  anchors.zipper = { p: zPts[13].clone().addScaledVector(zN[13], 0.008), n: zN[13] };
  const pa = surfacePoint(bodyL, fi(-0.04), Math.PI + 0.25, 0.012);
  anchors.pocket = { p: pa.p, n: pa.n };
  anchors.buckle = { p: buckleP.clone().addScaledVector(bn, 0.012), n: bn };
  const ba = surfacePoint(bodyL, fi(0.1), Math.PI + 0.7, 0.008);
  anchors.body = { p: ba.p, n: ba.n };
  return finalize(parts, anchors);
}
