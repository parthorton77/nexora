import type { Outfit } from '../../types';

export interface CompanionContext {
  /** product being inspected, if any */
  productId: string | null;
  /** product centred in the current zone, if any */
  focusedId: string | null;
  dimension: string;
  avatarId: string;
  outfit: Outfit;
}

export interface CompanionReply {
  text: string;
  /** product ids to show as tappable cards */
  picks: string[];
  /** a complete outfit the visitor can try on in one tap */
  outfit?: Outfit;
  followUps: string[];
}

/**
 * Anything that can answer the companion. The prototype ships a local,
 * rule-based provider; a real model plugs in by implementing this interface
 * (see remote.ts) without touching the UI.
 */
export interface CompanionProvider {
  readonly name: string;
  readonly simulated: boolean;
  reply(message: string, ctx: CompanionContext): Promise<CompanionReply>;
}
