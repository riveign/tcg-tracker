# MTG Deck Recommendation System - Product Scope

**Document Version**: 1.0
**Date**: 2026-02-07
**Status**: Draft for Engineering Review

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

Commander/EDH players face a significant challenge when building decks:

1. **The 99-Card Problem**: Commander decks require 99 unique cards (plus commander), making deck construction overwhelming for new and experienced players alike.

2. **Synergy Discovery**: Finding cards that work well together requires extensive knowledge of Magic's 30+ year card pool with over 25,000 unique cards.

3. **Collection Constraints**: Players want recommendations from cards they already own, not just "optimal" choices they don't have.

4. **Progressive Building**: As decks evolve during construction, the best card choices change - what's optimal at 50 cards differs from what's optimal at 90 cards.

### Target Users

**Primary**: Commander/EDH players who use TCG Tracker to manage their collections and build decks.

**Segments**:
- **New Players**: Need guidance on what cards work with their commander
- **Casual Players**: Want to improve existing decks without extensive research
- **Budget Players**: Need suggestions from cards they already own
- **Deck Brewers**: Want to discover non-obvious synergies and build around specific themes

### Vision Statement

> Enable Commander players to build cohesive, synergistic decks efficiently by providing intelligent card recommendations that evolve with their deck composition, respect their collection constraints, and explain WHY cards work together - not just WHAT to add.

### Why This Matters

- **Time Savings**: Reduce deck building from hours to minutes
- **Discovery**: Help players find cards they didn't know they owned
- **Education**: Teach deckbuilding theory through contextual recommendations
- **Engagement**: Keep users in TCG Tracker instead of external recommendation tools

---

## 2. Core Features

### 2.1 Commander-Based Deck Recommendations

**Description**: Given a commander card, suggest cards that synergize with that commander's abilities, colors, and themes.

**Functionality**:
- Input: Commander card (from deck with `card_type = 'commander'`)
- Output: Ranked list of recommended cards with synergy explanations
- Filtering: By collection ownership, budget, format legality

**Synergy Factors**:
| Factor | Weight | Example |
|--------|--------|---------|
| Keyword match | High | Commander has "Sacrifice" trigger + cards with "When this creature dies" |
| Tribal synergy | High | Elf commander + Elf creature type cards |
| Color identity | Required | Must match commander's color identity |
| Theme alignment | Medium | +1/+1 counter commander + proliferate cards |
| CMC distribution | Low | Balance curve based on commander's CMC |

**Example**:
```
Commander: "Wilhelt, the Rotcleaver" (Zombie tribal, sacrifice theme)

Recommendations:
1. Gravecrawler - "Zombie with recursion, enables sacrifice loops" (Synergy: 95%)
2. Undead Augur - "Card draw when zombies die" (Synergy: 90%)
3. Rooftop Storm - "Free zombie casting in zombie tribal" (Synergy: 88%)
```

### 2.2 Deck Composition Analysis

**Description**: Analyze current deck composition and suggest cards to fill gaps or strengthen themes.

**Functionality**:
- Input: Existing deck (any stage of completion)
- Output:
  - Identified deck archetype(s)
  - Category analysis (ramp, draw, removal, threats)
  - Gap identification with card suggestions

**Analysis Based on 8x8 Theory**:
| Category | Target Count | Status | Suggestion |
|----------|--------------|--------|------------|
| Ramp | 10-12 | 6 found | Need 4-6 more ramp cards |
| Card Draw | 8-10 | 3 found | Need 5-7 more draw cards |
| Removal | 8-10 | 10 found | Adequate |
| Board Wipes | 3-4 | 0 found | Need 3-4 board wipes |

### 2.3 Card Synergy Scoring

**Description**: Calculate and display synergy scores between any two cards or between a card and an existing deck.

**Synergy Score Components**:
1. **Mechanical Synergy** (0-40 points)
   - Shared keywords
   - Trigger/enabler relationships
   - Combo potential

2. **Strategic Synergy** (0-30 points)
   - Same archetype support
   - Role complementarity (threat + protection)
   - Win condition alignment

