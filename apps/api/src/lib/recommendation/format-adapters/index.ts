/**
 * Format Adapters Module
 *
 * Provides format-specific deck building rules and validation.
 */

// Types
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
} from './types.js';

// Adapters
export { StandardAdapter } from './standard.js';
export { CommanderAdapter } from './commander.js';

// Factory
export { FormatAdapterFactory, createFormatAdapter } from './factory.js';
