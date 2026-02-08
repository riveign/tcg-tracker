/**
 * Synergy Scorer
 *
 * Format-agnostic scoring system for card recommendations.
 * Calculates synergy scores based on mechanical, strategic,
 * format context, and thematic factors.
 */

import type { Card } from '@tcg-tracker/db';
import type {
  SynergyScore,
  ScoreBreakdown,
  ScoringContext,
  FormatAdapter,
  DeckWithCards,
  DeckStage,
  CardCategory,
} from './format-adapters/index.js';

// =============================================================================
// Types
// =============================================================================

interface KeywordSynergy {
  keyword: string;
  synergyKeywords: string[];
  points: number;
}

// =============================================================================
// Constants
// =============================================================================

const KEYWORD_SYNERGIES: KeywordSynergy[] = [
  // Combat synergies
  { keyword: 'flying', synergyKeywords: ['reach', 'flying'], points: 3 },
  { keyword: 'first strike', synergyKeywords: ['deathtouch', 'double strike'], points: 4 },
  { keyword: 'deathtouch', synergyKeywords: ['first strike', 'trample'], points: 4 },
  { keyword: 'trample', synergyKeywords: ['deathtouch', 'double strike'], points: 3 },
  { keyword: 'lifelink', synergyKeywords: ['double strike', 'vigilance'], points: 3 },

  // Protection synergies
  { keyword: 'hexproof', synergyKeywords: ['aura', 'equipment'], points: 5 },
  { keyword: 'indestructible', synergyKeywords: ['wrath', 'board wipe'], points: 5 },

  // Value synergies
  { keyword: 'prowess', synergyKeywords: ['instant', 'sorcery'], points: 4 },
  { keyword: 'cascade', synergyKeywords: ['cascade'], points: 3 },
  { keyword: 'flashback', synergyKeywords: ['mill', 'discard'], points: 4 },

  // Token synergies
  { keyword: 'populate', synergyKeywords: ['token', 'create'], points: 5 },
  { keyword: 'convoke', synergyKeywords: ['token', 'creature'], points: 4 },
];

const TYPE_SYNERGIES: Record<string, string[]> = {
  Aura: ['Creature', 'hexproof', 'bogles'],
  Equipment: ['Creature', 'equip'],
  Vehicle: ['Creature', 'crew'],
  Saga: ['enchantment', 'proliferate'],
};

const TRIBAL_TYPES = new Set([
  'Elf',
  'Goblin',
  'Zombie',
  'Vampire',
  'Human',
  'Merfolk',
  'Dragon',
  'Angel',
  'Demon',
  'Elemental',
  'Spirit',
  'Wizard',
  'Soldier',
  'Knight',
  'Beast',
  'Dinosaur',
  'Pirate',
  'Cat',
  'Dog',
  'Warrior',
  'Cleric',
  'Rogue',
  'Shaman',
]);

// =============================================================================
// Synergy Scorer Implementation
// =============================================================================

export class SynergyScorer {
  /**
   * Calculate the synergy score for a card in the context of a deck
   * @param card The card to score
   * @param context The scoring context (deck, archetype, gaps, stage, adapter)
   * @returns The synergy score with breakdown
   */
  static async score(card: Card, context: ScoringContext): Promise<SynergyScore> {
    const breakdown: ScoreBreakdown[] = [];

    // Get score weights from adapter
    const weights = context.adapter.getScoreWeights();

    // Calculate each component
    const mechanical = SynergyScorer.calculateMechanicalSynergy(card, context, breakdown);
    const strategic = SynergyScorer.calculateStrategicSynergy(card, context, breakdown);
    const formatContext = SynergyScorer.calculateFormatContextSynergy(card, context, breakdown);
    const theme = SynergyScorer.calculateThemeSynergy(card, context, breakdown);

    // Calculate weighted total
    const maxMechanical = weights.mechanical;
    const maxStrategic = weights.strategic;
    const maxFormatContext = weights.formatContext;
    const maxTheme = weights.theme;

    const total =
      (mechanical / 40) * maxMechanical +
      (strategic / 30) * maxStrategic +
      (formatContext / 20) * maxFormatContext +
      (theme / 10) * maxTheme;

    return {
      total: Math.round(total * 10) / 10,
      mechanical,
      strategic,
      formatContext,
      theme,
      breakdown,
    };
  }

