# MTG Deck Recommendation System - Technical Design Document

**Version**: 1.0
**Date**: 2026-02-07
**Status**: Ready for Implementation
**Authors**: Engineering Team

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
9. [Code Organization](#9-code-organization)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

### Purpose

This document provides the complete technical specification for implementing the MTG Deck Recommendation System for TCG Tracker. It enables Commander/EDH players to receive intelligent, context-aware card recommendations during deck construction.

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Algorithm Approach** | Heuristic-based scoring | Transparent, debuggable, no training data required |
| **Synergy Computation** | On-demand with caching | Balance freshness with performance |
| **Storage Strategy** | PostgreSQL with JSONB | Leverages existing infrastructure |
| **API Framework** | tRPC procedures | Consistency with existing API patterns |
| **Scoring Model** | Additive weighted scoring | Easy to tune, explain, and extend |

### Architecture Overview

```
+------------------+     +-------------------+     +------------------+
|   Web Frontend   |---->|   tRPC API       |---->|   PostgreSQL     |
|   (React/TS)     |     |   (Node.js)      |     |   (Drizzle ORM)  |
+------------------+     +-------------------+     +------------------+
                               |                         |
                               v                         v
                    +--------------------+    +--------------------+
                    | Recommendation     |    | Card Cache         |
                    | Engine             |    | (from Scryfall)    |
                    | - Synergy Scorer   |    +--------------------+
                    | - Archetype Detect |
                    | - Gap Analyzer     |
                    +--------------------+
```

---

## 2. System Architecture

### 2.1 High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TCG Tracker                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         FRONTEND (apps/web)                          │   │
│  │  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │   │
│  │  │ DeckBuilder │  │ RecommendPanel  │  │ SynergyExplainer        │  │   │
│  │  │ Page        │  │ Component       │  │ Component               │  │   │
│  │  └──────┬──────┘  └────────┬────────┘  └────────────┬────────────┘  │   │
│  │         │                  │                        │               │   │
│  │         └──────────────────┴────────────────────────┘               │   │
│  │                            │                                        │   │
│  │                   [TanStack Query / tRPC Client]                   │   │
│  └────────────────────────────┼────────────────────────────────────────┘   │
│                               │                                             │
├───────────────────────────────┼─────────────────────────────────────────────┤
│  ┌────────────────────────────┴────────────────────────────────────────┐   │
│  │                          API LAYER (apps/api)                        │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                    ROUTERS (src/router)                      │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │   │
│  │  │  │ cards.ts     │  │ decks.ts     │  │ recommendations  │   │   │   │
│  │  │  │ (existing)   │  │ (existing)   │  │ .ts (NEW)        │   │   │   │
│  │  │  └──────────────┘  └──────────────┘  └────────┬─────────┘   │   │   │
│  │  └───────────────────────────────────────────────┼──────────────┘   │   │
│  │                                                  │                  │   │
│  │  ┌───────────────────────────────────────────────┴──────────────┐   │   │
│  │  │                  RECOMMENDATION ENGINE (src/lib)             │   │   │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │   │   │
│  │  │  │ SynergyScorer  │  │ ArchetypeDetect│  │ GapAnalyzer    │  │   │   │
│  │  │  │ .ts            │  │ or.ts          │  │ .ts            │  │   │   │
│  │  │  └────────────────┘  └────────────────┘  └────────────────┘  │   │   │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │   │   │
│  │  │  │ KeywordCategor │  │ CardPatterns   │  │ RecommendCache │  │   │   │
│  │  │  │ izer.ts        │  │ .ts            │  │ .ts            │  │   │   │
│  │  │  └────────────────┘  └────────────────┘  └────────────────┘  │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                             │
├───────────────────────────────┼─────────────────────────────────────────────┤
│  ┌────────────────────────────┴────────────────────────────────────────┐   │
│  │                       DATABASE (packages/db)                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ cards        │  │ decks        │  │ card_        │               │   │
│  │  │ (existing)   │  │ (extended)   │  │ synergies    │               │   │
│  │  │              │  │              │  │ (NEW)        │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDATION REQUEST FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

User clicks "Get Suggestions" in Deck Builder
                │
                v
┌───────────────────────────────┐
│ Frontend: DeckBuilder Page    │
│ - Collects deckId, options    │
│ - Calls recommendations.get() │
└───────────────┬───────────────┘
                │
                v
┌───────────────────────────────┐
│ tRPC: recommendations.get()   │
│ - Validates auth & deck owner │
│ - Parses filter options       │
└───────────────┬───────────────┘
                │
                v
┌───────────────────────────────┐
│ RecommendationEngine          │
│ 1. Load deck + cards          │
│ 2. Detect deck stage          │
│ 3. Identify commander         │
└───────────────┬───────────────┘
                │
        ┌───────┴───────┐
        │               │
        v               v
┌───────────────┐ ┌─────────────────┐
│ArchetypeDet.  │ │ SynergyScorer   │
│- Analyze deck │ │- Score each     │
│- Return types │ │  candidate card │
└───────┬───────┘ └────────┬────────┘
        │                  │
        └───────┬──────────┘
                │
                v
┌───────────────────────────────┐
│ GapAnalyzer                   │
│ - Calculate category counts   │
│ - Identify missing categories │
│ - Weight suggestions by gaps  │
└───────────────┬───────────────┘
                │
                v
┌───────────────────────────────┐
│ Collection Filter (optional)  │
│ - If collectionOnly: filter   │
│   to user's owned cards       │
└───────────────┬───────────────┘
                │
                v
┌───────────────────────────────┐
│ Response Formatter            │
│ - Sort by final score         │
│ - Generate explanations       │
│ - Paginate results            │
└───────────────┬───────────────┘
                │
                v
┌───────────────────────────────┐
│ Frontend: RecommendPanel      │
│ - Display ranked suggestions  │
│ - Show synergy explanations   │
│ - Enable one-click add        │
└───────────────────────────────┘
```

### 2.3 Component Responsibilities

| Component | Location | Responsibility |
|-----------|----------|----------------|
| **RecommendationRouter** | `apps/api/src/router/recommendations.ts` | API endpoints, request validation, auth |
| **SynergyScorer** | `apps/api/src/lib/recommendation/synergy-scorer.ts` | Calculate synergy between cards |
| **ArchetypeDetector** | `apps/api/src/lib/recommendation/archetype-detector.ts` | Classify deck strategy |
| **GapAnalyzer** | `apps/api/src/lib/recommendation/gap-analyzer.ts` | Identify missing categories |
| **KeywordCategorizer** | `apps/api/src/lib/recommendation/keyword-categorizer.ts` | Classify keywords by function |
| **CardPatterns** | `apps/api/src/lib/recommendation/card-patterns.ts` | Oracle text pattern matching |
| **RecommendCache** | `apps/api/src/lib/recommendation/cache.ts` | Cache synergy computations |

---

## 3. Recommendation Algorithm Design

### 3.1 Synergy Scoring Mechanism

#### 3.1.1 Overview

Synergy scoring quantifies how well two cards work together. The algorithm uses an **additive weighted scoring model** with scores ranging from 0-100.

#### 3.1.2 Score Components

```typescript
interface SynergyScore {
  total: number;           // 0-100 overall score
  mechanical: number;      // 0-40 keyword/ability synergy
  strategic: number;       // 0-30 archetype/role synergy
  mana: number;            // 0-20 color/curve synergy
  theme: number;           // 0-10 tribal/flavor synergy
  breakdown: ScoreBreakdown[];
}

interface ScoreBreakdown {
  category: 'mechanical' | 'strategic' | 'mana' | 'theme';
  reason: string;          // Human-readable explanation
  points: number;          // Points contributed
  weight: number;          // Multiplier applied
}
```

#### 3.1.3 Mechanical Synergy (0-40 points)

**Keyword Matching Algorithm:**

```typescript
const KEYWORD_CATEGORIES: Record<string, string[]> = {
  evasion: ['Flying', 'Trample', 'Menace', 'Unblockable', 'Fear', 'Intimidate', 'Shadow'],
  protection: ['Hexproof', 'Shroud', 'Indestructible', 'Ward', 'Protection'],
  combat: ['First Strike', 'Double Strike', 'Deathtouch', 'Lifelink', 'Vigilance'],
  recursion: ['Undying', 'Persist', 'Encore', 'Escape', 'Embalm', 'Eternalize'],
  manaReduction: ['Affinity', 'Convoke', 'Delve', 'Improvise'],
  cardAdvantage: ['Cycling', 'Flashback', 'Retrace', 'Jump-start'],
  counters: ['Proliferate', 'Modular', 'Graft', 'Evolve'],
};

function calculateMechanicalSynergy(card1: Card, card2: Card): number {
  let score = 0;

  // 1. Same keyword category bonus (up to 15 points)
  const card1Categories = getKeywordCategories(card1.keywords);
  const card2Categories = getKeywordCategories(card2.keywords);
  const sharedCategories = intersection(card1Categories, card2Categories);
  score += Math.min(15, sharedCategories.length * 5);

  // 2. Trigger/Enabler relationships (up to 15 points)
  score += calculateTriggerEnablerScore(card1, card2);

  // 3. Combo potential detection (up to 10 points)
  score += detectComboSynergy(card1, card2);

  return Math.min(40, score);
}
```

**Trigger/Enabler Relationships:**

| Enabler Pattern | Trigger Pattern | Points |
|-----------------|-----------------|--------|
| `sacrifice` outlet | `when .* dies` | 10 |
| `discard` outlet | `madness|whenever .* discard` | 10 |
| `create .* token` | `when .* enters|sacrifice` | 8 |
| `draw .* card` | `whenever you draw` | 8 |
| `\+1/\+1 counter` | `proliferate|modular` | 8 |
| `mill|graveyard` | `escape|flashback|return .* graveyard` | 10 |

#### 3.1.4 Strategic Synergy (0-30 points)

**Role Complementarity:**

```typescript
const ROLE_SYNERGIES: [string, string, number][] = [
  ['threat', 'protection', 8],      // Creature + Counterspell
  ['threat', 'evasion', 6],         // Creature + Evasion enabler
  ['ramp', 'expensive_threat', 8],  // Ramp + High CMC card
  ['draw', 'combo_piece', 6],       // Card draw + Combo enabler
  ['removal', 'threat', 4],         // Removal + Win condition
  ['tutor', 'combo_piece', 10],     // Tutor + Combo piece
];

function calculateStrategicSynergy(card1: Card, card2: Card, deckArchetype: Archetype): number {
  let score = 0;

  const role1 = classifyCardRole(card1);
  const role2 = classifyCardRole(card2);

  // Role complementarity (up to 15 points)
  for (const [r1, r2, points] of ROLE_SYNERGIES) {
    if ((role1 === r1 && role2 === r2) || (role1 === r2 && role2 === r1)) {
      score += points;
    }
  }

  // Archetype alignment (up to 15 points)
  const card1ArchetypeScore = getArchetypeAlignment(card1, deckArchetype);
  const card2ArchetypeScore = getArchetypeAlignment(card2, deckArchetype);
  score += (card1ArchetypeScore + card2ArchetypeScore) / 2;

  return Math.min(30, score);
}
```

#### 3.1.5 Mana Synergy (0-20 points)

```typescript
function calculateManaSynergy(card: Card, deck: DeckAnalysis): number {
  let score = 0;

  // Color identity match (required for Commander - 0 or base points)
  if (!isColorIdentityCompatible(card, deck.commander)) {
    return 0; // Ineligible card
  }

  // Color consistency bonus (up to 10 points)
  const deckColors = getDominantColors(deck);
  const cardColors = card.color_identity;
  const colorOverlap = intersection(deckColors, cardColors).length;
  score += colorOverlap * 3;

  // Curve fit bonus (up to 10 points)
  const optimalCMC = getOptimalCMCGap(deck);
  const cmcDiff = Math.abs(card.cmc - optimalCMC);
  score += Math.max(0, 10 - cmcDiff * 2);

  return Math.min(20, score);
}
```

#### 3.1.6 Theme Synergy (0-10 points)

```typescript
function calculateThemeSynergy(card: Card, deck: DeckAnalysis): number {
  let score = 0;

  // Tribal match (up to 6 points)
  const deckTribes = detectDeckTribes(deck);
  for (const tribe of deckTribes) {
    if (card.subtypes.includes(tribe) || mentionsTribalType(card.oracle_text, tribe)) {
      score += 6;
      break;
    }
  }

  // Set synergy (up to 2 points) - cards from same set often synergize
  if (deck.cards.some(c => c.set_code === card.set_code)) {
    score += 2;
  }

  // Flavor alignment (up to 2 points) - e.g., graveyard themes
  if (hasMatchingTheme(card, deck.detectedThemes)) {
    score += 2;
  }

  return Math.min(10, score);
}
```

### 3.2 Commander Affinity Scoring

Commander decks require special scoring logic based on the commander card.

#### 3.2.1 Commander Synergy Algorithm

```typescript
interface CommanderAffinityResult {
  score: number;                    // 0-100
  commanderSynergyScore: number;    // 0-50 bonus points
  reasons: string[];
}

function calculateCommanderAffinity(
  card: Card,
  commander: Card
): CommanderAffinityResult {
  const reasons: string[] = [];
  let score = 0;

  // 1. Color Identity Check (REQUIRED)
  if (!isColorIdentitySubset(card.color_identity, commander.color_identity)) {
    return { score: 0, commanderSynergyScore: 0, reasons: ['Color identity mismatch'] };
  }

  // 2. Keyword Synergy with Commander (up to 15 points)
  const keywordScore = calculateKeywordSynergy(card, commander);
  score += keywordScore.points;
  reasons.push(...keywordScore.reasons);

  // 3. Tribal Match (up to 15 points)
  const commanderTribes = extractTribes(commander);
  const cardTribes = extractTribes(card);
  const sharedTribes = intersection(commanderTribes, cardTribes);
  if (sharedTribes.length > 0) {
    score += 15;
    reasons.push(`Shares tribe: ${sharedTribes.join(', ')}`);
  } else if (cardTribes.some(t => mentionsTribalType(commander.oracle_text, t))) {
    score += 10;
    reasons.push(`Commander references: ${cardTribes[0]}`);
  }

  // 4. Oracle Text Pattern Match (up to 10 points)
  const patternScore = matchCommanderPatterns(card, commander);
  score += patternScore.points;
  reasons.push(...patternScore.reasons);

  // 5. Ability Word/Mechanic Match (up to 10 points)
  const mechanicScore = matchMechanics(card, commander);
  score += mechanicScore.points;
  reasons.push(...mechanicScore.reasons);

  return {
    score: Math.min(50, score),
    commanderSynergyScore: score,
    reasons
  };
}
```

#### 3.2.2 Commander Pattern Matching

```typescript
const COMMANDER_PATTERNS: CommanderPattern[] = [
  {
    pattern: /whenever .* die/i,
    synergiesWith: [/sacrifice/i, /dies trigger/i, /aristocrats/i],
    archetype: 'aristocrats',
    bonus: 10,
  },
  {
    pattern: /\+1\/\+1 counter/i,
    synergiesWith: [/proliferate/i, /counter/i, /modular/i],
    archetype: 'counters',
    bonus: 10,
  },
  {
    pattern: /draw .* card/i,
    synergiesWith: [/whenever you draw/i, /card draw/i],
    archetype: 'card_advantage',
    bonus: 8,
  },
  {
    pattern: /attack/i,
    synergiesWith: [/haste/i, /vigilance/i, /combat/i],
    archetype: 'combat',
    bonus: 8,
  },
  {
    pattern: /instant|sorcery/i,
    synergiesWith: [/magecraft/i, /prowess/i, /storm/i],
    archetype: 'spellslinger',
    bonus: 10,
  },
  {
    pattern: /artifact/i,
    synergiesWith: [/artifact/i, /affinity/i, /metalcraft/i],
    archetype: 'artifacts',
    bonus: 10,
  },
  {
    pattern: /graveyard/i,
    synergiesWith: [/mill/i, /flashback/i, /escape/i, /reanimate/i],
    archetype: 'graveyard',
    bonus: 10,
  },
];
```

### 3.3 Deck Composition Analysis

#### 3.3.1 Category Classification

```typescript
const CARD_CATEGORIES = {
  ramp: {
    keywords: ['Mana', 'Treasure'],
    patterns: [/add \{[WUBRGC]/i, /search .* land/i, /additional land/i],
    typeMatches: ['Artifact'],
  },
  cardDraw: {
    keywords: ['Cycling', 'Flashback'],
    patterns: [/draw .* card/i, /look at .* cards/i],
    typeMatches: [],
  },
  removal: {
    keywords: [],
    patterns: [/destroy target/i, /exile target/i, /return .* to .* hand/i, /-X\/-X/i],
    typeMatches: ['Instant', 'Sorcery'],
  },
  boardWipe: {
    keywords: [],
    patterns: [/destroy all/i, /exile all/i, /each creature/i, /all creatures get/i],
    typeMatches: [],
  },
  protection: {
    keywords: ['Hexproof', 'Shroud', 'Indestructible', 'Ward'],
    patterns: [/gain hexproof/i, /protection from/i, /can't be targeted/i],
    typeMatches: [],
  },
  threat: {
    keywords: ['Flying', 'Trample', 'Double Strike'],
    patterns: [/win the game/i, /opponents? lose/i],
    typeMatches: ['Creature', 'Planeswalker'],
  },
  tutor: {
    keywords: [],
    patterns: [/search your library for/i],
    typeMatches: [],
  },
  recursion: {
    keywords: ['Undying', 'Persist', 'Encore', 'Escape'],
    patterns: [/return .* from .* graveyard/i, /put .* from .* graveyard/i],
    typeMatches: [],
  },
};

function classifyCard(card: Card): CardCategory[] {
  const categories: CardCategory[] = [];

  for (const [category, criteria] of Object.entries(CARD_CATEGORIES)) {
    let matches = false;

    // Check keywords
    if (criteria.keywords.some(kw => card.keywords.includes(kw))) {
      matches = true;
    }

    // Check oracle text patterns
    if (criteria.patterns.some(pattern => pattern.test(card.oracle_text ?? ''))) {
      matches = true;
    }

    // Check type matches (for threat detection)
    if (criteria.typeMatches.some(type => card.types.includes(type))) {
      // Only count as threat if meaningful power/toughness or abilities
      if (category === 'threat' && card.types.includes('Creature')) {
        const power = parseInt(card.power ?? '0', 10);
        if (power >= 4 || card.keywords.length >= 2) {
          matches = true;
        }
      }
    }

    if (matches) {
      categories.push(category as CardCategory);
    }
  }

  return categories.length > 0 ? categories : ['other'];
}
```

#### 3.3.2 8x8 Theory Analysis

```typescript
interface DeckGapAnalysis {
  categoryBreakdown: Record<CardCategory, CategoryStatus>;
  overallScore: number;        // 0-100 deck completeness
  recommendations: GapRecommendation[];
}

interface CategoryStatus {
  current: number;
  minimum: number;
  optimal: number;
  maximum: number;
  status: 'lacking' | 'adequate' | 'optimal' | 'excess';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

const CATEGORY_TARGETS: Record<CardCategory, { min: number; opt: number; max: number }> = {
  ramp:       { min: 8,  opt: 10, max: 15 },
  cardDraw:   { min: 5,  opt: 10, max: 12 },
  removal:    { min: 8,  opt: 10, max: 12 },
  boardWipe:  { min: 2,  opt: 4,  max: 5 },
  protection: { min: 2,  opt: 4,  max: 6 },
  threat:     { min: 10, opt: 15, max: 25 },
  tutor:      { min: 0,  opt: 3,  max: 8 },
  recursion:  { min: 2,  opt: 5,  max: 8 },
};

function analyzeDeckGaps(deck: DeckWithCards): DeckGapAnalysis {
  const breakdown: Record<CardCategory, CategoryStatus> = {};
  const cardCategories = deck.cards.flatMap(c => classifyCard(c.card));

  for (const [category, targets] of Object.entries(CATEGORY_TARGETS)) {
    const count = cardCategories.filter(c => c === category).length;

    let status: CategoryStatus['status'];
    let priority: CategoryStatus['priority'];

    if (count < targets.min) {
      status = 'lacking';
      priority = count < targets.min / 2 ? 'critical' : 'high';
    } else if (count >= targets.min && count < targets.opt) {
      status = 'adequate';
      priority = 'medium';
    } else if (count >= targets.opt && count <= targets.max) {
      status = 'optimal';
      priority = 'low';
    } else {
      status = 'excess';
      priority = 'medium'; // May want to cut cards
    }

    breakdown[category as CardCategory] = {
      current: count,
      minimum: targets.min,
      optimal: targets.opt,
      maximum: targets.max,
      status,
      priority,
    };
  }

  return {
    categoryBreakdown: breakdown,
    overallScore: calculateCompleteness(breakdown),
    recommendations: generateGapRecommendations(breakdown),
  };
}
```

#### 3.3.3 Archetype Detection

```typescript
interface ArchetypeAnalysis {
  primary: ArchetypeResult;
  secondary: ArchetypeResult | null;
  confidence: number;
}

interface ArchetypeResult {
  archetype: Archetype;
  confidence: number;
  signals: string[];
}

const ARCHETYPE_DETECTORS: Record<Archetype, ArchetypeDetector> = {
  aggro: {
    detect: (deck) => {
      const avgCMC = calculateAvgCMC(deck);
      const creatureRatio = getCreatureRatio(deck);
      const hasHaste = countKeyword(deck, 'Haste');

      let confidence = 0;
      const signals: string[] = [];

      if (avgCMC < 3.0) {
        confidence += 30;
        signals.push(`Low CMC average: ${avgCMC.toFixed(2)}`);
      }
      if (creatureRatio > 0.5) {
        confidence += 25;
        signals.push(`High creature density: ${(creatureRatio * 100).toFixed(0)}%`);
      }
      if (hasHaste >= 5) {
        confidence += 20;
        signals.push(`Haste enablers: ${hasHaste}`);
      }

      return { confidence: Math.min(100, confidence), signals };
    },
  },

  control: {
    detect: (deck) => {
      const interactionCount = countCategory(deck, 'removal') + countCategory(deck, 'boardWipe');
      const avgCMC = calculateAvgCMC(deck);
      const counterspellCount = countPattern(deck, /counter target/i);

      let confidence = 0;
      const signals: string[] = [];

      if (interactionCount >= 15) {
        confidence += 35;
        signals.push(`High interaction count: ${interactionCount}`);
      }
      if (avgCMC > 3.5) {
        confidence += 20;
        signals.push(`High CMC average: ${avgCMC.toFixed(2)}`);
      }
      if (counterspellCount >= 5) {
        confidence += 25;
        signals.push(`Counterspells: ${counterspellCount}`);
      }

      return { confidence: Math.min(100, confidence), signals };
    },
  },

  tribal: {
    detect: (deck) => {
      const creatureTypes = getCreatureTypeDistribution(deck);
      const topTribe = Object.entries(creatureTypes)
        .sort(([, a], [, b]) => b - a)[0];

      if (!topTribe) return { confidence: 0, signals: [] };

      const [tribe, count] = topTribe;
      const hasTribalSupport = hasTribalCards(deck, tribe);

      let confidence = 0;
      const signals: string[] = [];

      if (count >= 20) {
        confidence += 50;
        signals.push(`${count} ${tribe} creatures`);
      } else if (count >= 10) {
        confidence += 25;
        signals.push(`${count} ${tribe} creatures`);
      }

      if (hasTribalSupport) {
        confidence += 30;
        signals.push(`Tribal support cards detected`);
      }

      return { confidence: Math.min(100, confidence), signals };
    },
  },

  // ... similar detectors for: midrange, combo, voltron, aristocrats, spellslinger, reanimator, stax
};

function detectArchetype(deck: DeckWithCards): ArchetypeAnalysis {
  const results: ArchetypeResult[] = [];

  for (const [archetype, detector] of Object.entries(ARCHETYPE_DETECTORS)) {
    const { confidence, signals } = detector.detect(deck);
    if (confidence > 20) { // Minimum threshold
      results.push({ archetype: archetype as Archetype, confidence, signals });
    }
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);

  return {
    primary: results[0] ?? { archetype: 'midrange', confidence: 50, signals: ['Default archetype'] },
    secondary: results[1] ?? null,
    confidence: results[0]?.confidence ?? 50,
  };
}
```

### 3.4 Progressive Recommendation Logic

#### 3.4.1 Deck Stages

```typescript
type DeckStage = 'early' | 'mid' | 'late' | 'final' | 'complete';

function determineDeckStage(deck: DeckWithCards): DeckStage {
  const mainboardCount = deck.cards
    .filter(c => c.cardType === 'mainboard')
    .reduce((sum, c) => sum + c.quantity, 0);

  // Commander format: 99 cards + commander = 100
  if (mainboardCount >= 99) return 'complete';
  if (mainboardCount >= 90) return 'final';
  if (mainboardCount >= 60) return 'late';
  if (mainboardCount >= 30) return 'mid';
  return 'early';
}
```

#### 3.4.2 Stage-Aware Weighting

```typescript
const STAGE_WEIGHTS: Record<DeckStage, ScoreWeights> = {
  early: {
    commanderSynergy: 1.5,   // Prioritize commander synergy
    mechanical: 1.2,         // Build core interactions
    strategic: 0.8,          // Less important early
    mana: 1.0,
    theme: 1.3,              // Establish theme early
    gapFilling: 0.5,         // Gaps not meaningful yet
  },
  mid: {
    commanderSynergy: 1.2,
    mechanical: 1.0,
    strategic: 1.0,
    mana: 1.0,
    theme: 1.0,
    gapFilling: 1.2,         // Start balancing categories
  },
  late: {
    commanderSynergy: 0.8,   // Core synergies established
    mechanical: 0.8,
    strategic: 1.2,          // Fill strategic roles
    mana: 1.2,               // Optimize curve
    theme: 0.8,
    gapFilling: 1.5,         // Critical to fill gaps
  },
  final: {
    commanderSynergy: 0.5,
    mechanical: 0.6,
    strategic: 1.0,
    mana: 1.5,               // Curve optimization critical
    theme: 0.5,
    gapFilling: 2.0,         // Fill remaining holes
  },
  complete: {
    commanderSynergy: 1.0,
    mechanical: 1.0,
    strategic: 1.0,
    mana: 1.0,
    theme: 1.0,
    gapFilling: 0.5,         // Suggest swaps, not additions
  },
};

function applyStageWeights(
  baseScore: SynergyScore,
  stage: DeckStage,
  gapBonus: number
): number {
  const weights = STAGE_WEIGHTS[stage];

  return (
    baseScore.mechanical * weights.mechanical +
    baseScore.strategic * weights.strategic +
    baseScore.mana * weights.mana +
    baseScore.theme * weights.theme +
    gapBonus * weights.gapFilling
  );
}
```

#### 3.4.3 Gap-Based Bonus

```typescript
function calculateGapBonus(
  card: Card,
  gapAnalysis: DeckGapAnalysis
): number {
  const cardCategories = classifyCard(card);
  let bonus = 0;

  for (const category of cardCategories) {
    const status = gapAnalysis.categoryBreakdown[category];
    if (!status) continue;

    switch (status.priority) {
      case 'critical':
        bonus += 25;
        break;
      case 'high':
        bonus += 15;
        break;
      case 'medium':
        bonus += 5;
        break;
      case 'low':
        bonus += 0;
        break;
    }
  }

  return bonus;
}
```

---

## 4. Data Model Extensions

### 4.1 New Tables

#### 4.1.1 card_synergies Table

```sql
-- Pre-computed synergy scores for common card pairs
-- Used for caching frequently requested synergies
CREATE TABLE card_synergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  related_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  synergy_score DECIMAL(5,2) NOT NULL CHECK (synergy_score >= 0 AND synergy_score <= 100),
  mechanical_score DECIMAL(5,2) NOT NULL,
  strategic_score DECIMAL(5,2) NOT NULL,
  mana_score DECIMAL(5,2) NOT NULL,
  theme_score DECIMAL(5,2) NOT NULL,
  synergy_reasons JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_id, related_card_id)
);

-- Index for fast lookups by either card
CREATE INDEX idx_card_synergies_card_id ON card_synergies(card_id);
CREATE INDEX idx_card_synergies_related_card_id ON card_synergies(related_card_id);
CREATE INDEX idx_card_synergies_score ON card_synergies(synergy_score DESC);
```

#### 4.1.2 Drizzle Schema Definition

```typescript
// packages/db/src/schema/card-synergies.ts

import { pgTable, uuid, decimal, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';
import { cards } from './cards';

export const cardSynergies = pgTable('card_synergies', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  relatedCardId: uuid('related_card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  synergyScore: decimal('synergy_score', { precision: 5, scale: 2 }).notNull(),
  mechanicalScore: decimal('mechanical_score', { precision: 5, scale: 2 }).notNull(),
  strategicScore: decimal('strategic_score', { precision: 5, scale: 2 }).notNull(),
  manaScore: decimal('mana_score', { precision: 5, scale: 2 }).notNull(),
  themeScore: decimal('theme_score', { precision: 5, scale: 2 }).notNull(),
  synergyReasons: jsonb('synergy_reasons').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueCardPair: unique().on(table.cardId, table.relatedCardId),
}));

export type CardSynergy = typeof cardSynergies.$inferSelect;
export type NewCardSynergy = typeof cardSynergies.$inferInsert;
```

### 4.2 Schema Extensions

#### 4.2.1 Decks Table Extensions

```sql
-- Add archetype tracking to decks table
ALTER TABLE decks
  ADD COLUMN detected_archetypes TEXT[] DEFAULT '{}',
  ADD COLUMN archetype_confidence JSONB DEFAULT '{}',
  ADD COLUMN last_analysis_at TIMESTAMP WITH TIME ZONE;

-- Index for archetype queries
CREATE INDEX idx_decks_archetypes ON decks USING GIN(detected_archetypes);
```

#### 4.2.2 Drizzle Schema Update

```typescript
// Update packages/db/src/schema/decks.ts

import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
import { collections } from './collections';

export const decks = pgTable('decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  format: varchar('format', { length: 50 }),
  collectionOnly: boolean('collection_only').default(false),
  collectionId: uuid('collection_id').references(() => collections.id),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  // NEW FIELDS
  detectedArchetypes: text('detected_archetypes').array().default([]),
  archetypeConfidence: jsonb('archetype_confidence').default({}),
  lastAnalysisAt: timestamp('last_analysis_at', { withTimezone: true }),
  // Existing timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
```

### 4.3 Migration File

```sql
-- packages/db/drizzle/XXXX_add_recommendation_tables.sql

-- Create card_synergies table
CREATE TABLE IF NOT EXISTS card_synergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  related_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  synergy_score DECIMAL(5,2) NOT NULL CHECK (synergy_score >= 0 AND synergy_score <= 100),
  mechanical_score DECIMAL(5,2) NOT NULL,
  strategic_score DECIMAL(5,2) NOT NULL,
  mana_score DECIMAL(5,2) NOT NULL,
  theme_score DECIMAL(5,2) NOT NULL,
  synergy_reasons JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_id, related_card_id)
);

CREATE INDEX IF NOT EXISTS idx_card_synergies_card_id ON card_synergies(card_id);
CREATE INDEX IF NOT EXISTS idx_card_synergies_related_card_id ON card_synergies(related_card_id);
CREATE INDEX IF NOT EXISTS idx_card_synergies_score ON card_synergies(synergy_score DESC);

-- Extend decks table
ALTER TABLE decks
  ADD COLUMN IF NOT EXISTS detected_archetypes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS archetype_confidence JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_analysis_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_decks_archetypes ON decks USING GIN(detected_archetypes);
```

---

## 5. API Design

### 5.1 New Router: recommendations.ts

```typescript
// apps/api/src/router/recommendations.ts

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { authProcedure, router } from '../trpc';
import { db } from '@tcg-tracker/db';
import { decks, deckCards, cards, collectionCards, collections, cardSynergies } from '@tcg-tracker/db/schema';
import { eq, and, isNull, inArray, desc, sql } from 'drizzle-orm';
import { handlePromise } from '../lib/handle-promise';
import { SynergyScorer } from '../lib/recommendation/synergy-scorer';
import { ArchetypeDetector } from '../lib/recommendation/archetype-detector';
import { GapAnalyzer } from '../lib/recommendation/gap-analyzer';

// ============================================================================
// Input Schemas
// ============================================================================

const getSuggestionsSchema = z.object({
  deckId: z.string().uuid(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
  collectionOnly: z.boolean().default(false),
  categoryFilter: z.enum(['ramp', 'cardDraw', 'removal', 'boardWipe', 'threat', 'all']).default('all'),
});

const getArchetypeSchema = z.object({
  deckId: z.string().uuid(),
});

const getGapsSchema = z.object({
  deckId: z.string().uuid(),
});

const getCardSynergiesSchema = z.object({
  cardId: z.string().uuid(),
  deckId: z.string().uuid().optional(), // Context for deck-aware synergies
  limit: z.number().min(1).max(20).default(10),
});

const getSynergyScoreSchema = z.object({
  cardId: z.string().uuid(),
  targetCardId: z.string().uuid(),
});

// ============================================================================
// Output Types
// ============================================================================

const cardSuggestionSchema = z.object({
  card: z.object({
    id: z.string().uuid(),
    name: z.string(),
    type_line: z.string(),
    mana_cost: z.string().nullable(),
    cmc: z.number(),
    oracle_text: z.string().nullable(),
    image_uris: z.any().nullable(),
  }),
  score: z.number(),
  breakdown: z.object({
    mechanical: z.number(),
    strategic: z.number(),
    mana: z.number(),
    theme: z.number(),
    gapBonus: z.number(),
    commanderBonus: z.number(),
  }),
  reasons: z.array(z.string()),
  categories: z.array(z.string()),
  inCollection: z.boolean(),
});

const archetypeAnalysisSchema = z.object({
  primary: z.object({
    archetype: z.string(),
    confidence: z.number(),
    signals: z.array(z.string()),
  }),
  secondary: z.object({
    archetype: z.string(),
    confidence: z.number(),
    signals: z.array(z.string()),
  }).nullable(),
  deckStage: z.enum(['early', 'mid', 'late', 'final', 'complete']),
});

const gapAnalysisSchema = z.object({
  categoryBreakdown: z.record(z.object({
    current: z.number(),
    minimum: z.number(),
    optimal: z.number(),
    maximum: z.number(),
    status: z.enum(['lacking', 'adequate', 'optimal', 'excess']),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
  })),
  overallScore: z.number(),
  recommendations: z.array(z.object({
    category: z.string(),
    message: z.string(),
    cardsNeeded: z.number(),
  })),
});

// ============================================================================
// Router Definition
// ============================================================================

export const recommendationsRouter = router({
  /**
   * Get card suggestions for a deck
   * Primary endpoint for the recommendation system
   */
  getSuggestions: authProcedure
    .input(getSuggestionsSchema)
    .output(z.object({
      suggestions: z.array(cardSuggestionSchema),
      total: z.number(),
      deckStage: z.string(),
      hasMore: z.boolean(),
    }))
    .query(async ({ input, ctx }) => {
      const { deckId, limit, offset, collectionOnly, categoryFilter } = input;

      // 1. Verify deck ownership
      const { data: deck, error: deckError } = await handlePromise(
        db.query.decks.findFirst({
          where: and(
            eq(decks.id, deckId),
            eq(decks.ownerId, ctx.user.id),
            isNull(decks.deletedAt)
          ),
        })
      );

      if (deckError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch deck',
        });
      }

      if (!deck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found or access denied',
        });
      }

      // 2. Load deck cards with full card data
      const { data: deckCardsData, error: cardsError } = await handlePromise(
        db.query.deckCards.findMany({
          where: and(
            eq(deckCards.deckId, deckId),
            isNull(deckCards.deletedAt)
          ),
          with: { card: true },
        })
      );

      if (cardsError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch deck cards',
        });
      }

      // 3. Get commander if present
      const commander = deckCardsData?.find(dc => dc.cardType === 'commander')?.card;

      // 4. Calculate deck stage and analyze
      const deckWithCards = { ...deck, cards: deckCardsData ?? [] };
      const deckStage = determineDeckStage(deckWithCards);
      const archetype = ArchetypeDetector.detect(deckWithCards);
      const gaps = GapAnalyzer.analyze(deckWithCards);

      // 5. Get user's collection cards if filtering
      let userCardIds: Set<string> = new Set();
      if (collectionOnly) {
        const { data: userCollections } = await handlePromise(
          db.query.collections.findMany({
            where: and(
              eq(collections.ownerId, ctx.user.id),
              isNull(collections.deletedAt)
            ),
          })
        );

        if (userCollections && userCollections.length > 0) {
          const collectionIds = userCollections.map(c => c.id);
          const { data: collCards } = await handlePromise(
            db.query.collectionCards.findMany({
              where: and(
                inArray(collectionCards.collectionId, collectionIds),
                isNull(collectionCards.deletedAt)
              ),
            })
          );
          userCardIds = new Set(collCards?.map(cc => cc.cardId) ?? []);
        }
      }

      // 6. Get candidate cards
      const deckCardIds = new Set(deckCardsData?.map(dc => dc.cardId) ?? []);
      const candidateCards = await getCandidateCards(
        deck.format,
        commander?.color_identity ?? [],
        deckCardIds,
        collectionOnly ? userCardIds : null,
        categoryFilter
      );

      // 7. Score each candidate
      const scoredCards = await Promise.all(
        candidateCards.map(async (card) => {
          const score = SynergyScorer.score(card, {
            commander,
            deckCards: deckCardsData ?? [],
            archetype,
            gaps,
            stage: deckStage,
          });

          return {
            card: {
              id: card.id,
              name: card.name,
              type_line: card.typeLine,
              mana_cost: card.manaCost,
              cmc: Number(card.cmc),
              oracle_text: card.oracleText,
              image_uris: card.imageUris,
            },
            score: score.total,
            breakdown: {
              mechanical: score.mechanical,
              strategic: score.strategic,
              mana: score.mana,
              theme: score.theme,
              gapBonus: score.gapBonus,
              commanderBonus: score.commanderBonus,
            },
            reasons: score.reasons,
            categories: classifyCard(card),
            inCollection: userCardIds.has(card.id),
          };
        })
      );

      // 8. Sort by score and paginate
      scoredCards.sort((a, b) => b.score - a.score);
      const paginatedResults = scoredCards.slice(offset, offset + limit);

      return {
        suggestions: paginatedResults,
        total: scoredCards.length,
        deckStage,
        hasMore: offset + limit < scoredCards.length,
      };
    }),

  /**
   * Get archetype analysis for a deck
   */
  getArchetype: authProcedure
    .input(getArchetypeSchema)
    .output(archetypeAnalysisSchema)
    .query(async ({ input, ctx }) => {
      const { deckId } = input;

      // Verify ownership and load deck
      const { data: deck } = await handlePromise(
        db.query.decks.findFirst({
          where: and(
            eq(decks.id, deckId),
            eq(decks.ownerId, ctx.user.id),
            isNull(decks.deletedAt)
          ),
        })
      );

      if (!deck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found',
        });
      }

      // Load cards
      const { data: deckCardsData } = await handlePromise(
        db.query.deckCards.findMany({
          where: and(
            eq(deckCards.deckId, deckId),
            isNull(deckCards.deletedAt)
          ),
          with: { card: true },
        })
      );

      const deckWithCards = { ...deck, cards: deckCardsData ?? [] };
      const analysis = ArchetypeDetector.detect(deckWithCards);
      const stage = determineDeckStage(deckWithCards);

      // Update deck with detected archetypes
      await handlePromise(
        db.update(decks)
          .set({
            detectedArchetypes: [analysis.primary.archetype, analysis.secondary?.archetype].filter(Boolean),
            archetypeConfidence: {
              [analysis.primary.archetype]: analysis.primary.confidence,
              ...(analysis.secondary ? { [analysis.secondary.archetype]: analysis.secondary.confidence } : {}),
            },
            lastAnalysisAt: new Date(),
          })
          .where(eq(decks.id, deckId))
      );

      return {
        primary: analysis.primary,
        secondary: analysis.secondary,
        deckStage: stage,
      };
    }),

  /**
   * Get gap analysis for a deck
   */
  getGaps: authProcedure
    .input(getGapsSchema)
    .output(gapAnalysisSchema)
    .query(async ({ input, ctx }) => {
      const { deckId } = input;

      // Verify ownership and load deck
      const { data: deck } = await handlePromise(
        db.query.decks.findFirst({
          where: and(
            eq(decks.id, deckId),
            eq(decks.ownerId, ctx.user.id),
            isNull(decks.deletedAt)
          ),
        })
      );

      if (!deck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found',
        });
      }

      // Load cards
      const { data: deckCardsData } = await handlePromise(
        db.query.deckCards.findMany({
          where: and(
            eq(deckCards.deckId, deckId),
            isNull(deckCards.deletedAt)
          ),
          with: { card: true },
        })
      );

      const deckWithCards = { ...deck, cards: deckCardsData ?? [] };
      return GapAnalyzer.analyze(deckWithCards);
    }),

  /**
   * Get synergy scores for a specific card
   */
  getCardSynergies: authProcedure
    .input(getCardSynergiesSchema)
    .output(z.object({
      synergies: z.array(z.object({
        card: z.object({
          id: z.string(),
          name: z.string(),
          type_line: z.string(),
          image_uris: z.any().nullable(),
        }),
        score: z.number(),
        reasons: z.array(z.string()),
      })),
    }))
    .query(async ({ input, ctx }) => {
      const { cardId, deckId, limit } = input;

      // Try to get cached synergies first
      const { data: cachedSynergies } = await handlePromise(
        db.query.cardSynergies.findMany({
          where: eq(cardSynergies.cardId, cardId),
          orderBy: desc(cardSynergies.synergyScore),
          limit,
          with: { relatedCard: true },
        })
      );

      if (cachedSynergies && cachedSynergies.length > 0) {
        return {
          synergies: cachedSynergies.map(s => ({
            card: {
              id: s.relatedCard.id,
              name: s.relatedCard.name,
              type_line: s.relatedCard.typeLine,
              image_uris: s.relatedCard.imageUris,
            },
            score: Number(s.synergyScore),
            reasons: s.synergyReasons as string[],
          })),
        };
      }

      // Compute synergies on-demand
      const { data: sourceCard } = await handlePromise(
        db.query.cards.findFirst({
          where: eq(cards.id, cardId),
        })
      );

      if (!sourceCard) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Card not found',
        });
      }

      // Get candidate cards (same color identity or colorless)
      const candidates = await getCandidatesByColorIdentity(sourceCard.colorIdentity ?? []);

      const synergies = candidates
        .map(candidate => {
          const score = SynergyScorer.pairwiseScore(sourceCard, candidate);
          return {
            card: {
              id: candidate.id,
              name: candidate.name,
              type_line: candidate.typeLine,
              image_uris: candidate.imageUris,
            },
            score: score.total,
            reasons: score.reasons,
          };
        })
        .filter(s => s.score >= 40) // Minimum synergy threshold
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return { synergies };
    }),

  /**
   * Get synergy score between two specific cards
   */
  getSynergyScore: authProcedure
    .input(getSynergyScoreSchema)
    .output(z.object({
      score: z.number(),
      breakdown: z.object({
        mechanical: z.number(),
        strategic: z.number(),
        mana: z.number(),
        theme: z.number(),
      }),
      reasons: z.array(z.string()),
    }))
    .query(async ({ input }) => {
      const { cardId, targetCardId } = input;

      const { data: card1 } = await handlePromise(
        db.query.cards.findFirst({ where: eq(cards.id, cardId) })
      );

      const { data: card2 } = await handlePromise(
        db.query.cards.findFirst({ where: eq(cards.id, targetCardId) })
      );

      if (!card1 || !card2) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or both cards not found',
        });
      }

      const score = SynergyScorer.pairwiseScore(card1, card2);

      return {
        score: score.total,
        breakdown: {
          mechanical: score.mechanical,
          strategic: score.strategic,
          mana: score.mana,
          theme: score.theme,
        },
        reasons: score.reasons,
      };
    }),
});

