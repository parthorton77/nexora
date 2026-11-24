import { AnimatePresence, motion as m } from 'framer-motion';
import { Check, Info, TriangleAlert } from 'lucide-react';
import { useExperience } from '../../store/experienceStore';

export function Toasts() {
  const toasts = useExperience((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <m.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
            className="glass-strong pointer-events-auto flex max-w-[92vw] items-center gap-2.5 rounded-full py-2.5 pl-3 pr-4 text-[13px]"
          >
            {t.tone === 'ok' ? <Check size={15} className="text-lime" /> : t.tone === 'warn' ? <TriangleAlert size={15} className="text-signal" /> : <Info size={15} className="text-ice" />}
            {t.text}
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
