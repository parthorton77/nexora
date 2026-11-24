import { useState } from 'react';
import { AnimatePresence, motion as m } from 'framer-motion';
import { Box, Eye, EyeOff, Heart, Layers, Minus, Plus, RotateCcw, Shirt, ShoppingBag, X } from 'lucide-react';
import { PRODUCT_BY_ID } from '../../data/products';
import { DIMENSION_BY_ID } from '../../data/dimensions';
import type { DimensionId, Product } from '../../types';
import { money } from '../../lib/platform';
import { clamp } from '../../lib/math';
import { useExperience } from '../../store/experienceStore';
import { useShop } from '../../store/shoppingStore';
import { motion } from '../../store/motion';
import { KIND_LABEL } from '../../data/labels';
import { Availability, ColorPicker, SizePicker } from './Pickers';

const turnTo = (rot: number) => {
  const im = motion.inspect;
  const base = Math.round(im.rotYTarget / (Math.PI * 2)) * Math.PI * 2;
  im.rotYTarget = base + rot;
  im.rotXTarget = 0;
  im.idle = 0;
};

/** Focus a hotspot: rotate so its surface faces the camera and move in. */
export function focusHotspot(p: Product, hotspotId: string) {
  const h = p.hotspots.find((x) => x.id === hotspotId);
  if (!h) return;
  // the 3D chunk is already loaded while inspecting, so this resolves at once
  void import('../../lib/models').then(({ productBuild }) => {
    const a = productBuild(p, useExperience.getState().quality === 'lite').anchors[h.anchor];
    if (a) turnTo(-Math.atan2(a.n.x, a.n.z));
  });
  motion.inspect.zoomTarget = 0.6;
  if (useExperience.getState().activeHotspot !== hotspotId) useExperience.getState().setHotspot(hotspotId);
}

function ViewControls({ product }: { product: Product }) {
  const showHotspots = useExperience((s) => s.showHotspots);
  const [detail, setDetail] = useState(0);
  const zoom = (k: number) => {
    motion.inspect.zoomTarget = clamp(motion.inspect.zoomTarget * k, 0.45, 1.6);
    motion.inspect.idle = 0;
  };
  const btn = 'chip !h-9 !px-3';
  return (
    <div className="glass pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1.5 scrollbar-thin [&_.chip]:shrink-0 [&_.icon-btn]:shrink-0" role="toolbar" aria-label="360 degree view controls">
      <button type="button" className={btn} onClick={() => turnTo(0)}>
        Front
      </button>
      <button type="button" className={btn} onClick={() => turnTo(Math.PI / 2)}>
        Side
      </button>
      <button type="button" className={btn} onClick={() => turnTo(Math.PI)}>
        Back
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => {
          const h = product.hotspots[detail % product.hotspots.length];
          if (h) focusHotspot(product, h.id);
          setDetail((d) => d + 1);
        }}
      >
        Detail
      </button>
      <span className="mx-1 h-5 w-px bg-white/10" />
      <button type="button" className="icon-btn !h-9 !w-9" onClick={() => zoom(0.82)} aria-label="Zoom in">
        <Plus size={15} />
      </button>
      <button type="button" className="icon-btn !h-9 !w-9" onClick={() => zoom(1 / 0.82)} aria-label="Zoom out">
        <Minus size={15} />
      </button>
      <button
        type="button"
        className="icon-btn !h-9 !w-9"
        onClick={() => {
          turnTo(0);
          motion.inspect.zoomTarget = 1;
          useExperience.getState().setHotspot(null);
        }}
        aria-label="Reset view"
        title="Reset view"
      >
        <RotateCcw size={15} />
      </button>
      <button type="button" className="icon-btn !h-9 !w-9" onClick={() => useExperience.getState().toggleHotspots()} aria-pressed={showHotspots} aria-label={showHotspots ? 'Hide detail hotspots' : 'Show detail hotspots'}>
        {showHotspots ? <Eye size={15} /> : <EyeOff size={15} />}
      </button>
    </div>
  );
}

/**
 * The floating product interface that appears with an extracted product:
 * price, colour, size, bag, wishlist, try-on, details and hotspot list.
 */
