import { useMemo } from 'react';
import { CURATED_LOOKS } from '../data/looks';
import type { Outfit } from '../types';
import { useShop } from '../store/shoppingStore';

export interface RunwayLook {
  id: string;
  name: string;
  note: string;
  avatarId: string;
  outfit: Outfit;
}

/** Your current outfit and saved outfits walk first, then the curated looks. */
export function useRunwayLooks(): RunwayLook[] {
  const outfit = useShop((s) => s.outfit);
  const saved = useShop((s) => s.outfits);
  const avatarId = useShop((s) => s.avatarId);
  return useMemo(() => {
    const mine: RunwayLook[] = [];
    if (Object.values(outfit).some(Boolean)) mine.push({ id: 'current', name: 'Your outfit', note: 'Composed by you in the fitting pod.', avatarId, outfit });
    saved.slice(0, 3).forEach((o) => mine.push({ id: o.id, name: o.name, note: 'From your wishlist.', avatarId, outfit: o.outfit }));
    return [...mine, ...CURATED_LOOKS];
  }, [outfit, saved, avatarId]);
}
