import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../lib/trpc.js';
import { db, cards } from '@tcg-tracker/db';
import { eq } from 'drizzle-orm';
import { searchCards, getCardById, transformScryfallCard, parseSetCodeQuery, searchBySetCode } from '../lib/scryfall.js';

const searchCardsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  page: z.number().int().min(1).default(1),
});

const getCardByIdSchema = z.object({
  cardId: z.string().uuid('Invalid card ID'),
});

const advancedSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  filters: z
    .object({
      colors: z.array(z.string()).optional(),
      types: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
      rarity: z.array(z.string()).optional(),
      cmcMin: z.number().optional(),
      cmcMax: z.number().optional(),
    })
    .optional(),
});

export const cardsRouter = router({
  /**
   * Search for cards using Scryfall API
   * Supports both name search and set code + collector number (e.g., "ECL #212")
   */
  search: protectedProcedure
    .input(searchCardsSchema)
    .query(async ({ input }) => {
      const { query, page } = input;

      // Check if query matches set code pattern (e.g., "ECL #212", "ECL 212", "ecl#212", "ECL-212")
      const setCodeMatch = parseSetCodeQuery(query);

      if (setCodeMatch) {
        // Search by set code and collector number using Scryfall's direct endpoint
        const card = await searchBySetCode(setCodeMatch.setCode, setCodeMatch.collectorNumber);

        if (card) {
          return {
            cards: [card],
            hasMore: false,
            total: 1,
          };
        }

        // If no card found, return empty results
        return {
          cards: [],
          hasMore: false,
          total: 0,
        };
      }

      // Default: search by name
      const { cards: scryfallCards, hasMore, total } = await searchCards(query, page);

      // Return the Scryfall cards directly - we'll cache them when adding to collection
      return {
        cards: scryfallCards,
        hasMore,
        total,
      };
    }),

  /**
   * Get a single card by ID
   * First checks local database, falls back to Scryfall API if not cached
   */
  getById: protectedProcedure
    .input(getCardByIdSchema)
    .query(async ({ input }) => {
      // Check if card is already in our database
      const cachedCard = await db.query.cards.findFirst({
        where: eq(cards.id, input.cardId),
      });

      if (cachedCard) {
        return cachedCard;
      }

      // Fetch from Scryfall if not cached
      const scryfallCard = await getCardById(input.cardId);

      if (!scryfallCard) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Card not found',
        });
      }

      // Cache the card in our database
      const transformedCard = transformScryfallCard(scryfallCard);

      const [newCard] = await db
        .insert(cards)
        .values(transformedCard)
        .onConflictDoUpdate({
          target: cards.id,
          set: {
            updatedAt: new Date(),
          },
        })
        .returning();

      if (!newCard) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cache card',
        });
      }

      return newCard;
    }),

  /**
   * Advanced search with keyword and filter support
   * Searches both Scryfall API and local database
   */
  advancedSearch: protectedProcedure
    .input(advancedSearchSchema)
    .query(async ({ input }) => {
      const { query, filters } = input;

      // First, search Scryfall for cards matching the name
      const { cards: scryfallCards } = await searchCards(query, 1);

      // Cache all found cards in our database
      const cachedCardPromises = scryfallCards.map(async (scryfallCard) => {
        const transformedCard = transformScryfallCard(scryfallCard);

        const [card] = await db
          .insert(cards)
          .values(transformedCard)
          .onConflictDoUpdate({
            target: cards.id,
            set: { updatedAt: new Date() },
          })
          .returning();

        return card;
      });

      let allCards = await Promise.all(cachedCardPromises);

      // Apply filters if provided
      if (filters) {
        allCards = allCards.filter((card) => {
          // Color filter
          if (filters.colors && filters.colors.length > 0) {
            const hasMatchingColor = filters.colors.some((color) =>
              card.colors.includes(color)
            );
            if (!hasMatchingColor) return false;
          }

          // Type filter
          if (filters.types && filters.types.length > 0) {
            const hasMatchingType = filters.types.some((type) =>
              card.types.includes(type)
            );
            if (!hasMatchingType) return false;
          }

          // Keyword filter
          if (filters.keywords && filters.keywords.length > 0) {
            const hasMatchingKeyword = filters.keywords.every((keyword) =>
              card.keywords.includes(keyword)
            );
            if (!hasMatchingKeyword) return false;
          }

          // Rarity filter
          if (filters.rarity && filters.rarity.length > 0) {
            if (!filters.rarity.includes(card.rarity)) return false;
          }

          // CMC filter
          const cmc = parseFloat(card.cmc);
          if (filters.cmcMin !== undefined && cmc < filters.cmcMin) return false;
          if (filters.cmcMax !== undefined && cmc > filters.cmcMax) return false;

          return true;
        });
      }

      return {
        cards: allCards,
        total: allCards.length,
      };
    }),
});
