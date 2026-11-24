import { AnimatePresence, motion as m } from 'framer-motion';
import { ChevronLeft, ChevronRight, Footprints, LayoutGrid, Shirt } from 'lucide-react';
import { DIMENSION_BY_ID } from '../../data/dimensions';
import { productsInZone } from '../../data/products';
import type { DimensionId } from '../../types';
import { money } from '../../lib/platform';
import { useExperience } from '../../store/experienceStore';
import { carouselGoTo, motion } from '../../store/motion';

/**
 * Contextual navigation inside a dimension: zone dial, overview, fitting pod,
 * runway, and the centred product with prev/next. Hidden while inspecting.
 */
export function ZoneDial() {
  const scene = useExperience((s) => s.scene);
  const mode = useExperience((s) => s.mode);
  const zone = useExperience((s) => s.zone);
  const focus = useExperience((s) => s.focusIndex[s.zone] ?? 0);
  const transition = useExperience((s) => s.transition);
  if (scene === 'universe') return null;
  const dim = DIMENSION_BY_ID[scene as DimensionId];
  const show = (mode === 'browse' || mode === 'overview') && !transition;
  const list = productsInZone(zone);
  const current = list[focus];
  const st = useExperience.getState;
  const step = (d: number) => carouselGoTo((motion.carousel.target ?? Math.round(motion.carousel.pos)) + d);

  return (
    <AnimatePresence>
      {show && (
        <m.div
          className="pointer-events-none fixed inset-x-0 bottom-3 z-30 flex flex-col items-center gap-2 px-2 sm:bottom-5"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14, transition: { duration: 0.2 } }}
          transition={{ duration: 0.5 }}
        >
          {mode === 'browse' && current && (
            <div className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
              <button type="button" className="icon-btn" onClick={() => step(-1)} disabled={focus === 0} aria-label="Previous product">
                <ChevronLeft size={18} strokeWidth={1.5} />
              </button>
              <button type="button" className="flex min-w-[180px] flex-col items-center px-3 text-center sm:min-w-[240px]" onClick={() => st().select(current.id)} aria-label={`Inspect ${current.name}`}>
                <span className="text-[13.5px] text-ink">{current.name}</span>
                <span className="micro mt-0.5 text-white/45">
                  {money(current.price)} · {focus + 1}/{list.length} · <span className="text-lime/90">tap to pull out</span>
                </span>
              </button>
              <button type="button" className="icon-btn" onClick={() => step(1)} disabled={focus === list.length - 1} aria-label="Next product">
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            </div>
          )}
          <nav className="glass pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1.5 scrollbar-thin" aria-label={`${dim.name} zones`}>
            <button type="button" className={`chip shrink-0 ${mode === 'overview' ? 'is-on' : ''}`} onClick={() => useExperience.setState({ mode: 'overview' })} aria-pressed={mode === 'overview'} title="Overview">
              <LayoutGrid size={14} strokeWidth={1.5} />
              <span className="hidden sm:inline">Overview</span>
            </button>
            {dim.zones.map((z) => {
              const on = z.id === zone && mode === 'browse';
              return (
                <button key={z.id} type="button" className={`chip shrink-0 ${on ? 'is-on' : ''}`} onClick={() => st().setZone(z.id)} aria-pressed={on}>
                  <span className="font-mono text-[10px] opacity-60">{z.code}</span>
                  {z.name}
                </button>
              );
            })}
            {scene === 'fashion' && (
              <>
                <span className="mx-1 h-5 w-px shrink-0 bg-white/10" />
                <button type="button" className="chip shrink-0" onClick={() => st().openFitting('fit')} title="Fitting pod">
                  <Shirt size={14} strokeWidth={1.5} /> <span className="hidden sm:inline">Fitting pod</span>
                </button>
                <button type="button" className="chip shrink-0" onClick={() => st().openRunway()} title="Runway">
                  <Footprints size={14} strokeWidth={1.5} /> <span className="hidden sm:inline">Runway</span>
                </button>
              </>
            )}
          </nav>
          {mode === 'browse' && <div className="hidden micro text-white/35 sm:block">Drag · scroll · ← → to browse · 1–{dim.zones.length} zones · Enter to pull out</div>}
        </m.div>
      )}
    </AnimatePresence>
  );
}
