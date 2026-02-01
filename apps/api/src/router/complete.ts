import { z } from 'zod';
import { router, protectedProcedure } from '../lib/trpc.js';
import { db, collections, collectionCards, cards } from '@tcg-tracker/db';
import { eq, and, isNull, sql, inArray } from 'drizzle-orm';

const getAllSchema = z.object({
  filters: z
    .object({
      colors: z.array(z.string()).optional(),
      types: z.array(z.string()).optional(),
      rarity: z.array(z.string()).optional(),
      cmcMin: z.number().optional(),
      cmcMax: z.number().optional(),
    })
    .optional(),
});

export const completeRouter = router({
  /**
   * Get all unique cards across all user collections
   * With optional filtering
   */
  getAll: protectedProcedure.input(getAllSchema).query(async ({ input, ctx }) => {
    const { filters } = input;

    // Get all user's collections
    const userCollections = await db.query.collections.findMany({
      where: and(eq(collections.ownerId, ctx.user.userId), isNull(collections.deletedAt)),
      columns: { id: true },
    });

    if (userCollections.length === 0) {
      return { cards: [], stats: { totalCards: 0, uniqueCards: 0, collections: 0 } };
    }

    const collectionIds = userCollections.map((c) => c.id);

    // Get all cards from all collections
    const allCollectionCards = await db.query.collectionCards.findMany({
      where: and(
        inArray(collectionCards.collectionId, collectionIds),
        isNull(collectionCards.deletedAt)
      ),
      with: {
        card: true,
        collection: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group by card to aggregate across collections
    const cardMap = new Map<
      string,
      {
        card: typeof allCollectionCards[0]['card'];
        totalQuantity: number;
        collections: Array<{ id: string; name: string; quantity: number }>;
      }
    >();

    for (const cc of allCollectionCards) {
      const existing = cardMap.get(cc.card.id);
      if (existing) {
        existing.totalQuantity += cc.quantity;
        existing.collections.push({
          id: cc.collection.id,
          name: cc.collection.name,
          quantity: cc.quantity,
        });
      } else {
        cardMap.set(cc.card.id, {
          card: cc.card,
          totalQuantity: cc.quantity,
          collections: [
            {
              id: cc.collection.id,
              name: cc.collection.name,
              quantity: cc.quantity,
            },
          ],
        });
      }
    }

    // Convert map to array
    let aggregatedCards = Array.from(cardMap.values());

    // Apply filters
    if (filters) {
      aggregatedCards = aggregatedCards.filter((item) => {
        const card = item.card;

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

    // Sort by card name
    aggregatedCards.sort((a, b) => a.card.name.localeCompare(b.card.name));

    return {
      cards: aggregatedCards,
      stats: {
        totalCards: aggregatedCards.reduce((sum, item) => sum + item.totalQuantity, 0),
        uniqueCards: aggregatedCards.length,
        collections: userCollections.length,
      },
    };
  }),

  /**
   * Get collection statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Get all user's collections
    const userCollections = await db.query.collections.findMany({
      where: and(eq(collections.ownerId, ctx.user.userId), isNull(collections.deletedAt)),
    });

    if (userCollections.length === 0) {
      return {
        totalUniqueCards: 0,
        totalQuantity: 0,
        collections: 0,
        colorBreakdown: {},
        rarityBreakdown: {},
      };
    }

    const collectionIds = userCollections.map((c) => c.id);

    // Get all cards
    const allCollectionCards = await db.query.collectionCards.findMany({
      where: and(
        inArray(collectionCards.collectionId, collectionIds),
        isNull(collectionCards.deletedAt)
      ),
      with: {
        card: true,
      },
    });

    // Aggregate unique cards and totals
    const uniqueCards = new Set<string>();
    let totalQuantity = 0;
    const colorBreakdown: Record<string, number> = {};
    const rarityBreakdown: Record<string, number> = {};

    for (const cc of allCollectionCards) {
      uniqueCards.add(cc.card.id);
      totalQuantity += cc.quantity;

      // Count colors
      for (const color of cc.card.colors) {
        colorBreakdown[color] = (colorBreakdown[color] || 0) + cc.quantity;
      }

      // Count rarities
      rarityBreakdown[cc.card.rarity] =
        (rarityBreakdown[cc.card.rarity] || 0) + cc.quantity;
    }

    return {
      totalUniqueCards: uniqueCards.size,
      totalQuantity,
      collections: userCollections.length,
      colorBreakdown,
      rarityBreakdown,
    };
  }),
});
