import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../lib/trpc.js';
import { db, collections } from '@tcg-tracker/db';
import { eq, and, isNull, sql } from 'drizzle-orm';

const createCollectionSchema = z.object({
  name: z.string().min(1, 'Collection name is required').max(255),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

const updateCollectionSchema = z.object({
  id: z.string().uuid('Invalid collection ID'),
  name: z.string().min(1, 'Collection name is required').max(255).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

const deleteCollectionSchema = z.object({
  id: z.string().uuid('Invalid collection ID'),
});

const getCollectionSchema = z.object({
  id: z.string().uuid('Invalid collection ID'),
});

export const collectionsRouter = router({
  /**
   * List all collections for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userCollections = await db.query.collections.findMany({
      where: and(
        eq(collections.ownerId, ctx.user.userId),
        isNull(collections.deletedAt)
      ),
      orderBy: (collections, { desc }) => [desc(collections.updatedAt)],
      columns: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return userCollections;
  }),

  /**
   * Get a single collection by ID
   */
  get: protectedProcedure
    .input(getCollectionSchema)
    .query(async ({ input, ctx }) => {
      const collection = await db.query.collections.findFirst({
        where: and(
          eq(collections.id, input.id),
          eq(collections.ownerId, ctx.user.userId),
          isNull(collections.deletedAt)
        ),
        columns: {
          id: true,
          name: true,
          description: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found',
        });
      }

      return collection;
    }),

  /**
   * Create a new collection
   */
  create: protectedProcedure
    .input(createCollectionSchema)
    .mutation(async ({ input, ctx }) => {
      const { name, description, isPublic } = input;

      const [newCollection] = await db
        .insert(collections)
        .values({
          name,
          description: description || null,
          isPublic,
          ownerId: ctx.user.userId,
        })
        .returning({
          id: collections.id,
          name: collections.name,
          description: collections.description,
          isPublic: collections.isPublic,
          createdAt: collections.createdAt,
          updatedAt: collections.updatedAt,
        });

      if (!newCollection) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create collection',
        });
      }

      return newCollection;
    }),

  /**
   * Update an existing collection
   */
  update: protectedProcedure
    .input(updateCollectionSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      // Verify ownership
      const existingCollection = await db.query.collections.findFirst({
        where: and(
          eq(collections.id, id),
          eq(collections.ownerId, ctx.user.userId),
          isNull(collections.deletedAt)
        ),
      });

      if (!existingCollection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found or you do not have permission to update it',
        });
      }

      // Build update object (only include provided fields)
      const updateFields: Record<string, unknown> = {
        updatedAt: sql`NOW()`,
      };

      if (updateData.name !== undefined) {
        updateFields.name = updateData.name;
      }

      if (updateData.description !== undefined) {
        updateFields.description = updateData.description || null;
      }

      if (updateData.isPublic !== undefined) {
        updateFields.isPublic = updateData.isPublic;
      }

      const [updatedCollection] = await db
        .update(collections)
        .set(updateFields)
        .where(eq(collections.id, id))
        .returning({
          id: collections.id,
          name: collections.name,
          description: collections.description,
          isPublic: collections.isPublic,
          updatedAt: collections.updatedAt,
        });

      if (!updatedCollection) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update collection',
        });
      }

      return updatedCollection;
    }),

  /**
   * Delete a collection (soft delete)
   */
  delete: protectedProcedure
    .input(deleteCollectionSchema)
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const existingCollection = await db.query.collections.findFirst({
        where: and(
          eq(collections.id, input.id),
          eq(collections.ownerId, ctx.user.userId),
          isNull(collections.deletedAt)
        ),
      });

      if (!existingCollection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found or you do not have permission to delete it',
        });
      }

      // Soft delete
      await db
        .update(collections)
        .set({
          deletedAt: sql`NOW()`,
        })
        .where(eq(collections.id, input.id));

      return { success: true };
    }),
});