export function ProductPanel() {
  const mode = useExperience((s) => s.mode);
  const id = useExperience((s) => s.selectedId);
  const scene = useExperience((s) => s.scene);
  const activeHotspot = useExperience((s) => s.activeHotspot);
  const wished = useShop((s) => !!id && s.wishlist.some((w) => w.productId === id));
  const [tab, setTab] = useState<'details' | 'hotspots'>('details');
  const product = id ? PRODUCT_BY_ID[id] : undefined;
  const open = mode === 'inspect' && !!product;
  const fashion = scene === 'fashion';

  return (
    <AnimatePresence>
      {open && product && (
        <>
          <m.aside
            key={`panel-${product.id}`}
            className="glass-strong pointer-events-auto fixed inset-x-2 bottom-2 z-40 max-h-[44vh] overflow-y-auto rounded-3xl p-5 scrollbar-thin md:inset-x-auto md:bottom-auto md:right-5 md:top-24 md:max-h-[calc(100vh-8rem)] md:w-[372px]"
            initial={{ opacity: 0, x: 40, rotateY: -8 }}
            animate={{ opacity: 1, x: 0, rotateY: 0, transition: { delay: 0.55, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] } }}
            exit={{ opacity: 0, x: 30, transition: { duration: 0.25 } }}
            style={{ transformPerspective: 900 }}
            aria-label={`${product.name} details`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="micro text-white/45">
                  {[DIMENSION_BY_ID[product.dimension as DimensionId].zones.find((z) => z.id === product.zone)?.name, product.category].filter((v, i, a) => v && a.findIndex((x) => x?.toLowerCase() === v.toLowerCase()) === i).join(' · ')}
                </div>
                <h2 className="mt-2 font-display text-[22px] font-light leading-tight tracking-wide text-ink">{product.name}</h2>
                <p className="mt-1 text-[13px] text-white/55">{product.tagline}</p>
              </div>
              <button type="button" className="icon-btn -mr-2 -mt-1 shrink-0" onClick={() => useExperience.getState().closeInspect()} aria-label="Put it back">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-[24px] font-light tracking-wide text-ink">{money(product.price)}</div>
                <div className="text-[11px] text-white/40">Inclusive of all taxes</div>
              </div>
              <Availability product={product} />
            </div>

            <div className="mt-5 space-y-4">
              <ColorPicker product={product} />
              <SizePicker product={product} />
            </div>

            <div className="mt-5 flex gap-2">
              <button type="button" className="btn-primary flex-1" onClick={() => useShop.getState().addToBag(product.id)}>
                <ShoppingBag size={16} strokeWidth={1.6} /> {product.availability === 'pre-order' ? 'Pre-order' : 'Add to bag'}
              </button>
              <button type="button" className={`btn-ghost !px-4 ${wished ? '!border-signal/60 text-signal' : ''}`} onClick={() => useShop.getState().toggleWish(product.id)} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}>
                <Heart size={16} strokeWidth={1.6} fill={wished ? 'currentColor' : 'none'} />
              </button>
            </div>
            {fashion && product.slot && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="btn-ghost !h-10 text-[13px]"
                  onClick={() => {
                    useShop.getState().wear(product.id);
                    useExperience.getState().openFitting('fit');
                  }}
                >
                  <Shirt size={15} strokeWidth={1.5} /> Try on avatar
                </button>
                <button
                  type="button"
                  className="btn-ghost !h-10 text-[13px]"
                  onClick={() => {
                    useShop.getState().wear(product.id);
                    useExperience.getState().openFitting('compose');
                  }}
                >
                  <Layers size={15} strokeWidth={1.5} /> Build an outfit
                </button>
              </div>
            )}

            <div className="mt-6 flex gap-1 border-b hairline" role="tablist">
              {(['details', 'hotspots'] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px border-b px-3 pb-2 text-[12.5px] capitalize transition ${tab === t ? 'border-lime text-ink' : 'border-transparent text-white/50 hover:text-white/80'}`}>
                  {t === 'hotspots' ? 'Up close' : 'Details'}
                </button>
              ))}
            </div>
            {tab === 'details' ? (
              <dl className="mt-4 space-y-3 text-[12.5px] leading-relaxed">
                <p className="text-white/75">{product.description}</p>
                {[
                  ['Material', product.material],
                  ['Fit', product.fit],
                  ['Made in', product.origin],
                  ['SKU', product.sku],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[84px_1fr] gap-3">
                    <dt className="micro pt-0.5 text-white/40">{k}</dt>
                    <dd className="text-white/80">{v}</dd>
                  </div>
                ))}
                {product.care && (
                  <div className="grid grid-cols-[84px_1fr] gap-3">
                    <dt className="micro pt-0.5 text-white/40">Care</dt>
                    <dd className="text-white/80">{product.care.join(' · ')}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {product.hotspots.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => focusHotspot(product, h.id)}
                      className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${activeHotspot === h.id ? 'border-lime/50 bg-lime/10' : 'border-white/8 hover:border-white/25'}`}
                    >
                      <div className="micro text-lime/80">{KIND_LABEL[h.kind]}</div>
                      <div className="mt-0.5 text-[13px] text-ink">{h.title}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-white/8 p-3 text-[11px] leading-relaxed text-white/45">
              <Box size={14} className="mt-0.5 shrink-0" />
              Procedural 3D model generated in your browser. A placeholder for a production GLB scan of this {product.dimension === 'tech' ? 'device' : 'garment'}; it is real geometry, not a flat image.
            </div>
          </m.aside>
          <m.div
            key="view-controls"
            className="pointer-events-none fixed inset-x-0 bottom-[calc(44vh+14px)] z-40 flex justify-center px-2 md:bottom-6 md:right-[400px]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.9, duration: 0.5 } }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
          >
            <ViewControls product={product} />
          </m.div>
          <m.div
            key="view-hint"
            className="pointer-events-none fixed left-5 top-24 z-30 hidden micro text-white/40 md:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.4 } }}
            exit={{ opacity: 0 }}
          >
            Drag to rotate · scroll to zoom · Esc to put it back
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
