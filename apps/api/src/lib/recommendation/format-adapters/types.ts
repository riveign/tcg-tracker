/**
 * Format Adapter Types
 *
 * Defines the interface for format-specific deck building rules.
 * Each adapter implements format-specific validation, scoring weights,
 * and deck composition targets.
 */

import type { Card } from '@tcg-tracker/db';

// =============================================================================
// Core Format Types
// =============================================================================

export type FormatType = 'standard' | 'modern' | 'commander' | 'brawl';

export type LegalityStatus = 'legal' | 'not_legal' | 'banned' | 'restricted';

export type CardCategory =
  | 'lands'
  | 'creatures'
  | 'removal'
  | 'cardDraw'
  | 'ramp'
  | 'boardWipe'
  | 'protection'
  | 'threats'
  | 'tutor'
  | 'recursion';

export type DeckStage = 'early' | 'mid' | 'late' | 'complete';

export type CardType = 'mainboard' | 'sideboard' | 'commander';

// =============================================================================
// Configuration Interfaces
// =============================================================================

export interface DeckSizeConfig {
  mainboard: {
    min: number;
    max: number | null;
    optimal: number;
  };
  sideboard?: {
    min: number;
    max: number;
  };
  commander?: boolean;
}

export interface CopyLimitConfig {
  default: number;
  exceptions: Map<string, number>; // cardName -> limit (Infinity for basic lands)
}

export interface CategoryTarget {
  min: number;
  opt: number;
  max: number;
}

export type CategoryTargets = Partial<Record<CardCategory, CategoryTarget>>;

export interface ScoreWeights {
  mechanical: number;
  strategic: number;
  formatContext: number;
  theme: number;
}

export interface StageThresholds {
  early: number; // Cards below this = early stage
  mid: number;   // Cards below this = mid stage
  late: number;  // Cards below this = late stage
  // >= late = complete
}

// =============================================================================
// Validation Types
// =============================================================================

export interface ValidationError {
  code: string;
  message: string;
  cardId?: string;
  cardName?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// =============================================================================
// Color Identity Types
// =============================================================================

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G';

export interface ColorConstraint {
  allowedColors: ManaColor[];
  enforced: boolean; // Commander enforces, Standard doesn't
}

// =============================================================================
// Archetype Types
// =============================================================================

export interface ArchetypeModifiers {
  categoryWeights: Partial<Record<CardCategory, number>>;
  preferredKeywords: string[];
  avoidKeywords: string[];
}

// =============================================================================
// Deck Types
// =============================================================================

export interface DeckCard {
  cardId: string;
  quantity: number;
  cardType: CardType;
  card: Card;
}

export interface DeckWithCards {
  id: string;
  name: string;
  format: FormatType | null;
  collectionId: string | null;
  cards: DeckCard[];
  commander?: DeckCard;
  commanderId?: string | null;
  colors?: ManaColor[];
  strategy?: string | null;
}

// =============================================================================
// Format Adapter Interface
// =============================================================================

/**
 * FormatAdapter provides format-specific rules and configuration
 * for deck building and recommendation scoring.
 */
export interface FormatAdapter {
  /**
   * The format this adapter handles
   */
  readonly format: FormatType;

  /**
   * Deck size constraints for this format
   */
  readonly deckSize: DeckSizeConfig;

  /**
   * Copy limit rules (4-of for Standard, singleton for Commander)
   */
  readonly copyLimit: CopyLimitConfig;

  // =========================================================================
  // Legality Checks
  // =========================================================================

  /**
   * Check if a card is legal in this format
   * @param card The card to check
   * @returns true if the card is legal
   */
  isLegal(card: Card): boolean;

  /**
   * Check if a card is banned in this format
   * @param card The card to check
   * @returns true if the card is banned
   */
  isBanned(card: Card): boolean;

  /**
   * Get the legality status of a card
   * @param card The card to check
   * @returns The legality status
   */
  getLegalityStatus(card: Card): LegalityStatus;

  // =========================================================================
  // Deck Validation
  // =========================================================================

  /**
   * Validate a deck against format rules
   * @param deck The deck to validate
   * @returns Validation result with errors and warnings
   */
  validateDeck(deck: DeckWithCards): ValidationResult;

  /**
   * Check if a card can be added to a deck (copy limit, color identity, etc.)
   * @param card The card to add
   * @param deck The current deck state
   * @returns Validation result
   */
  canAddCard(card: Card, deck: DeckWithCards): ValidationResult;

