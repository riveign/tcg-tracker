import { router } from '../lib/trpc.js';
import { authRouter } from './auth.js';
import { collectionsRouter } from './collections.js';

/**
 * Root tRPC router
 */
export const appRouter = router({
  auth: authRouter,
  collections: collectionsRouter,
});

export type AppRouter = typeof appRouter;
