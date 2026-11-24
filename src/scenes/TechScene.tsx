import { DimensionWorld } from '../components/experience/DimensionWorld';
import type { HallTheme } from '../components/fashion/FashionHall';

const TECH_THEME: HallTheme = {
  fog: '#03060b',
  fogDensity: 0.014,
  floor: '#070a10',
  key: '#d8ecff',
  fill: '#7fc8ff',
  rim: '#c6f432',
  sky: { warm: 0.1, nebula: 1.1, stars: 1 },
};

/**
 * TECH DIMENSION: the same world engine with a different hall mood, zones
 * and display system — proof that new dimensions plug into the registry.
 */
export default function TechScene() {
  return <DimensionWorld id="tech" theme={TECH_THEME} />;
}
