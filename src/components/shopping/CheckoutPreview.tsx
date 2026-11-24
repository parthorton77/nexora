import { useState } from 'react';
import { CheckCircle2, ChevronLeft, Lock, Truck } from 'lucide-react';
import { PRODUCT_BY_ID } from '../../data/products';
import { money } from '../../lib/platform';
import { useExperience } from '../../store/experienceStore';
import { bagSubtotal, lineTotal, useShop } from '../../store/shoppingStore';
import { SidePanel } from './SidePanel';
import { shippingFor } from './BagPanel';

/** Checkout preview: an honest summary. No payment gateway, nothing is charged. */
export function CheckoutPreview() {
  const bag = useShop((s) => s.bag);
  const subtotal = useShop(bagSubtotal);
  const shipping = shippingFor(subtotal);
  const [placed, setPlaced] = useState<string | null>(null);
  const eta = new Date(Date.now() + 4 * 86400000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (placed) {
    return (
      <SidePanel title="Demo order placed" kicker="Prototype">
        <div className="flex flex-col items-center py-10 text-center">
          <CheckCircle2 size={36} strokeWidth={1.2} className="text-lime" />
          <p className="mt-4 text-[15px]">Reference {placed}</p>
          <p className="mt-2 max-w-[300px] text-[12.5px] leading-relaxed text-white/55">This was a simulated checkout. No payment was taken and nothing will be shipped. Your bag has been cleared.</p>
          <button type="button" className="btn-ghost mt-6" onClick={() => useExperience.getState().setPanel(null)}>
            Back to the world
          </button>
        </div>
      </SidePanel>
    );
  }

  return (
    <SidePanel
      title="Checkout preview"
      kicker="Step 1 of 1 · prototype"
      footer={
        <div>
          <div className="flex justify-between text-[16px]">
            <span>Total to pay</span>
            <span>{money(subtotal + shipping)}</span>
          </div>
          <button
            type="button"
            className="btn-primary mt-4 w-full"
            disabled={!bag.length}
            onClick={() => {
              setPlaced(`NX-${Date.now().toString(36).toUpperCase().slice(-6)}`);
              useShop.getState().clearBag();
            }}
          >
            <Lock size={15} /> Place demo order
          </button>
          <p className="mt-2 text-center text-[11px] text-white/40">No payment gateway is connected. Nothing is charged.</p>
        </div>
      }
    >
      <button type="button" className="mb-4 flex items-center gap-1 text-[12.5px] text-white/55 hover:text-white" onClick={() => useExperience.getState().setPanel('bag')}>
        <ChevronLeft size={14} /> Back to bag
      </button>
      <section>
        <h3 className="micro text-white/45">Order summary</h3>
        <ul className="mt-3 space-y-2 text-[13px]">
          {bag.map((l) => {
            const p = PRODUCT_BY_ID[l.productId];
            const c = p.colors.find((x) => x.id === l.colorId);
            return (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="text-white/80">
                  {l.qty} × {p.name} <span className="text-white/45">· {c?.name} · {l.size}</span>
                </span>
                <span>{money(lineTotal(l))}</span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-4 space-y-1 border-t hairline pt-3 text-[13px] text-white/70">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{money(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{shipping ? money(shipping) : 'Free'}</dd>
          </div>
          <div className="flex justify-between text-white/45">
            <dt>Taxes</dt>
            <dd>Included</dd>
          </div>
        </dl>
      </section>
      <section className="mt-6 rounded-2xl border border-white/8 p-4">
        <h3 className="flex items-center gap-2 text-[13px]">
          <Truck size={15} className="text-ice" /> Delivery
        </h3>
        <p className="mt-1.5 text-[12.5px] text-white/60">Estimated arrival {eta}. Your address is collected at checkout in the production build; this preview does not ask for it.</p>
      </section>
      <section className="mt-3 rounded-2xl border border-white/8 p-4">
        <h3 className="flex items-center gap-2 text-[13px]">
          <Lock size={15} className="text-lime" /> Payment
        </h3>
        <p className="mt-1.5 text-[12.5px] text-white/60">UPI, cards and wallets would appear here once a payment gateway is connected. This prototype does not collect any payment details.</p>
      </section>
    </SidePanel>
  );
}