3. **Mana Synergy** (0-20 points)
   - Color consistency
   - CMC curve fit
   - Ramp synergy

4. **Theme Synergy** (0-10 points)
   - Tribal matches
   - Flavor alignment
   - Set synergies

**Display**:
```
Card: "Phyrexian Arena"
Synergy with Deck: 78%
- Draws cards (fills Card Draw gap): +25
- Black color identity (matches deck): +20
- CMC 3 (fills curve gap): +15
- Life loss synergy with lifegain theme: +18
```

### 2.4 Deck Archetype Identification

**Description**: Automatically classify decks into recognized MTG archetypes.

**Primary Archetypes**:
| Archetype | Detection Signals |
|-----------|-------------------|
| **Aggro** | Low CMC average (<3.0), high creature count, haste/first strike keywords |
| **Control** | High removal count, counterspells, board wipes, high CMC finishers |
| **Midrange** | Balanced curve, efficient creatures, flexible removal |
| **Combo** | Tutor density, specific card pairings, infinite combo pieces |
| **Tribal** | 20+ creatures sharing a type, tribal support cards |
| **Voltron** | Equipment/Auras, commander protection, power boosters |
| **Aristocrats** | Sacrifice outlets, death triggers, token generation |
| **Spellslinger** | High instant/sorcery count, spell copying, storm |
| **Reanimator** | Graveyard synergies, discard outlets, resurrection effects |

**Output**:
```
Deck: "Zombie Horde"
Primary Archetype: Tribal (Zombies) - 85% confidence
Secondary Archetype: Aristocrats - 65% confidence
Tertiary: Aggro - 45% confidence
```

### 2.5 Progressive Recommendations

**Description**: Adapt recommendations as deck evolves during construction.

**Stages**:
1. **Early Stage (0-30 cards)**: Focus on core strategy, commander synergy
2. **Mid Stage (30-60 cards)**: Balance categories, fill archetype needs
3. **Late Stage (60-90 cards)**: Optimize curve, add utility, shore up weaknesses
4. **Final Stage (90-99 cards)**: Fine-tune, land count, final cuts

**Behavior**:
- Recommendations change weight as deck fills
- Early: "What defines this deck's strategy?"
- Late: "What's missing for consistency?"
- Final: "What should be cut?"

---

## 3. User Stories

### 3.1 New Deck Creation

**As a** Commander player starting a new deck,
**I want** to see card recommendations based on my chosen commander,
**So that** I can quickly build a foundation for my deck.

**Acceptance Criteria**:
- [ ] Enter deck builder with commander selected
- [ ] See top 20 recommended cards immediately
- [ ] Each recommendation shows synergy score and explanation
- [ ] Can filter by "Cards I Own" toggle
- [ ] Can add recommended cards directly to deck

### 3.2 Deck Gap Analysis

**As a** player with a partially built deck,
**I want** to understand what my deck is missing,
**So that** I can make targeted improvements.

**Acceptance Criteria**:
- [ ] View deck analysis showing category breakdown
- [ ] See comparison to 8x8 theory targets
- [ ] Get specific card suggestions for each gap
- [ ] Suggestions prioritize cards from my collection

### 3.3 Card Synergy Discovery

**As a** deck brewer,
**I want** to see what cards synergize with a specific card I'm considering,
**So that** I can make informed additions to my deck.

**Acceptance Criteria**:
- [ ] Hover/click any card to see synergy panel
- [ ] Synergy panel shows top 10 related cards
- [ ] Can filter synergies by collection ownership
- [ ] Synergy explanations are human-readable

### 3.4 Collection-Constrained Building

**As a** budget player,
**I want** recommendations limited to cards I already own,
**So that** I can build decks without buying new cards.

**Acceptance Criteria**:
- [ ] "Collection Only" toggle in recommendation panel
- [ ] When enabled, only shows cards from user's collections
- [ ] Deck respects `collection_only` flag in database
- [ ] Can still see "optimal" recommendations with purchase indicators

### 3.5 Archetype Exploration

**As a** player exploring strategies,
**I want** to see what archetype my deck is becoming,
**So that** I can lean into or pivot away from that strategy.

