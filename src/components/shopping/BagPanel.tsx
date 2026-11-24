import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { PRODUCT_BY_ID } from '../../data/products';
import { money } from '../../lib/platform';
import { useExperience } from '../../store/experienceStore';
import { bagCount, bagSubtotal, lineTotal, useShop } from '../../store/shoppingStore';
import { ProductImage } from '../interface/ProductImage';
import { SidePanel } from './SidePanel';

export const FREE_SHIPPING_FROM = 2999;
export const SHIPPING_FEE = 149;
export const shippingFor = (subtotal: number) => (subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);

export function BagPanel() {
  const bag = useShop((s) => s.bag);
  const count = useShop(bagCount);
  const subtotal = useShop(bagSubtotal);
  const shipping = shippingFor(subtotal);
  const shop = useShop.getState;

  return (
    <SidePanel
      title="Your bag"
      kicker={`${count} item${count === 1 ? '' : 's'}`}
      footer={
        bag.length > 0 && (
          <div>
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex justify-between text-white/70">
                <dt>Subtotal</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-white/70">
                <dt>Delivery</dt>
                <dd>{shipping ? money(shipping) : 'Free'}</dd>
              </div>
              {shipping > 0 && <p className="text-[11.5px] text-white/40">Free delivery from {money(FREE_SHIPPING_FROM)}.</p>}
              <div className="flex justify-between pt-1 text-[16px] text-ink">
                <dt>Total</dt>
                <dd>{money(subtotal + shipping)}</dd>
              </div>
              <p className="text-[11px] text-white/40">Prices include all taxes.</p>
            </dl>
            <button type="button" className="btn-primary mt-4 w-full" onClick={() => useExperience.getState().setPanel('checkout')}>
              Checkout preview
            </button>
          </div>
        )
      }
    >
      {bag.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <ShoppingBag size={28} strokeWidth={1.2} className="text-white/30" />
          <p className="mt-4 text-[14px] text-white/70">Your bag is empty.</p>
          <p className="mt-1 text-[12.5px] text-white/45">Pull a piece out of a zone to add it.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {bag.map((l) => {
            const p = PRODUCT_BY_ID[l.productId];
            if (!p) return null;
            const color = p.colors.find((c) => c.id === l.colorId) ?? p.colors[0];
            return (
              <li key={l.id} className="rounded-2xl border border-white/8 p-3">
                <div className="flex gap-3">
                  <button type="button" className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-xl bg-white/[0.03]" onClick={() => useExperience.getState().goToProduct(p.id)} aria-label={`View ${p.name} in 3D`}>
                    <ProductImage product={p} color={color.hex} size={58} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate text-[13.5px] text-ink">{p.name}</div>
                      <div className="shrink-0 text-[13px]">{money(lineTotal(l))}</div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`c-${l.id}`}>
                        Colour
                      </label>
                      <select id={`c-${l.id}`} value={l.colorId} onChange={(e) => shop().setLineColor(l.id, e.target.value)} className="h-8 rounded-full border border-white/12 bg-transparent px-2.5 text-[12px] text-white/80">
                        {p.colors.map((c) => (
                          <option key={c.id} value={c.id} className="bg-[#0b0d12]">
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {p.sizes.length > 1 && (
                        <>
                          <label className="sr-only" htmlFor={`s-${l.id}`}>
                            {p.sizeLabel ?? 'Size'}
                          </label>
                          <select id={`s-${l.id}`} value={l.size} onChange={(e) => shop().setLineSize(l.id, e.target.value)} className="h-8 rounded-full border border-white/12 bg-transparent px-2.5 text-[12px] text-white/80">
                            {p.sizes.map((s) => (
                              <option key={s} value={s} className="bg-[#0b0d12]">
                                {s}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-white/12">
                        <button type="button" className="grid h-8 w-8 place-items-center" onClick={() => shop().updateQty(l.id, -1)} disabled={l.qty <= 1} aria-label="Decrease quantity">
                          <Minus size={13} />
                        </button>
                        <span className="w-6 text-center text-[13px]" aria-label="Quantity">
                          {l.qty}
                        </span>
                        <button type="button" className="grid h-8 w-8 place-items-center" onClick={() => shop().updateQty(l.id, 1)} disabled={l.qty >= 9} aria-label="Increase quantity">
                          <Plus size={13} />
                        </button>
                      </div>
                      <button type="button" className="flex items-center gap-1.5 text-[12px] text-white/50 hover:text-signal" onClick={() => shop().removeLine(l.id)}>
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                    <span className="sr-only">{color.name}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SidePanel>
  );
}
