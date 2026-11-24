import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ColorVariant, FabricKind, Product } from '../../types';
import type { GarmentBuild, GarmentPart, MatRole } from '../../lib/garments';
import { garmentOf } from '../../lib/garments';
import { makeFabricMaterial } from '../../lib/fabric';
import { logoTexture } from '../../lib/models';
import { useExperience } from '../../store/experienceStore';

export interface Palette {
  main: string;
  trim: string;
  stitch: string;
  metal: string;
  sole: string;
}

export function paletteFor(p: Product, variant: ColorVariant): Palette {
  const main = new THREE.Color(variant.hex);
  const darker = '#' + main.clone().multiplyScalar(0.55).getHexString();
  const lighter = '#' + main.clone().lerp(new THREE.Color('#ffffff'), 0.25).getHexString();
  return {
    main: variant.hex,
    trim: variant.trim ?? darker,
    stitch: variant.stitch ?? (p.fabric === 'denim' ? '#c9883a' : lighter),
    metal: variant.metal ?? '#c9ced4',
    sole: variant.sole ?? '#efeeea',
  };
}

function trimFabric(p: Product): FabricKind {
  const g = garmentOf(p);
  if (g?.kind === 'top' && g.top.ribUsesTrim) return 'rib';
  if (p.fabric === 'knit') return 'nylon';
  if (p.fabric === 'leather') return 'leather';
  if (!p.fabric) return 'nylon';
  return p.fabric === 'jersey' || p.fabric === 'fleece' ? 'rib' : p.fabric;
}

type MatMap = Record<MatRole, THREE.Material>;

function colorTarget(role: MatRole, pal: Palette, tech: boolean): string | null {
  switch (role) {
    case 'fabric':
    case 'rib':
      return pal.main;
    case 'trim':
      return pal.trim;
    case 'stitch':
      return pal.stitch;
    case 'metal':
      return tech ? null : pal.metal;
    case 'sole':
      return pal.sole;
    case 'lens':
      return tech ? null : pal.main;
    case 'glow':
      return tech ? pal.trim : null;
    default:
      return null;
  }
}

function makeMaterials(p: Product, pal: Palette, rich: boolean, skin: string): MatMap {
  const tech = p.model.type === 'tech';
  const std = (color: string, roughness: number, metalness = 0, side: THREE.Side = THREE.DoubleSide) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, side, vertexColors: true });
  const phys = (color: string, roughness: number, metalness: number, clearcoat = 0) =>
    rich
      ? new THREE.MeshPhysicalMaterial({ color, roughness, metalness, clearcoat, clearcoatRoughness: 0.15, vertexColors: true, side: THREE.DoubleSide })
      : std(color, roughness, metalness);

  let fabric: THREE.Material;
  let trim: THREE.Material;
  if (tech) {
    fabric = p.fabric ? makeFabricMaterial(p.fabric, pal.main, !rich, THREE.FrontSide) : phys(pal.main, 0.32, 0.65, 0.6);
    trim = p.model.spec.kind === 'watch' ? makeFabricMaterial('knit', pal.trim, !rich, THREE.DoubleSide) : phys(pal.trim, 0.55, 0.15, 0.2);
  } else {
    fabric = makeFabricMaterial(p.fabric ?? 'nylon', pal.main, !rich, THREE.DoubleSide);
    trim = makeFabricMaterial(trimFabric(p), pal.trim, !rich, THREE.DoubleSide);
  }
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(pal.trim), toneMapped: false });
  const lens = rich
    ? new THREE.MeshPhysicalMaterial({ color: pal.main, roughness: 0.05, metalness: 0.9, clearcoat: 1, clearcoatRoughness: 0.04, vertexColors: true, side: THREE.DoubleSide })
    : std(pal.main, 0.08, 0.92);
  if (tech) (lens as THREE.MeshStandardMaterial).color.set('#0b0d12');
  return {
    fabric,
    inner: fabric,
    rib: makeFabricMaterial('rib', pal.main, !rich, THREE.DoubleSide),
    trim,
    metal: std(tech ? '#c9ced4' : pal.metal, 0.22, 1),
    stitch: std(pal.stitch, 0.75),
    sole: std(pal.sole, 0.62),
    gum: std('#3b2f26', 0.85),
    dark: std('#0b0c0f', 0.12, 0.4),
    skin: std(skin, 0.3, 0.55),
    joint: std('#16171a', 0.5, 0.3),
    lens,
    glow,
  };
}

