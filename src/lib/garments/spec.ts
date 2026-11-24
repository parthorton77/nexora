import type { GarmentSpec, Product } from '../../types';

/** The procedural garment spec of a fashion product (undefined for other dimensions). Three.js-free. */
export function garmentOf(p: Product): GarmentSpec | undefined {
  return p.model.type === 'garment' ? p.model.spec : undefined;
}
