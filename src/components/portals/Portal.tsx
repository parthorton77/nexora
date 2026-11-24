import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { DimensionDef } from '../../data/dimensions';
import { NOISE } from '../../lib/glsl';
import { useExperience } from '../../store/experienceStore';
import { wasDrag } from '../../store/motion';
import { FloatingIsland } from '../universe/FloatingIsland';

const chrome = new THREE.MeshStandardMaterial({ color: '#e3e8ed', roughness: 0.08, metalness: 1 });
const titanium = new THREE.MeshStandardMaterial({ color: '#7c848d', roughness: 0.34, metalness: 0.95 });

function fieldMaterial(a: string, b: string, active: boolean) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uA: { value: new THREE.Color(a) },
      uB: { value: new THREE.Color(b) },
      uEnergy: { value: 0.3 },
      uActive: { value: active ? 1 : 0 },
      uOpen: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uA;
      uniform vec3 uB;
      uniform float uEnergy;
      uniform float uActive;
      uniform float uOpen;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = max(length(p), 1e-4);
        float ang = atan(p.y, p.x + 1e-5);
        float edge = smoothstep(1.0, 0.94, r);
        // tunnel: rings receding into the portal
        float depth = log(max(r, 0.001));
        float speed = 0.25 + uEnergy * 0.9 + uOpen * 3.0;
        float rings = sin((depth * 9.0 + uTime * speed * 2.0)) * 0.5 + 0.5;
        float swirl = nx_fbm(vec3(cos(ang) * 1.5 + depth * 1.3, sin(ang) * 1.5, uTime * 0.12 * (1.0 + uEnergy)));
        float streak = pow(clamp(nx_noise(vec3(ang * 6.0, depth * 3.0 - uTime * speed, 1.0)), 0.0, 1.0), 3.0);
        vec3 deep = mix(uB * 0.08, uB * 0.5, swirl);
        vec3 ringCol = mix(uA, vec3(0.92, 0.96, 1.0), 0.55);
        vec3 col = deep + ringCol * pow(clamp(rings, 0.0, 1.0), 6.0) * (0.18 + uEnergy * 0.42) * smoothstep(0.05, 0.5, r);
        col += uB * streak * (0.3 + uEnergy * 0.6);
        col += ringCol * smoothstep(0.8, 1.0, r) * (0.18 + 0.4 * uEnergy);
        col += vec3(1.0) * smoothstep(0.35, 0.0, r) * (0.15 + uOpen * 2.5) * (0.4 + uEnergy);
        // sealed portals: frosted glass with scan lines
        float scan = sin(vUv.y * 220.0 + uTime * 1.5) * 0.5 + 0.5;
        vec3 sealed = mix(vec3(0.03, 0.035, 0.045), uB * 0.18, swirl * 0.6) + uA * 0.05 * scan + uA * smoothstep(0.82, 1.0, r) * 0.18 * (0.6 + uEnergy);
        col = mix(sealed, col, uActive);
        float alpha = edge * mix(0.82, 0.96, uActive);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

/**
 * A dimension gate: chrome frame, rotating fins, a living field, its island
 * and floating label. Hover changes the architectural light; click activates.
 */
