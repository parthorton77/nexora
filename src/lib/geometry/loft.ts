import * as THREE from 'three';

/**
 * Lofting toolkit used to build every procedural garment and mannequin.
 *
 * A loft sweeps a super-ellipse cross-section along a path of rings. Garments
 * are lofts around a "form" (a flat hanger form or an avatar body), so the same
 * builder produces the hanging piece and the worn piece.
 */

export type V3 = [number, number, number];

export interface Ctrl {
  p: V3;
  rx: number;
  rz: number;
  /** super-ellipse exponent (2 = ellipse, higher = boxier) */
  n?: number;
}

export interface Ring {
  c: THREE.Vector3;
  rx: number;
  rz: number;
  n: number;
}

export interface Frame {
  t: THREE.Vector3;
  n1: THREE.Vector3;
  n2: THREE.Vector3;
}

export type DispFn = (theta: number, p: THREE.Vector3, u: number) => number;

export interface LoftOptions {
  radial?: number;
  /** reference axis used to orient cross-sections (default +Z) */
  ref?: THREE.Vector3;
  thetaStart?: number;
  thetaLength?: number;
  /** constant outward offset added to rx/rz */
  offset?: number;
  capStart?: boolean;
  capEnd?: boolean;
  disp?: DispFn;
  /** how much fold valleys darken (vertex colour AO) */
  ao?: number;
}

export interface LoftResult {
  geometry: THREE.BufferGeometry;
  rings: Ring[];
  frames: Frame[];
  opts: LoftOptions;
}

const catmull = (p0: number, p1: number, p2: number, p3: number, t: number) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};

/** Smoothly resample control rings (Catmull-Rom on every parameter). */
export function sampleRings(ctrls: Ctrl[], step = 0.02): Ring[] {
  const out: Ring[] = [];
  const get = (i: number) => ctrls[Math.max(0, Math.min(ctrls.length - 1, i))];
  for (let i = 0; i < ctrls.length - 1; i++) {
    const a = get(i - 1);
    const b = get(i);
    const c = get(i + 1);
    const d = get(i + 2);
    const len = Math.hypot(c.p[0] - b.p[0], c.p[1] - b.p[1], c.p[2] - b.p[2]);
    const steps = Math.max(2, Math.ceil(len / step));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push({
        c: new THREE.Vector3(
          catmull(a.p[0], b.p[0], c.p[0], d.p[0], t),
          catmull(a.p[1], b.p[1], c.p[1], d.p[1], t),
          catmull(a.p[2], b.p[2], c.p[2], d.p[2], t),
        ),
        rx: Math.max(0.0005, catmull(a.rx, b.rx, c.rx, d.rx, t)),
        rz: Math.max(0.0005, catmull(a.rz, b.rz, c.rz, d.rz, t)),
        n: Math.max(1.2, catmull(a.n ?? 2, b.n ?? 2, c.n ?? 2, d.n ?? 2, t)),
      });
    }
  }
  const last = ctrls[ctrls.length - 1];
  out.push({ c: new THREE.Vector3(...last.p), rx: last.rx, rz: last.rz, n: last.n ?? 2 });
  return out;
}

const Z = new THREE.Vector3(0, 0, 1);
const X = new THREE.Vector3(1, 0, 0);

export function computeFrames(rings: Ring[], ref: THREE.Vector3 = Z): Frame[] {
  const frames: Frame[] = [];
  const n = rings.length;
  for (let i = 0; i < n; i++) {
    const t = new THREE.Vector3();
    if (i === 0) t.subVectors(rings[1].c, rings[0].c);
    else if (i === n - 1) t.subVectors(rings[n - 1].c, rings[n - 2].c);
    else t.subVectors(rings[i + 1].c, rings[i - 1].c);
    if (t.lengthSq() < 1e-12) t.copy(frames[i - 1]?.t ?? new THREE.Vector3(0, -1, 0));
    t.normalize();
    const n1 = new THREE.Vector3().crossVectors(ref, t);
    if (n1.lengthSq() < 1e-10) n1.copy(frames[i - 1]?.n1 ?? X);
    n1.normalize();
    const n2 = new THREE.Vector3().crossVectors(t, n1).normalize();
    frames.push({ t, n1, n2 });
  }
  return frames;
}

