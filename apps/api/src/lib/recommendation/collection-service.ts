/**
 * Collection Service
 *
 * Provides collection-first query operations for the recommendation system.
 * This is the primary data source for recommendations - we filter by owned
 * cards FIRST before scoring.
 */

import { db, collectionCards, cards, collections } from '@tcg-tracker/db';
import { eq, and, isNull } from 'drizzle-orm';
import { handlePromise } from '../utils.js';
import type {
  FormatType,
  CollectionCard,
  FormatCoverage,
  ViableArchetype,
  ManaColor,
} from './format-adapters/index.js';
import { FormatAdapterFactory } from './format-adapters/index.js';

// =============================================================================
// Types
// =============================================================================

export interface CollectionServiceError {
  code: string;
  message: string;
}

export type CollectionServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: CollectionServiceError };

// =============================================================================
// Collection Service
// =============================================================================

export class CollectionService {
  /**
   * Get all cards in a collection with their quantities
   * @param collectionId The collection UUID
   * @returns Array of collection cards with full card data
   */
  static async getCards(collectionId: string): Promise<CollectionServiceResult<CollectionCard[]>> {
    const { data, error } = await handlePromise(
      db
        .select({
          quantity: collectionCards.quantity,
          card: cards,
        })
        .from(collectionCards)
        .innerJoin(cards, eq(collectionCards.cardId, cards.id))
        .where(
          and(
            eq(collectionCards.collectionId, collectionId),
            isNull(collectionCards.deletedAt)
          )
        )
    );

    if (error) {
      return {
        data: null,
        error: {
          code: 'COLLECTION_FETCH_ERROR',
          message: 'Failed to fetch collection cards',
        },
      };
    }

    return {
      data: data.map((row) => ({
        card: row.card,
        quantity: row.quantity,
      })),
      error: null,
    };
  }

  /**
   * Get cards from a collection filtered by format legality
   * @param collectionId The collection UUID
   * @param format The format to filter by
   * @returns Array of legal cards in the collection
   */
  static async getCardsForFormat(
    collectionId: string,
    format: FormatType
  ): Promise<CollectionServiceResult<CollectionCard[]>> {
    const { data: allCards, error } = await CollectionService.getCards(collectionId);

    if (error) {
      return { data: null, error };
    }

    const adapter = FormatAdapterFactory.create(format);

    const legalCards = allCards.filter(
      (cc) => adapter.isLegal(cc.card) && !adapter.isBanned(cc.card)
    );

    return { data: legalCards, error: null };
  }

  /**
   * Get cards that are compatible with a commander's color identity
   * @param collectionId The collection UUID
   * @param format The format
   * @param colorIdentity The commander's color identity
   * @returns Array of color-compatible legal cards
   */
  static async getCardsForColorIdentity(
    collectionId: string,
    format: FormatType,
    colorIdentity: ManaColor[]
  ): Promise<CollectionServiceResult<CollectionCard[]>> {
    const { data: legalCards, error } = await CollectionService.getCardsForFormat(
      collectionId,
      format
    );

    if (error) {
      return { data: null, error };
    }

    const adapter = FormatAdapterFactory.create(format);
    const constraint = {
      allowedColors: colorIdentity,
      enforced: true,
    };

    const colorCompatible = legalCards.filter((cc) =>
      adapter.isColorCompatible(cc.card, constraint)
    );

    return { data: colorCompatible, error: null };
  }

  /**
   * Get format coverage analysis for a collection
   * @param collectionId The collection UUID
   * @param format The format to analyze
   * @returns Format coverage information
   */
  static async getFormatCoverage(
    collectionId: string,
    format: FormatType
  ): Promise<CollectionServiceResult<FormatCoverage>> {
    // Try to use cache, but proceed without it if unavailable
    let cachedResult: FormatCoverage | null = null;
    try {
      const { RecommendationCache } = await import('./cache.js');
      cachedResult = RecommendationCache.getFormatCoverage(collectionId, format);
      if (cachedResult) {
        return { data: cachedResult, error: null };
      }
    } catch (error) {
      // Cache module unavailable - proceed with direct computation
      // This is not a fatal error, we can compute coverage without caching
    }

    const { data: legalCards, error } = await CollectionService.getCardsForFormat(
      collectionId,
      format
    );

    if (error) {
      return { data: null, error };
    }

    // Analyze viable archetypes based on card pool
    const viableArchetypes = CollectionService.analyzeViableArchetypes(legalCards, format);

    // Try to use buildable decks analyzer, fall back to empty array if unavailable
    let buildableDecks: FormatCoverage['buildableDecks'] = [];
    try {
      const { BuildableDecksAnalyzer } = await import('./buildable-decks.js');
      buildableDecks = BuildableDecksAnalyzer.analyzeBuildableDecks(legalCards, format);
    } catch (error) {
      // Buildable decks analyzer unavailable - use empty array
      // This gracefully degrades functionality without breaking the API
      buildableDecks = [];
    }

    const coverage: FormatCoverage = {
      format,
      totalLegalCards: legalCards.length,
      viableArchetypes,
      buildableDecks,
    };

    // Try to cache the result, but don't fail if caching is unavailable
    try {
      const { RecommendationCache } = await import('./cache.js');
      RecommendationCache.setFormatCoverage(collectionId, format, coverage);
    } catch (error) {
      // Cache module unavailable - skip caching
      // Not a fatal error, we can return the result without caching
    }

    return {
      data: coverage,
      error: null,
    };
  }

