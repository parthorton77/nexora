import { PRODUCTS } from '../../data/products';
import type { CompanionProvider, CompanionReply } from './types';

/**
 * How a real AI model plugs in (not active in the prototype).
 *
 * Point it at YOUR OWN backend endpoint, which holds the API key and calls the
 * model with the catalogue as context, returning a CompanionReply as JSON.
 * Never call a model API with a secret key directly from the browser.
 *
 *   import { createRemoteCompanion } from './remote';
 *   export const companion = createRemoteCompanion('/api/companion');
 */
export function createRemoteCompanion(endpoint: string): CompanionProvider {
  const catalogue = PRODUCTS.map((p) => ({ id: p.id, name: p.name, price: p.price, category: p.category, slot: p.slot, tags: p.tags, colors: p.colors.map((c) => c.name) }));
  return {
    name: 'NEXORA Companion (remote)',
    simulated: false,
    async reply(message, ctx): Promise<CompanionReply> {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context: ctx, catalogue }),
      });
      if (!res.ok) throw new Error(`Companion endpoint returned ${res.status}`);
      const data = (await res.json()) as CompanionReply;
      // only allow ids that exist in the catalogue
      const known = new Set(PRODUCTS.map((p) => p.id));
      return { ...data, picks: (data.picks ?? []).filter((id) => known.has(id)) };
    },
  };
}
