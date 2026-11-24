import * as THREE from 'three';
import { tube } from '../geometry/loft';
import { ensureAttrs, finalize, instance, UNIT, type Anchor, type BuildOpts, type GarmentBuild, type GarmentPart } from './common';

/**
 * Wraparound shield shades (NEXORA addition to the fitverse builders).
 * Origin at the centre of the lens band, facing +Z.
 */
export function buildShades(o: BuildOpts): GarmentBuild {
  const parts: GarmentPart[] = [];
  const anchors: Record<string, Anchor> = {};
  const R = 0.092;
  const H = 0.05;
  const span = 1.12;
  const radial = o.lite ? 28 : 56;

  // ---------- lens: a cylinder strip wrapped round the face, with a nose notch ----------
  const lens = new THREE.CylinderGeometry(R, R * 0.97, H, radial, 6, true, -span, span * 2);
  const lp = lens.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i);
    let y = lp.getY(i);
    const z = lp.getZ(i);
    const below = y < 0 ? (-y / (H / 2)) : 0;
    // nose bridge notch and upswept lower corners
    y += below * (0.024 * Math.exp(-Math.pow(x / 0.02, 2)) + 0.012 * Math.pow(Math.abs(x) / R, 2.2));
    // slight forward rake at the top
    const zz = z + (y > 0 ? (y / (H / 2)) * 0.004 : 0);
    lp.setXYZ(i, x, y, zz - R);
  }
  lens.computeVertexNormals();
  parts.push({ geometry: ensureAttrs(lens), role: 'lens', castShadow: true });

  // ---------- brow bar along the top edge ----------
  const brow: THREE.Vector3[] = [];
  for (let k = 0; k <= 32; k++) {
    const a = -span + (k / 32) * span * 2;
    brow.push(new THREE.Vector3(Math.sin(a) * (R + 0.002), H / 2 + 0.002, Math.cos(a) * (R + 0.002) - R));
  }
  parts.push({ geometry: ensureAttrs(tube(brow, 0.0036, 6)), role: 'trim' });

  // ---------- temples ----------
  const hinges: THREE.Matrix4[] = [];
  const temples: THREE.Matrix4[] = [];
  for (const s of [1, -1]) {
    const hx = Math.sin(span) * R * s;
    const hz = Math.cos(span) * R - R;
    hinges.push(instance(new THREE.Vector3(hx, H / 2 - 0.006, hz), new THREE.Vector3(s, 0, 0), [0.008, 0.014, 0.01]));
    const len = 0.13;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(hx + s * 0.004, H / 2 - 0.008, hz - len / 2),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06, s * 0.04, 0)),
      new THREE.Vector3(0.004, 0.011, len),
    );
    temples.push(m);
  }
  parts.push({ geometry: UNIT.box, role: 'metal', instances: hinges });
  parts.push({ geometry: UNIT.box, role: 'trim', instances: temples });

  // ---------- nose pads ----------
  const pads = [1, -1].map((s) =>
    new THREE.Matrix4().compose(new THREE.Vector3(s * 0.011, -0.006, -0.012), new THREE.Quaternion(), new THREE.Vector3(0.004, 0.007, 0.003)),
  );
  parts.push({ geometry: UNIT.sphere, role: 'trim', instances: pads });

  anchors.lens = { p: new THREE.Vector3(0.034, 0.004, -0.004), n: new THREE.Vector3(0.3, 0, 1).normalize() };
  anchors.hinge = { p: new THREE.Vector3(Math.sin(span) * R + 0.01, H / 2 - 0.006, Math.cos(span) * R - R), n: new THREE.Vector3(1, 0.2, 0.2).normalize() };
  anchors.logo = { p: new THREE.Vector3(Math.sin(span) * R + 0.008, H / 2 - 0.008, Math.cos(span) * R - R - 0.04), n: new THREE.Vector3(1, 0, 0) };
  anchors.brow = { p: new THREE.Vector3(-0.03, H / 2 + 0.006, 0.0), n: new THREE.Vector3(0, 0.8, 0.6).normalize() };
  return finalize(parts, anchors);
}