// ============================================================================
// Helper Functions
// ============================================================================

async function getCandidateCards(
  format: string | null,
  colorIdentity: string[],
  excludeIds: Set<string>,
  collectionCardIds: Set<string> | null,
  categoryFilter: string
): Promise<Card[]> {
  // Build query conditions
  const conditions = [
    isNull(cards.deletedAt),
  ];

  // If collection filtering, only consider those cards
  if (collectionCardIds !== null) {
    if (collectionCardIds.size === 0) {
      return []; // No cards in collection
    }
    conditions.push(inArray(cards.id, Array.from(collectionCardIds)));
  }

  const { data: candidateCards } = await handlePromise(
    db.query.cards.findMany({
      where: and(...conditions),
      limit: 500, // Reasonable upper bound
    })
  );

  if (!candidateCards) return [];

  // Filter by color identity and exclusions
  return candidateCards.filter(card => {
    // Exclude cards already in deck
    if (excludeIds.has(card.id)) return false;

    // Check color identity compatibility
    const cardColors = card.colorIdentity ?? [];
    if (!isColorIdentitySubset(cardColors, colorIdentity)) return false;

    // Category filter
    if (categoryFilter !== 'all') {
      const categories = classifyCard(card);
      if (!categories.includes(categoryFilter)) return false;
    }

    return true;
  });
}