const tmpColor = new THREE.Color();

/**
 * Renders a procedural product build with role-based materials. Colour
 * changes animate rather than pop. Works for garments and tech objects.
 */
export const ProductModel = memo(function ProductModel({
  build,
  product,
  palette,
  clip,
  shadows = false,
  skin = '#c9ced4',
  logo = true,
}: {
  build: GarmentBuild;
  product: Product;
  palette: Palette;
  clip?: THREE.Plane[];
  shadows?: boolean;
  skin?: string;
  logo?: boolean;
}) {
  const rich = useExperience((s) => s.quality === 'high');
  const tech = product.model.type === 'tech';
  const mats = useMemo(() => makeMaterials(product, palette, rich, skin), [product, rich]); // eslint-disable-line react-hooks/exhaustive-deps
  const target = useRef(palette);
  target.current = palette;
  const skinRef = useRef(skin);
  skinRef.current = skin;

  useLayoutEffect(() => {
    for (const m of Object.values(mats)) {
      m.clippingPlanes = clip ?? null;
      m.clipShadows = !!clip;
      m.needsUpdate = true;
    }
  }, [mats, clip]);

  useLayoutEffect(() => () => new Set(Object.values(mats)).forEach((m) => m.dispose()), [mats]);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 9);
    for (const role of Object.keys(mats) as MatRole[]) {
      const want = role === 'skin' ? skinRef.current : colorTarget(role, target.current, tech);
      if (!want) continue;
      const m = mats[role] as THREE.MeshStandardMaterial;
      tmpColor.set(want);
      if (!m.color.equals(tmpColor)) {
        m.color.lerp(tmpColor, k);
        if (Math.abs(m.color.r - tmpColor.r) + Math.abs(m.color.g - tmpColor.g) + Math.abs(m.color.b - tmpColor.b) < 0.002) m.color.copy(tmpColor);
        const phys = m as THREE.MeshPhysicalMaterial;
        if (phys.isMeshPhysicalMaterial && phys.sheen > 0) phys.sheenColor.copy(m.color).lerp(new THREE.Color('#ffffff'), 0.35);
      }
    }
  });

  const logoAnchor = logo ? build.anchors.logo : undefined;
  const logoQuat = useMemo(() => {
    if (!logoAnchor) return null;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), logoAnchor.n.clone().normalize());
    // keep the mark upright where possible
    return q;
  }, [logoAnchor]);
  const tiny = Math.max(build.size.x, build.size.y) < 0.2;

  return (
    <group>
      {build.parts.map((part, i) => (
        <Part key={i} part={part} material={mats[part.role]} shadows={shadows} />
      ))}
      {logoAnchor && logoQuat && (
        <mesh position={logoAnchor.p.clone().addScaledVector(logoAnchor.n, 0.0015)} quaternion={logoQuat} renderOrder={2}>
          <planeGeometry args={tiny ? [0.016, 0.008] : [0.05, 0.025]} />
          <meshStandardMaterial map={logoTexture()} roughness={0.5} metalness={0.2} polygonOffset polygonOffsetFactor={-2} clippingPlanes={clip ?? null} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
});

function Part({ part, material, shadows }: { part: GarmentPart; material: THREE.Material; shadows: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!part.instances || !ref.current) return;
    part.instances.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [part]);
  if (part.instances) {
    return <instancedMesh ref={ref} args={[part.geometry, material, part.instances.length]} castShadow={false} frustumCulled={false} />;
  }
  return <mesh geometry={part.geometry} material={material} castShadow={shadows && !!part.castShadow} receiveShadow={shadows && part.role !== 'inner'} />;
}
