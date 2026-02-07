/**
 * Progressive Updates
 *
 * Tracks collection changes and notifies users when their collection
 * improvements unlock new deck building opportunities.
 */

import { handlePromise } from '../utils.js';
import { db, decks } from '@tcg-tracker/db';
import { eq, isNull } from 'drizzle-orm';
import type {
  FormatType,
  CollectionCard,
  DeckWithCards,
} from './format-adapters/index.js';
import { FormatAdapterFactory } from './format-adapters/index.js';
import { BuildableDecksAnalyzer } from './buildable-decks.js';

// =============================================================================
// Types
// =============================================================================

export interface CollectionChangeEvent {
  collectionId: string;
  addedCards: CollectionCard[];
  timestamp: Date;
}

export interface DeckImpactAnalysis {
  deckId: string;
  deckName: string;
  format: FormatType;
  previousCompleteness: number;
  newCompleteness: number;
  improvementPercentage: number;
  unlockedArchetypes: string[];
  improvedCategories: CategoryImprovement[];
}

export interface CategoryImprovement {
  category: string;
  previousCount: number;
  newCount: number;
  change: number;
}

export interface ProgressiveNotification {
  type: 'deck_improvement' | 'archetype_unlocked' | 'deck_buildable';
  userId: string;
  data: DeckImpactAnalysis | ArchetypeUnlocked | DeckBuildable;
  timestamp: Date;
}

export interface ArchetypeUnlocked {
  format: FormatType;
  archetypeName: string;
  completeness: number;
  keyCardsAdded: string[];
}

export interface DeckBuildable {
  format: FormatType;
  deckName: string;
  completeness: number;
  requiredCards: string[];
  ownedCards: string[];
}

// =============================================================================
// Progressive Updates Service
// =============================================================================

export class ProgressiveUpdates {
  /**
   * Analyze the impact of collection changes on user's decks
   * @param event The collection change event
   * @returns Array of deck impact analyses
   */
  static async analyzeCollectionImpact(
    event: CollectionChangeEvent
  ): Promise<DeckImpactAnalysis[]> {
    // Get all decks associated with this collection
    const { data: userDecks, error } = await handlePromise(
      db.query.decks.findMany({
        where: eq(decks.collectionId, event.collectionId),
      })
    );

    if (error || !userDecks) {
      return [];
    }

    const impacts: DeckImpactAnalysis[] = [];

    for (const deck of userDecks) {
      if (!deck.format) continue;

      const adapter = FormatAdapterFactory.create(deck.format as FormatType);

      // Filter added cards to only those legal in this deck's format
      const relevantCards = event.addedCards.filter(
        (cc) => adapter.isLegal(cc.card) && !adapter.isBanned(cc.card)
      );

      if (relevantCards.length === 0) continue;

      // For now, we'll calculate a simple improvement metric
      // In a full implementation, this would compare cached analysis
      const improvement = ProgressiveUpdates.calculateDeckImprovement(
        deck.id,
        relevantCards,
        deck.format as FormatType
      );

      if (improvement.improvementPercentage >= 5) {
        impacts.push(improvement);
      }
    }

    return impacts;
  }

