import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Product, ZoneId } from '../../types';
import type { ZoneDef } from '../../data/dimensions';
import { displayKind } from '../../lib/garments';
import { displayScale } from '../../lib/models';
import { clamp } from '../../lib/math';
import { money } from '../../lib/platform';
import { useExperience } from '../../store/experienceStore';
import { carouselGoTo, motion, wasDrag } from '../../store/motion';
import { HANG_Y, STAND_Y, slotTransform } from '../fashion/layout';
import { GEO, MAT, fresnel, glow } from '../fashion/fixtures';
import { ProductVisual, useProductBuild } from './ProductVisual';

/** Model groups by product id: the extraction animation starts from here. */
export const displayNodes = new Map<string, THREE.Object3D>();

function Fixture({ display, kind, accent, height }: { display: ZoneDef['display']; kind: ReturnType<typeof displayKind>; accent: string; height: number }) {
  const hang = kind !== 'stand';
  switch (display) {
    case 'rail':
      return hang ? (
        <group position={[0, HANG_Y, 0]}>
          <mesh geometry={GEO.stem} material={MAT.chrome} position={[0, 0.1, 0]} />
          <mesh geometry={GEO.puck} material={glow(accent, 1.8)} position={[0, 0.2, 0]} />
          <mesh geometry={GEO.bar} material={MAT.chrome} rotation={[0, 0, Math.PI / 2]} position={[0, 0.005, 0]} />
        </group>
      ) : (
        <group position={[0, STAND_Y - 0.03, 0]}>
          <mesh geometry={GEO.disc} material={MAT.graphite} />
          <mesh geometry={GEO.ring} material={glow(accent)} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} />
        </group>
      );
    case 'plinths':
      return (
        <group>
          {hang && <mesh geometry={GEO.bar} material={MAT.chrome} rotation={[0, 0, Math.PI / 2]} position={[0, HANG_Y + 0.005, 0]} />}
          {hang && <mesh geometry={GEO.stem} material={MAT.chrome} position={[0, HANG_Y + 0.12, 0]} scale={[1, 1.2, 1]} />}
          <group position={[0, hang ? HANG_Y - height - 0.28 : STAND_Y - 0.03, 0]}>
            <mesh geometry={GEO.disc} material={MAT.chrome} scale={[1.05, 0.6, 1.05]} />
            <mesh geometry={GEO.ring} material={glow('#f2e6cf', 1.4)} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} scale={1.05} />
          </group>
        </group>
      );
    case 'frames':
      return (
        <group position={[0, 1.35, -0.32]}>
          <mesh geometry={GEO.frame} material={MAT.frost} />
          <mesh geometry={GEO.frameEdgeV} material={MAT.chrome} position={[-0.55, 0, 0]} />
          <mesh geometry={GEO.frameEdgeV} material={MAT.chrome} position={[0.55, 0, 0]} />
          <mesh geometry={GEO.frameEdgeH} material={glow(accent, 1.4)} position={[0, 1.27, 0]} />
          {hang && <mesh geometry={GEO.bar} material={MAT.chrome} rotation={[0, 0, Math.PI / 2]} position={[0, HANG_Y - 1.35 + 0.005, 0.32]} />}
          {!hang && <mesh geometry={GEO.disc} material={MAT.graphite} position={[0, STAND_Y - 1.38, 0.32]} />}
        </group>
      );
    case 'helix':
      return (
        <group position={[0, STAND_Y - 0.03, 0]}>
          <mesh geometry={GEO.disc} material={MAT.titanium} />
          <mesh geometry={GEO.ring} material={glow(accent, 2)} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} />
        </group>
      );
    case 'orbs':
      return (
        <group position={[0, STAND_Y + 0.2, 0]}>
          <mesh geometry={GEO.orb} material={fresnel(accent, 0.65)} renderOrder={6} />
          <mesh geometry={GEO.orbRing} material={glow(accent, 1.4)} rotation={[Math.PI / 2.3, 0, 0.3]} />
        </group>
      );
    case 'pedestals':
      return (
        <group>
          <mesh geometry={GEO.pedestal} material={MAT.graphite} position={[0, (STAND_Y - 0.03) / 2, 0]} scale={[1, STAND_Y - 0.03, 1]} />
          <mesh geometry={GEO.ring} material={glow(accent, 2)} rotation={[Math.PI / 2, 0, 0]} position={[0, STAND_Y - 0.02, 0]} scale={0.88} />
        </group>
      );
  }
}

