import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion as m } from 'framer-motion';
import { ArrowUp, Shirt, Sparkles, X } from 'lucide-react';
import { PRODUCT_BY_ID, productsInZone } from '../../data/products';
import type { Outfit } from '../../types';
import { companion, type CompanionReply } from '../../lib/companion';
import { money } from '../../lib/platform';
import { useExperience } from '../../store/experienceStore';
import { useShop } from '../../store/shoppingStore';
import { ProductImage } from './ProductImage';

interface Msg {
  id: number;
  from: 'you' | 'nx';
  text: string;
  reply?: CompanionReply;
}

const STARTERS = ['Suggest something for a weekend trip', 'Find a jacket that matches these sneakers', 'Create a minimalist outfit', 'Show me something unusual', 'Build an outfit under ₹10,000'];

let nextId = 1;

/** The floating AI fashion companion (local and rule-based in this prototype). */
export function Companion() {
  const open = useExperience((s) => s.companionOpen);
  const entered = useExperience((s) => s.entered);
  const transition = useExperience((s) => s.transition);
  const sheet = useExperience((s) => s.mode === 'inspect' || s.mode === 'fitting' || s.mode === 'runway');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);
  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 250);
  }, [open]);

  const send = async (raw: string) => {
    const q = raw.trim();
    if (!q || busy) return;
    setText('');
    setMsgs((m) => [...m, { id: nextId++, from: 'you', text: q }]);
    setBusy(true);
    const xp = useExperience.getState();
    const shop = useShop.getState();
    const focused = xp.scene !== 'universe' ? productsInZone(xp.zone)[xp.focusIndex[xp.zone] ?? 0]?.id ?? null : null;
    try {
      const reply = await companion.reply(q, { productId: xp.mode === 'inspect' ? xp.selectedId : null, focusedId: focused, dimension: xp.scene, avatarId: shop.avatarId, outfit: shop.outfit });
      setMsgs((m) => [...m, { id: nextId++, from: 'nx', text: reply.text, reply }]);
    } catch {
      setMsgs((m) => [...m, { id: nextId++, from: 'nx', text: 'The companion could not answer just now. Try again in a moment.' }]);
    } finally {
      setBusy(false);
    }
  };

  const tryOutfit = (o: Outfit) => {
    useShop.getState().wearOutfit(o);
    const xp = useExperience.getState();
    xp.toggleCompanion(false);
    if (xp.scene === 'fashion') xp.openFitting('fit');
    else {
      const first = Object.values(o).find(Boolean);
      if (first) {
        xp.goToProduct(first);
        xp.toast('Outfit loaded. Open the fitting pod to see it on your avatar.', 'info');
      }
    }
  };

  if (!entered) return null;
  return (
    <>
      <AnimatePresence>
        {!open && !transition && (
          <m.button
            type="button"
            className={`glass pointer-events-auto fixed right-3 top-[72px] z-40 h-12 items-center gap-2 rounded-full p-2 sm:bottom-6 sm:right-5 sm:top-auto sm:flex sm:pr-4 ${sheet ? 'hidden' : 'flex'}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => useExperience.getState().toggleCompanion(true)}
            aria-label="Open the NEXORA fashion companion"
          >
            <span className="relative grid h-8 w-8 place-items-center rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, #f4fbe0, #c6f432 45%, #3d5410 100%)', boxShadow: '0 0 18px rgba(198,244,50,0.55)' }}>
              <Sparkles size={14} className="text-black/70" />
            </span>
            <span className="hidden text-[13px] sm:inline">Companion</span>
          </m.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <m.section
            className="glass-strong pointer-events-auto fixed inset-x-2 bottom-2 z-[58] flex max-h-[72vh] flex-col rounded-3xl sm:inset-x-auto sm:bottom-6 sm:right-5 sm:w-[390px]"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.2 } }}
            aria-label="Fashion companion"
            role="dialog"
          >
            <header className="flex items-center justify-between border-b hairline px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-[14px]">
                  <span className="h-2 w-2 rounded-full bg-lime shadow-[0_0_10px_#c6f432]" /> NEXORA Companion
                </div>
                <div className="mt-0.5 text-[11px] text-white/45">Local rule-based assistant · knows the full catalogue</div>
              </div>
              <button type="button" className="icon-btn" onClick={() => useExperience.getState().toggleCompanion(false)} aria-label="Close companion">
                <X size={17} strokeWidth={1.5} />
              </button>
            </header>
            <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-5 py-4 scrollbar-thin" aria-live="polite">
              {msgs.length === 0 && (
                <div>
                  <p className="text-[13px] text-white/70">Tell me where you're going or what you like. I'll pull pieces from any dimension.</p>
                  <div className="mt-3 flex flex-col items-start gap-1.5">
                    {STARTERS.map((s) => (
                      <button key={s} type="button" className="chip !h-auto py-2 text-left !text-[12.5px]" onClick={() => void send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((msg) => (
                <div key={msg.id} className={msg.from === 'you' ? 'flex justify-end' : ''}>
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${msg.from === 'you' ? 'bg-white text-black' : 'border border-white/10 bg-white/[0.03] text-white/85'}`}>{msg.text}</div>
                  {msg.reply && msg.reply.picks.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {msg.reply.picks.map((id) => {
                        const p = PRODUCT_BY_ID[id];
                        return (
                          <button key={id} type="button" onClick={() => useExperience.getState().goToProduct(id)} className="w-[112px] shrink-0 rounded-2xl border border-white/10 p-2 text-left hover:border-lime/50" aria-label={`Go to ${p.name}`}>
                            <span className="grid h-16 place-items-center rounded-xl bg-white/[0.03]">
                              <ProductImage product={p} size={50} />
                            </span>
                            <span className="mt-1.5 block truncate text-[11.5px]">{p.name}</span>
                            <span className="block text-[11px] text-white/50">{money(p.price)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {msg.reply?.outfit && (
                    <button type="button" className="chip mt-2" onClick={() => tryOutfit(msg.reply!.outfit!)}>
                      <Shirt size={13} /> Try this outfit
                    </button>
                  )}
                  {msg.reply && msg.reply.followUps.length > 0 && msg.id === msgs[msgs.length - 1].id && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.reply.followUps.map((f) => (
                        <button key={f} type="button" className="chip !h-7 !text-[11.5px]" onClick={() => void send(f)}>
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {busy && <div className="w-16 rounded-2xl border border-white/10 px-3 py-2 text-[13px] tracking-[0.3em] text-white/50">···</div>}
            </div>
            <form
              className="flex items-center gap-2 border-t hairline p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(text);
              }}
            >
              <label htmlFor="nx-companion" className="sr-only">
                Ask the companion
              </label>
              <input
                id="nx-companion"
                ref={input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask for an occasion, a mood or a budget"
                className="h-11 flex-1 rounded-full border border-white/12 bg-transparent px-4 text-[13px] outline-none placeholder:text-white/35 focus:border-lime/60"
                autoComplete="off"
              />
              <button type="submit" className="grid h-11 w-11 place-items-center rounded-full bg-white text-black disabled:opacity-40" disabled={!text.trim() || busy} aria-label="Send">
                <ArrowUp size={17} />
              </button>
            </form>
          </m.section>
        )}
      </AnimatePresence>
    </>
  );
}
