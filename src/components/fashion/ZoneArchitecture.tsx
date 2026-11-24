import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ZoneDef } from '../../data/dimensions';
import { useExperience } from '../../store/experienceStore';
import { LightShaft } from '../universe/Atmosphere';
import { GEO, MAT, glow } from './fixtures';
import { SuspendedMannequin } from '../fitting-room/SuspendedMannequin';

function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, mats: THREE.Matrix4[]) {
  useLayoutEffect(() => {
    if (!ref.current) return;
    mats.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [ref, mats]);
}

const M = (p: [number, number, number], s: [number, number, number], r: [number, number, number] = [0, 0, 0]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));

/** A. Streetwear: stacked titanium slabs, a floating rail ring with hanging panels, signal-orange slits. */
function Streetwear({ accent }: { accent: string }) {
  const panels = useRef<THREE.InstancedMesh>(null);
  const ring = useRef<THREE.Group>(null);
  const mats = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      out.push(M([Math.cos(a) * 4.6, -0.95, Math.sin(a) * 4.6], [0.62, 1.7, 0.02], [0, -a + Math.PI / 2, 0.04 * Math.sin(i)]));
    }
    return out;
  }, []);
  useInstances(panels, mats);
  useFrame((_, dt) => {
    if (ring.current && !useExperience.getState().reducedMotion) ring.current.rotation.y += dt * 0.05;
  });
  return (
    <group>
      {[
        { y: 4.6, x: -1.2, r: 0.08 },
        { y: 6.1, x: 0.9, r: -0.06 },
        { y: 7.5, x: -0.4, r: 0.12 },
      ].map((s, i) => (
        <group key={i} position={[s.x, s.y, -7.5 - i * 0.6]} rotation={[0, s.r, 0]}>
          <mesh geometry={GEO.box} material={MAT.titanium} scale={[8, 1.1, 1.6]} />
          <mesh geometry={GEO.box} material={glow(accent, 1.8)} scale={[6.6, 0.04, 0.02]} position={[0, -0.2, 0.81]} />
        </group>
      ))}
      <group ref={ring} position={[0, 6.2, -4.5]}>
        <mesh material={MAT.chrome} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[4.6, 0.05, 8, 120]} />
        </mesh>
        <instancedMesh ref={panels} args={[GEO.box, MAT.graphite, 16]} />
      </group>
      <mesh position={[0, 4.5, -11]} material={MAT.graphite}>
        <cylinderGeometry args={[11, 11, 10, 48, 1, true, -0.75 + Math.PI, 1.5]} />
      </mesh>
    </group>
  );
}

/** B. Luxury: a receding corridor of chrome arches, warm shafts and a suspended mannequin. */
function Luxury() {
  const lite = useExperience((s) => s.quality === 'lite');
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[0, 0, -2.6 - i * 3.2]}>
          <mesh material={MAT.chrome}>
            <torusGeometry args={[4.2 + i * 0.25, 0.09, 10, 96, Math.PI]} />
          </mesh>
          <mesh material={glow('#f2e6cf', 1.5)} position={[0, 0, 0.1]}>
            <torusGeometry args={[4.05 + i * 0.25, 0.012, 4, 96, Math.PI]} />
          </mesh>
        </group>
      ))}
      <LightShaft position={[0, 8, -3]} height={12} top={0.4} bottom={2.6} color="#f2e6cf" intensity={0.28} />
      {!lite && <SuspendedMannequin lookId="look-aurum" position={[2.6, 3.1, -6.5]} />}
    </group>
  );
}

/** C. Essentials: a curved wall of frosted glass fins, cool light. */
function Essentials({ accent }: { accent: string }) {
  const fins = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    for (let i = -14; i <= 14; i++) {
      const a = i * 0.075;
      out.push(M([Math.sin(a) * 9, 3.6, -9 + Math.cos(a) * 9 - 9], [0.06, 7.2, 1.1], [0, a, 0]));
    }
    return out;
  }, []);
  useInstances(fins, mats);
  return (
    <group>
      <instancedMesh ref={fins} args={[GEO.box, MAT.warmWhite, 29]} />
      <mesh position={[0, 7.3, -8.6]} material={glow(accent, 1.6)}>
        <boxGeometry args={[18, 0.05, 0.05]} />
      </mesh>
      <mesh position={[0, 0.03, -8.4]} material={glow(accent, 1.2)}>
        <boxGeometry args={[16, 0.03, 0.03]} />
      </mesh>
    </group>
  );
}