**Acceptance Criteria**:
- [ ] Deck analysis shows detected archetype(s)
- [ ] Can click archetype to see "staples" for that strategy
- [ ] Archetype-specific recommendations available
- [ ] Can compare deck to archetype "template"

### 3.6 Progressive Deck Refinement

**As a** player iterating on a deck,
**I want** recommendations that evolve as my deck changes,
**So that** suggestions remain relevant at every stage.

**Acceptance Criteria**:
- [ ] Recommendations update after each card addition/removal
- [ ] UI indicates current deck stage (early/mid/late/final)
- [ ] Late-stage recommendations focus on optimization
- [ ] Can see "cut suggestions" for over-99-card decks

---

## 4. Success Metrics

### 4.1 Engagement Metrics

| Metric | Definition | Target (v1) |
|--------|------------|-------------|
| **Recommendation Adoption Rate** | % of recommendations added to decks | >15% |
| **Recommendation View Rate** | % of deck sessions where recommendations are viewed | >60% |
| **Deck Completion Rate** | % of decks reaching 99+ cards after using recommendations | +20% over baseline |
| **Time to First Deck** | Time from account creation to first completed deck | -30% |

### 4.2 Quality Metrics

| Metric | Definition | Target (v1) |
|--------|------------|-------------|
| **Synergy Score Accuracy** | User-validated synergy ratings (thumbs up/down) | >75% positive |
| **Archetype Detection Accuracy** | User confirmation of detected archetypes | >80% accurate |
| **Gap Analysis Relevance** | Users finding gap suggestions helpful | >70% helpful |

### 4.3 Business Metrics

| Metric | Definition | Target (v1) |
|--------|------------|-------------|
| **Feature Usage** | % of active users using recommendation features | >40% |
| **Retention Impact** | 30-day retention for users who use recommendations vs. don't | +15% |
| **Deck Builder Sessions** | Avg. time spent in deck builder with recommendations | +25% |

### 4.4 Technical Metrics

| Metric | Definition | Target (v1) |
|--------|------------|-------------|
| **Recommendation Latency** | Time to generate recommendations | <2 seconds |
| **API Success Rate** | % of recommendation requests completing successfully | >99% |
| **Synergy Calculation Time** | Time to score synergy between two cards | <100ms |

---

## 5. Out of Scope (v1)

### Explicitly Not Building

| Feature | Reason | Future Version |
|---------|--------|----------------|
| **Machine Learning Recommendations** | Complexity; start with heuristic approach | v2 |
| **Price-Based Recommendations** | Requires real-time price feeds | v2 |
| **Multi-Format Support** | Focus on Commander first | v2 |
| **Deck Similarity Search** | "Find decks like mine" requires significant data | v2 |
| **Meta-Game Analysis** | Competitive tier rankings, tournament data | v3 |
| **Social Recommendations** | "Players like you also added..." | v3 |
| **Auto-Deck Generation** | Fully automated deck building | v3 |
| **Card Substitution Suggestions** | Budget alternatives for specific cards | v2 |
| **Mulligan Analysis** | Starting hand simulation | v3 |
| **Playtest Integration** | Goldfish testing with recommendations | v3 |

### Why These Are Deferred

1. **Focus on Core Value**: v1 proves the recommendation concept works
2. **Data Requirements**: ML/social features need usage data we don't have yet
3. **Complexity Management**: Heuristic-based recommendations are explainable and tunable
4. **Format Complexity**: Commander has the clearest recommendation use case

---

## 6. Technical Constraints

### 6.1 Existing Infrastructure (Use As-Is)

| Component | Status | Recommendation System Usage |
|-----------|--------|---------------------------|
| **PostgreSQL + Drizzle ORM** | Production | Store synergy scores, archetype tags |
| **tRPC API** | Production | New recommendation endpoints |
| **Scryfall Integration** | Production | Card data source (no changes) |
| **GIN Indexes on Arrays** | Production | Efficient keyword/type queries |
| **JSONB game_data** | Production | Store computed synergy data |

### 6.2 Available Card Data

