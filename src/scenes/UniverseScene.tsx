import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { DIMENSIONS, DIMENSION_BY_ID } from '../data/dimensions';
import { useExperience } from '../store/experienceStore';
import { motion } from '../store/motion';
import { rig, setShot } from '../store/rig';
import { useArrival } from '../hooks/useArrival';
import { byTier } from '../hooks/useQuality';
import { cut, fly } from '../components/experience/flight';
import { SpaceSky } from '../components/universe/SpaceSky';
import { FloatingIsland } from '../components/universe/FloatingIsland';
import { Megastructures } from '../components/universe/Megastructures';
import { CloudSea, Dust, GlowPath, LightShaft } from '../components/universe/Atmosphere';
import { Portal } from '../components/portals/Portal';
import { damp } from '../lib/math';

/* exploration path: progress 0 → 1 moves the visitor toward the portal plaza */
const PATH_START = new THREE.Vector3(0, 9.5, 68);
const PATH_END = new THREE.Vector3(0, 8.2, 24);
const INTRO_FROM = new THREE.Vector3(6, 38, 170);
const INTRO_LOOK = new THREE.Vector3(0, 4, -20);
const FASHION = new THREE.Vector3(...DIMENSION_BY_ID.fashion.portal.position);

const tmpPos = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const tmpLook = new THREE.Vector3();
const toPortal = new THREE.Vector3();
const camFwd = new THREE.Vector3();

export function explorerShot(progress: number, yaw: number, pitch: number) {
  tmpPos.lerpVectors(PATH_START, PATH_END, progress);
  tmpDir.subVectors(FASHION, tmpPos).normalize();
  const baseYaw = Math.atan2(tmpDir.x, -tmpDir.z);
  const basePitch = Math.asin(THREE.MathUtils.clamp(tmpDir.y, -1, 1));
  const y = baseYaw + yaw;
  const p = basePitch + pitch;
  tmpDir.set(Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p));
  tmpLook.copy(tmpPos).addScaledVector(tmpDir, 24);
  return { pos: tmpPos, look: tmpLook };
}

/** Camera exploration, portal focus, intro and arrival choreography. */
function Navigator() {
  const entered = useExperience((s) => s.entered);
  const introDone = useRef(false);
  const camera = useThree((s) => s.camera);
  const fog = useThree((s) => s.scene.fog) as THREE.FogExp2 | null;

  // before entering: hold a slow establishing drift behind the loader
  useEffect(() => {
    if (!entered && !introDone.current) cut(INTRO_FROM, INTRO_LOOK, 42);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the cinematic reveal after the loader
  useEffect(() => {
    if (!entered || introDone.current || useExperience.getState().transition) return;
    introDone.current = true;
    const u = motion.universe;
    u.progress = u.target = 0;
    u.yaw = u.yawTarget = 0;
    u.pitch = u.pitchTarget = 0;
    const s = explorerShot(0, 0, 0);
    void fly(s.pos.clone(), s.look.clone(), { duration: 4.6, ease: 'power3.inOut', fov: 50, arc: 6 });
  }, [entered]);

  useArrival('universe', async (via) => {
    introDone.current = true;
    const def = DIMENSION_BY_ID[via ?? 'fashion'];
    const p = new THREE.Vector3(...def.portal.position);
    const n = new THREE.Vector3(Math.sin(def.portal.tilt ?? 0), 0, Math.cos(def.portal.tilt ?? 0));
    // emerge from the portal you entered, then drift back onto the path
    cut(p.clone().addScaledVector(n, -1), p.clone().addScaledVector(n, 10), 72);
    const u = motion.universe;
    u.progress = u.target = 0.78;
    u.pitch = u.pitchTarget = 0;
    u.yaw = u.yawTarget = via === 'tech' ? 0.55 : 0;
    const s = explorerShot(u.progress, u.yaw, 0);
    await fly(s.pos.clone(), s.look.clone(), { duration: 2.6, ease: 'power3.out', fov: 50, arc: 2, lookLead: 0.6 });
  });

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useExperience.getState();
    // fog clears as the universe is revealed
    if (fog) fog.density = damp(fog.density, st.entered ? byTier(st.quality, 0.0042, 0.0046, 0.0055) : 0.02, 1.2, dt);
    if (!st.entered || st.transition || rig.flying) return;
    const u = motion.universe;
    u.progress = damp(u.progress, u.target, 3, dt);
    u.yaw = damp(u.yaw, u.yawTarget, 4, dt);
    u.pitch = damp(u.pitch, u.pitchTarget, 4, dt);
    const s = explorerShot(u.progress, u.yaw, u.pitch);
    setShot(s.pos, s.look, { lambda: 3.2, fov: 50 });

    // which portal is the visitor looking at?
    camera.getWorldDirection(camFwd);
    let best = st.focusedPortal;
    let bestDot = -Infinity;
    for (const d of DIMENSIONS) {
      toPortal.set(...d.portal.position).sub(camera.position).normalize();
      const dot = toPortal.dot(camFwd) + (d.status === 'active' ? 0.02 : 0);
      if (dot > bestDot) {
        bestDot = dot;
        best = d.id;
      }
    }
    if (bestDot > 0.9) st.setFocusedPortal(best);
  });
  return null;
}

