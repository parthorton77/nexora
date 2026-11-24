import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import type { DimensionDef } from '../data/dimensions';
import { PRODUCT_BY_ID } from '../data/products';
import type { ZoneId } from '../types';
import { displayKind, garmentOf } from '../lib/garments';
import { displayScale, productBuild } from '../lib/models';
import { damp } from '../lib/math';
import { useExperience } from '../store/experienceStore';
import { motion } from '../store/motion';
import { rig, setShot } from '../store/rig';
import { fly } from '../components/experience/flight';
import { INSPECT, zoneAngle, zoneFrame, zoneToWorld } from '../components/fashion/layout';
import { displayNodes } from '../components/product/DisplayItem';
import { PAIR_X, ProductVisual } from '../components/product/ProductVisual';
import { Hotspots } from '../components/product/Hotspots';
import { glow } from '../components/fashion/fixtures';

const FOV = 38;
const tmpM = new THREE.Matrix4();
const tmpP = new THREE.Vector3();

interface Pose {
  p: THREE.Vector3;
  q: THREE.Quaternion;
  s: THREE.Vector3;
}

/** Camera framing for an inspected product (zone-local), respecting zoom, aspect and the side panel. */
export function inspectShot(angle: number, size: THREE.Vector3, zoom: number, aspect: number, panelShift: boolean) {
  const half = THREE.MathUtils.degToRad(FOV / 2);
  const rv = Math.max(size.y, size.z * 0.6) / 2;
  const rh = Math.max(size.x, size.z * 0.8) / 2;
  const dv = rv / Math.tan(half);
  const dh = rh / (Math.tan(half) * Math.max(0.35, aspect));
  const portrait = aspect < 0.8;
  const d = (Math.max(dv, dh) * (portrait ? 2.1 : 1.85) + size.z * 0.5) * zoom;
  const shift = panelShift ? d * 0.2 : 0;
  return {
    pos: zoneToWorld(angle, { x: shift, y: INSPECT[1] + 0.06 * zoom, z: INSPECT[2] + d }),
    look: zoneToWorld(angle, { x: shift, y: INSPECT[1] - (portrait ? d * Math.tan(half) * 0.46 : 0), z: INSPECT[2] }),
  };
}

/**
 * PRODUCT REALITY. The selected product detaches from its display, travels
 * to a dedicated viewing position in front of the camera while the hall dims,
 * then becomes a 360° object: drag to rotate (with inertia), wheel/pinch to
 * zoom, presets, hotspots. Closing returns it to the exact slot it came from.
 */
