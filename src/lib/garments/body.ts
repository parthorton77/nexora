import type { BodyProfile } from '../../types';
import { deg, lerp } from '../math';
import type { V3 } from '../geometry/loft';

/**
 * A body "form": the surface garments are lofted around. Avatars produce a
 * form from measurements; the hanger forms are flat stand-ins that make the
 * same garments read as pieces hanging on a rail.
 */
export interface BodyFrame {
  neckY: number;
  shoulderY: number;
  chestY: number;
  waistY: number;
  hipY: number;
  crotchY: number;
  kneeY: number;
  ankleY: number;
  /** half width / half depth */
  neck: [number, number];
  shoulderX: number;
  chest: [number, number];
  waist: [number, number];
  hip: [number, number];
  legX: number;
  kneeX: number;
  ankleX: number;
  thighR: number;
  kneeR: number;
  calfR: number;
  ankleR: number;
  /** leg cross-section depth ratio (1 round, <1 flattened on a hanger) */
  legDepth: number;
  arm: { shoulder: V3; elbow: V3; wrist: V3; r: [number, number, number] };
  head: { c: V3; r: V3 };
  footLength: number;
  /** true for hanger forms */
  flat: boolean;
  heightM: number;
}

export interface Level {
  y: number;
  w: number;
  d: number;
  n: number;
}

const ellipseHalf = (circCm: number, ratio: number): [number, number] => {
  const C = circCm / 100;
  const a = C / (2 * Math.PI * Math.sqrt((1 + ratio * ratio) / 2));
  return [a, a * ratio];
};

export function bodyFromProfile(m: BodyProfile): BodyFrame {
  const H = m.heightCm / 100;
  const s = H / 1.75;
  const chest = ellipseHalf(m.chestCm, 0.7);
  const waist = ellipseHalf(m.waistCm, 0.76);
  const hip = ellipseHalf(m.hipCm, 0.74);
  const neck = ellipseHalf(m.chestCm * 0.4, 0.92);
  const shoulderY = 0.815 * H;
  const shoulderX = Math.max(0.113 * H, chest[0] + 0.03);
  const thighR = (m.hipCm * 0.58) / 100 / (2 * Math.PI);
  const upperArmR = (m.chestCm * 0.3) / 100 / (2 * Math.PI);
  const legX = hip[0] * 0.5;

  const shoulder: V3 = [shoulderX - 0.02, shoulderY - 0.04, 0];
  const a1 = deg(21);
  const elbow: V3 = [shoulder[0] + Math.sin(a1) * 0.186 * H, shoulder[1] - Math.cos(a1) * 0.186 * H, -0.01];
  const a2 = deg(15);
  const wrist: V3 = [elbow[0] + Math.sin(a2) * 0.146 * H, elbow[1] - Math.cos(a2) * 0.146 * H, 0.03];

  return {
    neckY: 0.838 * H,
    shoulderY,
    chestY: 0.72 * H,
    waistY: 0.615 * H,
    hipY: 0.522 * H,
    crotchY: 0.468 * H,
    kneeY: 0.285 * H,
    ankleY: 0.045 * H,
    neck,
    shoulderX,
    chest,
    waist,
    hip,
    legX,
    kneeX: legX * 0.82,
    ankleX: legX * 0.78,
    thighR,
    kneeR: thighR * 0.64,
    calfR: thighR * 0.66,
    ankleR: thighR * 0.4,
    legDepth: 1,
    arm: { shoulder, elbow, wrist, r: [upperArmR, upperArmR * 0.76, upperArmR * 0.56] },
    head: { c: [0, H - 0.072 * H, 0.005], r: [0.074 * s, 0.112 * s, 0.093 * s] },
    footLength: m.footCm / 100,
    flat: false,
    heightM: H,
  };
}

