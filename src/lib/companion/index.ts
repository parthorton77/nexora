import { localCompanion } from './local';
import type { CompanionProvider } from './types';

export type { CompanionContext, CompanionProvider, CompanionReply } from './types';

/** The active companion. Swap for createRemoteCompanion('/api/companion') when a backend exists. */
export const companion: CompanionProvider = localCompanion;
