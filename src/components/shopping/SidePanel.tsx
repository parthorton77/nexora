import type { ReactNode } from 'react';
import { motion as m } from 'framer-motion';
import { X } from 'lucide-react';
import { useExperience } from '../../store/experienceStore';

/** A spatial side panel: slides in on a slight 3D tilt over a dimmed world. */
export function SidePanel({ title, kicker, children, footer, width = 420 }: { title: string; kicker?: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  const reduced = useExperience((s) => s.reducedMotion);
  const close = () => useExperience.getState().setPanel(null);
  return (
    <>
      <m.div className="fixed inset-0 z-[55] bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} aria-hidden="true" />
      <m.aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-strong fixed bottom-0 right-0 top-0 z-[56] flex w-full flex-col sm:bottom-3 sm:right-3 sm:top-3 sm:rounded-3xl"
        style={{ maxWidth: width, transformPerspective: 1200, transformOrigin: 'right center' }}
        initial={reduced ? { opacity: 0 } : { opacity: 0, x: 80, rotateY: -14 }}
        animate={{ opacity: 1, x: 0, rotateY: 0, transition: { duration: reduced ? 0.15 : 0.55, ease: [0.2, 0.8, 0.2, 1] } }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, x: 60, rotateY: -10, transition: { duration: 0.3 } }}
      >
        <header className="flex items-start justify-between border-b hairline px-6 pb-4 pt-6">
          <div>
            {kicker && <div className="micro text-white/45">{kicker}</div>}
            <h2 className="mt-1.5 font-display text-[21px] font-light tracking-wide">{title}</h2>
          </div>
          <button type="button" className="icon-btn -mr-2" onClick={close} aria-label="Close" autoFocus>
            <X size={18} strokeWidth={1.5} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
        {footer && <footer className="border-t hairline px-6 pb-6 pt-4">{footer}</footer>}
      </m.aside>
    </>
  );
}