  /**
   * Score a batch of cards for efficiency
   * @param cards Cards to score
   * @param context Scoring context
   * @returns Array of cards with scores
   */
  static async scoreBatch(
    cards: Card[],
    context: ScoringContext
  ): Promise<Array<{ card: Card; score: SynergyScore }>> {
    const results = await Promise.all(
      cards.map(async (card) => ({
        card,
        score: await SynergyScorer.score(card, context),
      }))
    );

    return results.sort((a, b) => b.score.total - a.score.total);
  }

  // ===========================================================================
  // Score Component Calculators
  // ===========================================================================

  /**
   * Calculate mechanical synergy based on keywords and abilities
   * Max: 40 points
   */
  private static calculateMechanicalSynergy(
    card: Card,
    context: ScoringContext,
    breakdown: ScoreBreakdown[]
  ): number {
    let score = 0;
    const cardKeywords = card.keywords ?? [];
    const cardTypes = card.types ?? [];
    const oracleText = card.oracleText?.toLowerCase() ?? '';

    // Get keywords from deck cards
    const deckKeywords = new Set<string>();
    for (const dc of context.deck.cards) {
      for (const kw of dc.card.keywords ?? []) {
        deckKeywords.add(kw.toLowerCase());
      }
    }

    // Check keyword synergies
    for (const synergy of KEYWORD_SYNERGIES) {
      const hasKeyword = cardKeywords.some((kw) =>
        kw.toLowerCase().includes(synergy.keyword.toLowerCase())
      );

      if (hasKeyword) {
        const hasSynergyInDeck = synergy.synergyKeywords.some((sk) => deckKeywords.has(sk));

        if (hasSynergyInDeck) {
          score += synergy.points;
          breakdown.push({
            category: 'mechanical',
            reason: `${synergy.keyword} synergizes with deck`,
            points: synergy.points,
            weight: 1,
          });
        }
      }
    }

    // Check type synergies
    for (const cardType of cardTypes) {
      const synergies = TYPE_SYNERGIES[cardType];
      if (synergies) {
        const deckTypes = new Set<string>();
        for (const dc of context.deck.cards) {
          for (const t of dc.card.types ?? []) {
            deckTypes.add(t);
          }
        }

        const matchCount = synergies.filter((s) => deckTypes.has(s)).length;
        if (matchCount > 0) {
          const points = matchCount * 2;
          score += points;
          breakdown.push({
            category: 'mechanical',
            reason: `${cardType} type synergy`,
            points,
            weight: 1,
          });
        }
      }
    }

    // Check for direct synergy mentions in oracle text
    const synergyPatterns = [
      { pattern: /whenever.*creature.*enters/i, points: 4, reason: 'ETB creature synergy' },
      { pattern: /whenever.*you.*cast.*instant/i, points: 4, reason: 'Spell synergy' },
      { pattern: /sacrifice.*creature/i, points: 4, reason: 'Sacrifice synergy' },
      { pattern: /draw.*card/i, points: 3, reason: 'Card draw synergy' },
      { pattern: /\+1\/\+1 counter/i, points: 3, reason: 'Counter synergy' },
      { pattern: /graveyard/i, points: 3, reason: 'Graveyard synergy' },
    ];

    for (const { pattern, points, reason } of synergyPatterns) {
      if (pattern.test(oracleText)) {
        score += points;
        breakdown.push({
          category: 'mechanical',
          reason,
          points,
          weight: 1,
        });
      }
    }

    return Math.min(40, score);
  }