/** Point on a ring at angle theta (before displacement) + outward direction. */
export function ringPoint(ring: Ring, frame: Frame, theta: number, offset: number, outP: THREE.Vector3, outDir: THREE.Vector3) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const e = 2 / ring.n;
  const cx = Math.sign(c) * Math.pow(Math.abs(c), e);
  const sz = Math.sign(s) * Math.pow(Math.abs(s), e);
  const rx = ring.rx + offset;
  const rz = ring.rz + offset;
  outP.copy(ring.c).addScaledVector(frame.n1, rx * cx).addScaledVector(frame.n2, rz * sz);
  outDir.copy(frame.n1).multiplyScalar(c * rz).addScaledVector(frame.n2, s * rx);
  if (outDir.lengthSq() < 1e-12) outDir.copy(frame.n1);
  outDir.normalize();
}

export function loft(rings: Ring[], opts: LoftOptions = {}): LoftResult {
  const R = opts.radial ?? 48;
  const ts = opts.thetaStart ?? 0;
  const tl = opts.thetaLength ?? Math.PI * 2;
  const full = tl >= Math.PI * 2 - 1e-6;
  const off = opts.offset ?? 0;
  const frames = computeFrames(rings, opts.ref ?? Z);
  const n = rings.length;
  const cols = R + 1;

  const cum = new Float32Array(n);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + rings[i].c.distanceTo(rings[i - 1].c);
  const total = cum[n - 1] || 1;

  const vcount = n * cols + (opts.capStart ? 1 : 0) + (opts.capEnd ? 1 : 0);
  const pos = new Float32Array(vcount * 3);
  const uv = new Float32Array(vcount * 2);
  const col = new Float32Array(vcount * 3);
  const disps = new Float32Array(n * cols);
  const p = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let maxAbs = 1e-6;

  for (let i = 0; i < n; i++) {
    const ring = rings[i];
    const perim = (ring.rx + ring.rz + 2 * off) * 0.5;
    for (let j = 0; j <= R; j++) {
      const theta = ts + (tl * j) / R;
      ringPoint(ring, frames[i], theta, off, p, dir);
      let d = 0;
      if (opts.disp) {
        d = opts.disp(theta, p, cum[i] / total);
        p.addScaledVector(dir, d);
      }
      const k = i * cols + j;
      disps[k] = d;
      if (Math.abs(d) > maxAbs) maxAbs = Math.abs(d);
      pos[k * 3] = p.x;
      pos[k * 3 + 1] = p.y;
      pos[k * 3 + 2] = p.z;
      uv[k * 2] = (theta - ts) * perim;
      uv[k * 2 + 1] = cum[i];
    }
  }

  const ao = opts.ao ?? 0.28;
  for (let k = 0; k < n * cols; k++) {
    const shade = Math.min(1.08, Math.max(0.55, 1 + (disps[k] / maxAbs) * ao * (maxAbs > 0.002 ? 1 : maxAbs / 0.002)));
    col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = shade;
  }

  const index: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < R; j++) {
      const a = i * cols + j;
      const b = (i + 1) * cols + j;
      const c = b + 1;
      const d = a + 1;
      index.push(a, d, b, b, d, c);
    }
  }

  let v = n * cols;
  if (opts.capStart) {
    const c0 = rings[0].c;
    pos.set([c0.x, c0.y, c0.z], v * 3);
    col.set([0.9, 0.9, 0.9], v * 3);
    for (let j = 0; j < R; j++) index.push(v, j + 1, j);
    v++;
  }
  if (opts.capEnd) {
    const c1 = rings[n - 1].c;
    pos.set([c1.x, c1.y, c1.z], v * 3);
    col.set([0.9, 0.9, 0.9], v * 3);
    const base = (n - 1) * cols;
    for (let j = 0; j < R; j++) index.push(v, base + j, base + j + 1);
    v++;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();

  if (full) {
    // weld the seam normals so there is no visible line at theta = 0
    const nrm = geometry.getAttribute('normal') as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) {
      const a = i * cols;
      const b = i * cols + R;
      const nx = nrm.getX(a) + nrm.getX(b);
      const ny = nrm.getY(a) + nrm.getY(b);
      const nz = nrm.getZ(a) + nrm.getZ(b);
      const l = Math.hypot(nx, ny, nz) || 1;
      nrm.setXYZ(a, nx / l, ny / l, nz / l);
      nrm.setXYZ(b, nx / l, ny / l, nz / l);
    }
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, rings, frames, opts };
}