function isColorIdentitySubset(cardColors: string[], deckColors: string[]): boolean {
  if (deckColors.length === 0) {
    // Colorless commander - only colorless cards allowed
    return cardColors.length === 0;
  }
  return cardColors.every(c => deckColors.includes(c));
}
```

### 5.2 Error Handling

```typescript
// apps/api/src/lib/recommendation/errors.ts

export class RecommendationError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_DECK' | 'NO_COMMANDER' | 'SCORING_FAILED' | 'CACHE_ERROR',
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RecommendationError';
  }
}

export function handleRecommendationError(error: unknown): TRPCError {
  if (error instanceof RecommendationError) {
    switch (error.code) {
      case 'INVALID_DECK':
        return new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      case 'NO_COMMANDER':
        return new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Deck must have a commander for recommendations',
        });
      case 'SCORING_FAILED':
        return new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to calculate synergy scores',
        });
      default:
        return new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Recommendation engine error',
        });
    }
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected error in recommendation engine',
  });
}
```

### 5.3 Request/Response Examples

#### 5.3.1 Get Suggestions

**Request:**
```typescript
// POST /trpc/recommendations.getSuggestions
{
  "deckId": "550e8400-e29b-41d4-a716-446655440000",
  "limit": 10,
  "offset": 0,
  "collectionOnly": true,
  "categoryFilter": "ramp"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "card": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Sol Ring",
        "type_line": "Artifact",
        "mana_cost": "{1}",
        "cmc": 1,
        "oracle_text": "{T}: Add {C}{C}.",
        "image_uris": { "normal": "https://..." }
      },
      "score": 92.5,
      "breakdown": {
        "mechanical": 35,
        "strategic": 25,
        "mana": 18,
        "theme": 4,
        "gapBonus": 10.5,
        "commanderBonus": 0
      },
      "reasons": [
        "Premium mana acceleration",
        "Fills critical ramp gap (4/10)",
        "Excellent curve position at CMC 1"
      ],
      "categories": ["ramp"],
      "inCollection": true
    }
  ],
  "total": 45,
  "deckStage": "mid",
  "hasMore": true
}
```

#### 5.3.2 Get Archetype

**Request:**
```typescript
// POST /trpc/recommendations.getArchetype
{
  "deckId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "primary": {
    "archetype": "tribal",
    "confidence": 85,
    "signals": [
      "24 Zombie creatures",
      "Tribal support cards: Rooftop Storm, Endless Ranks of the Dead"
    ]
  },
  "secondary": {
    "archetype": "aristocrats",
    "confidence": 65,
    "signals": [
      "7 sacrifice outlets",
      "10 death triggers"
    ]
  },
  "deckStage": "late"
}
```

#### 5.3.3 Get Gaps

**Request:**
```typescript
// POST /trpc/recommendations.getGaps
{
  "deckId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "categoryBreakdown": {
    "ramp": {
      "current": 6,
      "minimum": 8,
      "optimal": 10,
      "maximum": 15,
      "status": "lacking",
      "priority": "high"
    },
    "cardDraw": {
      "current": 8,
      "minimum": 5,
      "optimal": 10,
      "maximum": 12,
      "status": "adequate",
      "priority": "medium"
    },
    "removal": {
      "current": 10,
      "minimum": 8,
      "optimal": 10,
      "maximum": 12,
      "status": "optimal",
      "priority": "low"
    }
  },
  "overallScore": 72,
  "recommendations": [
    {
      "category": "ramp",
      "message": "Add 2-4 more ramp cards for consistency",
      "cardsNeeded": 2
    },
    {
      "category": "boardWipe",
      "message": "Consider adding 2 board wipes for emergency answers",
      "cardsNeeded": 2
    }
  ]
}
```

---

## 6. Performance Considerations

### 6.1 Caching Strategy

#### 6.1.1 Multi-Level Cache Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CACHING LAYERS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ L1: In-Memory (Node.js Process)                             │   │
│  │ - Keyword categorization mappings                           │   │
│  │ - Pattern regex cache                                       │   │
│  │ - Hot card synergy scores                                   │   │
│  │ TTL: Process lifetime | Max: 10,000 entries                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                     │
│                               v                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ L2: Redis (Optional - for horizontal scaling)               │   │
│  │ - Deck analysis results                                     │   │
│  │ - Computed synergy batches                                  │   │
│  │ - User-specific recommendation sets                         │   │
│  │ TTL: 1 hour | Max: Configurable                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                     │
│                               v                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ L3: PostgreSQL (card_synergies table)                       │   │
│  │ - Pre-computed popular card pairs                           │   │
│  │ - Archetype detection cache in decks table                  │   │
│  │ TTL: 7 days | Refresh: Background job                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 6.1.2 Implementation

```typescript
// apps/api/src/lib/recommendation/cache.ts

