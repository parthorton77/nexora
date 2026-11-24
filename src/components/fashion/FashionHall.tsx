import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import type { DimensionDef } from '../../data/dimensions';
import { useExperience } from '../../store/experienceStore';
import { motion } from '../../store/motion';
import { byTier } from '../../hooks/useQuality';
import { SpaceSky } from '../universe/SpaceSky';
import { Dust } from '../universe/Atmosphere';
import { MAT, glow } from './fixtures';
import { DAIS_TOP, INSPECT, ZONE_RADIUS, zoneAngle, zoneFrame, zoneToWorld } from './layout';

export interface HallTheme {
  fog: string;
  fogDensity: number;
  floor: string;
  key: string;
  fill: string;
  rim: string;
  sky: { warm: number; nebula: number; stars: number };
}

/** Reflective floor: a true mirror on the cinematic tier, glossy metal elsewhere. */
function Floor({ color }: { color: string }) {
  const quality = useExperience((s) => s.quality);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <circleGeometry args={[260, 96]} />
      {quality === 'high' ? (
        <MeshReflectorMaterial
          color={color}
          blur={[320, 90]}
          resolution={512}
          mixBlur={1}
          mixStrength={3.2}
          roughness={0.85}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          metalness={0.55}
          mirror={0.6}
        />
      ) : (
        <meshStandardMaterial color={color} roughness={0.34} metalness={0.62} envMapIntensity={1.4} />
      )}
    </mesh>
  );
}

/** Light lines on the floor that lead from the atrium out to every zone. */
function FloorGuides({ dim }: { dim: DimensionDef }) {
  return (
    <group position={[0, 0.012, 0]}>
      {[3.2, 9, 15.5].map((r, i) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} material={glow(i === 0 ? '#e9eef3' : '#9fd4ff', i === 0 ? 0.9 : 0.45)}>
          <ringGeometry args={[r, r + (i === 0 ? 0.03 : 0.015), 160]} />
        </mesh>
      ))}
      {dim.zones.map((z) => {
        const a = zoneAngle(dim, z.id);
        const len = ZONE_RADIUS - 8;
        return (
          <mesh key={z.id} position={[Math.sin(a) * (3.4 + len / 2), 0, -Math.cos(a) * (3.4 + len / 2)]} rotation={[-Math.PI / 2, 0, -a]} material={glow(z.accent, 0.75)}>
            <planeGeometry args={[0.035, len]} />
          </mesh>
        );
      })}
    </group>
  );
}

/** The atrium centre: a glass dais with a floating sculpture that rises away for the fitting pod. */
function Atrium(_: { accent: string }) {
  const nexus = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const st = useExperience.getState();
    const up = st.mode === 'fitting' || st.mode === 'runway' ? 1 : 0;
    if (nexus.current) nexus.current.position.y += (4.2 + up * 7 - nexus.current.position.y) * (1 - Math.exp(-dt * 1.6));
    if (st.reducedMotion) return;
    if (ringA.current) ringA.current.rotation.x += dt * 0.25;
    if (ringB.current) ringB.current.rotation.y += dt * 0.18;
  });
  return (
    <group>
      <mesh position={[0, DAIS_TOP / 2, 0]} material={MAT.graphite}>
        <cylinderGeometry args={[2.3, 2.45, DAIS_TOP, 64]} />
      </mesh>
      <mesh position={[0, DAIS_TOP + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glow('#bfe3ff', 1.1)}>
        <ringGeometry args={[2.18, 2.22, 96]} />
      </mesh>
      <group ref={nexus} position={[0, 4.2, 0]}>
        <mesh ref={ringA} material={MAT.chrome}>
          <torusGeometry args={[1.5, 0.06, 12, 96]} />
        </mesh>
        <mesh ref={ringB} material={MAT.titanium}>
          <torusGeometry args={[1.15, 0.04, 12, 96]} />
        </mesh>
        <mesh material={glow('#e9f4ff', 1.6)}>
          <icosahedronGeometry args={[0.32, 1]} />
        </mesh>
      </group>
    </group>
  );
}

