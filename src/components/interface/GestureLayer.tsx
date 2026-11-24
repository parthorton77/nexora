import { useEffect, useRef, type ReactNode } from 'react';
import { useExperience } from '../../store/experienceStore';
import { carouselGoTo, motion } from '../../store/motion';
import { clamp } from '../../lib/math';

/**
 * One gesture layer for the whole 3D world: pointer parallax, drag, inertia
 * flicks, wheel and pinch. Input is routed by context (universe exploration,
 * product carousel, 360 rotation, fitting turntable). It only writes to the
 * non-React motion store, so gestures never cause re-renders.
 */
export function GestureLayer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const pointers = new Map<number, { x: number; y: number }>();
    let start = { x: 0, y: 0 };
    let last = { x: 0, y: 0, t: 0 };
    let vx = 0;
    let pinchDist = 0;
    let wheelAcc = 0;
    let wheelTimer = 0;

    const itemPx = () => clamp(window.innerWidth * 0.17, 120, 260);
    const ctx = () => {
      const s = useExperience.getState();
      if (!s.entered || s.transition || s.panel) return 'none';
      if (s.scene === 'universe') return 'universe';
      if (s.mode === 'inspect') return 'inspect';
      if (s.mode === 'fitting') return s.fittingTab === 'compose' ? 'compose' : 'fitting';
      if (s.mode === 'runway' || s.mode === 'overview') return 'none';
      return 'carousel';
    };

    const onMove = (e: PointerEvent) => {
      motion.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      motion.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) zoomBy((pinchDist - d) * 0.006);
        pinchDist = d;
        motion.drag.moved = true;
        return;
      }
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const now = performance.now();
      const dt = Math.max(1, now - last.t);
      vx = vx * 0.6 + (dx / dt) * 0.4;
      last = { x: e.clientX, y: e.clientY, t: now };
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) motion.drag.moved = true;
      if (!motion.drag.moved) return;
      const touch = e.pointerType === 'touch';
      switch (ctx()) {
        case 'universe': {
          const u = motion.universe;
          u.yawTarget = clamp(u.yawTarget + dx * 0.0032, -0.95, 0.95);
          if (touch) u.target = clamp(u.target - dy * 0.003, 0, 1);
          else u.pitchTarget = clamp(u.pitchTarget - dy * 0.0024, -0.32, 0.4);
          break;
        }
        case 'carousel': {
          const c = motion.carousel;
          c.dragging = true;
          c.target = null;
          c.pos = clamp(c.pos - dx / itemPx(), -0.45, c.count - 0.55);
          break;
        }
        case 'inspect': {
          const m = motion.inspect;
          m.dragging = true;
          m.rotYTarget += dx * 0.011;
          m.rotXTarget = clamp(m.rotXTarget + dy * 0.004, -0.5, 0.6);
          m.idle = 0;
          break;
        }
        case 'fitting':
          motion.fitting.rotY += dx * 0.01;
          motion.fitting.dragging = true;
          break;
        case 'compose':
          motion.fitting.ring = clamp(motion.fitting.ring + dx * 0.004, -0.5, 0.5);
          motion.fitting.dragging = true;
          break;
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        start = { x: e.clientX, y: e.clientY };
        last = { x: e.clientX, y: e.clientY, t: performance.now() };
        vx = 0;
        motion.drag.moved = false;
      } else pinchDist = 0;
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      pinchDist = 0;
      if (pointers.size) return;
      const c = motion.carousel;
      if (c.dragging) {
        c.dragging = false;
        // inertia flick (px/ms → items/frame-ish)
        c.vel = clamp((-vx / itemPx()) * 16, -0.9, 0.9);
      }
      if (motion.inspect.dragging) {
        motion.inspect.dragging = false;
        motion.inspect.vel = clamp(vx * 0.18, -0.6, 0.6);
      }
      motion.fitting.dragging = false;
      // let the click event (fired after pointerup) still see `moved`
      setTimeout(() => {
        motion.drag.moved = false;
      }, 0);
    };

    const zoomBy = (delta: number) => {
      const c = ctx();
      if (c === 'inspect') {
        const m = motion.inspect;
        m.zoomTarget = clamp(m.zoomTarget * Math.exp(delta), 0.45, 1.6);
        m.idle = 0;
      } else if (c === 'universe') {
        motion.universe.target = clamp(motion.universe.target - delta * 0.35, 0, 1);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = ctx();
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const scaled = e.deltaMode === 1 ? d * 30 : d;
      if (c === 'universe') motion.universe.target = clamp(motion.universe.target + scaled * 0.0007, 0, 1);
      else if (c === 'inspect') zoomBy(scaled * 0.0012);
      else if (c === 'carousel') {
        wheelAcc += scaled;
        window.clearTimeout(wheelTimer);
        wheelTimer = window.setTimeout(() => (wheelAcc = 0), 220);
        if (Math.abs(wheelAcc) > 70) {
          const cur = motion.carousel.target ?? Math.round(motion.carousel.pos);
          carouselGoTo(cur + Math.sign(wheelAcc));
          wheelAcc = 0;
        }
      } else if (c === 'compose') motion.fitting.ring += scaled * 0.002;
      else if (c === 'fitting') motion.fitting.rotY += scaled * 0.003;
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  return (
    <div ref={ref} className="absolute inset-0" style={{ touchAction: 'none' }}>
      {children}
    </div>
  );
}
