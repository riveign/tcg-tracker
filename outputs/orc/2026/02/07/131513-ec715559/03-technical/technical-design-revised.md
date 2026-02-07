# MTG Deck Recommendation System - Technical Design Document (Revised)

**Version**: 2.0
**Date**: 2026-02-07
**Status**: Ready for Implementation
**Authors**: Engineering Team
**Revision Note**: Updated for multi-format support with collection-first architecture

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Recommendation Algorithm Design](#3-recommendation-algorithm-design)
4. [Data Model Extensions](#4-data-model-extensions)
5. [API Design](#5-api-design)
6. [Performance Considerations](#6-performance-considerations)
7. [Implementation Phases](#7-implementation-phases)
8. [Testing Strategy](#8-testing-strategy)
9. [Appendices](#9-appendices)

---

## 1. Executive Summary

### Purpose

This document provides the complete technical specification for implementing the MTG Deck Recommendation System for TCG Tracker. The revised design enables players to build optimal decks across multiple formats (Standard, Modern, Commander, Brawl) using cards they already own.

### Key Changes from v1.0

| Aspect | v1.0 | v2.0 (Revised) |
|--------|------|----------------|
| **Format Support** | Commander only | Standard, Modern, Commander, Brawl |
| **Collection Priority** | Optional filter | Primary data source (REQUIRED) |
| **Recommendation Flow** | Score all cards, then filter | Filter by collection FIRST, then score |
| **API Design** | `collectionOnly` optional | `collectionId` REQUIRED |
| **Deck Composition** | Commander 8x8 theory only | Format-specific guidelines |

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture** | Format-agnostic engine + format adapters | Shared scoring logic, format-specific rules isolated |
| **Collection Priority** | Collection-scoped queries first | Avoid scoring cards user doesn't own |
| **Algorithm Approach** | Heuristic-based scoring with format context | Transparent, debuggable, adaptable per format |
| **Synergy Computation** | Collection-scoped with caching | Only compute for owned cards |
| **Storage Strategy** | PostgreSQL with JSONB + format field | Leverages existing infrastructure |
| **API Framework** | tRPC procedures | Consistency with existing API patterns |

### Architecture Overview

```
+------------------+     +-------------------+     +------------------+
|   Web Frontend   |---->|   tRPC API       |---->|   PostgreSQL     |
|   (React/TS)     |     |   (Node.js)      |     |   (Drizzle ORM)  |
+------------------+     +-------------------+     +------------------+
                               |                         |
                               v                         v
                    +--------------------+    +--------------------+
                    | Recommendation     |    | Collection Service |
                    | Engine             |    | (Primary Data)     |
                    | - Format Adapters  |    +--------------------+
                    | - Synergy Scorer   |
                    | - Gap Analyzer     |
                    +--------------------+
                               |
              +----------------+----------------+
              |                |                |
              v                v                v
        +-----------+   +-----------+   +-----------+
        | Standard  |   | Commander |   | Modern/   |
        | Adapter   |   | Adapter   |   | Brawl     |
        +-----------+   +-----------+   +-----------+
```

---

## 2. System Architecture

### 2.1 High-Level Component Diagram

```
+------------------------------------------------------------------------------+
|                              TCG Tracker v2.0                                 |
+------------------------------------------------------------------------------+
|  +------------------------------------------------------------------------+  |
|  |                         FRONTEND (apps/web)                             |  |
|  |  +---------------+  +------------------+  +-------------------------+   |  |
|  |  | DeckBuilder   |  | RecommendPanel   |  | FormatSelector          |   |  |
|  |  | Page          |  | Component        |  | Component               |   |  |
|  |  +-------+-------+  +--------+---------+  +------------+------------+   |  |
|  |          |                   |                         |                |  |
|  |          +-------------------+-------------------------+                |  |
|  |                              |                                          |  |
|  |                   [TanStack Query / tRPC Client]                       |  |
|  +-------------------------------+----------------------------------------+  |
|                                  |                                           |
+----------------------------------+-------------------------------------------+
|  +-------------------------------+----------------------------------------+  |
|  |                          API LAYER (apps/api)                          |  |
|  |                                                                        |  |
|  |  +------------------------------------------------------------------+  |  |
|  |  |                    ROUTERS (src/router)                          |  |  |
|  |  |  +------------+  +------------+  +-----------------------------+ |  |  |
|  |  |  | cards.ts   |  | decks.ts   |  | recommendations.ts (UPDATED)| |  |  |
|  |  |  | (existing) |  | (extended) |  | - getSuggestions             | |  |  |
|  |  |  |            |  |            |  | - getBuildableDecks          | |  |  |
|  |  |  |            |  |            |  | - getFormatCoverage          | |  |  |
|  |  |  +------------+  +------------+  +-------------+---------------+ |  |  |
|  |  +----------------------------------------------------+-------------+  |  |
|  |                                                       |                |  |
|  |  +----------------------------------------------------+-------------+  |  |
|  |  |              RECOMMENDATION ENGINE (src/lib/recommendation)      |  |  |
|  |  |                                                                  |  |  |
|  |  |  +---------------------+  +---------------------+                |  |  |
|  |  |  | FormatAgnostic      |  | FormatAdapters      |                |  |  |
|  |  |  | Engine              |  | +-----------------+ |                |  |  |
|  |  |  | - SynergyScorer     |  | | StandardAdapter | |                |  |  |
|  |  |  | - ArchetypeDetector |  | | ModernAdapter   | |                |  |  |
|  |  |  | - GapAnalyzer       |  | | CommanderAdapter| |                |  |  |
|  |  |  +---------------------+  | | BrawlAdapter    | |                |  |  |
|  |  |                           | +-----------------+ |                |  |  |
|  |  |                           +---------------------+                |  |  |
|  |  |  +---------------------+  +---------------------+                |  |  |
|  |  |  | CollectionService   |  | FormatRules         |                |  |  |
|  |  |  | - getOwnedCards     |  | - copyLimits        |                |  |  |
|  |  |  | - filterByFormat    |  | - deckSizes         |                |  |  |
|  |  |  | - progressiveUpdate |  | - bannedLists       |                |  |  |
|  |  |  +---------------------+  +---------------------+                |  |  |
|  |  +------------------------------------------------------------------+  |  |
|  +------------------------------------------------------------------------+  |
|                               |                                              |
+-------------------------------+----------------------------------------------+
|  +----------------------------+-------------------------------------------+  |
|  |                       DATABASE (packages/db)                           |  |
|  |  +--------------+  +--------------+  +------------------+              |  |
|  |  | cards        |  | decks        |  | card_synergies   |              |  |
|  |  | (existing)   |  | + format     |  | + format_context |              |  |
|  |  +--------------+  +--------------+  +------------------+              |  |
|  |  +--------------+  +--------------------+                              |  |
|  |  | collections  |  | collection_format  |                              |  |
|  |  | (existing)   |  | _coverage (NEW)    |                              |  |
|  |  +--------------+  +--------------------+                              |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------+
```

### 2.2 Collection-First Data Flow

```
+-----------------------------------------------------------------------------+
|                    COLLECTION-FIRST RECOMMENDATION FLOW                      |
+-----------------------------------------------------------------------------+

User requests suggestions for deck in format X
                |
                v
+-------------------------------+
| 1. LOAD COLLECTION            |
| - Get user's collection       |
| - Required parameter now      |
+---------------+---------------+
                |
                v
+-------------------------------+
| 2. FILTER BY FORMAT           |
| - Apply format legality       |
| - Check banned lists          |
| - Filter to legal cards only  |
+---------------+---------------+
                |
                v
+-------------------------------+
| 3. EXCLUDE DECK CARDS         |
| - Remove cards already in     |
|   current deck                |
+---------------+---------------+
                |
                v
+-------------------------------+    +------------------------+
| 4. APPLY FORMAT RULES         |--->| Format Adapter         |
| - Copy limits (4x vs 1x)      |    | - Standard: 4-of, 60   |
| - Deck size constraints       |    | - Commander: singleton |
| - Color identity (if EDH)     |    | - etc.                 |
+---------------+---------------+    +------------------------+
                |
                v
+-------------------------------+
| 5. SCORE CANDIDATES           |
| - Only score owned cards      |
| - Format-weighted synergy     |
| - Gap analysis per format     |
+---------------+---------------+
                |
                v
+-------------------------------+
| 6. RETURN RANKED RESULTS      |
| - All cards are owned         |
| - Buildable immediately       |
+-------------------------------+
```

### 2.3 Format Adapter Architecture

```typescript
// apps/api/src/lib/recommendation/format-adapters/types.ts

interface FormatAdapter {
  readonly format: FormatType;
  readonly deckSize: DeckSizeConfig;
  readonly copyLimit: CopyLimitConfig;

  // Validation
  isLegal(card: Card): boolean;
  isBanned(card: Card): boolean;
  validateDeck(deck: DeckWithCards): ValidationResult;

  // Scoring adjustments
  getScoreWeights(): ScoreWeights;
  getGapTargets(): CategoryTargets;
  getDeckStageThresholds(): StageThresholds;

  // Format-specific logic
  getColorConstraint(deck: DeckWithCards): ColorConstraint;
  getArchetypeModifiers(archetype: Archetype): ArchetypeModifiers;
}

interface DeckSizeConfig {
  mainboard: { min: number; max: number; optimal: number };
  sideboard?: { min: number; max: number };
  commander?: boolean;
}

interface CopyLimitConfig {
  default: number;
  exceptions: Map<string, number>; // e.g., basic lands -> Infinity
}

type FormatType = 'standard' | 'modern' | 'commander' | 'brawl';
```

### 2.4 Component Responsibilities

| Component | Location | Responsibility |
|-----------|----------|----------------|
| **RecommendationRouter** | `apps/api/src/router/recommendations.ts` | API endpoints, auth, format routing |
| **FormatAdapterFactory** | `apps/api/src/lib/recommendation/format-adapters/factory.ts` | Create appropriate format adapter |
| **StandardAdapter** | `apps/api/src/lib/recommendation/format-adapters/standard.ts` | 60-card format rules |
| **ModernAdapter** | `apps/api/src/lib/recommendation/format-adapters/modern.ts` | Modern legality + rules |
| **CommanderAdapter** | `apps/api/src/lib/recommendation/format-adapters/commander.ts` | Singleton, color identity |
| **BrawlAdapter** | `apps/api/src/lib/recommendation/format-adapters/brawl.ts` | Standard-legal singleton |
| **CollectionService** | `apps/api/src/lib/recommendation/collection-service.ts` | Collection queries, filtering |
| **SynergyScorer** | `apps/api/src/lib/recommendation/synergy-scorer.ts` | Format-agnostic scoring |
| **GapAnalyzer** | `apps/api/src/lib/recommendation/gap-analyzer.ts` | Format-aware gap analysis |
| **ArchetypeDetector** | `apps/api/src/lib/recommendation/archetype-detector.ts` | Format-aware archetype detection |

---

## 3. Recommendation Algorithm Design

### 3.1 Format-Agnostic Synergy Scoring

The core synergy scoring mechanism works across all formats, with format-specific weights applied via adapters.

#### 3.1.1 Score Components

```typescript
interface SynergyScore {
  total: number;           // 0-100 overall score
  mechanical: number;      // 0-40 keyword/ability synergy
  strategic: number;       // 0-30 archetype/role synergy
  formatContext: number;   // 0-20 format-specific bonus (was: mana)
  theme: number;           // 0-10 tribal/flavor synergy
  breakdown: ScoreBreakdown[];
}

interface ScoreBreakdown {
  category: 'mechanical' | 'strategic' | 'formatContext' | 'theme';
  reason: string;
  points: number;
  weight: number;
}
```

#### 3.1.2 Format Context Scoring (0-20 points)

Replaces the v1.0 "mana synergy" component with format-aware scoring.

```typescript
function calculateFormatContextSynergy(
  card: Card,
  deck: DeckAnalysis,
  adapter: FormatAdapter
): number {
  let score = 0;

  // 1. Color compatibility (all formats)
  const colorConstraint = adapter.getColorConstraint(deck);
  if (!isColorCompatible(card, colorConstraint)) {
    return 0; // Ineligible card
  }

  // 2. Format-specific value adjustments
  const formatWeights = adapter.getScoreWeights();

  // 60-card formats: value 4-of consistency
  if (adapter.format === 'standard' || adapter.format === 'modern') {
    // Prefer cards that work well in 4-of configuration
    if (isStackable(card)) {
      score += 6;
    }
    // Meta-relevance bonus
    if (isMetaRelevant(card, adapter.format)) {
      score += 4;
    }
  }

  // Singleton formats: value uniqueness
  if (adapter.format === 'commander' || adapter.format === 'brawl') {
    // Unique effects are more valuable in singleton
    if (hasUniqueEffect(card, deck)) {
      score += 6;
    }
    // Political value for multiplayer
    if (adapter.format === 'commander' && hasPoliticalValue(card)) {
      score += 4;
    }
  }

  // 3. Curve fit (all formats, different targets)
  const optimalCMC = adapter.getOptimalCMCPosition(deck);
  const cmcDiff = Math.abs(card.cmc - optimalCMC);
  score += Math.max(0, 10 - cmcDiff * 2);

  return Math.min(20, score);
}
```

### 3.2 Format-Specific Constraints

#### 3.2.1 Deck Size and Copy Limits

```typescript
const FORMAT_RULES: Record<FormatType, FormatRules> = {
  standard: {
    deckSize: { mainboard: { min: 60, max: null, optimal: 60 }, sideboard: { min: 0, max: 15 } },
    copyLimit: { default: 4, exceptions: BASIC_LANDS },
    legalityField: 'legalities.standard',
  },
  modern: {
    deckSize: { mainboard: { min: 60, max: null, optimal: 60 }, sideboard: { min: 0, max: 15 } },
    copyLimit: { default: 4, exceptions: BASIC_LANDS },
    legalityField: 'legalities.modern',
  },
  commander: {
    deckSize: { mainboard: { min: 99, max: 99, optimal: 99 }, commander: true },
    copyLimit: { default: 1, exceptions: { ...BASIC_LANDS, ...RELENTLESS_CARDS } },
    legalityField: 'legalities.commander',
    colorIdentityRequired: true,
  },
  brawl: {
    deckSize: { mainboard: { min: 59, max: 59, optimal: 59 }, commander: true },
    copyLimit: { default: 1, exceptions: BASIC_LANDS },
    legalityField: 'legalities.brawl',
    colorIdentityRequired: true,
  },
};

// Cards that bypass singleton rule
const RELENTLESS_CARDS = new Set([
  'Relentless Rats',
  'Shadowborn Apostle',
  'Persistent Petitioners',
  'Seven Dwarves', // limit: 7
  'Rat Colony',
  'Dragon\'s Approach',
  'Slime Against Humanity',
]);
```

#### 3.2.2 Banned List Integration

```typescript
// apps/api/src/lib/recommendation/format-adapters/banned-lists.ts

interface BannedListSource {
  // Uses Scryfall legality data from game_data.legalities
  // Returns 'legal', 'not_legal', 'banned', 'restricted'
  checkLegality(cardId: string, format: FormatType): LegalityStatus;
}

function isBanned(card: Card, format: FormatType): boolean {
  const legality = card.gameData?.legalities?.[format];
  return legality === 'banned' || legality === 'not_legal';
}
```

### 3.3 Deck Composition Analysis Per Format

#### 3.3.1 Format-Specific Category Targets

```typescript
const CATEGORY_TARGETS_BY_FORMAT: Record<FormatType, CategoryTargets> = {
  standard: {
    lands:      { min: 20, opt: 24, max: 26 },
    creatures:  { min: 12, opt: 20, max: 28 },
    removal:    { min: 4,  opt: 8,  max: 12 },
    cardDraw:   { min: 2,  opt: 6,  max: 10 },
    threats:    { min: 8,  opt: 15, max: 24 },
  },
  modern: {
    lands:      { min: 18, opt: 22, max: 26 },
    creatures:  { min: 10, opt: 18, max: 28 },
    removal:    { min: 4,  opt: 8,  max: 12 },
    cardDraw:   { min: 2,  opt: 6,  max: 10 },
    threats:    { min: 8,  opt: 16, max: 26 },
  },
  commander: {
    lands:      { min: 34, opt: 37, max: 40 },
    ramp:       { min: 8,  opt: 10, max: 15 },
    cardDraw:   { min: 5,  opt: 10, max: 12 },
    removal:    { min: 8,  opt: 10, max: 12 },
    boardWipe:  { min: 2,  opt: 4,  max: 5 },
    protection: { min: 2,  opt: 4,  max: 6 },
    threats:    { min: 10, opt: 15, max: 25 },
    tutor:      { min: 0,  opt: 3,  max: 8 },
    recursion:  { min: 2,  opt: 5,  max: 8 },
  },
  brawl: {
    lands:      { min: 22, opt: 24, max: 26 },
    ramp:       { min: 4,  opt: 6,  max: 10 },
    cardDraw:   { min: 3,  opt: 6,  max: 8 },
    removal:    { min: 4,  opt: 6,  max: 10 },
    threats:    { min: 8,  opt: 12, max: 20 },
  },
};
```

#### 3.3.2 Format-Aware Gap Analyzer

```typescript
class GapAnalyzer {
  static analyze(
    deck: DeckWithCards,
    adapter: FormatAdapter
  ): DeckGapAnalysis {
    const targets = adapter.getGapTargets();
    const breakdown: Record<CardCategory, CategoryStatus> = {};

    for (const [category, target] of Object.entries(targets)) {
      const count = countCardsInCategory(deck.cards, category);
      breakdown[category] = {
        current: count,
        minimum: target.min,
        optimal: target.opt,
        maximum: target.max,
        status: getStatus(count, target),
        priority: getPriority(count, target),
      };
    }

    return {
      categoryBreakdown: breakdown,
      overallScore: calculateCompleteness(breakdown, adapter),
      recommendations: generateGapRecommendations(breakdown, adapter),
    };
  }
}
```

### 3.4 Collection-First Recommendation Flow

#### 3.4.1 Progressive Filtering

```typescript
async function getRecommendations(
  deckId: string,
  collectionId: string, // REQUIRED
  format: FormatType,
  options: RecommendationOptions
): Promise<RecommendationResult> {

  // Step 1: Load collection (primary data source)
  const collectionCards = await CollectionService.getCards(collectionId);
  if (collectionCards.length === 0) {
    return { suggestions: [], message: 'No cards in collection' };
  }

  // Step 2: Get format adapter
  const adapter = FormatAdapterFactory.create(format);

  // Step 3: Filter collection by format legality
  const legalCards = collectionCards.filter(card =>
    adapter.isLegal(card) && !adapter.isBanned(card)
  );

  // Step 4: Apply color constraints (for Commander/Brawl)
  const deck = await loadDeck(deckId);
  const colorConstraint = adapter.getColorConstraint(deck);
  const colorFiltered = legalCards.filter(card =>
    isColorCompatible(card, colorConstraint)
  );

  // Step 5: Exclude cards already in deck
  const deckCardIds = new Set(deck.cards.map(c => c.cardId));
  const candidates = colorFiltered.filter(card =>
    !deckCardIds.has(card.id)
  );

  // Step 6: Score remaining candidates (all owned)
  const scored = await Promise.all(
    candidates.map(card => scoreCard(card, deck, adapter))
  );

  // Step 7: Return sorted results
  return {
    suggestions: scored.sort((a, b) => b.score - a.score),
    format,
    deckStage: determineDeckStage(deck, adapter),
  };
}
```

### 3.5 Progressive Deck Improvement Notifications

#### 3.5.1 Collection Change Detection

```typescript
interface CollectionChangeEvent {
  collectionId: string;
  addedCards: CardAddition[];
  timestamp: Date;
}

interface DeckImpactAnalysis {
  deckId: string;
  deckName: string;
  format: FormatType;
  previousCompleteness: number;
  newCompleteness: number;
  unlockedArchetypes: string[];
  improvedCategories: CategoryImprovement[];
}

async function analyzeCollectionImpact(
  event: CollectionChangeEvent
): Promise<DeckImpactAnalysis[]> {

  // Get all user's decks
  const decks = await getUserDecks(event.collectionId);
  const impacts: DeckImpactAnalysis[] = [];

  for (const deck of decks) {
    const adapter = FormatAdapterFactory.create(deck.format);

    // Check if any added cards are relevant to this deck
    const relevantCards = event.addedCards.filter(card =>
      adapter.isLegal(card) &&
      isColorCompatible(card, adapter.getColorConstraint(deck))
    );

    if (relevantCards.length === 0) continue;

    // Calculate impact
    const previousAnalysis = await getCachedDeckAnalysis(deck.id);
    const newAnalysis = await analyzeDeck(deck, adapter);

    if (newAnalysis.completeness > previousAnalysis.completeness) {
      impacts.push({
        deckId: deck.id,
        deckName: deck.name,
        format: deck.format,
        previousCompleteness: previousAnalysis.completeness,
        newCompleteness: newAnalysis.completeness,
        unlockedArchetypes: detectNewArchetypes(previousAnalysis, newAnalysis),
        improvedCategories: detectImprovements(previousAnalysis, newAnalysis),
      });
    }
  }

  return impacts;
}
```

#### 3.5.2 Notification Triggers

```typescript
// apps/api/src/lib/recommendation/progressive-updates.ts

async function onCardsAdded(
  collectionId: string,
  addedCards: Card[]
): Promise<void> {
  const impact = await analyzeCollectionImpact({
    collectionId,
    addedCards,
    timestamp: new Date(),
  });

  // Queue notifications for significant improvements
  for (const deckImpact of impact) {
    if (deckImpact.newCompleteness - deckImpact.previousCompleteness >= 5) {
      await queueNotification({
        type: 'deck_improvement',
        userId: await getCollectionOwner(collectionId),
        data: deckImpact,
      });
    }
  }

  // Update cached format coverage
  await updateFormatCoverageCache(collectionId);
}
```

---

## 4. Data Model Extensions

### 4.1 New Tables

#### 4.1.1 card_synergies Table (Updated)

```sql
-- Pre-computed synergy scores with format context
CREATE TABLE card_synergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  related_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  synergy_score DECIMAL(5,2) NOT NULL CHECK (synergy_score >= 0 AND synergy_score <= 100),
  mechanical_score DECIMAL(5,2) NOT NULL,
  strategic_score DECIMAL(5,2) NOT NULL,
  format_context_score DECIMAL(5,2) NOT NULL,
  theme_score DECIMAL(5,2) NOT NULL,
  synergy_reasons JSONB NOT NULL DEFAULT '[]',
  format_context TEXT NOT NULL DEFAULT 'all', -- 'standard', 'modern', 'commander', 'brawl', 'all'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_id, related_card_id, format_context)
);

CREATE INDEX idx_card_synergies_card_id ON card_synergies(card_id);
CREATE INDEX idx_card_synergies_format ON card_synergies(format_context);
CREATE INDEX idx_card_synergies_score ON card_synergies(synergy_score DESC);
```

#### 4.1.2 collection_format_coverage Table (New)

```sql
-- Cached analysis of collection viability per format
CREATE TABLE collection_format_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  format TEXT NOT NULL, -- 'standard', 'modern', 'commander', 'brawl'
  total_legal_cards INTEGER NOT NULL,
  viable_archetypes JSONB NOT NULL DEFAULT '[]', -- [{archetype, completeness, keyCards}]
  buildable_decks JSONB NOT NULL DEFAULT '[]', -- [{deckName, completeness, missingCount}]
  last_computed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, format)
);

CREATE INDEX idx_collection_format_coverage_collection ON collection_format_coverage(collection_id);
CREATE INDEX idx_collection_format_coverage_format ON collection_format_coverage(format);
```

### 4.2 Schema Extensions

#### 4.2.1 Decks Table Extensions

```sql
-- Add format field and archetype tracking
ALTER TABLE decks
  ADD COLUMN IF NOT EXISTS format TEXT, -- 'standard', 'modern', 'commander', 'brawl'
  ADD COLUMN IF NOT EXISTS detected_archetypes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS archetype_confidence JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_analysis_at TIMESTAMP WITH TIME ZONE;

-- Index for format queries
CREATE INDEX IF NOT EXISTS idx_decks_format ON decks(format);
CREATE INDEX IF NOT EXISTS idx_decks_archetypes ON decks USING GIN(detected_archetypes);
```

#### 4.2.2 Drizzle Schema Definitions

```typescript
// packages/db/src/schema/card-synergies.ts

import { pgTable, uuid, decimal, jsonb, timestamp, text, unique } from 'drizzle-orm/pg-core';
import { cards } from './cards';

export const cardSynergies = pgTable('card_synergies', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  relatedCardId: uuid('related_card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  synergyScore: decimal('synergy_score', { precision: 5, scale: 2 }).notNull(),
  mechanicalScore: decimal('mechanical_score', { precision: 5, scale: 2 }).notNull(),
  strategicScore: decimal('strategic_score', { precision: 5, scale: 2 }).notNull(),
  formatContextScore: decimal('format_context_score', { precision: 5, scale: 2 }).notNull(),
  themeScore: decimal('theme_score', { precision: 5, scale: 2 }).notNull(),
  synergyReasons: jsonb('synergy_reasons').notNull().default([]),
  formatContext: text('format_context').notNull().default('all'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueCardPairFormat: unique().on(table.cardId, table.relatedCardId, table.formatContext),
}));

// packages/db/src/schema/collection-format-coverage.ts

export const collectionFormatCoverage = pgTable('collection_format_coverage', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  format: text('format').notNull(),
  totalLegalCards: integer('total_legal_cards').notNull(),
  viableArchetypes: jsonb('viable_archetypes').notNull().default([]),
  buildableDecks: jsonb('buildable_decks').notNull().default([]),
  lastComputed: timestamp('last_computed', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueCollectionFormat: unique().on(table.collectionId, table.format),
}));
```

---

## 5. API Design

### 5.1 Updated Router: recommendations.ts

```typescript
// apps/api/src/router/recommendations.ts

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { authProcedure, router } from '../trpc';

// ============================================================================
// Input Schemas (UPDATED)
// ============================================================================

const formatEnum = z.enum(['standard', 'modern', 'commander', 'brawl']);

const getSuggestionsSchema = z.object({
  deckId: z.string().uuid(),
  collectionId: z.string().uuid(), // REQUIRED - collection-first
  format: formatEnum, // REQUIRED
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
  categoryFilter: z.enum(['ramp', 'cardDraw', 'removal', 'boardWipe', 'threat', 'all']).default('all'),
  showUpgrades: z.boolean().default(false), // Opt-in for non-owned cards
});

const getBuildableDecksSchema = z.object({
  collectionId: z.string().uuid(), // REQUIRED
  format: formatEnum, // REQUIRED
  limit: z.number().min(1).max(20).default(10),
});

const getFormatCoverageSchema = z.object({
  collectionId: z.string().uuid(), // REQUIRED
  format: formatEnum.optional(), // If omitted, returns all formats
});

const getMultiFormatComparisonSchema = z.object({
  collectionId: z.string().uuid(), // REQUIRED
  deckIds: z.array(z.string().uuid()).min(1).max(10),
});

// ============================================================================
// Router Definition
// ============================================================================

export const recommendationsRouter = router({
  /**
   * Get card suggestions for a deck (collection-first)
   * Primary endpoint for the recommendation system
   */
  getSuggestions: authProcedure
    .input(getSuggestionsSchema)
    .query(async ({ input, ctx }) => {
      const { deckId, collectionId, format, limit, offset, categoryFilter, showUpgrades } = input;

      // 1. Verify collection ownership
      const collection = await verifyCollectionOwnership(collectionId, ctx.user.id);

      // 2. Verify deck ownership and format match
      const deck = await verifyDeckOwnership(deckId, ctx.user.id);
      if (deck.format && deck.format !== format) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Deck format (${deck.format}) does not match requested format (${format})`,
        });
      }

      // 3. Get format adapter
      const adapter = FormatAdapterFactory.create(format);

      // 4. Load and filter collection cards
      const collectionCards = await CollectionService.getCards(collectionId);
      const legalCards = collectionCards.filter(card =>
        adapter.isLegal(card) && !adapter.isBanned(card)
      );

      // 5. Apply color constraints
      const colorConstraint = adapter.getColorConstraint(deck);
      const colorFiltered = legalCards.filter(card =>
        isColorCompatible(card, colorConstraint)
      );

      // 6. Exclude cards in deck
      const deckCardIds = new Set(deck.cards.map(c => c.cardId));
      const candidates = colorFiltered.filter(card => !deckCardIds.has(card.id));

      // 7. Analyze deck
      const archetype = ArchetypeDetector.detect(deck, adapter);
      const gaps = GapAnalyzer.analyze(deck, adapter);
      const stage = determineDeckStage(deck, adapter);

      // 8. Score candidates
      const scored = await Promise.all(
        candidates.map(async card => ({
          card: formatCardResponse(card),
          score: await SynergyScorer.score(card, { deck, archetype, gaps, stage, adapter }),
          categories: classifyCard(card, adapter),
          inCollection: true, // All cards are owned
        }))
      );

      // 9. Filter by category if specified
      const filtered = categoryFilter === 'all'
        ? scored
        : scored.filter(s => s.categories.includes(categoryFilter));

      // 10. Sort and paginate
      filtered.sort((a, b) => b.score.total - a.score.total);

      return {
        suggestions: filtered.slice(offset, offset + limit),
        total: filtered.length,
        format,
        deckStage: stage,
        hasMore: offset + limit < filtered.length,
      };
    }),

  /**
   * Get buildable decks from collection for a format
   */
  getBuildableDecks: authProcedure
    .input(getBuildableDecksSchema)
    .query(async ({ input, ctx }) => {
      const { collectionId, format, limit } = input;

      await verifyCollectionOwnership(collectionId, ctx.user.id);
      const adapter = FormatAdapterFactory.create(format);

      // Get archetypes that can be built from collection
      const coverage = await CollectionService.getFormatCoverage(collectionId, format);

      return {
        format,
        totalLegalCards: coverage.totalLegalCards,
        buildableDecks: coverage.buildableDecks.slice(0, limit),
        viableArchetypes: coverage.viableArchetypes,
      };
    }),

  /**
   * Get format coverage for a collection
   */
  getFormatCoverage: authProcedure
    .input(getFormatCoverageSchema)
    .query(async ({ input, ctx }) => {
      const { collectionId, format } = input;

      await verifyCollectionOwnership(collectionId, ctx.user.id);

      if (format) {
        return await CollectionService.getFormatCoverage(collectionId, format);
      }

      // Return coverage for all formats
      const formats: FormatType[] = ['standard', 'modern', 'commander', 'brawl'];
      const coverage = await Promise.all(
        formats.map(f => CollectionService.getFormatCoverage(collectionId, f))
      );

      return {
        standard: coverage[0],
        modern: coverage[1],
        commander: coverage[2],
        brawl: coverage[3],
      };
    }),

  /**
   * Compare deck viability across formats
   */
  getMultiFormatComparison: authProcedure
    .input(getMultiFormatComparisonSchema)
    .query(async ({ input, ctx }) => {
      const { collectionId, deckIds } = input;

      await verifyCollectionOwnership(collectionId, ctx.user.id);

      const results = await Promise.all(
        deckIds.map(async deckId => {
          const deck = await verifyDeckOwnership(deckId, ctx.user.id);
          const formats: FormatType[] = ['standard', 'modern', 'commander', 'brawl'];

          const viability = await Promise.all(
            formats.map(async format => {
              const adapter = FormatAdapterFactory.create(format);
              return {
                format,
                isViable: await checkDeckViability(deck, collectionId, adapter),
                completeness: await calculateCompleteness(deck, collectionId, adapter),
              };
            })
          );

          return {
            deckId,
            deckName: deck.name,
            viability,
          };
        })
      );

      return { comparisons: results };
    }),

  /**
   * Get archetype analysis for a deck (format-aware)
   */
  getArchetype: authProcedure
    .input(z.object({
      deckId: z.string().uuid(),
      format: formatEnum,
    }))
    .query(async ({ input, ctx }) => {
      const { deckId, format } = input;

      const deck = await verifyDeckOwnership(deckId, ctx.user.id);
      const adapter = FormatAdapterFactory.create(format);

      return ArchetypeDetector.detect(deck, adapter);
    }),

  /**
   * Get gap analysis for a deck (format-aware)
   */
  getGaps: authProcedure
    .input(z.object({
      deckId: z.string().uuid(),
      format: formatEnum,
    }))
    .query(async ({ input, ctx }) => {
      const { deckId, format } = input;

      const deck = await verifyDeckOwnership(deckId, ctx.user.id);
      const adapter = FormatAdapterFactory.create(format);

      return GapAnalyzer.analyze(deck, adapter);
    }),
});
```

### 5.2 Request/Response Examples

#### 5.2.1 Get Suggestions (Collection-First)

**Request:**
```typescript
// POST /trpc/recommendations.getSuggestions
{
  "deckId": "550e8400-e29b-41d4-a716-446655440000",
  "collectionId": "660e8400-e29b-41d4-a716-446655440001", // REQUIRED
  "format": "modern", // REQUIRED
  "limit": 10,
  "offset": 0,
  "categoryFilter": "all"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "card": {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "Lightning Bolt",
        "type_line": "Instant",
        "mana_cost": "{R}",
        "cmc": 1,
        "oracle_text": "Lightning Bolt deals 3 damage to any target.",
        "image_uris": { "normal": "https://..." }
      },
      "score": {
        "total": 88.5,
        "mechanical": 32,
        "strategic": 28,
        "formatContext": 18,
        "theme": 6,
        "breakdown": [...]
      },
      "categories": ["removal", "threat"],
      "inCollection": true
    }
  ],
  "total": 127,
  "format": "modern",
  "deckStage": "mid",
  "hasMore": true
}
```

#### 5.2.2 Get Buildable Decks

**Request:**
```typescript
// POST /trpc/recommendations.getBuildableDecks
{
  "collectionId": "660e8400-e29b-41d4-a716-446655440001",
  "format": "modern",
  "limit": 5
}
```

**Response:**
```json
{
  "format": "modern",
  "totalLegalCards": 847,
  "buildableDecks": [
    {
      "archetype": "Burn",
      "completeness": 87,
      "coreCardsOwned": ["Lightning Bolt", "Monastery Swiftspear", "Eidolon of the Great Revel"],
      "missingCount": 4,
      "missingKeyCards": ["Goblin Guide", "Searing Blaze"]
    },
    {
      "archetype": "Elves",
      "completeness": 94,
      "coreCardsOwned": ["Llanowar Elves", "Elvish Archdruid", "Collected Company"],
      "missingCount": 2,
      "missingKeyCards": ["Craterhoof Behemoth"]
    }
  ],
  "viableArchetypes": ["aggro", "tribal", "midrange"]
}
```

#### 5.2.3 Get Format Coverage

**Request:**
```typescript
// POST /trpc/recommendations.getFormatCoverage
{
  "collectionId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response:**
```json
{
  "standard": {
    "totalLegalCards": 312,
    "viableArchetypes": ["aggro", "midrange"],
    "buildableDecks": [...]
  },
  "modern": {
    "totalLegalCards": 847,
    "viableArchetypes": ["aggro", "tribal", "midrange", "combo"],
    "buildableDecks": [...]
  },
  "commander": {
    "totalLegalCards": 1423,
    "viableArchetypes": ["tribal", "aristocrats", "spellslinger"],
    "buildableDecks": [...]
  },
  "brawl": {
    "totalLegalCards": 298,
    "viableArchetypes": ["aggro", "control"],
    "buildableDecks": [...]
  }
}
```

---

## 6. Performance Considerations

### 6.1 Collection-Scoped Query Optimization

The key performance improvement in v2.0 is avoiding scoring cards the user doesn't own.

#### 6.1.1 Query Flow Comparison

**v1.0 (Score All, Filter Later):**
```sql
-- Score ALL legal cards (~25,000+)
SELECT * FROM cards WHERE legalities->>'commander' = 'legal';
-- Then filter in application by collection
```

**v2.0 (Filter First, Score Owned):**
```sql
-- Start with collection (~1,000-3,000 cards typical)
SELECT c.* FROM cards c
JOIN collection_cards cc ON c.id = cc.card_id
WHERE cc.collection_id = $1
  AND c.game_data->'legalities'->>'commander' = 'legal';
```

#### 6.1.2 Performance Impact

| Metric | v1.0 | v2.0 | Improvement |
|--------|------|------|-------------|
| Cards to score | ~25,000 | ~1,500 avg | 94% reduction |
| Scoring time | ~2,500ms | ~150ms | 94% faster |
| Memory usage | ~150MB | ~15MB | 90% reduction |

### 6.2 Format-Specific Caching Strategies

```typescript
// apps/api/src/lib/recommendation/cache.ts

interface CacheStrategy {
  format: FormatType;
  ttl: number;
  invalidateOn: string[];
}

const CACHE_STRATEGIES: Record<FormatType, CacheStrategy> = {
  standard: {
    format: 'standard',
    ttl: 1000 * 60 * 60 * 24, // 24 hours (set rotation)
    invalidateOn: ['set_release', 'ban_announcement'],
  },
  modern: {
    format: 'modern',
    ttl: 1000 * 60 * 60 * 24 * 7, // 7 days (stable format)
    invalidateOn: ['ban_announcement'],
  },
  commander: {
    format: 'commander',
    ttl: 1000 * 60 * 60 * 24 * 7, // 7 days
    invalidateOn: ['ban_announcement', 'new_commander_release'],
  },
  brawl: {
    format: 'brawl',
    ttl: 1000 * 60 * 60 * 24, // 24 hours (Standard rotation affects)
    invalidateOn: ['set_release', 'ban_announcement'],
  },
};
```

### 6.3 Batch Recommendations Across Formats

```typescript
// Parallel format analysis for format coverage
async function analyzeAllFormats(collectionId: string): Promise<FormatCoverageMap> {
  const formats: FormatType[] = ['standard', 'modern', 'commander', 'brawl'];

  // Load collection once
  const collectionCards = await CollectionService.getCards(collectionId);

  // Analyze formats in parallel
  const results = await Promise.all(
    formats.map(format => analyzeFormatCoverage(collectionCards, format))
  );

  return Object.fromEntries(formats.map((f, i) => [f, results[i]]));
}
```

### 6.4 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Recommendation latency (P50) | <300ms | Collection-scoped scoring |
| Recommendation latency (P95) | <1000ms | Collection-scoped scoring |
| Format coverage calculation | <2000ms | All 4 formats |
| Collection sync after card add | <200ms | Progressive update |
| Memory usage per request | <50MB | Profiled heap usage |

---

## 7. Implementation Phases

### 7.1 Phase Overview

```
+-----------------------------------------------------------------------------+
|                    IMPLEMENTATION TIMELINE (REVISED)                         |
+-----------------------------------------------------------------------------+
|                                                                             |
|  Phase 1: Core Engine with Format Adapters (Week 1-3)                       |
|  +-- Standard Adapter                                                       |
|  +-- Commander Adapter                                                      |
|  +-- Collection-first query flow                                            |
|  +-- Format-agnostic synergy scoring                                        |
|  +-- Basic API endpoints                                                    |
|                                                                             |
|  Phase 2: Modern and Brawl Support (Week 4-5)                               |
|  +-- Modern Adapter                                                         |
|  +-- Brawl Adapter                                                          |
|  +-- Banned list integration                                                |
|  +-- Format-specific archetype detection                                    |
|                                                                             |
|  Phase 3: Multi-Format Comparison + Progressive Features (Week 6-7)         |
|  +-- Collection format coverage analysis                                    |
|  +-- Buildable decks endpoint                                               |
|  +-- Multi-format comparison endpoint                                       |
|  +-- Progressive improvement notifications                                  |
|  +-- Caching layer                                                          |
|                                                                             |
|  Phase 4: Frontend Integration (Week 8-10)                                  |
|  +-- Format selector component                                              |
|  +-- Recommendation panel (updated)                                         |
|  +-- Multi-format dashboard                                                 |
|  +-- Collection coverage display                                            |
|  +-- Progressive notification UI                                            |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### 7.2 Phase 1: Core Engine with Format Adapters (Week 1-3)

#### 7.2.1 Deliverables

| Deliverable | File Location |
|-------------|---------------|
| Format Adapter Interface | `apps/api/src/lib/recommendation/format-adapters/types.ts` |
| Standard Adapter | `apps/api/src/lib/recommendation/format-adapters/standard.ts` |
| Commander Adapter | `apps/api/src/lib/recommendation/format-adapters/commander.ts` |
| Format Adapter Factory | `apps/api/src/lib/recommendation/format-adapters/factory.ts` |
| Collection Service | `apps/api/src/lib/recommendation/collection-service.ts` |
| Updated Synergy Scorer | `apps/api/src/lib/recommendation/synergy-scorer.ts` |
| Updated Router | `apps/api/src/router/recommendations.ts` |
| Schema Migration | `packages/db/drizzle/XXXX_add_format_support.sql` |

#### 7.2.2 Acceptance Criteria

- [ ] Standard adapter validates 60-card, 4-of rules
- [ ] Commander adapter validates singleton, color identity
- [ ] Collection-first queries return only owned cards
- [ ] API requires `collectionId` and `format` parameters
- [ ] Synergy scoring works across both formats
- [ ] Unit test coverage >80%

### 7.3 Phase 2: Modern and Brawl Support (Week 4-5)

#### 7.3.1 Deliverables

| Deliverable | File Location |
|-------------|---------------|
| Modern Adapter | `apps/api/src/lib/recommendation/format-adapters/modern.ts` |
| Brawl Adapter | `apps/api/src/lib/recommendation/format-adapters/brawl.ts` |
| Banned Lists Module | `apps/api/src/lib/recommendation/format-adapters/banned-lists.ts` |
| Format-Aware Archetype Detector | `apps/api/src/lib/recommendation/archetype-detector.ts` |

#### 7.3.2 Acceptance Criteria

- [ ] Modern adapter uses Modern-legal card pool
- [ ] Brawl adapter enforces Standard-legal singleton
- [ ] Banned list integration blocks illegal cards
- [ ] Archetype detection adapts to format context
- [ ] All 4 formats pass validation tests

### 7.4 Phase 3: Multi-Format Comparison + Progressive Features (Week 6-7)

#### 7.4.1 Deliverables

| Deliverable | File Location |
|-------------|---------------|
| Collection Format Coverage | `apps/api/src/lib/recommendation/collection-service.ts` |
| Buildable Decks Analyzer | `apps/api/src/lib/recommendation/buildable-decks.ts` |
| Progressive Updates | `apps/api/src/lib/recommendation/progressive-updates.ts` |
| Caching Layer | `apps/api/src/lib/recommendation/cache.ts` |
| New API Endpoints | `apps/api/src/router/recommendations.ts` |

#### 7.4.2 Acceptance Criteria

- [ ] `getBuildableDecks` returns archetypes buildable from collection
- [ ] `getFormatCoverage` analyzes all 4 formats
- [ ] `getMultiFormatComparison` compares deck viability
- [ ] Progressive notifications trigger on card addition
- [ ] Cache hit rate >60% for repeated queries

### 7.5 Phase 4: Frontend Integration (Week 8-10)

#### 7.5.1 Deliverables

| Deliverable | File Location |
|-------------|---------------|
| Format Selector | `apps/web/src/components/recommendations/FormatSelector.tsx` |
| Updated Recommendation Panel | `apps/web/src/components/recommendations/RecommendationPanel.tsx` |
| Multi-Format Dashboard | `apps/web/src/components/recommendations/FormatDashboard.tsx` |
| Collection Coverage Display | `apps/web/src/components/recommendations/CollectionCoverage.tsx` |
| Progressive Notification UI | `apps/web/src/components/recommendations/ProgressiveNotification.tsx` |
| React Query Hooks | `apps/web/src/hooks/useRecommendations.ts` |

#### 7.5.2 Acceptance Criteria

- [ ] Format selector in deck builder
- [ ] Recommendation panel shows only owned cards by default
- [ ] Multi-format dashboard shows coverage across formats
- [ ] Progressive notifications appear after card additions
- [ ] Responsive design for mobile
- [ ] E2E tests pass

---

## 8. Testing Strategy

### 8.1 Format Adapter Tests

```typescript
// apps/api/src/lib/recommendation/__tests__/format-adapters.test.ts

describe('FormatAdapters', () => {
  describe('StandardAdapter', () => {
    it('should enforce 4-copy limit', () => {
      const adapter = FormatAdapterFactory.create('standard');
      const deck = createDeck({ cards: [{ cardId: 'bolt', quantity: 5 }] });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Lightning Bolt exceeds 4-copy limit');
    });

    it('should require 60-card minimum', () => {
      const adapter = FormatAdapterFactory.create('standard');
      const deck = createDeck({ cardCount: 55 });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deck has 55 cards, minimum is 60');
    });
  });

  describe('CommanderAdapter', () => {
    it('should enforce singleton rule', () => {
      const adapter = FormatAdapterFactory.create('commander');
      const deck = createDeck({ cards: [{ cardId: 'sol-ring', quantity: 2 }] });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Sol Ring is not singleton');
    });

    it('should allow Relentless Rats exception', () => {
      const adapter = FormatAdapterFactory.create('commander');
      const deck = createDeck({ cards: [{ cardId: 'relentless-rats', quantity: 30 }] });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(true);
    });

    it('should enforce color identity', () => {
      const adapter = FormatAdapterFactory.create('commander');
      const deck = createDeck({
        commander: { colorIdentity: ['U', 'B'] },
        cards: [{ colorIdentity: ['R'] }],
      });

      const result = adapter.validateDeck(deck);

      expect(result.valid).toBe(false);
    });
  });
});
```

### 8.2 Collection-First Query Tests

```typescript
describe('CollectionService', () => {
  it('should only return owned cards', async () => {
    const collection = await createCollection({ cards: ['card-a', 'card-b'] });

    const result = await CollectionService.getCards(collection.id);

    expect(result).toHaveLength(2);
    expect(result.map(c => c.id)).toEqual(['card-a', 'card-b']);
  });

  it('should filter by format legality', async () => {
    const collection = await createCollection({
      cards: [
        { id: 'standard-legal', legalities: { standard: 'legal' } },
        { id: 'not-standard', legalities: { standard: 'not_legal' } },
      ],
    });

    const result = await CollectionService.getCardsForFormat(collection.id, 'standard');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('standard-legal');
  });
});
```

### 8.3 Integration Tests

```typescript
describe('Recommendations API', () => {
  it('should require collectionId', async () => {
    await expect(
      api.recommendations.getSuggestions({
        deckId: 'deck-123',
        format: 'standard',
        // collectionId missing
      })
    ).rejects.toThrow('collectionId is required');
  });

  it('should require format', async () => {
    await expect(
      api.recommendations.getSuggestions({
        deckId: 'deck-123',
        collectionId: 'collection-123',
        // format missing
      })
    ).rejects.toThrow('format is required');
  });

  it('should return only owned cards', async () => {
    const collection = await createCollection({ cards: ['card-a', 'card-b'] });
    const deck = await createDeck({ format: 'standard' });

    const result = await api.recommendations.getSuggestions({
      deckId: deck.id,
      collectionId: collection.id,
      format: 'standard',
    });

    expect(result.suggestions.every(s => s.inCollection)).toBe(true);
  });
});
```

---

## 9. Appendices

### 9.1 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-07 | Engineering Team | Initial design (Commander-focused) |
| 2.0 | 2026-02-07 | Engineering Team | Multi-format, collection-first architecture |

### 9.2 Key Changes Summary

1. **Format Adapters**: Added StandardAdapter, ModernAdapter, CommanderAdapter, BrawlAdapter
2. **Collection-First**: `collectionId` now REQUIRED, queries start with owned cards
3. **API Updates**: `format` parameter REQUIRED on all recommendation endpoints
4. **New Endpoints**: `getBuildableDecks`, `getFormatCoverage`, `getMultiFormatComparison`
5. **Data Model**: Added `format` field, `format_context` on synergies, `collection_format_coverage` table
6. **Progressive Features**: Notifications when collection changes improve deck options
7. **Performance**: 94% reduction in cards to score by filtering collection first

### 9.3 Migration Notes

For existing installations:
1. Run schema migration to add `format` column to `decks` table
2. Backfill existing Commander decks with `format = 'commander'`
3. Create `collection_format_coverage` table
4. Update API clients to include `collectionId` and `format` parameters

---

*This document should be reviewed by Engineering leads before implementation begins.*