/** The runway: the lit strip you arrive along; it comes alive during a show. */
function Runway({ accent }: { accent: string }) {
  const bars = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(() => Array.from({ length: 15 }, (_, i) => new THREE.Matrix4().compose(new THREE.Vector3(0, 0.035, 4 + i * 2.1), new THREE.Quaternion(), new THREE.Vector3(2.6, 0.02, 0.05))), []);
  const barMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(1.4), toneMapped: false, transparent: true, opacity: 0.35 }), [accent]);
  useLayoutEffect(() => {
    if (!bars.current) return;
    mats.forEach((m, i) => bars.current!.setMatrixAt(i, m));
    bars.current.instanceMatrix.needsUpdate = true;
  }, [mats]);
  useFrame(({ clock }) => {
    const on = useExperience.getState().mode === 'runway';
    barMat.opacity += ((on ? 0.6 + 0.35 * Math.sin(clock.elapsedTime * 4) : 0.25) - barMat.opacity) * 0.08;
  });
  return (
    <group>
      <mesh position={[0, 0.02, 19]} material={MAT.graphite}>
        <boxGeometry args={[3, 0.04, 31]} />
      </mesh>
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 0.045, 19]} material={glow('#f2e6cf', 1.3)}>
          <boxGeometry args={[0.03, 0.02, 31]} />
        </mesh>
      ))}
      <instancedMesh ref={bars} args={[undefined, barMat, 15]}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  );
}

/** The ring you arrive through, and a ceiling halo overhead. */
function Structure({ accent }: { accent: string }) {
  return (
    <group>
      <group position={[0, 4.2, 48]}>
        <mesh material={MAT.chrome}>
          <torusGeometry args={[4.2, 0.16, 16, 120]} />
        </mesh>
        <mesh material={glow(accent, 1.6)} position={[0, 0, 0.12]}>
          <torusGeometry args={[4.32, 0.02, 6, 120]} />
        </mesh>
      </group>
      <group position={[0, 17, -6]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={MAT.titanium}>
          <torusGeometry args={[34, 0.5, 8, 160]} />
        </mesh>
        <mesh material={glow('#9fd4ff', 1.2)} position={[0, 0, 0.55]}>
          <torusGeometry args={[33.4, 0.05, 4, 160]} />
        </mesh>
      </group>
    </group>
  );
}

/** Giant perimeter: a ring of light columns and monumental wall panels that encloses the hall. */
function Perimeter({ accent }: { accent: string }) {
  const cols = useRef<THREE.InstancedMesh>(null);
  const walls = useRef<THREE.InstancedMesh>(null);
  const lite = useExperience((s) => s.quality === 'lite');
  const n = lite ? 24 : 44;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const h = 14 + 6 * Math.abs(Math.sin(a * 2.5));
      m.compose(new THREE.Vector3(Math.sin(a) * 47, h / 2, -Math.cos(a) * 47), q.setFromEuler(new THREE.Euler(0, -a, 0)), new THREE.Vector3(0.09, h, 0.09));
      cols.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(Math.sin(a + Math.PI / n) * 54, 11, -Math.cos(a + Math.PI / n) * 54), q.setFromEuler(new THREE.Euler(0, -(a + Math.PI / n), 0)), new THREE.Vector3((Math.PI * 2 * 54) / n - 1.6, 22 + 8 * Math.sin(a * 3), 0.8));
      walls.current?.setMatrixAt(i, m);
    }
    if (cols.current) cols.current.instanceMatrix.needsUpdate = true;
    if (walls.current) walls.current.instanceMatrix.needsUpdate = true;
  }, [n]);
  return (
    <group>
      <instancedMesh ref={cols} args={[undefined, glow('#cfe6ff', 1.1), n]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh ref={walls} args={[undefined, MAT.graphite, n]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={glow(accent, 0.5)}>
        <ringGeometry args={[46.9, 47.05, 200]} />
      </mesh>
    </group>
  );
}

/**
 * Lights. The count never changes (changing it recompiles every shader); a
 * key light follows the active zone, and an inspection light rises when a
 * product is extracted while the hall dims.
 */
function Lights({ dim, theme }: { dim: DimensionDef; theme: HallTheme }) {
  const key = useRef<THREE.SpotLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const sunP = useMemo(() => new THREE.Vector3(-18, 30, 24), []);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.add(target);
    return () => void scene.remove(target);
  }, [scene, target]);
  const wantT = useMemo(() => new THREE.Vector3(), []);
  const wantP = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const st = useExperience.getState();
    const a = zoneAngle(dim, st.zone);
    const f = zoneFrame(a);
    const fitting = st.mode === 'fitting' || st.mode === 'runway';
    const inspecting = motion.focus.value > 0.01;
    const k = 1 - Math.exp(-dt * 2.5);
    if (inspecting) {
      // the same key light becomes the studio light on the extracted product
      zoneToWorld(a, { x: INSPECT[0], y: INSPECT[1], z: INSPECT[2] }, wantT);
      zoneToWorld(a, { x: 1.4, y: 5.2, z: INSPECT[2] + 3.2 }, wantP);
    } else if (fitting) {
      wantT.set(0, 1.1, 0);
      wantP.set(0.8, 9, 3.5);
    } else {
      wantT.set(f.position.x * 0.98, 1.2, f.position.z * 0.98);
      wantP.set(Math.sin(a) * (ZONE_RADIUS - 1.5), 12, -Math.cos(a) * (ZONE_RADIUS - 1.5));
    }
    target.position.lerp(wantT, inspecting ? 1 - Math.exp(-dt * 6) : k);
    if (key.current) {
      key.current.position.lerp(wantP, inspecting ? 1 - Math.exp(-dt * 6) : k);
      key.current.intensity = 70 - motion.focus.value * 22;
      key.current.angle = 0.42 - motion.focus.value * 0.12;
    }
    if (hemi.current) hemi.current.intensity = 1.0 * (1 - motion.focus.value * 0.55);
    // the key directional follows the visitor so garments are always lit from the front-left
    if (sun.current) {
      if (fitting) sunP.set(-5, 10, 9);
      else zoneToWorld(a, { x: -7, y: 11, z: 12 }, sunP);
      sun.current.position.lerp(sunP, k);
      sun.current.intensity = 1.6;
    }
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={[theme.fill, '#2a2420', 1]} />
      <directionalLight ref={sun} position={[-18, 30, 24]} intensity={1.6} color={theme.key} target={target} />
      <spotLight ref={key} position={[0, 12, -18]} angle={0.42} penumbra={1} decay={1.2} distance={40} color={theme.key} target={target} />
    </>
  );
}

