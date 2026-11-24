import { AnimatePresence, motion as m } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shirt, ShoppingBag, X } from 'lucide-react';
import { PRODUCT_BY_ID } from '../../data/products';
import { AVATAR_BY_ID } from '../../data/avatars';
import { money } from '../../lib/platform';
import { useExperience } from '../../store/experienceStore';
import { outfitTotal, useShop } from '../../store/shoppingStore';
import { useRunwayLooks } from '../../hooks/useRunwayLooks';

/** Runway show controls: the look on the runway, its pieces, and shop-the-look. */
export function RunwayPanel() {
  const mode = useExperience((s) => s.mode);
  const index = useExperience((s) => s.runwayIndex);
  const looks = useRunwayLooks();
  const open = mode === 'runway';
  const look = looks[index % looks.length];
  const items = look ? Object.values(look.outfit).filter(Boolean).map((id) => PRODUCT_BY_ID[id!]) : [];
  const go = (d: number) => useExperience.getState().setRunwayIndex((index + d + looks.length) % looks.length);
  return (
    <AnimatePresence>
      {open && look && (
        <m.aside
          className="glass-strong pointer-events-auto fixed inset-x-2 bottom-2 z-40 rounded-3xl p-5 md:inset-x-auto md:bottom-6 md:left-5 md:w-[380px]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.6 } }}
          exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
          aria-label="Runway"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="micro text-white/45">
                Runway · look {(index % looks.length) + 1} of {looks.length} · on {AVATAR_BY_ID[look.avatarId]?.name}
              </div>
              <h2 className="mt-1.5 font-display text-[20px] font-light tracking-wide">{look.name}</h2>
              <p className="mt-1 text-[12.5px] text-white/55">{look.note}</p>
            </div>
            <button type="button" className="icon-btn" onClick={() => useExperience.getState().back()} aria-label="Leave the runway">
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
          <ul className="mt-3 space-y-1 text-[12.5px]">
            {items.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <button type="button" className="truncate text-left text-white/80 underline-offset-4 hover:underline" onClick={() => useExperience.getState().goToProduct(p.id)}>
                  {p.name}
                </button>
                <span className="text-white/50">{money(p.price)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t hairline pt-3">
            <span className="micro text-white/45">The look</span>
            <span className="text-[17px] font-light">{money(outfitTotal(look.outfit))}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className="icon-btn border hairline" onClick={() => go(-1)} aria-label="Previous look">
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              className="btn-ghost !h-10 flex-1 text-[13px]"
              onClick={() => {
                useShop.getState().wearOutfit(look.outfit);
                useShop.getState().setAvatar(look.avatarId);
                useExperience.getState().openFitting('fit');
              }}
            >
              <Shirt size={15} /> Wear it
            </button>
            <button
              type="button"
              className="btn-primary !h-10 flex-1 text-[13px]"
              onClick={() => {
                useShop.getState().wearOutfit(look.outfit);
                useShop.getState().addOutfitToBag();
              }}
            >
              <ShoppingBag size={15} /> Shop look
            </button>
            <button type="button" className="icon-btn border hairline" onClick={() => go(1)} aria-label="Next look">
              <ChevronRight size={17} />
            </button>
          </div>
        </m.aside>
      )}
    </AnimatePresence>
  );
}
