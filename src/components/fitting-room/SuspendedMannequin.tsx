import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CURATED_LOOKS } from '../../data/looks';
import { useExperience } from '../../store/experienceStore';
import { glow } from '../fashion/fixtures';
import { WornOutfit } from './WornOutfit';

/** A mannequin hanging in the air, wearing a curated look, turning slowly. */
export function SuspendedMannequin({ lookId, position }: { lookId: string; position: [number, number, number] }) {
  const look = CURATED_LOOKS.find((l) => l.id === lookId)!;
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    if (!ref.current || useExperience.getState().reducedMotion) return;
    ref.current.rotation.y += dt * 0.18;
    ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.5) * 0.08;
  });
  return (
    <group ref={ref} position={position}>
      <WornOutfit avatarId={look.avatarId} outfit={look.outfit} />
      {/* suspension filament + halo */}
      <mesh position={[0, 3.2, 0]} material={glow('#f2e6cf', 1.2)}>
        <cylinderGeometry args={[0.004, 0.004, 2.6, 6]} />
      </mesh>
      <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow('#f2e6cf', 1.6)}>
        <torusGeometry args={[0.42, 0.006, 4, 64]} />
      </mesh>
    </group>
  );
}
