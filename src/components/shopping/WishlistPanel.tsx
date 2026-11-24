import { Heart, Shirt, ShoppingBag, Trash2 } from 'lucide-react';
import { PRODUCT_BY_ID } from '../../data/products';
import { money } from '../../lib/platform';
import { useExperience } from '../../store/experienceStore';
import { outfitTotal, useShop } from '../../store/shoppingStore';
import { ProductImage } from '../interface/ProductImage';
import { SidePanel } from './SidePanel';

export function WishlistPanel() {
  const wishlist = useShop((s) => s.wishlist);
  const outfits = useShop((s) => s.outfits);
  const shop = useShop.getState;
  const xp = useExperience.getState;

  const wearOutfit = (o: (typeof outfits)[number]['outfit']) => {
    shop().wearOutfit(o);
    const s = xp();
    s.setPanel(null);
    if (s.scene === 'fashion') s.openFitting('fit');
    else xp().toast('Outfit loaded. Open the Fashion Dimension fitting pod to see it on your avatar.', 'info');
  };

  return (
    <SidePanel title="Wishlist" kicker={`${wishlist.length} pieces · ${outfits.length} outfits`}>
      {wishlist.length === 0 && outfits.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Heart size={28} strokeWidth={1.2} className="text-white/30" />
          <p className="mt-4 text-[14px] text-white/70">Nothing saved yet.</p>
          <p className="mt-1 text-[12.5px] text-white/45">Tap the heart on a product, or save an outfit in the fitting pod.</p>
        </div>
      )}
      {outfits.length > 0 && (
        <section>
          <h3 className="micro text-white/45">Saved outfits</h3>
          <ul className="mt-3 space-y-3">
            {outfits.map((o) => {
              const items = Object.values(o.outfit).filter(Boolean).map((id) => PRODUCT_BY_ID[id!]).filter(Boolean);
              return (
                <li key={o.id} className="rounded-2xl border border-white/8 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px]">{o.name}</span>
                    <span className="text-[13px] text-white/70">{money(outfitTotal(o.outfit))}</span>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    {items.map((p) => (
                      <span key={p.id} className="grid h-11 w-11 place-items-center rounded-lg bg-white/[0.03]" title={p.name}>
                        <ProductImage product={p} size={34} />
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button type="button" className="chip !h-8" onClick={() => wearOutfit(o.outfit)}>
                      <Shirt size={13} /> Wear
                    </button>
                    <button
                      type="button"
                      className="chip !h-8"
                      onClick={() => {
                        shop().wearOutfit(o.outfit);
                        shop().addOutfitToBag();
                      }}
                    >
                      <ShoppingBag size={13} /> Add all to bag
                    </button>
                    <button type="button" className="chip !h-8" onClick={() => shop().removeOutfit(o.id)} aria-label={`Remove ${o.name}`}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {wishlist.length > 0 && (
        <section className={outfits.length ? 'mt-7' : ''}>
          <h3 className="micro text-white/45">Saved pieces</h3>
          <ul className="mt-3 space-y-2">
            {wishlist.map((w) => {
              const p = PRODUCT_BY_ID[w.productId];
              if (!p) return null;
              const c = p.colors.find((x) => x.id === w.colorId) ?? p.colors[0];
              return (
                <li key={w.productId} className="flex items-center gap-3 rounded-2xl border border-white/8 p-2.5">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/[0.03]">
                    <ProductImage product={p} color={c.hex} size={46} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px]">{p.name}</div>
                    <div className="text-[12px] text-white/50">
                      {c.name} · {money(p.price)}
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      <button type="button" className="chip !h-7 !px-2.5 !text-[11.5px]" onClick={() => xp().goToProduct(p.id)}>
                        View in 3D
                      </button>
                      <button
                        type="button"
                        className="chip !h-7 !px-2.5 !text-[11.5px]"
                        onClick={() => {
                          if (w.size) shop().setSize(p.id, w.size);
                          if (!shop().addToBag(p.id)) xp().goToProduct(p.id);
                        }}
                      >
                        Add to bag
                      </button>
                    </div>
                  </div>
                  <button type="button" className="icon-btn !h-8 !w-8 self-start" onClick={() => shop().toggleWish(p.id)} aria-label={`Remove ${p.name} from wishlist`}>
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </SidePanel>
  );
}
