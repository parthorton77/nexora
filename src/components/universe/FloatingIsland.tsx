import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '../../lib/math';
import { noise3 } from '../../lib/noise';
import { useExperience } from '../../store/experienceStore';

/** Faceted floating rock: flat top, long eroded underside. */
export function islandGeometry(seed: number, detail: number) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const rnd = mulberry32(seed);
  const ox = rnd() * 50;
  const oz = rnd() * 50;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const n = noise3(x * 1.7 + ox, y * 1.7, z * 1.7 + oz);
    const n2 = noise3(x * 4.2 + oz, y * 4.2, z * 4.2 + ox);
    const radial = 1 + n * 0.16 + n2 * 0.05;
    if (y > 0.05) {
      y = 0.02 * n2;
    } else {
      const depth = Math.max(0, -y + 0.05);
      y = -depth * (1.5 + n * 0.9) - depth * depth * 0.6;
      const shrink = 1 - depth * 0.42;
      x *= shrink;
      z *= shrink;
    }
    x *= radial;
    z *= radial;
    pos.setXYZ(i, x, y, z);
    const shade = y > -0.02 ? 0.95 : 0.55 + 0.35 * (1 + y / 2.5);
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade;
    colors[i * 3 + 2] = shade * 1.04;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

const rockMat = new THREE.MeshStandardMaterial({ color: '#59616c', roughness: 0.72, metalness: 0.3, flatShading: true, vertexColors: true, emissive: '#0b1018' });
const chrome = new THREE.MeshStandardMaterial({ color: '#d7dde3', roughness: 0.12, metalness: 1 });
const deck = new THREE.MeshStandardMaterial({ color: '#0d1015', roughness: 0.3, metalness: 0.7 });

export function FloatingIsland({
  position,
  radius = 6,
  seed = 1,
  bob = 0.25,
  accent = '#9fd4ff',
  deckRings = true,
}: {
  position: [number, number, number];
  radius?: number;
  seed?: number;
  bob?: number;
  accent?: string;
  deckRings?: boolean;
}) {
  const lite = useExperience((s) => s.quality === 'lite');
  const geo = useMemo(() => islandGeometry(seed, lite ? 2 : 3), [seed, lite]);
  const ref = useRef<THREE.Group>(null);
  const phase = (seed % 13) * 0.7;
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(1.6), toneMapped: false }), [accent]);
  useFrame(({ clock }) => {
    if (!ref.current || useExperience.getState().reducedMotion) return;
    ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.35 + phase) * bob;
  });
  return (
    <group ref={ref} position={position}>
      <mesh geometry={geo} material={rockMat} scale={[radius, radius, radius]} />
      {deckRings && (
        <group position={[0, 0.06 * radius * 0.2 + 0.02, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={deck}>
            <circleGeometry args={[radius * 0.62, 64]} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={chrome}>
            <ringGeometry args={[radius * 0.62, radius * 0.66, 96]} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={glow}>
            <ringGeometry args={[radius * 0.5, radius * 0.505, 96]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
