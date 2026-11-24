import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BagLine, Outfit, Product, SavedOutfit, Slot, Variant, WishItem } from '../types';
import { PRODUCT_BY_ID } from '../data/products';
import { AVATAR_BY_ID } from '../data/avatars';
import { safeStorage } from '../lib/platform';
import { sound } from '../lib/audio';
import { recommendedSize } from '../lib/tryon/fit';
import { useExperience } from './experienceStore';

/**
 * Shopping state: variants, bag, wishlist, outfits and the chosen avatar.
 * Persisted to localStorage and independent of the 3D scene, so it survives
 * every dimension change and a reload.
 */
interface ShopState {
  variants: Record<string, Variant>;
  bag: BagLine[];
  wishlist: WishItem[];
  outfits: SavedOutfit[];
  outfit: Outfit;
  avatarId: string;

  setColor: (productId: string, colorId: string) => void;
  setSize: (productId: string, size: string) => void;
  addToBag: (productId: string, opts?: { quiet?: boolean }) => boolean;
  updateQty: (lineId: string, delta: number) => void;
  setLineSize: (lineId: string, size: string) => void;
  setLineColor: (lineId: string, colorId: string) => void;
  removeLine: (lineId: string) => void;
  clearBag: () => void;
  toggleWish: (productId: string) => void;
  setOutfitPiece: (slot: Slot, productId: string | null) => void;
  wear: (productId: string) => void;
  clearOutfit: () => void;
  saveOutfit: () => void;
  removeOutfit: (id: string) => void;
  wearOutfit: (outfit: Outfit) => void;
  addOutfitToBag: () => void;
  setAvatar: (id: string) => void;
}

const toast = (text: string, tone?: 'ok' | 'info' | 'warn') => useExperience.getState().toast(text, tone);

export function variantOf(variants: Record<string, Variant>, p: Product) {
  const v = variants[p.id];
  const color = p.colors.find((c) => c.id === v?.colorId) ?? p.colors[0];
  const size = p.sizes.length === 1 ? p.sizes[0] : v?.size;
  return { color, size };
}

