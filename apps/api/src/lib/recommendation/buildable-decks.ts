/**
 * Buildable Decks Analyzer
 *
 * Analyzes which known deck archetypes can be built from a collection.
 * Uses meta deck templates to determine completeness and missing pieces.
 */

import type {
  FormatType,
  CollectionCard,
  BuildableDeck,
  ManaColor,
} from './format-adapters/index.js';

// =============================================================================
// Types
// =============================================================================

export interface DeckTemplate {
  name: string;
  archetype: string;
  format: FormatType;
  coreCards: DeckTemplateCard[];
  flexCards: DeckTemplateCard[];
  landBase: number;
  colorIdentity: ManaColor[];
}

export interface DeckTemplateCard {
  cardName: string;
  quantity: number;
  category: string;
  importance: 'critical' | 'important' | 'flexible';
}

export interface BuildableAnalysis {
  template: DeckTemplate;
  completeness: number;
  ownedCoreCards: string[];
  missingCoreCards: string[];
  ownedFlexCards: string[];
  missingFlexCards: string[];
  totalOwned: number;
  totalRequired: number;
}

// =============================================================================
// Deck Templates
// =============================================================================

/**
 * Known meta deck templates by format
 * In production, this would be loaded from a database or external service
 */
const DECK_TEMPLATES: Record<FormatType, DeckTemplate[]> = {
  standard: [
    {
      name: 'Mono-Red Aggro',
      archetype: 'aggro',
      format: 'standard',
      coreCards: [
        { cardName: 'Monastery Swiftspear', quantity: 4, category: 'creatures', importance: 'critical' },
        { cardName: 'Phoenix Chick', quantity: 4, category: 'creatures', importance: 'important' },
        { cardName: 'Kumano Faces Kakkazan', quantity: 4, category: 'removal', importance: 'critical' },
        { cardName: 'Play with Fire', quantity: 4, category: 'removal', importance: 'important' },
      ],
      flexCards: [
        { cardName: 'Lightning Strike', quantity: 4, category: 'removal', importance: 'flexible' },
        { cardName: 'Imodane\'s Recruiter', quantity: 4, category: 'creatures', importance: 'flexible' },
      ],
      landBase: 20,
      colorIdentity: ['R'],
    },
    {
      name: 'Esper Control',
      archetype: 'control',
      format: 'standard',
      coreCards: [
        { cardName: 'The Wandering Emperor', quantity: 4, category: 'threats', importance: 'critical' },
        { cardName: 'Make Disappear', quantity: 4, category: 'removal', importance: 'important' },
        { cardName: 'Farewell', quantity: 3, category: 'boardWipe', importance: 'critical' },
      ],
      flexCards: [
        { cardName: 'Absorb', quantity: 4, category: 'removal', importance: 'flexible' },
        { cardName: 'Memory Deluge', quantity: 3, category: 'cardDraw', importance: 'flexible' },
      ],
      landBase: 26,
      colorIdentity: ['W', 'U', 'B'],
    },
  ],
  modern: [
    {
      name: 'Burn',
      archetype: 'aggro',
      format: 'modern',
      coreCards: [
        { cardName: 'Lightning Bolt', quantity: 4, category: 'removal', importance: 'critical' },
        { cardName: 'Monastery Swiftspear', quantity: 4, category: 'creatures', importance: 'critical' },
        { cardName: 'Eidolon of the Great Revel', quantity: 4, category: 'creatures', importance: 'critical' },
        { cardName: 'Boros Charm', quantity: 4, category: 'threats', importance: 'important' },
      ],
      flexCards: [
        { cardName: 'Goblin Guide', quantity: 4, category: 'creatures', importance: 'flexible' },
        { cardName: 'Searing Blaze', quantity: 2, category: 'removal', importance: 'flexible' },
      ],
      landBase: 20,
      colorIdentity: ['R', 'W'],
    },
    {
      name: 'Elves',
      archetype: 'tribal',
      format: 'modern',
      coreCards: [
        { cardName: 'Llanowar Elves', quantity: 4, category: 'ramp', importance: 'critical' },
        { cardName: 'Elvish Archdruid', quantity: 4, category: 'ramp', importance: 'critical' },
        { cardName: 'Collected Company', quantity: 4, category: 'cardDraw', importance: 'critical' },
      ],
      flexCards: [
        { cardName: 'Craterhoof Behemoth', quantity: 2, category: 'threats', importance: 'flexible' },
        { cardName: 'Ezuri, Renegade Leader', quantity: 2, category: 'threats', importance: 'flexible' },
      ],
      landBase: 18,
      colorIdentity: ['G'],
    },
  ],
  commander: [
    {
      name: 'Aristocrats',
      archetype: 'aristocrats',
      format: 'commander',
      coreCards: [
        { cardName: 'Blood Artist', quantity: 1, category: 'threats', importance: 'critical' },
        { cardName: 'Zulaport Cutthroat', quantity: 1, category: 'threats', importance: 'critical' },
        { cardName: 'Viscera Seer', quantity: 1, category: 'creatures', importance: 'important' },
        { cardName: 'Ashnod\'s Altar', quantity: 1, category: 'ramp', importance: 'critical' },
        { cardName: 'Skullclamp', quantity: 1, category: 'cardDraw', importance: 'critical' },
      ],
      flexCards: [
        { cardName: 'Grave Pact', quantity: 1, category: 'removal', importance: 'flexible' },
        { cardName: 'Phyrexian Altar', quantity: 1, category: 'ramp', importance: 'flexible' },
      ],
      landBase: 37,
      colorIdentity: ['B'],
    },
    {
      name: 'Spellslinger',
      archetype: 'spellslinger',
      format: 'commander',
      coreCards: [
        { cardName: 'Talrand, Sky Summoner', quantity: 1, category: 'threats', importance: 'critical' },
        { cardName: 'Young Pyromancer', quantity: 1, category: 'threats', importance: 'critical' },
        { cardName: 'Archmage Emeritus', quantity: 1, category: 'cardDraw', importance: 'important' },
        { cardName: 'Counterspell', quantity: 1, category: 'removal', importance: 'important' },
      ],
      flexCards: [
        { cardName: 'Mana Drain', quantity: 1, category: 'ramp', importance: 'flexible' },
        { cardName: 'Cyclonic Rift', quantity: 1, category: 'boardWipe', importance: 'flexible' },
      ],
      landBase: 36,
      colorIdentity: ['U', 'R'],
    },
  ],
  brawl: [
    {
      name: 'Aggro',
      archetype: 'aggro',
      format: 'brawl',
      coreCards: [
        { cardName: 'Adeline, Resplendent Cathar', quantity: 1, category: 'creatures', importance: 'critical' },
        { cardName: 'Thalia, Guardian of Thraben', quantity: 1, category: 'creatures', importance: 'important' },
        { cardName: 'Brutal Cathar', quantity: 1, category: 'removal', importance: 'important' },
      ],
      flexCards: [
        { cardName: 'Legion Angel', quantity: 1, category: 'threats', importance: 'flexible' },
        { cardName: 'Skyclave Apparition', quantity: 1, category: 'removal', importance: 'flexible' },
      ],
      landBase: 24,
      colorIdentity: ['W'],
    },
  ],
};

