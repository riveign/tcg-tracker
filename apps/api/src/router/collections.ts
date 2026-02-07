import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../lib/trpc.js';
import { db, collections, collectionCards, cards } from '@tcg-tracker/db';
import { eq, and, isNull, sql, ilike } from 'drizzle-orm';
import { getCardById, transformScryfallCard, parseSetCodeQuery } from '../lib/scryfall.js';
import { handlePromise } from '../lib/utils.js';

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

const searchCollectionCardsSchema = z.object({
  collectionId: z.string().uuid('Invalid collection ID').optional().nullable(),
  query: z.string().min(1, 'Search query is required'),
});

export const collectionsRouter = router({
  /**
   * List all collections for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data: userCollections, error } = await handlePromise(
      db.query.collections.findMany({
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
      })
    );

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch collections',
      });
    }

    return userCollections;
  }),

  /**
   * Get a single collection by ID
   */
  get: protectedProcedure
    .input(getCollectionSchema)
    .query(async ({ input, ctx }) => {
      const { data: collection, error } = await handlePromise(
        db.query.collections.findFirst({
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
        })
      );

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch collection',
        });
      }

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

      const { data: insertResult, error: insertError } = await handlePromise(
        db
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
          })
      );

      if (insertError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create collection',
        });
      }

      const [newCollection] = insertResult;

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
      const { data: existingCollection, error: fetchError } = await handlePromise(
        db.query.collections.findFirst({
          where: and(
            eq(collections.id, id),
            eq(collections.ownerId, ctx.user.userId),
            isNull(collections.deletedAt)
          ),
        })
      );

      if (fetchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify collection ownership',
        });
      }

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

      const { data: updateResult, error: updateError } = await handlePromise(
        db
          .update(collections)
          .set(updateFields)
          .where(eq(collections.id, id))
          .returning({
            id: collections.id,
            name: collections.name,
            description: collections.description,
            isPublic: collections.isPublic,
            updatedAt: collections.updatedAt,
          })
      );

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update collection',
        });
      }

      const [updatedCollection] = updateResult;

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
      const { data: existingCollection, error: fetchError } = await handlePromise(
        db.query.collections.findFirst({
          where: and(
            eq(collections.id, input.id),
            eq(collections.ownerId, ctx.user.userId),
            isNull(collections.deletedAt)
          ),
        })
      );

      if (fetchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify collection ownership',
        });
      }

      if (!existingCollection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found or you do not have permission to delete it',
        });
      }

      // Soft delete
      const { error: deleteError } = await handlePromise(
        db
          .update(collections)
          .set({
            deletedAt: sql`NOW()`,
          })
          .where(eq(collections.id, input.id))
      );

      if (deleteError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete collection',
        });
      }

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
      const { data: collection, error: collectionError } = await handlePromise(
        db.query.collections.findFirst({
          where: and(
            eq(collections.id, collectionId),
            eq(collections.ownerId, ctx.user.userId),
            isNull(collections.deletedAt)
          ),
        })
      );

      if (collectionError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify collection ownership',
        });
      }

      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found or you do not have permission to modify it',
        });
      }

      // Check if card exists in our database
      const { data: card, error: cardFetchError } = await handlePromise(
        db.query.cards.findFirst({
          where: eq(cards.id, cardId),
        })
      );

      if (cardFetchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch card from database',
        });
      }

      let finalCard = card;

      // If not, fetch from Scryfall and cache it
      if (!finalCard) {
        const scryfallCard = await getCardById(cardId);

        if (!scryfallCard) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Card not found on Scryfall',
          });
        }

        const transformedCard = transformScryfallCard(scryfallCard);

        const { data: insertResult, error: cardInsertError } = await handlePromise(
          db
            .insert(cards)
            .values(transformedCard)
            .onConflictDoUpdate({
              target: cards.id,
              set: { updatedAt: new Date() },
            })
            .returning()
        );

        if (cardInsertError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to cache card',
          });
        }

        const [newCard] = insertResult;

        if (!newCard) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to cache card',
          });
        }

        finalCard = newCard;
      }

      // Check if card is already in collection
      const { data: existingCollectionCard, error: existingCardError } = await handlePromise(
        db.query.collectionCards.findFirst({
          where: and(
            eq(collectionCards.collectionId, collectionId),
            eq(collectionCards.cardId, cardId),
            isNull(collectionCards.deletedAt)
          ),
        })
      );

      if (existingCardError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check if card is already in collection',
        });
      }

      let collectionCard;

      if (existingCollectionCard) {
        // Update quantity
        const { data: updateResult, error: updateError } = await handlePromise(
          db
            .update(collectionCards)
            .set({
              quantity: existingCollectionCard.quantity + quantity,
              updatedAt: sql`NOW()`,
            })
            .where(eq(collectionCards.id, existingCollectionCard.id))
            .returning()
        );

        if (updateError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update card quantity in collection',
          });
        }

        const [updated] = updateResult;
        collectionCard = updated;
      } else {
        // Add new card to collection
        const { data: insertResult, error: insertError } = await handlePromise(
          db
            .insert(collectionCards)
            .values({
              collectionId,
              cardId,
              quantity,
              cardMetadata: metadata || {},
            })
            .returning()
        );

        if (insertError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to add card to collection',
          });
        }

        const [inserted] = insertResult;
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
      const { data: collection, error: collectionError } = await handlePromise(
        db.query.collections.findFirst({
          where: and(
            eq(collections.id, collectionId),
            eq(collections.ownerId, ctx.user.userId),
            isNull(collections.deletedAt)
          ),
        })
      );

      if (collectionError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify collection ownership',
        });
      }

      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found or you do not have permission to view it',
        });
      }

      // Get all cards in the collection with full card details
      const { data: collectionCardsWithDetails, error: cardsError } = await handlePromise(
        db.query.collectionCards.findMany({
          where: and(
            eq(collectionCards.collectionId, collectionId),
            isNull(collectionCards.deletedAt)
          ),
          with: {
            card: true,
          },
          orderBy: (collectionCards, { desc }) => [desc(collectionCards.createdAt)],
        })
      );

      if (cardsError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch collection cards',
        });
      }

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
      const { data: collection, error: collectionError } = await handlePromise(
        db.query.collections.findFirst({
          where: and(
            eq(collections.id, collectionId),
            eq(collections.ownerId, ctx.user.userId),
            isNull(collections.deletedAt)
          ),
        })
      );

      if (collectionError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify collection ownership',
        });
      }

      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found or you do not have permission to modify it',
        });
      }

      // Find the collection card
      const { data: collectionCard, error: cardError } = await handlePromise(
        db.query.collectionCards.findFirst({
          where: and(
            eq(collectionCards.collectionId, collectionId),
            eq(collectionCards.cardId, cardId),
            isNull(collectionCards.deletedAt)
          ),
        })
      );

      if (cardError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to find card in collection',
        });
      }

      if (!collectionCard) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Card not found in collection',
        });
      }

      // Update quantity
      const { data: updateResult, error: updateError } = await handlePromise(
        db
          .update(collectionCards)
          .set({
            quantity,
            updatedAt: sql`NOW()`,
          })
          .where(eq(collectionCards.id, collectionCard.id))
          .returning()
      );

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update card quantity',
        });
      }

      const [updated] = updateResult;

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
      const { data: collection, error: collectionError } = await handlePromise(
        db.query.collections.findFirst({
          where: and(
            eq(collections.id, collectionId),
            eq(collections.ownerId, ctx.user.userId),
            isNull(collections.deletedAt)
          ),
        })
      );

      if (collectionError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify collection ownership',
        });
      }

      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Collection not found or you do not have permission to modify it',
        });
      }

      // Find the collection card
      const { data: collectionCard, error: cardError } = await handlePromise(
        db.query.collectionCards.findFirst({
          where: and(
            eq(collectionCards.collectionId, collectionId),
            eq(collectionCards.cardId, cardId),
            isNull(collectionCards.deletedAt)
          ),
        })
      );

      if (cardError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to find card in collection',
        });
      }

      if (!collectionCard) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Card not found in collection',
        });
      }

      // Soft delete
      const { error: deleteError } = await handlePromise(
        db
          .update(collectionCards)
          .set({
            deletedAt: sql`NOW()`,
          })
          .where(eq(collectionCards.id, collectionCard.id))
      );

      if (deleteError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove card from collection',
        });
      }

      return { success: true };
    }),

  /**
   * Search cards within a specific collection or all user collections
   */
  searchCards: protectedProcedure
    .input(searchCollectionCardsSchema)
    .query(async ({ input, ctx }) => {
      const { collectionId, query } = input;

      // Build the where clause for collection filtering
      const collectionFilter = collectionId
        ? and(
            eq(collectionCards.collectionId, collectionId),
            eq(collections.ownerId, ctx.user.userId),
            isNull(collectionCards.deletedAt),
            isNull(collections.deletedAt)
          )
        : and(
            eq(collections.ownerId, ctx.user.userId),
            isNull(collectionCards.deletedAt),
            isNull(collections.deletedAt)
          );

      // If specific collection, verify ownership
      if (collectionId) {
        const { data: collection, error: collectionError } = await handlePromise(
          db.query.collections.findFirst({
            where: and(
              eq(collections.id, collectionId),
              eq(collections.ownerId, ctx.user.userId),
              isNull(collections.deletedAt)
            ),
          })
        );

        if (collectionError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to verify collection ownership',
          });
        }

        if (!collection) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Collection not found or you do not have permission to view it',
          });
        }
      }

      // Check if query matches set code pattern (e.g., "ECL #212", "ECL 212", "ecl#212", "ECL-212")
      const setCodeMatch = parseSetCodeQuery(query);

      // Build the search condition based on query type
      const searchCondition = setCodeMatch
        ? and(
            eq(cards.setCode, setCodeMatch.setCode),
            eq(cards.collectorNumber, setCodeMatch.collectorNumber)
          )
        : ilike(cards.name, `%${query}%`);

      // Search for cards in the collection(s) by name or set code
      const { data: searchResults, error: searchError } = await handlePromise(
        db
          .select({
            id: cards.id,
            name: cards.name,
            typeLine: cards.typeLine,
            manaCost: cards.manaCost,
            setCode: cards.setCode,
            setName: cards.setName,
            collectorNumber: cards.collectorNumber,
            rarity: cards.rarity,
            imageUris: cards.imageUris,
            quantity: collectionCards.quantity,
            collectionId: collectionCards.collectionId,
          })
          .from(collectionCards)
          .innerJoin(cards, eq(collectionCards.cardId, cards.id))
          .innerJoin(collections, eq(collectionCards.collectionId, collections.id))
          .where(
            and(
              collectionFilter,
              searchCondition
            )
          )
          .limit(50)
      );

      if (searchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search collection cards',
        });
      }

      // Transform results to match Scryfall card format expected by frontend
      // Note: imageUris is stored as JSONB and matches Scryfall's structure
      return searchResults.map((result) => ({
        id: result.id,
        name: result.name,
        type_line: result.typeLine,
        mana_cost: result.manaCost,
        set: result.setCode,
        set_name: result.setName,
        collector_number: result.collectorNumber,
        rarity: result.rarity,
        image_uris: result.imageUris as any,
        quantity: result.quantity,
        collectionId: result.collectionId,
      }));
    }),
});
