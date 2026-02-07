/**
 * Recommendation Cache
 *
 * Caching layer for recommendation queries to improve performance.
 * Implements TTL-based caching with format-specific strategies.
 */

import type {
  FormatType,
  FormatCoverage,
  BuildableDeck,
  CardSuggestion,
} from './format-adapters/index.js';

// =============================================================================
// Types
// =============================================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number;
}

export interface CacheStrategy {
  format: FormatType;
  ttl: number;
  invalidateOn: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

// =============================================================================
// Cache Strategies
// =============================================================================

const CACHE_STRATEGIES: Record<FormatType, CacheStrategy> = {
  standard: {
    format: 'standard',
    ttl: 1000 * 60 * 60 * 24, // 24 hours (set rotation)
    invalidateOn: ['set_release', 'ban_announcement'],
  },
  modern: {
    format: 'modern',
    ttl: 1000 * 60 * 60 * 24 * 7, // 7 days (stable format)
    invalidateOn: ['ban_announcement'],
  },
  commander: {
    format: 'commander',
    ttl: 1000 * 60 * 60 * 24 * 7, // 7 days
    invalidateOn: ['ban_announcement', 'new_commander_release'],
  },
  brawl: {
    format: 'brawl',
    ttl: 1000 * 60 * 60 * 24, // 24 hours (Standard rotation affects)
    invalidateOn: ['set_release', 'ban_announcement'],
  },
};

// =============================================================================
// Recommendation Cache
// =============================================================================

export class RecommendationCache {
  private static formatCoverageCache = new Map<string, CacheEntry<FormatCoverage>>();
  private static buildableDecksCache = new Map<string, CacheEntry<BuildableDeck[]>>();
  private static suggestionsCache = new Map<string, CacheEntry<CardSuggestion[]>>();

  // Statistics tracking
  private static stats = {
    formatCoverage: { hits: 0, misses: 0 },
    buildableDecks: { hits: 0, misses: 0 },
    suggestions: { hits: 0, misses: 0 },
  };

  // ==========================================================================
  // Format Coverage Cache
  // ==========================================================================

  /**
   * Get cached format coverage
   * @param collectionId The collection ID
   * @param format The format
   * @returns Cached coverage or null if not found/expired
   */
  static getFormatCoverage(
    collectionId: string,
    format: FormatType
  ): FormatCoverage | null {
    const key = `${collectionId}:${format}`;
    const entry = RecommendationCache.formatCoverageCache.get(key);

    if (!entry) {
      RecommendationCache.stats.formatCoverage.misses++;
      return null;
    }

    // Check if expired
    const now = Date.now();
    const age = now - entry.timestamp.getTime();

    if (age > entry.ttl) {
      RecommendationCache.formatCoverageCache.delete(key);
      RecommendationCache.stats.formatCoverage.misses++;
      return null;
    }

    RecommendationCache.stats.formatCoverage.hits++;
    return entry.data;
  }

  /**
   * Set format coverage cache
   * @param collectionId The collection ID
   * @param format The format
   * @param data The coverage data
   */
  static setFormatCoverage(
    collectionId: string,
    format: FormatType,
    data: FormatCoverage
  ): void {
    const key = `${collectionId}:${format}`;
    const strategy = CACHE_STRATEGIES[format];

    RecommendationCache.formatCoverageCache.set(key, {
      data,
      timestamp: new Date(),
      ttl: strategy.ttl,
    });
  }

  /**
   * Invalidate format coverage cache for a collection
   * @param collectionId The collection ID
   * @param format Optional format to invalidate (all if not specified)
   */
  static invalidateFormatCoverage(
    collectionId: string,
    format?: FormatType
  ): void {
    if (format) {
      const key = `${collectionId}:${format}`;
      RecommendationCache.formatCoverageCache.delete(key);
    } else {
      // Invalidate all formats for this collection
      const formats: FormatType[] = ['standard', 'modern', 'commander', 'brawl'];
      for (const f of formats) {
        const key = `${collectionId}:${f}`;
        RecommendationCache.formatCoverageCache.delete(key);
      }
    }
  }

  // ==========================================================================
  // Buildable Decks Cache
  // ==========================================================================

