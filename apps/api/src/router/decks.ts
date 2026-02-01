import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, protectedProcedure, router } from '../lib/trpc.js';
import { db, decks, deckCards, cards, collections, collectionCards } from '@tcg-tracker/db';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { handlePromise } from '../lib/utils.js';

// Input schemas
const createDeckSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  format: z.enum(['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other']).optional(),
  collectionOnly: z.boolean().default(false),
  collectionId: z.string().uuid().optional().nullable()
});

const updateDeckSchema = z.object({
  deckId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  format: z.enum(['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other']).optional(),
  collectionOnly: z.boolean().optional(),
  collectionId: z.string().uuid().optional().nullable()
});

const addCardToDeckSchema = z.object({
  deckId: z.string().uuid(),
  cardId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  cardType: z.enum(['mainboard', 'sideboard', 'commander']).default('mainboard')
});

const updateCardQuantitySchema = z.object({
  deckId: z.string().uuid(),
  cardId: z.string().uuid(),
  quantity: z.number().int().min(0).max(100),
  cardType: z.enum(['mainboard', 'sideboard', 'commander']).default('mainboard')
});

const removeCardSchema = z.object({
  deckId: z.string().uuid(),
  cardId: z.string().uuid(),
  cardType: z.enum(['mainboard', 'sideboard', 'commander']).default('mainboard')
});

