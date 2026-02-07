import { router } from '../lib/trpc.js';
import { authRouter } from './auth.js';
import { collectionsRouter } from './collections.js';
import { cardsRouter } from './cards.js';
import { completeRouter } from './complete.js';
import { decksRouter } from './decks.js';
import { passwordResetRouter } from './password-reset.js';
import { recommendationsRouter } from './recommendations.js';

/**
 * Root tRPC router
 */
export const appRouter = router({
  auth: authRouter,
  collections: collectionsRouter,
  cards: cardsRouter,
  complete: completeRouter,
  decks: decksRouter,
  passwordReset: passwordResetRouter,
  recommendations: recommendationsRouter,
});

export type AppRouter = typeof appRouter;
