/**
 * Format Adapters Phase 2 Unit Tests
 *
 * Tests for ModernAdapter, BrawlAdapter, banned-lists module, and ArchetypeDetector.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { ModernAdapter } from '../format-adapters/modern.js';
import { BrawlAdapter } from '../format-adapters/brawl.js';
import { FormatAdapterFactory } from '../format-adapters/factory.js';
import {
  getLegalityStatus,
  isLegal,
  isBanned,
  filterLegalCards,
  analyzeFormatCoverage,
} from '../format-adapters/banned-lists.js';
import { ArchetypeDetector } from '../archetype-detector.js';
import type { Card } from '@tcg-tracker/db';
import type { DeckWithCards, DeckCard, ManaColor } from '../format-adapters/types.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-card-id',
    oracleId: 'test-oracle-id',
    name: 'Test Card',
    typeLine: 'Creature - Human',
    oracleText: 'Test oracle text',
    types: ['Creature'],
    subtypes: ['Human'],
    supertypes: [],
    keywords: [],
    manaCost: '{2}{W}',
    cmc: '3',
    colors: ['W'],
    colorIdentity: ['W'],
    power: '2',
    toughness: '2',
    loyalty: null,
    setCode: 'TST',
    setName: 'Test Set',
    collectorNumber: '001',
    rarity: 'common',
    artist: 'Test Artist',
    flavorText: null,
    imageUris: null,
    gameData: {
      legalities: {
        standard: 'legal',
        modern: 'legal',
        commander: 'legal',
        brawl: 'legal',
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockDeck(overrides: Partial<DeckWithCards> = {}): DeckWithCards {
  return {
    id: 'test-deck-id',
    name: 'Test Deck',
    format: null,
    collectionId: null,
    cards: [],
    ...overrides,
  };
}

function createMockDeckCard(
  card: Card,
  quantity = 1,
  cardType: 'mainboard' | 'sideboard' | 'commander' = 'mainboard'
): DeckCard {
  return {
    cardId: card.id,
    quantity,
    cardType,
    card,
  };
}

// =============================================================================
// ModernAdapter Tests
// =============================================================================

describe('ModernAdapter', () => {
  let adapter: ModernAdapter;

  beforeEach(() => {
    adapter = new ModernAdapter();
  });

  describe('format configuration', () => {
    it('should have correct format type', () => {
      expect(adapter.format).toBe('modern');
    });

    it('should have correct deck size configuration', () => {
      expect(adapter.deckSize.mainboard.min).toBe(60);
      expect(adapter.deckSize.mainboard.optimal).toBe(60);
      expect(adapter.deckSize.mainboard.max).toBe(null);
      expect(adapter.deckSize.sideboard?.max).toBe(15);
    });

    it('should have 4-copy limit as default', () => {
      expect(adapter.copyLimit.default).toBe(4);
    });

    it('should allow unlimited basic lands', () => {
      expect(adapter.copyLimit.exceptions.get('Plains')).toBe(Infinity);
      expect(adapter.copyLimit.exceptions.get('Mountain')).toBe(Infinity);
    });
  });

  describe('isLegal', () => {
    it('should return true for Modern-legal cards', () => {
      const card = createMockCard({
        gameData: { legalities: { modern: 'legal' } },
      });
      expect(adapter.isLegal(card)).toBe(true);
    });

    it('should return false for non-Modern-legal cards', () => {
      const card = createMockCard({
        gameData: { legalities: { modern: 'not_legal' } },
      });
      expect(adapter.isLegal(card)).toBe(false);
    });

    it('should return false for cards with no gameData', () => {
      const card = createMockCard({ gameData: null });
      expect(adapter.isLegal(card)).toBe(false);
    });
  });

  describe('isBanned', () => {
    it('should return true for banned cards', () => {
      const card = createMockCard({
        name: 'Banned Card',
        gameData: { legalities: { modern: 'banned' } },
      });
      expect(adapter.isBanned(card)).toBe(true);
    });

    it('should return false for legal cards', () => {
      const card = createMockCard({
        gameData: { legalities: { modern: 'legal' } },
      });
      expect(adapter.isBanned(card)).toBe(false);
    });
  });

  describe('validateDeck', () => {
    it('should fail if deck has less than 60 cards', () => {
      const cards = Array.from({ length: 55 }, (_, i) =>
        createMockDeckCard(
          createMockCard({
            id: `card-${i}`,
            name: `Card ${i}`,
            gameData: { legalities: { modern: 'legal' } },
          })
        )
      );
      const deck = createMockDeck({ cards });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DECK_SIZE_BELOW_MINIMUM')).toBe(true);
    });

    it('should pass with exactly 60 cards', () => {
      const cards = Array.from({ length: 60 }, (_, i) =>
        createMockDeckCard(
          createMockCard({
            id: `card-${i}`,
            name: `Card ${i}`,
            gameData: { legalities: { modern: 'legal' } },
          })
        )
      );
      const deck = createMockDeck({ cards });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if a non-basic card exceeds 4 copies', () => {
      const boltCard = createMockCard({
        id: 'bolt-id',
        name: 'Lightning Bolt',
        gameData: { legalities: { modern: 'legal' } },
      });
      const cards = [createMockDeckCard(boltCard, 5)];
      const deck = createMockDeck({ cards });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'COPY_LIMIT_EXCEEDED')).toBe(true);
    });

    it('should fail if deck contains non-Modern-legal cards', () => {
      const illegalCard = createMockCard({
        id: 'illegal-id',
        name: 'Standard Only Card',
        gameData: { legalities: { modern: 'not_legal', standard: 'legal' } },
      });
      const legalCards = Array.from({ length: 59 }, (_, i) =>
        createMockDeckCard(
          createMockCard({
            id: `card-${i}`,
            name: `Card ${i}`,
            gameData: { legalities: { modern: 'legal' } },
          })
        )
      );
      const deck = createMockDeck({ cards: [createMockDeckCard(illegalCard), ...legalCards] });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CARD_NOT_LEGAL')).toBe(true);
    });
  });

  describe('getColorConstraint', () => {
    it('should not enforce color constraint for Modern', () => {
      const deck = createMockDeck();
      const constraint = adapter.getColorConstraint(deck);

      expect(constraint.enforced).toBe(false);
      expect(constraint.allowedColors).toEqual(['W', 'U', 'B', 'R', 'G']);
    });
  });

  describe('getOptimalCMCPosition', () => {
    it('should suggest low CMC for empty decks', () => {
      const deck = createMockDeck({ cards: [] });
      const optimalCMC = adapter.getOptimalCMCPosition(deck);

      expect(optimalCMC).toBe(2);
    });

    it('should adjust based on current deck average', () => {
      const cards = [
        createMockDeckCard(createMockCard({ cmc: '1', name: 'Card 1' }), 4),
        createMockDeckCard(createMockCard({ cmc: '2', name: 'Card 2' }), 4),
      ];
      const deck = createMockDeck({ cards });

      const optimalCMC = adapter.getOptimalCMCPosition(deck);

      // Low average should suggest higher CMC
      expect(optimalCMC).toBeGreaterThan(1);
    });
  });
});

// =============================================================================
// BrawlAdapter Tests
// =============================================================================

describe('BrawlAdapter', () => {
  let adapter: BrawlAdapter;

  beforeEach(() => {
    adapter = new BrawlAdapter();
  });

  describe('format configuration', () => {
    it('should have correct format type', () => {
      expect(adapter.format).toBe('brawl');
    });

    it('should have correct deck size configuration', () => {
      expect(adapter.deckSize.mainboard.min).toBe(59);
      expect(adapter.deckSize.mainboard.max).toBe(59);
      expect(adapter.deckSize.commander).toBe(true);
    });

    it('should have singleton copy limit', () => {
      expect(adapter.copyLimit.default).toBe(1);
    });

    it('should allow unlimited basic lands', () => {
      expect(adapter.copyLimit.exceptions.get('Plains')).toBe(Infinity);
      expect(adapter.copyLimit.exceptions.get('Island')).toBe(Infinity);
    });
  });

  describe('isLegal', () => {
    it('should return true for Brawl-legal cards', () => {
      const card = createMockCard({
        gameData: { legalities: { brawl: 'legal' } },
      });
      expect(adapter.isLegal(card)).toBe(true);
    });

    it('should fall back to Standard legality', () => {
      const card = createMockCard({
        gameData: { legalities: { standard: 'legal' } },
      });
      expect(adapter.isLegal(card)).toBe(true);
    });

    it('should return false for non-Standard-legal cards', () => {
      const card = createMockCard({
        gameData: { legalities: { standard: 'not_legal', brawl: 'not_legal' } },
      });
      expect(adapter.isLegal(card)).toBe(false);
    });
  });

  describe('validateDeck', () => {
    it('should fail if deck has no commander', () => {
      const cards = Array.from({ length: 59 }, (_, i) =>
        createMockDeckCard(
          createMockCard({
            id: `card-${i}`,
            name: `Card ${i}`,
            gameData: { legalities: { brawl: 'legal' } },
          })
        )
      );
      const deck = createMockDeck({ cards });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'NO_COMMANDER')).toBe(true);
    });

    it('should fail if a card is not singleton', () => {
      const commanderCard = createMockCard({
        id: 'commander-id',
        name: 'Brawl Commander',
        supertypes: ['Legendary'],
        types: ['Creature'],
        gameData: { legalities: { brawl: 'legal' } },
      });
      const duplicateCard = createMockCard({
        id: 'dup-id',
        name: 'Test Card',
        gameData: { legalities: { brawl: 'legal' } },
      });

      const cards = [
        createMockDeckCard(commanderCard, 1, 'commander'),
        createMockDeckCard(duplicateCard, 2, 'mainboard'),
      ];
      const deck = createMockDeck({
        cards,
        commander: createMockDeckCard(commanderCard, 1, 'commander'),
      });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'SINGLETON_VIOLATION')).toBe(true);
    });

    it('should allow legendary planeswalkers as commanders', () => {
      const planeswalkerCommander = createMockCard({
        id: 'pw-commander-id',
        name: 'Legendary Planeswalker',
        supertypes: ['Legendary'],
        types: ['Planeswalker'],
        colorIdentity: ['U'],
        gameData: { legalities: { brawl: 'legal' } },
      });

      const cards = [createMockDeckCard(planeswalkerCommander, 1, 'commander')];
      const deck = createMockDeck({
        cards,
        commander: createMockDeckCard(planeswalkerCommander, 1, 'commander'),
      });

      const result = adapter.validateDeck(deck);

      // Should not have INVALID_COMMANDER error
      expect(result.errors.filter((e) => e.code === 'INVALID_COMMANDER')).toHaveLength(0);
    });

    it('should enforce color identity', () => {
      const commanderCard = createMockCard({
        id: 'commander-id',
        name: 'Blue Commander',
        supertypes: ['Legendary'],
        types: ['Creature'],
        colorIdentity: ['U'],
        gameData: { legalities: { brawl: 'legal' } },
      });
      const redCard = createMockCard({
        id: 'red-card-id',
        name: 'Red Card',
        colorIdentity: ['R'],
        gameData: { legalities: { brawl: 'legal' } },
      });

      const cards = [
        createMockDeckCard(commanderCard, 1, 'commander'),
        createMockDeckCard(redCard, 1),
      ];
      const deck = createMockDeck({
        cards,
        commander: createMockDeckCard(commanderCard, 1, 'commander'),
      });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'COLOR_IDENTITY_VIOLATION')).toBe(true);
    });
  });

  describe('getColorConstraint', () => {
    it('should return commander color identity when present', () => {
      const commanderCard = createMockCard({
        id: 'commander-id',
        name: 'Two-Color Commander',
        supertypes: ['Legendary'],
        types: ['Creature'],
        colorIdentity: ['W', 'B'],
      });

      const deck = createMockDeck({
        cards: [createMockDeckCard(commanderCard, 1, 'commander')],
        commander: createMockDeckCard(commanderCard, 1, 'commander'),
      });

      const constraint = adapter.getColorConstraint(deck);

      expect(constraint.enforced).toBe(true);
      expect(constraint.allowedColors).toEqual(['W', 'B']);
    });
  });
});

// =============================================================================
// Banned Lists Tests
// =============================================================================

describe('Banned Lists Module', () => {
  describe('getLegalityStatus', () => {
    it('should return legal status for legal cards', () => {
      const card = createMockCard({
        gameData: { legalities: { modern: 'legal' } },
      });
      expect(getLegalityStatus(card, 'modern')).toBe('legal');
    });

    it('should return banned status for banned cards', () => {
      const card = createMockCard({
        gameData: { legalities: { modern: 'banned' } },
      });
      expect(getLegalityStatus(card, 'modern')).toBe('banned');
    });

    it('should return not_legal for cards without legality data', () => {
      const card = createMockCard({ gameData: null });
      expect(getLegalityStatus(card, 'modern')).toBe('not_legal');
    });

    it('should fall back to Standard for Brawl', () => {
      const card = createMockCard({
        gameData: { legalities: { standard: 'legal' } },
      });
      expect(getLegalityStatus(card, 'brawl')).toBe('legal');
    });
  });

  describe('isLegal', () => {
    it('should return true for legal cards', () => {
      const card = createMockCard({
        gameData: { legalities: { standard: 'legal' } },
      });
      expect(isLegal(card, 'standard')).toBe(true);
    });

    it('should return false for banned cards', () => {
      const card = createMockCard({
        gameData: { legalities: { standard: 'banned' } },
      });
      expect(isLegal(card, 'standard')).toBe(false);
    });
  });

  describe('isBanned', () => {
    it('should return true for banned cards', () => {
      const card = createMockCard({
        gameData: { legalities: { commander: 'banned' } },
      });
      expect(isBanned(card, 'commander')).toBe(true);
    });

    it('should return false for legal cards', () => {
      const card = createMockCard({
        gameData: { legalities: { commander: 'legal' } },
      });
      expect(isBanned(card, 'commander')).toBe(false);
    });
  });

  describe('filterLegalCards', () => {
    it('should filter to only legal cards', () => {
      const cards = [
        createMockCard({
          id: 'legal-1',
          name: 'Legal Card 1',
          gameData: { legalities: { modern: 'legal' } },
        }),
        createMockCard({
          id: 'illegal-1',
          name: 'Illegal Card',
          gameData: { legalities: { modern: 'not_legal' } },
        }),
        createMockCard({
          id: 'legal-2',
          name: 'Legal Card 2',
          gameData: { legalities: { modern: 'legal' } },
        }),
      ];

      const filtered = filterLegalCards(cards, 'modern');

      expect(filtered).toHaveLength(2);
      expect(filtered[0].name).toBe('Legal Card 1');
      expect(filtered[1].name).toBe('Legal Card 2');
    });
  });

  describe('analyzeFormatCoverage', () => {
    it('should count legal cards per format', () => {
      const cards = [
        createMockCard({
          id: 'card-1',
          gameData: {
            legalities: {
              standard: 'legal',
              modern: 'legal',
              commander: 'legal',
              brawl: 'legal',
            },
          },
        }),
        createMockCard({
          id: 'card-2',
          gameData: {
            legalities: {
              standard: 'not_legal',
              modern: 'legal',
              commander: 'legal',
              brawl: 'not_legal',
            },
          },
        }),
      ];

      const coverage = analyzeFormatCoverage(cards);

      expect(coverage.standard).toBe(1);
      expect(coverage.modern).toBe(2);
      expect(coverage.commander).toBe(2);
      expect(coverage.brawl).toBe(1);
    });
  });
});

// =============================================================================
// ArchetypeDetector Tests
// =============================================================================

describe('ArchetypeDetector', () => {
  describe('detect', () => {
    it('should detect aggro archetype', () => {
      const aggroCards = [
        // Diverse creatures to avoid tribal detection
        ...Array.from({ length: 8 }, (_, i) =>
          createMockDeckCard(
            createMockCard({
              id: `creature-${i}`,
              name: `Aggro Creature ${i}`,
              types: ['Creature'],
              subtypes: [`Type${i}`], // Unique subtypes
              keywords: ['Haste'],
              power: '3',
              toughness: '1',
            })
          )
        ),
        ...Array.from({ length: 8 }, (_, i) =>
          createMockDeckCard(
            createMockCard({
              id: `threat-${i}`,
              name: `Threat ${i}`,
              types: ['Creature'],
              subtypes: [`Species${i}`], // Unique subtypes
              keywords: ['Menace'],
              power: '4',
              toughness: '2',
            })
          )
        ),
        ...Array.from({ length: 4 }, (_, i) =>
          createMockDeckCard(
            createMockCard({
              id: `removal-${i}`,
              name: `Burn ${i}`,
              types: ['Instant'],
              oracleText: 'Deal 3 damage to any target',
            })
          )
        ),
      ];

      const deck = createMockDeck({ cards: aggroCards });
      const adapter = FormatAdapterFactory.create('standard');

      const result = ArchetypeDetector.detect(deck, adapter);

      expect(result.primary.toLowerCase()).toBe('aggro');
      expect(result.confidence).toBeGreaterThan(20);
    });

    it('should detect control archetype', () => {
      const controlCards = [
        ...Array.from({ length: 10 }, (_, i) =>
          createMockDeckCard(
            createMockCard({
              id: `removal-${i}`,
              name: `Removal ${i}`,
              types: ['Instant'],
              oracleText: 'Destroy target creature',
            })
          )
        ),
        ...Array.from({ length: 8 }, (_, i) =>
          createMockDeckCard(
            createMockCard({
              id: `draw-${i}`,
              name: `Card Draw ${i}`,
              types: ['Sorcery'],
              oracleText: 'Draw two cards',
            })
          )
        ),
      ];

      const deck = createMockDeck({ cards: controlCards });
      const adapter = FormatAdapterFactory.create('standard');

      const result = ArchetypeDetector.detect(deck, adapter);

      expect(result.primary.toLowerCase()).toBe('control');
      expect(result.confidence).toBeGreaterThan(20);
    });

    it('should detect tribal archetype', () => {
      const tribalCards = Array.from({ length: 15 }, (_, i) =>
        createMockDeckCard(
          createMockCard({
            id: `elf-${i}`,
            name: `Elf ${i}`,
            types: ['Creature'],
            subtypes: ['Elf', 'Warrior'],
          })
        )
      );

      const deck = createMockDeck({ cards: tribalCards });
      const adapter = FormatAdapterFactory.create('commander');

      const result = ArchetypeDetector.detect(deck, adapter);

      expect(result.primary.toLowerCase()).toBe('tribal');
      expect(result.confidence).toBeGreaterThan(20);
    });

    it('should return unknown for empty decks', () => {
      const deck = createMockDeck({ cards: [] });
      const adapter = FormatAdapterFactory.create('standard');

      const result = ArchetypeDetector.detect(deck, adapter);

      expect(result.primary).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });

  describe('matches', () => {
    it('should return true if deck matches archetype', () => {
      const aggroCards = Array.from({ length: 20 }, (_, i) =>
        createMockDeckCard(
          createMockCard({
            id: `creature-${i}`,
            name: `Aggro Creature ${i}`,
            types: ['Creature'],
            keywords: ['Haste'],
            power: '3',
            toughness: '1',
          })
        )
      );

      const deck = createMockDeck({ cards: aggroCards });
      const adapter = FormatAdapterFactory.create('standard');

      const matches = ArchetypeDetector.matches(deck, 'aggro', adapter);

      expect(matches).toBe(true);
    });

    it('should return false if deck does not match archetype', () => {
      const controlCards = Array.from({ length: 10 }, (_, i) =>
        createMockDeckCard(
          createMockCard({
            id: `removal-${i}`,
            name: `Removal ${i}`,
            types: ['Instant'],
            oracleText: 'Destroy target creature',
          })
        )
      );

      const deck = createMockDeck({ cards: controlCards });
      const adapter = FormatAdapterFactory.create('standard');

      const matches = ArchetypeDetector.matches(deck, 'aggro', adapter);

      expect(matches).toBe(false);
    });
  });
});

// =============================================================================
// FormatAdapterFactory Tests (Phase 2)
// =============================================================================

describe('FormatAdapterFactory - Phase 2', () => {
  beforeEach(() => {
    FormatAdapterFactory.clearCache();
  });

  describe('create', () => {
    it('should create ModernAdapter for modern format', () => {
      const adapter = FormatAdapterFactory.create('modern');
      expect(adapter.format).toBe('modern');
      expect(adapter.copyLimit.default).toBe(4);
    });

    it('should create BrawlAdapter for brawl format', () => {
      const adapter = FormatAdapterFactory.create('brawl');
      expect(adapter.format).toBe('brawl');
      expect(adapter.copyLimit.default).toBe(1);
      expect(adapter.deckSize.mainboard.min).toBe(59);
    });

    it('should cache all 4 format adapters', () => {
      const standard1 = FormatAdapterFactory.create('standard');
      const standard2 = FormatAdapterFactory.create('standard');
      const modern1 = FormatAdapterFactory.create('modern');
      const modern2 = FormatAdapterFactory.create('modern');
      const commander1 = FormatAdapterFactory.create('commander');
      const commander2 = FormatAdapterFactory.create('commander');
      const brawl1 = FormatAdapterFactory.create('brawl');
      const brawl2 = FormatAdapterFactory.create('brawl');

      expect(standard1).toBe(standard2);
      expect(modern1).toBe(modern2);
      expect(commander1).toBe(commander2);
      expect(brawl1).toBe(brawl2);
    });
  });
});