/** Flat form for tops on a rail (origin = hanger hook, garment hangs in -y). */
export const HANGER_TOP: BodyFrame = {
  neckY: -0.035,
  shoulderY: -0.085,
  chestY: -0.22,
  waistY: -0.47,
  hipY: -0.6,
  crotchY: -0.72,
  kneeY: -1.0,
  ankleY: -1.3,
  neck: [0.068, 0.03],
  shoulderX: 0.19,
  chest: [0.2, 0.042],
  waist: [0.196, 0.039],
  hip: [0.2, 0.042],
  legX: 0.1,
  kneeX: 0.1,
  ankleX: 0.1,
  thighR: 0.1,
  kneeR: 0.08,
  calfR: 0.08,
  ankleR: 0.07,
  legDepth: 0.5,
  arm: { shoulder: [0.18, -0.12, 0], elbow: [0.24, -0.38, 0.01], wrist: [0.27, -0.62, 0.02], r: [0.06, 0.05, 0.04] },
  head: { c: [0, 0.1, 0], r: [0.08, 0.11, 0.09] },
  footLength: 0.27,
  flat: true,
  heightM: 1.75,
};

/** Flat form for trousers on a clip hanger (origin = clip line). */
export const HANGER_BOTTOM: BodyFrame = {
  ...HANGER_TOP,
  waistY: -0.04,
  hipY: -0.2,
  crotchY: -0.31,
  kneeY: -0.66,
  ankleY: -0.98,
  waist: [0.188, 0.04],
  hip: [0.205, 0.048],
  legX: 0.102,
  kneeX: 0.104,
  ankleX: 0.106,
  thighR: 0.1,
  kneeR: 0.084,
  calfR: 0.082,
  ankleR: 0.072,
  legDepth: 0.45,
};

export function torsoLevels(b: BodyFrame) {
  return {
    neckTop: { y: b.neckY + 0.075, w: b.neck[0] * 0.92, d: b.neck[1] * 0.92, n: 2 },
    neckBase: { y: b.neckY, w: b.neck[0], d: b.neck[1], n: 2 },
    shoulderTop: { y: b.shoulderY + 0.006, w: lerp(b.neck[0], b.shoulderX, 0.62), d: lerp(b.neck[1], b.chest[1], 0.78), n: 2.2 },
    shoulder: { y: b.shoulderY - 0.035, w: b.shoulderX - 0.004, d: b.chest[1] * 0.9, n: 2.4 },
    chest: { y: b.chestY, w: b.chest[0], d: b.chest[1], n: 2.2 },
    waist: { y: b.waistY, w: b.waist[0], d: b.waist[1], n: 2.1 },
    hip: { y: b.hipY, w: b.hip[0], d: b.hip[1], n: 2.2 },
    crotch: { y: b.crotchY + 0.03, w: b.hip[0] * 0.93, d: b.hip[1] * 0.9, n: 2.2 },
  } satisfies Record<string, Level>;
}

export interface LimbPoint {
  p: V3;
  r: number;
}

export function legPath(b: BodyFrame, side: 1 | -1): LimbPoint[] {
  const midCalfX = lerp(b.kneeX, b.ankleX, 0.4);
  return [
    { p: [side * b.legX * 0.9, b.hipY + 0.04, 0], r: b.thighR * 1.08 },
    { p: [side * b.legX, b.crotchY, 0], r: b.thighR },
    { p: [side * b.kneeX, b.kneeY + 0.07, 0], r: b.kneeR * 1.1 },
    { p: [side * b.kneeX, b.kneeY, 0.006], r: b.kneeR },
    { p: [side * midCalfX, b.kneeY - 0.11, -0.006], r: b.calfR },
    { p: [side * b.ankleX, b.ankleY + 0.05, 0], r: b.ankleR },
    { p: [side * b.ankleX, b.ankleY, 0], r: b.ankleR * 0.96 },
  ];
}

export function armPath(b: BodyFrame, side: 1 | -1): LimbPoint[] {
  const m = (v: V3): V3 => [v[0] * side, v[1], v[2]];
  return [
    { p: m(b.arm.shoulder), r: b.arm.r[0] * 1.12 },
    { p: m(b.arm.elbow), r: b.arm.r[1] },
    { p: m(b.arm.wrist), r: b.arm.r[2] },
  ];
}
