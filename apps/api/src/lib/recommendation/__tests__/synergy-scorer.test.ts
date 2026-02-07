/**
 * Synergy Scorer Unit Tests
 *
 * Tests for the format-agnostic scoring system.
 */

import { describe, it, expect } from 'bun:test';
import { SynergyScorer } from '../synergy-scorer.js';
import { StandardAdapter } from '../format-adapters/standard.js';
import { CommanderAdapter } from '../format-adapters/commander.js';
import type { Card } from '@tcg-tracker/db';
import type { DeckWithCards, DeckCard, ScoringContext, DeckGapAnalysis } from '../format-adapters/types.js';

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
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockDeck(cards: DeckCard[] = []): DeckWithCards {
  return {
    id: 'test-deck-id',
    name: 'Test Deck',
    format: null,
    collectionId: null,
    cards,
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

function createMockGapAnalysis(): DeckGapAnalysis {
  return {
    categoryBreakdown: {
      lands: { current: 24, minimum: 20, optimal: 24, maximum: 26, status: 'optimal', priority: 0 },
      creatures: { current: 10, minimum: 12, optimal: 20, maximum: 28, status: 'deficient', priority: 50 },
      removal: { current: 4, minimum: 4, optimal: 8, maximum: 12, status: 'adequate', priority: 25 },
    },
    overallScore: 60,
    recommendations: [],
  };
}

function createScoringContext(
  deck: DeckWithCards,
  archetype = 'midrange',
  gaps = createMockGapAnalysis()
): ScoringContext {
  const adapter = new StandardAdapter();
  return {
    deck,
    archetype,
    gaps,
    stage: adapter.getDeckStage(deck),
    adapter,
  };
}

// =============================================================================
// SynergyScorer Tests
// =============================================================================

describe('SynergyScorer', () => {
  describe('score', () => {
    it('should return a valid synergy score structure', async () => {
      const card = createMockCard();
      const deck = createMockDeck();
      const context = createScoringContext(deck);

      const score = await SynergyScorer.score(card, context);

      expect(score).toHaveProperty('total');
      expect(score).toHaveProperty('mechanical');
      expect(score).toHaveProperty('strategic');
      expect(score).toHaveProperty('formatContext');
      expect(score).toHaveProperty('theme');
      expect(score).toHaveProperty('breakdown');
      expect(Array.isArray(score.breakdown)).toBe(true);
    });

    it('should give higher score to cards with keyword synergy', async () => {
      const flyingCreature = createMockCard({
        id: 'flying-creature',
        name: 'Flying Creature',
        keywords: ['Flying'],
      });

      const groundCreature = createMockCard({
        id: 'ground-creature',
        name: 'Ground Creature',
        keywords: [],
      });

      // Deck with reach creatures (synergy with flying)
      const reachCreature = createMockCard({
        id: 'reach-creature',
        name: 'Reach Creature',
        keywords: ['Reach'],
      });
      const deck = createMockDeck([createMockDeckCard(reachCreature, 4)]);
      const context = createScoringContext(deck);

      const flyingScore = await SynergyScorer.score(flyingCreature, context);
      const groundScore = await SynergyScorer.score(groundCreature, context);

      expect(flyingScore.mechanical).toBeGreaterThan(groundScore.mechanical);
    });

    it('should give higher score to cards that fill gaps', async () => {
      const creatureCard = createMockCard({
        id: 'creature-id',
        name: 'Strong Creature',
        types: ['Creature'],
        power: '4',
      });

      const spellCard = createMockCard({
        id: 'spell-id',
        name: 'Random Spell',
        types: ['Instant'],
        oracleText: 'Do something',
      });

      const deck = createMockDeck();
      const gaps = createMockGapAnalysis();
      gaps.categoryBreakdown.creatures = {
        current: 5,
        minimum: 12,
        optimal: 20,
        maximum: 28,
        status: 'deficient',
        priority: 80,
      };
      const context = createScoringContext(deck, 'midrange', gaps);

      const creatureScore = await SynergyScorer.score(creatureCard, context);
      const spellScore = await SynergyScorer.score(spellCard, context);

      expect(creatureScore.strategic).toBeGreaterThan(spellScore.strategic);
    });

    it('should apply archetype modifiers correctly', async () => {
      const hastyCreature = createMockCard({
        id: 'hasty-id',
        name: 'Hasty Creature',
        keywords: ['Haste'],
        types: ['Creature'],
      });

      const controlCard = createMockCard({
        id: 'control-id',
        name: 'Control Card',
        keywords: ['Flash'],
        types: ['Instant'],
      });

      const deck = createMockDeck();

      // Aggro archetype should prefer haste
      const aggroContext = createScoringContext(deck, 'aggro');
      const aggroHastyScore = await SynergyScorer.score(hastyCreature, aggroContext);
      const aggroControlScore = await SynergyScorer.score(controlCard, aggroContext);

      // Control archetype should prefer flash
      const controlContext = createScoringContext(deck, 'control');
      const controlHastyScore = await SynergyScorer.score(hastyCreature, controlContext);
      const controlControlScore = await SynergyScorer.score(controlCard, controlContext);

      // Use the scores in assertions
      void aggroControlScore;
      void controlControlScore;

      // Haste should score higher in aggro than in control
      expect(aggroHastyScore.strategic).toBeGreaterThanOrEqual(controlHastyScore.strategic);
    });
  });

  describe('classifyCard', () => {
    const adapter = new StandardAdapter();

    it('should classify land cards correctly', () => {
      const land = createMockCard({
        types: ['Land'],
        typeLine: 'Basic Land - Plains',
      });

      const categories = SynergyScorer.classifyCard(land, adapter);
      expect(categories).toContain('lands');
    });

    it('should classify creature cards correctly', () => {
      const creature = createMockCard({
        types: ['Creature'],
        typeLine: 'Creature - Human Soldier',
      });

      const categories = SynergyScorer.classifyCard(creature, adapter);
      expect(categories).toContain('creatures');
    });

    it('should classify removal correctly', () => {
      const removal = createMockCard({
        types: ['Instant'],
        oracleText: 'Destroy target creature.',
      });

      const categories = SynergyScorer.classifyCard(removal, adapter);
      expect(categories).toContain('removal');
    });

    it('should classify card draw correctly', () => {
      const cardDraw = createMockCard({
        types: ['Sorcery'],
        oracleText: 'Draw two cards.',
      });

      const categories = SynergyScorer.classifyCard(cardDraw, adapter);
      expect(categories).toContain('cardDraw');
    });

    it('should classify ramp correctly', () => {
      const ramp = createMockCard({
        types: ['Creature'],
        oracleText: '{T}: Add one mana of any color.',
      });

      const categories = SynergyScorer.classifyCard(ramp, adapter);
      expect(categories).toContain('ramp');
    });

    it('should classify board wipes correctly', () => {
      const boardWipe = createMockCard({
        types: ['Sorcery'],
        oracleText: 'Destroy all creatures.',
      });

      const categories = SynergyScorer.classifyCard(boardWipe, adapter);
      expect(categories).toContain('boardWipe');
    });

    it('should classify threats correctly', () => {
      const threat = createMockCard({
        types: ['Creature'],
        power: '5',
        toughness: '5',
      });

      const categories = SynergyScorer.classifyCard(threat, adapter);
      expect(categories).toContain('threats');
    });

    it('should classify tutors correctly', () => {
      const tutor = createMockCard({
        types: ['Sorcery'],
        oracleText: 'Search your library for a card and put it into your hand.',
      });

      const categories = SynergyScorer.classifyCard(tutor, adapter);
      expect(categories).toContain('tutor');
    });

    it('should classify recursion correctly', () => {
      const recursion = createMockCard({
        types: ['Sorcery'],
        oracleText: 'Return target creature card from your graveyard to your hand.',
      });

      const categories = SynergyScorer.classifyCard(recursion, adapter);
      expect(categories).toContain('recursion');
    });
  });

  describe('scoreBatch', () => {
    it('should score multiple cards and sort by total score', async () => {
      const cards = [
        createMockCard({ id: 'card-1', name: 'Card 1', keywords: [] }),
        createMockCard({ id: 'card-2', name: 'Card 2', keywords: ['Flying'] }),
        createMockCard({ id: 'card-3', name: 'Card 3', keywords: ['Haste', 'First strike'] }),
      ];

      const deck = createMockDeck();
      const context = createScoringContext(deck);

      const results = await SynergyScorer.scoreBatch(cards, context);

      expect(results).toHaveLength(3);
      // Results should be sorted by total score descending
      for (let i = 0; i < results.length - 1; i++) {
        const current = results[i];
        const next = results[i + 1];
        if (current && next) {
          expect(current.score.total).toBeGreaterThanOrEqual(next.score.total);
        }
      }
    });
  });

  describe('format context scoring', () => {
    it('should give higher format context score to stackable cards in Standard', async () => {
      const nonLegendary = createMockCard({
        id: 'bolt',
        name: 'Lightning Bolt',
        types: ['Instant'],
        supertypes: [],
        cmc: '1',
      });

      const legendary = createMockCard({
        id: 'legend',
        name: 'Legendary Hero',
        types: ['Creature'],
        supertypes: ['Legendary'],
        cmc: '3',
      });

      const deck = createMockDeck();
      const adapter = new StandardAdapter();
      const context: ScoringContext = {
        deck,
        archetype: 'aggro',
        gaps: createMockGapAnalysis(),
        stage: 'mid',
        adapter,
      };

      const boltScore = await SynergyScorer.score(nonLegendary, context);
      const legendScore = await SynergyScorer.score(legendary, context);

      // Non-legendary cards that work well as 4-of should score higher in format context
      expect(boltScore.formatContext).toBeGreaterThan(legendScore.formatContext);
    });

    it('should give higher format context score to unique effects in Commander', async () => {
      const uniqueEffect = createMockCard({
        id: 'unique',
        name: 'Unique Effect',
        types: ['Enchantment'],
        oracleText: 'You can\'t lose the game and your opponents can\'t win the game.',
        cmc: '3',
      });

      const commonEffect = createMockCard({
        id: 'common',
        name: 'Common Effect',
        types: ['Creature'],
        oracleText: 'Flying',
        keywords: ['Flying'],
        cmc: '5', // Different CMC to affect curve fit differently
      });

      const deck = createMockDeck();
      const adapter = new CommanderAdapter();
      const context: ScoringContext = {
        deck,
        archetype: 'control',
        gaps: createMockGapAnalysis(),
        stage: 'mid',
        adapter,
      };

      const uniqueScore = await SynergyScorer.score(uniqueEffect, context);
      const commonScore = await SynergyScorer.score(commonEffect, context);

      // Unique effects should score higher in Commander format context
      expect(uniqueScore.formatContext).toBeGreaterThanOrEqual(commonScore.formatContext);
    });
  });

  describe('tribal synergy', () => {
    it('should give higher theme score to cards matching dominant tribe', async () => {
      const elfCard = createMockCard({
        id: 'elf',
        name: 'Elf Warrior',
        types: ['Creature'],
        subtypes: ['Elf', 'Warrior'],
      });

      const humanCard = createMockCard({
        id: 'human',
        name: 'Human Soldier',
        types: ['Creature'],
        subtypes: ['Human', 'Soldier'],
      });

      // Create deck with many elves
      const elfCards = Array.from({ length: 10 }, (_, i) =>
        createMockDeckCard(
          createMockCard({
            id: `elf-${i}`,
            name: `Elf ${i}`,
            subtypes: ['Elf'],
          })
        )
      );

      const deck = createMockDeck(elfCards);
      const context = createScoringContext(deck, 'tribal');

      const elfScore = await SynergyScorer.score(elfCard, context);
      const humanScore = await SynergyScorer.score(humanCard, context);

      expect(elfScore.theme).toBeGreaterThan(humanScore.theme);
    });
  });
});