/** The hall shared by every dimension; the theme sets its mood. */
export function Hall({ dim, theme, children }: { dim: DimensionDef; theme: HallTheme; children?: React.ReactNode }) {
  const quality = useExperience((s) => s.quality);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity);
    return () => {
      scene.fog = null;
    };
  }, [scene, theme.fog, theme.fogDensity]);
  return (
    <group>
      <SpaceSky warm={theme.sky.warm} nebula={theme.sky.nebula} stars={theme.sky.stars} horizon={theme.fog} octaves={quality === 'high' ? 5 : 3} />
      <Environment resolution={byTier(quality, 256, 128, 64)} frames={1}>
        <Lightformer form="ring" intensity={2} color={theme.fill} scale={14} position={[0, 14, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={2.2} color={theme.key} scale={[24, 4, 1]} position={[-22, 8, 6]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={1.4} color={theme.rim} scale={[24, 3, 1]} position={[22, 6, -6]} rotation={[0, -Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={1} color="#e8692c" scale={[10, 1, 1]} position={[0, 2, 24]} rotation={[0, Math.PI, 0]} />
        <Lightformer form="rect" intensity={1.6} color={theme.fill} scale={[60, 2, 1]} position={[0, 3, -40]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" scale={[40, 40, 1]} position={[0, 30, 0]} rotation={[Math.PI / 2, 0, 0]} />
      </Environment>
      <Lights dim={dim} theme={theme} />
      <Floor color={theme.floor} />
      <FloorGuides dim={dim} />
      <Atrium accent={dim.accent} />
      <Structure accent={dim.accent} />
      <Perimeter accent={dim.accent} />
      {children}
      <Dust count={byTier(quality, 700, 380, 120)} area={[70, 14, 70]} center={[0, 7, 0]} color="#e8eef5" size={0.6} />
    </group>
  );
}

export { Runway };