  /**
   * Get cached buildable decks
   * @param collectionId The collection ID
   * @param format The format
   * @returns Cached decks or null if not found/expired
   */
  static getBuildableDecks(
    collectionId: string,
    format: FormatType
  ): BuildableDeck[] | null {
    const key = `${collectionId}:${format}`;
    const entry = RecommendationCache.buildableDecksCache.get(key);

    if (!entry) {
      RecommendationCache.stats.buildableDecks.misses++;
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp.getTime();

    if (age > entry.ttl) {
      RecommendationCache.buildableDecksCache.delete(key);
      RecommendationCache.stats.buildableDecks.misses++;
      return null;
    }

    RecommendationCache.stats.buildableDecks.hits++;
    return entry.data;
  }

  /**
   * Set buildable decks cache
   * @param collectionId The collection ID
   * @param format The format
   * @param data The buildable decks data
   */
  static setBuildableDecks(
    collectionId: string,
    format: FormatType,
    data: BuildableDeck[]
  ): void {
    const key = `${collectionId}:${format}`;
    const strategy = CACHE_STRATEGIES[format];

    RecommendationCache.buildableDecksCache.set(key, {
      data,
      timestamp: new Date(),
      ttl: strategy.ttl,
    });
  }

  /**
   * Invalidate buildable decks cache for a collection
   * @param collectionId The collection ID
   * @param format Optional format to invalidate (all if not specified)
   */
  static invalidateBuildableDecks(
    collectionId: string,
    format?: FormatType
  ): void {
    if (format) {
      const key = `${collectionId}:${format}`;
      RecommendationCache.buildableDecksCache.delete(key);
    } else {
      const formats: FormatType[] = ['standard', 'modern', 'commander', 'brawl'];
      for (const f of formats) {
        const key = `${collectionId}:${f}`;
        RecommendationCache.buildableDecksCache.delete(key);
      }
    }
  }

  // ==========================================================================
  // Suggestions Cache
  // ==========================================================================

  /**
   * Get cached suggestions
   * @param deckId The deck ID
   * @param collectionId The collection ID
   * @param format The format
   * @returns Cached suggestions or null if not found/expired
   */
  static getSuggestions(
    deckId: string,
    collectionId: string,
    format: FormatType
  ): CardSuggestion[] | null {
    const key = `${deckId}:${collectionId}:${format}`;
    const entry = RecommendationCache.suggestionsCache.get(key);

    if (!entry) {
      RecommendationCache.stats.suggestions.misses++;
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp.getTime();

    if (age > entry.ttl) {
      RecommendationCache.suggestionsCache.delete(key);
      RecommendationCache.stats.suggestions.misses++;
      return null;
    }

    RecommendationCache.stats.suggestions.hits++;
    return entry.data;
  }

  /**
   * Set suggestions cache
   * @param deckId The deck ID
   * @param collectionId The collection ID
   * @param format The format
   * @param data The suggestions data
   */
  static setSuggestions(
    deckId: string,
    collectionId: string,
    format: FormatType,
    data: CardSuggestion[]
  ): void {
    const key = `${deckId}:${collectionId}:${format}`;
    const strategy = CACHE_STRATEGIES[format];

    RecommendationCache.suggestionsCache.set(key, {
      data,
      timestamp: new Date(),
      ttl: strategy.ttl,
    });
  }

  /**
   * Invalidate suggestions cache for a deck
   * @param deckId The deck ID
   */
  static invalidateSuggestions(deckId: string): void {
    // Delete all entries that start with this deck ID
    const keysToDelete: string[] = [];
    for (const key of RecommendationCache.suggestionsCache.keys()) {
      if (key.startsWith(`${deckId}:`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      RecommendationCache.suggestionsCache.delete(key);
    }
  }

  // ==========================================================================
  // Collection Change Handling
  // ==========================================================================

  /**
   * Handle collection change event (invalidates relevant caches)
   * @param collectionId The collection ID
   */
  static onCollectionChanged(collectionId: string): void {
    // Invalidate all caches related to this collection
    RecommendationCache.invalidateFormatCoverage(collectionId);
    RecommendationCache.invalidateBuildableDecks(collectionId);

    // Don't invalidate suggestions cache - it will expire naturally
    // This allows users to see stable suggestions even after adding cards
  }

  /**
   * Handle deck change event (invalidates suggestions for that deck)
   * @param deckId The deck ID
   */
  static onDeckChanged(deckId: string): void {
    RecommendationCache.invalidateSuggestions(deckId);
  }

  /**
   * Handle format ban list update
   * @param format The format that was updated
   */
  static onBanListUpdate(format: FormatType): void {
    // Invalidate all caches for this format
    for (const key of RecommendationCache.formatCoverageCache.keys()) {
      if (key.endsWith(`:${format}`)) {
        RecommendationCache.formatCoverageCache.delete(key);
      }
    }

    for (const key of RecommendationCache.buildableDecksCache.keys()) {
      if (key.endsWith(`:${format}`)) {
        RecommendationCache.buildableDecksCache.delete(key);
      }
    }

    for (const key of RecommendationCache.suggestionsCache.keys()) {
      if (key.endsWith(`:${format}`)) {
        RecommendationCache.suggestionsCache.delete(key);
      }
    }
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get cache statistics
   * @returns Cache statistics for all caches
   */
  static getStats(): Record<string, CacheStats> {
    const calculateStats = (cache: { hits: number; misses: number }, size: number) => {
      const total = cache.hits + cache.misses;
      return {
        hits: cache.hits,
        misses: cache.misses,
        hitRate: total > 0 ? (cache.hits / total) * 100 : 0,
        size,
      };
    };

    return {
      formatCoverage: calculateStats(
        RecommendationCache.stats.formatCoverage,
        RecommendationCache.formatCoverageCache.size
      ),
      buildableDecks: calculateStats(
        RecommendationCache.stats.buildableDecks,
        RecommendationCache.buildableDecksCache.size
      ),
      suggestions: calculateStats(
        RecommendationCache.stats.suggestions,
        RecommendationCache.suggestionsCache.size
      ),
    };
  }

  /**
   * Reset cache statistics
   */
  static resetStats(): void {
    RecommendationCache.stats = {
      formatCoverage: { hits: 0, misses: 0 },
      buildableDecks: { hits: 0, misses: 0 },
      suggestions: { hits: 0, misses: 0 },
    };
  }

  /**
   * Clear all caches
   */
  static clearAll(): void {
    RecommendationCache.formatCoverageCache.clear();
    RecommendationCache.buildableDecksCache.clear();
    RecommendationCache.suggestionsCache.clear();
    RecommendationCache.resetStats();
  }
}
