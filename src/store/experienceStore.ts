import { create } from 'zustand';
import type { DimensionId, Quality, Slot, ZoneId } from '../types';
import { DIMENSION_BY_ID } from '../data/dimensions';
import { PRODUCT_BY_ID, productsInZone } from '../data/products';
import { detectQuality, prefersReducedMotion } from '../lib/platform';
import { sound } from '../lib/audio';
import { carouselGoTo, motion, resetInspect } from './motion';

export type SceneId = 'universe' | 'fashion' | 'tech';
export type Mode = 'overview' | 'browse' | 'inspect' | 'fitting' | 'runway';
export type Panel = 'bag' | 'wishlist' | 'checkout' | 'settings' | 'profile' | null;
export type TransitionStage = 'approach' | 'warp' | 'arrive';

export interface Transition {
  to: SceneId;
  /** portal we fly through (when leaving the universe) */
  via?: DimensionId;
  from?: SceneId;
  stage: TransitionStage;
}

export interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'info' | 'warn';
}

interface State {
  /** loader finished and the visitor pressed "Enter" */
  entered: boolean;
  scene: SceneId;
  transition: Transition | null;
  hoveredPortal: DimensionId | null;
  focusedPortal: DimensionId;
  zone: ZoneId;
  /** carousel position per zone, so returning keeps your place */
  focusIndex: Partial<Record<ZoneId, number>>;
  selectedId: string | null;
  /** product currently lifted out of its display (cleared when it is back) */
  extractedId: string | null;
  mode: Mode;
  fittingTab: 'fit' | 'compose';
  composeSlot: Slot;
  runwayIndex: number;
  activeHotspot: string | null;
  showHotspots: boolean;
  panel: Panel;
  companionOpen: boolean;
  soundOn: boolean;
  quality: Quality;
  /** true when the visitor picked a tier by hand; auto-downgrades stop */
  qualityLocked: boolean;
  reducedMotion: boolean;
  /** product the visitor asked to see (from the companion / wishlist) — consumed by the scene */
  pendingProduct: string | null;
  /** scene that has mounted and can run its arrival choreography */
  arrivalReady: SceneId | null;
  /** bump to ask the active scene to re-frame its default shot */
  resetToken: number;
  /** loader */
  progress: number;
  status: string;
  toasts: Toast[];
  sizeNudge: number;