import { LRUCache } from 'lru-cache';

// L1: In-memory cache
const synergyCache = new LRUCache<string, SynergyScore>({
  max: 10000,
  ttl: 1000 * 60 * 30, // 30 minutes
});

const archetypeCache = new LRUCache<string, ArchetypeAnalysis>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes (invalidated on deck changes)
});

export class RecommendCache {
  static getSynergyKey(cardId1: string, cardId2: string): string {
    // Ensure consistent key regardless of order
    return [cardId1, cardId2].sort().join(':');
  }

  static async getSynergy(card1: Card, card2: Card): Promise<SynergyScore | null> {
    const key = this.getSynergyKey(card1.id, card2.id);

    // L1: Memory
    const cached = synergyCache.get(key);
    if (cached) return cached;

    // L3: Database (skip L2 for MVP)
    const { data: dbCached } = await handlePromise(
      db.query.cardSynergies.findFirst({
        where: or(
          and(
            eq(cardSynergies.cardId, card1.id),
            eq(cardSynergies.relatedCardId, card2.id)
          ),
          and(
            eq(cardSynergies.cardId, card2.id),
            eq(cardSynergies.relatedCardId, card1.id)
          )
        ),
      })
    );

    if (dbCached) {
      const score: SynergyScore = {
        total: Number(dbCached.synergyScore),
        mechanical: Number(dbCached.mechanicalScore),
        strategic: Number(dbCached.strategicScore),
        mana: Number(dbCached.manaScore),
        theme: Number(dbCached.themeScore),
        reasons: dbCached.synergyReasons as string[],
      };
      synergyCache.set(key, score);
      return score;
    }

    return null;
  }