export const useShop = create<ShopState>()(
  persist(
    (set, get) => ({
      variants: {},
      bag: [],
      wishlist: [],
      outfits: [],
      outfit: {},
      avatarId: 'arjun',

      setColor: (productId, colorId) => {
        const cur = get().variants[productId];
        sound.soft();
        set({ variants: { ...get().variants, [productId]: { ...cur, colorId } } });
      },
      setSize: (productId, size) => {
        const cur = get().variants[productId];
        sound.soft();
        set({ variants: { ...get().variants, [productId]: { colorId: cur?.colorId ?? PRODUCT_BY_ID[productId].colors[0].id, size } } });
      },

      addToBag: (productId, opts) => {
        const s = get();
        const p = PRODUCT_BY_ID[productId];
        const { color, size } = variantOf(s.variants, p);
        if (!size) {
          useExperience.getState().nudgeSize();
          if (!opts?.quiet) toast(`Choose a ${(p.sizeLabel ?? 'size').toLowerCase()} first`, 'warn');
          return false;
        }
        const match = s.bag.find((l) => l.productId === productId && l.colorId === color.id && l.size === size);
        const bag = match
          ? s.bag.map((l) => (l === match ? { ...l, qty: Math.min(9, l.qty + 1) } : l))
          : [...s.bag, { id: `${productId}-${color.id}-${size}-${Date.now().toString(36)}`, productId, colorId: color.id, size, qty: 1 }];
        set({ bag });
        if (!opts?.quiet) {
          sound.chime();
          toast(`${p.name}, ${color.name}, ${size} added to bag`);
        }
        return true;
      },
      updateQty: (lineId, delta) => set({ bag: get().bag.map((l) => (l.id === lineId ? { ...l, qty: Math.max(1, Math.min(9, l.qty + delta)) } : l)) }),
      setLineSize: (lineId, size) => set({ bag: get().bag.map((l) => (l.id === lineId ? { ...l, size } : l)) }),
      setLineColor: (lineId, colorId) => set({ bag: get().bag.map((l) => (l.id === lineId ? { ...l, colorId } : l)) }),
      removeLine: (lineId) => {
        const line = get().bag.find((l) => l.id === lineId);
        set({ bag: get().bag.filter((l) => l.id !== lineId) });
        if (line) toast(`${PRODUCT_BY_ID[line.productId]?.name ?? 'Item'} removed from bag`, 'info');
      },
      clearBag: () => set({ bag: [] }),

      toggleWish: (productId) => {
        const s = get();
        const p = PRODUCT_BY_ID[productId];
        if (s.wishlist.some((w) => w.productId === productId)) {
          set({ wishlist: s.wishlist.filter((w) => w.productId !== productId) });
          toast(`${p.name} removed from wishlist`, 'info');
          return;
        }
        const { color, size } = variantOf(s.variants, p);
        set({ wishlist: [{ productId, colorId: color.id, size, savedAt: Date.now() }, ...s.wishlist] });
        sound.chime();
        toast(`${p.name} saved to wishlist`);
      },

      setOutfitPiece: (slot, productId) => {
        const outfit = { ...get().outfit };
        if (productId) outfit[slot] = productId;
        else delete outfit[slot];
        sound.soft();
        set({ outfit });
      },
      wear: (productId) => {
        const p = PRODUCT_BY_ID[productId];
        if (!p?.slot) return;
        get().setOutfitPiece(p.slot, productId);
      },
      clearOutfit: () => set({ outfit: {} }),
      saveOutfit: () => {
        const s = get();
        const ids = Object.values(s.outfit).filter(Boolean);
        if (!ids.length) {
          toast('Add at least one piece to the outfit first', 'warn');
          return;
        }
        const saved: SavedOutfit = { id: `outfit-${Date.now().toString(36)}`, name: `Outfit ${s.outfits.length + 1}`, outfit: { ...s.outfit }, savedAt: Date.now() };
        set({ outfits: [saved, ...s.outfits] });
        sound.chime();
        toast(`${saved.name} saved to your wishlist`);
      },
      removeOutfit: (id) => set({ outfits: get().outfits.filter((o) => o.id !== id) }),
      wearOutfit: (outfit) => set({ outfit: { ...outfit } }),

      addOutfitToBag: () => {
        const s = get();
        const avatar = AVATAR_BY_ID[s.avatarId];
        const ids = Object.values(s.outfit).filter(Boolean) as string[];
        if (!ids.length) return;
        const variants = { ...s.variants };
        for (const id of ids) {
          const p = PRODUCT_BY_ID[id];
          const cur = variants[id];
          if (!cur?.size) variants[id] = { colorId: cur?.colorId ?? p.colors[0].id, size: recommendedSize(p, avatar) };
        }
        set({ variants });
        let added = 0;
        for (const id of ids) if (get().addToBag(id, { quiet: true })) added++;
        sound.chime();
        toast(`Outfit added to bag: ${added} piece${added === 1 ? '' : 's'}, sized for ${avatar.name}`);
      },

      setAvatar: (id) => {
        sound.scan();
        set({ avatarId: id });
      },
    }),
    {
      name: 'nexora-shop-v1',
      storage: safeStorage,
      partialize: (s) => ({ variants: s.variants, bag: s.bag, wishlist: s.wishlist, outfits: s.outfits, outfit: s.outfit, avatarId: s.avatarId }),
    },
  ),
);

export function useVariant(p: Product | undefined) {
  const v = useShop((s) => (p ? s.variants[p.id] : undefined));
  return useMemo(() => (p ? variantOf(v ? { [p.id]: v } : {}, p) : undefined), [p, v]);
}

export const lineTotal = (l: BagLine) => (PRODUCT_BY_ID[l.productId]?.price ?? 0) * l.qty;
export const bagCount = (s: ShopState) => s.bag.reduce((n, l) => n + l.qty, 0);
export const bagSubtotal = (s: ShopState) => s.bag.reduce((n, l) => n + lineTotal(l), 0);
export const outfitTotal = (o: Outfit) => Object.values(o).reduce((n, id) => n + (id ? PRODUCT_BY_ID[id]?.price ?? 0 : 0), 0);

if (import.meta.env.DEV) (window as unknown as { __shop: typeof useShop }).__shop = useShop;
