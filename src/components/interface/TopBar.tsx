import { motion as m } from 'framer-motion';
import { ArrowLeft, Heart, Settings2, ShoppingBag, UserRound, Volume2, VolumeX } from 'lucide-react';
import { DIMENSION_BY_ID } from '../../data/dimensions';
import { useExperience } from '../../store/experienceStore';
import { bagCount, useShop } from '../../store/shoppingStore';
import type { DimensionId } from '../../types';

function Logo() {
  return (
    <div className="flex items-center gap-2.5 pl-1.5 pr-1 sm:pr-2" aria-label="NEXORA">
      <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="22" fill="none" stroke="#c9d3de" strokeWidth="4" />
        <circle cx="32" cy="32" r="9" fill="#c6f432" />
      </svg>
      <span className="wordmark hidden text-[13px] tracking-[0.42em] text-ink min-[420px]:inline">NEXORA</span>
    </div>
  );
}

/** The compact floating interface: no navbar, just a glass capsule. */
export function TopBar() {
  const scene = useExperience((s) => s.scene);
  const transition = useExperience((s) => s.transition);
  const soundOn = useExperience((s) => s.soundOn);
  const panel = useExperience((s) => s.panel);
  const count = useShop(bagCount);
  const wishes = useShop((s) => s.wishlist.length + s.outfits.length);
  const st = useExperience.getState;
  const where = scene === 'universe' ? 'Universe' : DIMENSION_BY_ID[scene as DimensionId].title;

  return (
    <m.header
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-3 sm:p-5"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.8 }}
    >
      <div className="glass pointer-events-auto flex h-12 items-center gap-1 rounded-full pl-2 pr-1.5">
        <Logo />
        <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
        <div className="hidden items-center gap-2 px-2 sm:flex" aria-live="polite">
          <span className="h-1.5 w-1.5 rounded-full bg-lime shadow-[0_0_10px_#c6f432]" />
          <span className="micro text-white/70">{transition ? 'In transit' : where}</span>
        </div>
        {scene !== 'universe' && (
          <button type="button" className="chip ml-1 !h-9" onClick={() => st().returnToUniverse()} disabled={!!transition} aria-label="Back to the universe">
            <ArrowLeft size={14} strokeWidth={1.6} />
            <span className="hidden sm:inline">Universe</span>
          </button>
        )}
      </div>

      <nav className="glass pointer-events-auto flex h-12 items-center gap-0 rounded-full px-1 sm:gap-0.5 sm:px-1.5 [&_.icon-btn]:h-9 [&_.icon-btn]:w-9 sm:[&_.icon-btn]:h-10 sm:[&_.icon-btn]:w-10" aria-label="Shopping">
        <button type="button" className="icon-btn" onClick={() => st().toggleSound()} aria-pressed={soundOn} aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'} title={soundOn ? 'Sound on' : 'Sound off'}>
          {soundOn ? <Volume2 size={17} strokeWidth={1.5} /> : <VolumeX size={17} strokeWidth={1.5} className="text-white/60" />}
        </button>
        <button type="button" className="icon-btn" onClick={() => st().setPanel('settings')} aria-pressed={panel === 'settings'} aria-label="Experience settings" title="Experience settings">
          <Settings2 size={17} strokeWidth={1.5} />
        </button>
        <button type="button" className="icon-btn" onClick={() => st().setPanel('profile')} aria-pressed={panel === 'profile'} aria-label="Profile" title="Profile">
          <UserRound size={17} strokeWidth={1.5} />
        </button>
        <button type="button" className="icon-btn" onClick={() => st().setPanel('wishlist')} aria-pressed={panel === 'wishlist'} aria-label={`Wishlist, ${wishes} saved`} title="Wishlist">
          <Heart size={17} strokeWidth={1.5} />
          {wishes > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-signal" />}
        </button>
        <button type="button" className="icon-btn" onClick={() => st().setPanel('bag')} aria-pressed={panel === 'bag'} aria-label={`Shopping bag, ${count} items`} title="Bag">
          <ShoppingBag size={17} strokeWidth={1.5} />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-lime px-1 text-[10px] font-semibold text-black">{count}</span>
          )}
        </button>
      </nav>
    </m.header>
  );
}