  static async setSynergy(card1: Card, card2: Card, score: SynergyScore): Promise<void> {
    const key = this.getSynergyKey(card1.id, card2.id);

    // L1: Memory
    synergyCache.set(key, score);

    // L3: Database (async, don't block)
    handlePromise(
      db.insert(cardSynergies).values({
        cardId: card1.id,
        relatedCardId: card2.id,
        synergyScore: score.total.toString(),
        mechanicalScore: score.mechanical.toString(),
        strategicScore: score.strategic.toString(),
        manaScore: score.mana.toString(),
        themeScore: score.theme.toString(),
        synergyReasons: score.reasons,
      }).onConflictDoUpdate({
        target: [cardSynergies.cardId, cardSynergies.relatedCardId],
        set: {
          synergyScore: score.total.toString(),
          mechanicalScore: score.mechanical.toString(),
          strategicScore: score.strategic.toString(),
          manaScore: score.mana.toString(),
          themeScore: score.theme.toString(),
          synergyReasons: score.reasons,
          updatedAt: new Date(),
        },
      })
    );
  }

  static invalidateDeck(deckId: string): void {
    archetypeCache.delete(deckId);
  }
}
```

### 6.2 Query Optimization

#### 6.2.1 Indexed Queries

```sql
-- Ensure GIN indexes are used for array containment
EXPLAIN ANALYZE
SELECT * FROM cards
WHERE color_identity <@ ARRAY['U', 'B']  -- Subset check
  AND 'Zombie' = ANY(subtypes)           -- Array contains
  AND deleted_at IS NULL;