  /**
   * Calculate strategic synergy based on archetype and role
   * Max: 30 points
   */
  private static calculateStrategicSynergy(
    card: Card,
    context: ScoringContext,
    breakdown: ScoreBreakdown[]
  ): number {
    let score = 0;

    // Use explicit deck strategy if present, otherwise use detected archetype
    const effectiveArchetype = context.deckStrategy ?? context.archetype;

    // Get archetype modifiers
    const modifiers = context.adapter.getArchetypeModifiers(effectiveArchetype);

    // Check preferred keywords
    const cardKeywords = card.keywords ?? [];
    for (const kw of modifiers.preferredKeywords) {
      if (cardKeywords.some((ck) => ck.toLowerCase().includes(kw.toLowerCase()))) {
        score += 5;
        breakdown.push({
          category: 'strategic',
          reason: `Preferred keyword: ${kw}`,
          points: 5,
          weight: 1,
        });
      }
    }

    // Penalize avoided keywords
    for (const kw of modifiers.avoidKeywords) {
      if (cardKeywords.some((ck) => ck.toLowerCase().includes(kw.toLowerCase()))) {
        score -= 3;
        breakdown.push({
          category: 'strategic',
          reason: `Avoided keyword: ${kw}`,
          points: -3,
          weight: 1,
        });
      }
    }

    // Check if card fills gaps
    const cardCategories = SynergyScorer.classifyCard(card, context.adapter);
    for (const category of cardCategories) {
      const gap = context.gaps.categoryBreakdown[category];
      if (gap && gap.status === 'deficient') {
        const points = Math.min(10, gap.priority / 10);
        score += points;
        breakdown.push({
          category: 'strategic',
          reason: `Fills ${category} gap`,
          points,
          weight: 1,
        });
      }
    }

    // Stage-appropriate scoring
    const stageBonus = SynergyScorer.getStageBonus(card, context.stage);
    if (stageBonus > 0) {
      score += stageBonus;
      breakdown.push({
        category: 'strategic',
        reason: `Good for ${context.stage} stage`,
        points: stageBonus,
        weight: 1,
      });
    }

    // Strategy-specific keyword boosts (when explicit strategy is set)
    if (context.deckStrategy) {
      const oracleText = card.oracleText?.toLowerCase() ?? '';
      const strategyKeywordBoosts: Record<string, { patterns: RegExp[]; points: number }> = {
        tribal: { patterns: [/creature type|all .+ get|other .+ you control/i], points: 4 },
        aristocrats: { patterns: [/when.*dies|sacrifice|blood artist/i], points: 4 },
        spellslinger: { patterns: [/whenever you cast.*instant|sorcery|magecraft/i], points: 4 },
        voltron: { patterns: [/equipped creature|attach|aura.*attach/i], points: 4 },
        reanimator: { patterns: [/from.*graveyard|return.*creature.*graveyard/i], points: 4 },
        tokens: { patterns: [/create.*token|populate|token.*creature/i], points: 4 },
        aggro: { patterns: [/haste|first strike|can't block/i], points: 3 },
        control: { patterns: [/counter target|return.*to.*hand|tap.*doesn't untap/i], points: 3 },
        ramp: { patterns: [/add.*mana|search.*library.*land/i], points: 3 },
        combo: { patterns: [/untap|infinite|copy.*spell/i], points: 4 },
      };

      const boost = strategyKeywordBoosts[context.deckStrategy.toLowerCase()];
      if (boost) {
        const matchesPattern = boost.patterns.some((p) => p.test(oracleText));
        if (matchesPattern) {
          score += boost.points;
          breakdown.push({
            category: 'strategic',
            reason: `Matches ${context.deckStrategy} strategy`,
            points: boost.points,
            weight: 1,
          });
        }
      }
    }

    return Math.max(0, Math.min(30, score));
  }

  /**
   * Calculate format context synergy
   * Max: 20 points
   */
  private static calculateFormatContextSynergy(
    card: Card,
    context: ScoringContext,
    breakdown: ScoreBreakdown[]
  ): number {
    let score = 0;

    // Check color compatibility
    const colorConstraint = context.adapter.getColorConstraint(context.deck);
    if (!context.adapter.isColorCompatible(card, colorConstraint)) {
      return 0; // Ineligible card
    }

    // Format-specific value adjustments
    const format = context.adapter.format;

    if (format === 'standard' || format === 'modern') {
      // 60-card formats: value 4-of consistency
      if (SynergyScorer.isStackable(card)) {
        score += 6;
        breakdown.push({
          category: 'formatContext',
          reason: 'Works well as 4-of',
          points: 6,
          weight: 1,
        });
      }
    }

    if (format === 'commander' || format === 'brawl') {
      // Singleton formats: value uniqueness
      if (SynergyScorer.hasUniqueEffect(card, context.deck)) {
        score += 6;
        breakdown.push({
          category: 'formatContext',
          reason: 'Unique effect for singleton',
          points: 6,
          weight: 1,
        });
      }

      // Political value for multiplayer Commander
      if (format === 'commander' && SynergyScorer.hasPoliticalValue(card)) {
        score += 4;
        breakdown.push({
          category: 'formatContext',
          reason: 'Political value for multiplayer',
          points: 4,
          weight: 1,
        });
      }
    }

    // Curve fit
    const optimalCMC = context.adapter.getOptimalCMCPosition(context.deck);
    const cardCMC = card.cmc ? parseFloat(String(card.cmc)) : 0;
    const cmcDiff = Math.abs(cardCMC - optimalCMC);
    const cmcBonus = Math.max(0, 10 - cmcDiff * 2);

    if (cmcBonus > 0) {
      score += cmcBonus;
      breakdown.push({
        category: 'formatContext',
        reason: `Good curve fit (CMC ${cardCMC})`,
        points: cmcBonus,
        weight: 1,
      });
    }

    return Math.min(20, score);
  }

  /**
   * Calculate theme synergy (tribal, flavor)
   * Max: 10 points
   */
  private static calculateThemeSynergy(
    card: Card,
    context: ScoringContext,
    breakdown: ScoreBreakdown[]
  ): number {
    let score = 0;
    const cardSubtypes = card.subtypes ?? [];

    // Check tribal synergy
    const deckTribes = new Map<string, number>();
    for (const dc of context.deck.cards) {
      for (const subtype of dc.card.subtypes ?? []) {
        if (TRIBAL_TYPES.has(subtype)) {
          deckTribes.set(subtype, (deckTribes.get(subtype) ?? 0) + dc.quantity);
        }
      }
    }

    // Find dominant tribe
    let dominantTribe = '';
    let dominantCount = 0;
    for (const [tribe, count] of deckTribes) {
      if (count > dominantCount) {
        dominantTribe = tribe;
        dominantCount = count;
      }
    }

    // Check if card matches dominant tribe
    if (dominantTribe && dominantCount >= 5) {
      if (cardSubtypes.includes(dominantTribe)) {
        score += 8;
        breakdown.push({
          category: 'theme',
          reason: `${dominantTribe} tribal synergy`,
          points: 8,
          weight: 1,
        });
      }

      // Check if card has "lord" effect for the tribe
      const oracleText = card.oracleText?.toLowerCase() ?? '';
      if (oracleText.includes(dominantTribe.toLowerCase())) {
        score += 5;
        breakdown.push({
          category: 'theme',
          reason: `References ${dominantTribe}`,
          points: 5,
          weight: 1,
        });
      }
    }

    return Math.min(10, score);
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Classify a card into functional categories
   */
  static classifyCard(card: Card, _adapter: FormatAdapter): CardCategory[] {
    const categories: CardCategory[] = [];
    const types = card.types ?? [];
    const oracleText = card.oracleText?.toLowerCase() ?? '';
    const cardKeywords = card.keywords ?? [];

    // Lands
    if (types.includes('Land')) {
      categories.push('lands');
    }

    // Creatures
    if (types.includes('Creature')) {
      categories.push('creatures');

      // Check if it's a threat
      const power = parseInt(card.power ?? '0', 10);
      if (power >= 3 || cardKeywords.some((kw) => ['flying', 'trample', 'haste'].includes(kw.toLowerCase()))) {
        categories.push('threats');
      }
    }

    // Removal
    if (
      oracleText.includes('destroy') ||
      oracleText.includes('exile') ||
      oracleText.includes('deals damage') ||
      oracleText.includes('-x/-x')
    ) {
      categories.push('removal');
    }

    // Board wipe
    if (
      oracleText.includes('destroy all') ||
      oracleText.includes('exile all') ||
      oracleText.includes('each creature')
    ) {
      categories.push('boardWipe');
    }

    // Card draw
    if (oracleText.includes('draw') && oracleText.includes('card')) {
      categories.push('cardDraw');
    }

    // Ramp
    if (
      oracleText.includes('add') &&
      (oracleText.includes('mana') || /\{[WUBRG]\}/.test(oracleText))
    ) {
      categories.push('ramp');
    }

    // Protection
    if (
      cardKeywords.includes('Hexproof') ||
      cardKeywords.includes('Indestructible') ||
      oracleText.includes('protection from')
    ) {
      categories.push('protection');
    }

    // Tutor
    if (oracleText.includes('search your library')) {
      categories.push('tutor');
    }

    // Recursion
    if (
      oracleText.includes('from your graveyard') ||
      oracleText.includes('return') && oracleText.includes('graveyard')
    ) {
      categories.push('recursion');
    }

    return categories;
  }

  /**
   * Check if a card works well in multiples (for 60-card formats)
   */
  private static isStackable(card: Card): boolean {
    const types = card.types ?? [];

    // Legendary cards don't stack well
    const supertypes = card.supertypes ?? [];
    if (supertypes.includes('Legendary')) {
      return false;
    }

    // Instants and sorceries generally stack well
    if (types.includes('Instant') || types.includes('Sorcery')) {
      return true;
    }

    // Low-cost creatures stack well
    const cmc = card.cmc ? parseFloat(String(card.cmc)) : 0;
    if (types.includes('Creature') && cmc <= 3) {
      return true;
    }

    return false;
  }

  /**
   * Check if a card provides a unique effect
   */
  private static hasUniqueEffect(card: Card, deck: DeckWithCards): boolean {
    const oracleText = card.oracleText?.toLowerCase() ?? '';

    // Check for unique patterns
    const uniquePatterns = [
      /you can't lose the game/i,
      /opponents can't/i,
      /each opponent loses/i,
      /double.*damage/i,
      /extra combat/i,
      /extra turn/i,
    ];

    for (const pattern of uniquePatterns) {
      if (pattern.test(oracleText)) {
        return true;
      }
    }

    // Check if no card in deck has similar text
    const cardKeywords = card.keywords ?? [];
    for (const dc of deck.cards) {
      const deckCardKeywords = dc.card.keywords ?? [];
      const overlap = cardKeywords.filter((kw) => deckCardKeywords.includes(kw));
      if (overlap.length > 2) {
        return false; // Similar effect exists
      }
    }

    return true;
  }

  /**
   * Check if a card has political value for multiplayer
   */
  private static hasPoliticalValue(card: Card): boolean {
    const oracleText = card.oracleText?.toLowerCase() ?? '';

    const politicalPatterns = [
      /each player/i,
      /each opponent/i,
      /vote/i,
      /council/i,
      /choose.*player/i,
      /target opponent/i,
      /all players/i,
    ];

    return politicalPatterns.some((pattern) => pattern.test(oracleText));
  }

  /**
   * Get stage-appropriate bonus for a card
   */
  private static getStageBonus(card: Card, stage: DeckStage): number {
    const cmc = card.cmc ? parseFloat(String(card.cmc)) : 0;
    const types = card.types ?? [];

    switch (stage) {
      case 'early':
        // Early stage: prefer ramp and cheap cards
        if (cmc <= 2) return 5;
        if (cmc <= 3 && types.includes('Land')) return 4;
        return 0;

      case 'mid':
        // Mid stage: prefer utility and mid-range threats
        if (cmc >= 2 && cmc <= 4) return 4;
        return 0;

      case 'late':
        // Late stage: prefer finishers and high-impact cards
        if (cmc >= 4) return 3;
        return 0;

      case 'complete':
        // Complete: balanced preferences
        return 2;

      default:
        return 0;
    }
  }
}
