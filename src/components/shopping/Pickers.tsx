import { motion as m } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { Product } from '../../types';
import { useExperience } from '../../store/experienceStore';
import { useShop, useVariant } from '../../store/shoppingStore';

export function ColorPicker({ product }: { product: Product }) {
  const v = useVariant(product)!;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="micro text-white/45">Colour</span>
        <span className="text-[12.5px] text-white/80">{v.color.name}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
        {product.colors.map((c) => {
          const on = c.id === v.color.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={c.name}
              title={c.name}
              onClick={() => useShop.getState().setColor(product.id, c.id)}
              className={`relative h-8 w-8 rounded-full border transition ${on ? 'border-lime' : 'border-white/15 hover:border-white/40'}`}
              style={{ background: `linear-gradient(135deg, ${c.hex} 55%, ${c.trim ?? c.hex} 55%)` }}
            >
              {on && <span className="absolute -inset-1 rounded-full border border-lime/40" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SizePicker({ product }: { product: Product }) {
  const v = useVariant(product)!;
  const nudge = useExperience((s) => s.sizeNudge);
  const [shake, setShake] = useState(0);
  useEffect(() => {
    if (nudge) setShake((k) => k + 1);
  }, [nudge]);
  const one = product.sizes.length === 1;
  return (
    <m.div key={shake} animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : {}} transition={{ duration: 0.4 }}>
      <div className="flex items-baseline justify-between">
        <span className="micro text-white/45">{product.sizeLabel ?? 'Size'}</span>
        {!one && !v.size && <span className="text-[11.5px] text-signal/90">Select one</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={product.sizeLabel ?? 'Size'}>
        {product.sizes.map((s) => {
          const on = one || v.size === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={one}
              onClick={() => useShop.getState().setSize(product.id, s)}
              className={`h-9 min-w-[44px] rounded-full border px-3 text-[12.5px] transition ${on ? 'border-lime bg-lime/15 text-[#eaffb0]' : 'border-white/12 text-white/75 hover:border-white/35'}`}
            >
              {s}
            </button>
          );
        })}
      </div>
    </m.div>
  );
}

export function Availability({ product }: { product: Product }) {
  const tone = product.availability === 'in-stock' ? 'bg-lime' : product.availability === 'low-stock' ? 'bg-signal' : 'bg-ice';
  const label = product.availability === 'in-stock' ? 'In stock' : product.availability === 'low-stock' ? 'Low stock' : 'Pre-order';
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-white/70">
      <span className={`h-1.5 w-1.5 rounded-full ${tone}`} />
      {label}
      {product.stockNote && <span className="text-white/45">· {product.stockNote}</span>}
    </span>
  );
}
