/* ------------------------------------------------------------------ */
/*  NEXORA shared types                                                */
/* ------------------------------------------------------------------ */

/** Every shopping dimension the universe knows about (active or not). */
export type DimensionId = 'fashion' | 'tech' | 'living' | 'lifestyle' | 'mobility';

/** Fashion zones + tech zones. Zones are the "categories" of a dimension. */
export type ZoneId =
  | 'streetwear'
  | 'luxury'
  | 'essentials'
  | 'sneakers'
  | 'accessories'
  | 'audio'
  | 'wearables'
  | 'devices';

export type CategoryId =
  | 'tees'
  | 'hoodies'
  | 'jackets'
  | 'shirts'
  | 'denim'
  | 'trousers'
  | 'sneakers'
  | 'bags'
  | 'accessories'
  | 'audio'
  | 'wearables'
  | 'devices';

export type Slot = 'top' | 'outer' | 'bottom' | 'shoes' | 'accessory';
export type FitType = 'slim' | 'regular' | 'relaxed' | 'oversized';
export type Availability = 'in-stock' | 'low-stock' | 'pre-order';
export type FabricKind =
  | 'jersey'
  | 'fleece'
  | 'rib'
  | 'denim'
  | 'nylon'
  | 'satin'
  | 'twill'
  | 'wool'
  | 'leather'
  | 'knit'
  | 'canvas';
export type HotspotKind = 'fabric' | 'stitching' | 'pocket' | 'button' | 'zipper' | 'logo' | 'material';
export type Quality = 'high' | 'balanced' | 'lite';

export interface ColorVariant {
  id: string;
  name: string;
  hex: string;
  /** secondary colour: ribs, panels, sole accents */
  trim?: string;
  /** thread colour for visible stitching */
  stitch?: string;
  /** hardware: zips, rivets, buttons */
  metal?: string;
  /** sneaker sole */
  sole?: string;
}

/* ---------- procedural garment specs (ported from the fitverse engine) ---------- */

export interface TopSpec {
  /** hem position: 0 = natural waist, 1 = crotch line */
  length: number;
  /** style ease added on the hanger (metres, radial) */
  ease: number;
  /** 0..1 fraction of the arm the sleeve covers */
  sleeve: number;
  dropShoulder: number;
  collar: 'crew' | 'hood' | 'stand' | 'point' | 'rib';
  closure?: 'zip' | 'buttons';
  hem: 'plain' | 'rib' | 'band';
  cuff: 'plain' | 'rib';
  pockets?: 'kangaroo' | 'chest-zip' | 'flap-chest' | 'welt';
  /** 0 = base layer, 1 = outer layer (worn on top of other tops) */
  layer: 0 | 1;
  stitch?: boolean;
  ribUsesTrim?: boolean;
  /** waist taper from chest, 0 = straight/boxy */
  taper?: number;
}

export interface BottomSpec {
  leg: 'straight' | 'wide' | 'tapered';
  ease: number;
  hem: 'plain' | 'cuffed' | 'stacked';
  pockets: 'five' | 'cargo' | 'slant';
  pleats?: boolean;
  crease?: boolean;
  rivets?: boolean;
  stitch?: boolean;
  beltLoops?: boolean;
}

export interface SneakerSpec {
  profile: 'runner' | 'court';
}

export type GarmentSpec =
  | { kind: 'top'; top: TopSpec }
  | { kind: 'bottom'; bottom: BottomSpec }
  | { kind: 'sneaker'; sneaker: SneakerSpec }
  | { kind: 'cap' }
  | { kind: 'bag' }
  | { kind: 'shades' };

export type GarmentKind = GarmentSpec['kind'];

/* ---------- procedural tech specs (Tech Dimension) ---------- */

export type TechSpec =
  | { kind: 'headphones' }
  | { kind: 'watch' }
  | { kind: 'phone' }
  | { kind: 'earbuds' }
  | { kind: 'speaker' };

export type TechKind = TechSpec['kind'];

/**
 * How a product is drawn in 3D. Every product has a procedural model; a GLB
 * can be layered on top through public/models/manifest.json (see README).
 */
export type ModelRef =
  | { source: 'procedural'; type: 'garment'; spec: GarmentSpec; glb?: string }
  | { source: 'procedural'; type: 'tech'; spec: TechSpec; glb?: string };

export interface Hotspot {
  id: string;
  kind: HotspotKind;
  /** named anchor emitted by the model builder */
  anchor: string;
  title: string;
  body: string;
}

export interface SizeChart {
  /** which body measurement the chart compares against */
  measure: 'chest' | 'waist' | 'foot';
  /** garment measurement per size, in cm */
  values: Record<string, number>;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  tagline: string;
  dimension: DimensionId;
  zone: ZoneId;
  category: CategoryId;
  /** outfit slot; fashion only */
  slot?: Slot;
  /** style tags used by the companion ("minimal", "travel", "unusual" ...) */
  tags: string[];
  /** price in INR, inclusive of taxes */
  price: number;
  description: string;
  material: string;
  fabric?: FabricKind;
  fit: string;
  fitType?: FitType;
  /** what the size selector is called ("Size", "Case", "Storage") */
  sizeLabel?: string;
  sizes: string[];
  sizeChart?: SizeChart;
  colors: ColorVariant[];
  availability: Availability;
  stockNote?: string;
  /** 3D model reference */
  model: ModelRef;
  /** product image: a generated vector silhouette id (see components/interface/ProductImage) */
  image: string;
  hotspots: Hotspot[];
  care?: string[];
  origin: string;
  /** curated pairings used by the companion */
  pairsWith: string[];
}

export interface BodyProfile {
  id: string;
  name: string;
  heightCm: number;
  chestCm: number;
  waistCm: number;
  hipCm: number;
  footCm: number;
  build: string;
  /** mannequin finish */
  tone: string;
  finish: string;
  /** 'preset' today; a future body-scan service would return 'scan' */
  source: 'preset' | 'scan';
}

export interface Variant {
  colorId: string;
  size?: string;
}

export interface BagLine {
  id: string;
  productId: string;
  colorId: string;
  size: string;
  qty: number;
}

export interface WishItem {
  productId: string;
  colorId: string;
  size?: string;
  savedAt: number;
}

export type Outfit = Partial<Record<Slot, string>>;

export interface SavedOutfit {
  id: string;
  name: string;
  outfit: Outfit;
  savedAt: number;
}
