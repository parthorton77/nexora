import { useEffect } from 'react';
import { DIMENSION_BY_ID } from '../../data/dimensions';
import { productsInZone } from '../../data/products';
import { useExperience } from '../../store/experienceStore';
import { useShop } from '../../store/shoppingStore';
import { carouselGoTo, motion } from '../../store/motion';
import { clamp } from '../../lib/math';
import type { DimensionId } from '../../types';

/** Keyboard navigation for every context. Ignored while typing in a field. */
export function KeyboardController() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useExperience.getState();
      if (!s.entered || s.transition) return;
      const k = e.key;

      if (k === 'Escape') {
        s.back();
        return;
      }
      if (s.panel) return;
      // buttons handle their own Enter/Space
      const onButton = t?.closest('button, a, [role="button"]');

      if (s.scene === 'universe') {
        const u = motion.universe;
        if (k === 'ArrowUp' || k === 'w' || k === 'W') u.target = clamp(u.target + 0.14, 0, 1);
        else if (k === 'ArrowDown' || k === 's' || k === 'S') u.target = clamp(u.target - 0.14, 0, 1);
        else if (k === 'ArrowLeft' || k === 'a' || k === 'A') u.yawTarget = clamp(u.yawTarget - 0.2, -0.95, 0.95);
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') u.yawTarget = clamp(u.yawTarget + 0.2, -0.95, 0.95);
        else if ((k === 'Enter' || k === ' ') && !onButton) s.activatePortal(s.focusedPortal as DimensionId);
        else if (k === 'r' || k === 'R') {
          u.target = 0;
          u.yawTarget = 0;
          u.pitchTarget = 0;
        } else return;
        e.preventDefault();
        return;
      }

      const zones = DIMENSION_BY_ID[s.scene as DimensionId].zones;
      if (s.mode === 'overview') {
        if (/^[1-9]$/.test(k) && zones[Number(k) - 1]) s.setZone(zones[Number(k) - 1].id);
        else if ((k === 'Enter' || k === ' ') && !onButton) s.setZone(s.zone);
        else if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'e' || k === 'E' || k === 'q' || k === 'Q') {
          const i = zones.findIndex((z) => z.id === s.zone);
          const dir = k === 'ArrowRight' || k.toLowerCase() === 'e' ? 1 : -1;
          s.setZone(zones[(i + dir + zones.length) % zones.length].id);
        } else return;
        e.preventDefault();
        return;
      }
      if (s.mode === 'browse') {
        const list = productsInZone(s.zone);
        const cur = motion.carousel.target ?? Math.round(motion.carousel.pos);
        if (k === 'ArrowRight' || k === 'd' || k === 'D') carouselGoTo(cur + 1);
        else if (k === 'ArrowLeft' || k === 'a' || k === 'A') carouselGoTo(cur - 1);
        else if ((k === 'Enter' || k === ' ') && !onButton) {
          const p = list[clamp(cur, 0, list.length - 1)];
          if (p) s.select(p.id);
        } else if (/^[1-9]$/.test(k) && zones[Number(k) - 1]) s.setZone(zones[Number(k) - 1].id);
        else if (k === 'q' || k === 'Q' || k === 'e' || k === 'E') {
          const i = zones.findIndex((z) => z.id === s.zone);
          const next = zones[(i + (k.toLowerCase() === 'e' ? 1 : -1) + zones.length) % zones.length];
          s.setZone(next.id);
        } else if (k === 'r' || k === 'R') useExperience.setState({ resetToken: s.resetToken + 1 });
        else return;
        e.preventDefault();
        return;
      }
      if (s.mode === 'inspect') {
        const m = motion.inspect;
        if (k === 'ArrowRight') m.rotYTarget += Math.PI / 4;
        else if (k === 'ArrowLeft') m.rotYTarget -= Math.PI / 4;
        else if (k === 'ArrowUp' || k === '+' || k === '=') m.zoomTarget = clamp(m.zoomTarget * 0.85, 0.45, 1.6);
        else if (k === 'ArrowDown' || k === '-' || k === '_') m.zoomTarget = clamp(m.zoomTarget / 0.85, 0.45, 1.6);
        else if (k === '0' || k === 'r' || k === 'R') {
          m.rotYTarget = Math.round(m.rotYTarget / (Math.PI * 2)) * Math.PI * 2;
          m.rotXTarget = 0;
          m.zoomTarget = 1;
        } else if (k === 'h' || k === 'H') s.toggleHotspots();
        else if ((k === 't' || k === 'T') && s.scene === 'fashion' && s.selectedId) {
          useShop.getState().wear(s.selectedId);
          s.openFitting('fit');
        } else return;
        m.idle = 0;
        e.preventDefault();
        return;
      }
      if (s.mode === 'fitting') {
        if (k === 'ArrowRight') motion.fitting.rotY += 0.5;
        else if (k === 'ArrowLeft') motion.fitting.rotY -= 0.5;
        else return;
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
