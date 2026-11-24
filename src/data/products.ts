import type { DimensionId, Product, Slot, ZoneId } from '../types';
import { STREETWEAR } from './catalog/streetwear';
import { LUXURY } from './catalog/luxury';
import { ESSENTIALS } from './catalog/essentials';
import { SNEAKERS } from './catalog/sneakers';
import { ACCESSORIES } from './catalog/accessories';
import { TECH } from './catalog/tech';

/**
 * Central product catalogue. Every surface (3D displays, inspector, fitting
 * room, bag, companion, fallback) reads from here. Swap this module for an API
 * call without touching rendering components.
 */
export const PRODUCTS: Product[] = [...STREETWEAR, ...LUXURY, ...ESSENTIALS, ...SNEAKERS, ...ACCESSORIES, ...TECH];

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

const byZone = new Map<ZoneId, Product[]>();
export function productsInZone(zone: ZoneId): Product[] {
  let list = byZone.get(zone);
  if (!list) {
    list = PRODUCTS.filter((p) => p.zone === zone);
    byZone.set(zone, list);
  }
  return list;
}

export const productsInDimension = (d: DimensionId) => PRODUCTS.filter((p) => p.dimension === d);

export const FASHION = productsInDimension('fashion');

export const SLOT_ORDER: Slot[] = ['top', 'outer', 'bottom', 'shoes', 'accessory'];
export const SLOT_LABEL: Record<Slot, string> = {
  top: 'Tops',
  outer: 'Outerwear',
  bottom: 'Bottoms',
  shoes: 'Footwear',
  accessory: 'Accessories',
};

export const productsForSlot = (slot: Slot) => FASHION.filter((p) => p.slot === slot);
