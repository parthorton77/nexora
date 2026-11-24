import { useEffect, useState } from 'react';
import { AnimatePresence, motion as m } from 'framer-motion';
import { Move3d } from 'lucide-react';
import { useExperience } from '../../store/experienceStore';

/** "Move to explore. Enter to discover." — shown in the universe until the visitor moves. */
export function Hint() {
  const entered = useExperience((s) => s.entered);
  const scene = useExperience((s) => s.scene);
  const transition = useExperience((s) => s.transition);
  const [coarse] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!entered || scene !== 'universe') return setVisible(false);
    const t = window.setTimeout(() => setVisible(true), 3800);
    return () => window.clearTimeout(t);
  }, [entered, scene]);

  return (
    <AnimatePresence>
      {visible && !transition && scene === 'universe' && (
        <m.div
          className="pointer-events-none fixed inset-x-0 bottom-8 z-30 flex justify-center px-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.8 }}
        >
          <div className="glass flex items-center gap-3 rounded-full px-5 py-3">
            <Move3d size={16} strokeWidth={1.4} className="text-lime" />
            <span className="text-[13px] tracking-wide text-white/85">Move to explore. Enter to discover.</span>
            <span className="hidden micro text-white/40 md:inline">{coarse ? 'Drag · swipe up' : 'Drag · scroll · WASD · Enter'}</span>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
