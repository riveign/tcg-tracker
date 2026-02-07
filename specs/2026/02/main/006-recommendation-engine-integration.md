# Human Section
Critical: any text/subsection here cannot be modified by AI.

## High-Level Objective (HLO)

Enhance the recommendation system to use commander, colors, and strategy metadata for intelligent card recommendations.

## Mid-Level Objectives (MLO)

1. **Commander Format Adapter Enhancement**: Update commander recommendations to use color identity and strategy
2. **Constructed Format Adapter Enhancement**: Update constructed recommendations to respect selected colors and strategy
3. **Strategy-Based Filtering**: Implement card filtering logic based on deck strategy
4. **Legacy Deck Support**: Add fallback logic for decks without metadata

## Details (DT)

### Phase 6: Recommendation Engine Integration

Enhance the recommendation system to use commander, colors, and strategy for initial recommendations. Update FormatAdapter implementations to leverage new metadata when generating suggestions.

**Deliverables**:
- Update packages/api/src/services/recommendations/format-adapters/commander.ts
- Update packages/api/src/services/recommendations/format-adapters/constructed.ts
- Add strategy-based card filtering logic
- Integrate commander color identity into recommendations
- Update recommendation weights based on strategy
- Add fallback logic when metadata is missing (legacy decks)

**Acceptance Criteria**:
- Commander decks get recommendations matching color identity
- Strategy influences recommendation weights (e.g., more creatures for Tribal)
- Constructed decks respect selected colors
- Legacy decks without metadata still get recommendations
- Recommendations return within 2 seconds
- Type checking and lint pass

**Dependencies**: phase-1 (Database Schema Extension), phase-2 (Format Strategy Type System), phase-5 (Deck Creation API Enhancement)

## Behavior

Implement all deliverables within a single o_spec execution cycle. Focus on maintaining backward compatibility with existing decks while enabling enhanced recommendations for new decks with metadata.

# AI Section
Critical: AI can ONLY modify this section.

## Research

### Codebase Analysis

**Note**: The spec references incorrect file paths. The actual recommendation system is located at:
- `apps/api/src/lib/recommendation/` (not `packages/api/src/services/recommendations/`)
- No `constructed.ts` exists; `standard.ts` and `modern.ts` handle constructed formats

#### Current Architecture

1. **Format Adapters** (`apps/api/src/lib/recommendation/format-adapters/`)
   - `CommanderAdapter` (553 lines) - Full archetype modifiers for 8 Commander archetypes
   - `StandardAdapter` (393 lines) - Archetypes: aggro, control, midrange, combo
   - `ModernAdapter` - Extends StandardAdapter patterns
   - `BrawlAdapter` - Commander-like singleton rules with Standard card pool
   - All implement `FormatAdapter` interface with `getColorConstraint()` and `getArchetypeModifiers()`

2. **Database Schema** (`packages/db/src/schema/decks.ts`)
   ```typescript
   commanderId: uuid('commander_id').references(() => cards.id)
   colors: text('colors').array().notNull().default(sql`'{}'`)
   strategy: varchar('strategy', { length: 50 })
   ```

3. **Type System** (`packages/types/src/index.ts`)
   - `CommanderStrategy` enum: 18 strategies (tribal, aristocrats, spellslinger, voltron, stax, combo, tokens, reanimator, lands, vehicles, artifacts, enchantments, superfriends, group_hug, chaos, stompy, politics, midrange)
   - `ConstructedStrategy` enum: 10 strategies (aggro, control, midrange, combo, tribal, tempo, ramp, burn, mill, prison)
   - Helper: `isValidStrategyForFormat(format, strategy)`

4. **Recommendations Router** (`apps/api/src/router/recommendations.ts`, 693 lines)
   - `getSuggestions` - Main endpoint, uses `detectArchetype()` (simple creature/spell ratio)
   - Does NOT currently use `deck.colors`, `deck.strategy`, or `deck.commanderId` from metadata
   - Color constraints derived from commander card in deck cards, not from `deck.colors` field

5. **Synergy Scorer** (`apps/api/src/lib/recommendation/synergy-scorer.ts`, 657 lines)
   - Scores: mechanical (40), strategic (30), formatContext (20), theme (10)
   - Uses `context.archetype` for modifiers via adapter
   - `ScoringContext` interface includes `archetype: string`

