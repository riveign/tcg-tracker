/**
 * React Query hooks for the MTG Deck Recommendation System
 *
 * Provides typed hooks for all recommendation API endpoints with
 * proper caching, error handling, and invalidation utilities.
 */

import { trpc } from '@/lib/trpc';
import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server';
import type { AppRouter } from '@tcg-tracker/api/types';

// =============================================================================
// Type Inference from tRPC Router
// =============================================================================

type RouterOutput = inferRouterOutputs<AppRouter>;
type RouterInput = inferRouterInputs<AppRouter>;

// Input types
export type SuggestionsInput = RouterInput['recommendations']['getSuggestions'];
export type BuildableDecksInput = RouterInput['recommendations']['getBuildableDecks'];
export type FormatCoverageInput = RouterInput['recommendations']['getFormatCoverage'];
export type MultiFormatComparisonInput = RouterInput['recommendations']['getMultiFormatComparison'];
export type ArchetypeInput = RouterInput['recommendations']['getArchetype'];
export type GapsInput = RouterInput['recommendations']['getGaps'];

// Output types
export type SuggestionsOutput = RouterOutput['recommendations']['getSuggestions'];
export type BuildableDecksOutput = RouterOutput['recommendations']['getBuildableDecks'];
export type FormatCoverageOutput = RouterOutput['recommendations']['getFormatCoverage'];
export type MultiFormatComparisonOutput = RouterOutput['recommendations']['getMultiFormatComparison'];
export type ArchetypeOutput = RouterOutput['recommendations']['getArchetype'];
export type GapsOutput = RouterOutput['recommendations']['getGaps'];

// =============================================================================
// Cache Time Configuration (in milliseconds)
// =============================================================================

const CACHE_TIMES = {
  suggestions: 2 * 60 * 1000, // 2 min - changes with collection/deck updates
  buildableDecks: 5 * 60 * 1000, // 5 min - stable unless collection changes
  formatCoverage: 5 * 60 * 1000, // 5 min - stable
  archetype: 10 * 60 * 1000, // 10 min - stable for same deck
  gaps: 5 * 60 * 1000, // 5 min - stable for same deck
  multiFormatComparison: 5 * 60 * 1000, // 5 min
} as const;

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get card suggestions for a deck from collection
 *
 * @param params - deckId, collectionId, format, limit, offset, categoryFilter
 * @param options - Additional React Query options
 * @returns Card suggestions with scores and pagination
 */
export function useSuggestions(
  params: SuggestionsInput | undefined,
  options?: { enabled?: boolean }
) {
  return trpc.recommendations.getSuggestions.useQuery(params!, {
    enabled: Boolean(params?.deckId && params?.collectionId && params?.format) && (options?.enabled !== false),
    staleTime: CACHE_TIMES.suggestions,
  });
}

/**
 * Get buildable decks from collection for a format
 *
 * @param params - collectionId, format, limit
 * @param options - Additional React Query options
 * @returns Buildable decks and viable archetypes
 */
export function useBuildableDecks(
  params: BuildableDecksInput | undefined,
  options?: { enabled?: boolean }
) {
  return trpc.recommendations.getBuildableDecks.useQuery(params!, {
    enabled: Boolean(params?.collectionId && params?.format) && (options?.enabled !== false),
    staleTime: CACHE_TIMES.buildableDecks,
  });
}

/**
 * Get format coverage for a collection
 *
 * @param params - collectionId, format (optional - returns all formats if omitted)
 * @param options - Additional React Query options
 * @returns Format coverage metrics
 */
export function useFormatCoverage(
  params: FormatCoverageInput | undefined,
  options?: { enabled?: boolean }
) {
  return trpc.recommendations.getFormatCoverage.useQuery(params!, {
    enabled: Boolean(params?.collectionId) && (options?.enabled !== false),
    staleTime: CACHE_TIMES.formatCoverage,
  });
}

/**
 * Compare deck viability across multiple formats
 *
 * @param params - collectionId, deckIds[]
 * @param options - Additional React Query options
 * @returns Format viability comparison for each deck
 */
export function useMultiFormatComparison(
  params: MultiFormatComparisonInput | undefined,
  options?: { enabled?: boolean }
) {
  return trpc.recommendations.getMultiFormatComparison.useQuery(params!, {
    enabled: Boolean(params?.collectionId && params?.deckIds?.length) && (options?.enabled !== false),
    staleTime: CACHE_TIMES.multiFormatComparison,
  });
}

/**
 * Get archetype analysis for a deck
 *
 * @param params - deckId, format
 * @param options - Additional React Query options
 * @returns Detected archetype with confidence
 */
export function useArchetype(
  params: ArchetypeInput | undefined,
  options?: { enabled?: boolean }
) {
  return trpc.recommendations.getArchetype.useQuery(params!, {
    enabled: Boolean(params?.deckId && params?.format) && (options?.enabled !== false),
    staleTime: CACHE_TIMES.archetype,
  });
}

/**
 * Get gap analysis for a deck
 *
 * @param params - deckId, format
 * @param options - Additional React Query options
 * @returns Category breakdown and recommendations
 */
export function useGaps(
  params: GapsInput | undefined,
  options?: { enabled?: boolean }
) {
  return trpc.recommendations.getGaps.useQuery(params!, {
    enabled: Boolean(params?.deckId && params?.format) && (options?.enabled !== false),
    staleTime: CACHE_TIMES.gaps,
  });
}

// =============================================================================
// Cache Invalidation Utilities
// =============================================================================

/**
 * Hook for invalidating recommendation caches
 *
 * Use after deck or collection mutations to refresh recommendation data.
 *
 * @returns Object with invalidation methods for each endpoint
 */
export function useInvalidateRecommendations() {
  const utils = trpc.useUtils();

  return {
    /** Invalidate suggestions for a specific deck */
    invalidateSuggestions: (params?: Partial<SuggestionsInput>) =>
      utils.recommendations.getSuggestions.invalidate(params as SuggestionsInput),

    /** Invalidate buildable decks for a collection */
    invalidateBuildableDecks: (params?: Partial<BuildableDecksInput>) =>
      utils.recommendations.getBuildableDecks.invalidate(params as BuildableDecksInput),

    /** Invalidate format coverage for a collection */
    invalidateFormatCoverage: (params?: Partial<FormatCoverageInput>) =>
      utils.recommendations.getFormatCoverage.invalidate(params as FormatCoverageInput),

    /** Invalidate multi-format comparison */
    invalidateMultiFormatComparison: (params?: Partial<MultiFormatComparisonInput>) =>
      utils.recommendations.getMultiFormatComparison.invalidate(params as MultiFormatComparisonInput),

    /** Invalidate archetype for a deck */
    invalidateArchetype: (params?: Partial<ArchetypeInput>) =>
      utils.recommendations.getArchetype.invalidate(params as ArchetypeInput),

    /** Invalidate gaps for a deck */
    invalidateGaps: (params?: Partial<GapsInput>) =>
      utils.recommendations.getGaps.invalidate(params as GapsInput),

    /** Invalidate all recommendation caches */
    invalidateAll: () => utils.recommendations.invalidate(),
  };
}
