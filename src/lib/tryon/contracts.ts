import type { BodyProfile, Product } from '../../types';
import type { GarmentBuild } from '../garments';

/**
 * Integration seams for real try-on technology.
 *
 * The prototype ships simple, honest implementations of each interface:
 *  - BodyScanProvider: none (preset mannequins only)
 *  - GarmentDraper:    procedural re-lofting around the avatar form
 *  - FitEngine:        size-chart comparison against preset measurements
 *
 * A production build can swap in an AI body-scan service, a cloth simulator
 * (e.g. a server-side solver returning skinned GLBs) and a learned fit model
 * without changing the UI, which only talks to these contracts.
 */

export interface BodyScanProvider {
  readonly name: string;
  /** Turn camera frames / photos into measurements. Not implemented in the prototype. */
  scan(input: MediaStream | File[]): Promise<BodyProfile>;
}

export interface DrapeRequest {
  product: Product;
  size: string;
  body: BodyProfile;
  lite: boolean;
}

export interface GarmentDraper {
  readonly name: string;
  readonly physicallySimulated: boolean;
  drape(req: DrapeRequest): GarmentBuild;
}

export type FitTone = 'tight' | 'snug' | 'good' | 'relaxed' | 'loose' | 'na';

export interface FitEstimate {
  label: string;
  tone: FitTone;
  /** 0 = very tight … 1 = very loose (for the meter) */
  position: number;
  /** garment minus body measurement, cm (null for one-size items) */
  easeCm: number | null;
  recommended: string | null;
  notes: string[];
  /** always true in this prototype — surfaced in the UI */
  simulated: true;
  method: string;
}

export interface FitEngine {
  readonly name: string;
  estimate(product: Product, size: string, body: BodyProfile): FitEstimate;
}
