import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience } from '../store/experienceStore';
import { useRunwayLooks } from '../hooks/useRunwayLooks';
import { rig, setShot } from '../store/rig';
import { fly } from '../components/experience/flight';
import { glow } from '../components/fashion/fixtures';
import { WornOutfit } from '../components/fitting-room/WornOutfit';


const START_Z = 6;
const END_Z = 32;
const WALK = 6.5;
const PAUSE = 2.4;

/**
 * The runway: a mannequin glides down the lit strip on a hover disc, turns at
 * the end and returns; the camera tracks alongside. Looks advance by
 * themselves or from the controls.
 */
export default function RunwayScene() {
  const mode = useExperience((s) => s.mode);
  const index = useExperience((s) => s.runwayIndex);
  const looks = useRunwayLooks();
  const look = looks[index % looks.length];
  const model = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const ready = useRef(false);
  const active = mode === 'runway';

  useEffect(() => {
    clock.current = 0;
  }, [index]);

  useEffect(() => {
    if (!active) {
      ready.current = false;
      return;
    }
    ready.current = false;
    void fly(new THREE.Vector3(-4.2, 1.7, START_Z + 4), new THREE.Vector3(0, 1.1, START_Z - 2), { duration: 1.8, fov: 42, arc: 1 }).then(() => {
      ready.current = true;
    });
  }, [active]);

  useFrame((_, dtRaw) => {
    if (!active || !model.current) return;
    const dt = Math.min(dtRaw, 0.05);
    const st = useExperience.getState();
    clock.current += dt;
    const total = WALK * 2 + PAUSE;
    const t = clock.current;
    let z: number;
    let rot: number;
    const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    if (t < WALK) {
      z = START_Z + (END_Z - START_Z) * ease(t / WALK);
      rot = 0;
    } else if (t < WALK + PAUSE) {
      z = END_Z;
      rot = ease((t - WALK) / PAUSE) * Math.PI;
    } else if (t < total) {
      z = END_Z + (START_Z - END_Z) * ease((t - WALK - PAUSE) / WALK);
      rot = Math.PI;
    } else {
      z = START_Z;
      rot = Math.PI;
      st.setRunwayIndex((index + 1) % looks.length);
    }
    const g = model.current;
    g.position.z = z;
    g.position.y = 0.16 + (st.reducedMotion ? 0 : Math.sin(clock.current * 2.2) * 0.02);
    g.rotation.y = rot;
    g.rotation.z = st.reducedMotion ? 0 : Math.sin(clock.current * 1.6) * 0.015;
    const dir = t < WALK + PAUSE * 0.5 ? 1 : -1;
    if (ready.current && !rig.flying) setShot({ x: -3.9, y: 1.6, z: z + 3.2 * dir }, { x: 0.2, y: 1.05, z: z - 0.6 * dir }, { lambda: 1.6, fov: 42 });
  });

  if (!active) return null;
  return (
    <group ref={model} position={[0, 0.16, START_Z]} userData={{ runway: true }}>
      <WornOutfit avatarId={look.avatarId} outfit={look.outfit} />
      <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow('#c6f432', 1.8)}>
        <torusGeometry args={[0.42, 0.012, 6, 64]} />
      </mesh>
      <mesh position={[0, -0.09, 0]}>
        <cylinderGeometry args={[0.44, 0.36, 0.04, 48]} />
        <meshStandardMaterial color="#20242a" roughness={0.2} metalness={0.9} />
      </mesh>
    </group>
  );
}
