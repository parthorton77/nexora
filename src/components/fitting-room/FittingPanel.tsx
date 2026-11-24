import { AnimatePresence, motion as m } from 'framer-motion';
import { Footprints, Heart, Info, RotateCcw, ShoppingBag, X } from 'lucide-react';
import { AVATARS, AVATAR_BY_ID } from '../../data/avatars';
import { PRODUCT_BY_ID, SLOT_LABEL, SLOT_ORDER, productsForSlot } from '../../data/products';
import type { Product, Slot } from '../../types';
import { sizeChartFitEngine, recommendedSize } from '../../lib/tryon/fit';
import { money } from '../../lib/platform';
import { useExperience } from '../../store/experienceStore';
import { outfitTotal, useShop, useVariant } from '../../store/shoppingStore';
import { ProductImage } from '../interface/ProductImage';

function FitMeter({ product }: { product: Product }) {
  const avatarId = useShop((s) => s.avatarId);
  const v = useVariant(product)!;
  const avatar = AVATAR_BY_ID[avatarId];
  const size = v.size ?? recommendedSize(product, avatar);
  const est = sizeChartFitEngine.estimate(product, size, avatar);
  const tone = est.tone === 'good' ? 'text-lime' : est.tone === 'tight' || est.tone === 'loose' ? 'text-signal' : est.tone === 'na' ? 'text-white/60' : 'text-ice';
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[11.5px]">
        <span className={tone}>{est.label}</span>
        <span className="text-white/40">{v.size ? `Size ${size}` : `Suggested ${size}`}</span>
      </div>
      {est.tone !== 'na' && (
        <div className="relative mt-1.5 h-1 rounded-full bg-gradient-to-r from-signal/60 via-lime/70 to-signal/60" aria-hidden="true">
          <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-white" style={{ left: `${est.position * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function WornRow({ slot, product }: { slot: Slot; product: Product }) {
  const v = useVariant(product)!;
  const avatar = AVATAR_BY_ID[useShop((s) => s.avatarId)];
  return (
    <li className="rounded-2xl border border-white/8 p-3">
      <div className="flex items-center gap-3">
        <ProductImage product={product} color={v.color.hex} size={40} />
        <div className="min-w-0 flex-1">
          <div className="micro text-white/40">{SLOT_LABEL[slot]}</div>
          <div className="truncate text-[13px] text-ink">{product.name}</div>
        </div>
        <button type="button" className="icon-btn !h-8 !w-8" onClick={() => useShop.getState().setOutfitPiece(slot, null)} aria-label={`Remove ${product.name}`}>
          <X size={14} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {product.colors.map((c) => (
          <button
            key={c.id}
            type="button"
            title={c.name}
            aria-label={`${c.name}${c.id === v.color.id ? ', selected' : ''}`}
            onClick={() => useShop.getState().setColor(product.id, c.id)}
            className={`h-5 w-5 rounded-full border ${c.id === v.color.id ? 'border-lime' : 'border-white/20'}`}
            style={{ background: c.hex }}
          />
        ))}
        {product.sizes.length > 1 && <span className="mx-1 h-4 w-px bg-white/10" />}
        {product.sizes.length > 1 &&
          product.sizes.map((s) => {
            const on = (v.size ?? recommendedSize(product, avatar)) === s;
            return (
              <button key={s} type="button" onClick={() => useShop.getState().setSize(product.id, s)} className={`h-6 rounded-full border px-2 text-[10.5px] ${on ? 'border-lime bg-lime/15 text-[#eaffb0]' : 'border-white/12 text-white/60'}`} aria-pressed={on}>
                {s}
              </button>
            );
          })}
      </div>
      <FitMeter product={product} />
    </li>
  );
}

/** Fitting pod controls: avatar, fit per piece, and the outfit composer. */
export function FittingPanel() {
  const mode = useExperience((s) => s.mode);
  const tab = useExperience((s) => s.fittingTab);
  const slot = useExperience((s) => s.composeSlot);
  const avatarId = useShop((s) => s.avatarId);
  const outfit = useShop((s) => s.outfit);
  const open = mode === 'fitting';
  const st = useExperience.getState;
  const shop = useShop.getState;
  const worn = SLOT_ORDER.filter((s) => outfit[s] && PRODUCT_BY_ID[outfit[s]!]);
  const total = outfitTotal(outfit);

  return (
    <AnimatePresence>
      {open && (
        <m.aside
          className="glass-strong pointer-events-auto fixed inset-x-2 bottom-2 z-40 max-h-[50vh] overflow-y-auto rounded-3xl p-5 scrollbar-thin md:inset-x-auto md:bottom-auto md:left-5 md:top-24 md:max-h-[calc(100vh-8rem)] md:w-[360px]"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0, transition: { delay: 0.5, duration: 0.5 } }}
          exit={{ opacity: 0, x: -30, transition: { duration: 0.2 } }}
          aria-label="Fitting pod"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="micro text-white/45">Fitting pod · prototype</div>
              <h2 className="mt-1.5 font-display text-[20px] font-light tracking-wide">Virtual fitting</h2>
            </div>
            <button type="button" className="icon-btn" onClick={() => st().back()} aria-label="Leave the fitting pod">
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-white/10 p-1" role="tablist">
            {(['fit', 'compose'] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => st().setFittingTab(t)} className={`h-9 rounded-full text-[12.5px] transition ${tab === t ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}>
                {t === 'fit' ? 'Fit & avatar' : 'Outfit composer'}
              </button>
            ))}
          </div>

          {tab === 'fit' ? (
            <>
              <div className="mt-5 micro text-white/45">Avatar</div>
              <div className="mt-2 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Avatar">
                {AVATARS.map((a) => (
                  <button key={a.id} type="button" role="radio" aria-checked={a.id === avatarId} onClick={() => shop().setAvatar(a.id)} className={`rounded-2xl border p-2 text-left transition ${a.id === avatarId ? 'border-lime/60 bg-lime/10' : 'border-white/10 hover:border-white/30'}`}>
                    <span className="block h-3 w-3 rounded-full" style={{ background: a.tone }} />
                    <span className="mt-1.5 block text-[12.5px] text-ink">{a.name}</span>
                    <span className="block text-[10.5px] text-white/45">
                      {a.heightCm} cm · {a.build}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-5 micro text-white/45">Wearing</div>
              {worn.length ? (
                <ul className="mt-2 space-y-2">
                  {worn.map((s) => (
                    <WornRow key={s} slot={s} product={PRODUCT_BY_ID[outfit[s]!]} />
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[12.5px] text-white/55">Nothing yet. Open the composer, or pull a piece from a zone and choose "Try on avatar".</p>
              )}
              <p className="mt-4 flex gap-2 rounded-2xl border border-white/8 p-3 text-[11px] leading-relaxed text-white/50">
                <Info size={14} className="mt-0.5 shrink-0" />
                Simulated fit: we compare this size's garment chart with the avatar's preset measurements. It is not a body scan or an accurate measurement of you. Drape is a visual approximation, not cloth physics.
              </p>
            </>
          ) : (
            <>
              <div className="mt-5 flex flex-wrap gap-1.5" role="tablist" aria-label="Outfit slot">
                {SLOT_ORDER.map((s) => (
                  <button key={s} type="button" role="tab" aria-selected={slot === s} className={`chip !h-8 ${slot === s ? 'is-on' : ''}`} onClick={() => st().setComposeSlot(s)}>
                    {SLOT_LABEL[s]}
                    {outfit[s] && <span className="h-1.5 w-1.5 rounded-full bg-lime" />}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[12px] text-white/50">Drag to turn the ring around your avatar, then tap a piece to wear it. Tap a worn piece to take it off.</p>
              <ul className="mt-3 space-y-1.5">
                {productsForSlot(slot).map((p) => {
                  const on = outfit[slot] === p.id;
                  return (
                    <li key={p.id}>
                      <button type="button" onClick={() => shop().setOutfitPiece(slot, on ? null : p.id)} aria-pressed={on} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${on ? 'border-lime/50 bg-lime/10' : 'border-white/8 hover:border-white/25'}`}>
                        <ProductImage product={p} size={34} />
                        <span className="flex-1 text-[13px]">{p.name}</span>
                        <span className="text-[12px] text-white/55">{money(p.price)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <div className="mt-5 border-t hairline pt-4">
            <div className="flex items-baseline justify-between">
              <span className="micro text-white/45">Outfit total · {worn.length} pieces</span>
              <span className="text-[18px] font-light">{money(total)}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="btn-primary !h-10 text-[13px]" disabled={!worn.length} onClick={() => shop().addOutfitToBag()}>
                <ShoppingBag size={15} /> Add outfit
              </button>
              <button type="button" className="btn-ghost !h-10 text-[13px]" disabled={!worn.length} onClick={() => shop().saveOutfit()}>
                <Heart size={15} /> Save outfit
              </button>
              <button type="button" className="btn-ghost !h-10 text-[13px]" disabled={!worn.length} onClick={() => st().openRunway()}>
                <Footprints size={15} /> Walk the runway
              </button>
              <button type="button" className="btn-ghost !h-10 text-[13px]" disabled={!worn.length} onClick={() => shop().clearOutfit()}>
                <RotateCcw size={15} /> Clear
              </button>
            </div>
          </div>
        </m.aside>
      )}
    </AnimatePresence>
  );
}
