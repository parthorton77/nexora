import { DimensionWorld } from '../components/experience/DimensionWorld';
import type { HallTheme } from '../components/fashion/FashionHall';

const FASHION_THEME: HallTheme = {
  fog: '#06070b',
  fogDensity: 0.011,
  floor: '#0c0e12',
  key: '#f4ece0',
  fill: '#b9d6f0',
  rim: '#9fd4ff',
  sky: { warm: 0.6, nebula: 0.8, stars: 0.8 },
};

/** FASHION DIMENSION: five zones around an atrium, fitting pod and runway. */
export default function FashionScene() {
  return <DimensionWorld id="fashion" theme={FASHION_THEME} fitting runway />;
}
