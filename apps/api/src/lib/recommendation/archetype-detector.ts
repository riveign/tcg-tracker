/**
 * Archetype Detector
 *
 * Detects deck archetypes based on card composition and format context.
 * Different formats emphasize different archetypes:
 * - Standard/Modern: Aggro, Control, Midrange, Combo, Tribal
 * - Commander: Tribal, Aristocrats, Spellslinger, Voltron, Reanimator, Control, Combo, Tokens
 * - Brawl: Aggro, Control, Midrange, Tribal
 */

import type { Card } from '@tcg-tracker/db';
import type {
  DeckWithCards,
  FormatAdapter,
  CardCategory,
} from './format-adapters/types.js';

// =============================================================================
// Type Definitions
// =============================================================================

export interface ArchetypeDetectionResult {
  primary: string;
  secondary: string | null;
  confidence: number; // 0-100
  signals: ArchetypeSignal[];
}

export interface ArchetypeSignal {
  archetype: string;
  strength: number; // 0-100
  reasons: string[];
}

interface ArchetypePattern {
  name: string;
  formats: ('standard' | 'modern' | 'commander' | 'brawl')[];
  categoryWeights: Partial<Record<CardCategory, number>>;
  keywords: string[];
  cardNamePatterns?: RegExp[];
  minCards?: number;
}

// =============================================================================
// Archetype Patterns
// =============================================================================

const ARCHETYPE_PATTERNS: ArchetypePattern[] = [
  // Standard/Modern/Brawl Archetypes
  {
    name: 'aggro',
    formats: ['standard', 'modern', 'brawl'],
    categoryWeights: {
      creatures: 1.5,
      threats: 1.3,
      removal: 0.7,
    },
    keywords: ['haste', 'first strike', 'menace', 'trample', 'double strike'],
    minCards: 20,
  },
  {
    name: 'control',
    formats: ['standard', 'modern', 'commander', 'brawl'],
    categoryWeights: {
      removal: 1.5,
      boardWipe: 1.4,
      cardDraw: 1.3,
      creatures: 0.5,
    },
    keywords: ['counter', 'flash', 'hexproof', 'ward', 'indestructible'],
    minCards: 15,
  },
  {
    name: 'midrange',
    formats: ['standard', 'modern', 'brawl'],
    categoryWeights: {
      creatures: 1.2,
      removal: 1.2,
      threats: 1.2,
    },
    keywords: ['vigilance', 'lifelink', 'deathtouch', 'reach'],
    minCards: 18,
  },
  {
    name: 'combo',
    formats: ['standard', 'modern', 'commander'],
    categoryWeights: {
      cardDraw: 1.5,
      tutor: 1.6,
      protection: 1.3,
    },
    keywords: ['storm', 'cascade', 'untap'],
    minCards: 10,
  },
  {
    name: 'tribal',
    formats: ['standard', 'modern', 'commander', 'brawl'],
    categoryWeights: {
      creatures: 1.4,
      threats: 1.2,
    },
    keywords: [],
    minCards: 15,
  },

  // Commander-Specific Archetypes
  {
    name: 'aristocrats',
    formats: ['commander'],
    categoryWeights: {
      creatures: 1.3,
      recursion: 1.5,
      cardDraw: 1.2,
    },
    keywords: ['sacrifice', 'death trigger', 'dies', 'when.*dies', 'when.*is put into'],
    minCards: 12,
  },
  {
    name: 'spellslinger',
    formats: ['commander'],
    categoryWeights: {
      cardDraw: 1.4,
      removal: 1.2,
      creatures: 0.6,
    },
    keywords: ['magecraft', 'prowess', 'storm', 'whenever you cast', 'instant or sorcery'],
    minCards: 15,
  },
  {
    name: 'voltron',
    formats: ['commander'],
    categoryWeights: {
      protection: 1.5,
      ramp: 1.3,
      creatures: 0.6,
    },
    keywords: ['equip', 'aura', 'hexproof', 'indestructible', 'attach', 'equipped'],
    minCards: 10,
  },
  {
    name: 'reanimator',
    formats: ['commander'],
    categoryWeights: {
      recursion: 1.6,
      cardDraw: 1.3,
      creatures: 1.2,
    },
    keywords: ['reanimate', 'return.*from.*graveyard', 'graveyard', 'exile.*from.*graveyard'],
    minCards: 12,
  },
  {
    name: 'tokens',
    formats: ['commander'],
    categoryWeights: {
      creatures: 1.3,
      threats: 1.4,
    },
    keywords: ['create', 'token', 'populate', 'copy'],
    minCards: 12,
  },
];

