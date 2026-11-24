import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../../store/experienceStore';

const titanium = new THREE.MeshStandardMaterial({ color: '#8a929b', roughness: 0.32, metalness: 0.95 });
const chrome = new THREE.MeshStandardMaterial({ color: '#dfe5ea', roughness: 0.1, metalness: 1 });
const darkGlass = new THREE.MeshStandardMaterial({ color: '#0b0e14', roughness: 0.08, metalness: 0.9 });
const ice = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9fd4ff').multiplyScalar(1.4), toneMapped: false });
const lime = new THREE.MeshBasicMaterial({ color: new THREE.Color('#c6f432').multiplyScalar(1.3), toneMapped: false });
const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#f2e6cf').multiplyScalar(1.2), toneMapped: false });

/** A colossal orbital ring far behind the portals, with instanced fins. */
function OrbitalRing({ count }: { count: number }) {
  const fins = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const R = 120;
  useLayoutEffect(() => {
    if (!fins.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      q.setFromEuler(new THREE.Euler(0, 0, a));
      m.compose(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0), q, new THREE.Vector3(7, 1.2, 4.5));
      fins.current.setMatrixAt(i, m);
    }
    fins.current.instanceMatrix.needsUpdate = true;
  }, [count]);
  useFrame((_, dt) => {
    if (group.current && !useExperience.getState().reducedMotion) group.current.rotation.z += dt * 0.006;
  });
  return (
    <group position={[10, 40, -230]} rotation={[0.38, -0.22, 0]}>
      <group ref={group}>
        <mesh material={titanium}>
          <torusGeometry args={[R, 1.8, 10, 220]} />
        </mesh>
        <mesh material={ice} position={[0, 0, 2.3]}>
          <torusGeometry args={[R - 2.6, 0.14, 4, 220]} />
        </mesh>
        <instancedMesh ref={fins} args={[undefined, chrome, count]}>
          <boxGeometry args={[1, 1, 1]} />
        </instancedMesh>
      </group>
    </group>
  );
}

/** Cathedral ribs: huge partial tori arching over the portal field. */
function Ribs() {
  const ribs = [
    { z: -42, r: 54, t: 0.5, rot: 0.05 },
    { z: -62, r: 62, t: 0.6, rot: -0.04 },
    { z: -86, r: 72, t: 0.7, rot: 0.08 },
  ];
  return (
    <group>
      {ribs.map((r, i) => (
        <group key={i} position={[0, -24, r.z]} rotation={[0, 0, r.rot]}>
          <mesh material={titanium}>
            <torusGeometry args={[r.r, r.t, 8, 120, Math.PI]} />
          </mesh>
          <mesh material={i === 1 ? warm : ice} position={[0, 0, r.t + 0.05]}>
            <torusGeometry args={[r.r - r.t * 0.4, 0.05, 4, 120, Math.PI]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Slim glass monoliths drifting in the distance. */
function Monoliths() {
  const items = useMemo(
    () => [
      { p: [-62, 18, -40], h: 34, r: 0.2 },
      { p: [-48, 30, -110], h: 52, r: -0.12 },
      { p: [56, 24, -48], h: 40, r: 0.1 },
      { p: [72, 36, -120], h: 60, r: -0.2 },
      { p: [-90, 12, 10], h: 28, r: 0.3 },
      { p: [96, 10, 0], h: 30, r: -0.25 },
    ],
    [],
  );
  const refs = useRef<THREE.Group[]>([]);
  useFrame(({ clock }) => {
    if (useExperience.getState().reducedMotion) return;
    refs.current.forEach((g, i) => {
      if (g) g.position.y = items[i].p[1] + Math.sin(clock.elapsedTime * 0.12 + i) * 1.2;
    });
  });
  return (
    <group>
      {items.map((m, i) => (
        <group key={i} ref={(g) => void (refs.current[i] = g!)} position={m.p as [number, number, number]} rotation={[0, m.r, 0.04 * (i % 2 ? 1 : -1)]}>
          <mesh material={darkGlass}>
            <boxGeometry args={[3.2, m.h, 1.4]} />
          </mesh>
          <mesh material={i % 3 === 0 ? lime : ice} position={[1.62, 0, 0.71]}>
            <boxGeometry args={[0.06, m.h * 0.92, 0.06]} />
          </mesh>
          <mesh material={chrome} position={[0, m.h / 2 + 0.15, 0]}>
            <boxGeometry args={[3.4, 0.3, 1.6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Thin suspended platforms linked by light bridges. */
function Platforms() {
  const items: { p: [number, number, number]; r: number }[] = [
    { p: [-18, 2, 20], r: 3.2 },
    { p: [18, 3.5, 12], r: 2.6 },
    { p: [-24, 8, -8], r: 2.2 },
    { p: [22, 6, 30], r: 2.4 },
  ];
  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={it.p}>
          <mesh material={chrome}>
            <cylinderGeometry args={[it.r, it.r * 0.92, 0.18, 48]} />
          </mesh>
          <mesh material={i % 2 ? lime : ice} position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[it.r * 0.8, 0.03, 4, 64]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Megastructures() {
  const quality = useExperience((s) => s.quality);
  return (
    <group>
      <OrbitalRing count={quality === 'lite' ? 48 : 120} />
      <Ribs />
      <Monoliths />
      {quality !== 'lite' && <Platforms />}
    </group>
  );
}
