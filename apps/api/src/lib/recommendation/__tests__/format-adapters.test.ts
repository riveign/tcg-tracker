/**
 * Format Adapters Unit Tests
 *
 * Tests for StandardAdapter and CommanderAdapter format-specific rules.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { StandardAdapter } from '../format-adapters/standard.js';
import { CommanderAdapter } from '../format-adapters/commander.js';
import { FormatAdapterFactory } from '../format-adapters/factory.js';
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

function createMockDeckCard(card: Card, quantity = 1, cardType: 'mainboard' | 'sideboard' | 'commander' = 'mainboard'): DeckCard {
  return {
    cardId: card.id,
    quantity,
    cardType,
    card,
  };
}

// =============================================================================
// StandardAdapter Tests
// =============================================================================

describe('StandardAdapter', () => {
  let adapter: StandardAdapter;

  beforeEach(() => {
    adapter = new StandardAdapter();
  });

  describe('format configuration', () => {
    it('should have correct format type', () => {
      expect(adapter.format).toBe('standard');
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
      expect(adapter.copyLimit.exceptions.get('Island')).toBe(Infinity);
      expect(adapter.copyLimit.exceptions.get('Swamp')).toBe(Infinity);
      expect(adapter.copyLimit.exceptions.get('Mountain')).toBe(Infinity);
      expect(adapter.copyLimit.exceptions.get('Forest')).toBe(Infinity);
    });
  });

  describe('isLegal', () => {
    it('should return true for legal cards', () => {
      const card = createMockCard();
      expect(adapter.isLegal(card)).toBe(true);
    });

    it('should return false for non-legal cards', () => {
      const card = createMockCard({
        gameData: { legalities: { standard: 'not_legal' } },
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
        gameData: { legalities: { standard: 'banned' } },
      });
      expect(adapter.isBanned(card)).toBe(true);
    });

    it('should return false for legal cards', () => {
      const card = createMockCard();
      expect(adapter.isBanned(card)).toBe(false);
    });
  });

  describe('validateDeck', () => {
    it('should fail if deck has less than 60 cards', () => {
      const cards = Array.from({ length: 55 }, (_, i) =>
        createMockDeckCard(createMockCard({ id: `card-${i}`, name: `Card ${i}` }))
      );
      const deck = createMockDeck({ cards });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DECK_SIZE_BELOW_MINIMUM')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('55 cards'))).toBe(true);
    });

    it('should pass with exactly 60 cards', () => {
      const cards = Array.from({ length: 60 }, (_, i) =>
        createMockDeckCard(createMockCard({ id: `card-${i}`, name: `Card ${i}` }))
      );
      const deck = createMockDeck({ cards });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if a non-basic card exceeds 4 copies', () => {
      const boltCard = createMockCard({ id: 'bolt-id', name: 'Lightning Bolt' });
      const cards = [createMockDeckCard(boltCard, 5)];
      const deck = createMockDeck({ cards });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'COPY_LIMIT_EXCEEDED')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('Lightning Bolt'))).toBe(true);
    });

    it('should allow more than 4 basic lands', () => {
      const plainsCard = createMockCard({
        id: 'plains-id',
        name: 'Plains',
        types: ['Land'],
        typeLine: 'Basic Land - Plains',
      });
      const otherCards = Array.from({ length: 36 }, (_, i) =>
        createMockDeckCard(createMockCard({ id: `card-${i}`, name: `Card ${i}` }))
      );
      const cards = [createMockDeckCard(plainsCard, 24), ...otherCards];
      const deck = createMockDeck({ cards });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(true);
    });

    it('should fail if sideboard exceeds 15 cards', () => {
      const mainboard = Array.from({ length: 60 }, (_, i) =>
        createMockDeckCard(createMockCard({ id: `main-${i}`, name: `Main ${i}` }))
      );
      const sideboard = Array.from({ length: 16 }, (_, i) =>
        createMockDeckCard(
          createMockCard({ id: `side-${i}`, name: `Side ${i}` }),
          1,
          'sideboard'
        )
      );
      const deck = createMockDeck({ cards: [...mainboard, ...sideboard] });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'SIDEBOARD_EXCEEDS_MAXIMUM')).toBe(true);
    });

    it('should fail if deck contains non-legal cards', () => {
      const illegalCard = createMockCard({
        id: 'illegal-id',
        name: 'Illegal Card',
        gameData: { legalities: { standard: 'not_legal' } },
      });
      const legalCards = Array.from({ length: 59 }, (_, i) =>
        createMockDeckCard(createMockCard({ id: `card-${i}`, name: `Card ${i}` }))
      );
      const deck = createMockDeck({ cards: [createMockDeckCard(illegalCard), ...legalCards] });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CARD_NOT_LEGAL')).toBe(true);
    });
  });

  describe('canAddCard', () => {
    it('should allow adding a legal card', () => {
      const card = createMockCard();
      const deck = createMockDeck();

      const result = adapter.canAddCard(card, deck);

      expect(result.valid).toBe(true);
    });

    it('should reject adding an illegal card', () => {
      const card = createMockCard({
        gameData: { legalities: { standard: 'not_legal' } },
      });
      const deck = createMockDeck();

      const result = adapter.canAddCard(card, deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CARD_NOT_LEGAL')).toBe(true);
    });

    it('should reject adding 5th copy of a card', () => {
      const card = createMockCard({ id: 'bolt-id', name: 'Lightning Bolt' });
      const deck = createMockDeck({
        cards: [createMockDeckCard(card, 4)],
      });

      const result = adapter.canAddCard(card, deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'COPY_LIMIT_REACHED')).toBe(true);
    });
  });

  describe('getColorConstraint', () => {
    it('should not enforce color constraint for Standard', () => {
      const deck = createMockDeck();
      const constraint = adapter.getColorConstraint(deck);

      expect(constraint.enforced).toBe(false);
      expect(constraint.allowedColors).toEqual(['W', 'U', 'B', 'R', 'G']);
    });
  });

  describe('getDeckStage', () => {
    it('should return early for small decks', () => {
      const cards = Array.from({ length: 15 }, (_, i) =>
        createMockDeckCard(createMockCard({ id: `card-${i}`, name: `Card ${i}` }))
      );
      const deck = createMockDeck({ cards });

      expect(adapter.getDeckStage(deck)).toBe('early');
    });

    it('should return complete for 60+ card decks', () => {
      const cards = Array.from({ length: 60 }, (_, i) =>
        createMockDeckCard(createMockCard({ id: `card-${i}`, name: `Card ${i}` }))
      );
      const deck = createMockDeck({ cards });

      expect(adapter.getDeckStage(deck)).toBe('complete');
    });
  });
});

// =============================================================================
// CommanderAdapter Tests
// =============================================================================

describe('CommanderAdapter', () => {
  let adapter: CommanderAdapter;

  beforeEach(() => {
    adapter = new CommanderAdapter();
  });

  describe('format configuration', () => {
    it('should have correct format type', () => {
      expect(adapter.format).toBe('commander');
    });

    it('should have correct deck size configuration', () => {
      expect(adapter.deckSize.mainboard.min).toBe(99);
      expect(adapter.deckSize.mainboard.max).toBe(99);
      expect(adapter.deckSize.commander).toBe(true);
    });

    it('should have singleton copy limit', () => {
      expect(adapter.copyLimit.default).toBe(1);
    });

    it('should allow Relentless Rats exception', () => {
      expect(adapter.copyLimit.exceptions.get('Relentless Rats')).toBe(Infinity);
    });

    it('should limit Seven Dwarves to 7', () => {
      expect(adapter.copyLimit.exceptions.get('Seven Dwarves')).toBe(7);
    });
  });

  describe('validateDeck', () => {
    it('should fail if deck has no commander', () => {
      const cards = Array.from({ length: 99 }, (_, i) =>
        createMockDeckCard(createMockCard({ id: `card-${i}`, name: `Card ${i}` }))
      );
      const deck = createMockDeck({ cards });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'NO_COMMANDER')).toBe(true);
    });

    it('should fail if a card is not singleton', () => {
      const commanderCard = createMockCard({
        id: 'commander-id',
        name: 'Test Commander',
        supertypes: ['Legendary'],
        types: ['Creature'],
      });
      const duplicateCard = createMockCard({ id: 'dup-id', name: 'Sol Ring' });

      const cards = [
        createMockDeckCard(commanderCard, 1, 'commander'),
        createMockDeckCard(duplicateCard, 2, 'mainboard'),
      ];
      const deck = createMockDeck({ cards, commander: createMockDeckCard(commanderCard, 1, 'commander') });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'SINGLETON_VIOLATION')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('Sol Ring'))).toBe(true);
    });

    it('should allow Relentless Rats in multiples', () => {
      const commanderCard = createMockCard({
        id: 'commander-id',
        name: 'Test Commander',
        supertypes: ['Legendary'],
        types: ['Creature'],
        colorIdentity: ['B'],
      });
      const relentlessRats = createMockCard({
        id: 'rats-id',
        name: 'Relentless Rats',
        colorIdentity: ['B'],
      });
      const otherCards = Array.from({ length: 68 }, (_, i) =>
        createMockDeckCard(
          createMockCard({ id: `card-${i}`, name: `Card ${i}`, colorIdentity: ['B'] })
        )
      );

      const cards = [
        createMockDeckCard(commanderCard, 1, 'commander'),
        createMockDeckCard(relentlessRats, 30),
        ...otherCards,
      ];
      const deck = createMockDeck({
        cards,
        commander: createMockDeckCard(commanderCard, 1, 'commander'),
      });

      const result = adapter.validateDeck(deck);

      // Should not have singleton violation for Relentless Rats
      expect(result.errors.filter((e) => e.code === 'SINGLETON_VIOLATION')).toHaveLength(0);
    });

    it('should fail if card is outside commander color identity', () => {
      const commanderCard = createMockCard({
        id: 'commander-id',
        name: 'Blue Commander',
        supertypes: ['Legendary'],
        types: ['Creature'],
        colorIdentity: ['U', 'B'],
      });
      const redCard = createMockCard({
        id: 'red-card-id',
        name: 'Red Card',
        colorIdentity: ['R'],
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

  describe('canAddCard', () => {
    it('should reject adding duplicate non-basic card', () => {
      const commanderCard = createMockCard({
        id: 'commander-id',
        name: 'Test Commander',
        supertypes: ['Legendary'],
        types: ['Creature'],
        colorIdentity: ['W'],
      });
      const solRing = createMockCard({
        id: 'sol-ring-id',
        name: 'Sol Ring',
        colorIdentity: [],
      });

      const deck = createMockDeck({
        cards: [
          createMockDeckCard(commanderCard, 1, 'commander'),
          createMockDeckCard(solRing, 1),
        ],
        commander: createMockDeckCard(commanderCard, 1, 'commander'),
      });

      const result = adapter.canAddCard(solRing, deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'SINGLETON_VIOLATION')).toBe(true);
    });

    it('should reject card outside color identity', () => {
      const commanderCard = createMockCard({
        id: 'commander-id',
        name: 'White Commander',
        supertypes: ['Legendary'],
        types: ['Creature'],
        colorIdentity: ['W'],
      });
      const blueCard = createMockCard({
        id: 'blue-card-id',
        name: 'Blue Card',
        colorIdentity: ['U'],
      });

      const deck = createMockDeck({
        cards: [createMockDeckCard(commanderCard, 1, 'commander')],
        commander: createMockDeckCard(commanderCard, 1, 'commander'),
      });

      const result = adapter.canAddCard(blueCard, deck);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'COLOR_IDENTITY_VIOLATION')).toBe(true);
    });

    it('should allow colorless cards in any deck', () => {
      const commanderCard = createMockCard({
        id: 'commander-id',
        name: 'Test Commander',
        supertypes: ['Legendary'],
        types: ['Creature'],
        colorIdentity: ['G'],
      });
      const colorlessCard = createMockCard({
        id: 'colorless-id',
        name: 'Colorless Artifact',
        colorIdentity: [],
      });

      const deck = createMockDeck({
        cards: [createMockDeckCard(commanderCard, 1, 'commander')],
        commander: createMockDeckCard(commanderCard, 1, 'commander'),
      });

      const result = adapter.canAddCard(colorlessCard, deck);

      expect(result.valid).toBe(true);
    });
  });

  describe('getColorConstraint', () => {
    it('should return commander color identity when commander present', () => {
      const commanderCard = createMockCard({
        id: 'commander-id',
        name: 'Esper Commander',
        supertypes: ['Legendary'],
        types: ['Creature'],
        colorIdentity: ['W', 'U', 'B'],
      });

      const deck = createMockDeck({
        cards: [createMockDeckCard(commanderCard, 1, 'commander')],
        commander: createMockDeckCard(commanderCard, 1, 'commander'),
      });

      const constraint = adapter.getColorConstraint(deck);

      expect(constraint.enforced).toBe(true);
      expect(constraint.allowedColors).toEqual(['W', 'U', 'B']);
    });

    it('should not enforce when no commander present', () => {
      const deck = createMockDeck();
      const constraint = adapter.getColorConstraint(deck);

      expect(constraint.enforced).toBe(false);
    });
  });

  describe('isColorCompatible', () => {
    it('should allow cards within color identity', () => {
      const whiteCard = createMockCard({ colorIdentity: ['W'] });
      const constraint = { allowedColors: ['W', 'U'] as ManaColor[], enforced: true };

      expect(adapter.isColorCompatible(whiteCard, constraint)).toBe(true);
    });

    it('should reject cards outside color identity', () => {
      const redCard = createMockCard({ colorIdentity: ['R'] });
      const constraint = { allowedColors: ['W', 'U'] as ManaColor[], enforced: true };

      expect(adapter.isColorCompatible(redCard, constraint)).toBe(false);
    });

    it('should allow colorless cards', () => {
      const colorlessCard = createMockCard({ colorIdentity: [] });
      const constraint = { allowedColors: ['W'] as ManaColor[], enforced: true };

      expect(adapter.isColorCompatible(colorlessCard, constraint)).toBe(true);
    });
  });
});

// =============================================================================
// FormatAdapterFactory Tests
// =============================================================================

describe('FormatAdapterFactory', () => {
  beforeEach(() => {
    FormatAdapterFactory.clearCache();
  });

  describe('create', () => {
    it('should create StandardAdapter for standard format', () => {
      const adapter = FormatAdapterFactory.create('standard');
      expect(adapter.format).toBe('standard');
    });

    it('should create CommanderAdapter for commander format', () => {
      const adapter = FormatAdapterFactory.create('commander');
      expect(adapter.format).toBe('commander');
    });

    it('should cache adapters', () => {
      const adapter1 = FormatAdapterFactory.create('standard');
      const adapter2 = FormatAdapterFactory.create('standard');
      expect(adapter1).toBe(adapter2);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return all supported formats', () => {
      const formats = FormatAdapterFactory.getSupportedFormats();
      expect(formats).toContain('standard');
      expect(formats).toContain('modern');
      expect(formats).toContain('commander');
      expect(formats).toContain('brawl');
    });
  });

  describe('isSupported', () => {
    it('should return true for supported formats', () => {
      expect(FormatAdapterFactory.isSupported('standard')).toBe(true);
      expect(FormatAdapterFactory.isSupported('commander')).toBe(true);
    });

    it('should return false for unsupported formats', () => {
      expect(FormatAdapterFactory.isSupported('vintage')).toBe(false);
      expect(FormatAdapterFactory.isSupported('invalid')).toBe(false);
    });
  });
});
