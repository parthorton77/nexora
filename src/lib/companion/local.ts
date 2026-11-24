import { FASHION, PRODUCTS, PRODUCT_BY_ID, productsForSlot } from '../../data/products';
import { AVATAR_BY_ID } from '../../data/avatars';
import type { Outfit, Product, Slot } from '../../types';
import { money } from '../platform';
import { recommendedSize } from '../tryon/fit';
import type { CompanionProvider, CompanionReply } from './types';

/* ---------- scoring ---------- */

function pairScore(a: Product, b: Product, tag?: string) {
  let s = 0;
  if (a.pairsWith.includes(b.id) || b.pairsWith.includes(a.id)) s += 4;
  s += a.tags.filter((t) => b.tags.includes(t)).length * 1.2;
  if (tag && b.tags.includes(tag)) s += 3;
  return s;
}

function outfitScore(items: Product[], tag?: string) {
  let s = 0;
  for (let i = 0; i < items.length; i++) {
    if (tag && items[i].tags.includes(tag)) s += 2.5;
    for (let j = i + 1; j < items.length; j++) s += pairScore(items[i], items[j]);
  }
  return s;
}

/** Best top + bottom + shoes (+ outer, + accessory) for a tag, optionally under a budget. */
function bestOutfit(opts: { tag?: string; budget?: number; must?: Product }): Outfit | null {
  const pool = (slot: Slot) => (opts.must?.slot === slot ? [opts.must] : productsForSlot(slot));
  let best: { items: Product[]; score: number } | null = null;
  const outers = [undefined, ...pool('outer')];
  const accs = [undefined, ...pool('accessory')];
  for (const top of pool('top'))
    for (const bottom of pool('bottom'))
      for (const shoes of pool('shoes'))
        for (const outer of outers)
          for (const acc of accs) {
            const items = [top, bottom, shoes, outer, acc].filter(Boolean) as Product[];
            if (opts.must && !items.includes(opts.must)) continue;
            const total = items.reduce((n, p) => n + p.price, 0);
            if (opts.budget && total > opts.budget) continue;
            // prefer fuller outfits, but not at any price
            const score = outfitScore(items, opts.tag) + items.length * 0.6 - (opts.budget ? 0 : total / 40000);
            if (!best || score > best.score) best = { items, score };
          }
  if (!best) return null;
  const outfit: Outfit = {};
  best.items.forEach((p) => (outfit[p.slot!] = p.id));
  return outfit;
}

const outfitItems = (o: Outfit) => Object.values(o).filter(Boolean).map((id) => PRODUCT_BY_ID[id!]);
const total = (o: Outfit) => outfitItems(o).reduce((n, p) => n + p.price, 0);
const names = (items: Product[]) => (items.length <= 1 ? items.map((p) => p.name).join('') : `${items.slice(0, -1).map((p) => p.name).join(', ')} and ${items[items.length - 1].name}`);

/* ---------- language ---------- */

const CATEGORY_WORDS: { re: RegExp; test: (p: Product) => boolean; label: string }[] = [
  { re: /jacket|bomber|shell|outerwear|coat/i, test: (p) => p.category === 'jackets' || (p.slot === 'outer' && p.category !== 'shirts'), label: 'jackets' },
  { re: /hoodie|sweat/i, test: (p) => p.category === 'hoodies', label: 'hoodies' },
  { re: /t-?shirt|tee\b|tees/i, test: (p) => p.category === 'tees', label: 'tees' },
  { re: /shirt|overshirt/i, test: (p) => p.category === 'shirts', label: 'shirts' },
  { re: /jeans|denim/i, test: (p) => p.category === 'denim', label: 'denim' },
  { re: /trouser|pants|cargo|chino/i, test: (p) => p.category === 'trousers', label: 'trousers' },
  { re: /sneaker|shoe|trainer|footwear/i, test: (p) => p.category === 'sneakers', label: 'sneakers' },
  { re: /\bbag|sling|tote/i, test: (p) => p.category === 'bags', label: 'bags' },
  { re: /cap|hat|shades|sunglass|glasses|accessor/i, test: (p) => p.category === 'accessories' || p.category === 'bags', label: 'accessories' },
  { re: /headphone|earbud|audio|speaker|music|sound/i, test: (p) => p.category === 'audio', label: 'audio' },
  { re: /watch|wearable|fitness band/i, test: (p) => p.category === 'wearables', label: 'wearables' },
  { re: /phone|device|gadget|tech/i, test: (p) => p.dimension === 'tech', label: 'tech' },
];

