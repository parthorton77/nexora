import type { SizeChart } from '../../types';

export const TOP_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
export const WAIST_SIZES = ['28', '30', '32', '34', '36'];
export const SHOE_SIZES = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'];
export const ONE = ['One Size'];

export const chest = (values: Record<string, number>): SizeChart => ({ measure: 'chest', values });
export const waist = (values: Record<string, number>): SizeChart => ({ measure: 'waist', values });
export const SHOE_CHART: SizeChart = {
  measure: 'foot',
  values: { 'UK 6': 24.6, 'UK 7': 25.4, 'UK 8': 26.2, 'UK 9': 27.1, 'UK 10': 27.9, 'UK 11': 28.8 },
};
export const WAIST_CHART = waist({ '28': 73, '30': 78, '32': 83, '34': 88, '36': 93 });

export const CARE_COTTON = ['Machine wash cold, inside out', 'Line dry in shade', 'Low iron on reverse'];
export const CARE_TECH = ['Hand wash cold', 'Hang dry', 'Do not iron the laminated panels'];
