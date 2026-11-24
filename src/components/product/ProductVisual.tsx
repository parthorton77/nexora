import { useMemo } from 'react';
import type * as THREE from 'three';
import type { Product } from '../../types';
import { garmentOf } from '../../lib/garments';
import { productBuild } from '../../lib/models';
import { useAssets } from '../../lib/assets';
import { useExperience } from '../../store/experienceStore';
import { useVariant } from '../../store/shoppingStore';
import { ProductModel, paletteFor } from './ProductModel';
import { WithGLB } from './ProductGLB';

export const PAIR_X = 0.072;

/**
 * A product as a 3D object in its currently chosen colour. Uses a production
 * GLB when one is registered (catalogue `model.glb` or /models/manifest.json),
 * otherwise the procedural model. Sneakers render as a mirrored pair.
 */
export function ProductVisual({ product, clip, shadows, single }: { product: Product; clip?: THREE.Plane[]; shadows?: boolean; single?: boolean }) {
  const lite = useExperience((s) => s.quality === 'lite');
  const build = useMemo(() => productBuild(product, lite), [product, lite]);
  const v = useVariant(product)!;
  const palette = useMemo(() => paletteFor(product, v.color), [product, v.color]);
  const manifest = useAssets((s) => s.glb[product.id]);
  const glb = manifest ?? (product.model.glb ? { url: product.model.glb } : undefined);
  const pair = garmentOf(product)?.kind === 'sneaker' && !single;
  const one = (logo = true) => {
    const procedural = <ProductModel build={build} product={product} palette={palette} clip={clip} shadows={shadows} logo={logo} />;
    return glb ? <WithGLB entry={glb} tint={palette.main} clip={clip} procedural={procedural} /> : procedural;
  };
  if (!pair) return one();
  return (
    <>
      <group position={[PAIR_X, 0, 0]} rotation={[0, -0.08, 0]}>
        {one()}
      </group>
      <group position={[-PAIR_X, 0, -0.03]} rotation={[0, 0.08, 0]} scale={[-1, 1, 1]}>
        {one(false)}
      </group>
    </>
  );
}

export function useProductBuild(product: Product | undefined) {
  const lite = useExperience((s) => s.quality === 'lite');
  return useMemo(() => (product ? productBuild(product, lite) : undefined), [product, lite]);
}
