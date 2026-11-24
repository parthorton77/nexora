import { AnimatePresence, motion as m } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { useExperience } from '../../store/experienceStore';

const WORD = 'NEXORA';

/** The NEXORA loading sequence: wordmark reveal, real progress, then a deliberate entry. */
export function Loader() {
  const entered = useExperience((s) => s.entered);
  const progress = useExperience((s) => s.progress);
  const status = useExperience((s) => s.status);
  const reduced = useExperience((s) => s.reducedMotion);
  const ready = progress >= 1;

  const enter = (withSound: boolean) => {
    const s = useExperience.getState();
    if (withSound && !s.soundOn) s.toggleSound();
    s.enter();
  };

  return (
    <AnimatePresence>
      {!entered && (
        <m.div
          key="loader"
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center px-6"
          style={{ background: 'radial-gradient(120% 80% at 50% 40%, rgba(8,12,20,0.55) 0%, rgba(3,4,7,0.96) 60%, #020305 100%)' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: reduced ? 0.2 : 1.4, ease: [0.65, 0, 0.35, 1] } }}
          role="dialog"
          aria-label="NEXORA is loading"
        >
          <div className="flex flex-col items-center">
            <div className="micro text-white/45">Year 2055 · Shopping universe</div>
            <h1 className="wordmark mt-6 flex text-[40px] text-ink sm:text-[64px]" aria-label="NEXORA">
              {WORD.split('').map((ch, i) => (
                <m.span
                  key={i}
                  initial={{ opacity: 0, filter: 'blur(14px)', y: 14 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  transition={{ delay: reduced ? 0 : 0.25 + i * 0.12, duration: reduced ? 0.01 : 1.1, ease: [0.2, 0.8, 0.2, 1] }}
                  aria-hidden="true"
                >
                  {ch}
                </m.span>
              ))}
            </h1>
            <m.p
              className="mt-4 text-center text-[13px] tracking-[0.2em] text-white/55 uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduced ? 0 : 1.1, duration: 1 }}
            >
              Enter a new dimension of shopping
            </m.p>

            <div className="mt-14 h-[64px] w-[min(360px,80vw)]">
              <AnimatePresence mode="wait">
                {!ready ? (
                  <m.div key="bar" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                    <div className="relative h-px w-full overflow-hidden bg-white/10">
                      <m.div
                        className="absolute inset-y-0 left-0 bg-lime"
                        style={{ boxShadow: '0 0 12px rgba(198,244,50,0.8)' }}
                        animate={{ width: `${Math.round(progress * 100)}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="mt-3 flex justify-between micro text-white/45" aria-live="polite">
                      <span>{status}</span>
                      <span>{Math.round(progress * 100)}%</span>
                    </div>
                  </m.div>
                ) : (
                  <m.div key="enter" className="flex flex-col items-center gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    <button type="button" className="btn-primary min-w-[220px]" onClick={() => enter(false)} autoFocus>
                      Enter NEXORA
                    </button>
                    <button type="button" className="flex items-center gap-2 text-[12px] text-white/50 transition hover:text-white/80" onClick={() => enter(true)}>
                      <Volume2 size={14} strokeWidth={1.5} /> Enter with ambient sound
                    </button>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="absolute bottom-6 left-0 right-0 text-center micro text-white/30">Don't browse products. Enter their world.</div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