export function Portal({ def }: { def: DimensionDef }) {
  const active = def.status === 'active';
  const R = def.portal.radius;
  const hovered = useExperience((s) => s.hoveredPortal === def.id);
  const focused = useExperience((s) => s.focusedPortal === def.id && s.scene === 'universe');
  const entering = useExperience((s) => s.transition?.via === def.id);
  const lite = useExperience((s) => s.quality === 'lite');
  const field = useMemo(() => fieldMaterial(def.accent, def.field, active), [def.accent, def.field, active]);
  const strip = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(def.accent), toneMapped: false }), [def.accent]);
  const fins = useRef<THREE.InstancedMesh>(null);
  const finGroup = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const energy = useRef(0.3);
  const base = useMemo(() => new THREE.Color(def.accent), [def.accent]);
  const finCount = lite ? 18 : 36;

  useLayoutEffect(() => {
    if (!fins.current) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < finCount; i++) {
      const a = (i / finCount) * Math.PI * 2;
      m.compose(
        new THREE.Vector3(Math.cos(a) * R * 1.13, Math.sin(a) * R * 1.13, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, a)),
        new THREE.Vector3(R * 0.12, R * 0.022, R * 0.08),
      );
      fins.current.setMatrixAt(i, m);
    }
    fins.current.instanceMatrix.needsUpdate = true;
  }, [R, finCount]);

  useFrame((_, dt) => {
    const want = entering ? 1.4 : hovered ? 1 : focused ? 0.6 : active ? 0.32 : 0.18;
    energy.current += (want - energy.current) * (1 - Math.exp(-dt * 4));
    const e = energy.current;
    field.uniforms.uTime.value += dt;
    field.uniforms.uEnergy.value = Math.min(1, e);
    field.uniforms.uOpen.value += ((entering ? 1 : 0) - field.uniforms.uOpen.value) * (1 - Math.exp(-dt * 2));
    strip.color.copy(base).multiplyScalar(0.6 + e * 2.2);
    const reduced = useExperience.getState().reducedMotion;
    if (finGroup.current && !reduced) finGroup.current.rotation.z += dt * (0.04 + e * 0.5);
    if (light.current) light.current.intensity = (active ? 40 : 12) * (0.4 + e) * (R / 7);
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    useExperience.getState().setHoveredPortal(def.id);
    document.body.style.cursor = 'pointer';
  };
  const out = () => {
    if (useExperience.getState().hoveredPortal === def.id) useExperience.getState().setHoveredPortal(null);
    document.body.style.cursor = '';
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (wasDrag()) return;
    document.body.style.cursor = '';
    useExperience.getState().activatePortal(def.id);
  };

  return (
    <group position={def.portal.position} rotation={[0, def.portal.tilt ?? 0, 0]}>
      {/* field */}
      <mesh material={field} onPointerOver={over} onPointerOut={out} onClick={click} renderOrder={3}>
        <circleGeometry args={[R * 0.96, 72]} />
      </mesh>
      {/* frame */}
      <mesh material={chrome} onPointerOver={over} onPointerOut={out} onClick={click}>
        <torusGeometry args={[R, R * 0.045, 16, 120]} />
      </mesh>
      <mesh material={titanium} position={[0, 0, -R * 0.06]}>
        <torusGeometry args={[R * 1.07, R * 0.025, 10, 120]} />
      </mesh>
      <mesh material={strip} position={[0, 0, R * 0.03]}>
        <torusGeometry args={[R * 1.035, R * 0.006, 6, 160]} />
      </mesh>
      <group ref={finGroup}>
        <instancedMesh ref={fins} args={[undefined, titanium, finCount]}>
          <boxGeometry args={[1, 1, 1]} />
        </instancedMesh>
      </group>
      {/* pylons */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * R * 1.32, -R * 0.35, -R * 0.12]}>
          <mesh material={titanium}>
            <boxGeometry args={[R * 0.08, R * 1.5, R * 0.14]} />
          </mesh>
          <mesh material={strip} position={[s * -R * 0.042, 0, R * 0.072]}>
            <boxGeometry args={[R * 0.008, R * 1.3, R * 0.008]} />
          </mesh>
        </group>
      ))}
      {active && <pointLight ref={light} color={def.accent} distance={R * 6} decay={1.6} position={[0, 0, R * 0.8]} />}
      <FloatingIsland position={[0, -R * 1.18, -R * 0.1]} radius={R * 1.05} seed={def.id.length * 7 + 3} accent={def.accent} bob={0} />
      <Html position={[0, -R * 1.02 - 0.3, R * 0.3]} center distanceFactor={R * 4.2} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`portal-label ${active ? 'is-active' : 'is-sealed'} ${hovered || focused ? 'is-lit' : ''}`}>
          <div className="portal-label__title">{def.title}</div>
          <div className="portal-label__tag">{active ? def.tagline : def.opens}</div>
          {active && <div className="portal-label__cta">{hovered || focused ? 'Click or press Enter' : 'Enter'}</div>}
        </div>
      </Html>
    </group>
  );
}