-- Expected: Index Scan using idx_cards_color_identity and idx_cards_subtypes
```

#### 6.2.2 Batch Loading

```typescript
// Load cards in batches to avoid N+1 queries
async function loadCardsWithSynergies(deckCardIds: string[]): Promise<Map<string, Card>> {
  const { data: allCards } = await handlePromise(
    db.query.cards.findMany({
      where: inArray(cards.id, deckCardIds),
    })
  );

  return new Map((allCards ?? []).map(c => [c.id, c]));
}
```

#### 6.2.3 Parallel Scoring

```typescript
// Score cards in parallel batches
async function scoreCardsParallel(
  candidates: Card[],
  context: ScoringContext,
  batchSize: number = 50
): Promise<ScoredCard[]> {
  const results: ScoredCard[] = [];

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(card => scoreCard(card, context))
    );
    results.push(...batchResults);
  }

  return results;
}
```

### 6.3 Scalability Considerations

| Scenario | Current Design | Scale Trigger | Mitigation |
|----------|----------------|---------------|------------|
| Many concurrent users | Single Node.js process | >100 concurrent recommendation requests | Horizontal scaling with Redis L2 cache |
| Large card pool | In-memory candidate filtering | >100,000 cached cards | Pre-filter by color identity in SQL |
| Expensive scoring | On-demand calculation | >500ms average response | Pre-compute popular synergies in background |
| Database load | Per-request queries | >1000 QPS | Connection pooling, read replicas |

### 6.4 Performance Targets

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Recommendation latency (P50) | <500ms | API response time |
| Recommendation latency (P95) | <2000ms | API response time |
| Synergy calculation | <10ms per pair | Instrumented scoring function |
| Archetype detection | <100ms | Instrumented detector |
| Gap analysis | <50ms | Instrumented analyzer |
| Memory usage | <512MB for cache | Process monitoring |

---

## 7. Implementation Phases

### 7.1 Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION TIMELINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Phase 1: Core Engine (Week 1-2)                                        │
│  ├─ Synergy scoring algorithm                                           │
│  ├─ Keyword categorization                                              │
│  ├─ Card pattern matching                                               │
│  └─ Basic API endpoint                                                  │
│                                                                         │
│  Phase 2: Deck Analysis (Week 3-4)                                      │
│  ├─ Archetype detection                                                 │
│  ├─ Gap analyzer                                                        │
│  ├─ Commander affinity scoring                                          │
│  └─ Collection filtering                                                │
│                                                                         │
│  Phase 3: Progressive Logic (Week 5-6)                                  │
│  ├─ Deck stage detection                                                │
│  ├─ Stage-aware weighting                                               │
│  ├─ Recommendation caching                                              │
│  └─ Performance optimization                                            │
│                                                                         │
│  Phase 4: Frontend Integration (Week 7-8)                               │
│  ├─ Recommendation panel component                                      │
│  ├─ Synergy explanation UI                                              │
│  ├─ Collection toggle                                                   │
│  └─ Archetype display                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Phase 1: Core Engine (Week 1-2)

#### 7.2.1 Deliverables

| Deliverable | File Location | Dependencies |
|-------------|---------------|--------------|
| Keyword Categorizer | `apps/api/src/lib/recommendation/keyword-categorizer.ts` | None |
| Card Patterns | `apps/api/src/lib/recommendation/card-patterns.ts` | None |
| Synergy Scorer | `apps/api/src/lib/recommendation/synergy-scorer.ts` | Keyword Categorizer, Card Patterns |
| Basic Router | `apps/api/src/router/recommendations.ts` | Synergy Scorer |
| Schema Migration | `packages/db/drizzle/XXXX_add_recommendation_tables.sql` | None |

#### 7.2.2 Tasks

1. **Create keyword categorization module** (2 days)
   - Define KEYWORD_CATEGORIES constant
   - Implement `getKeywordCategories(keywords: string[]): string[]`
   - Unit tests for categorization

2. **Create card pattern matching** (2 days)
   - Define oracle text patterns for triggers/enablers
   - Implement pattern matching functions
   - Unit tests for pattern detection

3. **Implement synergy scorer** (3 days)
   - Mechanical synergy calculation
   - Strategic synergy calculation
   - Mana synergy calculation
   - Theme synergy calculation
   - Integration tests

4. **Create basic API endpoint** (2 days)
   - Schema definitions
   - `recommendations.getSuggestions` procedure
   - Error handling

5. **Database migration** (1 day)
   - Create migration file
   - Update Drizzle schema
   - Run migration

#### 7.2.3 Acceptance Criteria

- [ ] Synergy scorer returns scores 0-100 with breakdown
- [ ] Keyword categorization covers all tracked keywords
- [ ] Pattern matching detects 10+ trigger/enabler relationships
- [ ] API endpoint returns paginated suggestions
- [ ] Unit test coverage >80%

### 7.3 Phase 2: Deck Analysis (Week 3-4)

#### 7.3.1 Deliverables

| Deliverable | File Location | Dependencies |
|-------------|---------------|--------------|
| Archetype Detector | `apps/api/src/lib/recommendation/archetype-detector.ts` | Card Patterns |
| Gap Analyzer | `apps/api/src/lib/recommendation/gap-analyzer.ts` | Card Patterns |
| Commander Affinity | `apps/api/src/lib/recommendation/commander-affinity.ts` | Synergy Scorer |
| Collection Filter | Integration in router | Collections API |

#### 7.3.2 Tasks

1. **Implement archetype detector** (4 days)
   - Detector functions for each archetype
   - Confidence scoring
   - Signal extraction
   - Unit tests for known deck types

2. **Implement gap analyzer** (3 days)
   - Card category classification
   - 8x8 theory targets
   - Gap recommendation generation
   - Unit tests

3. **Implement commander affinity** (2 days)
   - Color identity validation
   - Commander pattern matching
   - Tribal detection
   - Integration with synergy scorer

4. **Add collection filtering** (2 days)
   - Query user collections
   - Filter candidates by ownership
   - `inCollection` flag in response

5. **Add archetype/gaps endpoints** (2 days)
   - `recommendations.getArchetype`
   - `recommendations.getGaps`
   - Integration tests

#### 7.3.3 Acceptance Criteria

- [ ] Archetype detection correctly identifies 8+ archetypes
- [ ] Gap analyzer matches 8x8 theory targets
- [ ] Commander affinity boosts tribal/theme matches
- [ ] Collection filtering excludes unowned cards
- [ ] Integration test coverage for all endpoints

### 7.4 Phase 3: Progressive Logic (Week 5-6)

#### 7.4.1 Deliverables

| Deliverable | File Location | Dependencies |
|-------------|---------------|--------------|
| Stage Detector | `apps/api/src/lib/recommendation/stage-detector.ts` | None |
| Stage Weighting | Integration in synergy scorer | Stage Detector |
| Recommendation Cache | `apps/api/src/lib/recommendation/cache.ts` | Synergy Scorer |
| Performance Monitoring | Instrumentation | All modules |

#### 7.4.2 Tasks

1. **Implement deck stage detection** (1 day)
   - `determineDeckStage()` function
   - Stage thresholds

2. **Implement stage-aware weighting** (2 days)
   - Weight tables for each stage
   - Apply weights in scoring
   - Gap bonus by stage

3. **Implement caching layer** (4 days)
   - LRU cache implementation
   - Cache key generation
   - Database synergy persistence
   - Cache invalidation on deck changes

4. **Performance optimization** (3 days)
   - Parallel scoring
   - Batch queries
   - Index verification
   - Load testing

5. **Monitoring instrumentation** (1 day)
   - Timing decorators
   - Logging
   - Error tracking

#### 7.4.3 Acceptance Criteria

- [ ] Stage detection accurate for 0-99 card range
- [ ] Weight application changes recommendations appropriately
- [ ] Cache hit rate >60% for repeated queries
- [ ] P95 latency <2000ms
- [ ] Memory usage stable under load

### 7.5 Phase 4: Frontend Integration (Week 7-8)

#### 7.5.1 Deliverables

| Deliverable | File Location | Dependencies |
|-------------|---------------|--------------|
| Recommendation Panel | `apps/web/src/components/recommendations/RecommendationPanel.tsx` | API endpoints |
| Synergy Explainer | `apps/web/src/components/recommendations/SynergyExplainer.tsx` | API endpoints |
| Archetype Display | `apps/web/src/components/recommendations/ArchetypeDisplay.tsx` | API endpoints |
| Collection Toggle | Integration in panel | API endpoints |
| React Query Hooks | `apps/web/src/hooks/useRecommendations.ts` | API endpoints |

#### 7.5.2 Tasks

1. **Create React Query hooks** (2 days)
   - `useRecommendations(deckId, options)`
   - `useArchetype(deckId)`
   - `useGaps(deckId)`
   - Error handling

2. **Build recommendation panel** (3 days)
   - Card list with scores
   - Pagination
   - Loading states
   - Add to deck action

3. **Build synergy explainer** (2 days)
   - Score breakdown visualization
   - Reason list
   - Hover state for cards

4. **Build archetype display** (2 days)
   - Primary/secondary badges
   - Confidence meter
   - Signal list

5. **Integration with deck builder** (2 days)
   - Panel placement
   - Collection toggle
   - Real-time updates on deck changes

6. **Polish and testing** (2 days)
   - Responsive design
   - Accessibility
   - E2E tests

#### 7.5.3 Acceptance Criteria

- [ ] Recommendation panel loads within 2s
- [ ] Add to deck updates panel in <500ms
- [ ] Collection toggle filters correctly
- [ ] Synergy explanations are readable
- [ ] Works on mobile viewports
- [ ] E2E tests pass

---

## 8. Testing Strategy

### 8.1 Unit Testing

#### 8.1.1 Synergy Scorer Tests

```typescript
// apps/api/src/lib/recommendation/__tests__/synergy-scorer.test.ts

import { describe, it, expect } from 'vitest';
import { SynergyScorer } from '../synergy-scorer';
import { createMockCard } from '../../../test/factories';

describe('SynergyScorer', () => {
  describe('calculateMechanicalSynergy', () => {
    it('should score high for shared keyword categories', () => {
      const card1 = createMockCard({
        keywords: ['Flying', 'Trample'],
      });
      const card2 = createMockCard({
        keywords: ['Flying', 'Menace'],
      });

      const score = SynergyScorer.calculateMechanicalSynergy(card1, card2);

      expect(score).toBeGreaterThanOrEqual(10);
      expect(score).toBeLessThanOrEqual(40);
    });

    it('should detect sacrifice/death trigger synergy', () => {
      const sacrificeOutlet = createMockCard({
        oracleText: 'Sacrifice a creature: Draw a card.',
      });
      const deathTrigger = createMockCard({
        oracleText: 'When this creature dies, create two 1/1 tokens.',
      });

      const score = SynergyScorer.calculateMechanicalSynergy(sacrificeOutlet, deathTrigger);

      expect(score).toBeGreaterThanOrEqual(10);
    });

    it('should return 0 for unrelated cards', () => {
      const card1 = createMockCard({
        keywords: ['Flying'],
        oracleText: 'This creature has flying.',
      });
      const card2 = createMockCard({
        keywords: ['Landwalk'],
        oracleText: 'Islandwalk',
      });

      const score = SynergyScorer.calculateMechanicalSynergy(card1, card2);

      expect(score).toBeLessThan(5);
    });
  });

  describe('calculateStrategicSynergy', () => {
    it('should score for threat + protection role', () => {
      const threat = createMockCard({
        types: ['Creature'],
        power: '5',
        toughness: '5',
      });
      const protection = createMockCard({
        keywords: ['Hexproof'],
        oracleText: 'Target creature gains hexproof until end of turn.',
      });

      const score = SynergyScorer.calculateStrategicSynergy(threat, protection);

      expect(score).toBeGreaterThanOrEqual(8);
    });
  });

  describe('calculateManaSynergy', () => {
    it('should require color identity compatibility', () => {
      const blueCard = createMockCard({
        colorIdentity: ['U'],
      });
      const redCard = createMockCard({
        colorIdentity: ['R'],
      });
      const deck = { commander: createMockCard({ colorIdentity: ['U'] }) };

      // Blue card should have mana synergy
      expect(SynergyScorer.calculateManaSynergy(blueCard, deck)).toBeGreaterThan(0);

      // Red card should have 0 (color identity mismatch)
      expect(SynergyScorer.calculateManaSynergy(redCard, deck)).toBe(0);
    });
  });
});
```

#### 8.1.2 Archetype Detector Tests

```typescript
// apps/api/src/lib/recommendation/__tests__/archetype-detector.test.ts

import { describe, it, expect } from 'vitest';
import { ArchetypeDetector } from '../archetype-detector';
import { createMockDeck } from '../../../test/factories';

describe('ArchetypeDetector', () => {
  describe('detect', () => {
    it('should detect aggro deck', () => {
      const deck = createMockDeck({
        cards: [
          // 30 low-CMC creatures with haste
          ...Array(30).fill(null).map(() => createMockCard({
            types: ['Creature'],
            cmc: 2,
            keywords: ['Haste'],
          })),
        ],
      });

      const result = ArchetypeDetector.detect(deck);

      expect(result.primary.archetype).toBe('aggro');
      expect(result.primary.confidence).toBeGreaterThan(50);
    });

    it('should detect tribal deck', () => {
      const deck = createMockDeck({
        cards: Array(25).fill(null).map(() => createMockCard({
          types: ['Creature'],
          subtypes: ['Zombie'],
        })),
      });

      const result = ArchetypeDetector.detect(deck);

      expect(result.primary.archetype).toBe('tribal');
      expect(result.primary.signals).toContain(expect.stringContaining('Zombie'));
    });

    it('should return multiple archetypes when applicable', () => {
      const deck = createMockDeck({
        cards: [
          // Zombies
          ...Array(20).fill(null).map(() => createMockCard({
            types: ['Creature'],
            subtypes: ['Zombie'],
          })),
          // Sacrifice outlets
          ...Array(5).fill(null).map(() => createMockCard({
            oracleText: 'Sacrifice a creature:',
          })),
          // Death triggers
          ...Array(8).fill(null).map(() => createMockCard({
            oracleText: 'When this creature dies',
          })),
        ],
      });

      const result = ArchetypeDetector.detect(deck);

      expect(result.primary.archetype).toBe('tribal');
      expect(result.secondary?.archetype).toBe('aristocrats');
    });
  });
});
```

#### 8.1.3 Gap Analyzer Tests

```typescript
// apps/api/src/lib/recommendation/__tests__/gap-analyzer.test.ts

