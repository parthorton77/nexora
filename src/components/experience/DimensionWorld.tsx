import { Suspense, lazy, useEffect } from 'react';
import { DIMENSION_BY_ID } from '../../data/dimensions';
import type { DimensionId } from '../../types';
import { useExperience, type SceneId } from '../../store/experienceStore';
import { useArrival } from '../../hooks/useArrival';
import { fly, cut } from './flight';
import { ARRIVAL, FITTING, OVERVIEW, browseShot, zoneAngle } from '../fashion/layout';
import { Hall, Runway, type HallTheme } from '../fashion/FashionHall';
import { CarouselPhysics, ZoneStage } from '../product/DiscoveryCarousel';
import ProductScene from '../../scenes/ProductScene';

const FittingRoomScene = lazy(() => import('../../scenes/FittingRoomScene'));
const RunwayScene = lazy(() => import('../../scenes/RunwayScene'));

/** Camera choreography for a dimension: arrival, zone travel, overview, fitting. */
function Director({ id }: { id: DimensionId }) {
  const dim = DIMENSION_BY_ID[id];

  const toZone = (duration: number, arc: number) => {
    const s = browseShot(zoneAngle(dim, useExperience.getState().zone));
    return fly(s.pos, s.look, { duration, arc, fov: 50, ease: 'power2.inOut' });
  };

  const handlePending = () => {
    const st = useExperience.getState();
    const target = st.consumePending();
    if (!target) return;
    const delay = st.reducedMotion ? 120 : 1700;
    window.setTimeout(() => useExperience.getState().select(target), delay);
  };

  useArrival(id as SceneId, async () => {
    cut(ARRIVAL.from, ARRIVAL.look, 76);
    await fly(OVERVIEW.pos, OVERVIEW.look, { duration: 2.7, ease: 'power3.out', fov: 50, arc: 1.4, lookLead: 0.7 });
    window.setTimeout(() => {
      const st = useExperience.getState();
      if (st.transition) return;
      if (st.pendingProduct) handlePending();
      else if (st.mode === 'overview') st.setZone(st.zone);
    }, 650);
  });

  useEffect(
    () =>
      useExperience.subscribe((s, prev) => {
        if (s.transition || s.scene !== id) return;
        if (s.pendingProduct && !prev.pendingProduct) {
          handlePending();
          return;
        }
        if (s.mode === 'browse' && (prev.mode !== 'browse' || prev.zone !== s.zone || prev.resetToken !== s.resetToken)) {
          const fromInspect = prev.mode === 'inspect' && prev.zone === s.zone;
          void toZone(fromInspect ? 1.1 : prev.mode === 'overview' ? 2.0 : 1.7, fromInspect ? 0.2 : 1.2);
        } else if (s.mode === 'overview' && prev.mode !== 'overview') {
          void fly(OVERVIEW.pos, OVERVIEW.look, { duration: 2, arc: 2, fov: 50 });
        } else if (s.mode === 'fitting' && (prev.mode !== 'fitting' || prev.fittingTab !== s.fittingTab)) {
          const shot = FITTING[s.fittingTab];
          void fly(shot.pos, shot.look, { duration: prev.mode === 'fitting' ? 1.2 : 2, arc: 0.8, fov: s.fittingTab === 'fit' ? 40 : 46 });
        }
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return null;
}

/**
 * A complete shopping dimension, built from the registry: hall, zones,
 * displays, inspector, plus fitting pod and runway where enabled.
 */
export function DimensionWorld({ id, theme, fitting = false, runway = false }: { id: DimensionId; theme: HallTheme; fitting?: boolean; runway?: boolean }) {
  const dim = DIMENSION_BY_ID[id];
  return (
    <Hall dim={dim} theme={theme}>
      {dim.zones.map((z) => (
        <ZoneStage key={z.id} dim={dim} zone={z} />
      ))}
      {runway && <Runway accent={dim.accent} />}
      <CarouselPhysics />
      <Director id={id} />
      <ProductScene dim={dim} />
      <Suspense fallback={null}>
        {fitting && <FittingRoomScene />}
        {runway && <RunwayScene />}
      </Suspense>
    </Hall>
  );
}
