/**
 * Phase 6: Recommendation Engine Integration Tests
 *
 * Tests for metadata-aware recommendation features:
 * - CommanderAdapter with deck.colors
 * - StandardAdapter with color preference
 * - ArchetypeDetector.getEffectiveArchetype()
 * - SynergyScorer with strategy boosts
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { StandardAdapter } from '../format-adapters/standard.js';
import { CommanderAdapter } from '../format-adapters/commander.js';
import { ArchetypeDetector } from '../archetype-detector.js';
import { SynergyScorer } from '../synergy-scorer.js';
import type { Card } from '@tcg-tracker/db';
import type { DeckWithCards, DeckCard, ManaColor, ScoringContext, DeckGapAnalysis } from '../format-adapters/types.js';

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
    commanderId: null,
    colors: [],
    strategy: null,
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

function createMockGaps(): DeckGapAnalysis {
  return {
    categoryBreakdown: {},
    overallScore: 50,
    recommendations: [],
  };
}

// =============================================================================
// CommanderAdapter Metadata Tests
// =============================================================================

describe('CommanderAdapter with deck metadata', () => {
  let adapter: CommanderAdapter;

  beforeEach(() => {
    adapter = new CommanderAdapter();
  });

  describe('getColorConstraint with deck.colors', () => {
    it('should use deck.colors when present instead of commander card lookup', () => {
      const deck = createMockDeck({
        colors: ['W', 'U', 'B'] as ManaColor[],
        cards: [], // No commander card
      });

      const constraint = adapter.getColorConstraint(deck);

      expect(constraint.enforced).toBe(true);
      expect(constraint.allowedColors).toEqual(['W', 'U', 'B']);
    });

    it('should fall back to commander card when deck.colors is empty', () => {
      const commanderCard = createMockCard({
        id: 'commander-id',
        name: 'Test Commander',
        supertypes: ['Legendary'],
        types: ['Creature'],
        colorIdentity: ['R', 'G'],
      });

      const deck = createMockDeck({
        colors: [], // Empty colors
        cards: [createMockDeckCard(commanderCard, 1, 'commander')],
      });

      const constraint = adapter.getColorConstraint(deck);

      expect(constraint.enforced).toBe(true);
      expect(constraint.allowedColors).toEqual(['R', 'G']);
    });

    it('should prefer deck.colors over commander card color identity', () => {
      const commanderCard = createMockCard({
        id: 'commander-id',
        name: 'Test Commander',
        supertypes: ['Legendary'],
        types: ['Creature'],
        colorIdentity: ['R', 'G'], // Commander is Gruul
      });

      const deck = createMockDeck({
        colors: ['W', 'U'] as ManaColor[], // But deck metadata says Azorius
        cards: [createMockDeckCard(commanderCard, 1, 'commander')],
      });

      const constraint = adapter.getColorConstraint(deck);

      // Should use deck.colors (Azorius), not commander (Gruul)
      expect(constraint.allowedColors).toEqual(['W', 'U']);
    });
  });

  describe('getArchetypeModifiers with strategy', () => {
    it('should return modifiers for stax strategy', () => {
      const modifiers = adapter.getArchetypeModifiers('stax');

      expect(modifiers.categoryWeights.removal).toBeGreaterThan(1);
      expect(modifiers.preferredKeywords).toContain('sacrifice');
    });

    it('should return modifiers for lands strategy', () => {
      const modifiers = adapter.getArchetypeModifiers('lands');

      expect(modifiers.categoryWeights.lands).toBeGreaterThan(1);
      expect(modifiers.categoryWeights.ramp).toBeGreaterThan(1);
      expect(modifiers.preferredKeywords).toContain('landfall');
    });

    it('should return default modifiers for unknown strategy', () => {
      const modifiers = adapter.getArchetypeModifiers('unknown_strategy');

      expect(modifiers.categoryWeights).toEqual({});
      expect(modifiers.preferredKeywords).toHaveLength(0);
    });
  });
});

// =============================================================================
// StandardAdapter Metadata Tests
// =============================================================================

describe('StandardAdapter with deck metadata', () => {
  let adapter: StandardAdapter;

  beforeEach(() => {
    adapter = new StandardAdapter();
  });

  describe('getColorConstraint with deck.colors', () => {
    it('should return deck.colors as non-enforced preference', () => {
      const deck = createMockDeck({
        colors: ['U', 'R'] as ManaColor[], // Izzet colors
      });

      const constraint = adapter.getColorConstraint(deck);

      expect(constraint.enforced).toBe(false); // Standard never enforces
      expect(constraint.allowedColors).toEqual(['U', 'R']);
    });

    it('should return all colors when deck.colors is empty', () => {
      const deck = createMockDeck({
        colors: [],
      });

      const constraint = adapter.getColorConstraint(deck);

      expect(constraint.allowedColors).toEqual(['W', 'U', 'B', 'R', 'G']);
    });
  });

  describe('matchesColorPreference', () => {
    it('should return true when card matches deck colors', () => {
      const card = createMockCard({ colorIdentity: ['U'] });
      const deck = createMockDeck({ colors: ['U', 'R'] as ManaColor[] });

      expect(adapter.matchesColorPreference(card, deck)).toBe(true);
    });

    it('should return false when card does not match deck colors', () => {
      const card = createMockCard({ colorIdentity: ['G'] }); // Green card
      const deck = createMockDeck({ colors: ['U', 'R'] as ManaColor[] }); // Izzet deck

      expect(adapter.matchesColorPreference(card, deck)).toBe(false);
    });

    it('should return true for colorless cards', () => {
      const card = createMockCard({ colorIdentity: [] });
      const deck = createMockDeck({ colors: ['W'] as ManaColor[] });

      expect(adapter.matchesColorPreference(card, deck)).toBe(true);
    });

    it('should return true when no color preference is set', () => {
      const card = createMockCard({ colorIdentity: ['B', 'G'] });
      const deck = createMockDeck({ colors: [] });

      expect(adapter.matchesColorPreference(card, deck)).toBe(true);
    });
  });

  describe('getArchetypeModifiers with strategy', () => {
    it('should return modifiers for tempo strategy', () => {
      const modifiers = adapter.getArchetypeModifiers('tempo');

      expect(modifiers.categoryWeights.creatures).toBeGreaterThan(1);
      expect(modifiers.preferredKeywords).toContain('flash');
    });

    it('should return modifiers for burn strategy', () => {
      const modifiers = adapter.getArchetypeModifiers('burn');

      expect(modifiers.categoryWeights.removal).toBeGreaterThan(1);
      expect(modifiers.categoryWeights.creatures).toBeLessThan(1);
    });
  });
});

// =============================================================================
// ArchetypeDetector.getEffectiveArchetype Tests
// =============================================================================

describe('ArchetypeDetector.getEffectiveArchetype', () => {
  let commanderAdapter: CommanderAdapter;
  let standardAdapter: StandardAdapter;

  beforeEach(() => {
    commanderAdapter = new CommanderAdapter();
    standardAdapter = new StandardAdapter();
  });

  it('should use deck.strategy when present', () => {
    const deck = createMockDeck({
      strategy: 'tribal',
      cards: [], // Empty deck would normally detect as 'unknown'
    });

    const archetype = ArchetypeDetector.getEffectiveArchetype(deck, commanderAdapter);

    expect(archetype).toBe('tribal');
  });

  it('should fall back to detection when strategy is null', () => {
    // Create deck with creature-heavy composition for aggro detection
    const creatures = Array.from({ length: 25 }, (_, i) =>
      createMockDeckCard(
        createMockCard({
          id: `creature-${i}`,
          name: `Creature ${i}`,
          types: ['Creature'],
        })
      )
    );

    const deck = createMockDeck({
      strategy: null,
      cards: creatures,
    });

    const archetype = ArchetypeDetector.getEffectiveArchetype(deck, standardAdapter);

    // Should detect based on card composition
    expect(archetype).not.toBe('unknown');
  });

  it('should use strategy even if it does not have specific modifiers', () => {
    const deck = createMockDeck({
      strategy: 'chaos', // Valid Commander strategy but may not have modifiers
      cards: [],
    });

    const archetype = ArchetypeDetector.getEffectiveArchetype(deck, commanderAdapter);

    expect(archetype).toBe('chaos');
  });
});

// =============================================================================
// SynergyScorer with Strategy Tests
// =============================================================================

describe('SynergyScorer with deckStrategy', () => {
  let adapter: CommanderAdapter;

  beforeEach(() => {
    adapter = new CommanderAdapter();
  });

  it('should apply strategy-specific boosts for tribal strategy', async () => {
    const tribalCard = createMockCard({
      name: 'Lord of the Unreal',
      oracleText: 'Other Illusion creatures you control get +1/+1 and have hexproof.',
    });

    const deck = createMockDeck({
      strategy: 'tribal',
      cards: [],
    });

    const contextWithStrategy: ScoringContext = {
      deck,
      archetype: 'unknown',
      gaps: createMockGaps(),
      stage: 'early',
      adapter,
      deckStrategy: 'tribal',
      deckColors: [],
    };

    const contextWithoutStrategy: ScoringContext = {
      deck: createMockDeck({ strategy: null }),
      archetype: 'unknown',
      gaps: createMockGaps(),
      stage: 'early',
      adapter,
      deckStrategy: null,
      deckColors: [],
    };

    const scoreWithStrategy = await SynergyScorer.score(tribalCard, contextWithStrategy);
    const scoreWithoutStrategy = await SynergyScorer.score(tribalCard, contextWithoutStrategy);

    // Card should score higher with tribal strategy context
    expect(scoreWithStrategy.strategic).toBeGreaterThan(scoreWithoutStrategy.strategic);
  });

  it('should apply strategy-specific boosts for reanimator strategy', async () => {
    const reanimatorCard = createMockCard({
      name: 'Reanimate',
      oracleText: 'Put target creature card from a graveyard onto the battlefield under your control.',
    });

    const context: ScoringContext = {
      deck: createMockDeck({ strategy: 'reanimator' }),
      archetype: 'unknown',
      gaps: createMockGaps(),
      stage: 'mid',
      adapter,
      deckStrategy: 'reanimator',
      deckColors: ['B'] as ManaColor[],
    };

    const score = await SynergyScorer.score(reanimatorCard, context);

    // Should have strategic points for matching reanimator pattern
    expect(score.strategic).toBeGreaterThan(0);
    expect(score.breakdown.some((b) => b.reason.includes('reanimator'))).toBe(true);
  });
});

// =============================================================================
// Legacy Deck Fallback Tests
// =============================================================================

describe('Legacy deck fallback behavior', () => {
  let adapter: CommanderAdapter;

  beforeEach(() => {
    adapter = new CommanderAdapter();
  });

  it('should work with deck that has no metadata fields', () => {
    // Simulate legacy deck without metadata
    const commanderCard = createMockCard({
      id: 'commander-id',
      supertypes: ['Legendary'],
      types: ['Creature'],
      colorIdentity: ['W', 'B'],
    });

    const deck: DeckWithCards = {
      id: 'legacy-deck',
      name: 'Legacy Deck',
      format: 'commander',
      collectionId: null,
      cards: [createMockDeckCard(commanderCard, 1, 'commander')],
      // No commanderId, colors, or strategy
    };

    // Color constraint should fall back to commander card
    const constraint = adapter.getColorConstraint(deck);
    expect(constraint.allowedColors).toEqual(['W', 'B']);
    expect(constraint.enforced).toBe(true);

    // Archetype detection should work via card analysis
    const archetype = ArchetypeDetector.getEffectiveArchetype(deck, adapter);
    expect(typeof archetype).toBe('string');
  });

  it('should handle undefined colors gracefully', () => {
    const deck = createMockDeck({
      colors: undefined as unknown as ManaColor[],
    });

    const constraint = adapter.getColorConstraint(deck);

    // Should not throw, should fall back to no enforcement
    expect(constraint.enforced).toBe(false);
  });
});
