import type { DimensionId, ZoneId } from '../types';

/**
 * Dimension registry. The universe renders one portal per entry; a dimension
 * becomes enterable by setting `status: 'active'`, giving it zones and
 * registering a scene in `scenes/registry.ts`. Nothing in the universe needs
 * to be rewritten to add one.
 */

export interface ZoneDef {
  id: ZoneId;
  code: string;
  name: string;
  blurb: string;
  accent: string;
  /** which display system the zone uses */
  display: 'rail' | 'plinths' | 'frames' | 'helix' | 'orbs' | 'pedestals';
}

export interface DimensionDef {
  id: DimensionId;
  name: string;
  title: string;
  tagline: string;
  status: 'active' | 'coming-soon';
  opens?: string;
  /** portal light colour */
  accent: string;
  /** secondary light colour used for the portal's inner field */
  field: string;
  portal: { position: [number, number, number]; radius: number; tilt?: number };
  zones: ZoneDef[];
}

export const DIMENSIONS: DimensionDef[] = [
  {
    id: 'fashion',
    name: 'Fashion',
    title: 'FASHION DIMENSION',
    tagline: 'Garments suspended in light. Pull one from the air.',
    status: 'active',
    accent: '#c6f432',
    field: '#9fd4ff',
    portal: { position: [0, 7.5, -14], radius: 7.2 },
    zones: [
      { id: 'streetwear', code: 'A', name: 'Streetwear', blurb: 'Floating rails, heavy cottons, signal orange.', accent: '#e8692c', display: 'rail' },
      { id: 'luxury', code: 'B', name: 'Luxury', blurb: 'Chrome arches and rotating plinths.', accent: '#f2e6cf', display: 'plinths' },
      { id: 'essentials', code: 'C', name: 'Essentials', blurb: 'Glass frames, the pieces you live in.', accent: '#bfe3ff', display: 'frames' },
      { id: 'sneakers', code: 'D', name: 'Sneakers', blurb: 'A helix of levitating platforms.', accent: '#c6f432', display: 'helix' },
      { id: 'accessories', code: 'E', name: 'Accessories', blurb: 'Objects held in glass orbits.', accent: '#9fd4ff', display: 'orbs' },
    ],
  },
  {
    id: 'tech',
    name: 'Tech',
    title: 'TECH DIMENSION',
    tagline: 'Devices in a cathedral of signal.',
    status: 'active',
    accent: '#7fc8ff',
    field: '#c6f432',
    portal: { position: [30, 11, -30], radius: 4.6, tilt: -0.35 },
    zones: [
      { id: 'audio', code: 'A', name: 'Audio', blurb: 'Sound you can see.', accent: '#7fc8ff', display: 'pedestals' },
      { id: 'wearables', code: 'B', name: 'Wearables', blurb: 'Time and health, worn.', accent: '#c6f432', display: 'pedestals' },
      { id: 'devices', code: 'C', name: 'Devices', blurb: 'Windows into everything.', accent: '#f2e6cf', display: 'pedestals' },
    ],
  },
  {
    id: 'living',
    name: 'Living',
    title: 'LIVING DIMENSION',
    tagline: 'Furniture and objects for the home.',
    status: 'coming-soon',
    opens: 'Opening 2056',
    accent: '#f2e6cf',
    field: '#e8692c',
    portal: { position: [-32, 13, -36], radius: 4.2, tilt: 0.35 },
    zones: [],
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    title: 'LIFESTYLE DIMENSION',
    tagline: 'Rituals, scent and wellbeing.',
    status: 'coming-soon',
    opens: 'Opening 2056',
    accent: '#bfe3ff',
    field: '#f2e6cf',
    portal: { position: [-16, 24, -72], radius: 3.6, tilt: 0.15 },
    zones: [],
  },
  {
    id: 'mobility',
    name: 'Mobility',
    title: 'MOBILITY DIMENSION',
    tagline: 'Machines that move you.',
    status: 'coming-soon',
    opens: 'Opening 2057',
    accent: '#e8692c',
    field: '#7fc8ff',
    portal: { position: [38, 20, -80], radius: 3.8, tilt: -0.2 },
    zones: [],
  },
];

export const DIMENSION_BY_ID = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d])) as Record<DimensionId, DimensionDef>;

export const zoneDef = (dimension: DimensionId, zone: ZoneId) => DIMENSION_BY_ID[dimension].zones.find((z) => z.id === zone);