  /**
   * Verify collection ownership
   * @param collectionId The collection UUID
   * @param userId The user UUID
   * @returns true if user owns the collection
   */
  static async verifyOwnership(
    collectionId: string,
    userId: string
  ): Promise<CollectionServiceResult<boolean>> {
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
      return {
        data: null,
        error: {
          code: 'COLLECTION_VERIFICATION_ERROR',
          message: 'Failed to verify collection ownership',
        },
      };
    }

    return { data: collection !== undefined, error: null };
  }

  /**
   * Get collection metadata
   * @param collectionId The collection UUID
   * @returns Collection information
   */
  static async getCollection(collectionId: string): Promise<
    CollectionServiceResult<{
      id: string;
      name: string;
      ownerId: string;
    }>
  > {
    const { data: collection, error } = await handlePromise(
      db.query.collections.findFirst({
        where: and(eq(collections.id, collectionId), isNull(collections.deletedAt)),
      })
    );

    if (error) {
      return {
        data: null,
        error: {
          code: 'COLLECTION_FETCH_ERROR',
          message: 'Failed to fetch collection',
        },
      };
    }

    if (!collection) {
      return {
        data: null,
        error: {
          code: 'COLLECTION_NOT_FOUND',
          message: 'Collection not found',
        },
      };
    }

    return {
      data: {
        id: collection.id,
        name: collection.name,
        ownerId: collection.ownerId,
      },
      error: null,
    };
  }

  // ===========================================================================
  // Private Analysis Methods
  // ===========================================================================

  /**
   * Analyze which archetypes are viable based on the card pool
   */
  private static analyzeViableArchetypes(
    cards: CollectionCard[],
    _format: FormatType
  ): ViableArchetype[] {
    const archetypes: ViableArchetype[] = [];

    // Define archetype signatures (simplified for Phase 1)
    const archetypeSignatures: Record<
      string,
      { keywords: string[]; types: string[]; threshold: number }
    > = {
      aggro: {
        keywords: ['haste', 'first strike', 'menace'],
        types: ['Creature'],
        threshold: 20,
      },
      control: {
        keywords: ['flash', 'hexproof', 'counter'],
        types: ['Instant', 'Sorcery'],
        threshold: 15,
      },
      midrange: {
        keywords: ['vigilance', 'lifelink', 'deathtouch'],
        types: ['Creature'],
        threshold: 15,
      },
      tribal: {
        keywords: [],
        types: ['Creature'],
        threshold: 25,
      },
    };

    for (const [archetype, signature] of Object.entries(archetypeSignatures)) {
      let matchCount = 0;
      const keyCards: string[] = [];

      for (const cc of cards) {
        const cardKeywords = cc.card.keywords ?? [];
        const cardTypes = cc.card.types ?? [];

        const hasKeyword = signature.keywords.some((kw) =>
          cardKeywords.some((ck) => ck.toLowerCase().includes(kw))
        );

        const hasType = signature.types.some((t) => cardTypes.includes(t));

        if (hasKeyword || hasType) {
          matchCount += cc.quantity;
          if (keyCards.length < 5) {
            keyCards.push(cc.card.name);
          }
        }
      }

      if (matchCount >= signature.threshold) {
        const completeness = Math.min(100, Math.round((matchCount / signature.threshold) * 50));
        archetypes.push({
          archetype,
          completeness,
          keyCards,
        });
      }
    }

    return archetypes.sort((a, b) => b.completeness - a.completeness);
  }

}
