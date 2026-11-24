import { useExperience } from '../../store/experienceStore';
import { motion } from '../../store/motion';
import type { Quality } from '../../types';
import { SidePanel } from '../shopping/SidePanel';

const TIERS: { id: Quality; name: string; note: string }[] = [
  { id: 'high', name: 'Cinematic', note: 'Mirror floors, bloom, rich fabrics. Discrete GPUs.' },
  { id: 'balanced', name: 'Balanced', note: 'Glossy floors, no post-processing. Laptops.' },
  { id: 'lite', name: 'Lite', note: 'Fewer particles, lower-poly models. Phones.' },
];

function Toggle({ label, note, on, onChange }: { label: string; note?: string; on: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onChange} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/8 px-4 py-3 text-left hover:border-white/20">
      <span>
        <span className="block text-[13.5px]">{label}</span>
        {note && <span className="mt-0.5 block text-[11.5px] text-white/45">{note}</span>}
      </span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition ${on ? 'bg-lime' : 'bg-white/15'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-black transition-all ${on ? 'left-5' : 'left-1'}`} />
      </span>
    </button>
  );
}

const KEYS: [string, string][] = [
  ['Universe', 'Drag or WASD / arrows to look and move · scroll to travel · Enter to open the portal you face · R to reset'],
  ['Zones', '← → or drag to browse · 1–5 jump to a zone · Q / E previous / next · Enter pulls a piece out'],
  ['Product', 'Drag to rotate · scroll or + / − to zoom · 0 to reset · H hotspots · T try on'],
  ['Anywhere', 'Esc goes back one step'],
];

export function SettingsPanel() {
  const quality = useExperience((s) => s.quality);
  const reduced = useExperience((s) => s.reducedMotion);
  const soundOn = useExperience((s) => s.soundOn);
  const hotspots = useExperience((s) => s.showHotspots);
  const st = useExperience.getState;
  return (
    <SidePanel title="Experience controls" kicker="Settings">
      <h3 className="micro text-white/45">Render quality</h3>
      <div className="mt-2 grid gap-1.5" role="radiogroup" aria-label="Render quality">
        {TIERS.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={quality === t.id} onClick={() => st().setQuality(t.id, true)} className={`rounded-2xl border px-4 py-3 text-left transition ${quality === t.id ? 'border-lime/60 bg-lime/10' : 'border-white/8 hover:border-white/20'}`}>
            <span className="block text-[13.5px]">{t.name}</span>
            <span className="block text-[11.5px] text-white/45">{t.note}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] text-white/40">Picked automatically for your device; NEXORA steps down by itself if motion stutters, unless you choose here.</p>

      <h3 className="mt-6 micro text-white/45">Comfort</h3>
      <div className="mt-2 space-y-1.5">
        <Toggle label="Reduced motion" note="Camera flights become cuts; floating and drifting stop." on={reduced} onChange={() => st().setReducedMotion(!reduced)} />
        <Toggle label="Ambient sound" note="Generated in the browser. Off by default." on={soundOn} onChange={() => st().toggleSound()} />
        <Toggle label="Detail hotspots" note="Markers on products while inspecting." on={hotspots} onChange={() => st().toggleHotspots()} />
      </div>
      <button
        type="button"
        className="btn-ghost mt-3 w-full"
        onClick={() => {
          const s = st();
          if (s.scene === 'universe') {
            motion.universe.target = 0;
            motion.universe.yawTarget = 0;
            motion.universe.pitchTarget = 0;
          } else useExperience.setState({ resetToken: s.resetToken + 1, mode: s.mode === 'browse' || s.mode === 'overview' ? 'browse' : s.mode });
          if (s.mode === 'inspect') {
            motion.inspect.rotYTarget = 0;
            motion.inspect.zoomTarget = 1;
          }
          s.setPanel(null);
        }}
      >
        Reset camera
      </button>

      <h3 className="mt-6 micro text-white/45">Controls</h3>
      <dl className="mt-2 space-y-2.5 text-[12.5px]">
        {KEYS.map(([k, v]) => (
          <div key={k}>
            <dt className="text-white/80">{k}</dt>
            <dd className="text-white/50">{v}</dd>
          </div>
        ))}
      </dl>
    </SidePanel>
  );
}

export function ProfilePanel() {
  return (
    <SidePanel title="Guest explorer" kicker="Profile">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-gradient-to-br from-white/10 to-transparent font-display text-[18px]">G</div>
        <div>
          <div className="text-[14px]">Exploring as a guest</div>
          <div className="text-[12px] text-white/50">Your bag, wishlist and outfits are kept on this device.</div>
        </div>
      </div>
      <p className="mt-6 rounded-2xl border border-white/8 p-4 text-[12.5px] leading-relaxed text-white/55">
        Accounts, order history and synced wishlists arrive with the production backend. This prototype never asks you to sign in.
      </p>
    </SidePanel>
  );
}