  enter: () => void;
  setHoveredPortal: (id: DimensionId | null) => void;
  setFocusedPortal: (id: DimensionId) => void;
  activatePortal: (id: DimensionId) => void;
  returnToUniverse: () => void;
  setTransitionStage: (stage: TransitionStage) => void;
  finishTransition: () => void;
  setScene: (s: SceneId) => void;
  setZone: (z: ZoneId) => void;
  setFocusIndex: (zone: ZoneId, i: number) => void;
  select: (id: string) => void;
  closeInspect: () => void;
  goToProduct: (id: string) => void;
  consumePending: () => string | null;
  openFitting: (tab?: 'fit' | 'compose') => void;
  setFittingTab: (t: 'fit' | 'compose') => void;
  setComposeSlot: (s: Slot) => void;
  openRunway: () => void;
  setRunwayIndex: (i: number) => void;
  back: () => void;
  setHotspot: (id: string | null) => void;
  toggleHotspots: () => void;
  setPanel: (p: Panel) => void;
  toggleCompanion: (open?: boolean) => void;
  toggleSound: () => void;
  setQuality: (q: Quality, manual?: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  nudgeSize: () => void;
}

let toastId = 1;

export const useExperience = create<State>()((set, get) => ({
  entered: false,
  scene: 'universe',
  transition: null,
  hoveredPortal: null,
  focusedPortal: 'fashion',
  zone: 'streetwear',
  focusIndex: {},
  selectedId: null,
  extractedId: null,
  mode: 'browse',
  fittingTab: 'fit',
  composeSlot: 'top',
  runwayIndex: 0,
  activeHotspot: null,
  showHotspots: true,
  panel: null,
  companionOpen: false,
  soundOn: false,
  quality: detectQuality(),
  qualityLocked: new URLSearchParams(window.location.search).has('quality'),
  reducedMotion: prefersReducedMotion(),
  pendingProduct: null,
  arrivalReady: null,
  resetToken: 0,
  progress: 0,
  status: 'Initialising',
  toasts: [],
  sizeNudge: 0,

  enter: () => set({ entered: true }),
  setHoveredPortal: (id) => {
    if (get().hoveredPortal === id) return;
    if (id) sound.hover();
    set({ hoveredPortal: id });
  },
  setFocusedPortal: (id) => {
    if (get().focusedPortal !== id) set({ focusedPortal: id });
  },

  activatePortal: (id) => {
    const s = get();
    if (s.transition || s.scene !== 'universe') return;
    const dim = DIMENSION_BY_ID[id];
    if (dim.status !== 'active') {
      sound.soft();
      get().toast(`${dim.title}: ${dim.opens ?? 'opening soon'}. Fashion and Tech are open now.`, 'info');
      return;
    }
    sound.portal();
    const zone = dim.zones[0].id;
    motion.carousel.count = productsInZone(zone).length;
    motion.carousel.pos = s.focusIndex[zone] ?? 0;
    motion.carousel.target = motion.carousel.pos;
    set({ transition: { to: id as SceneId, via: id, from: 'universe', stage: 'approach' }, zone, mode: 'overview', selectedId: null, panel: null });
  },

  returnToUniverse: () => {
    const s = get();
    if (s.transition || s.scene === 'universe') return;
    sound.whoosh(true);
    set({ transition: { to: 'universe', via: s.scene as DimensionId, from: s.scene, stage: 'warp' }, mode: 'browse', selectedId: null, activeHotspot: null, panel: null });
  },

  setTransitionStage: (stage) => {
    const t = get().transition;
    if (t) set({ transition: { ...t, stage } });
  },
  finishTransition: () => set({ transition: null }),
  setScene: (scene) => set({ scene }),

  setZone: (z) => {
    const s = get();
    if (s.zone === z && s.mode === 'browse') return;
    if (s.mode === 'inspect' || s.mode === 'fitting' || s.mode === 'runway') set({ selectedId: null });
    sound.soft();
    const idx = s.focusIndex[z] ?? 0;
    motion.carousel.count = productsInZone(z).length;
    motion.carousel.pos = idx;
    motion.carousel.target = idx;
    set({ zone: z, mode: 'browse', selectedId: null, activeHotspot: null });
  },
  setFocusIndex: (zone, i) => {
    const cur = get().focusIndex[zone];
    if (cur === i) return;
    sound.tick();
    set({ focusIndex: { ...get().focusIndex, [zone]: i } });
  },

  select: (id) => {
    const s = get();
    if (s.mode === 'inspect' && s.selectedId === id) return;
    const kind = PRODUCT_BY_ID[id]?.model.spec.kind;
    resetInspect(kind === 'sneaker' ? -0.8 : kind === 'cap' || kind === 'shades' ? -0.5 : kind === 'bag' ? -0.35 : 0);
    sound.whoosh();
    set({ selectedId: id, mode: 'inspect', activeHotspot: null, panel: null });
  },

  closeInspect: () => {
    if (get().mode !== 'inspect') return;
    sound.whoosh(true);
    set({ mode: 'browse', selectedId: null, activeHotspot: null });
  },

  goToProduct: (id) => {
    const p = PRODUCT_BY_ID[id];
    if (!p) return;
    const s = get();
    set({ panel: null, companionOpen: false });
    if (s.scene !== p.dimension) {
      set({ pendingProduct: id });
      if (s.scene === 'universe') get().activatePortal(p.dimension);
      else {
        // hop through the universe would be slow; go straight across dimensions
        sound.portal();
        set({ transition: { to: p.dimension as SceneId, via: p.dimension, from: s.scene, stage: 'warp' }, mode: 'overview', zone: p.zone, selectedId: null });
      }
      return;
    }
    set({ pendingProduct: id });
  },

  consumePending: () => {
    const id = get().pendingProduct;
    if (!id) return null;
    const p = PRODUCT_BY_ID[id];
    const list = productsInZone(p.zone);
    const idx = Math.max(0, list.findIndex((x) => x.id === id));
    const cur = get();
    if (cur.zone !== p.zone || (cur.mode !== 'browse' && cur.mode !== 'inspect')) get().setZone(p.zone);
    set({ pendingProduct: null, focusIndex: { ...get().focusIndex, [p.zone]: idx } });
    motion.carousel.count = list.length;
    carouselGoTo(idx);
    return id;
  },

  openFitting: (tab) => {
    const s = get();
    sound.scan();
    set({ mode: 'fitting', fittingTab: tab ?? s.fittingTab, activeHotspot: null, panel: null });
  },
  setFittingTab: (t) => {
    sound.soft();
    set({ fittingTab: t });
  },
  setComposeSlot: (slot) => {
    sound.soft();
    motion.fitting.ring = 0;
    set({ composeSlot: slot });
  },
  openRunway: () => {
    sound.portal();
    set({ mode: 'runway', panel: null, activeHotspot: null, runwayIndex: 0 });
  },
  setRunwayIndex: (i) => set({ runwayIndex: i }),

  back: () => {
    const s = get();
    if (s.panel) return set({ panel: null });
    if (s.companionOpen) return set({ companionOpen: false });
    if (s.activeHotspot) return set({ activeHotspot: null });
    if (s.mode === 'inspect') return get().closeInspect();
    if (s.mode === 'fitting' || s.mode === 'runway') {
      sound.whoosh(true);
      return set({ mode: s.selectedId ? 'inspect' : 'browse' });
    }
    if (s.scene !== 'universe') get().returnToUniverse();
  },

  setHotspot: (id) => {
    sound.soft();
    set({ activeHotspot: get().activeHotspot === id ? null : id });
  },
  toggleHotspots: () => set({ showHotspots: !get().showHotspots, activeHotspot: null }),
  setPanel: (p) => {
    sound.soft();
    set({ panel: get().panel === p ? null : p });
  },
  toggleCompanion: (open) => {
    sound.soft();
    set({ companionOpen: open ?? !get().companionOpen });
  },
  toggleSound: () => {
    const on = !get().soundOn;
    if (on) {
      void sound.enable().then((ok) => {
        if (!ok) {
          set({ soundOn: false });
          get().toast('Sound is not supported in this browser', 'warn');
        }
      });
    } else sound.disable();
    set({ soundOn: on });
  },
  setQuality: (q, manual) => set(manual ? { quality: q, qualityLocked: true } : { quality: q }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  toast: (text, tone = 'ok') => {
    const id = toastId++;
    set({ toasts: [...get().toasts.slice(-2), { id, text, tone }] });
    window.setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  nudgeSize: () => set({ sizeNudge: get().sizeNudge + 1 }),
}));

/** Selector helpers */
export const selectedProduct = (s: State) => (s.selectedId ? PRODUCT_BY_ID[s.selectedId] : undefined);

if (import.meta.env.DEV) (window as unknown as { __xp: typeof useExperience }).__xp = useExperience;
export { motion };