**Currently Tracked** (from codebase analysis):
- `keywords` (TEXT[]): Flying, Trample, etc.
- `types` (TEXT[]): Creature, Instant, etc.
- `subtypes` (TEXT[]): Human, Wizard, etc.
- `supertypes` (TEXT[]): Legendary, Basic, etc.
- `colors` (TEXT[]): W, U, B, R, G
- `color_identity` (TEXT[]): Commander-legal colors
- `cmc` (DECIMAL): Converted mana cost
- `oracle_text` (TEXT): Rules text
- `game_data` (JSONB): Legalities, prices

### 6.3 Performance Constraints

| Constraint | Limit | Mitigation |
|------------|-------|------------|
| **Scryfall Rate Limit** | ~10 req/sec | Card data already cached locally |
| **GIN Index Query Time** | <50ms typical | Leverage existing indexes |
| **Frontend Bundle Size** | Keep minimal | Synergy calculations on backend |
| **Real-Time Updates** | Per card add | Debounce recommendation refreshes |

### 6.4 Schema Extension Requirements

**Minimal Schema Changes Needed**:

```sql
-- Optional: Pre-computed synergy scores table
CREATE TABLE card_synergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id),
  related_card_id UUID REFERENCES cards(id),
  synergy_score DECIMAL(5,2),
  synergy_reasons JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(card_id, related_card_id)
);

-- Optional: Deck archetype tags
ALTER TABLE decks ADD COLUMN archetype_tags TEXT[];
ALTER TABLE decks ADD COLUMN archetype_confidence JSONB;
```

### 6.5 API Design Constraints

New endpoints should follow existing patterns:
- Use tRPC procedures
- Require authentication for user-specific data
- Follow `handlePromise` error handling pattern
- Return typed responses
- Support pagination for large result sets

---

## 7. Data Requirements

### 7.1 Keyword Categories

For synergy scoring, keywords should be categorized by function:

| Category | Keywords | Synergy Logic |
|----------|----------|---------------|
| **Evasion** | Flying, Trample, Menace, Unblockable, Fear, Intimidate, Shadow | Synergize with power-boosting effects |
| **Protection** | Hexproof, Shroud, Indestructible, Ward, Protection from X | Synergize with Voltron strategies |
| **Combat** | First Strike, Double Strike, Deathtouch, Lifelink, Vigilance | Synergize with combat-focused decks |
| **Recursion** | Undying, Persist, Encore, Escape, Embalm, Eternalize | Synergize with graveyard strategies |
| **Mana** | Affinity, Convoke, Delve, Improvise | Synergize with artifact/token strategies |
| **Card Advantage** | Cycling, Flashback, Retrace, Jump-start | Synergize with spell-heavy decks |
| **Counters** | Proliferate, Modular, Graft, Evolve | Synergize with +1/+1 counter strategies |

### 7.2 Type Synergies

Define which types synergize:

| Type | Synergizes With |
|------|-----------------|
| Artifact | Artifact Creature, "Artifact matters" cards |
| Creature | "Creature matters", tribal lords |
| Enchantment | Constellation, enchantress effects |
| Instant/Sorcery | Spellslinger, Magecraft, Storm |
| Planeswalker | Superfriends, proliferate |
| Land | Land-fall, land animation |

### 7.3 Tribal Data Requirements

For tribal synergy detection:

**High-Priority Tribes** (most common in Commander):
- Elves, Goblins, Zombies, Vampires, Dragons
- Humans, Merfolk, Angels, Demons, Wizards
- Soldiers, Knights, Clerics, Rogues, Warriors
- Elementals, Spirits, Dinosaurs, Beasts, Cats
- Artifacts (as a pseudo-tribe)

### 7.4 Oracle Text Pattern Matching

Extract synergy signals from oracle text:

| Pattern | Detection Regex | Synergy Type |
|---------|-----------------|--------------|
| Sacrifice triggers | `/sacrifice|sacrificed/i` | Aristocrats |
| Death triggers | `/when .* dies/i` | Aristocrats |
| Counter manipulation | `/\+1\/\+1 counter|proliferate/i` | Counter strategies |
| Draw effects | `/draw .* card/i` | Card advantage |
| Tutors | `/search your library/i` | Combo enabler |
| Recursion | `/return .* from .* graveyard/i` | Reanimator |
| Token creation | `/create .* token/i` | Go-wide, Aristocrats |
| Mana production | `/add \{[WUBRG]/i` | Ramp |

