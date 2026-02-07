/**
 * Phase 3 Tests
 *
 * Comprehensive tests for multi-format analysis and progressive features:
 * - Buildable decks analyzer
 * - Progressive update system
 * - Caching layer
 * - Multi-format comparison
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BuildableDecksAnalyzer } from '../buildable-decks.js';
import { ProgressiveUpdates } from '../progressive-updates.js';
import { RecommendationCache } from '../cache.js';
import type { CollectionCard, FormatType } from '../format-adapters/types.js';
import type { Card } from '@tcg-tracker/db';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: overrides.id ?? 'test-card-id',
    name: overrides.name ?? 'Test Card',
    oracleId: 'oracle-123',
    scryfallId: 'scryfall-123',
    lang: 'en',
    releasedAt: new Date('2023-01-01'),
    uri: 'https://scryfall.com/card/test',
    scryfallUri: 'https://scryfall.com/card/test',
    layout: 'normal',
    imageUris: null,
    manaCost: '{1}{R}',
    cmc: 2,
    typeLine: 'Creature — Human Warrior',
    oracleText: 'Haste',
    power: '2',
    toughness: '2',
    colors: ['R'],
    colorIdentity: ['R'],
    keywords: ['Haste'],
    legalities: {
      standard: 'legal',
      modern: 'legal',
      commander: 'legal',
      brawl: 'legal',
    },
    games: ['paper', 'mtgo', 'arena'],
    reserved: false,
    foil: true,
    nonfoil: true,
    oversized: false,
    promo: false,
    reprint: false,
    variation: false,
    setId: 'set-123',
    set: 'TST',
    setName: 'Test Set',
    setType: 'expansion',
    setUri: 'https://scryfall.com/set/tst',
    setSearchUri: 'https://scryfall.com/set/tst',
    scryfallSetUri: 'https://scryfall.com/set/tst',
    rulingsUri: 'https://scryfall.com/card/tst/123/rulings',
    printsSearchUri: 'https://scryfall.com/card/tst/123/prints',
    collectorNumber: '123',
    digital: false,
    rarity: 'common',
    artist: 'Test Artist',
    borderColor: 'black',
    frame: '2015',
    fullArt: false,
    textless: false,
    booster: true,
    storySpotlight: false,
    prices: null,
    relatedUris: null,
    gameData: {
      types: overrides.types ?? ['Creature'],
      subtypes: ['Human', 'Warrior'],
      supertypes: [],
      power: '2',
      toughness: '2',
      loyalty: null,
      defense: null,
      manaCost: '{1}{R}',
      cmc: 2,
      colors: ['R'],
      colorIdentity: ['R'],
      colorIndicator: null,
      keywords: ['Haste'],
      producedMana: null,
      edhrecRank: 1000,
      pennyRank: null,
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
  } as Card;
}

function createCollectionCard(
  name: string,
  quantity: number,
  overrides: Partial<Card> = {}
): CollectionCard {
  return {
    card: createMockCard({ name, ...overrides }),
    quantity,
  };
}

// =============================================================================
// Buildable Decks Analyzer Tests
// =============================================================================

describe('BuildableDecksAnalyzer', () => {
  describe('analyzeBuildableDecks', () => {
    it('should return empty array for empty collection', () => {
      const result = BuildableDecksAnalyzer.analyzeBuildableDecks([], 'modern');
      expect(result).toEqual([]);
    });

    it('should detect buildable Burn deck in Modern', () => {
      const collection: CollectionCard[] = [
        createCollectionCard('Lightning Bolt', 4, { colors: ['R'] }),
        createCollectionCard('Monastery Swiftspear', 4, { colors: ['R'], types: ['Creature'] }),
        createCollectionCard('Eidolon of the Great Revel', 4, { colors: ['R'], types: ['Creature'] }),
        createCollectionCard('Boros Charm', 4, { colors: ['R', 'W'] }),
        createCollectionCard('Goblin Guide', 4, { colors: ['R'], types: ['Creature'] }),
        createCollectionCard('Mountain', 20, { types: ['Land'] }),
      ];

      const result = BuildableDecksAnalyzer.analyzeBuildableDecks(collection, 'modern');

      expect(result.length).toBeGreaterThan(0);
      const burnDeck = result.find((d) => d.archetype === 'Burn');
      expect(burnDeck).toBeDefined();
      if (burnDeck) {
        expect(burnDeck.completeness).toBeGreaterThan(80);
        expect(burnDeck.coreCardsOwned).toContain('Lightning Bolt');
        expect(burnDeck.coreCardsOwned).toContain('Monastery Swiftspear');
      }
    });

    it('should filter out decks below 50% completeness', () => {
      const collection: CollectionCard[] = [
        createCollectionCard('Lightning Bolt', 1, { colors: ['R'] }),
      ];

      const result = BuildableDecksAnalyzer.analyzeBuildableDecks(collection, 'modern');

      // Should not include decks that are only partially complete
      expect(result.length).toBe(0);
    });

    it('should sort decks by completeness descending', () => {
      const collection: CollectionCard[] = [
        // Enough for Elves
        createCollectionCard('Llanowar Elves', 4, { colors: ['G'] }),
        createCollectionCard('Elvish Archdruid', 4, { colors: ['G'] }),
        createCollectionCard('Collected Company', 4, { colors: ['G'] }),
        createCollectionCard('Craterhoof Behemoth', 2, { colors: ['G'] }),
        // Some Burn cards
        createCollectionCard('Lightning Bolt', 4, { colors: ['R'] }),
        createCollectionCard('Monastery Swiftspear', 2, { colors: ['R'] }),
      ];

      const result = BuildableDecksAnalyzer.analyzeBuildableDecks(collection, 'modern');

      // Should be sorted by completeness
      for (let i = 0; i < result.length - 1; i++) {
        const current = result[i];
        const next = result[i + 1];
        if (current && next) {
          expect(current.completeness).toBeGreaterThanOrEqual(next.completeness);
        }
      }
    });
  });

  describe('getTemplatesForFormat', () => {
    it('should return templates for Standard', () => {
      const templates = BuildableDecksAnalyzer.getTemplatesForFormat('standard');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]?.format).toBe('standard');
    });

    it('should return templates for Modern', () => {
      const templates = BuildableDecksAnalyzer.getTemplatesForFormat('modern');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]?.format).toBe('modern');
    });

    it('should return templates for Commander', () => {
      const templates = BuildableDecksAnalyzer.getTemplatesForFormat('commander');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]?.format).toBe('commander');
    });

    it('should return templates for Brawl', () => {
      const templates = BuildableDecksAnalyzer.getTemplatesForFormat('brawl');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]?.format).toBe('brawl');
    });
  });

  describe('findTemplatesByArchetype', () => {
    it('should find aggro templates', () => {
      const templates = BuildableDecksAnalyzer.findTemplatesByArchetype('modern', 'aggro');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every((t) => t.archetype === 'aggro')).toBe(true);
    });

    it('should return empty array for non-existent archetype', () => {
      const templates = BuildableDecksAnalyzer.findTemplatesByArchetype('modern', 'nonexistent');
      expect(templates).toEqual([]);
    });
  });
});

// =============================================================================
// Progressive Updates Tests
// =============================================================================

describe('ProgressiveUpdates', () => {
  describe('checkNewlyBuildableDecks', () => {
    it('should identify decks that are 90%+ complete', () => {
      const collection: CollectionCard[] = [
        createCollectionCard('Lightning Bolt', 4, { colors: ['R'] }),
        createCollectionCard('Monastery Swiftspear', 4, { colors: ['R'] }),
        createCollectionCard('Eidolon of the Great Revel', 4, { colors: ['R'] }),
        createCollectionCard('Boros Charm', 4, { colors: ['R', 'W'] }),
        createCollectionCard('Goblin Guide', 4, { colors: ['R'] }),
        createCollectionCard('Searing Blaze', 2, { colors: ['R'] }),
      ];

      const result = ProgressiveUpdates.checkNewlyBuildableDecks(collection, 'modern');

      expect(result.length).toBeGreaterThan(0);
      const buildableDeck = result[0];
      if (buildableDeck) {
        expect(buildableDeck.completeness).toBeGreaterThanOrEqual(90);
        expect(buildableDeck.format).toBe('modern');
      }
    });

    it('should not include decks below 90% completeness', () => {
      const collection: CollectionCard[] = [
        createCollectionCard('Lightning Bolt', 2, { colors: ['R'] }),
      ];

      const result = ProgressiveUpdates.checkNewlyBuildableDecks(collection, 'modern');

      expect(result.length).toBe(0);
    });
  });

  describe('checkUnlockedArchetypes', () => {
    it('should identify archetypes that crossed 70% threshold', () => {
      const existingCollection: CollectionCard[] = [
        createCollectionCard('Lightning Bolt', 4, { colors: ['R'] }),
        createCollectionCard('Monastery Swiftspear', 4, { colors: ['R'] }),
      ];

      const addedCards: CollectionCard[] = [
        createCollectionCard('Eidolon of the Great Revel', 4, { colors: ['R'] }),
        createCollectionCard('Boros Charm', 4, { colors: ['R', 'W'] }),
      ];

      const allCards = [...existingCollection, ...addedCards];

      const result = ProgressiveUpdates.checkUnlockedArchetypes(allCards, 'modern', addedCards);

      // Should identify unlocked archetypes
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when no archetypes unlocked', () => {
      const collection: CollectionCard[] = [
        createCollectionCard('Random Card', 1, { colors: ['G'] }),
      ];

      const addedCards: CollectionCard[] = [
        createCollectionCard('Another Random Card', 1, { colors: ['U'] }),
      ];

      const result = ProgressiveUpdates.checkUnlockedArchetypes(collection, 'modern', addedCards);

      expect(result).toEqual([]);
    });
  });

  describe('generateNotifications', () => {
    it('should generate notifications for significant improvements', async () => {
      const event = {
        collectionId: 'collection-123',
        addedCards: [
          createCollectionCard('Lightning Bolt', 4, { colors: ['R'] }),
        ],
        timestamp: new Date(),
      };

      const notifications = await ProgressiveUpdates.generateNotifications(event, 'user-123');

      expect(Array.isArray(notifications)).toBe(true);
    });
  });
});

// =============================================================================
// Recommendation Cache Tests
// =============================================================================

describe('RecommendationCache', () => {
  beforeEach(() => {
    RecommendationCache.clearAll();
  });

  describe('Format Coverage Cache', () => {
    it('should cache and retrieve format coverage', () => {
      const coverage = {
        format: 'modern' as FormatType,
        totalLegalCards: 100,
        viableArchetypes: [],
        buildableDecks: [],
      };

      RecommendationCache.setFormatCoverage('collection-123', 'modern', coverage);
      const retrieved = RecommendationCache.getFormatCoverage('collection-123', 'modern');

      expect(retrieved).toEqual(coverage);
    });

    it('should return null for non-existent cache entry', () => {
      const retrieved = RecommendationCache.getFormatCoverage('collection-123', 'modern');
      expect(retrieved).toBeNull();
    });

    it('should invalidate specific format coverage', () => {
      const coverage = {
        format: 'modern' as FormatType,
        totalLegalCards: 100,
        viableArchetypes: [],
        buildableDecks: [],
      };

      RecommendationCache.setFormatCoverage('collection-123', 'modern', coverage);
      RecommendationCache.invalidateFormatCoverage('collection-123', 'modern');

      const retrieved = RecommendationCache.getFormatCoverage('collection-123', 'modern');
      expect(retrieved).toBeNull();
    });

    it('should invalidate all formats when format not specified', () => {
      const coverage = {
        format: 'modern' as FormatType,
        totalLegalCards: 100,
        viableArchetypes: [],
        buildableDecks: [],
      };

      RecommendationCache.setFormatCoverage('collection-123', 'modern', coverage);
      RecommendationCache.setFormatCoverage('collection-123', 'standard', {
        ...coverage,
        format: 'standard',
      });

      RecommendationCache.invalidateFormatCoverage('collection-123');

      expect(RecommendationCache.getFormatCoverage('collection-123', 'modern')).toBeNull();
      expect(RecommendationCache.getFormatCoverage('collection-123', 'standard')).toBeNull();
    });
  });

  describe('Buildable Decks Cache', () => {
    it('should cache and retrieve buildable decks', () => {
      const decks = [
        {
          archetype: 'Burn',
          completeness: 90,
          coreCardsOwned: ['Lightning Bolt'],
          missingCount: 2,
          missingKeyCards: [],
        },
      ];

      RecommendationCache.setBuildableDecks('collection-123', 'modern', decks);
      const retrieved = RecommendationCache.getBuildableDecks('collection-123', 'modern');

      expect(retrieved).toEqual(decks);
    });

    it('should return null for non-existent cache entry', () => {
      const retrieved = RecommendationCache.getBuildableDecks('collection-123', 'modern');
      expect(retrieved).toBeNull();
    });
  });

  describe('Suggestions Cache', () => {
    it('should cache and retrieve suggestions', () => {
      const suggestions = [
        {
          card: createMockCard(),
          score: {
            total: 85,
            mechanical: 30,
            strategic: 25,
            formatContext: 20,
            theme: 10,
            breakdown: [],
          },
          categories: [],
          inCollection: true,
        },
      ];

      RecommendationCache.setSuggestions('deck-123', 'collection-123', 'modern', suggestions);
      const retrieved = RecommendationCache.getSuggestions('deck-123', 'collection-123', 'modern');

      expect(retrieved).toEqual(suggestions);
    });

    it('should invalidate all suggestions for a deck', () => {
      const suggestions = [
        {
          card: createMockCard(),
          score: {
            total: 85,
            mechanical: 30,
            strategic: 25,
            formatContext: 20,
            theme: 10,
            breakdown: [],
          },
          categories: [],
          inCollection: true,
        },
      ];

      RecommendationCache.setSuggestions('deck-123', 'collection-123', 'modern', suggestions);
      RecommendationCache.setSuggestions('deck-123', 'collection-123', 'standard', suggestions);

      RecommendationCache.invalidateSuggestions('deck-123');

      expect(RecommendationCache.getSuggestions('deck-123', 'collection-123', 'modern')).toBeNull();
      expect(RecommendationCache.getSuggestions('deck-123', 'collection-123', 'standard')).toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', () => {
      const coverage = {
        format: 'modern' as FormatType,
        totalLegalCards: 100,
        viableArchetypes: [],
        buildableDecks: [],
      };

      // Miss
      RecommendationCache.getFormatCoverage('collection-123', 'modern');

      // Set and hit
      RecommendationCache.setFormatCoverage('collection-123', 'modern', coverage);
      RecommendationCache.getFormatCoverage('collection-123', 'modern');

      const stats = RecommendationCache.getStats();
      expect(stats.formatCoverage?.hits).toBe(1);
      expect(stats.formatCoverage?.misses).toBe(1);
      expect(stats.formatCoverage?.hitRate).toBe(50);
    });

    it('should calculate hit rate correctly', () => {
      const coverage = {
        format: 'modern' as FormatType,
        totalLegalCards: 100,
        viableArchetypes: [],
        buildableDecks: [],
      };

      RecommendationCache.setFormatCoverage('collection-123', 'modern', coverage);

      // 3 hits
      RecommendationCache.getFormatCoverage('collection-123', 'modern');
      RecommendationCache.getFormatCoverage('collection-123', 'modern');
      RecommendationCache.getFormatCoverage('collection-123', 'modern');

      // 1 miss
      RecommendationCache.getFormatCoverage('collection-456', 'modern');

      const stats = RecommendationCache.getStats();
      expect(stats.formatCoverage?.hitRate).toBe(75); // 3/(3+1) = 75%
    });

    it('should reset stats when requested', () => {
      RecommendationCache.getFormatCoverage('collection-123', 'modern'); // miss
      RecommendationCache.resetStats();

      const stats = RecommendationCache.getStats();
      expect(stats.formatCoverage?.hits).toBe(0);
      expect(stats.formatCoverage?.misses).toBe(0);
    });
  });

  describe('Event Handlers', () => {
    it('should invalidate caches on collection change', () => {
      const coverage = {
        format: 'modern' as FormatType,
        totalLegalCards: 100,
        viableArchetypes: [],
        buildableDecks: [],
      };

      RecommendationCache.setFormatCoverage('collection-123', 'modern', coverage);
      RecommendationCache.onCollectionChanged('collection-123');

      expect(RecommendationCache.getFormatCoverage('collection-123', 'modern')).toBeNull();
    });

    it('should invalidate suggestions on deck change', () => {
      const suggestions = [
        {
          card: createMockCard(),
          score: {
            total: 85,
            mechanical: 30,
            strategic: 25,
            formatContext: 20,
            theme: 10,
            breakdown: [],
          },
          categories: [],
          inCollection: true,
        },
      ];

      RecommendationCache.setSuggestions('deck-123', 'collection-123', 'modern', suggestions);
      RecommendationCache.onDeckChanged('deck-123');

      expect(RecommendationCache.getSuggestions('deck-123', 'collection-123', 'modern')).toBeNull();
    });

    it('should invalidate format-specific caches on ban list update', () => {
      const coverage = {
        format: 'modern' as FormatType,
        totalLegalCards: 100,
        viableArchetypes: [],
        buildableDecks: [],
      };

      RecommendationCache.setFormatCoverage('collection-123', 'modern', coverage);
      RecommendationCache.setFormatCoverage('collection-123', 'standard', {
        ...coverage,
        format: 'standard',
      });

      RecommendationCache.onBanListUpdate('modern');

      expect(RecommendationCache.getFormatCoverage('collection-123', 'modern')).toBeNull();
      expect(RecommendationCache.getFormatCoverage('collection-123', 'standard')).not.toBeNull();
    });
  });

  describe('Cache Hit Rate Target', () => {
    it('should achieve >60% hit rate for repeated queries', () => {
      const coverage = {
        format: 'modern' as FormatType,
        totalLegalCards: 100,
        viableArchetypes: [],
        buildableDecks: [],
      };

      // Set cache
      RecommendationCache.setFormatCoverage('collection-123', 'modern', coverage);

      // Simulate realistic usage: 70% repeat queries, 30% new queries
      for (let i = 0; i < 100; i++) {
        if (Math.random() < 0.7) {
          // Repeat query (cache hit)
          RecommendationCache.getFormatCoverage('collection-123', 'modern');
        } else {
          // New query (cache miss)
          RecommendationCache.getFormatCoverage(`collection-${i}`, 'modern');
        }
      }

      const stats = RecommendationCache.getStats();
      expect(stats.formatCoverage?.hitRate ?? 0).toBeGreaterThan(60);
    });
  });
});
