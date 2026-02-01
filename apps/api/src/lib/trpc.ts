import { initTRPC, TRPCError } from '@trpc/server';
import { extractBearerToken, verifyToken, type JWTPayload } from './auth.js';

/**
 * Create context for tRPC requests
 */
export async function createContext(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = extractBearerToken(authHeader || undefined);

  let user: JWTPayload | null = null;

  if (token) {
    try {
      user = verifyToken(token);
    } catch (error) {
      // Token is invalid, but we don't throw here
      // Let protected procedures handle it
      user = null;
    }
  }

  return {
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause && typeof error.cause === 'object' && 'issues' in error.cause
            ? error.cause.issues
            : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be signed in to access this resource',
    });
  }

  return next({
    ctx: {
      user: ctx.user,
    },
  });
});