export const decksRouter = router({
  // List all decks for authenticated user
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const { data: userDecks, error } = await handlePromise(
        db.query.decks.findMany({
          where: and(
            eq(decks.ownerId, ctx.user.userId),
            isNull(decks.deletedAt)
          ),
          orderBy: (decks, { desc }) => [desc(decks.updatedAt)]
        })
      );

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch decks',
        });
      }

      return userDecks;
    }),

  // Get single deck with all cards
  get: protectedProcedure
    .input(z.object({ deckId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: deck, error } = await handlePromise(
        db.query.decks.findFirst({
          where: and(
            eq(decks.id, input.deckId),
            eq(decks.ownerId, ctx.user.userId),
            isNull(decks.deletedAt)
          )
        })
      );

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch deck',
        });
      }

      if (!deck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found',
        });
      }

      // Get all cards in deck
      const { data: deckCardsList, error: cardsError } = await handlePromise(
        db
          .select({
            id: deckCards.id,
            quantity: deckCards.quantity,
            cardType: deckCards.cardType,
            card: cards
          })
          .from(deckCards)
          .innerJoin(cards, eq(deckCards.cardId, cards.id))
          .where(and(
            eq(deckCards.deckId, input.deckId),
            isNull(deckCards.deletedAt)
          ))
      );

      if (cardsError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch deck cards',
        });
      }

      return {
        ...deck,
        cards: deckCardsList
      };
    }),

  // Create new deck
  create: protectedProcedure
    .input(createDeckSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate collection ownership if collectionId is provided
      if (input.collectionId) {
        const { data: collection, error: collectionError } = await handlePromise(
          db.query.collections.findFirst({
            where: and(
              eq(collections.id, input.collectionId),
              eq(collections.ownerId, ctx.user.userId),
              isNull(collections.deletedAt)
            )
          })
        );

        if (collectionError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to validate collection',
          });
        }

        if (!collection) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Collection not found or you do not have access to it',
          });
        }
      }

      const { data: insertResult, error: insertError } = await handlePromise(
        db.insert(decks).values({
          name: input.name,
          description: input.description,
          format: input.format,
          collectionOnly: input.collectionOnly,
          collectionId: input.collectionId,
          ownerId: ctx.user.userId
        }).returning()
      );

      if (insertError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create deck',
        });
      }

      const [newDeck] = insertResult;
      return newDeck;
    }),

  // Update deck
  update: protectedProcedure
    .input(updateDeckSchema)
    .mutation(async ({ ctx, input }) => {
      const { deckId, ...updates } = input;

      const { data: updateResult, error: updateError } = await handlePromise(
        db
          .update(decks)
          .set({
            ...updates,
            updatedAt: new Date()
          })
          .where(and(
            eq(decks.id, deckId),
            eq(decks.ownerId, ctx.user.userId),
            isNull(decks.deletedAt)
          ))
          .returning()
      );

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update deck',
        });
      }

      const [updatedDeck] = updateResult;
      if (!updatedDeck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found',
        });
      }

      return updatedDeck;
    }),

  // Soft delete deck
  delete: protectedProcedure
    .input(z.object({ deckId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: result, error } = await handlePromise(
        db
          .update(decks)
          .set({ deletedAt: new Date() })
          .where(and(
            eq(decks.id, input.deckId),
            eq(decks.ownerId, ctx.user.userId)
          ))
          .returning()
      );

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete deck',
        });
      }

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found',
        });
      }

      return { success: true };
    }),

  // Add card to deck
  addCard: protectedProcedure
    .input(addCardToDeckSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify deck ownership
      const { data: deck, error: deckError } = await handlePromise(
        db.query.decks.findFirst({
          where: and(
            eq(decks.id, input.deckId),
            eq(decks.ownerId, ctx.user.userId),
            isNull(decks.deletedAt)
          )
        })
      );

      if (deckError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify deck ownership',
        });
      }

      if (!deck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found',
        });
      }

      // If deck is collection-only, verify card exists in the specified collection(s)
      if (deck.collectionOnly) {
        const { data: cardInCollection, error: collectionCheckError } = await handlePromise(
          db
            .select({ id: collectionCards.id })
            .from(collectionCards)
            .innerJoin(collections, eq(collectionCards.collectionId, collections.id))
            .where(and(
              eq(collectionCards.cardId, input.cardId),
              eq(collections.ownerId, ctx.user.userId),
              isNull(collectionCards.deletedAt),
              isNull(collections.deletedAt),
              // If deck has a specific collectionId, only check that collection
              deck.collectionId ? eq(collections.id, deck.collectionId) : sql`true`
            ))
            .limit(1)
        );

        if (collectionCheckError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to verify card in collection',
          });
        }

        if (cardInCollection.length === 0) {
          if (deck.collectionId) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'This deck only allows cards from the linked collection. Add this card to the collection first.',
            });
          } else {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'This deck only allows cards from your collections. Add this card to a collection first.',
            });
          }
        }
      }

      // Add or update card in deck
      const { data: insertResult, error: insertError } = await handlePromise(
        db
          .insert(deckCards)
          .values({
            deckId: input.deckId,
            cardId: input.cardId,
            quantity: input.quantity,
            cardType: input.cardType
          })
          .onConflictDoUpdate({
            target: [deckCards.deckId, deckCards.cardId, deckCards.cardType],
            set: {
              quantity: input.quantity,
              updatedAt: new Date(),
              deletedAt: null
            }
          })
          .returning()
      );

      if (insertError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add card to deck',
        });
      }

      const [deckCard] = insertResult;
      return deckCard;
    }),

  // Update card quantity in deck
  updateCardQuantity: protectedProcedure
    .input(updateCardQuantitySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify deck ownership
      const { data: deck, error: deckError } = await handlePromise(
        db.query.decks.findFirst({
          where: and(
            eq(decks.id, input.deckId),
            eq(decks.ownerId, ctx.user.userId),
            isNull(decks.deletedAt)
          )
        })
      );

      if (deckError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify deck ownership',
        });
      }

      if (!deck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found',
        });
      }

      if (input.quantity === 0) {
        // Remove card if quantity is 0
        const { error: deleteError } = await handlePromise(
          db
            .update(deckCards)
            .set({ deletedAt: new Date() })
            .where(and(
              eq(deckCards.deckId, input.deckId),
              eq(deckCards.cardId, input.cardId),
              eq(deckCards.cardType, input.cardType)
            ))
        );

        if (deleteError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to remove card from deck',
          });
        }
      } else {
        const { error: updateError } = await handlePromise(
          db
            .update(deckCards)
            .set({
              quantity: input.quantity,
              updatedAt: new Date()
            })
            .where(and(
              eq(deckCards.deckId, input.deckId),
              eq(deckCards.cardId, input.cardId),
              eq(deckCards.cardType, input.cardType),
              isNull(deckCards.deletedAt)
            ))
        );

        if (updateError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update card quantity',
          });
        }
      }

      return { success: true };
    }),

  // Remove card from deck
  removeCard: protectedProcedure
    .input(removeCardSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify deck ownership
      const { data: deck, error: deckError } = await handlePromise(
        db.query.decks.findFirst({
          where: and(
            eq(decks.id, input.deckId),
            eq(decks.ownerId, ctx.user.userId),
            isNull(decks.deletedAt)
          )
        })
      );

      if (deckError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify deck ownership',
        });
      }

      if (!deck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found',
        });
      }

      const { error: deleteError } = await handlePromise(
        db
          .update(deckCards)
          .set({ deletedAt: new Date() })
          .where(and(
            eq(deckCards.deckId, input.deckId),
            eq(deckCards.cardId, input.cardId),
            eq(deckCards.cardType, input.cardType)
          ))
      );

      if (deleteError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove card from deck',
        });
      }

      return { success: true };
    }),

  // Get deck analytics
  analyze: protectedProcedure
    .input(z.object({ deckId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify deck ownership
      const { data: deck, error: deckError } = await handlePromise(
        db.query.decks.findFirst({
          where: and(
            eq(decks.id, input.deckId),
            eq(decks.ownerId, ctx.user.userId),
            isNull(decks.deletedAt)
          )
        })
      );

      if (deckError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify deck ownership',
        });
      }

      if (!deck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found',
        });
      }

      const { data: deckCardsList, error: cardsError } = await handlePromise(
        db
          .select({
            quantity: deckCards.quantity,
            cardType: deckCards.cardType,
            card: cards
          })
          .from(deckCards)
          .innerJoin(cards, eq(deckCards.cardId, cards.id))
          .where(and(
            eq(deckCards.deckId, input.deckId),
            isNull(deckCards.deletedAt)
          ))
      );

      if (cardsError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch deck cards for analysis',
        });
      }

      // Calculate mana curve (CMC distribution)
      const manaCurve = deckCardsList
        .filter(dc => dc.cardType === 'mainboard')
        .reduce((acc, dc) => {
          const cmc = dc.card.cmc || 0;
          acc[cmc] = (acc[cmc] || 0) + dc.quantity;
          return acc;
        }, {} as Record<number, number>);

      // Calculate card type distribution
      const typeDistribution = deckCardsList
        .filter(dc => dc.cardType === 'mainboard')
        .reduce((acc, dc) => {
          const types = dc.card.types || [];
          types.forEach(type => {
            acc[type] = (acc[type] || 0) + dc.quantity;
          });
          return acc;
        }, {} as Record<string, number>);

      // Calculate color distribution
      const colorDistribution = deckCardsList
        .filter(dc => dc.cardType === 'mainboard')
        .reduce((acc, dc) => {
          const colors = dc.card.colors || [];
          colors.forEach(color => {
            acc[color] = (acc[color] || 0) + dc.quantity;
          });
          return acc;
        }, {} as Record<string, number>);

      // Calculate average CMC
      const totalCards = deckCardsList
        .filter(dc => dc.cardType === 'mainboard')
        .reduce((sum, dc) => sum + dc.quantity, 0);

      const totalCMC = deckCardsList
        .filter(dc => dc.cardType === 'mainboard')
        .reduce((sum, dc) => sum + (dc.card.cmc || 0) * dc.quantity, 0);

      const avgCMC = totalCards > 0 ? totalCMC / totalCards : 0;

      return {
        manaCurve,
        typeDistribution,
        colorDistribution,
        avgCMC,
        totalCards,
        mainboardCount: deckCardsList.filter(dc => dc.cardType === 'mainboard').length,
        sideboardCount: deckCardsList.filter(dc => dc.cardType === 'sideboard').length
      };
    })
});