export default function ProductScene({ dim }: { dim: DimensionDef }) {
  const mode = useExperience((s) => s.mode);
  const selectedId = useExperience((s) => s.selectedId);
  const quality = useExperience((s) => s.quality);
  const [current, setCurrent] = useState<{ id: string; zone: ZoneId } | null>(null);
  const stage = useRef<THREE.Group>(null);
  const carrier = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const veil = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const anim = useRef({ t: 0 });
  const ready = useRef(0);
  const from = useRef<Pose>({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1) });
  const to = useRef<Pose>({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1) });
  const tween = useRef<gsap.core.Tween | null>(null);
  const busy = useRef(false);
  const size = useThree((s) => s.size);

  const product = current ? PRODUCT_BY_ID[current.id] : undefined;
  const lite = quality === 'lite';
  const build = useMemo(() => (product ? productBuild(product, lite) : undefined), [product, lite]);
  const scale = product && build ? (displayKind(product) === 'stand' ? displayScale(product, build) * (product.model.type === 'tech' ? 0.85 : 1.05) : 1) : 1;
  const angle = current ? zoneAngle(dim, current.zone) : 0;
  const pair = !!product && garmentOf(product)?.kind === 'sneaker';
  const frame = zoneFrame(angle);

  /** display node pose expressed in stage space */
  const displayPose = (id: string, out: Pose) => {
    const node = displayNodes.get(id);
    const st = stage.current;
    if (!node || !st) return false;
    st.updateWorldMatrix(true, false);
    node.updateWorldMatrix(true, false);
    tmpM.copy(st.matrixWorld).invert().multiply(node.matrixWorld);
    tmpM.decompose(out.p, out.q, out.s);
    return true;
  };

  const extract = (id: string, zone: ZoneId) => {
    const p = PRODUCT_BY_ID[id];
    const b = productBuild(p, lite);
    const sc = displayKind(p) === 'stand' ? displayScale(p, b) * (p.model.type === 'tech' ? 0.85 : 1.05) : 1;
    // stage sits in the zone frame, so its pose can be computed before React re-renders
    const a = zoneAngle(dim, zone);
    const f = zoneFrame(a);
    stage.current?.position.copy(f.position);
    stage.current?.rotation.set(0, f.rotationY, 0);
    if (!displayPose(id, from.current)) {
      from.current.p.set(0, 1.6, 0);
      from.current.q.identity();
      from.current.s.setScalar(sc);
    }
    to.current.q.identity();
    to.current.s.setScalar(sc);
    to.current.p.set(INSPECT[0], INSPECT[1], INSPECT[2]).sub(b.center.clone().multiplyScalar(sc));
    anim.current.t = 0;
    ready.current = 0;
    busy.current = true;
    setCurrent({ id, zone });
    useExperience.setState({ extractedId: id });
    const reduced = useExperience.getState().reducedMotion;
    tween.current?.kill();
    tween.current = gsap.to(anim.current, {
      t: 1,
      duration: reduced ? 0.01 : 1.35,
      ease: 'power3.inOut',
      onComplete: () => {
        busy.current = false;
      },
    });
    gsap.to(motion.focus, { value: 1, duration: reduced ? 0.01 : 1.1, ease: 'power2.out' });
    const shot = inspectShot(a, b.size.clone().multiplyScalar(sc), 1, size.width / size.height, size.width > 900);
    void fly(shot.pos, shot.look, { duration: 1.4, ease: 'power2.inOut', fov: FOV });
  };

  const putBack = (id: string, sameZone: boolean, then?: () => void) => {
    const reduced = useExperience.getState().reducedMotion;
    gsap.to(motion.focus, { value: 0, duration: reduced ? 0.01 : 0.8, ease: 'power2.inOut' });
    const done = () => {
      busy.current = false;
      setCurrent(null);
      if (useExperience.getState().extractedId === id) useExperience.setState({ extractedId: null });
      then?.();
    };
    if (!sameZone || !displayPose(id, from.current)) return done();
    busy.current = true;
    ready.current = 0;
    tween.current?.kill();
    tween.current = gsap.to(anim.current, { t: 0, duration: reduced ? 0.01 : 0.95, ease: 'power3.inOut', onComplete: done });
  };

  // react to selection changes
  useEffect(() => {
    const st = useExperience.getState();
    if (mode === 'inspect' && selectedId) {
      if (!current) extract(selectedId, st.zone);
      else if (current.id !== selectedId) putBack(current.id, current.zone === st.zone, () => extract(selectedId, useExperience.getState().zone));
      return;
    }
    if ((mode === 'browse' || mode === 'overview') && current) putBack(current.id, current.zone === st.zone && mode === 'browse');
  }, [mode, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useExperience.getState();
    const f = motion.focus.value;
    if (veil.current) {
      (veil.current.material as THREE.ShaderMaterial).uniforms.uFocus.value = f;
      veil.current.visible = f > 0.002;
    }
    if (halo.current) {
      halo.current.visible = f > 0.002;
      const r = build ? Math.max(build.size.y, build.size.x) * scale * 0.62 : 0.6;
      halo.current.scale.setScalar(r * (0.9 + f * 0.1));
      (halo.current.material as THREE.MeshBasicMaterial).opacity = f * 0.5;
    }
    if (!current || !carrier.current || !spin.current || !build) return;

    // carrier: detach → lift → glide toward the camera
    const t = anim.current.t;
    const A = from.current;
    const B = to.current;
    const ctrl = tmpP.copy(A.p).lerp(B.p, 0.35);
    ctrl.y = Math.max(A.p.y, B.p.y) + 0.5;
    const u = 1 - t;
    carrier.current.position.set(
      u * u * A.p.x + 2 * u * t * ctrl.x + t * t * B.p.x,
      u * u * A.p.y + 2 * u * t * ctrl.y + t * t * B.p.y,
      u * u * A.p.z + 2 * u * t * ctrl.z + t * t * B.p.z,
    );
    carrier.current.quaternion.copy(A.q).slerp(B.q, Math.min(1, t * 1.4));
    carrier.current.scale.lerpVectors(A.s, B.s, t);

    // 360 controls (inertia, idle drift)
    const m = motion.inspect;
    const active = st.mode === 'inspect' && !busy.current;
    if (active) {
      if (!m.dragging) {
        if (Math.abs(m.vel) > 0.0005) {
          m.rotYTarget += m.vel;
          m.vel *= Math.exp(-dt * 3);
        }
        m.idle += dt;
        if (m.idle > 5 && !st.reducedMotion && !st.activeHotspot) m.rotYTarget += dt * 0.22;
      }
    }
    m.rotY = damp(m.rotY, m.rotYTarget, 7, dt);
    m.rotX = damp(m.rotX, m.rotXTarget, 7, dt);
    m.zoom = damp(m.zoom, m.zoomTarget, 5, dt);
    spin.current.rotation.set(m.rotX * t, m.rotY * t + (1 - t) * 0, 0);
    ready.current = active ? Math.min(1, ready.current + dt * 2) : 0;

    // camera follows zoom once the extraction has landed
    if (active && !rig.flying) {
      const shot = inspectShot(angle, build.size.clone().multiplyScalar(scale), m.zoom, size.width / size.height, size.width > 900);
      setShot(shot.pos, shot.look, { lambda: 4, fov: FOV });
    }
  });

  const veilMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uFocus: { value: 0 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uFocus; varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * vec2(1.6, 1.0);
            float r = length(p);
            vec3 col = mix(vec3(0.03, 0.05, 0.08), vec3(0.008, 0.01, 0.016), smoothstep(0.0, 0.6, r));
            float a = uFocus * mix(0.55, 0.9, smoothstep(0.05, 0.6, r));
            gl_FragColor = vec4(col, a);
          }
        `,
      }),
    [],
  );

  return (
    <group ref={stage} position={frame.position} rotation={[0, frame.rotationY, 0]}>
      {/* the hall recedes behind the product */}
      <mesh ref={veil} material={veilMat} position={[0, 1.8, INSPECT[2] - 1.05]} renderOrder={8} visible={false}>
        <planeGeometry args={[16, 10]} />
      </mesh>
      <mesh ref={halo} position={[INSPECT[0], INSPECT[1], INSPECT[2] - 0.75]} renderOrder={9} visible={false}>
        <torusGeometry args={[1, 0.0035, 6, 120]} />
        <meshBasicMaterial color={new THREE.Color('#d6ecff').multiplyScalar(1.4)} toneMapped={false} transparent opacity={0} />
      </mesh>
      <mesh position={[INSPECT[0], INSPECT[1] - 0.72, INSPECT[2]]} rotation={[Math.PI / 2, 0, 0]} material={glow('#9fd4ff', 0.9)} visible={!!current && mode === 'inspect'}>
        <torusGeometry args={[0.42, 0.003, 4, 80]} />
      </mesh>
      {product && build && (
        <group ref={carrier}>
          <group position={build.center}>
            <group ref={spin}>
              <group position={build.center.clone().negate()}>
                <ProductVisual product={product} />
                {mode === 'inspect' && (
                  <group position={pair ? [PAIR_X, 0, 0] : [0, 0, 0]} rotation={[0, pair ? -0.08 : 0, 0]}>
                    <Hotspots hotspots={product.hotspots} anchors={build.anchors} ready={ready} />
                  </group>
                )}
              </group>
            </group>
          </group>
        </group>
      )}
    </group>
  );
}
