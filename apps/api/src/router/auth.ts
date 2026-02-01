import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../lib/trpc.js';
import { hashPassword, verifyPassword, generateToken } from '../lib/auth.js';
import { db, users } from '@tcg-tracker/db';
import { eq, and, isNull, or } from 'drizzle-orm';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const authRouter = router({
  /**
   * Sign up a new user
   */
  signup: publicProcedure
    .input(signupSchema)
    .mutation(async ({ input }) => {
      const { email, username, password } = input;

      // Check if user already exists (not soft-deleted)
      const existingUser = await db.query.users.findFirst({
        where: and(
          or(
            eq(users.email, email),
            eq(users.username, username)
          ),
          isNull(users.deletedAt)
        ),
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message:
            existingUser.email === email
              ? 'Email already registered'
              : 'Username already taken',
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          username,
          passwordHash,
        })
        .returning({
          id: users.id,
          email: users.email,
          username: users.username,
          createdAt: users.createdAt,
        });

      if (!newUser) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
        });
      }

      // Generate JWT token
      const token = generateToken({
        userId: newUser.id,
        email: newUser.email,
        username: newUser.username,
      });

      return {
        user: newUser,
        token,
      };
    }),

  /**
   * Log in an existing user
   */
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      const { emailOrUsername, password } = input;

      // Find user by email or username (not soft-deleted)
      const user = await db.query.users.findFirst({
        where: and(
          or(
            eq(users.email, emailOrUsername),
            eq(users.username, emailOrUsername)
          ),
          isNull(users.deletedAt)
        ),
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt,
        },
        token,
      };
    }),

  /**
   * Get current user from JWT token
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.id, ctx.user.userId),
        isNull(users.deletedAt)
      ),
      columns: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }),
});
