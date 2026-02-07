/**
 * Recommendations Router
 *
 * API endpoints for the deck recommendation system.
 * Uses collection-first queries to only recommend cards the user owns.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../lib/trpc.js';
import { db, decks, deckCards, cards, collections, collectionCards } from '@tcg-tracker/db';
import { eq, and, isNull } from 'drizzle-orm';
import { handlePromise } from '../lib/utils.js';
import {
  FormatAdapterFactory,
  CollectionService,
  SynergyScorer,
  type FormatType,
  type DeckWithCards,
  type DeckCard,
  type DeckGapAnalysis,
  type CategoryAnalysis,
  type CategoryTarget,
  type CardCategory,
} from '../lib/recommendation/index.js';

// =============================================================================
// Input Schemas
// =============================================================================

const formatEnum = z.enum(['standard', 'modern', 'commander', 'brawl']);

const getSuggestionsSchema = z.object({
  deckId: z.string().uuid(),
  collectionId: z.string().uuid(), // REQUIRED - collection-first
  format: formatEnum, // REQUIRED
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
  categoryFilter: z
    .enum(['ramp', 'cardDraw', 'removal', 'boardWipe', 'threats', 'all'])
    .default('all'),
});

const getBuildableDecksSchema = z.object({
  collectionId: z.string().uuid(), // REQUIRED
  format: formatEnum, // REQUIRED
  limit: z.number().min(1).max(20).default(10),
});

const getFormatCoverageSchema = z.object({
  collectionId: z.string().uuid(), // REQUIRED
  format: formatEnum.optional(), // If omitted, returns all formats
});

const getArchetypeSchema = z.object({
  deckId: z.string().uuid(),
  format: formatEnum,
});

const getGapsSchema = z.object({
  deckId: z.string().uuid(),
  format: formatEnum,
});

// =============================================================================
// Helper Functions
// =============================================================================

async function verifyCollectionOwnership(
  collectionId: string,
  userId: string
): Promise<{ id: string; name: string; ownerId: string }> {
  const { data: collection, error } = await handlePromise(
    db.query.collections.findFirst({
      where: and(
        eq(collections.id, collectionId),
        eq(collections.ownerId, userId),
        isNull(collections.deletedAt)
      ),
    })
  );

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to verify collection ownership',
    });
  }

  if (!collection) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Collection not found or you do not have access to it',
    });
  }

  return {
    id: collection.id,
    name: collection.name,
    ownerId: collection.ownerId,
  };
}

async function loadDeckWithCards(
  deckId: string,
  userId: string
): Promise<DeckWithCards> {
  // Verify deck ownership
  const { data: deck, error: deckError } = await handlePromise(
    db.query.decks.findFirst({
      where: and(
        eq(decks.id, deckId),
        eq(decks.ownerId, userId),
        isNull(decks.deletedAt)
      ),
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

  // Load deck cards
  const { data: deckCardsList, error: cardsError } = await handlePromise(
    db
      .select({
        id: deckCards.id,
        quantity: deckCards.quantity,
        cardType: deckCards.cardType,
        cardId: deckCards.cardId,
        card: cards,
      })
      .from(deckCards)
      .innerJoin(cards, eq(deckCards.cardId, cards.id))
      .where(and(eq(deckCards.deckId, deckId), isNull(deckCards.deletedAt)))
  );

  if (cardsError) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch deck cards',
    });
  }

  // Convert to DeckCard format
  const deckCardsFormatted: DeckCard[] = deckCardsList.map((dc) => ({
    cardId: dc.cardId,
    quantity: dc.quantity,
    cardType: dc.cardType as 'mainboard' | 'sideboard' | 'commander',
    card: dc.card,
  }));

  // Find commander if present
  const commander = deckCardsFormatted.find((dc) => dc.cardType === 'commander');

  return {
    id: deck.id,
    name: deck.name,
    format: deck.format as FormatType | null,
    collectionId: deck.collectionId,
    cards: deckCardsFormatted,
    commander,
  };
}

function analyzeGaps(
  deck: DeckWithCards,
  adapter: ReturnType<typeof FormatAdapterFactory.create>
): DeckGapAnalysis {
  const targets = adapter.getGapTargets();
  const breakdown: Partial<Record<CardCategory, CategoryAnalysis>> = {};
  const recommendations: DeckGapAnalysis['recommendations'] = [];

  for (const [category, target] of Object.entries(targets) as [CardCategory, CategoryTarget][]) {
    const count = countCardsInCategory(deck.cards, category);
    const status = getStatus(count, target);
    const priority = getPriority(count, target);

    breakdown[category] = {
      current: count,
      minimum: target.min,
      optimal: target.opt,
      maximum: target.max,
      status,
      priority,
    };

    if (status === 'deficient') {
      recommendations.push({
        category,
        message: `Add more ${category} (currently ${count}/${target.opt})`,
        priority,
        suggestedCount: target.opt - count,
      });
    }
  }

  // Calculate overall completeness score
  let totalScore = 0;
  let categoryCount = 0;
  for (const analysis of Object.values(breakdown)) {
    if (analysis) {
      const categoryScore = Math.min(100, (analysis.current / analysis.optimal) * 100);
      totalScore += categoryScore;
      categoryCount++;
    }
  }

  const overallScore = categoryCount > 0 ? Math.round(totalScore / categoryCount) : 0;

  return {
    categoryBreakdown: breakdown,
    overallScore,
    recommendations: recommendations.sort((a, b) => b.priority - a.priority),
  };
}

function countCardsInCategory(cards: DeckCard[], category: CardCategory): number {
  // This is a simplified implementation - in Phase 2/3, we'll use more sophisticated classification
  let count = 0;

  for (const dc of cards) {
    if (dc.cardType !== 'mainboard') continue;

    const cardTypes = dc.card.types ?? [];
    const oracleText = dc.card.oracleText?.toLowerCase() ?? '';
    const keywords = dc.card.keywords ?? [];

    switch (category) {
      case 'lands':
        if (cardTypes.includes('Land')) count += dc.quantity;
        break;
      case 'creatures':
        if (cardTypes.includes('Creature')) count += dc.quantity;
        break;
      case 'removal':
        if (
          oracleText.includes('destroy') ||
          oracleText.includes('exile') ||
          oracleText.includes('deals damage')
        ) {
          count += dc.quantity;
        }
        break;
      case 'cardDraw':
        if (oracleText.includes('draw') && oracleText.includes('card')) {
          count += dc.quantity;
        }
        break;
      case 'ramp':
        if (oracleText.includes('add') && oracleText.includes('mana')) {
          count += dc.quantity;
        }
        break;
      case 'boardWipe':
        if (oracleText.includes('destroy all') || oracleText.includes('exile all')) {
          count += dc.quantity;
        }
        break;
      case 'threats':
        if (cardTypes.includes('Creature')) {
          const power = parseInt(dc.card.power ?? '0', 10);
          if (power >= 3) count += dc.quantity;
        }
        break;
      case 'protection':
        if (
          keywords.some((kw) =>
            ['Hexproof', 'Indestructible', 'Ward'].includes(kw)
          )
        ) {
          count += dc.quantity;
        }
        break;
      case 'tutor':
        if (oracleText.includes('search your library')) {
          count += dc.quantity;
        }
        break;
      case 'recursion':
        if (oracleText.includes('from your graveyard')) {
          count += dc.quantity;
        }
        break;
    }
  }

  return count;
}

function getStatus(
  count: number,
  target: CategoryTarget
): 'deficient' | 'adequate' | 'optimal' | 'excess' {
  if (count < target.min) return 'deficient';
  if (count > target.max) return 'excess';
  if (count >= target.opt) return 'optimal';
  return 'adequate';
}

function getPriority(count: number, target: CategoryTarget): number {
  if (count < target.min) {
    // Higher priority the further below minimum
    return Math.min(100, ((target.min - count) / target.min) * 100);
  }
  if (count < target.opt) {
    // Medium priority if below optimal
    return Math.min(50, ((target.opt - count) / target.opt) * 50);
  }
  return 0;
}

function detectArchetype(
  deck: DeckWithCards,
  adapter: ReturnType<typeof FormatAdapterFactory.create>
): string {
  // Simplified archetype detection for Phase 1
  const mainboardCards = deck.cards.filter((c) => c.cardType === 'mainboard');
  const totalCards = mainboardCards.reduce((sum, c) => sum + c.quantity, 0);

  if (totalCards === 0) return 'unknown';

  // Count creatures
  const creatureCount = mainboardCards
    .filter((c) => c.card.types?.includes('Creature'))
    .reduce((sum, c) => sum + c.quantity, 0);

  // Count instants/sorceries
  const spellCount = mainboardCards
    .filter(
      (c) =>
        c.card.types?.includes('Instant') || c.card.types?.includes('Sorcery')
    )
    .reduce((sum, c) => sum + c.quantity, 0);

  const creatureRatio = creatureCount / totalCards;
  const spellRatio = spellCount / totalCards;

  if (creatureRatio > 0.5) return 'aggro';
  if (spellRatio > 0.4) return 'control';
  if (creatureRatio > 0.3 && spellRatio > 0.2) return 'midrange';

  return 'unknown';
}

// =============================================================================
// Router Definition
// =============================================================================

export const recommendationsRouter = router({
  /**
   * Get card suggestions for a deck (collection-first)
   * Primary endpoint for the recommendation system
   */
  getSuggestions: protectedProcedure
    .input(getSuggestionsSchema)
    .query(async ({ input, ctx }) => {
      const { deckId, collectionId, format, limit, offset, categoryFilter } = input;

      // 1. Verify collection ownership
      await verifyCollectionOwnership(collectionId, ctx.user.userId);

      // 2. Load deck with cards and verify format match
      const deck = await loadDeckWithCards(deckId, ctx.user.userId);
      if (deck.format && deck.format !== format) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Deck format (${deck.format}) does not match requested format (${format})`,
        });
      }

      // 3. Get format adapter
      const adapter = FormatAdapterFactory.create(format);

      // 4. Load collection cards filtered by format
      const { data: collectionCardsList, error: collectionError } =
        await CollectionService.getCardsForFormat(collectionId, format);

      if (collectionError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: collectionError.message,
        });
      }

      // 5. Apply color constraints (for Commander/Brawl)
      const colorConstraint = adapter.getColorConstraint(deck);
      const colorFiltered = collectionCardsList.filter((cc) =>
        adapter.isColorCompatible(cc.card, colorConstraint)
      );

      // 6. Exclude cards already in deck
      const deckCardIds = new Set(deck.cards.map((c) => c.cardId));
      const candidates = colorFiltered.filter((cc) => !deckCardIds.has(cc.card.id));

      // 7. Analyze deck
      const archetype = detectArchetype(deck, adapter);
      const gaps = analyzeGaps(deck, adapter);
      const stage = adapter.getDeckStage(deck);

      // 8. Score candidates
      const scoredCandidates = await Promise.all(
        candidates.map(async (cc) => {
          const score = await SynergyScorer.score(cc.card, {
            deck,
            archetype,
            gaps,
            stage,
            adapter,
          });

          return {
            card: cc.card,
            score,
            categories: SynergyScorer.classifyCard(cc.card, adapter),
            inCollection: true,
          };
        })
      );

      // 9. Filter by category if specified
      const filtered =
        categoryFilter === 'all'
          ? scoredCandidates
          : scoredCandidates.filter((s) =>
              s.categories.includes(categoryFilter as CardCategory)
            );

      // 10. Sort and paginate
      filtered.sort((a, b) => b.score.total - a.score.total);

      return {
        suggestions: filtered.slice(offset, offset + limit),
        total: filtered.length,
        format,
        deckStage: stage,
        hasMore: offset + limit < filtered.length,
      };
    }),

  /**
   * Get buildable decks from collection for a format
   */
  getBuildableDecks: protectedProcedure
    .input(getBuildableDecksSchema)
    .query(async ({ input, ctx }) => {
      const { collectionId, format, limit } = input;

      await verifyCollectionOwnership(collectionId, ctx.user.userId);

      const { data: coverage, error } = await CollectionService.getFormatCoverage(
        collectionId,
        format
      );

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return {
        format,
        totalLegalCards: coverage.totalLegalCards,
        buildableDecks: coverage.buildableDecks.slice(0, limit),
        viableArchetypes: coverage.viableArchetypes,
      };
    }),

  /**
   * Get format coverage for a collection
   */
  getFormatCoverage: protectedProcedure
    .input(getFormatCoverageSchema)
    .query(async ({ input, ctx }) => {
      const { collectionId, format } = input;

      await verifyCollectionOwnership(collectionId, ctx.user.userId);

      if (format) {
        const { data: coverage, error } = await CollectionService.getFormatCoverage(
          collectionId,
          format
        );

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }

        return coverage;
      }

      // Return coverage for all formats
      const formats: FormatType[] = ['standard', 'modern', 'commander', 'brawl'];
      const results = await Promise.all(
        formats.map(async (f) => {
          const { data, error } = await CollectionService.getFormatCoverage(collectionId, f);
          if (error) {
            return {
              format: f,
              totalLegalCards: 0,
              viableArchetypes: [],
              buildableDecks: [],
            };
          }
          return data;
        })
      );

      return {
        standard: results[0],
        modern: results[1],
        commander: results[2],
        brawl: results[3],
      };
    }),

  /**
   * Get archetype analysis for a deck (format-aware)
   */
  getArchetype: protectedProcedure.input(getArchetypeSchema).query(async ({ input, ctx }) => {
    const { deckId, format } = input;

    const deck = await loadDeckWithCards(deckId, ctx.user.userId);
    const adapter = FormatAdapterFactory.create(format);

    const archetype = detectArchetype(deck, adapter);
    const modifiers = adapter.getArchetypeModifiers(archetype);

    return {
      archetype,
      modifiers,
      confidence: archetype === 'unknown' ? 0 : 0.7, // Simplified for Phase 1
    };
  }),

  /**
   * Get gap analysis for a deck (format-aware)
   */
  getGaps: protectedProcedure.input(getGapsSchema).query(async ({ input, ctx }) => {
    const { deckId, format } = input;

    const deck = await loadDeckWithCards(deckId, ctx.user.userId);
    const adapter = FormatAdapterFactory.create(format);

    return analyzeGaps(deck, adapter);
  }),
});
