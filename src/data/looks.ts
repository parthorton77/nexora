import type { Outfit } from '../types';

/** Curated looks that walk the runway (alongside the visitor's own saved outfits). */
export interface CuratedLook {
  id: string;
  name: string;
  note: string;
  avatarId: string;
  outfit: Outfit;
}

export const CURATED_LOOKS: CuratedLook[] = [
  {
    id: 'look-signal',
    name: 'Signal Shell',
    note: 'Weatherproof streetwear in ice and lime.',
    avatarId: 'arjun',
    outfit: { top: 'hoodie-orbit', outer: 'jacket-pulse', bottom: 'cargo-vector', shoes: 'sneaker-nova', accessory: 'shades-vanta' },
  },
  {
    id: 'look-aurum',
    name: 'Aurum Night',
    note: 'Liquid satin over sculpted jersey.',
    avatarId: 'noor',
    outfit: { top: 'tee-sculpt', outer: 'jacket-aurum', bottom: 'trouser-meridian', shoes: 'sneaker-zenith' },
  },
  {
    id: 'look-core',
    name: 'Core Uniform',
    note: 'The everyday set, perfected.',
    avatarId: 'ira',
    outfit: { top: 'tee-core', outer: 'shirt-axis', bottom: 'jeans-horizon', shoes: 'sneaker-halo' },
  },
  {
    id: 'look-orbit',
    name: 'Orbit Drift',
    note: 'Heavy cotton, trail soles, hands free.',
    avatarId: 'dev',
    outfit: { top: 'tee-flux', bottom: 'cargo-vector', shoes: 'sneaker-drift', accessory: 'cap-arc' },
  },
];
