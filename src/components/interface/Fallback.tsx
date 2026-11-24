import { useState } from 'react';
import { Heart, MonitorX, ShoppingBag } from 'lucide-react';
import { DIMENSIONS } from '../../data/dimensions';
import { PRODUCTS } from '../../data/products';
import type { DimensionId, Product } from '../../types';
import { money } from '../../lib/platform';
import { bagCount, useShop, useVariant } from '../../store/shoppingStore';
import { useExperience } from '../../store/experienceStore';
import { AnimatePresence } from 'framer-motion';
import { Availability, ColorPicker, SizePicker } from '../shopping/Pickers';
import { BagPanel } from '../shopping/BagPanel';
import { CheckoutPreview } from '../shopping/CheckoutPreview';
import { WishlistPanel } from '../shopping/WishlistPanel';
import { Toasts } from './Toasts';
import { ProductImage } from './ProductImage';

function Card({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const v = useVariant(product)!;
  return (
    <button type="button" onClick={onOpen} className="rounded-3xl border border-white/8 bg-white/[0.02] p-4 text-left transition hover:border-white/25">
      <div className="grid h-36 place-items-center rounded-2xl bg-white/[0.03]">
        <ProductImage product={product} color={v.color.hex} size={110} />
      </div>
      <div className="mt-3 text-[14px]">{product.name}</div>
      <div className="text-[12.5px] text-white/55">{money(product.price)}</div>
    </button>
  );
}

/**
 * The 2D catalogue for devices without WebGL (or if the 3D world fails).
 * Same data, bag, wishlist and checkout — and it says plainly that the
 * silhouettes are icons, not 3D models.
 */
export function Fallback({ reason }: { reason: string }) {
  const [dim, setDim] = useState<DimensionId>('fashion');
  const [open, setOpen] = useState<Product | null>(null);
  const panel = useExperience((s) => s.panel);
  const count = useShop(bagCount);
  const wished = useShop((s) => !!open && s.wishlist.some((w) => w.productId === open.id));
  const list = PRODUCTS.filter((p) => p.dimension === dim);
  const active = DIMENSIONS.filter((d) => d.status === 'active');

  return (
    <div className="h-full overflow-y-auto bg-void" style={{ touchAction: 'auto' }}>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b hairline bg-void/90 px-5 py-4 backdrop-blur">
        <span className="wordmark text-[15px]">NEXORA</span>
        <div className="flex gap-1">
          <button type="button" className="icon-btn" onClick={() => useExperience.getState().setPanel('wishlist')} aria-label="Wishlist">
            <Heart size={17} />
          </button>
          <button type="button" className="icon-btn" onClick={() => useExperience.getState().setPanel('bag')} aria-label={`Bag, ${count} items`}>
            <ShoppingBag size={17} />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-lime px-1 text-[10px] text-black">{count}</span>}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 p-4 text-[13px] text-white/70">
          <MonitorX size={18} className="mt-0.5 shrink-0 text-signal" />
          <p>
            {reason} Products are shown as flat silhouettes here; they are icons, not 3D models. Everything else works: colours, sizes, bag, wishlist and checkout preview.
          </p>
        </div>
        <nav className="mt-6 flex gap-2" aria-label="Dimensions">
          {active.map((d) => (
            <button key={d.id} type="button" className={`chip ${dim === d.id ? 'is-on' : ''}`} onClick={() => setDim(d.id)} aria-pressed={dim === d.id}>
              {d.name}
            </button>
          ))}
        </nav>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <Card key={p.id} product={p} onOpen={() => setOpen(p)} />
          ))}
        </div>
        {open && (
          <section className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={() => setOpen(null)}>
            <div className="glass-strong max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={open.name}>
              <div className="flex justify-between">
                <h2 className="font-display text-[20px] font-light">{open.name}</h2>
                <button type="button" className="text-white/60" onClick={() => setOpen(null)}>
                  Close
                </button>
              </div>
              <p className="mt-1 text-[13px] text-white/55">{open.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[20px]">{money(open.price)}</span>
                <Availability product={open} />
              </div>
              <div className="mt-4 space-y-4">
                <ColorPicker product={open} />
                <SizePicker product={open} />
              </div>
              <div className="mt-5 flex gap-2">
                <button type="button" className="btn-primary flex-1" onClick={() => useShop.getState().addToBag(open.id)}>
                  Add to bag
                </button>
                <button type="button" className="btn-ghost" onClick={() => useShop.getState().toggleWish(open.id)} aria-pressed={wished}>
                  <Heart size={16} fill={wished ? 'currentColor' : 'none'} />
                </button>
              </div>
              <p className="mt-4 text-[12px] text-white/45">
                {open.material} · {open.fit}
              </p>
            </div>
          </section>
        )}
      </main>
      <AnimatePresence>
        {panel === 'bag' && <BagPanel key="bag" />}
        {panel === 'wishlist' && <WishlistPanel key="wish" />}
        {panel === 'checkout' && <CheckoutPreview key="checkout" />}
      </AnimatePresence>
      <Toasts />
    </div>
  );
}