// =============================================================================
// Buildable Decks Analyzer
// =============================================================================

export class BuildableDecksAnalyzer {
  /**
   * Analyze which decks can be built from a collection
   * @param collectionCards The cards in the collection
   * @param format The format to analyze
   * @returns Array of buildable deck analyses
   */
  static analyzeBuildableDecks(
    collectionCards: CollectionCard[],
    format: FormatType
  ): BuildableDeck[] {
    const templates = DECK_TEMPLATES[format] ?? [];
    const analyses: BuildableAnalysis[] = [];

    for (const template of templates) {
      const analysis = BuildableDecksAnalyzer.analyzeTemplate(template, collectionCards);
      analyses.push(analysis);
    }

    // Filter to only decks with >50% completeness and sort by completeness
    return analyses
      .filter((a) => a.completeness >= 50)
      .sort((a, b) => b.completeness - a.completeness)
      .map((a) => ({
        archetype: a.template.name,
        completeness: a.completeness,
        coreCardsOwned: a.ownedCoreCards,
        missingCount: a.totalRequired - a.totalOwned,
        missingKeyCards: a.missingCoreCards,
      }));
  }

  /**
   * Analyze a specific deck template against the collection
   * @param template The deck template to check
   * @param collectionCards The cards in the collection
   * @returns Analysis of how buildable the deck is
   */
  private static analyzeTemplate(
    template: DeckTemplate,
    collectionCards: CollectionCard[]
  ): BuildableAnalysis {
    // Create a lookup map for quick card checking
    const cardMap = new Map<string, CollectionCard>();
    for (const cc of collectionCards) {
      // Normalize card names for comparison (case-insensitive)
      const normalizedName = cc.card.name.toLowerCase();
      cardMap.set(normalizedName, cc);
    }

    // Check core cards
    const ownedCoreCards: string[] = [];
    const missingCoreCards: string[] = [];
    let coreCardsOwned = 0;
    let totalCoreRequired = 0;

    for (const templateCard of template.coreCards) {
      const normalizedName = templateCard.cardName.toLowerCase();
      const collectionCard = cardMap.get(normalizedName);

      totalCoreRequired += templateCard.quantity;

      if (collectionCard && collectionCard.quantity >= templateCard.quantity) {
        ownedCoreCards.push(templateCard.cardName);
        coreCardsOwned += templateCard.quantity;
      } else if (collectionCard) {
        // Partial ownership
        ownedCoreCards.push(templateCard.cardName);
        coreCardsOwned += collectionCard.quantity;
        missingCoreCards.push(
          `${templateCard.cardName} (need ${templateCard.quantity - collectionCard.quantity} more)`
        );
      } else {
        missingCoreCards.push(
          `${templateCard.cardName} (need ${templateCard.quantity})`
        );
      }
    }

    // Check flex cards
    const ownedFlexCards: string[] = [];
    const missingFlexCards: string[] = [];
    let flexCardsOwned = 0;
    let totalFlexRequired = 0;

    for (const templateCard of template.flexCards) {
      const normalizedName = templateCard.cardName.toLowerCase();
      const collectionCard = cardMap.get(normalizedName);

      totalFlexRequired += templateCard.quantity;

      if (collectionCard && collectionCard.quantity >= templateCard.quantity) {
        ownedFlexCards.push(templateCard.cardName);
        flexCardsOwned += templateCard.quantity;
      } else if (collectionCard) {
        ownedFlexCards.push(templateCard.cardName);
        flexCardsOwned += collectionCard.quantity;
        missingFlexCards.push(
          `${templateCard.cardName} (need ${templateCard.quantity - collectionCard.quantity} more)`
        );
      } else {
        missingFlexCards.push(
          `${templateCard.cardName} (need ${templateCard.quantity})`
        );
      }
    }

    // Calculate completeness
    // Weight core cards 3x more than flex cards
    const coreWeight = 3;
    const flexWeight = 1;
    const totalRequired = totalCoreRequired + totalFlexRequired;
    const totalOwned = coreCardsOwned + flexCardsOwned;

    const weightedOwned = (coreCardsOwned * coreWeight) + (flexCardsOwned * flexWeight);
    const weightedRequired = (totalCoreRequired * coreWeight) + (totalFlexRequired * flexWeight);

    const completeness = weightedRequired > 0
      ? Math.min(100, Math.round((weightedOwned / weightedRequired) * 100))
      : 0;

    return {
      template,
      completeness,
      ownedCoreCards,
      missingCoreCards,
      ownedFlexCards,
      missingFlexCards,
      totalOwned,
      totalRequired,
    };
  }

  /**
   * Get all templates for a format
   * @param format The format to get templates for
   * @returns Array of deck templates
   */
  static getTemplatesForFormat(format: FormatType): DeckTemplate[] {
    return DECK_TEMPLATES[format] ?? [];
  }

  /**
   * Find templates that match a specific archetype
   * @param format The format
   * @param archetype The archetype to match
   * @returns Array of matching templates
   */
  static findTemplatesByArchetype(
    format: FormatType,
    archetype: string
  ): DeckTemplate[] {
    const templates = DECK_TEMPLATES[format] ?? [];
    return templates.filter((t) => t.archetype === archetype);
  }
}