// =============================================================================
// Archetype Detector Implementation
// =============================================================================

export class ArchetypeDetector {
  /**
   * Detect the archetype of a deck based on its composition and format
   *
   * @param deck The deck to analyze
   * @param adapter The format adapter for format-specific rules
   * @returns Archetype detection result
   *
   * @example
   * ```typescript
   * const deck = await getDeck(deckId);
   * const adapter = FormatAdapterFactory.create('commander');
   * const archetype = ArchetypeDetector.detect(deck, adapter);
   * console.log(`Primary archetype: ${archetype.primary} (${archetype.confidence}% confidence)`);
   * ```
   */
  static detect(deck: DeckWithCards, adapter: FormatAdapter): ArchetypeDetectionResult {
    const mainboardCards = deck.cards.filter((c) => c.cardType === 'mainboard');

    if (mainboardCards.length === 0) {
      return {
        primary: 'unknown',
        secondary: null,
        confidence: 0,
        signals: [],
      };
    }

    // Get format-specific archetype patterns
    const relevantPatterns = ARCHETYPE_PATTERNS.filter((pattern) =>
      pattern.formats.includes(adapter.format)
    );

    // Calculate signals for each archetype
    const signals: ArchetypeSignal[] = [];

    for (const pattern of relevantPatterns) {
      const signal = this.calculateArchetypeSignal(mainboardCards, pattern, adapter);
      if (signal.strength > 0) {
        signals.push(signal);
      }
    }

    // Sort by strength
    signals.sort((a, b) => b.strength - a.strength);

    // Determine primary and secondary archetypes
    const primary = signals[0]?.archetype ?? 'unknown';
    const secondary = signals[1]?.archetype ?? null;
    const confidence = signals[0]?.strength ?? 0;

    return {
      primary,
      secondary,
      confidence,
      signals,
    };
  }

  /**
   * Get the effective archetype for a deck, preferring explicit strategy over detection
   *
   * @param deck The deck to analyze
   * @param adapter The format adapter
   * @returns The archetype string to use for recommendations
   *
   * @example
   * ```typescript
   * // Deck with strategy set from creation wizard
   * const deck = { ...deckData, strategy: 'tribal' };
   * const archetype = ArchetypeDetector.getEffectiveArchetype(deck, adapter);
   * // Returns 'tribal' (uses explicit strategy)
   *
   * // Legacy deck without strategy
   * const legacyDeck = { ...deckData, strategy: null };
   * const archetype = ArchetypeDetector.getEffectiveArchetype(legacyDeck, adapter);
   * // Returns detected archetype from card analysis
   * ```
   */
  static getEffectiveArchetype(deck: DeckWithCards, adapter: FormatAdapter): string {
    // Priority 1: Use explicit strategy from deck metadata
    if (deck.strategy) {
      // Validate strategy is recognized by checking if adapter has modifiers for it
      const modifiers = adapter.getArchetypeModifiers(deck.strategy);
      // If we get default modifiers (empty categoryWeights), strategy may not be recognized
      // but we still use it as it provides user intent
      return deck.strategy;
    }

    // Priority 2: Fall back to detection (legacy decks)
    const result = this.detect(deck, adapter);
    return result.primary;
  }

