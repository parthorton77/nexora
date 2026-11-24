import { useRef, type MutableRefObject } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BadgeCheck, CircleDot, Layers, Package, Ruler, Scissors, Shirt } from 'lucide-react';
import type { Hotspot, HotspotKind } from '../../types';
import type { Anchor } from '../../lib/garments';
import { useExperience } from '../../store/experienceStore';
import { KIND_LABEL } from '../../data/labels';

const ICON: Record<HotspotKind, typeof Layers> = {
  fabric: Layers,
  stitching: Scissors,
  pocket: Package,
  button: CircleDot,
  zipper: Ruler,
  logo: BadgeCheck,
  material: Shirt,
};

export { KIND_LABEL };

/**
 * Floating detail markers attached to model anchors. They hide when the
 * surface they sit on faces away from the camera.
 */
export function Hotspots({ hotspots, anchors, ready }: { hotspots: Hotspot[]; anchors: Record<string, Anchor>; ready: MutableRefObject<number> }) {
  const show = useExperience((s) => s.showHotspots);
  if (!show) return null;
  return (
    <>
      {hotspots.map((h) => {
        const a = anchors[h.anchor];
        if (!a) return null;
        return <HotspotMarker key={h.id} hotspot={h} anchor={a} ready={ready} />;
      })}
    </>
  );
}

const wp = new THREE.Vector3();
const wq = new THREE.Quaternion();
const wn = new THREE.Vector3();
const toCam = new THREE.Vector3();

function HotspotMarker({ hotspot, anchor, ready }: { hotspot: Hotspot; anchor: Anchor; ready: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const el = useRef<HTMLDivElement>(null);
  const active = useExperience((s) => s.activeHotspot === hotspot.id);
  const Icon = ICON[hotspot.kind];

  useFrame(({ camera }) => {
    if (!group.current || !el.current) return;
    group.current.getWorldPosition(wp);
    group.current.getWorldQuaternion(wq);
    wn.copy(anchor.n).applyQuaternion(wq).normalize();
    toCam.copy(camera.position).sub(wp).normalize();
    const facing = wn.dot(toCam);
    const vis = ready.current > 0.97 && (facing > 0.1 || active) ? 1 : 0;
    const node = el.current;
    if (Number(node.dataset.vis ?? -1) !== vis) {
      node.dataset.vis = String(vis);
      node.style.opacity = String(vis);
      node.style.pointerEvents = vis ? 'auto' : 'none';
      node.style.transform = `scale(${vis ? 1 : 0.6})`;
    }
  });

  return (
    <group ref={group} position={anchor.p}>
      <Html zIndexRange={active ? [60, 50] : [30, 10]} style={{ pointerEvents: 'none' }}>
        <div ref={el} style={{ opacity: 0, transition: 'opacity .35s ease, transform .35s ease' }}>
          <button
            type="button"
            className={`hotspot-dot ${active ? 'is-active' : ''}`}
            aria-label={`${KIND_LABEL[hotspot.kind]}: ${hotspot.title}`}
            aria-expanded={active}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              useExperience.getState().setHotspot(hotspot.id);
            }}
          >
            <span className="hotspot-ring" />
            <span className="hotspot-core" />
          </button>
          {active && (
            <div className="hotspot-card glass-strong" role="dialog" aria-label={hotspot.title}>
              <div className="flex items-center gap-2 micro text-lime/90">
                <Icon size={12} strokeWidth={1.5} />
                {KIND_LABEL[hotspot.kind]}
              </div>
              <div className="mt-1.5 text-[15px] leading-snug text-ink">{hotspot.title}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-white/65">{hotspot.body}</p>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
