import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../lib/trpc.js';
import { db, decks, deckCards, cards, collections, collectionCards } from '@tcg-tracker/db';
import { eq, and, isNull, sql } from 'drizzle-orm';

// Input schemas
const createDeckSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  format: z.enum(['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other']).optional(),
  collectionOnly: z.boolean().default(false)
});

const updateDeckSchema = z.object({
  deckId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  format: z.enum(['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other']).optional(),
  collectionOnly: z.boolean().optional()
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
      const userDecks = await db.query.decks.findMany({
        where: and(
          eq(decks.ownerId, ctx.user.userId),
          isNull(decks.deletedAt)
        ),
        orderBy: (decks, { desc }) => [desc(decks.updatedAt)]
      });
      return userDecks;
    }),

  // Get single deck with all cards
  get: protectedProcedure
    .input(z.object({ deckId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const deck = await db.query.decks.findFirst({
        where: and(
          eq(decks.id, input.deckId),
          eq(decks.ownerId, ctx.user.userId),
          isNull(decks.deletedAt)
        )
      });

      if (!deck) {
        throw new Error('Deck not found');
      }

      // Get all cards in deck
      const deckCardsList = await db
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
        ));

      return {
        ...deck,
        cards: deckCardsList
      };
    }),

  // Create new deck
  create: protectedProcedure
    .input(createDeckSchema)
    .mutation(async ({ ctx, input }) => {
      const [newDeck] = await db.insert(decks).values({
        name: input.name,
        description: input.description,
        format: input.format,
        collectionOnly: input.collectionOnly,
        ownerId: ctx.user.userId
      }).returning();

      return newDeck;
    }),

  // Update deck
  update: protectedProcedure
    .input(updateDeckSchema)
    .mutation(async ({ ctx, input }) => {
      const { deckId, ...updates } = input;

      const [updatedDeck] = await db
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
        .returning();

      if (!updatedDeck) {
        throw new Error('Deck not found');
      }

      return updatedDeck;
    }),

  // Soft delete deck
  delete: protectedProcedure
    .input(z.object({ deckId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await db
        .update(decks)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(decks.id, input.deckId),
          eq(decks.ownerId, ctx.user.userId)
        ))
        .returning();

      if (result.length === 0) {
        throw new Error('Deck not found');
      }

      return { success: true };
    }),

  // Add card to deck
  addCard: protectedProcedure
    .input(addCardToDeckSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify deck ownership
      const deck = await db.query.decks.findFirst({
        where: and(
          eq(decks.id, input.deckId),
          eq(decks.ownerId, ctx.user.userId),
          isNull(decks.deletedAt)
        )
      });

      if (!deck) {
        throw new Error('Deck not found');
      }

      // If deck is collection-only, verify card exists in user's collections
      if (deck.collectionOnly) {
        const cardInCollection = await db
          .select({ id: collectionCards.id })
          .from(collectionCards)
          .innerJoin(collections, eq(collectionCards.collectionId, collections.id))
          .where(and(
            eq(collectionCards.cardId, input.cardId),
            eq(collections.ownerId, ctx.user.userId),
            isNull(collectionCards.deletedAt),
            isNull(collections.deletedAt)
          ))
          .limit(1);

        if (cardInCollection.length === 0) {
          throw new Error('This deck only allows cards from your collections. Add this card to a collection first.');
        }
      }

      // Add or update card in deck
      const [deckCard] = await db
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
        .returning();

      return deckCard;
    }),

  // Update card quantity in deck
  updateCardQuantity: protectedProcedure
    .input(updateCardQuantitySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify deck ownership
      const deck = await db.query.decks.findFirst({
        where: and(
          eq(decks.id, input.deckId),
          eq(decks.ownerId, ctx.user.userId),
          isNull(decks.deletedAt)
        )
      });

      if (!deck) {
        throw new Error('Deck not found');
      }

      if (input.quantity === 0) {
        // Remove card if quantity is 0
        await db
          .update(deckCards)
          .set({ deletedAt: new Date() })
          .where(and(
            eq(deckCards.deckId, input.deckId),
            eq(deckCards.cardId, input.cardId),
            eq(deckCards.cardType, input.cardType)
          ));
      } else {
        await db
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
          ));
      }

      return { success: true };
    }),

  // Remove card from deck
  removeCard: protectedProcedure
    .input(removeCardSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify deck ownership
      const deck = await db.query.decks.findFirst({
        where: and(
          eq(decks.id, input.deckId),
          eq(decks.ownerId, ctx.user.userId),
          isNull(decks.deletedAt)
        )
      });

      if (!deck) {
        throw new Error('Deck not found');
      }

      await db
        .update(deckCards)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(deckCards.deckId, input.deckId),
          eq(deckCards.cardId, input.cardId),
          eq(deckCards.cardType, input.cardType)
        ));

      return { success: true };
    }),

  // Get deck analytics
  analyze: protectedProcedure
    .input(z.object({ deckId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify deck ownership
      const deck = await db.query.decks.findFirst({
        where: and(
          eq(decks.id, input.deckId),
          eq(decks.ownerId, ctx.user.userId),
          isNull(decks.deletedAt)
        )
      });

      if (!deck) {
        throw new Error('Deck not found');
      }

      const deckCardsList = await db
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
        ));

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
