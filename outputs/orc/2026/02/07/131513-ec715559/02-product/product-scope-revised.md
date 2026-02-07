# MTG Deck Recommendation System - Product Scope (Revised)

**Document Version**: 2.0
**Date**: 2026-02-07
**Status**: Draft for Engineering Review
**Revision Note**: Updated to reflect multi-format, collection-first approach

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Core Features](#2-core-features)
3. [User Stories](#3-user-stories)
4. [Success Metrics](#4-success-metrics)
5. [Out of Scope (v1)](#5-out-of-scope-v1)
6. [Technical Constraints](#6-technical-constraints)
7. [Data Requirements](#7-data-requirements)
8. [Implementation Recommendations](#8-implementation-recommendations)

---

## 1. Product Vision

### Problem Statement

MTG players face a significant challenge when building competitive decks from their existing card collections:

1. **The Collection Utilization Problem**: Players accumulate cards over time but struggle to identify which combinations create the most competitive, synergistic decks across different formats.

2. **Format Complexity**: Different formats (Standard, Modern, Commander, Brawl) have unique rules, deck size requirements, and card pools - making it difficult to build optimally for each.

3. **Synergy Discovery**: Finding cards that work well together requires extensive knowledge of Magic's 30+ year card pool with over 25,000 unique cards - and players may not know what synergies exist within their OWN collections.

4. **Competitive Gap**: Players want to compete with friends using cards they already own, but lack tools to build the best possible decks from their existing cards.

5. **Progressive Opportunity**: As collections grow through trades, drafts, and purchases, deck possibilities expand - but players miss opportunities because they don't re-evaluate deck options.

### Target Users

**Primary**: MTG players (casual to competitive) who want to maximize deck quality from their existing card collections.

**Segments**:
- **Competitive Casuals**: Want to beat friends at kitchen table without buying expensive singles
- **Collection Maximizers**: Own many cards but don't know what competitive decks they can build
- **Multi-Format Players**: Play Standard one week, Commander the next, Modern at FNM
- **Budget Players**: Prefer building from owned cards rather than buying new
- **Deck Brewers**: Want to discover non-obvious synergies within their collection

### Vision Statement

> Build the best possible decks from the cards you already own. Compete with friends across Standard, Modern, Commander, and Brawl formats without buying new cards - and watch your deck options automatically improve as your collection grows.

### Why This Matters

- **Collection Value**: Help players realize the competitive potential already sitting in their collection
- **Format Flexibility**: Same collection, multiple competitive decks across different formats
- **Progressive Improvement**: Every new card added to collection = new deck possibilities discovered
- **Competitive Without Cost**: Beat friends without opening your wallet
- **Reduced Decision Paralysis**: Know exactly what decks you CAN build, not just what you WISH you could build

---

## 2. Core Features

### 2.1 Multi-Format Deck Recommendations

**Description**: Generate format-specific deck recommendations from user's existing card collection for Standard (60-card), Modern, Commander, and Brawl.

**Functionality**:
- Input: User's card collection + target format
- Output: Ranked list of viable decks buildable from owned cards
- Filtering: By format legality, archetype preference, color restriction

**Format-Specific Logic**:
| Format | Deck Size | Key Constraints | Recommendation Focus |
|--------|-----------|-----------------|---------------------|
| **Standard** | 60 cards | 4-copy limit, recent sets only | Meta-viable archetypes |
| **Modern** | 60 cards | 4-copy limit, larger card pool | Established strategies |
| **Commander** | 99 + commander | Singleton, color identity | Commander synergy |
| **Brawl** | 59 + commander | Singleton, Standard-legal | Commander + Standard pool |

**Example**:
```
Collection: 1,847 cards across sets
Format: Modern

Buildable Decks:
1. Burn (87% complete) - Missing: 2x Eidolon of the Great Revel
2. Azorius Control (72% complete) - Core pieces owned
3. Elves (94% complete) - Fully playable tribal deck
```

### 2.2 Collection-Constrained Deck Building

**Description**: Primary mode of operation - ONLY suggest cards the user already owns. The collection filter is the DEFAULT, not an optional toggle.

**Functionality**:
- Default behavior: Show only owned cards in recommendations
- Secondary toggle: "Show cards I don't own" (for wishlisting)
- Visual distinction: Owned vs. unowned cards clearly marked

**Key Difference from v1.0**:
- Previous: "Cards I Own" was a filter option
- Revised: Collection-constrained is the PRIMARY experience

**Workflow**:
```
1. User opens deck builder
2. Selects format (Standard/Modern/Commander/Brawl)
3. System analyzes collection for that format's legality
4. Shows ONLY buildable options from owned cards
5. Optional: Show "upgrade paths" with unowned cards
```

### 2.3 Multi-Format Deck Suggestions

**Description**: From a single collection, surface which decks are viable across different formats simultaneously.

**Functionality**:
- Cross-format analysis: "Your collection can build these decks"
- Format-specific viability scoring
- Shared staples identification

**Example Output**:
```
Your Collection Can Build:

STANDARD (3 decks):
- Mono-Red Aggro (100% complete)
- Azorius Tempo (78% complete)
- Gruul Midrange (65% complete)

MODERN (5 decks):
- Burn (87% complete)
- Elves (94% complete)
- Mono-Green Tron (45% complete)
- Death's Shadow (52% complete)
- Affinity (71% complete)

COMMANDER (12+ decks):
- [[Wilhelt]] Zombies (89% synergy)
- [[Yawgmoth]] Aristocrats (82% synergy)
- ...
```

### 2.4 Format-Agnostic Synergy Scoring

**Description**: Calculate synergy scores that work across all supported formats, adapting weights based on format context.

**Synergy Score Components**:
1. **Mechanical Synergy** (0-40 points)
   - Shared keywords
   - Trigger/enabler relationships
   - Combo potential

2. **Strategic Synergy** (0-30 points)
   - Same archetype support
   - Role complementarity (threat + protection)
   - Win condition alignment

3. **Format Context** (0-20 points)
   - Format-legal pairing bonus
   - Meta-relevance in format
   - Copy-limit optimization (4x in 60-card vs singleton)

4. **Mana Synergy** (0-10 points)
   - Color consistency
   - CMC curve fit
   - Ramp synergy

**Format Adaptation**:
- 60-card formats: Weight 4-of consistency, meta positioning
- Commander: Weight uniqueness, political value, 100-card singleton
- Brawl: Hybrid of both approaches

### 2.5 Progressive Deck Improvement

**Description**: As users add cards to their collection (through scanning, manual entry, or imports), automatically re-evaluate and surface new deck possibilities.

**Functionality**:
- Background collection monitoring
- Notification: "New card unlocks improved deck options"
- Before/after comparison of deck viability

**Trigger Events**:
1. Card scanned and added to collection
2. Bulk import completed
3. Trade logged (cards acquired)
4. Manual collection update

**Example Notification**:
```
New Card Added: "Ragavan, Nimble Pilferer"

This unlocks:
- Modern Rakdos Scam: 45% -> 78% complete
- Modern Jund: 52% -> 67% complete
- Commander [[Prossh]] upgrade: +15% synergy
```

### 2.6 Deck Composition Analysis (All Formats)

**Description**: Analyze deck composition against format-appropriate guidelines.

**60-Card Formats Analysis**:
| Category | Typical Count | Your Deck | Suggestion |
|----------|--------------|-----------|------------|
| Lands | 20-24 | 22 | Optimal |
| Creatures | 15-25 | 18 | Adequate |
| Removal | 6-10 | 4 | Add 2-4 more |
| Card Draw | 4-8 | 6 | Adequate |

**Commander Analysis (8x8 Theory)**:
| Category | Target | Current | Status |
|----------|--------|---------|--------|
| Ramp | 10-12 | 8 | Need 2-4 more |
| Draw | 8-10 | 10 | Optimal |
| Removal | 8-10 | 6 | Need 2-4 more |
| ... | ... | ... | ... |

---

## 3. User Stories

### 3.1 Collection-First Deck Discovery

**As a** player with an established collection,
**I want** to see what competitive decks I can build from cards I already own,
**So that** I can compete with friends without buying new cards.

**Acceptance Criteria**:
- [ ] Select format (Standard/Modern/Commander/Brawl)
- [ ] See list of buildable decks ranked by completeness
- [ ] Each deck shows synergy score and what archetype it represents
- [ ] No cards shown that I don't own (default mode)
- [ ] Can build directly into deck from recommendation

### 3.2 Multi-Format Collection Utilization

**As a** player who plays multiple formats,
**I want** to see how my collection supports different formats simultaneously,
**So that** I can maximize value from my cards across all the formats I play.

**Acceptance Criteria**:
- [ ] Dashboard shows deck options per format
- [ ] See which cards appear in multiple format decks
- [ ] Identify "multi-format staples" I should prioritize protecting
- [ ] Compare collection coverage across formats

### 3.3 60-Card Constructed Deck Building

**As a** Standard or Modern player,
**I want** recommendations for 60-card competitive decks from my collection,
**So that** I can build meta-relevant decks for FNM or casual play.

**Acceptance Criteria**:
- [ ] Recommendations respect 4-copy limit
- [ ] Format legality strictly enforced
- [ ] See established archetypes I can build toward
- [ ] Mana base analysis for 2+ color decks
- [ ] Sideboard suggestions from owned cards

### 3.4 Commander Deck Building (Collection-First)

**As a** Commander player,
**I want** to build decks starting from commanders I own with synergistic cards I own,
**So that** I can create cohesive decks without external purchases.

**Acceptance Criteria**:
- [ ] Filter commanders to only those I own
- [ ] All 99 recommendations from my collection
- [ ] Synergy scores based on owned card pool
- [ ] Show what % of "optimal" deck I can build

### 3.5 Brawl Deck Building

**As a** Arena player who also owns physical cards,
**I want** Brawl deck recommendations from my Standard-legal collection,
**So that** I can play the same deck digitally and in paper.

**Acceptance Criteria**:
- [ ] Filter to Standard-legal cards only
- [ ] 59-card singleton + commander structure
- [ ] Brawl-specific recommendations (Standard power level)
- [ ] Cross-reference with Arena collection (future)

### 3.6 Progressive Collection Growth

**As a** player who regularly adds cards,
**I want** to be notified when new cards improve my deck options,
**So that** I never miss an opportunity to upgrade existing decks.

**Acceptance Criteria**:
- [ ] Notification after card additions
- [ ] Show which decks improved and by how much
- [ ] Highlight "threshold cards" - one card unlocking new archetypes
- [ ] Weekly digest of collection growth impact

### 3.7 Competitive Play Without Purchases

**As a** budget-conscious competitive player,
**I want** to know the BEST deck I can build right now from owned cards,
**So that** I can show up to events with optimal builds.

**Acceptance Criteria**:
- [ ] "Best deck I can build" button per format
- [ ] Competitive viability score (vs meta)
- [ ] No "buy these cards" upselling in primary flow
- [ ] Export to MTG Goldfish / Moxfield format

### 3.8 Deck Gap Analysis (With Purchase Intent)

**As a** player willing to make targeted purchases,
**I want** to see what specific cards would most improve my decks,
**So that** I can make strategic purchases with maximum impact.

**Acceptance Criteria**:
- [ ] Separate "upgrade" section (not default view)
- [ ] Show impact score per missing card
- [ ] Prioritize cards that improve multiple decks
- [ ] Link to TCGPlayer/CardKingdom for pricing (optional)

---

## 4. Success Metrics

### 4.1 Engagement Metrics

| Metric | Definition | Target (v1) |
|--------|------------|-------------|
| **Recommendation Adoption Rate** | % of recommendations added to decks | >15% |
| **Recommendation View Rate** | % of deck sessions where recommendations are viewed | >60% |
| **Deck Completion Rate** | % of decks reaching legal size after using recommendations | +20% over baseline |
| **Multi-Format Usage** | % of users building decks in 2+ formats | >30% |

### 4.2 Collection Utilization Metrics

| Metric | Definition | Target (v1) |
|--------|------------|-------------|
| **Collection Coverage Rate** | % of user's collection appearing in recommended decks | >25% |
| **Dormant Card Activation** | Cards unused for 90+ days now in decks | +15% |
| **Cross-Format Card Usage** | % of cards appearing in 2+ format decks | Track baseline |
| **Collection Growth to Deck Impact** | New cards -> improved deck scores | >50% of additions |

### 4.3 Competitive Metrics

| Metric | Definition | Target (v1) |
|--------|------------|-------------|
| **Zero-Purchase Deck Builds** | Decks built entirely from owned cards | >80% of decks |
| **Deck Competitiveness Score** | User rating of deck performance vs friends | >3.5/5 avg |
| **Event-Ready Builds** | Decks exported for tournament use | Track adoption |
| **Win Rate Improvement** | Self-reported win rate before/after | Track correlation |

### 4.4 Quality Metrics

| Metric | Definition | Target (v1) |
|--------|------------|-------------|
| **Synergy Score Accuracy** | User-validated synergy ratings (thumbs up/down) | >75% positive |
| **Archetype Detection Accuracy** | User confirmation of detected archetypes | >80% accurate |
| **Format Legality Accuracy** | Decks pass legality check | 100% |

### 4.5 Technical Metrics

| Metric | Definition | Target (v1) |
|--------|------------|-------------|
| **Recommendation Latency** | Time to generate recommendations | <2 seconds |
| **API Success Rate** | % of recommendation requests completing successfully | >99% |
| **Collection Sync Time** | Time to re-analyze after card addition | <500ms |

---

## 5. Out of Scope (v1)

### Explicitly Not Building

| Feature | Reason | Future Version |
|---------|--------|----------------|
| **Machine Learning Recommendations** | Complexity; start with heuristic approach | v2 |
| **Price-Based Recommendations** | Requires real-time price feeds | v2 |
| **Legacy/Vintage/Pauper Formats** | Focus on Standard/Modern/Commander/Brawl first | v2 |
| **Deck Similarity Search** | "Find decks like mine" requires significant data | v2 |
| **Meta-Game Analysis** | Competitive tier rankings, tournament data | v3 |
| **Social Recommendations** | "Players like you also added..." | v3 |
| **Auto-Deck Generation** | Fully automated deck building | v3 |
| **Card Substitution Suggestions** | Budget alternatives for specific cards | v2 |
| **Mulligan Analysis** | Starting hand simulation | v3 |
| **Playtest Integration** | Goldfish testing with recommendations | v3 |
| **Arena Collection Sync** | MTG Arena integration | v2 |

### Format Support Clarification

**v1 Supports**:
- Standard (60-card, 4-of, rotation-aware)
- Modern (60-card, 4-of, full Modern pool)
- Commander/EDH (99+1, singleton, color identity)
- Brawl (59+1, singleton, Standard-legal)

**v2 Candidates**:
- Pioneer
- Legacy
- Pauper
- Historic (Arena)

**v3+ Candidates**:
- Vintage
- Canadian Highlander
- Oathbreaker

### Why This Scope

1. **Collection-First Focus**: v1 proves value of building from owned cards
2. **Format Breadth over Depth**: Supporting 4 formats serves more users than perfect Commander-only
3. **Competitive Casual**: Target "kitchen table competitive" before tournament meta
4. **Progressive Foundation**: Build infrastructure that scales to more formats

---

## 6. Technical Constraints

### 6.1 Existing Infrastructure (Use As-Is)

| Component | Status | Recommendation System Usage |
|-----------|--------|---------------------------|
| **PostgreSQL + Drizzle ORM** | Production | Store synergy scores, archetype tags |
| **tRPC API** | Production | New recommendation endpoints |
| **Scryfall Integration** | Production | Card data source (legality per format) |
| **GIN Indexes on Arrays** | Production | Efficient keyword/type queries |
| **JSONB game_data** | Production | Store computed synergy data, legalities |

### 6.2 Format-Specific Data Requirements

**Legality Data** (from Scryfall):
- `game_data.legalities.standard`
- `game_data.legalities.modern`
- `game_data.legalities.commander`
- `game_data.legalities.brawl`

**Copy Limits**:
| Format | Limit | Exception |
|--------|-------|-----------|
| Standard | 4 | Basic lands |
| Modern | 4 | Basic lands |
| Commander | 1 | Basic lands, Relentless Rats-type |
| Brawl | 1 | Basic lands |

### 6.3 Schema Extension Requirements

**Minimal Schema Changes Needed**:

```sql
-- Pre-computed synergy scores table
CREATE TABLE card_synergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id),
  related_card_id UUID REFERENCES cards(id),
  synergy_score DECIMAL(5,2),
  synergy_reasons JSONB,
  format_context TEXT, -- 'standard', 'modern', 'commander', 'brawl', 'all'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(card_id, related_card_id, format_context)
);

-- Deck archetype tags
ALTER TABLE decks ADD COLUMN archetype_tags TEXT[];
ALTER TABLE decks ADD COLUMN archetype_confidence JSONB;
ALTER TABLE decks ADD COLUMN format TEXT; -- 'standard', 'modern', 'commander', 'brawl'

-- Collection format coverage cache
CREATE TABLE collection_format_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id),
  format TEXT NOT NULL,
  viable_archetypes JSONB, -- [{archetype, completeness%, key_cards}]
  last_computed TIMESTAMP DEFAULT NOW(),
  UNIQUE(collection_id, format)
);
```

---

## 7. Data Requirements

### 7.1 Format-Specific Archetype Definitions

**Standard Archetypes** (meta-dependent, example):
- Mono-Red Aggro
- Azorius Control
- Esper Midrange
- Domain Ramp

**Modern Archetypes**:
- Burn, Tron, Jund, Death's Shadow
- Amulet Titan, Murktide, Hammer Time
- Elves, Merfolk, Goblins (tribal)
- Living End, Creativity, Scapeshift (combo)

**Commander Archetypes**:
- Aggro, Control, Midrange, Combo
- Tribal, Voltron, Aristocrats, Spellslinger
- Reanimator, Stax, Group Hug, Chaos

**Brawl Archetypes**:
- Aggro, Control, Midrange
- Tribal (limited pool)
- Value engines

### 7.2 Copy Limit Logic

```typescript
interface CopyLimitRule {
  format: 'standard' | 'modern' | 'commander' | 'brawl';
  defaultLimit: number;
  exceptions: {
    cardName: string;
    limit: number;
    condition?: string;
  }[];
}

const COPY_LIMITS: CopyLimitRule[] = [
  {
    format: 'standard',
    defaultLimit: 4,
    exceptions: [
      { cardName: 'Plains', limit: Infinity },
      { cardName: 'Island', limit: Infinity },
      // ... basic lands
    ]
  },
  {
    format: 'commander',
    defaultLimit: 1,
    exceptions: [
      { cardName: 'Relentless Rats', limit: Infinity },
      { cardName: 'Shadowborn Apostle', limit: Infinity },
      // ... basic lands
    ]
  }
];
```

---

## 8. Implementation Recommendations

### 8.1 Phased Rollout

**Phase 1: Collection Analysis (Week 1-2)**
- Format legality detection for all cards in collection
- Collection coverage analysis per format
- Basic "what can I build" query

**Phase 2: Multi-Format Recommendations (Week 3-4)**
- 60-card format archetype matching
- Commander synergy (existing logic adaptation)
- Brawl as Commander variant
- Synergy scoring across formats

**Phase 3: Progressive Features (Week 5-6)**
- Collection change detection
- Deck improvement notifications
- Cross-format card utilization tracking
- Collection growth impact analysis

**Phase 4: Frontend (Week 7-8)**
- Format selector in deck builder
- "Build from collection" primary flow
- Multi-format dashboard
- Progressive improvement notifications

### 8.2 API Endpoint Design

```typescript
// Collection analysis
collections.getFormatCoverage(collectionId, format) -> FormatCoverage
collections.getAllFormatCoverage(collectionId) -> Record<Format, FormatCoverage>

// Deck recommendations
decks.getSuggestions(deckId, options) -> CardSuggestion[]
decks.getBuildableDecks(collectionId, format) -> BuildableDeck[]
decks.getArchetype(deckId) -> ArchetypeAnalysis
decks.getGaps(deckId) -> CategoryGaps

// Card synergies
cards.getSynergies(cardId, format, options) -> SynergyResult[]
cards.getSynergyScore(cardId, targetCardId, format) -> SynergyScore

// Progressive updates
collections.getRecentImpact(collectionId, since) -> CollectionImpact[]
```

### 8.3 Collection-First Default

**Critical Implementation Detail**:

The UI MUST default to collection-constrained mode:

```typescript
interface RecommendationOptions {
  collectionOnly: boolean; // DEFAULT: true
  format: 'standard' | 'modern' | 'commander' | 'brawl';
  showUpgrades?: boolean; // DEFAULT: false
}
```

Users opt-IN to seeing cards they don't own, not opt-OUT.

---

## Appendix A: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-07 | Product Team | Initial draft (Commander-focused) |
| 2.0 | 2026-02-07 | Product Team | Revised for multi-format, collection-first approach |

### Key Changes in v2.0

1. **Multi-Format from v1**: Added Standard, Modern, and Brawl alongside Commander
2. **Collection-First Default**: "Cards I Own" is now the PRIMARY filter, not secondary
3. **Competitive Focus**: Emphasis on competing with friends without purchases
4. **Progressive Improvement**: Collection growth automatically surfaces new deck options
5. **Success Metrics**: Added collection utilization and competitive metrics
6. **Removed from Out-of-Scope**: Multi-format support (now in-scope for v1)
7. **Added to Out-of-Scope**: Legacy, Vintage, Pauper, and other niche formats

---

*This document should be reviewed by Engineering leads before implementation begins.*
