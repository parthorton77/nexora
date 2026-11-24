import type { BodyProfile, FitType, Product } from '../../types';
import { clamp } from '../math';
import { garmentOf } from '../garments/spec';
import type { FitEngine, FitEstimate, FitTone } from './contracts';

/** Ideal ease windows (garment − body, cm) per fit intent. */
const TOP_EASE: Record<FitType, [number, number]> = {
  slim: [4, 10],
  regular: [8, 16],
  relaxed: [14, 24],
  oversized: [22, 36],
};
const WAIST_EASE: [number, number] = [-1, 4];
const FOOT_EASE: [number, number] = [0.5, 1.4];

function windowFor(p: Product): [number, number] | null {
  const chart = p.sizeChart;
  if (!chart) return null;
  if (chart.measure === 'chest') return TOP_EASE[p.fitType ?? 'regular'];
  if (chart.measure === 'waist') return WAIST_EASE;
  return FOOT_EASE;
}

function bodyMeasure(p: Product, b: BodyProfile): number | null {
  const chart = p.sizeChart;
  if (!chart) return null;
  return chart.measure === 'chest' ? b.chestCm : chart.measure === 'waist' ? b.waistCm : b.footCm;
}

function classify(ease: number, [lo, hi]: [number, number], p: Product): { label: string; tone: FitTone } {
  const span = hi - lo;
  if (ease < lo - span * 0.6) return { label: 'Too tight', tone: 'tight' };
  if (ease < lo) return { label: 'Snug', tone: 'snug' };
  if (ease <= hi) return { label: p.fitType === 'oversized' ? 'Oversized, as designed' : 'True to fit', tone: 'good' };
  if (ease <= hi + span * 0.6) return { label: 'Relaxed', tone: 'relaxed' };
  return { label: 'Too loose', tone: 'loose' };
}

export const sizeChartFitEngine: FitEngine = {
  name: 'Size-chart comparison (simulated)',
  estimate(product, size, body): FitEstimate {
    const win = windowFor(product);
    const bm = bodyMeasure(product, body);
    const method = 'Compares this size’s garment measurements with the avatar’s preset body measurements.';
    if (!win || bm === null || !product.sizeChart) {
      return {
        label: 'One size, adjustable',
        tone: 'na',
        position: 0.5,
        easeCm: null,
        recommended: product.sizes[0] ?? null,
        notes: [product.fit],
        simulated: true,
        method,
      };
    }
    const values = product.sizeChart.values;
    const gm = values[size] ?? values[product.sizes[Math.floor(product.sizes.length / 2)]];
    const ease = gm - bm;
    const { label, tone } = classify(ease, win, product);
    const span = win[1] - win[0];
    const position = clamp((ease - (win[0] - span)) / (span * 3), 0, 1);
    const mid = (win[0] + win[1]) / 2;
    let recommended: string | null = null;
    let best = Infinity;
    for (const s of product.sizes) {
      const v = values[s];
      if (v === undefined) continue;
      const d = Math.abs(v - bm - mid);
      if (d < best) {
        best = d;
        recommended = s;
      }
    }
    const unit = product.sizeChart.measure === 'foot' ? 'cm length' : 'cm';
    const what = product.sizeChart.measure === 'chest' ? 'chest' : product.sizeChart.measure === 'waist' ? 'waist' : 'foot';
    const notes = [
      `${size}: ${gm} ${unit} garment vs ${bm} cm ${what} on ${body.name}, so ${ease >= 0 ? '+' : ''}${ease.toFixed(1)} cm ease.`,
      `Intended ease for a ${product.fitType ?? 'regular'} fit: ${win[0]} to ${win[1]} cm.`,
    ];
    return { label, tone, position, easeCm: ease, recommended, notes, simulated: true, method };
  },
};

/**
 * Convert chart ease into the radial offset used when re-lofting the garment
 * around the avatar, so a bigger size visibly drapes looser.
 */
export function visualEase(product: Product, size: string, body: BodyProfile): number {
  const g = garmentOf(product);
  const chart = product.sizeChart;
  if (g?.kind === 'top') {
    if (!chart) return g.top.ease;
    const gm = chart.values[size] ?? Object.values(chart.values)[0];
    const easeCm = gm - body.chestCm;
    return clamp(easeCm / 100 / (2 * Math.PI) * 0.9, 0.002, 0.075);
  }
  if (g?.kind === 'bottom') {
    if (!chart) return g.bottom.ease;
    const gm = chart.values[size] ?? Object.values(chart.values)[0];
    const waistEase = (gm - body.waistCm) / 100 / (2 * Math.PI);
    return clamp(g.bottom.ease * 0.8 + waistEase * 0.6, 0.004, 0.07);
  }
  return 0;
}

/** Best size for a body, used when an outfit piece has no size chosen yet. */
export function recommendedSize(product: Product, body: BodyProfile): string {
  return sizeChartFitEngine.estimate(product, product.sizes[0], body).recommended ?? product.sizes[0];
}
