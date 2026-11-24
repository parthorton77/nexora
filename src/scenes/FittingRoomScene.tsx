import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';
import { AVATAR_BY_ID } from '../data/avatars';
import { productsForSlot } from '../data/products';
import type { Product } from '../types';
import { displayKind } from '../lib/garments';
import { displayScale, productBuild } from '../lib/models';
import { damp } from '../lib/math';
import { money } from '../lib/platform';
import { useExperience } from '../store/experienceStore';
import { useShop } from '../store/shoppingStore';
import { motion, wasDrag } from '../store/motion';
import { DAIS_TOP } from '../components/fashion/layout';
import { fresnel, glow } from '../components/fashion/fixtures';
import { WornOutfit } from '../components/fitting-room/WornOutfit';
import { ProductVisual } from '../components/product/ProductVisual';

/** One candidate on the composer ring. */
function Candidate({ product, index, count, worn }: { product: Product; index: number; count: number; worn: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const lite = useExperience((s) => s.quality === 'lite');
  const build = useMemo(() => productBuild(product, lite), [product, lite]);
  const kind = displayKind(product);
  const s = kind === 'stand' ? displayScale(product, build) * 0.62 : 0.42;
  const yOff = kind === 'stand' ? 0 : build.size.y * s * 0.5 + (kind === 'hang-top' ? 0 : 0.02);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    // fan over the back half (sides and behind), never between camera and avatar
    const spread = count > 1 ? index / (count - 1) : 0.5;
    const a = Math.PI * 0.42 + spread * Math.PI * 1.16 + Math.max(-0.5, Math.min(0.5, motion.fitting.ring));
    const R = 1.75;
    g.position.set(Math.sin(a) * R, 0.95 + (kind === 'stand' ? -0.1 : 0), Math.cos(a) * R);
    g.rotation.y = a;
    const front = Math.abs(Math.sin(a)) > 0.6;
    const want = (worn ? 1.12 : 1) * (hover ? 1.1 : 1) * (front ? 1 : 0.85);
    g.scale.setScalar(damp(g.scale.x, want, 8, dt));
  });
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (wasDrag()) return;
    const shop = useShop.getState();
    shop.setOutfitPiece(product.slot!, worn ? null : product.id);
    useExperience.getState().toast(worn ? `${product.name} removed from the outfit` : `${product.name} added to the outfit`, worn ? 'info' : 'ok');
  };
  return (
    <group ref={ref}>
      <group
        position={[0, yOff, 0]}
        scale={s}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = '';
        }}
        onClick={click}
      >
        <ProductVisual product={product} />
      </group>
      <mesh position={[0, -0.36, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow(worn ? '#c6f432' : '#9fd4ff', worn ? 2 : 0.8)}>
        <torusGeometry args={[0.2, worn ? 0.006 : 0.003, 4, 48]} />
      </mesh>
      {(hover || worn) && (
        <Html position={[0, -0.5, 0]} center zIndexRange={[25, 10]} style={{ pointerEvents: 'none' }}>
          <div className={`product-tag glass ${worn ? 'ring-1 ring-lime/50' : ''}`}>
            {product.name} <span className="text-white/50">{money(product.price)}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function ComposeRing() {
  const slot = useExperience((s) => s.composeSlot);
  const outfit = useShop((s) => s.outfit);
  const list = productsForSlot(slot);
  return (
    <group position={[0, DAIS_TOP, 0]}>
      {list.map((p, i) => (
        <Candidate key={p.id} product={p} index={i} count={list.length} worn={outfit[slot] === p.id} />
      ))}
    </group>
  );
}

/**
 * The fitting pod at the heart of the atrium: a preset avatar wearing the
 * current outfit, revealed by a scan line. Simulated drape, not physics.
 */
export default function FittingRoomScene() {
  const mode = useExperience((s) => s.mode);
  const tab = useExperience((s) => s.fittingTab);
  const avatarId = useShop((s) => s.avatarId);
  const outfit = useShop((s) => s.outfit);
  const show = mode === 'fitting';
  const [mounted, setMounted] = useState(false);
  const scan = useRef({ v: 0 });
  const turntable = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  const clip = useMemo(() => [plane], [plane]);
  const profile = AVATAR_BY_ID[avatarId] ?? AVATAR_BY_ID.arjun;
  const height = profile.heightCm / 100 + 0.12;
  const outfitKey = Object.values(outfit).join('|');

  useEffect(() => {
    const rm = useExperience.getState().reducedMotion;
    if (show) {
      setMounted(true);
      scan.current.v = 0;
      const tw = gsap.to(scan.current, { v: 1, duration: rm ? 0.01 : 2.0, delay: rm ? 0 : 0.5, ease: 'power2.inOut' });
      return () => void tw.kill();
    }
    const tw = gsap.to(scan.current, { v: 0, duration: rm ? 0.01 : 0.6, ease: 'power2.in', onComplete: () => setMounted(false) });
    return () => void tw.kill();
  }, [show, avatarId]);

  // a quick partial re-scan when the outfit changes
  useEffect(() => {
    if (!show || useExperience.getState().reducedMotion) return;
    scan.current.v = Math.min(scan.current.v, 0.82);
    const tw = gsap.to(scan.current, { v: 1, duration: 0.7, ease: 'power2.out' });
    return () => void tw.kill();
  }, [outfitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const v = scan.current.v;
    plane.constant = DAIS_TOP + v * height;
    if (turntable.current) {
      const f = motion.fitting;
      if (!f.dragging && !useExperience.getState().reducedMotion && tab === 'fit') f.rotY += dt * 0.0;
      turntable.current.rotation.y = damp(turntable.current.rotation.y, f.rotY, 6, dt);
    }
    if (ring.current) {
      ring.current.position.y = DAIS_TOP + v * height;
      ring.current.visible = v > 0.01 && v < 0.99;
    }
  });

  if (!mounted) return null;
  return (
    <group>
      <group position={[0, DAIS_TOP, 0]}>
        <group ref={turntable}>
          <WornOutfit avatarId={avatarId} outfit={outfit} clip={clip} />
        </group>
        <mesh position={[0, 1.3, 0]} material={fresnel('#9fd4ff', 0.35)} renderOrder={7}>
          <cylinderGeometry args={[1.05, 1.05, 2.6, 64, 1, true]} />
        </mesh>
        <mesh position={[0, 2.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow('#9fd4ff', 1.4)}>
          <torusGeometry args={[1.05, 0.008, 4, 96]} />
        </mesh>
        <mesh position={[0, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow('#bfe3ff', 1.2)}>
          <torusGeometry args={[1.05, 0.01, 4, 96]} />
        </mesh>
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 1.04, 96]} />
        <meshBasicMaterial color={new THREE.Color('#e6f6ff').multiplyScalar(1.6)} toneMapped={false} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      {tab === 'compose' && <ComposeRing />}
    </group>
  );
}
