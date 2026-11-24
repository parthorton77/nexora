import type { BodyProfile } from '../types';

/**
 * Preset avatars. These are stand-ins with fixed measurements, NOT body scans.
 * A future BodyScanProvider (lib/tryon/contracts.ts) returns the same shape
 * with source: 'scan'.
 */
export const AVATARS: BodyProfile[] = [
  { id: 'ira', name: 'Ira', heightCm: 168, chestCm: 84, waistCm: 66, hipCm: 92, footCm: 24.0, build: 'Slim', tone: '#dfe5ea', finish: 'Porcelain', source: 'preset' },
  { id: 'arjun', name: 'Arjun', heightCm: 183, chestCm: 100, waistCm: 82, hipCm: 97, footCm: 27.2, build: 'Athletic', tone: '#8d949c', finish: 'Titanium', source: 'preset' },
  { id: 'noor', name: 'Noor', heightCm: 171, chestCm: 92, waistCm: 74, hipCm: 104, footCm: 25.0, build: 'Curvy', tone: '#b9a48c', finish: 'Sandstone', source: 'preset' },
  { id: 'dev', name: 'Dev', heightCm: 177, chestCm: 110, waistCm: 96, hipCm: 106, footCm: 27.6, build: 'Broad', tone: '#3a3e45', finish: 'Graphite', source: 'preset' },
];

export const AVATAR_BY_ID: Record<string, BodyProfile> = Object.fromEntries(AVATARS.map((a) => [a.id, a]));
