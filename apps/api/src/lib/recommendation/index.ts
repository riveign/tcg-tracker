/**
 * Recommendation Engine Module
 *
 * Provides deck building recommendations based on user's collection
 * with format-specific rules and scoring.
 */

// Format Adapters
export {
  FormatAdapterFactory,
  createFormatAdapter,
  StandardAdapter,
  CommanderAdapter,
} from './format-adapters/index.js';

export type {
  FormatType,
  FormatAdapter,
  DeckSizeConfig,
  CopyLimitConfig,
  CategoryTargets,
  CategoryTarget,
  ScoreWeights,
  StageThresholds,
  ColorConstraint,
  ArchetypeModifiers,
  DeckWithCards,
  DeckCard,
  DeckStage,
  ValidationResult,
  ValidationError,
  LegalityStatus,
  ManaColor,
  CardCategory,
  CardType,
  SynergyScore,
  ScoreBreakdown,
  ScoringContext,
  CategoryStatus,
  CategoryAnalysis,
  DeckGapAnalysis,
  GapRecommendation,
  CollectionCard,
  FormatCoverage,
  ViableArchetype,
  BuildableDeck,
  CardSuggestion,
  RecommendationResult,
} from './format-adapters/index.js';

// Collection Service
export { CollectionService } from './collection-service.js';
export type { CollectionServiceError, CollectionServiceResult } from './collection-service.js';

// Synergy Scorer
export { SynergyScorer } from './synergy-scorer.js';

// Buildable Decks Analyzer
export { BuildableDecksAnalyzer } from './buildable-decks.js';
export type {
  DeckTemplate,
  DeckTemplateCard,
  BuildableAnalysis,
} from './buildable-decks.js';

// Progressive Updates
export { ProgressiveUpdates } from './progressive-updates.js';
export type {
  CollectionChangeEvent,
  DeckImpactAnalysis,
  CategoryImprovement,
  ProgressiveNotification,
  ArchetypeUnlocked,
  DeckBuildable,
} from './progressive-updates.js';

// Cache
export { RecommendationCache } from './cache.js';
export type {
  CacheEntry,
  CacheStrategy,
  CacheStats,
} from './cache.js';
