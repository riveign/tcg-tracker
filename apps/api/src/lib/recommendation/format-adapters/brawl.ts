/**
 * Brawl Format Adapter
 *
 * Implements format rules for Brawl:
 * - 59-card singleton mainboard + 1 commander
 * - No sideboard
 * - Singleton rule (1 copy except basic lands)
 * - Color identity enforcement based on commander
 * - Standard-legal card pool (rotating format)
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

const BRAWL_COPY_LIMIT = 1;

const CATEGORY_TARGETS: CategoryTargets = {
  lands: { min: 22, opt: 24, max: 26 },
  ramp: { min: 4, opt: 6, max: 10 },
  cardDraw: { min: 3, opt: 6, max: 8 },
  removal: { min: 4, opt: 6, max: 10 },
  threats: { min: 8, opt: 12, max: 20 },
};

const SCORE_WEIGHTS: ScoreWeights = {
  mechanical: 35,
  strategic: 30,
  formatContext: 25,
  theme: 10,
};

const STAGE_THRESHOLDS: StageThresholds = {
  early: 20,
  mid: 40,
  late: 52,
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
      removal: 1.4,
      boardWipe: 1.3,
      cardDraw: 1.3,
      protection: 1.2,
    },
    preferredKeywords: ['counter', 'flash', 'hexproof'],
    avoidKeywords: [],
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
  tribal: {
    categoryWeights: {
      creatures: 1.4,
      threats: 1.2,
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
// Brawl Adapter Implementation
// =============================================================================

export class BrawlAdapter implements FormatAdapter {
  readonly format: FormatType = 'brawl';

  readonly deckSize: DeckSizeConfig = {
    mainboard: { min: 59, max: 59, optimal: 59 },
    commander: true,
  };

  readonly copyLimit: CopyLimitConfig = {
    default: BRAWL_COPY_LIMIT,
    exceptions: new Map([...BASIC_LAND_NAMES].map((name) => [name, Infinity])),
  };

  // ===========================================================================
  // Legality Checks
  // ===========================================================================

  isLegal(card: Card): boolean {
    const status = this.getLegalityStatus(card);
    return status === 'legal' || status === 'restricted';
  }

  isBanned(card: Card): boolean {
    const status = this.getLegalityStatus(card);
    return status === 'banned';
  }

  getLegalityStatus(card: Card): LegalityStatus {
    const gameData = card.gameData as Record<string, unknown> | null;
    if (!gameData) return 'not_legal';

    const legalities = gameData.legalities as Record<string, string> | undefined;
    if (!legalities) return 'not_legal';

    // Brawl uses Standard legality in Scryfall's legality data
    // Some sources track 'brawl' separately, so we check both
    const brawlStatus = legalities.brawl;
    const standardStatus = legalities.standard;

    // If explicit brawl legality exists, use it
    if (brawlStatus) {
      switch (brawlStatus) {
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

    // Fall back to Standard legality
    if (standardStatus) {
      switch (standardStatus) {
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

    return 'not_legal';
  }

  // ===========================================================================
  // Deck Validation
  // ===========================================================================

  validateDeck(deck: DeckWithCards): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check for commander
    const commanderCard = deck.cards.find((c) => c.cardType === 'commander');
    if (!commanderCard) {
      errors.push({
        code: 'NO_COMMANDER',
        message: 'Deck must have a commander',
      });
    } else {
      // Validate commander is legendary creature or planeswalker that can be commander
      const isLegendary = commanderCard.card.supertypes?.includes('Legendary') ?? false;
      const isCreature = commanderCard.card.types?.includes('Creature') ?? false;
      const isPlaneswalker = commanderCard.card.types?.includes('Planeswalker') ?? false;
      const canBeCommander = this.canBeCommander(commanderCard.card);

      if (!canBeCommander && !(isLegendary && (isCreature || isPlaneswalker))) {
        errors.push({
          code: 'INVALID_COMMANDER',
          message: `${commanderCard.card.name} cannot be used as a commander`,
          cardId: commanderCard.cardId,
          cardName: commanderCard.card.name,
        });
      }
    }

    // Count mainboard cards (excluding commander)
    const mainboardCards = deck.cards.filter((c) => c.cardType === 'mainboard');
    const mainboardCount = mainboardCards.reduce((sum, c) => sum + c.quantity, 0);

    // Check deck size (should be exactly 59 for mainboard)
    if (mainboardCount < this.deckSize.mainboard.min) {
      errors.push({
        code: 'DECK_SIZE_BELOW_MINIMUM',
        message: `Deck has ${mainboardCount} cards in the 59, minimum is ${this.deckSize.mainboard.min}`,
      });
    }

    if (this.deckSize.mainboard.max && mainboardCount > this.deckSize.mainboard.max) {
      errors.push({
        code: 'DECK_SIZE_ABOVE_MAXIMUM',
        message: `Deck has ${mainboardCount} cards in the 59, maximum is ${this.deckSize.mainboard.max}`,
      });
    }

    // Check singleton rule and legality
    const cardCounts = new Map<string, { count: number; card: Card }>();
    for (const deckCard of deck.cards) {
      const existing = cardCounts.get(deckCard.card.name);
      if (existing) {
        cardCounts.set(deckCard.card.name, {
          count: existing.count + deckCard.quantity,
          card: deckCard.card,
        });
      } else {
        cardCounts.set(deckCard.card.name, {
          count: deckCard.quantity,
          card: deckCard.card,
        });
      }
    }

    for (const [cardName, { count, card }] of cardCounts) {
      const maxAllowed = this.getMaxCopies(card);
      if (count > maxAllowed) {
        if (maxAllowed === 1) {
          errors.push({
            code: 'SINGLETON_VIOLATION',
            message: `${cardName} is not singleton (has ${count} copies)`,
            cardName,
          });
        } else {
          errors.push({
            code: 'COPY_LIMIT_EXCEEDED',
            message: `${cardName} exceeds ${maxAllowed}-copy limit (has ${count})`,
            cardName,
          });
        }
      }
    }

    // Check legality of each card (Standard legality for Brawl)
    for (const deckCard of deck.cards) {
      if (!this.isLegal(deckCard.card)) {
        errors.push({
          code: 'CARD_NOT_LEGAL',
          message: `${deckCard.card.name} is not legal in Brawl`,
          cardId: deckCard.cardId,
          cardName: deckCard.card.name,
        });
      }
    }

    // Check color identity
    if (commanderCard) {
      const colorConstraint = this.getColorConstraint(deck);
      for (const deckCard of deck.cards) {
        if (deckCard.cardType === 'commander') continue;
        if (!this.isColorCompatible(deckCard.card, colorConstraint)) {
          errors.push({
            code: 'COLOR_IDENTITY_VIOLATION',
            message: `${deckCard.card.name} is outside the commander's color identity`,
            cardId: deckCard.cardId,
            cardName: deckCard.card.name,
          });
        }
      }
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

    // Check legality (Standard legality for Brawl)
    if (!this.isLegal(card)) {
      errors.push({
        code: 'CARD_NOT_LEGAL',
        message: `${card.name} is not legal in Brawl`,
        cardId: card.id,
        cardName: card.name,
      });
    }

    // Check singleton rule
    const existingCopies = deck.cards
      .filter((c) => c.card.name === card.name)
      .reduce((sum, c) => sum + c.quantity, 0);

    const maxAllowed = this.getMaxCopies(card);
    if (existingCopies >= maxAllowed) {
      if (maxAllowed === 1) {
        errors.push({
          code: 'SINGLETON_VIOLATION',
          message: `${card.name} is already in the deck (singleton rule)`,
          cardId: card.id,
          cardName: card.name,
        });
      } else {
        errors.push({
          code: 'COPY_LIMIT_REACHED',
          message: `${card.name} has reached the ${maxAllowed}-copy limit`,
          cardId: card.id,
          cardName: card.name,
        });
      }
    }

    // Check color identity
    const colorConstraint = this.getColorConstraint(deck);
    if (colorConstraint.enforced && !this.isColorCompatible(card, colorConstraint)) {
      errors.push({
        code: 'COLOR_IDENTITY_VIOLATION',
        message: `${card.name} is outside the commander's color identity (${colorConstraint.allowedColors.join(', ') || 'colorless'})`,
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

  getColorConstraint(deck: DeckWithCards): ColorConstraint {
    const commanderCard = deck.cards.find((c) => c.cardType === 'commander');

    if (!commanderCard) {
      // No commander selected yet, allow all colors
      return {
        allowedColors: ['W', 'U', 'B', 'R', 'G'],
        enforced: false,
      };
    }

    const colorIdentity = commanderCard.card.colorIdentity as ManaColor[] | null;

    return {
      allowedColors: colorIdentity ?? [],
      enforced: true,
    };
  }

  isColorCompatible(card: Card, constraint: ColorConstraint): boolean {
    if (!constraint.enforced) return true;

    const cardColorIdentity = card.colorIdentity as ManaColor[] | null;

    // Colorless cards are always compatible
    if (!cardColorIdentity || cardColorIdentity.length === 0) return true;

    // Empty color constraint means colorless commander - only colorless cards allowed
    if (constraint.allowedColors.length === 0) return false;

    // Check if all card colors are in the allowed colors
    return cardColorIdentity.every((color) => constraint.allowedColors.includes(color));
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
      // Early deck: prefer 2-3 CMC cards for Brawl's Standard power level
      return 2.5;
    }

    // Calculate current average CMC
    const totalCMC = mainboardCards.reduce((sum, c) => {
      const cmc = c.card.cmc ? parseFloat(String(c.card.cmc)) : 0;
      return sum + cmc * c.quantity;
    }, 0);

    const totalCards = mainboardCards.reduce((sum, c) => sum + c.quantity, 0);
    const avgCMC = totalCards > 0 ? totalCMC / totalCards : 2.5;

    // Brawl uses Standard cards but singleton format allows slightly higher curve
    // Target average CMC around 3.0-3.5
    const targetAvgCMC = 3.2;

    // Calculate how much we need to adjust
    if (avgCMC < targetAvgCMC - 0.3) {
      return Math.min(avgCMC + 1.5, 5);
    } else if (avgCMC > targetAvgCMC + 0.3) {
      return Math.max(avgCMC - 1, 2);
    }

    // Near target, suggest cards around average
    return avgCMC;
  }

  getMaxCopies(card: Card): number {
    // Check for basic land exception
    const exception = this.copyLimit.exceptions.get(card.name);
    if (exception !== undefined) return exception;

    return this.copyLimit.default;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Check if a card can be used as a commander
   * (has "can be your commander" text or is a legendary creature/planeswalker)
   */
  private canBeCommander(card: Card): boolean {
    const oracleText = card.oracleText?.toLowerCase() ?? '';

    // Check for explicit "can be your commander" text
    if (oracleText.includes('can be your commander')) {
      return true;
    }

    // Legendary creatures and planeswalkers can be commanders in Brawl
    const isLegendary = card.supertypes?.includes('Legendary') ?? false;
    const isCreature = card.types?.includes('Creature') ?? false;
    const isPlaneswalker = card.types?.includes('Planeswalker') ?? false;

    return isLegendary && (isCreature || isPlaneswalker);
  }
}