6. **Archetype Detector** (`apps/api/src/lib/recommendation/archetype-detector.ts`, 512 lines)
   - Sophisticated pattern-based detection
   - Does NOT use deck.strategy metadata (detection only)

#### Current Behavior Gaps

1. **Color Identity**: `getColorConstraint()` looks up commander card from deck.cards, not deck.colors field
2. **Strategy**: Archetype detection ignores deck.strategy, always uses pattern detection
3. **Scoring**: No strategy-specific boosts beyond detected archetype modifiers

#### Files Requiring Modification

| File | Lines | Changes |
|------|-------|---------|
| `format-adapters/types.ts` | 379 | Extend `DeckWithCards` with colors/strategy/commanderId |
| `format-adapters/commander.ts` | 553 | Use deck.colors for color constraint, deck.strategy for modifiers |
| `format-adapters/standard.ts` | 393 | Add color preference support, strategy-based weights |
| `router/recommendations.ts` | 693 | Load metadata in `loadDeckWithCards()`, pass to context |
| `synergy-scorer.ts` | 657 | Extend `ScoringContext` with strategy, apply boosts |
| `archetype-detector.ts` | 512 | Add `getEffectiveArchetype()` using deck.strategy when present |

#### Test Files

- `__tests__/format-adapters.test.ts` (620 lines) - StandardAdapter, CommanderAdapter
- `__tests__/format-adapters-phase2.test.ts` (785 lines) - ModernAdapter, BrawlAdapter, ArchetypeDetector
- `router/__tests__/decks.test.ts` - Deck validation including strategy field

### Strategy

#### Implementation Plan

**Phase 1: Type Extensions**
1. Extend `DeckWithCards` interface in `types.ts`:
   ```typescript
   export interface DeckWithCards {
     // existing fields...
     commanderId?: string | null;
     colors?: ManaColor[];
     strategy?: string | null;
   }
   ```

**Phase 2: Adapter Enhancements**

1. **CommanderAdapter** modifications:
   - Update `getColorConstraint()` to use `deck.colors` when present, fallback to commander card lookup
   - Add `getStrategyModifiers(deck)` that uses `deck.strategy` when available
   - Override `getArchetypeModifiers()` to integrate strategy

2. **StandardAdapter** modifications:
   - Add `getColorPreference(deck)` method using `deck.colors`
   - Integrate strategy for weight adjustments
   - Add strategy-specific category targets

**Phase 3: Router Integration**

1. Update `loadDeckWithCards()` to fetch and include:
   - `deck.colors` (array)
   - `deck.strategy` (string)
   - `deck.commanderId` (UUID)

2. Modify `getSuggestions`:
   - Use deck.strategy for archetype when present
   - Apply color preference filtering for constructed formats
   - Pass strategy to ScoringContext

**Phase 4: Scoring Enhancements**

1. Extend `ScoringContext`:
   ```typescript
   export interface ScoringContext {
     // existing...
     deckStrategy?: string | null;
     deckColors?: ManaColor[];
   }
   ```

2. Update `calculateStrategicSynergy()`:
   - Add strategy-specific keyword boosts
   - Increase category weights based on strategy

**Phase 5: Fallback Logic**

1. Legacy deck handling:
   - `strategy === null` -> Use ArchetypeDetector
   - `colors.length === 0` -> Derive from commander or allow all
   - `commanderId === null` for Commander -> Skip color enforcement, warn

#### Testing Strategy

1. **Unit Tests** (`__tests__/format-adapters-phase6.test.ts`):
   - CommanderAdapter with deck.strategy set
   - StandardAdapter with deck.colors set
   - Fallback behavior with null metadata

2. **Integration Tests**:
   - `getSuggestions` with full metadata
   - `getSuggestions` with partial metadata (legacy deck simulation)
   - Performance: verify <2 second response

3. **Edge Cases**:
   - Empty colors array
   - Invalid strategy value
   - Commander format without commanderId

#### Performance Considerations

- Current batch scoring already efficient
- Metadata-based filtering reduces candidate pool (faster)
- No additional database queries needed (metadata loaded with deck)
- Target: <2 seconds verified through existing patterns