  /**
   * Check if a deck matches a specific archetype
   *
   * @param deck The deck to check
   * @param archetype The archetype name to check for
   * @param adapter The format adapter
   * @returns true if the deck matches the archetype with >50% confidence
   */
  static matches(
    deck: DeckWithCards,
    archetype: string,
    adapter: FormatAdapter
  ): boolean {
    const result = this.detect(deck, adapter);
    return (
      (result.primary.toLowerCase() === archetype.toLowerCase() && result.confidence > 50) ||
      (result.secondary?.toLowerCase() === archetype.toLowerCase())
    );
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private static calculateArchetypeSignal(
    cards: Array<{ card: Card; quantity: number }>,
    pattern: ArchetypePattern,
    adapter: FormatAdapter
  ): ArchetypeSignal {
    const reasons: string[] = [];
    let strength = 0;

    // 1. Category weight analysis (40 points max)
    const categoryScores = this.analyzeCategoryWeights(cards, pattern, adapter);
    strength += categoryScores.score;
    reasons.push(...categoryScores.reasons);

    // 2. Keyword analysis (30 points max)
    const keywordScores = this.analyzeKeywords(cards, pattern);
    strength += keywordScores.score;
    reasons.push(...keywordScores.reasons);

    // 3. Tribal detection (30 points max)
    if (pattern.name === 'tribal') {
      const tribalScores = this.analyzeTribal(cards);
      strength += tribalScores.score;
      reasons.push(...tribalScores.reasons);
    }

    // 4. Minimum card requirement
    if (pattern.minCards && cards.length < pattern.minCards) {
      strength *= 0.5; // Penalize if below minimum
    }

    return {
      archetype: pattern.name,
      strength: Math.min(100, strength),
      reasons,
    };
  }

  private static analyzeCategoryWeights(
    cards: Array<{ card: Card; quantity: number }>,
    pattern: ArchetypePattern,
    adapter: FormatAdapter
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const categoryCounts = this.countCardsByCategory(cards, adapter);
    const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);

    for (const [category, weight] of Object.entries(pattern.categoryWeights)) {
      const count = categoryCounts[category as CardCategory] ?? 0;
      const percentage = (count / totalCards) * 100;

      if (weight > 1.0) {
        // This category is important for this archetype
        const expectedMin = weight * 15; // Expect at least weight * 15% of deck
        if (percentage >= expectedMin) {
          const points = Math.min(15, (percentage / expectedMin) * 15);
          score += points;
          reasons.push(
            `High ${category} count (${count} cards, ${percentage.toFixed(1)}%)`
          );
        }
      }
    }

    return { score, reasons };
  }