export default function UniverseScene() {
  const quality = useExperience((s) => s.quality);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new THREE.FogExp2('#05070c', 0.02);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  const pathPoints = useMemo<[number, number, number][]>(
    () => [
      [0, 5.4, 58],
      [-1.2, 5.6, 44],
      [1.0, 5.9, 30],
      [-0.6, 6.0, 16],
      [0.4, 6.1, 4],
      [0, 6.1, -6],
    ],
    [],
  );

  return (
    <group>
      <SpaceSky />
      <hemisphereLight args={['#9fc4e8', '#1a120c', 0.45]} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[-40, 60, 30]} intensity={1.7} color="#f2e6cf" />
      <directionalLight position={[50, 10, -60]} intensity={0.6} color="#7fb6ff" />
      <Environment resolution={byTier(quality, 256, 128, 64)} frames={1}>
        <Lightformer form="ring" intensity={2.2} color="#bfe3ff" scale={18} position={[0, 12, -30]} />
        <Lightformer form="rect" intensity={1.6} color="#f2e6cf" scale={[30, 6, 1]} position={[-30, 20, 10]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#e8692c" scale={[16, 2, 1]} position={[30, -6, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <Lightformer form="circle" intensity={0.8} color="#c6f432" scale={5} position={[0, -12, 20]} rotation={[Math.PI / 2, 0, 0]} />
      </Environment>

      <Megastructures />
      {DIMENSIONS.map((d) => (
        <Portal key={d.id} def={d} />
      ))}

      {/* stepping islands along the glowing path */}
      <FloatingIsland position={[0, 4.6, 58]} radius={3.6} seed={11} accent="#9fd4ff" />
      <FloatingIsland position={[-1.6, 4.9, 40]} radius={2.6} seed={17} accent="#9fd4ff" />
      <FloatingIsland position={[1.4, 5.2, 24]} radius={2.4} seed={23} accent="#c6f432" />
      <FloatingIsland position={[-0.8, 5.5, 9]} radius={2.2} seed={29} accent="#c6f432" />
      {/* distant islands for depth */}
      <FloatingIsland position={[-46, -4, 22]} radius={8} seed={31} deckRings={false} />
      <FloatingIsland position={[52, 0, 34]} radius={7} seed={37} deckRings={false} />
      <FloatingIsland position={[-70, 22, -70]} radius={9} seed={41} deckRings={false} />
      <FloatingIsland position={[74, 30, -96]} radius={10} seed={43} deckRings={false} />
      {quality !== 'lite' && <FloatingIsland position={[-12, -12, 70]} radius={6} seed={47} deckRings={false} />}

      <GlowPath points={pathPoints} />
      <CloudSea />
      <LightShaft position={[0, 26, -16]} height={34} top={1.5} bottom={10} color="#d9ecff" intensity={0.22} />
      <LightShaft position={[30, 28, -32]} height={30} top={1} bottom={6} color="#9fd4ff" intensity={0.18} />
      {quality !== 'lite' && <LightShaft position={[-34, 30, -38]} height={30} top={1} bottom={6} color="#f2e6cf" intensity={0.12} />}
      <Dust count={byTier(quality, 1400, 800, 220)} area={[110, 50, 170]} center={[0, 12, 0]} />
      <Navigator />
    </group>
  );
}