/** Sample a point on an existing loft at fractional ring index + theta, including displacement. */
export function surfacePoint(l: LoftResult, fi: number, theta: number, extra = 0): { p: THREE.Vector3; n: THREE.Vector3 } {
  const n = l.rings.length;
  const i0 = Math.max(0, Math.min(n - 1, Math.floor(fi)));
  const i1 = Math.min(n - 1, i0 + 1);
  const t = Math.max(0, Math.min(1, fi - i0));
  const ring: Ring = {
    c: l.rings[i0].c.clone().lerp(l.rings[i1].c, t),
    rx: l.rings[i0].rx + (l.rings[i1].rx - l.rings[i0].rx) * t,
    rz: l.rings[i0].rz + (l.rings[i1].rz - l.rings[i0].rz) * t,
    n: l.rings[i0].n + (l.rings[i1].n - l.rings[i0].n) * t,
  };
  const frame: Frame = {
    t: l.frames[i0].t.clone().lerp(l.frames[i1].t, t).normalize(),
    n1: l.frames[i0].n1.clone().lerp(l.frames[i1].n1, t).normalize(),
    n2: l.frames[i0].n2.clone().lerp(l.frames[i1].n2, t).normalize(),
  };
  const p = new THREE.Vector3();
  const dir = new THREE.Vector3();
  ringPoint(ring, frame, theta, (l.opts.offset ?? 0) + extra, p, dir);
  if (l.opts.disp) {
    // approximate u along the path
    const d = l.opts.disp(theta, p, fi / Math.max(1, n - 1));
    p.addScaledVector(dir, d);
  }
  return { p, n: dir };
}

/** Fractional ring index where ring centre y crosses the given value (paths that run downward). */
export function indexAtY(rings: Ring[], y: number): number {
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i].c.y;
    const b = rings[i + 1].c.y;
    if ((a >= y && b <= y) || (a <= y && b >= y)) {
      return i + (a === b ? 0 : (y - a) / (b - a));
    }
  }
  return y > rings[0].c.y ? 0 : rings.length - 1;
}

/** Sub-range of rings between two y values (inclusive, interpolated ends). */
export function ringsBetweenY(rings: Ring[], yTop: number, yBottom: number): Ring[] {
  const a = indexAtY(rings, yTop);
  const b = indexAtY(rings, yBottom);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const out: Ring[] = [];
  const at = (fi: number): Ring => {
    const i0 = Math.floor(fi);
    const i1 = Math.min(rings.length - 1, i0 + 1);
    const t = fi - i0;
    return {
      c: rings[i0].c.clone().lerp(rings[i1].c, t),
      rx: rings[i0].rx + (rings[i1].rx - rings[i0].rx) * t,
      rz: rings[i0].rz + (rings[i1].rz - rings[i0].rz) * t,
      n: rings[i0].n + (rings[i1].n - rings[i0].n) * t,
    };
  };
  out.push(at(lo));
  for (let i = Math.ceil(lo); i < hi; i++) if (i > lo) out.push(at(i));
  out.push(at(hi));
  return out.length >= 2 ? out : [at(lo), at(Math.min(rings.length - 1, lo + 1))];
}

/** Thin round tube through points (stitching, cords, piping). */
export function tube(points: THREE.Vector3[], radius: number, radial = 5, segments?: number) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const seg = segments ?? Math.max(8, Math.ceil(curve.getLength() / 0.008));
  return new THREE.TubeGeometry(curve, seg, radius, radial, false);
}

/** Flat strap / tape along a curve. `ref` picks which way the flat face looks. */
export function strap(points: THREE.Vector3[], width: number, thickness: number, ref: THREE.Vector3, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  const count = Math.max(8, Math.ceil(curve.getLength() / 0.01));
  const pts = curve.getSpacedPoints(count);
  const rings: Ring[] = pts.map((c) => ({ c, rx: width / 2, rz: thickness / 2, n: 7 }));
  return loft(rings, { radial: 16, ref, ao: 0 }).geometry;
}

/** Compose a matrix that places a unit object at p, with +Z facing n and +Y along `up`. */
export function placeOnSurface(p: THREE.Vector3, n: THREE.Vector3, up = new THREE.Vector3(0, 1, 0), scale = new THREE.Vector3(1, 1, 1)) {
  const z = n.clone().normalize();
  let y = up.clone().sub(z.clone().multiplyScalar(up.dot(z)));
  if (y.lengthSq() < 1e-8) y = new THREE.Vector3(1, 0, 0);
  y.normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return new THREE.Matrix4().compose(p, q, scale);
}