  private static analyzeKeywords(
    cards: Array<{ card: Card; quantity: number }>,
    pattern: ArchetypePattern
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    if (pattern.keywords.length === 0) {
      return { score: 0, reasons };
    }

    const keywordCounts = new Map<string, number>();

    for (const { card, quantity } of cards) {
      const oracleText = (card.oracleText ?? '').toLowerCase();
      const cardKeywords = (card.keywords ?? []).map((k) => k.toLowerCase());

      for (const keyword of pattern.keywords) {
        const keywordLower = keyword.toLowerCase();

        // Check in keywords array
        if (cardKeywords.some((k) => k.includes(keywordLower))) {
          keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + quantity);
          continue;
        }

        // Check in oracle text (handles patterns like "when.*dies")
        if (new RegExp(keywordLower, 'i').test(oracleText)) {
          keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + quantity);
        }
      }
    }

    // Score based on keyword presence
    const matchedKeywords = Array.from(keywordCounts.entries());
    if (matchedKeywords.length > 0) {
      score = Math.min(30, matchedKeywords.length * 8);
      const topKeywords = matchedKeywords
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([keyword, count]) => `${keyword} (${count} cards)`);
      reasons.push(`Key mechanics: ${topKeywords.join(', ')}`);
    }

    return { score, reasons };
  }

  private static analyzeTribal(
    cards: Array<{ card: Card; quantity: number }>
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Count creatures by type
    const typeCounts = new Map<string, number>();

    for (const { card, quantity } of cards) {
      if (!card.types?.includes('Creature')) continue;

      const subtypes = card.subtypes ?? [];
      for (const subtype of subtypes) {
        typeCounts.set(subtype, (typeCounts.get(subtype) ?? 0) + quantity);
      }
    }

    // Find dominant creature type
    const sortedTypes = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]);

    if (sortedTypes.length > 0 && sortedTypes[0][1] >= 8) {
      const [dominantType, count] = sortedTypes[0];
      score = Math.min(30, (count / 8) * 20);
      reasons.push(`${dominantType} tribal (${count} creatures)`);
    }

    return { score, reasons };
  }

  private static countCardsByCategory(
    cards: Array<{ card: Card; quantity: number }>,
    adapter: FormatAdapter
  ): Partial<Record<CardCategory, number>> {
    const counts: Partial<Record<CardCategory, number>> = {};

    for (const { card, quantity } of cards) {
      const categories = this.classifyCard(card);
      for (const category of categories) {
        counts[category] = (counts[category] ?? 0) + quantity;
      }
    }

    return counts;
  }

  private static classifyCard(card: Card): CardCategory[] {
    const categories: CardCategory[] = [];
    const types = card.types ?? [];
    const oracleText = (card.oracleText ?? '').toLowerCase();

    // Land
    if (types.includes('Land')) {
      categories.push('lands');
      return categories; // Lands are primarily just lands
    }

    // Creature
    if (types.includes('Creature')) {
      categories.push('creatures');

      // Threat (high power/toughness or impactful abilities)
      const power = parseInt(card.power ?? '0', 10);
      const toughness = parseInt(card.toughness ?? '0', 10);
      if (power >= 4 || toughness >= 4 || this.hasImpactfulAbility(card)) {
        categories.push('threats');
      }
    }

    // Removal
    if (
      oracleText.includes('destroy') ||
      oracleText.includes('exile') ||
      oracleText.includes('damage to') ||
      oracleText.includes('sacrifice') ||
      oracleText.includes('return') && oracleText.includes('hand')
    ) {
      categories.push('removal');
    }

    // Board wipe
    if (
      (oracleText.includes('destroy all') || oracleText.includes('exile all')) &&
      (oracleText.includes('creatures') || oracleText.includes('permanents'))
    ) {
      categories.push('boardWipe');
    }

    // Card draw
    if (
      oracleText.includes('draw') ||
      oracleText.includes('scry') ||
      oracleText.includes('surveil')
    ) {
      categories.push('cardDraw');
    }

    // Ramp
    if (
      oracleText.includes('search your library for a') && oracleText.includes('land') ||
      oracleText.includes('add') && oracleText.includes('mana') ||
      types.includes('Artifact') && oracleText.includes('add')
    ) {
      categories.push('ramp');
    }

    // Protection
    if (
      oracleText.includes('hexproof') ||
      oracleText.includes('indestructible') ||
      oracleText.includes('protection') ||
      oracleText.includes('ward') ||
      oracleText.includes('counter target')
    ) {
      categories.push('protection');
    }

    // Tutor
    if (oracleText.includes('search your library') && !oracleText.includes('land')) {
      categories.push('tutor');
    }

    // Recursion
    if (
      (oracleText.includes('return') && oracleText.includes('graveyard')) ||
      (oracleText.includes('reanimate'))
    ) {
      categories.push('recursion');
    }

    return categories;
  }

  private static hasImpactfulAbility(card: Card): boolean {
    const keywords = card.keywords ?? [];
    const impactfulKeywords = [
      'Flying',
      'Trample',
      'Haste',
      'Double Strike',
      'Lifelink',
      'Deathtouch',
      'Menace',
    ];

    return keywords.some((k) => impactfulKeywords.includes(k));
  }
}