### 7.5 Archetype Detection Criteria

| Archetype | Detection Criteria |
|-----------|-------------------|
| **Aggro** | Avg CMC < 3.0, >50% creatures, haste/menace density |
| **Control** | >15 interaction spells, >4 board wipes, avg CMC > 3.5 |
| **Midrange** | Balanced creature/spell ratio, 3.0-3.5 avg CMC |
| **Combo** | >5 tutors, specific combo pieces detected |
| **Tribal** | >20 creatures sharing type, tribal support cards |
| **Voltron** | >8 equipment/auras, commander protection density |
| **Aristocrats** | >5 sacrifice outlets, >8 death triggers |
| **Spellslinger** | >50% instants/sorceries, spell copy effects |
| **Reanimator** | >5 recursion effects, discard outlets |
| **Stax** | Tax effects, rule-setting permanents |

---

## 8. Implementation Recommendations

### 8.1 Phased Rollout

**Phase 1: Foundation (Week 1-2)**
- Implement synergy scoring algorithm
- Build keyword/type categorization
- Create `decks.getSuggestions` endpoint
- Add basic archetype detection

**Phase 2: Commander Integration (Week 3-4)**
- Commander-specific recommendation logic
- Color identity filtering
- Tribal detection and synergy
- Collection-constrained filtering

**Phase 3: Deck Analysis (Week 5-6)**
- 8x8 category analysis
- Gap identification
- Mana curve optimization suggestions
- Progressive recommendation stages

**Phase 4: Frontend (Week 7-8)**
- Recommendation panel in deck builder
- Synergy explanations UI
- Collection toggle
- Archetype display

### 8.2 Algorithm Approach

**Start Simple, Iterate**:
1. **Heuristic-based** scoring using keyword/type matching
2. **Additive scoring** model (transparent, debuggable)
3. **User feedback loop** to tune weights
4. **Optional**: ML enhancement in v2 using usage data

### 8.3 API Endpoint Design

```typescript
// New endpoints
decks.getSuggestions(deckId, options) -> CardSuggestion[]
decks.getArchetype(deckId) -> ArchetypeAnalysis
decks.getGaps(deckId) -> CategoryGaps
cards.getSynergies(cardId, options) -> SynergyResult[]
cards.getSynergyScore(cardId, targetCardId) -> SynergyScore
```

### 8.4 Testing Strategy

- **Unit Tests**: Synergy scoring functions
- **Integration Tests**: Recommendation endpoints
- **Snapshot Tests**: Archetype detection on known decks
- **Manual Validation**: User testing with real Commander players

---

## Appendix A: Research References

This product scope is informed by:

1. **MTG Deckbuilding Theory Research** (`mtg-deckbuilding-research/summary.md`)
   - 8x8 Theory for category targets
   - Four Pillars of Commander deckbuilding
   - Archetype classification systems

2. **Codebase Analysis** (`codebase-analysis/summary.md`)
   - Available card data fields
   - Existing deck/collection infrastructure
   - Performance characteristics

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **CMC** | Converted Mana Cost (now Mana Value) - total mana to cast a spell |
| **Commander** | The legendary creature that defines a Commander deck's color identity |
| **Color Identity** | All colors in a card's mana cost and rules text |
| **EDH** | Elder Dragon Highlander - original name for Commander format |
| **8x8 Theory** | Deckbuilding framework: 8 categories of 8 cards each |
| **Synergy** | When cards work together for greater effect than individually |
| **Tribal** | Deck strategy focused on creatures sharing a type |
| **Voltron** | Strategy of making commander lethal through equipment/auras |
| **Aristocrats** | Strategy using sacrifice effects and death triggers |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-07 | Product Team | Initial draft |

---

*This document should be reviewed by Engineering leads before implementation begins.*
