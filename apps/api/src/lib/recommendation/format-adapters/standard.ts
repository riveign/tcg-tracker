/**
 * Standard Format Adapter
 *
 * Implements format rules for Standard constructed:
 * - 60-card minimum mainboard
 * - 15-card sideboard maximum
 * - 4-copy limit (except basic lands)
 * - Standard legality based on current rotation
 */

import type { Card } from '@tcg-tracker/db';
import type {
  FormatAdapter,
  FormatType,
  DeckSizeConfig,
  CopyLimitConfig,
  CategoryTargets,
  ScoreWeights,
  StageThresholds,
  ColorConstraint,
  ArchetypeModifiers,
  DeckWithCards,
  DeckStage,
  ValidationResult,
  ValidationError,
  LegalityStatus,
  ManaColor,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

const BASIC_LAND_NAMES = new Set([
  'Plains',
  'Island',
  'Swamp',
  'Mountain',
  'Forest',
  'Wastes',
  'Snow-Covered Plains',
  'Snow-Covered Island',
  'Snow-Covered Swamp',
  'Snow-Covered Mountain',
  'Snow-Covered Forest',
]);

const STANDARD_COPY_LIMIT = 4;

const CATEGORY_TARGETS: CategoryTargets = {
  lands: { min: 20, opt: 24, max: 26 },
  creatures: { min: 12, opt: 20, max: 28 },
  removal: { min: 4, opt: 8, max: 12 },
  cardDraw: { min: 2, opt: 6, max: 10 },
  threats: { min: 8, opt: 15, max: 24 },
};

const SCORE_WEIGHTS: ScoreWeights = {
  mechanical: 40,
  strategic: 30,
  formatContext: 20,
  theme: 10,
};

const STAGE_THRESHOLDS: StageThresholds = {
  early: 20,
  mid: 40,
  late: 55,
};

const ARCHETYPE_MODIFIERS: Record<string, ArchetypeModifiers> = {
  aggro: {
    categoryWeights: {
      creatures: 1.5,
      threats: 1.3,
      removal: 0.8,
    },
    preferredKeywords: ['haste', 'first strike', 'menace', 'trample'],
    avoidKeywords: [],
  },
  control: {
    categoryWeights: {
      removal: 1.5,
      boardWipe: 1.4,
      cardDraw: 1.3,
      creatures: 0.6,
    },
    preferredKeywords: ['flash', 'hexproof', 'ward'],
    avoidKeywords: ['haste'],
  },
  midrange: {
    categoryWeights: {
      creatures: 1.2,
      removal: 1.2,
      threats: 1.2,
    },
    preferredKeywords: ['vigilance', 'lifelink', 'deathtouch'],
    avoidKeywords: [],
  },
  combo: {
    categoryWeights: {
      cardDraw: 1.5,
      protection: 1.3,
      tutor: 1.4,
    },
    preferredKeywords: [],
    avoidKeywords: [],
  },
  default: {
    categoryWeights: {},
    preferredKeywords: [],
    avoidKeywords: [],
  },
};

// =============================================================================
// Standard Adapter Implementation
// =============================================================================

export class StandardAdapter implements FormatAdapter {
  readonly format: FormatType = 'standard';

  readonly deckSize: DeckSizeConfig = {
    mainboard: { min: 60, max: null, optimal: 60 },
    sideboard: { min: 0, max: 15 },
    commander: false,
  };

  readonly copyLimit: CopyLimitConfig = {
    default: STANDARD_COPY_LIMIT,
    exceptions: new Map([...BASIC_LAND_NAMES].map((name) => [name, Infinity])),
  };

  // ===========================================================================
  // Legality Checks
  // ===========================================================================

  /**
   * Type guard to safely validate gameData structure
   */
  private static isLegalitiesRecord(
    data: unknown
  ): data is { legalities: Record<string, string> } {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
      'legalities' in obj &&
      typeof obj.legalities === 'object' &&
      obj.legalities !== null
    );
  }

  isLegal(card: Card): boolean {
    const status = this.getLegalityStatus(card);
    return status === 'legal' || status === 'restricted';
  }

  isBanned(card: Card): boolean {
    const status = this.getLegalityStatus(card);
    return status === 'banned';
  }

  getLegalityStatus(card: Card): LegalityStatus {
    if (!StandardAdapter.isLegalitiesRecord(card.gameData)) {
      return 'not_legal';
    }

    const status = card.gameData.legalities.standard;
    if (!status) return 'not_legal';

    switch (status) {
      case 'legal':
        return 'legal';
      case 'banned':
        return 'banned';
      case 'restricted':
        return 'restricted';
      default:
        return 'not_legal';
    }
  }

  // ===========================================================================
  // Deck Validation
  // ===========================================================================

  validateDeck(deck: DeckWithCards): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Count cards by type
    const mainboardCards = deck.cards.filter((c) => c.cardType === 'mainboard');
    const sideboardCards = deck.cards.filter((c) => c.cardType === 'sideboard');

    const mainboardCount = mainboardCards.reduce((sum, c) => sum + c.quantity, 0);
    const sideboardCount = sideboardCards.reduce((sum, c) => sum + c.quantity, 0);

    // Check minimum deck size
    if (mainboardCount < this.deckSize.mainboard.min) {
      errors.push({
        code: 'DECK_SIZE_BELOW_MINIMUM',
        message: `Deck has ${mainboardCount} cards, minimum is ${this.deckSize.mainboard.min}`,
      });
    }

    // Check sideboard limit
    if (this.deckSize.sideboard && sideboardCount > this.deckSize.sideboard.max) {
      errors.push({
        code: 'SIDEBOARD_EXCEEDS_MAXIMUM',
        message: `Sideboard has ${sideboardCount} cards, maximum is ${this.deckSize.sideboard.max}`,
      });
    }

    // Check copy limits and legality
    const cardCounts = new Map<string, number>();
    for (const deckCard of deck.cards) {
      const current = cardCounts.get(deckCard.card.name) ?? 0;
      cardCounts.set(deckCard.card.name, current + deckCard.quantity);
    }

    for (const [cardName, count] of cardCounts) {
      const maxAllowed = this.copyLimit.exceptions.get(cardName) ?? this.copyLimit.default;
      if (count > maxAllowed) {
        errors.push({
          code: 'COPY_LIMIT_EXCEEDED',
          message: `${cardName} exceeds ${maxAllowed}-copy limit (has ${count})`,
          cardName,
        });
      }
    }

    // Check legality of each card
    for (const deckCard of deck.cards) {
      if (!this.isLegal(deckCard.card)) {
        errors.push({
          code: 'CARD_NOT_LEGAL',
          message: `${deckCard.card.name} is not legal in Standard`,
          cardId: deckCard.cardId,
          cardName: deckCard.card.name,
        });
      }
    }

    // Warning if deck is above optimal size
    if (mainboardCount > this.deckSize.mainboard.optimal) {
      warnings.push({
        code: 'DECK_ABOVE_OPTIMAL',
        message: `Deck has ${mainboardCount} cards, optimal is ${this.deckSize.mainboard.optimal}`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  canAddCard(card: Card, deck: DeckWithCards): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check legality
    if (!this.isLegal(card)) {
      errors.push({
        code: 'CARD_NOT_LEGAL',
        message: `${card.name} is not legal in Standard`,
        cardId: card.id,
        cardName: card.name,
      });
    }

    // Check copy limit
    const existingCopies = deck.cards
      .filter((c) => c.card.name === card.name)
      .reduce((sum, c) => sum + c.quantity, 0);

    const maxAllowed = this.getMaxCopies(card);
    if (existingCopies >= maxAllowed) {
      errors.push({
        code: 'COPY_LIMIT_REACHED',
        message: `${card.name} has reached the ${maxAllowed}-copy limit`,
        cardId: card.id,
        cardName: card.name,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ===========================================================================
  // Scoring Configuration
  // ===========================================================================

  getScoreWeights(): ScoreWeights {
    return { ...SCORE_WEIGHTS };
  }

  getGapTargets(): CategoryTargets {
    return { ...CATEGORY_TARGETS };
  }

  getDeckStageThresholds(): StageThresholds {
    return { ...STAGE_THRESHOLDS };
  }

  getDeckStage(deck: DeckWithCards): DeckStage {
    const mainboardCount = deck.cards
      .filter((c) => c.cardType === 'mainboard')
      .reduce((sum, c) => sum + c.quantity, 0);

    const thresholds = this.getDeckStageThresholds();

    if (mainboardCount < thresholds.early) return 'early';
    if (mainboardCount < thresholds.mid) return 'mid';
    if (mainboardCount < thresholds.late) return 'late';
    return 'complete';
  }

  // ===========================================================================
  // Format-Specific Logic
  // ===========================================================================

  getColorConstraint(_deck: DeckWithCards): ColorConstraint {
    // Standard doesn't enforce color identity like Commander
    // All colors are allowed, constraint is not enforced
    return {
      allowedColors: ['W', 'U', 'B', 'R', 'G'],
      enforced: false,
    };
  }

  isColorCompatible(card: Card, constraint: ColorConstraint): boolean {
    // Standard doesn't enforce color identity
    if (!constraint.enforced) return true;

    const cardColors = card.colorIdentity as ManaColor[] | null;
    if (!cardColors || cardColors.length === 0) return true;

    return cardColors.every((color) => constraint.allowedColors.includes(color));
  }

  getArchetypeModifiers(archetype: string): ArchetypeModifiers {
    const normalizedArchetype = archetype.toLowerCase();
    const modifiers = ARCHETYPE_MODIFIERS[normalizedArchetype];
    if (modifiers) return modifiers;

    const defaultModifiers = ARCHETYPE_MODIFIERS.default;
    if (!defaultModifiers) {
      return { categoryWeights: {}, preferredKeywords: [], avoidKeywords: [] };
    }
    return defaultModifiers;
  }

  getOptimalCMCPosition(deck: DeckWithCards): number {
    const mainboardCards = deck.cards.filter((c) => c.cardType === 'mainboard');

    if (mainboardCards.length === 0) {
      // Early deck: prefer 2-3 CMC cards
      return 2.5;
    }

    // Calculate current average CMC
    const totalCMC = mainboardCards.reduce((sum, c) => {
      const cmc = c.card.cmc ? parseFloat(String(c.card.cmc)) : 0;
      return sum + cmc * c.quantity;
    }, 0);

    const totalCards = mainboardCards.reduce((sum, c) => sum + c.quantity, 0);
    const avgCMC = totalCards > 0 ? totalCMC / totalCards : 2.5;

    // Target average CMC for Standard aggro/midrange is around 2.5-3.5
    const targetAvgCMC = 3.0;

    // If current average is below target, suggest slightly higher CMC cards
    if (avgCMC < targetAvgCMC) {
      return Math.min(avgCMC + 1, 4);
    }

    // If current average is above target, suggest lower CMC cards
    return Math.max(avgCMC - 0.5, 1);
  }

  getMaxCopies(card: Card): number {
    const exception = this.copyLimit.exceptions.get(card.name);
    if (exception !== undefined) return exception;
    return this.copyLimit.default;
  }
}
