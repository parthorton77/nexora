import { memo, useMemo } from 'react';
import type * as THREE from 'three';
import type { BodyProfile, Outfit, Product } from '../../types';
import { PRODUCT_BY_ID, SLOT_ORDER } from '../../data/products';
import { AVATAR_BY_ID } from '../../data/avatars';
import { bodyFromProfile, mannequinBuild, wornBuild } from '../../lib/garments';
import { recommendedSize, visualEase } from '../../lib/tryon/fit';
import { useExperience } from '../../store/experienceStore';
import { useShop, useVariant } from '../../store/shoppingStore';
import { ProductModel, paletteFor } from '../product/ProductModel';

/**
 * A preset mannequin wearing an outfit. Each garment is re-lofted around the
 * avatar's body with size-dependent ease, and each layer gets enough room to
 * enclose the one beneath. A visual approximation — not cloth simulation.
 */
export const WornOutfit = memo(function WornOutfit({ avatarId, outfit, clip, shadows = false }: { avatarId: string; outfit: Outfit; clip?: THREE.Plane[]; shadows?: boolean }) {
  // worn garments are dense; full detail only on the cinematic tier
  const lite = useExperience((s) => s.quality !== 'high');
  const variants = useShop((s) => s.variants);
  const profile = AVATAR_BY_ID[avatarId] ?? AVATAR_BY_ID.arjun;
  const pieces = SLOT_ORDER.map((slot) => outfit[slot])
    .filter((id): id is string => !!id && !!PRODUCT_BY_ID[id])
    .map((id) => PRODUCT_BY_ID[id]);
  const hasShoes = pieces.some((p) => p.slot === 'shoes');
  const mannequin = useMemo(() => mannequinBuild(profile, lite, !hasShoes), [profile, lite, hasShoes]);

  const sizeOf = (p: Product) => variants[p.id]?.size ?? recommendedSize(p, profile);
  const dropOf = (p?: Product) => (p?.model.type === 'garment' && p.model.spec.kind === 'top' ? p.model.spec.top.dropShoulder : 0);
  const top = outfit.top ? PRODUCT_BY_ID[outfit.top] : undefined;
  const outer = outfit.outer ? PRODUCT_BY_ID[outfit.outer] : undefined;
  const topEase = top ? visualEase(top, sizeOf(top), profile) : 0;
  const outerOwn = outer ? visualEase(outer, sizeOf(outer), profile) : 0;
  const outerEase = top && outer ? Math.max(outerOwn, topEase + dropOf(top) * 0.35 + 0.012) : outerOwn;
  const strapClear = Math.max(top ? topEase + dropOf(top) * 0.5 : 0, outer ? outerEase + 0.016 : 0) + 0.03;
  const easeFor = (p: Product) =>
    p.slot === 'outer' ? outerEase : p.slot === 'accessory' && p.model.spec.kind === 'bag' ? strapClear : visualEase(p, sizeOf(p), profile);

  return (
    <group>
      <ProductModel
        build={mannequin}
        product={MANNEQUIN}
        palette={{ main: profile.tone, trim: profile.tone, stitch: profile.tone, metal: '#c9ced4', sole: '#eeeeee' }}
        clip={clip}
        shadows={shadows}
        skin={profile.tone}
        logo={false}
      />
      {pieces.map((p) => (
        <Worn key={p.id} product={p} profile={profile} ease={easeFor(p)} lite={lite} clip={clip} shadows={shadows} />
      ))}
    </group>
  );
});

function Worn({ product, profile, ease, lite, clip, shadows }: { product: Product; profile: BodyProfile; ease: number; lite: boolean; clip?: THREE.Plane[]; shadows: boolean }) {
  const v = useVariant(product)!;
  const placement = useMemo(() => wornBuild(product, profile, ease, lite), [product, profile, ease, lite]);
  const palette = useMemo(() => paletteFor(product, v.color), [product, v.color]);
  const mesh = <ProductModel build={placement.build} product={product} palette={palette} clip={clip} shadows={shadows} />;
  if (placement.pair) {
    const s = placement.scale ?? 1;
    const ankleX = bodyFromProfile(profile).ankleX;
    return (
      <>
        <group position={[ankleX, 0, 0.068]} scale={[s, s, s]} rotation={[0, -0.08, 0]}>
          {mesh}
        </group>
        <group position={[-ankleX, 0, 0.068]} scale={[-s, s, s]} rotation={[0, 0.08, 0]}>
          <ProductModel build={placement.build} product={product} palette={palette} clip={clip} shadows={shadows} logo={false} />
        </group>
      </>
    );
  }
  return (
    <group position={placement.position ?? [0, 0, 0]} rotation={placement.rotation ?? [0, 0, 0]} scale={placement.scale ?? 1}>
      {mesh}
    </group>
  );
}

/** Minimal product stub so the mannequin shares the role-material system. */
const MANNEQUIN: Product = {
  ...PRODUCT_BY_ID['tee-core'],
  id: '__mannequin',
  fabric: 'leather',
};
