/**
 * Banned Lists Module
 *
 * Provides utilities for checking card legality and banned status across formats.
 * This module integrates with Scryfall's legality data stored in the card.gameData field.
 *
 * Legality sources:
 * - Scryfall API (card.gameData.legalities)
 * - Each format has legality status: 'legal', 'not_legal', 'banned', 'restricted'
 */

import type { Card } from '@tcg-tracker/db';
import type { FormatType, LegalityStatus } from './types.js';

// =============================================================================
// Type Definitions
// =============================================================================

interface LegalityData {
  standard?: string;
  modern?: string;
  commander?: string;
  brawl?: string;
  [key: string]: string | undefined;
}

// =============================================================================
// Legality Checking
// =============================================================================

/**
 * Get the legality status of a card for a specific format
 *
 * @param card The card to check
 * @param format The format to check legality for
 * @returns The legality status
 *
 * @example
 * ```typescript
 * const card = await getCard('lightning-bolt');
 * const status = getLegalityStatus(card, 'standard');
 * if (status === 'legal') {
 *   // Card is legal in Standard
 * }
 * ```
 */
export function getLegalityStatus(card: Card, format: FormatType): LegalityStatus {
  const gameData = card.gameData as Record<string, unknown> | null;
  if (!gameData) return 'not_legal';

  const legalities = gameData.legalities as LegalityData | undefined;
  if (!legalities) return 'not_legal';

  // Special case for Brawl: fall back to Standard if no explicit Brawl legality
  if (format === 'brawl') {
    const brawlStatus = legalities.brawl;
    if (brawlStatus) {
      return normalizeLegalityStatus(brawlStatus);
    }
    // Fall back to Standard legality for Brawl
    const standardStatus = legalities.standard;
    if (standardStatus) {
      return normalizeLegalityStatus(standardStatus);
    }
  }

  const status = legalities[format];
  if (!status) return 'not_legal';

  return normalizeLegalityStatus(status);
}

/**
 * Check if a card is legal in a format (including restricted)
 *
 * @param card The card to check
 * @param format The format to check
 * @returns true if the card is legal or restricted
 *
 * @example
 * ```typescript
 * if (isLegal(card, 'modern')) {
 *   // Card can be played in Modern
 * }
 * ```
 */
export function isLegal(card: Card, format: FormatType): boolean {
  const status = getLegalityStatus(card, format);
  return status === 'legal' || status === 'restricted';
}

/**
 * Check if a card is banned in a format
 *
 * @param card The card to check
 * @param format The format to check
 * @returns true if the card is banned
 *
 * @example
 * ```typescript
 * if (isBanned(card, 'modern')) {
 *   // Card is banned in Modern
 * }
 * ```
 */
export function isBanned(card: Card, format: FormatType): boolean {
  const status = getLegalityStatus(card, format);
  return status === 'banned';
}

/**
 * Check if a card is restricted in a format
 *
 * @param card The card to check
 * @param format The format to check
 * @returns true if the card is restricted
 *
 * @example
 * ```typescript
 * if (isRestricted(card, 'vintage')) {
 *   // Card is restricted to 1 copy in Vintage
 * }
 * ```
 */
export function isRestricted(card: Card, format: FormatType): boolean {
  const status = getLegalityStatus(card, format);
  return status === 'restricted';
}

// =============================================================================
// Bulk Operations
// =============================================================================

/**
 * Filter a list of cards to only those legal in a format
 *
 * @param cards The cards to filter
 * @param format The format to check
 * @returns Only cards that are legal in the format
 *
 * @example
 * ```typescript
 * const collection = await getCollectionCards();
 * const modernLegal = filterLegalCards(collection, 'modern');
 * ```
 */
export function filterLegalCards(cards: Card[], format: FormatType): Card[] {
  return cards.filter((card) => isLegal(card, format));
}

