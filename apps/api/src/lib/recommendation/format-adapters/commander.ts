/**
 * Commander Format Adapter
 *
 * Implements format rules for Commander (EDH):
 * - 99-card singleton mainboard + 1 commander
 * - No sideboard (except companion rules)
 * - Singleton rule (1 copy except basic lands and special exceptions)
 * - Color identity enforcement based on commander
 * - Commander-legal card pool
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

// Cards that bypass the singleton rule
const RELENTLESS_CARDS = new Map<string, number>([
  ['Relentless Rats', Infinity],
  ['Shadowborn Apostle', Infinity],
  ['Persistent Petitioners', Infinity],
  ['Rat Colony', Infinity],
  ["Dragon's Approach", Infinity],
  ['Slime Against Humanity', Infinity],
  ['Seven Dwarves', 7],
]);

const COMMANDER_COPY_LIMIT = 1;

const CATEGORY_TARGETS: CategoryTargets = {
  lands: { min: 34, opt: 37, max: 40 },
  ramp: { min: 8, opt: 10, max: 15 },
  cardDraw: { min: 5, opt: 10, max: 12 },
  removal: { min: 8, opt: 10, max: 12 },
  boardWipe: { min: 2, opt: 4, max: 5 },
  protection: { min: 2, opt: 4, max: 6 },
  threats: { min: 10, opt: 15, max: 25 },
  tutor: { min: 0, opt: 3, max: 8 },
  recursion: { min: 2, opt: 5, max: 8 },
};

const SCORE_WEIGHTS: ScoreWeights = {
  mechanical: 35,
  strategic: 30,
  formatContext: 25,
  theme: 10,
};

const STAGE_THRESHOLDS: StageThresholds = {
  early: 30,
  mid: 60,
  late: 85,
};

const ARCHETYPE_MODIFIERS: Record<string, ArchetypeModifiers> = {
  tribal: {
    categoryWeights: {
      creatures: 1.5,
      threats: 1.2,
    },
    preferredKeywords: [],
    avoidKeywords: [],
  },
  aristocrats: {
    categoryWeights: {
      creatures: 1.3,
      recursion: 1.5,
      cardDraw: 1.2,
    },
    preferredKeywords: ['sacrifice', 'death trigger'],
    avoidKeywords: [],
  },
  spellslinger: {
    categoryWeights: {
      cardDraw: 1.4,
      removal: 1.2,
      creatures: 0.7,
    },
    preferredKeywords: ['magecraft', 'prowess', 'storm'],
    avoidKeywords: [],
  },
  voltron: {
    categoryWeights: {
      protection: 1.5,
      ramp: 1.3,
      creatures: 0.6,
    },
    preferredKeywords: ['equip', 'aura', 'hexproof', 'indestructible'],
    avoidKeywords: [],
  },
  reanimator: {
    categoryWeights: {
      recursion: 1.6,
      cardDraw: 1.3,
      creatures: 1.2,
    },
    preferredKeywords: ['reanimate', 'graveyard'],
    avoidKeywords: [],
  },
  control: {
    categoryWeights: {
      removal: 1.4,
      boardWipe: 1.5,
      cardDraw: 1.3,
      protection: 1.2,
    },
    preferredKeywords: ['counter', 'flash', 'hexproof'],
    avoidKeywords: [],
  },
  combo: {
    categoryWeights: {
      tutor: 1.6,
      cardDraw: 1.4,
      protection: 1.3,
    },
    preferredKeywords: [],
    avoidKeywords: [],
  },
  tokens: {
    categoryWeights: {
      creatures: 1.3,
      threats: 1.4,
    },
    preferredKeywords: ['create', 'token', 'populate'],
    avoidKeywords: [],
  },
  default: {
    categoryWeights: {},
    preferredKeywords: [],
    avoidKeywords: [],
  },
};

// =============================================================================
// Commander Adapter Implementation
// =============================================================================

export class CommanderAdapter implements FormatAdapter {
  readonly format: FormatType = 'commander';

  readonly deckSize: DeckSizeConfig = {
    mainboard: { min: 99, max: 99, optimal: 99 },
    commander: true,
  };

  readonly copyLimit: CopyLimitConfig = {
    default: COMMANDER_COPY_LIMIT,
    exceptions: new Map([
      ...[...BASIC_LAND_NAMES].map((name) => [name, Infinity] as [string, number]),
      ...RELENTLESS_CARDS,
    ]),
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

    const status = legalities.commander;
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
      const canBeCommander = this.canBeCommander(commanderCard.card);

      if (!canBeCommander && !(isLegendary && isCreature)) {
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

    // Check deck size (should be exactly 99 for mainboard)
    if (mainboardCount < this.deckSize.mainboard.min) {
      errors.push({
        code: 'DECK_SIZE_BELOW_MINIMUM',
        message: `Deck has ${mainboardCount} cards in the 99, minimum is ${this.deckSize.mainboard.min}`,
      });
    }

    if (this.deckSize.mainboard.max && mainboardCount > this.deckSize.mainboard.max) {
      errors.push({
        code: 'DECK_SIZE_ABOVE_MAXIMUM',
        message: `Deck has ${mainboardCount} cards in the 99, maximum is ${this.deckSize.mainboard.max}`,
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

    // Check legality of each card
    for (const deckCard of deck.cards) {
      if (!this.isLegal(deckCard.card)) {
        errors.push({
          code: 'CARD_NOT_LEGAL',
          message: `${deckCard.card.name} is not legal in Commander`,
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

    // Check legality
    if (!this.isLegal(card)) {
      errors.push({
        code: 'CARD_NOT_LEGAL',
        message: `${card.name} is not legal in Commander`,
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
      // Early deck: prefer 2-4 CMC cards for ramp and draw
      return 3;
    }

    // Calculate current average CMC
    const totalCMC = mainboardCards.reduce((sum, c) => {
      const cmc = c.card.cmc ? parseFloat(String(c.card.cmc)) : 0;
      return sum + cmc * c.quantity;
    }, 0);

    const totalCards = mainboardCards.reduce((sum, c) => sum + c.quantity, 0);
    const avgCMC = totalCards > 0 ? totalCMC / totalCards : 3;

    // Commander decks tend to have higher average CMC (3.0-3.8)
    const targetAvgCMC = 3.4;

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
    // Check special exceptions first (Relentless Rats, etc.)
    const exception = this.copyLimit.exceptions.get(card.name);
    if (exception !== undefined) return exception;

    return this.copyLimit.default;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Check if a card can be used as a commander
   * (has "can be your commander" text or is a planeswalker that can be commander)
   */
  private canBeCommander(card: Card): boolean {
    const oracleText = card.oracleText?.toLowerCase() ?? '';

    // Check for explicit "can be your commander" text
    if (oracleText.includes('can be your commander')) {
      return true;
    }

    // Legendary creatures can always be commanders
    const isLegendary = card.supertypes?.includes('Legendary') ?? false;
    const isCreature = card.types?.includes('Creature') ?? false;

    return isLegendary && isCreature;
  }
}
