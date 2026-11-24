import { AnimatePresence, motion as m } from 'framer-motion';
import { DIMENSION_BY_ID } from '../../data/dimensions';
import { useExperience } from '../../store/experienceStore';
import type { DimensionId } from '../../types';

/** Typographic card shown inside the warp: where you are going, and that it is loading. */
export function TransitionOverlay() {
  const t = useExperience((s) => s.transition);
  const arrivalReady = useExperience((s) => s.arrivalReady);
  const show = !!t && (t.stage === 'warp' || t.stage === 'approach');
  const title = t ? (t.to === 'universe' ? 'THE NEXORA UNIVERSE' : DIMENSION_BY_ID[t.to as DimensionId].title) : '';
  const loading = t?.stage === 'warp' && arrivalReady !== t.to;
  return (
    <AnimatePresence>
      {show && t?.stage === 'warp' && (
        <m.div
          key={title}
          className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          transition={{ duration: 0.5 }}
        >
          <div className="micro text-white/55">{t.to === 'universe' ? 'Returning to' : 'Entering'}</div>
          <m.div
            className="wordmark mt-4 text-center text-[22px] text-ink sm:text-[34px]"
            initial={{ letterSpacing: '0.9em', opacity: 0 }}
            animate={{ letterSpacing: '0.42em', opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {title}
          </m.div>
          <div className="mt-6 h-4 micro text-white/40">{loading ? 'Materialising…' : ''}</div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