/**
 * Filter a list of cards to remove banned cards
 *
 * @param cards The cards to filter
 * @param format The format to check
 * @returns Only cards that are not banned
 *
 * @example
 * ```typescript
 * const deckCards = await getDeckCards();
 * const noBanned = filterBannedCards(deckCards, 'commander');
 * ```
 */
export function filterBannedCards(cards: Card[], format: FormatType): Card[] {
  return cards.filter((card) => !isBanned(card, format));
}

/**
 * Get all banned cards from a list
 *
 * @param cards The cards to check
 * @param format The format to check
 * @returns Only cards that are banned
 *
 * @example
 * ```typescript
 * const deck = await getDeck();
 * const bannedInDeck = getBannedCards(deck.cards, 'standard');
 * if (bannedInDeck.length > 0) {
 *   console.warn('Deck contains banned cards:', bannedInDeck);
 * }
 * ```
 */
export function getBannedCards(cards: Card[], format: FormatType): Card[] {
  return cards.filter((card) => isBanned(card, format));
}

// =============================================================================
// Format Coverage Analysis
// =============================================================================

/**
 * Analyze legality of a card across all formats
 *
 * @param card The card to analyze
 * @returns Map of format to legality status
 *
 * @example
 * ```typescript
 * const card = await getCard('lightning-bolt');
 * const legality = getCardLegalityAcrossFormats(card);
 * // { standard: 'not_legal', modern: 'legal', commander: 'legal', brawl: 'not_legal' }
 * ```
 */
export function getCardLegalityAcrossFormats(
  card: Card
): Record<FormatType, LegalityStatus> {
  const formats: FormatType[] = ['standard', 'modern', 'commander', 'brawl'];
  const result = {} as Record<FormatType, LegalityStatus>;

  for (const format of formats) {
    result[format] = getLegalityStatus(card, format);
  }

  return result;
}

/**
 * Analyze which formats a collection has legal cards for
 *
 * @param cards The collection cards
 * @returns Map of format to count of legal cards
 *
 * @example
 * ```typescript
 * const collection = await getCollectionCards();
 * const coverage = analyzeFormatCoverage(collection);
 * // { standard: 150, modern: 450, commander: 800, brawl: 140 }
 * ```
 */
export function analyzeFormatCoverage(
  cards: Card[]
): Record<FormatType, number> {
  const formats: FormatType[] = ['standard', 'modern', 'commander', 'brawl'];
  const result = {} as Record<FormatType, number>;

  for (const format of formats) {
    result[format] = cards.filter((card) => isLegal(card, format)).length;
  }

  return result;
}

// =============================================================================
// Private Helpers
// =============================================================================

/**
 * Normalize a legality status string from Scryfall to our enum
 */
function normalizeLegalityStatus(status: string): LegalityStatus {
  const normalized = status.toLowerCase().trim();

  switch (normalized) {
    case 'legal':
      return 'legal';
    case 'banned':
      return 'banned';
    case 'restricted':
      return 'restricted';
    case 'not_legal':
    case 'notlegal':
    default:
      return 'not_legal';
  }
}

// =============================================================================
// Export Interface for Adapters
// =============================================================================

/**
 * Banned list checker interface for use by format adapters
 */
export interface BannedListChecker {
  isLegal(card: Card): boolean;
  isBanned(card: Card): boolean;
  getLegalityStatus(card: Card): LegalityStatus;
}

/**
 * Create a banned list checker for a specific format
 *
 * @param format The format to create a checker for
 * @returns A checker bound to that format
 *
 * @example
 * ```typescript
 * const modernChecker = createBannedListChecker('modern');
 * if (modernChecker.isBanned(card)) {
 *   // Card is banned in Modern
 * }
 * ```
 */
export function createBannedListChecker(format: FormatType): BannedListChecker {
  return {
    isLegal: (card: Card) => isLegal(card, format),
    isBanned: (card: Card) => isBanned(card, format),
    getLegalityStatus: (card: Card) => getLegalityStatus(card, format),
  };
}
