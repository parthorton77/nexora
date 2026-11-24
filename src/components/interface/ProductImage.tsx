import type { ReactNode } from 'react';
import type { Product } from '../../types';

/**
 * Product image: a generated vector silhouette in the chosen colour. It is
 * deliberately an icon, not a fake photo or a fake 3D render. Used in the bag,
 * wishlist, companion and the no-WebGL catalogue.
 */
export function ProductImage({ product, color, size = 56, className = '' }: { product: Product; color?: string; size?: number; className?: string }) {
  const c = color ?? product.colors[0].hex;
  const stroke = 'rgba(255,255,255,0.28)';
  const spec = product.model.spec;
  let art: ReactNode;
  switch (spec.kind) {
    case 'top': {
      const long = spec.top.sleeve > 0.6;
      const hood = spec.top.collar === 'hood';
      const crop = spec.top.length < 0.6;
      const h = crop ? 64 : 76;
      art = (
        <>
          {hood && <path d="M38 14 Q50 2 62 14 L58 20 Q50 14 42 20 Z" fill={c} stroke={stroke} />}
          <path
            d={
              long
                ? `M36 16 Q50 22 64 16 L84 26 L90 ${h - 4} L80 ${h - 2} L74 34 L72 ${h + 10} L28 ${h + 10} L26 34 L20 ${h - 2} L10 ${h - 4} L16 26 Z`
                : `M36 16 Q50 24 64 16 L86 28 L80 46 L72 42 L72 ${h + 10} L28 ${h + 10} L28 42 L20 46 L14 28 Z`
            }
            fill={c}
            stroke={stroke}
            strokeLinejoin="round"
          />
          {spec.top.closure && <line x1="50" y1="21" x2="50" y2={h + 10} stroke="rgba(0,0,0,0.35)" strokeWidth="1.2" />}
        </>
      );
      break;
    }
    case 'bottom':
      art = (
        <path
          d={spec.bottom.leg === 'wide' ? 'M30 10 H70 L80 92 H54 L50 40 L46 92 H20 Z' : 'M32 10 H68 L72 92 H53 L50 38 L47 92 H28 Z'}
          fill={c}
          stroke={stroke}
          strokeLinejoin="round"
        />
      );
      break;
    case 'sneaker':
      art = (
        <>
          <path d="M12 62 Q14 44 30 40 L44 36 Q50 30 58 38 Q72 50 88 56 Q92 60 90 64 Z" fill={c} stroke={stroke} />
          <path d="M10 64 H92 Q92 72 84 72 H16 Q10 72 10 64 Z" fill={product.colors[0].sole ?? '#ece7dd'} />
        </>
      );
      break;
    case 'cap':
      art = (
        <>
          <path d="M22 60 Q22 28 50 26 Q78 28 78 60 Z" fill={c} stroke={stroke} />
          <path d="M60 58 Q86 56 94 64 Q80 68 58 64 Z" fill={c} stroke={stroke} />
        </>
      );
      break;
    case 'bag':
      art = (
        <>
          <path d="M20 46 Q50 6 80 46" fill="none" stroke={c} strokeWidth="4" opacity="0.8" />
          <rect x="18" y="44" width="64" height="34" rx="17" fill={c} stroke={stroke} />
          <line x1="26" y1="52" x2="74" y2="52" stroke="rgba(0,0,0,0.3)" />
        </>
      );
      break;
    case 'shades':
      art = (
        <>
          <path d="M8 42 Q50 30 92 42 L88 56 Q70 66 54 56 Q50 52 46 56 Q30 66 12 56 Z" fill={c} stroke={stroke} />
          <path d="M8 42 Q50 32 92 42" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
        </>
      );
      break;
    case 'headphones':
      art = (
        <>
          <path d="M24 56 Q24 18 50 18 Q76 18 76 56" fill="none" stroke={c} strokeWidth="6" />
          <rect x="14" y="50" width="20" height="30" rx="9" fill={c} stroke={stroke} />
          <rect x="66" y="50" width="20" height="30" rx="9" fill={c} stroke={stroke} />
        </>
      );
      break;
    case 'watch':
      art = (
        <>
          <rect x="40" y="8" width="20" height="84" rx="6" fill={product.colors[0].trim ?? c} opacity="0.85" />
          <rect x="32" y="32" width="36" height="40" rx="10" fill={c} stroke={stroke} />
          <rect x="36" y="36" width="28" height="32" rx="7" fill="#0b0d12" />
          <path d="M44 52 A6 6 0 1 1 56 52" fill="none" stroke="#c6f432" strokeWidth="2" />
        </>
      );
      break;
    case 'phone':
      art = (
        <>
          <rect x="30" y="8" width="40" height="84" rx="8" fill={c} stroke={stroke} />
          <rect x="35" y="14" width="16" height="18" rx="5" fill="rgba(0,0,0,0.45)" />
        </>
      );
      break;
    case 'earbuds':
      art = (
        <>
          <ellipse cx="50" cy="56" rx="30" ry="22" fill={c} stroke={stroke} />
          <line x1="22" y1="54" x2="78" y2="54" stroke="rgba(0,0,0,0.35)" />
        </>
      );
      break;
    case 'speaker':
      art = (
        <>
          <circle cx="50" cy="48" r="32" fill={c} stroke={stroke} />
          <ellipse cx="50" cy="56" rx="32" ry="4" fill="none" stroke={product.colors[0].trim ?? '#c6f432'} strokeWidth="2" />
          <rect x="34" y="80" width="32" height="8" rx="3" fill="#111" />
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={`${product.name} silhouette`}>
      {art}
    </svg>
  );
}