const OCCASIONS: { re: RegExp; tag: string; line: string }[] = [
  { re: /weekend|trip|travel|vacation|holiday|flight|airport|getaway/i, tag: 'travel', line: 'For a weekend away: layers that pack small, deep pockets and soles that handle anything.' },
  { re: /minimal|clean|simple|quiet|understated/i, tag: 'minimal', line: 'Minimal means tonal colours, clean lines and one texture that leads.' },
  { re: /office|work|meeting|smart/i, tag: 'office', line: 'For the studio or office: sharp trousers and a heavyweight top look intentional without a tie.' },
  { re: /evening|night|date|dinner|party/i, tag: 'evening', line: 'For the evening, let one piece catch the light and keep the rest dark and calm.' },
  { re: /rain|monsoon|wet|storm/i, tag: 'rain', line: 'For monsoon days: seal the outer layer and keep everything below quick-drying.' },
  { re: /gym|sport|run|training|active/i, tag: 'sport', line: 'For active days: breathable layers and a responsive runner.' },
  { re: /street|urban|skate/i, tag: 'streetwear', line: 'Streetwear here is about volume and weight: wide tees, heavy cottons, technical soles.' },
  { re: /luxury|luxe|premium|elevated|investment/i, tag: 'luxury', line: 'Luxury in NEXORA is about material: satin, merino, vegetable-tanned leather.' },
];

function parseBudget(msg: string): number | null {
  const m = msg.match(/(?:under|below|less than|within|max(?:imum)?|budget(?: of)?|upto|up to)\s*(?:rs\.?|inr|₹)?\s*([\d,.]+)\s*(k|thousand|lakh)?/i) ?? msg.match(/(?:rs\.?|inr|₹)\s*([\d,.]+)\s*(k|thousand|lakh)?/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] ?? '').toLowerCase();
  if (unit === 'k' || unit === 'thousand') n *= 1000;
  if (unit === 'lakh') n *= 100000;
  return n;
}

function mentioned(msg: string): Product | undefined {
  const lower = msg.toLowerCase();
  return PRODUCTS.find((p) => lower.includes(p.name.toLowerCase()) || lower.includes(p.name.split(' ')[0].toLowerCase()));
}

const think = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 550 + Math.random() * 500));

/* ---------- provider ---------- */