  // =========================================================================
  // Scoring Configuration
  // =========================================================================

  /**
   * Get score weights for this format
   * @returns Score weights for synergy calculation
   */
  getScoreWeights(): ScoreWeights;

  /**
   * Get category targets for gap analysis
   * @returns Target counts for each card category
   */
  getGapTargets(): CategoryTargets;

  /**
   * Get deck stage thresholds based on card count
   * @returns Thresholds for determining deck building stage
   */
  getDeckStageThresholds(): StageThresholds;

  /**
   * Determine the current stage of deck building
   * @param deck The deck to analyze
   * @returns The current deck stage
   */
  getDeckStage(deck: DeckWithCards): DeckStage;

  // =========================================================================
  // Format-Specific Logic
  // =========================================================================

  /**
   * Get color constraints for the deck (Commander color identity)
   * @param deck The deck (needs commander for EDH formats)
   * @returns Color constraint for card filtering
   */
  getColorConstraint(deck: DeckWithCards): ColorConstraint;

  /**
   * Check if a card is compatible with the deck's color constraint
   * @param card The card to check
   * @param constraint The color constraint to check against
   * @returns true if the card is color-compatible
   */
  isColorCompatible(card: Card, constraint: ColorConstraint): boolean;

  /**
   * Get archetype-specific modifiers for scoring
   * @param archetype The detected archetype
   * @returns Modifiers for scoring adjustments
   */
  getArchetypeModifiers(archetype: string): ArchetypeModifiers;

  /**
   * Get optimal CMC position for the deck's current state
   * @param deck The deck to analyze
   * @returns The optimal CMC for new cards
   */
  getOptimalCMCPosition(deck: DeckWithCards): number;

  /**
   * Calculate how many copies of a card are allowed
   * @param card The card to check
   * @returns Maximum allowed copies (Infinity for basic lands)
   */
  getMaxCopies(card: Card): number;
}

// =============================================================================
// Helper Types for Scoring
// =============================================================================

export interface SynergyScore {
  total: number;           // 0-100 overall score
  mechanical: number;      // 0-40 keyword/ability synergy
  strategic: number;       // 0-30 archetype/role synergy
  formatContext: number;   // 0-20 format-specific bonus
  theme: number;           // 0-10 tribal/flavor synergy
  breakdown: ScoreBreakdown[];
}

export interface ScoreBreakdown {
  category: 'mechanical' | 'strategic' | 'formatContext' | 'theme';
  reason: string;
  points: number;
  weight: number;
}

export interface ScoringContext {
  deck: DeckWithCards;
  archetype: string;
  gaps: DeckGapAnalysis;
  stage: DeckStage;
  adapter: FormatAdapter;
  deckStrategy?: string | null;
  deckColors?: ManaColor[];
}

// =============================================================================
// Gap Analysis Types
// =============================================================================

export type CategoryStatus = 'deficient' | 'adequate' | 'optimal' | 'excess';

export interface CategoryAnalysis {
  current: number;
  minimum: number;
  optimal: number;
  maximum: number;
  status: CategoryStatus;
  priority: number; // 0-100, higher = more urgent
}

export interface DeckGapAnalysis {
  categoryBreakdown: Partial<Record<CardCategory, CategoryAnalysis>>;
  overallScore: number; // 0-100 completeness score
  recommendations: GapRecommendation[];
}

export interface GapRecommendation {
  category: CardCategory;
  message: string;
  priority: number;
  suggestedCount: number;
}

// =============================================================================
// Collection Types
// =============================================================================

export interface CollectionCard {
  card: Card;
  quantity: number;
}

export interface FormatCoverage {
  format: FormatType;
  totalLegalCards: number;
  viableArchetypes: ViableArchetype[];
  buildableDecks: BuildableDeck[];
}

export interface ViableArchetype {
  archetype: string;
  completeness: number;
  keyCards: string[];
}

export interface BuildableDeck {
  archetype: string;
  completeness: number;
  coreCardsOwned: string[];
  missingCount: number;
  missingKeyCards: string[];
}

// =============================================================================
// API Response Types
// =============================================================================

export interface CardSuggestion {
  card: Card;
  score: SynergyScore;
  categories: CardCategory[];
  inCollection: boolean;
}

export interface RecommendationResult {
  suggestions: CardSuggestion[];
  total: number;
  format: FormatType;
  deckStage: DeckStage;
  hasMore: boolean;
}
