import { useExperience } from '../store/experienceStore';
import type { Quality } from '../types';

/** Current render tier, plus convenient booleans. */
export function useQuality() {
  const q = useExperience((s) => s.quality);
  return { quality: q as Quality, high: q === 'high', lite: q === 'lite', balanced: q === 'balanced' };
}

/** Pick a value per tier. */
export function byTier<T>(q: Quality, high: T, balanced: T, lite: T): T {
  return q === 'high' ? high : q === 'balanced' ? balanced : lite;
}