import { describe, it, expect } from 'vitest';
import { GapAnalyzer } from '../gap-analyzer';
import { createMockDeck, createMockCard } from '../../../test/factories';

describe('GapAnalyzer', () => {
  describe('analyze', () => {
    it('should identify lacking ramp', () => {
      const deck = createMockDeck({
        cards: [
          // Only 3 ramp cards
          ...Array(3).fill(null).map(() => createMockCard({
            oracleText: 'Add {G} to your mana pool.',
          })),
          // Other cards
          ...Array(50).fill(null).map(() => createMockCard({
            types: ['Creature'],
          })),
        ],
      });

      const result = GapAnalyzer.analyze(deck);

      expect(result.categoryBreakdown.ramp.status).toBe('lacking');
      expect(result.categoryBreakdown.ramp.priority).toBe('critical');
    });

    it('should identify optimal removal count', () => {
      const deck = createMockDeck({
        cards: Array(10).fill(null).map(() => createMockCard({
          oracleText: 'Destroy target creature.',
        })),
      });

      const result = GapAnalyzer.analyze(deck);

      expect(result.categoryBreakdown.removal.status).toBe('optimal');
    });

    it('should generate recommendations for gaps', () => {
      const deck = createMockDeck({
        cards: [
          // No card draw
          ...Array(50).fill(null).map(() => createMockCard({
            types: ['Creature'],
          })),
        ],
      });

      const result = GapAnalyzer.analyze(deck);

      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          category: 'cardDraw',
          cardsNeeded: expect.any(Number),
        })
      );
    });
  });
});
```

### 8.2 Integration Testing

```typescript
// apps/api/src/router/__tests__/recommendations.integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestContext, createTestUser, createTestDeck } from '../../../test/helpers';
import { recommendationsRouter } from '../recommendations';

describe('recommendations router integration', () => {
  let ctx: TestContext;
  let user: TestUser;
  let deck: TestDeck;

  beforeAll(async () => {
    ctx = await createTestContext();
    user = await createTestUser(ctx);
    deck = await createTestDeck(ctx, user, {
      format: 'Commander',
      cards: [
        { cardType: 'commander', cardId: 'wilhelt-uuid' },
        // Add some zombies
        ...Array(30).fill(null).map((_, i) => ({
          cardType: 'mainboard',
          cardId: `zombie-${i}-uuid`,
        })),
      ],
    });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  describe('getSuggestions', () => {
    it('should return suggestions for a deck', async () => {
      const caller = recommendationsRouter.createCaller(ctx.withUser(user));

      const result = await caller.getSuggestions({
        deckId: deck.id,
        limit: 10,
      });

      expect(result.suggestions).toHaveLength(10);
      expect(result.suggestions[0]).toMatchObject({
        card: expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
        score: expect.any(Number),
        breakdown: expect.any(Object),
        reasons: expect.any(Array),
      });
      expect(result.deckStage).toMatch(/early|mid|late|final|complete/);
    });

    it('should filter by collection when collectionOnly is true', async () => {
      const caller = recommendationsRouter.createCaller(ctx.withUser(user));

      const result = await caller.getSuggestions({
        deckId: deck.id,
        collectionOnly: true,
      });

      result.suggestions.forEach(s => {
        expect(s.inCollection).toBe(true);
      });
    });

    it('should reject access to other user decks', async () => {
      const otherUser = await createTestUser(ctx);
      const caller = recommendationsRouter.createCaller(ctx.withUser(otherUser));

      await expect(
        caller.getSuggestions({ deckId: deck.id })
      ).rejects.toThrow('Deck not found');
    });
  });

  describe('getArchetype', () => {
    it('should detect deck archetype', async () => {
      const caller = recommendationsRouter.createCaller(ctx.withUser(user));

      const result = await caller.getArchetype({ deckId: deck.id });

      expect(result.primary.archetype).toBe('tribal');
      expect(result.primary.confidence).toBeGreaterThan(50);
      expect(result.deckStage).toBeDefined();
    });
  });

  describe('getGaps', () => {
    it('should return category analysis', async () => {
      const caller = recommendationsRouter.createCaller(ctx.withUser(user));

      const result = await caller.getGaps({ deckId: deck.id });

      expect(result.categoryBreakdown).toHaveProperty('ramp');
      expect(result.categoryBreakdown).toHaveProperty('cardDraw');
      expect(result.categoryBreakdown).toHaveProperty('removal');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });
});
```

### 8.3 End-to-End Testing

```typescript
// apps/web/e2e/recommendations.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Deck Recommendations', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to deck builder
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should show recommendations for a deck', async ({ page }) => {
    // Navigate to existing deck
    await page.goto('/decks/test-deck-id');

    // Click recommendations tab
    await page.click('[data-testid="recommendations-tab"]');

    // Wait for recommendations to load
    await page.waitForSelector('[data-testid="recommendation-card"]');

    // Verify recommendations displayed
    const recommendations = await page.locator('[data-testid="recommendation-card"]').all();
    expect(recommendations.length).toBeGreaterThan(0);

    // Verify score is shown
    const firstScore = await page.locator('[data-testid="synergy-score"]').first();
    await expect(firstScore).toBeVisible();
  });

  test('should filter by collection', async ({ page }) => {
    await page.goto('/decks/test-deck-id');
    await page.click('[data-testid="recommendations-tab"]');

    // Enable collection filter
    await page.click('[data-testid="collection-only-toggle"]');

    // Wait for filtered results
    await page.waitForSelector('[data-testid="recommendation-card"]');

    // Verify all shown cards have collection badge
    const cards = await page.locator('[data-testid="recommendation-card"]').all();
    for (const card of cards) {
      await expect(card.locator('[data-testid="in-collection-badge"]')).toBeVisible();
    }
  });

  test('should add recommended card to deck', async ({ page }) => {
    await page.goto('/decks/test-deck-id');
    await page.click('[data-testid="recommendations-tab"]');

    // Get initial deck count
    const initialCount = await page.locator('[data-testid="deck-card-count"]').textContent();

    // Add first recommendation
    await page.click('[data-testid="add-to-deck-button"]');

    // Verify deck count increased
    await expect(page.locator('[data-testid="deck-card-count"]'))
      .not.toHaveText(initialCount ?? '');

    // Verify recommendations refreshed
    await page.waitForSelector('[data-testid="recommendation-card"]');
  });

  test('should show archetype analysis', async ({ page }) => {
    await page.goto('/decks/test-deck-id');
    await page.click('[data-testid="analysis-tab"]');

    // Verify archetype displayed
    await expect(page.locator('[data-testid="primary-archetype"]')).toBeVisible();
    await expect(page.locator('[data-testid="archetype-confidence"]')).toBeVisible();
  });

  test('should show gap analysis', async ({ page }) => {
    await page.goto('/decks/test-deck-id');
    await page.click('[data-testid="analysis-tab"]');

    // Verify category breakdown
    await expect(page.locator('[data-testid="category-ramp"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-cardDraw"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-removal"]')).toBeVisible();

    // Verify gap recommendations
    await expect(page.locator('[data-testid="gap-recommendation"]').first()).toBeVisible();
  });
});
```

### 8.4 Performance Testing

```typescript
// apps/api/src/lib/recommendation/__tests__/performance.test.ts

import { describe, it, expect } from 'vitest';
import { SynergyScorer } from '../synergy-scorer';
import { createMockCard, createMockDeck } from '../../../test/factories';

describe('Performance', () => {
  it('should score 100 cards in under 1 second', async () => {
    const cards = Array(100).fill(null).map(() => createMockCard());
    const context = {
      commander: createMockCard(),
      deckCards: [],
      archetype: { primary: { archetype: 'midrange', confidence: 50, signals: [] }, secondary: null },
      gaps: { categoryBreakdown: {}, overallScore: 50, recommendations: [] },
      stage: 'mid' as const,
    };

    const start = performance.now();

    await Promise.all(
      cards.map(card => SynergyScorer.score(card, context))
    );

    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000);
  });

  it('should complete pairwise scoring in under 10ms', () => {
    const card1 = createMockCard();
    const card2 = createMockCard();

    const start = performance.now();
    SynergyScorer.pairwiseScore(card1, card2);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });
});
```

---

## 9. Code Organization

### 9.1 Directory Structure

```
apps/api/
├── src/
│   ├── router/
│   │   ├── cards.ts              # Existing
│   │   ├── collections.ts        # Existing
│   │   ├── decks.ts              # Existing
│   │   ├── recommendations.ts    # NEW - Main router
│   │   └── index.ts              # Add recommendations export
│   │
│   ├── lib/
│   │   ├── scryfall.ts           # Existing
│   │   ├── handle-promise.ts     # Existing
│   │   │
│   │   └── recommendation/       # NEW - Engine modules
│   │       ├── index.ts          # Public exports
│   │       ├── types.ts          # Shared type definitions
│   │       ├── constants.ts      # Configuration constants
│   │       ├── synergy-scorer.ts
│   │       ├── archetype-detector.ts
│   │       ├── gap-analyzer.ts
│   │       ├── commander-affinity.ts
│   │       ├── keyword-categorizer.ts
│   │       ├── card-patterns.ts
│   │       ├── stage-detector.ts
│   │       ├── cache.ts
│   │       └── __tests__/
│   │           ├── synergy-scorer.test.ts
│   │           ├── archetype-detector.test.ts
│   │           ├── gap-analyzer.test.ts
│   │           └── performance.test.ts
│   │
│   └── trpc/
│       └── index.ts              # Existing

packages/db/
├── src/
│   └── schema/
│       ├── cards.ts              # Existing
│       ├── decks.ts              # MODIFIED - Add archetype fields
│       ├── card-synergies.ts     # NEW
│       └── index.ts              # Add exports
│
└── drizzle/
    └── XXXX_add_recommendation_tables.sql  # NEW

apps/web/
├── src/
│   ├── components/
│   │   └── recommendations/      # NEW
│   │       ├── RecommendationPanel.tsx
│   │       ├── SynergyExplainer.tsx
│   │       ├── ArchetypeDisplay.tsx
│   │       ├── GapAnalysis.tsx
│   │       ├── CategoryBreakdown.tsx
│   │       └── index.ts
│   │
│   ├── hooks/
│   │   └── useRecommendations.ts  # NEW
│   │
│   └── pages/
│       └── decks/
│           └── [id].tsx          # MODIFIED - Add recommendations tab
│
└── e2e/
    └── recommendations.spec.ts    # NEW