/**
 * One product on its zone fixture. Position comes from the carousel every
 * frame (no re-render); hover reveals the name; the centred piece is active.
 */
export const DisplayItem = memo(function DisplayItem({ product, index, zone, display, accent }: { product: Product; index: number; zone: ZoneId; display: ZoneDef['display']; accent: string }) {
  const outer = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const extracted = useExperience((s) => s.extractedId === product.id);
  const focused = useExperience((s) => s.zone === zone && (s.focusIndex[zone] ?? 0) === index);
  const browsing = useExperience((s) => s.zone === zone && s.mode === 'browse');
  const build = useProductBuild(product)!;
  const kind = displayKind(product);
  const scale = kind === 'stand' ? displayScale(product, build) : 1;
  const baseY = kind === 'hang-top' ? HANG_Y : kind === 'hang-bottom' ? HANG_Y - 0.04 : STAND_Y + (display === 'orbs' ? 0.2 - (build.size.y * scale) / 2 : 0);
  const spin = kind === 'stand' || display === 'plinths';
  const tagY = kind === 'stand' ? baseY + build.size.y * scale + 0.22 : baseY - build.size.y - 0.22;
  const phase = useMemo(() => (index * 1.7) % 6.28, [index]);

  useEffect(() => {
    if (model.current) displayNodes.set(product.id, model.current);
    return () => {
      displayNodes.delete(product.id);
    };
  }, [product.id]);

  useFrame(({ clock }, dt) => {
    const g = outer.current;
    if (!g) return;
    const st = useExperience.getState();
    const center = st.zone === zone ? motion.carousel.pos : st.focusIndex[zone] ?? 0;
    const off = index - center;
    const vis = Math.abs(off) < 3.7;
    g.visible = vis;
    if (!vis) return;
    const t = slotTransform(off, display);
    const near = clamp(1 - Math.abs(off), 0, 1);
    const f = st.zone === zone ? motion.focus.value : 0;
    g.position.set(t.x * (1 + f * 0.35), t.y, t.z - f * 0.9);
    g.rotation.y = t.rot * 0.85;
    g.scale.setScalar(0.84 + 0.16 * near);
    const m = model.current;
    if (!m || st.reducedMotion) return;
    if (spin) m.rotation.y += dt * (near > 0.5 ? 0.45 : 0.18);
    else m.rotation.z = Math.sin(clock.elapsedTime * 0.9 + phase) * 0.012 + clamp(motion.carousel.vel, -0.2, 0.2) * 0.25 * (st.zone === zone ? 1 : 0);
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };
  const out = () => {
    setHovered(false);
    document.body.style.cursor = '';
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (wasDrag()) return;
    const st = useExperience.getState();
    if (st.mode === 'inspect' || st.mode === 'fitting' || st.mode === 'runway') return;
    if (st.zone !== zone || st.mode !== 'browse') {
      st.setZone(zone);
      carouselGoTo(index);
      return;
    }
    if ((st.focusIndex[zone] ?? 0) === index && Math.abs(motion.carousel.pos - index) < 0.2) st.select(product.id);
    else carouselGoTo(index);
  };

  return (
    <group ref={outer}>
      <Fixture display={display} kind={kind} accent={accent} height={build.size.y} />
      <group ref={model} position={[0, baseY, 0]} scale={scale} visible={!extracted} onPointerOver={over} onPointerOut={out} onClick={click}>
        <ProductVisual product={product} />
      </group>
      {(hovered || (focused && browsing)) && !extracted && (
        <Html position={[0, tagY, 0.1]} center zIndexRange={[25, 10]} style={{ pointerEvents: 'none' }}>
          <div className={`product-tag glass ${focused && browsing ? 'ring-1 ring-lime/40' : ''}`}>
            <span className="text-ink">{product.name}</span>
            <span className="ml-2 text-white/55">{money(product.price)}</span>
          </div>
        </Html>
      )}
    </group>
  );
});
