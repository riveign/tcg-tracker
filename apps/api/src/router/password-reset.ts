import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../lib/trpc.js';
import { hashPassword } from '../lib/auth.js';
import { sendPasswordResetEmail } from '../lib/email.js';
import { passwordResetLimiter } from '../lib/rate-limit.js';
import { db, users, passwordResetTokens } from '@tcg-tracker/db';
import { eq, and, isNull, lt } from 'drizzle-orm';

const requestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const verifyTokenSchema = z.object({
  token: z.string().uuid('Invalid token format'),
});

const resetPasswordSchema = z.object({
  token: z.string().uuid('Invalid token format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const passwordResetRouter = router({
  /**
   * Request a password reset email
   * Always returns success to prevent user enumeration
   */
  requestReset: publicProcedure
    .input(requestResetSchema)
    .mutation(async ({ input }) => {
      const { email } = input;

      // Check rate limit
      if (passwordResetLimiter.isRateLimited(email)) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many reset requests. Please try again later.',
        });
      }

      // Find user by email (not soft-deleted)
      const user = await db.query.users.findFirst({
        where: and(eq(users.email, email), isNull(users.deletedAt)),
      });

      // Always return success message to prevent user enumeration
      // Even if user doesn't exist, we pretend the email was sent
      if (!user) {
        return {
          success: true,
          message: 'If an account exists with that email, a password reset link has been sent.',
        };
      }

      try {
        // Invalidate all existing unused tokens for this user
        await db
          .update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(
            and(
              eq(passwordResetTokens.userId, user.id),
              isNull(passwordResetTokens.usedAt)
            )
          );

        // Create new reset token with 1-hour expiration
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        const [resetToken] = await db
          .insert(passwordResetTokens)
          .values({
            userId: user.id,
            expiresAt,
          })
          .returning({
            token: passwordResetTokens.token,
          });

        if (!resetToken) {
          throw new Error('Failed to create reset token');
        }

        // Send password reset email
        await sendPasswordResetEmail({
          email: user.email,
          token: resetToken.token,
          username: user.username,
        });

        return {
          success: true,
          message: 'If an account exists with that email, a password reset link has been sent.',
        };
      } catch (error) {
        console.error('Password reset request failed:', error);
        // Still return success to prevent user enumeration
        return {
          success: true,
          message: 'If an account exists with that email, a password reset link has been sent.',
        };
      }
    }),

  /**
   * Verify if a reset token is valid
   */
  verifyToken: publicProcedure
    .input(verifyTokenSchema)
    .query(async ({ input }) => {
      const { token } = input;

      const resetToken = await db.query.passwordResetTokens.findFirst({
        where: eq(passwordResetTokens.token, token),
      });

      // Check if token exists
      if (!resetToken) {
        return {
          valid: false,
          error: 'Invalid or expired reset link',
        };
      }

      // Check if token has been used
      if (resetToken.usedAt) {
        return {
          valid: false,
          error: 'This reset link has already been used',
        };
      }

      // Check if token has expired
      if (new Date() > resetToken.expiresAt) {
        return {
          valid: false,
          error: 'This reset link has expired',
        };
      }

      return {
        valid: true,
      };
    }),

  /**
   * Reset password using a valid token
   */
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input }) => {
      const { token, password } = input;

      // Find and validate token
      const resetToken = await db.query.passwordResetTokens.findFirst({
        where: eq(passwordResetTokens.token, token),
      });

      if (!resetToken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired reset link',
        });
      }

      // Check if token has been used
      if (resetToken.usedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This reset link has already been used',
        });
      }

      // Check if token has expired
      if (new Date() > resetToken.expiresAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This reset link has expired',
        });
      }

      try {
        // Hash new password
        const passwordHash = await hashPassword(password);

        // Use transaction to ensure atomicity
        await db.transaction(async (tx) => {
          // Update user password
          await tx
            .update(users)
            .set({
              passwordHash,
              updatedAt: new Date(),
            })
            .where(eq(users.id, resetToken.userId));

          // Mark token as used
          await tx
            .update(passwordResetTokens)
            .set({ usedAt: new Date() })
            .where(eq(passwordResetTokens.token, token));

          // Invalidate all other unused tokens for this user
          // (current token already marked as used above)
          await tx
            .update(passwordResetTokens)
            .set({ usedAt: new Date() })
            .where(
              and(
                eq(passwordResetTokens.userId, resetToken.userId),
                isNull(passwordResetTokens.usedAt)
              )
            );
        });

        return {
          success: true,
          message: 'Password has been reset successfully',
        };
      } catch (error) {
        console.error('Password reset failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reset password. Please try again.',
        });
      }
    }),
});
