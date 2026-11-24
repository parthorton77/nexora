import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { DimensionDef, ZoneDef } from '../../data/dimensions';
import { productsInZone } from '../../data/products';
import { clamp, damp } from '../../lib/math';
import { useExperience } from '../../store/experienceStore';
import { motion } from '../../store/motion';
import { ARC_R, HANG_Y, zoneAngle, zoneFrame } from '../fashion/layout';
import { MAT, pool } from '../fashion/fixtures';
import { ZoneArchitecture } from '../fashion/ZoneArchitecture';
import { DisplayItem } from './DisplayItem';

/** Inertia + snapping for the active zone's carousel (one instance per world). */
export function CarouselPhysics() {
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useExperience.getState();
    if (st.mode !== 'browse' || st.transition) return;
    const c = motion.carousel;
    c.count = productsInZone(st.zone).length;
    if (!c.dragging) {
      if (Math.abs(c.vel) > 0.004) {
        c.pos += c.vel * dt * 60;
        c.vel *= Math.exp(-dt * 3.4);
        if (c.pos < 0 || c.pos > c.count - 1) c.vel *= 0.6;
        if (Math.abs(c.vel) <= 0.004) {
          c.vel = 0;
          c.target = clamp(Math.round(c.pos), 0, c.count - 1);
        }
      } else {
        if (c.target === null) c.target = clamp(Math.round(c.pos), 0, c.count - 1);
        c.pos = st.reducedMotion ? c.target : damp(c.pos, c.target, 8, dt);
        if (Math.abs(c.pos - c.target) < 0.0005) c.pos = c.target;
      }
    }
    st.setFocusIndex(st.zone, clamp(Math.round(c.pos), 0, c.count - 1));
  });
  return null;
}

/** The curved floating rail that streetwear hangers slide along. */
function Rail({ accent }: { accent: string }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const phi = -1.25 + (i / 40) * 2.5;
      pts.push(new THREE.Vector3(Math.sin(phi) * ARC_R, HANG_Y + 0.2, -ARC_R + Math.cos(phi) * ARC_R));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.022, 10, false);
  }, []);
  const glowGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const phi = -1.25 + (i / 40) * 2.5;
      pts.push(new THREE.Vector3(Math.sin(phi) * (ARC_R - 0.001), HANG_Y + 0.235, -ARC_R + Math.cos(phi) * (ARC_R - 0.001)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.006, 6, false);
  }, []);
  return (
    <group>
      <mesh geometry={geo} material={MAT.chrome} />
      <mesh geometry={glowGeo}>
        <meshBasicMaterial color={new THREE.Color(accent).multiplyScalar(1.6)} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** One zone: its architecture, its display system and its floating collection label. */
export function ZoneStage({ dim, zone }: { dim: DimensionDef; zone: ZoneDef }) {
  const angle = zoneAngle(dim, zone.id);
  const frame = zoneFrame(angle);
  const products = productsInZone(zone.id);
  const overview = useExperience((s) => s.mode === 'overview');
  const active = useExperience((s) => s.zone === zone.id && s.mode !== 'overview');
  const hideLabel = useExperience((s) => s.mode === 'inspect' || s.mode === 'fitting' || s.mode === 'runway');
  return (
    <group position={frame.position} rotation={[0, frame.rotationY, 0]}>
      <ZoneArchitecture zone={zone} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, -1.4]} material={pool(zone.accent, active ? 0.26 : 0.14)} renderOrder={1}>
        <planeGeometry args={[11, 8]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.017, -0.6]} material={pool('#dfeaf4', active ? 0.22 : 0.08)} renderOrder={1}>
        <planeGeometry args={[6, 4]} />
      </mesh>
      {zone.display === 'rail' && <Rail accent={zone.accent} />}
      {products.map((p, i) => (
        <DisplayItem key={p.id} product={p} index={i} zone={zone.id} display={zone.display} accent={zone.accent} />
      ))}
      <Html position={[-2.2, 3.55, -1.2]} zIndexRange={[15, 5]} distanceFactor={active ? 6 : 9} style={{ pointerEvents: overview ? 'auto' : 'none' }}>
        <button
          type="button"
          className="zone-label"
          style={{ ['--accent' as string]: zone.accent, pointerEvents: overview ? 'auto' : 'none', background: 'none', border: 0, textAlign: 'left', opacity: hideLabel ? 0 : active || overview ? 1 : 0.55, transition: 'opacity .5s' }}
          onClick={() => useExperience.getState().setZone(zone.id)}
          tabIndex={overview ? 0 : -1}
          aria-label={`Go to zone ${zone.code}, ${zone.name}`}
        >
          <div className="zone-label__code">
            {zone.code} — {products.length} PIECES
          </div>
          <div className="zone-label__name">{zone.name.toUpperCase()}</div>
        </button>
      </Html>
    </group>
  );
}
