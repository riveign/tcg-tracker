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