```

### 9.2 Module Dependencies

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MODULE DEPENDENCY GRAPH                             │
└─────────────────────────────────────────────────────────────────────────┘

                         recommendations.ts (router)
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          v                        v                        v
   synergy-scorer.ts      archetype-detector.ts      gap-analyzer.ts
          │                        │                        │
          │                        │                        │
          ├──────────────┬─────────┴─────────┬──────────────┤
          │              │                   │              │
          v              v                   v              v
  keyword-categorizer  card-patterns   stage-detector   constants
        .ts              .ts               .ts            .ts
                                   │
                                   v
                               types.ts

                         cache.ts (standalone, uses synergy-scorer)
```

### 9.3 File Templates

#### 9.3.1 types.ts

```typescript
// apps/api/src/lib/recommendation/types.ts

export type DeckStage = 'early' | 'mid' | 'late' | 'final' | 'complete';

export type CardCategory =
  | 'ramp'
  | 'cardDraw'
  | 'removal'
  | 'boardWipe'
  | 'protection'
  | 'threat'
  | 'tutor'
  | 'recursion'
  | 'other';

export type Archetype =
  | 'aggro'
  | 'control'
  | 'midrange'
  | 'combo'
  | 'tribal'
  | 'voltron'
  | 'aristocrats'
  | 'spellslinger'
  | 'reanimator'
  | 'stax';

export interface SynergyScore {
  total: number;
  mechanical: number;
  strategic: number;
  mana: number;
  theme: number;
  gapBonus: number;
  commanderBonus: number;
  reasons: string[];
}

export interface ArchetypeResult {
  archetype: Archetype;
  confidence: number;
  signals: string[];
}

export interface ArchetypeAnalysis {
  primary: ArchetypeResult;
  secondary: ArchetypeResult | null;
  confidence: number;
}

export interface CategoryStatus {
  current: number;
  minimum: number;
  optimal: number;
  maximum: number;
  status: 'lacking' | 'adequate' | 'optimal' | 'excess';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface GapRecommendation {
  category: CardCategory;
  message: string;
  cardsNeeded: number;
}

export interface DeckGapAnalysis {
  categoryBreakdown: Record<CardCategory, CategoryStatus>;
  overallScore: number;
  recommendations: GapRecommendation[];
}

export interface ScoringContext {
  commander: Card | undefined;
  deckCards: DeckCardWithCard[];
  archetype: ArchetypeAnalysis;
  gaps: DeckGapAnalysis;
  stage: DeckStage;
}

export interface DeckCardWithCard {
  id: string;
  deckId: string;
  cardId: string;
  quantity: number;
  cardType: 'mainboard' | 'sideboard' | 'commander';
  card: Card;
}

// Re-export Card type from db schema
export type { Card } from '@tcg-tracker/db/schema';
```

#### 9.3.2 constants.ts

```typescript
// apps/api/src/lib/recommendation/constants.ts

import type { CardCategory, Archetype, DeckStage } from './types';

export const KEYWORD_CATEGORIES: Record<string, string[]> = {
  evasion: ['Flying', 'Trample', 'Menace', 'Unblockable', 'Fear', 'Intimidate', 'Shadow'],
  protection: ['Hexproof', 'Shroud', 'Indestructible', 'Ward', 'Protection'],
  combat: ['First Strike', 'Double Strike', 'Deathtouch', 'Lifelink', 'Vigilance'],
  recursion: ['Undying', 'Persist', 'Encore', 'Escape', 'Embalm', 'Eternalize'],
  manaReduction: ['Affinity', 'Convoke', 'Delve', 'Improvise'],
  cardAdvantage: ['Cycling', 'Flashback', 'Retrace', 'Jump-start'],
  counters: ['Proliferate', 'Modular', 'Graft', 'Evolve'],
};

export const TRIGGER_ENABLER_PAIRS: [RegExp, RegExp, number][] = [
  [/sacrifice/i, /when .* dies/i, 10],
  [/discard/i, /madness|whenever .* discard/i, 10],
  [/create .* token/i, /when .* enters|sacrifice/i, 8],
  [/draw .* card/i, /whenever you draw/i, 8],
  [/\+1\/\+1 counter/i, /proliferate|modular/i, 8],
  [/mill|graveyard/i, /escape|flashback|return .* graveyard/i, 10],
];

export const CATEGORY_PATTERNS: Record<CardCategory, {
  keywords: string[];
  patterns: RegExp[];
  typeMatches: string[];
}> = {
  ramp: {
    keywords: ['Mana', 'Treasure'],
    patterns: [/add \{[WUBRGC]/i, /search .* land/i, /additional land/i],
    typeMatches: [],
  },
  cardDraw: {
    keywords: ['Cycling', 'Flashback'],
    patterns: [/draw .* card/i, /look at .* cards/i],
    typeMatches: [],
  },
  removal: {
    keywords: [],
    patterns: [/destroy target/i, /exile target/i, /return .* to .* hand/i, /-X\/-X/i],
    typeMatches: [],
  },
  boardWipe: {
    keywords: [],
    patterns: [/destroy all/i, /exile all/i, /each creature/i, /all creatures get/i],
    typeMatches: [],
  },
  protection: {
    keywords: ['Hexproof', 'Shroud', 'Indestructible', 'Ward'],
    patterns: [/gain hexproof/i, /protection from/i, /can't be targeted/i],
    typeMatches: [],
  },
  threat: {
    keywords: ['Flying', 'Trample', 'Double Strike'],
    patterns: [/win the game/i, /opponents? lose/i],
    typeMatches: ['Creature', 'Planeswalker'],
  },
  tutor: {
    keywords: [],
    patterns: [/search your library for/i],
    typeMatches: [],
  },
  recursion: {
    keywords: ['Undying', 'Persist', 'Encore', 'Escape'],
    patterns: [/return .* from .* graveyard/i, /put .* from .* graveyard/i],
    typeMatches: [],
  },
  other: {
    keywords: [],
    patterns: [],
    typeMatches: [],
  },
};

export const CATEGORY_TARGETS: Record<CardCategory, { min: number; opt: number; max: number }> = {
  ramp:       { min: 8,  opt: 10, max: 15 },
  cardDraw:   { min: 5,  opt: 10, max: 12 },
  removal:    { min: 8,  opt: 10, max: 12 },
  boardWipe:  { min: 2,  opt: 4,  max: 5 },
  protection: { min: 2,  opt: 4,  max: 6 },
  threat:     { min: 10, opt: 15, max: 25 },
  tutor:      { min: 0,  opt: 3,  max: 8 },
  recursion:  { min: 2,  opt: 5,  max: 8 },
  other:      { min: 0,  opt: 0,  max: 99 },
};

export const STAGE_THRESHOLDS: Record<DeckStage, { min: number; max: number }> = {
  early:    { min: 0,  max: 29 },
  mid:      { min: 30, max: 59 },
  late:     { min: 60, max: 89 },
  final:    { min: 90, max: 98 },
  complete: { min: 99, max: 100 },
};

export const STAGE_WEIGHTS: Record<DeckStage, Record<string, number>> = {
  early: {
    commanderSynergy: 1.5,
    mechanical: 1.2,
    strategic: 0.8,
    mana: 1.0,
    theme: 1.3,
    gapFilling: 0.5,
  },
  mid: {
    commanderSynergy: 1.2,
    mechanical: 1.0,
    strategic: 1.0,
    mana: 1.0,
    theme: 1.0,
    gapFilling: 1.2,
  },
  late: {
    commanderSynergy: 0.8,
    mechanical: 0.8,
    strategic: 1.2,
    mana: 1.2,
    theme: 0.8,
    gapFilling: 1.5,
  },
  final: {
    commanderSynergy: 0.5,
    mechanical: 0.6,
    strategic: 1.0,
    mana: 1.5,
    theme: 0.5,
    gapFilling: 2.0,
  },
  complete: {
    commanderSynergy: 1.0,
    mechanical: 1.0,
    strategic: 1.0,
    mana: 1.0,
    theme: 1.0,
    gapFilling: 0.5,
  },
};
```

#### 9.3.3 index.ts (public exports)

```typescript
// apps/api/src/lib/recommendation/index.ts

export * from './types';
export * from './constants';

export { SynergyScorer } from './synergy-scorer';
export { ArchetypeDetector } from './archetype-detector';
export { GapAnalyzer } from './gap-analyzer';
export { KeywordCategorizer } from './keyword-categorizer';
export { CardPatterns } from './card-patterns';
export { StageDetector, determineDeckStage } from './stage-detector';
export { RecommendCache } from './cache';
```

---

## 10. Appendices

### 10.1 Keyword Reference

Complete list of tracked keywords and their categories:

| Category | Keywords |
|----------|----------|
| **Evasion** | Flying, Trample, Menace, Unblockable, Fear, Intimidate, Shadow, Landwalk variants |
| **Protection** | Hexproof, Shroud, Indestructible, Ward, Protection from X, Persist, Regenerate |
| **Combat** | First Strike, Double Strike, Deathtouch, Lifelink, Vigilance, Haste, Reach |
| **Recursion** | Undying, Persist, Encore, Escape, Embalm, Eternalize, Unearth |
| **Mana Reduction** | Affinity, Convoke, Delve, Improvise, Emerge, Assist |
| **Card Advantage** | Cycling, Flashback, Retrace, Jump-start, Overload, Kicker, Entwine |
| **Counters** | Proliferate, Modular, Graft, Evolve, Mentor, Training |
| **Tokens** | Convoke, Fabricate, Afterlife, Amass, Incubate |

### 10.2 Archetype Staples Reference

Pre-defined "staple" cards for each archetype (used for pattern matching):

| Archetype | Example Staples |
|-----------|-----------------|
| **Aggro** | Lightning Bolt, Goblin Guide, Monastery Swiftspear |
| **Control** | Counterspell, Wrath of God, Teferi |
| **Combo** | Thassa's Oracle, Demonic Consultation, Splinter Twin |
| **Tribal (Zombies)** | Gravecrawler, Rooftop Storm, Endless Ranks |
| **Aristocrats** | Blood Artist, Viscera Seer, Pitiless Plunderer |
| **Voltron** | Swiftfoot Boots, Sword of Feast and Famine, Colossus Hammer |

### 10.3 Performance Benchmarks

Expected performance under various conditions:

| Scenario | Cards in Deck | Candidates | Expected Latency |
|----------|---------------|------------|------------------|
| Empty deck | 1 (commander) | 500 | <800ms |
| Early deck | 30 | 400 | <1000ms |
| Mid deck | 60 | 300 | <1200ms |
| Late deck | 90 | 200 | <1000ms |
| Collection-filtered | Any | 50-200 | <600ms |

### 10.4 References

1. **MTG Deckbuilding Research**: `outputs/orc/2026/02/07/122148-4f3cc411/mtg-deckbuilding-research/summary.md`
2. **Codebase Analysis**: `outputs/orc/2026/02/07/122148-4f3cc411/codebase-analysis/summary.md`
3. **Product Scope**: `outputs/orc/2026/02/07/122148-4f3cc411/product-scope/summary.md`
4. **8x8 Theory**: https://the8x8theory.tumblr.com/what-is-the-8x8-theory
5. **EDHREC Ramp Guide**: https://edhrec.com/guides/the-edhrec-guide-to-ramp-in-commander

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-07 | Engineering Team | Initial technical design |

---

*This document provides the complete technical specification for implementing the MTG Deck Recommendation System. Engineers should be able to begin implementation immediately using this document as the primary reference.*
