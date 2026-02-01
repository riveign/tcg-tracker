import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../lib/trpc.js';
import { db, collections, collectionCards, cards } from '@tcg-tracker/db';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { getCardById, transformScryfallCard } from '../lib/scryfall.js';

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

const addCardSchema = z.object({
  collectionId: z.string().uuid('Invalid collection ID'),
  cardId: z.string().uuid('Invalid card ID'),
  quantity: z.number().int().min(1).default(1),
  metadata: z.record(z.unknown()).optional(),
});

const getCardsSchema = z.object({
  collectionId: z.string().uuid('Invalid collection ID'),
});

const updateCardQuantitySchema = z.object({
  collectionId: z.string().uuid('Invalid collection ID'),
  cardId: z.string().uuid('Invalid card ID'),
  quantity: z.number().int().min(1),
});

const removeCardSchema = z.object({
  collectionId: z.string().uuid('Invalid collection ID'),
  cardId: z.string().uuid('Invalid card ID'),
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

  /**
   * Add a card to a collection
   * Fetches card from Scryfall if not in database, then adds to collection
   */
  addCard: protectedProcedure
    .input(addCardSchema)
    .mutation(async ({ input, ctx }) => {
      const { collectionId, cardId, quantity, metadata } = input;

      // Verify collection ownership
      const collection = await db.query.collections.findFirst({
        where: and(
          eq(collections.id, collectionId),
          eq(collections.ownerId, ctx.user.userId),
          isNull(collections.deletedAt)
        ),
      });

      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found or you do not have permission to modify it',
        });
      }

      // Check if card exists in our database
      let card = await db.query.cards.findFirst({
        where: eq(cards.id, cardId),
      });

      // If not, fetch from Scryfall and cache it
      if (!card) {
        const scryfallCard = await getCardById(cardId);

        if (!scryfallCard) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Card not found on Scryfall',
          });
        }

        const transformedCard = transformScryfallCard(scryfallCard);

        const [newCard] = await db
          .insert(cards)
          .values(transformedCard)
          .onConflictDoUpdate({
            target: cards.id,
            set: { updatedAt: new Date() },
          })
          .returning();

        if (!newCard) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to cache card',
          });
        }

        card = newCard;
      }

      // Check if card is already in collection
      const existingCollectionCard = await db.query.collectionCards.findFirst({
        where: and(
          eq(collectionCards.collectionId, collectionId),
          eq(collectionCards.cardId, cardId),
          isNull(collectionCards.deletedAt)
        ),
      });

      let collectionCard;

      if (existingCollectionCard) {
        // Update quantity
        const [updated] = await db
          .update(collectionCards)
          .set({
            quantity: existingCollectionCard.quantity + quantity,
            updatedAt: sql`NOW()`,
          })
          .where(eq(collectionCards.id, existingCollectionCard.id))
          .returning();

        collectionCard = updated;
      } else {
        // Add new card to collection
        const [inserted] = await db
          .insert(collectionCards)
          .values({
            collectionId,
            cardId,
            quantity,
            cardMetadata: metadata || {},
          })
          .returning();

        collectionCard = inserted;
      }

      if (!collectionCard) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add card to collection',
        });
      }

      return {
        success: true,
        collectionCard,
      };
    }),

  /**
   * Get all cards in a collection with full card details
   */
  getCards: protectedProcedure
    .input(getCardsSchema)
    .query(async ({ input, ctx }) => {
      const { collectionId } = input;

      // Verify collection ownership
      const collection = await db.query.collections.findFirst({
        where: and(
          eq(collections.id, collectionId),
          eq(collections.ownerId, ctx.user.userId),
          isNull(collections.deletedAt)
        ),
      });

      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found or you do not have permission to view it',
        });
      }

      // Get all cards in the collection with full card details
      const collectionCardsWithDetails = await db.query.collectionCards.findMany({
        where: and(
          eq(collectionCards.collectionId, collectionId),
          isNull(collectionCards.deletedAt)
        ),
        with: {
          card: true,
        },
        orderBy: (collectionCards, { desc }) => [desc(collectionCards.createdAt)],
      });

      return collectionCardsWithDetails.map((cc) => ({
        id: cc.id,
        quantity: cc.quantity,
        metadata: cc.cardMetadata,
        createdAt: cc.createdAt,
        card: cc.card,
      }));
    }),

  /**
   * Update card quantity in a collection
   */
  updateCardQuantity: protectedProcedure
    .input(updateCardQuantitySchema)
    .mutation(async ({ input, ctx }) => {
      const { collectionId, cardId, quantity } = input;

      // Verify collection ownership
      const collection = await db.query.collections.findFirst({
        where: and(
          eq(collections.id, collectionId),
          eq(collections.ownerId, ctx.user.userId),
          isNull(collections.deletedAt)
        ),
      });

      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found or you do not have permission to modify it',
        });
      }

      // Find the collection card
      const collectionCard = await db.query.collectionCards.findFirst({
        where: and(
          eq(collectionCards.collectionId, collectionId),
          eq(collectionCards.cardId, cardId),
          isNull(collectionCards.deletedAt)
        ),
      });

      if (!collectionCard) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Card not found in collection',
        });
      }

      // Update quantity
      const [updated] = await db
        .update(collectionCards)
        .set({
          quantity,
          updatedAt: sql`NOW()`,
        })
        .where(eq(collectionCards.id, collectionCard.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update card quantity',
        });
      }

      return { success: true, quantity: updated.quantity };
    }),

  /**
   * Remove a card from a collection (soft delete)
   */
  removeCard: protectedProcedure
    .input(removeCardSchema)
    .mutation(async ({ input, ctx }) => {
      const { collectionId, cardId } = input;

      // Verify collection ownership
      const collection = await db.query.collections.findFirst({
        where: and(
          eq(collections.id, collectionId),
          eq(collections.ownerId, ctx.user.userId),
          isNull(collections.deletedAt)
        ),
      });

      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found or you do not have permission to modify it',
        });
      }

      // Find the collection card
      const collectionCard = await db.query.collectionCards.findFirst({
        where: and(
          eq(collectionCards.collectionId, collectionId),
          eq(collectionCards.cardId, cardId),
          isNull(collectionCards.deletedAt)
        ),
      });

      if (!collectionCard) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Card not found in collection',
        });
      }

      // Soft delete
      await db
        .update(collectionCards)
        .set({
          deletedAt: sql`NOW()`,
        })
        .where(eq(collectionCards.id, collectionCard.id));

      return { success: true };
    }),
});