/** D. Sneakers: a lit column wrapped by a helix of levitating discs. */
function Sneakers({ accent }: { accent: string }) {
  const discs = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const discMats = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    for (let i = 0; i < 26; i++) {
      const a = i * 0.55;
      out.push(M([Math.cos(a) * 2.2, 0.6 + i * 0.36, Math.sin(a) * 2.2], [0.9, 0.5, 0.9]));
    }
    return out;
  }, []);
  const ringMats = useMemo(() => Array.from({ length: 10 }, (_, i) => M([0, 1 + i * 1.05, 0], [1, 1, 1], [Math.PI / 2, 0, 0])), []);
  useInstances(discs, discMats);
  useInstances(rings, ringMats);
  useFrame((_, dt) => {
    if (group.current && !useExperience.getState().reducedMotion) group.current.rotation.y += dt * 0.08;
  });
  return (
    <group position={[0, 0, -6.5]}>
      <mesh material={MAT.graphite} position={[0, 5.5, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 11, 32]} />
      </mesh>
      <instancedMesh ref={rings} args={[undefined, glow(accent, 1.8), 10]}>
        <torusGeometry args={[0.6, 0.02, 6, 48]} />
      </instancedMesh>
      <group ref={group}>
        <instancedMesh ref={discs} args={[GEO.disc, MAT.titanium, 26]} />
      </group>
    </group>
  );
}

/** E. Accessories: a slow gyroscope of rings around a light core. */
function Accessories({ accent }: { accent: string }) {
  const rings = useRef<THREE.Group[]>([]);
  useFrame((_, dt) => {
    if (useExperience.getState().reducedMotion) return;
    rings.current.forEach((r, i) => {
      if (!r) return;
      r.rotation.x += dt * (0.12 + i * 0.05);
      r.rotation.y += dt * (0.08 - i * 0.03);
    });
  });
  return (
    <group position={[0, 4.8, -6]}>
      {[2.6, 2.1, 1.6].map((r, i) => (
        <group key={i} ref={(g) => void (rings.current[i] = g!)}>
          <mesh material={i === 1 ? MAT.titanium : MAT.chrome}>
            <torusGeometry args={[r, 0.045, 8, 96]} />
          </mesh>
        </group>
      ))}
      <mesh material={glow(accent, 2.2)}>
        <sphereGeometry args={[0.32, 24, 16]} />
      </mesh>
    </group>
  );
}

/** Tech zones: vertical signal pillars behind minimal pedestals. */
function TechPillars({ accent }: { accent: string }) {
  const pillars = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    for (let i = -6; i <= 6; i++) out.push(M([i * 1.1, 4 + Math.abs(i) * 0.25, -6 - Math.abs(i) * 0.35], [0.05, 8 + Math.abs(i) * 0.5, 0.05]));
    return out;
  }, []);
  useInstances(pillars, mats);
  return (
    <group>
      <instancedMesh ref={pillars} args={[GEO.box, glow(accent, 1.4), 13]} />
      <mesh position={[0, 4.5, -7.5]} material={MAT.graphite}>
        <boxGeometry args={[16, 9, 0.3]} />
      </mesh>
    </group>
  );
}

export function ZoneArchitecture({ zone }: { zone: ZoneDef }) {
  switch (zone.id) {
    case 'streetwear':
      return <Streetwear accent={zone.accent} />;
    case 'luxury':
      return <Luxury />;
    case 'essentials':
      return <Essentials accent={zone.accent} />;
    case 'sneakers':
      return <Sneakers accent={zone.accent} />;
    case 'accessories':
      return <Accessories accent={zone.accent} />;
    default:
      return <TechPillars accent={zone.accent} />;
  }
}