  /**
   * Calculate improvement to a specific deck from added cards
   * @param deckId The deck ID
   * @param addedCards The cards that were added
   * @param format The deck format
   * @returns Deck impact analysis
   */
  private static calculateDeckImprovement(
    deckId: string,
    addedCards: CollectionCard[],
    format: FormatType
  ): DeckImpactAnalysis {
    // Simplified implementation for Phase 3
    // In production, this would:
    // 1. Load cached previous analysis
    // 2. Re-run deck analysis with new cards
    // 3. Compare the two analyses

    const adapter = FormatAdapterFactory.create(format);

    // Count how many cards match each category
    const improvements: CategoryImprovement[] = [];
    const categories = ['ramp', 'cardDraw', 'removal', 'threats', 'boardWipe'];

    for (const category of categories) {
      const matchingCards = addedCards.filter((cc) => {
        const oracleText = cc.card.oracleText?.toLowerCase() ?? '';
        const types = cc.card.types ?? [];

        switch (category) {
          case 'ramp':
            return oracleText.includes('add') && oracleText.includes('mana');
          case 'cardDraw':
            return oracleText.includes('draw') && oracleText.includes('card');
          case 'removal':
            return oracleText.includes('destroy') || oracleText.includes('exile');
          case 'threats':
            return types.includes('Creature') && (parseInt(cc.card.power ?? '0', 10) >= 3);
          case 'boardWipe':
            return oracleText.includes('destroy all') || oracleText.includes('exile all');
          default:
            return false;
        }
      });

      if (matchingCards.length > 0) {
        const change = matchingCards.reduce((sum, cc) => sum + cc.quantity, 0);
        improvements.push({
          category,
          previousCount: 0, // Would be loaded from cache
          newCount: change,
          change,
        });
      }
    }

    // Detect unlocked archetypes
    const unlockedArchetypes: string[] = [];
    const buildableDecks = BuildableDecksAnalyzer.analyzeBuildableDecks(addedCards, format);

    for (const deck of buildableDecks) {
      if (deck.completeness >= 70) {
        unlockedArchetypes.push(deck.archetype);
      }
    }

    // Calculate overall improvement (simplified)
    const improvementPercentage = Math.min(
      100,
      improvements.reduce((sum, imp) => sum + imp.change, 0) * 2
    );

    return {
      deckId,
      deckName: 'Unknown', // Would be loaded from deck query
      format,
      previousCompleteness: 0, // Would be loaded from cache
      newCompleteness: improvementPercentage,
      improvementPercentage,
      unlockedArchetypes,
      improvedCategories: improvements,
    };
  }

  /**
   * Check for newly buildable decks
   * @param collectionCards All cards in collection
   * @param format The format to check
   * @returns Array of newly buildable decks
   */
  static checkNewlyBuildableDecks(
    collectionCards: CollectionCard[],
    format: FormatType
  ): DeckBuildable[] {
    const buildableDecks = BuildableDecksAnalyzer.analyzeBuildableDecks(
      collectionCards,
      format
    );

    return buildableDecks
      .filter((deck) => deck.completeness >= 90)
      .map((deck) => ({
        format,
        deckName: deck.archetype,
        completeness: deck.completeness,
        requiredCards: deck.missingKeyCards,
        ownedCards: deck.coreCardsOwned,
      }));
  }

  /**
   * Check for newly unlocked archetypes
   * @param collectionCards All cards in collection
   * @param format The format to check
   * @param addedCards The cards that were just added
   * @returns Array of newly unlocked archetypes
   */
  static checkUnlockedArchetypes(
    collectionCards: CollectionCard[],
    format: FormatType,
    addedCards: CollectionCard[]
  ): ArchetypeUnlocked[] {
    const buildableDecks = BuildableDecksAnalyzer.analyzeBuildableDecks(
      collectionCards,
      format
    );

    const unlocked: ArchetypeUnlocked[] = [];

    for (const deck of buildableDecks) {
      // Check if this deck just crossed the 70% threshold
      if (deck.completeness >= 70) {
        const keyCardsAdded = addedCards
          .filter((cc) =>
            deck.coreCardsOwned.some(
              (owned) => owned.toLowerCase() === cc.card.name.toLowerCase()
            )
          )
          .map((cc) => cc.card.name);

        if (keyCardsAdded.length > 0) {
          unlocked.push({
            format,
            archetypeName: deck.archetype,
            completeness: deck.completeness,
            keyCardsAdded,
          });
        }
      }
    }

    return unlocked;
  }

  /**
   * Generate notifications for collection changes
   * @param event The collection change event
   * @param userId The user ID
   * @returns Array of notifications to send
   */
  static async generateNotifications(
    event: CollectionChangeEvent,
    userId: string
  ): Promise<ProgressiveNotification[]> {
    const notifications: ProgressiveNotification[] = [];

    // Analyze deck improvements
    const deckImpacts = await ProgressiveUpdates.analyzeCollectionImpact(event);

    for (const impact of deckImpacts) {
      if (impact.improvementPercentage >= 5) {
        notifications.push({
          type: 'deck_improvement',
          userId,
          data: impact,
          timestamp: event.timestamp,
        });
      }
    }

    return notifications;
  }

  /**
   * Queue a notification for delivery
   * @param notification The notification to queue
   */
  static async queueNotification(
    notification: ProgressiveNotification
  ): Promise<void> {
    // In production, this would queue to a notification service
    // For Phase 3, we'll just log it
    console.log('[Progressive Updates] Notification queued:', {
      type: notification.type,
      userId: notification.userId,
      timestamp: notification.timestamp,
    });
  }
}