export const localCompanion: CompanionProvider = {
  name: 'NEXORA Companion (local, rule-based)',
  simulated: true,
  async reply(message, ctx): Promise<CompanionReply> {
    const msg = message.trim();
    const base = PRODUCT_BY_ID[ctx.productId ?? ''] ?? mentioned(msg) ?? PRODUCT_BY_ID[ctx.focusedId ?? ''];
    const avatar = AVATAR_BY_ID[ctx.avatarId];

    // 1. budget outfits
    const budget = parseBudget(msg);
    if (budget && /outfit|look|fit|wear|dress|build|put together|under|below/i.test(msg)) {
      const occ = OCCASIONS.find((o) => o.re.test(msg));
      const outfit = bestOutfit({ budget, tag: occ?.tag });
      if (!outfit) {
        const cheapest = [...FASHION].sort((a, b) => a.price - b.price).slice(0, 3);
        return think({ text: `I can't build a full outfit under ${money(budget)} from the current collection. The most accessible pieces are the ${names(cheapest)}.`, picks: cheapest.map((p) => p.id), followUps: ['Build an outfit under ₹15,000'] });
      }
      const items = outfitItems(outfit);
      return think({
        text: `Here's a complete look for ${money(total(outfit))}, inside your ${money(budget)} budget: the ${names(items)}. Tap "Try this outfit" to see it on your avatar.`,
        picks: items.map((p) => p.id),
        outfit,
        followUps: ['Make it more minimal', 'Suggest something for a weekend trip'],
      });
    }

    // 2. size help
    if (/what size|which size|size should|my size|fit me/i.test(msg) && base?.sizeChart) {
      const rec = recommendedSize(base, avatar);
      return think({
        text: `On ${avatar.name} (${avatar.heightCm} cm, ${avatar.build.toLowerCase()} build) I'd pick ${rec} in the ${base.name}. ${base.fit} This is a size-chart estimate on a preset avatar, not a body measurement.`,
        picks: [base.id],
        followUps: ['What goes with this?'],
      });
    }

    // 3. "a jacket that matches these sneakers"
    const cat = CATEGORY_WORDS.find((c) => c.re.test(msg));
    if (base && cat && /match|go with|goes with|pair|with these|with this|to wear with|complement/i.test(msg) && !cat.test(base)) {
      const candidates = PRODUCTS.filter((p) => cat.test(p) && p.id !== base.id).sort((a, b) => pairScore(base, b) - pairScore(base, a));
      const picks = candidates.slice(0, 2);
      if (picks.length) {
        const lead = picks[0];
        const outfit = base.slot && lead.slot ? bestOutfit({ must: base }) ?? undefined : undefined;
        if (outfit && lead.slot) outfit[lead.slot] = lead.id;
        return think({
          text: `For the ${base.name}, I'd go with the ${lead.name}: ${lead.tagline.toLowerCase()} ${picks[1] ? `The ${picks[1].name} is the alternative if you want something ${picks[1].tags.includes('luxury') ? 'dressier' : 'more relaxed'}.` : ''}`.trim(),
          picks: picks.map((p) => p.id),
          outfit,
          followUps: ['Build an outfit under ₹10,000', 'Show me something unusual'],
        });
      }
    }

    // 4. unusual
    if (/unusual|different|weird|surprise|bold|statement|crazy|unexpected/i.test(msg)) {
      const picks = PRODUCTS.filter((p) => p.tags.includes('unusual')).sort(() => Math.random() - 0.5).slice(0, 3);
      return think({
        text: `Something unusual: the ${names(picks)}. ${PRODUCT_BY_ID[picks[0].id].tagline} Tap one to fly to it.`,
        picks: picks.map((p) => p.id),
        followUps: ['Something minimal instead', 'Build an outfit under ₹10,000'],
      });
    }

    // 5. occasions & moods → full outfit
    const occ = OCCASIONS.find((o) => o.re.test(msg));
    if (occ) {
      const outfit = bestOutfit({ tag: occ.tag, must: base?.slot && base.tags.includes(occ.tag) ? base : undefined });
      if (outfit) {
        const items = outfitItems(outfit);
        return think({
          text: `${occ.line} Try the ${names(items)}, ${money(total(outfit))} in total.`,
          picks: items.map((p) => p.id),
          outfit,
          followUps: ['Build it under ₹10,000', 'Find a jacket that matches these sneakers'],
        });
      }
    }

    // 6. category browse
    if (cat) {
      const picks = PRODUCTS.filter(cat.test).slice(0, 4);
      return think({
        text: `In ${cat.label} we have the ${names(picks)}. Tap one and I'll take you there.`,
        picks: picks.map((p) => p.id),
        followUps: ['Which is the most unusual?', 'Build an outfit under ₹10,000'],
      });
    }

    // 7. pairing around the current product
    if (base && /what goes|go with|pair|match|style|complete|outfit/i.test(msg)) {
      const outfit = base.slot ? bestOutfit({ must: base }) : null;
      if (outfit) {
        const items = outfitItems(outfit).filter((p) => p.id !== base.id);
        return think({ text: `Around the ${base.name}: ${names(items)}. Together that's ${money(total(outfit))}.`, picks: items.map((p) => p.id), outfit, followUps: ['What size should I get?'] });
      }
      const picks = PRODUCTS.filter((p) => base.pairsWith.includes(p.id));
      return think({ text: `The ${base.name} pairs well with the ${names(picks)}.`, picks: picks.map((p) => p.id), followUps: ['Show me something unusual'] });
    }

    return think({
      text: `I know every piece in NEXORA. Ask me for an occasion ("a weekend trip"), a mood ("minimal"), a budget ("an outfit under ₹10,000") or a match ("a jacket for these sneakers").${base ? ` Right now we're looking at the ${base.name}.` : ''}`,
      picks: [],
      followUps: ['Suggest something for a weekend trip', 'Create a minimalist outfit', 'Show me something unusual', 'Build an outfit under ₹10,000'],
    });
  },
};
