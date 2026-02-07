# TCG Tracker Codebase Analysis Report

**Status**: COMPLETED
**Date**: 2026-02-07
**Analysis Scope**: Database schema, card data structure, deck models, API endpoints, and search functionality

---

## Executive Summary

The TCG Tracker is a Magic: The Gathering collection and deck management application built with:
- **Backend**: Node.js, tRPC, Drizzle ORM, PostgreSQL
- **Frontend**: React, TypeScript, TanStack Query
- **External API**: Scryfall API for card data
- **Architecture**: Monorepo with separate API and web packages

The system uses a robust database schema with soft deletes, JSONB for extensibility, and comprehensive indexing for performance. Cards are cached from Scryfall on-demand, and users can organize them into collections and decks.

---

## 1. Database Schema Analysis

### 1.1 Cards Table
**File**: `/home/mantis/Development/tcg-tracker/packages/db/src/schema/cards.ts:4-75`
**SQL Schema**: `/home/mantis/Development/tcg-tracker/schema.sql:31-98`

#### Core Fields:
- **Identifiers**:
  - `id` (UUID): Scryfall card ID - unique per printing
  - `oracle_id` (UUID): Groups functionally identical cards across printings

- **Basic Information**:
  - `name` (VARCHAR 255): Card name
  - `type_line` (TEXT): Full type line (e.g., "Legendary Creature — Human Wizard")
  - `oracle_text` (TEXT): Rules text

- **Type Information** (denormalized arrays for filtering):
  - `types` (TEXT[]): Main types ['Creature', 'Artifact']
  - `subtypes` (TEXT[]): Creature/land types ['Human', 'Wizard']
  - `supertypes` (TEXT[]): ['Legendary', 'Snow', 'Basic']
  - `keywords` (TEXT[]): ['Flying', 'Haste', 'Trample']

- **Mana & Costs**:
  - `mana_cost` (VARCHAR 100): '{2}{U}{U}'
  - `cmc` (DECIMAL 5,2): Converted mana cost/mana value
  - `colors` (TEXT[]): Color identity ['U', 'R']
  - `color_identity` (TEXT[]): For Commander format

- **Card Stats** (nullable):
  - `power` (VARCHAR 10): Can be '*', '1+*', numbers
  - `toughness` (VARCHAR 10)
  - `loyalty` (VARCHAR 10): For planeswalkers

- **Printing Information**:
  - `set_code` (VARCHAR 10): 'MOM', 'ONE'
  - `set_name` (VARCHAR 255)
  - `collector_number` (VARCHAR 20)
  - `rarity` (VARCHAR 20): 'common', 'uncommon', 'rare', 'mythic'

- **Metadata**:
  - `artist` (VARCHAR 255)
  - `flavor_text` (TEXT)
  - `image_uris` (JSONB): Multiple image sizes {'small', 'normal', 'large', 'png'}
  - `game_data` (JSONB): Extensible field for legalities, prices, etc.

#### Indexes:
- B-tree indexes: oracle_id, name, set_code, rarity, cmc
- GIN indexes: types, subtypes, keywords, colors, color_identity (for array queries)
- GIN index: game_data (for nested JSON queries)
- Unique constraint: (set_code, collector_number)

#### Key Technical Notes:
- Uses GIN indexes for efficient array containment queries
- JSONB `game_data` enables future TCG extensibility without schema changes
- Stores legalities and prices in `game_data`: `{legalities: {}, prices: {}}`
- Cards are cached on-demand from Scryfall API

---

### 1.2 Collections System

#### Collections Table
**File**: `/home/mantis/Development/tcg-tracker/packages/db/src/schema/collections.ts:5-28`

- `id` (UUID): Primary key
- `name` (VARCHAR 255)
- `description` (TEXT)
- `owner_id` (UUID): Foreign key to users
- `is_public` (BOOLEAN): Visibility setting
- `created_at`, `updated_at`, `deleted_at`: Soft delete support

#### Collection Cards (Junction Table)
**File**: `/home/mantis/Development/tcg-tracker/packages/db/src/schema/collection-cards.ts:6-46`

- `id` (UUID): Primary key
- `collection_id` (UUID): Foreign key to collections
- `card_id` (UUID): Foreign key to cards
- `quantity` (INTEGER): How many copies owned
- `card_metadata` (JSONB): Condition, foil status, custom notes
- `deleted_at`: Soft delete for history preservation

**Unique Constraint**: (collection_id, card_id) - one entry per card per collection

#### Collection Members
**File**: `/home/mantis/Development/tcg-tracker/packages/db/src/schema/collection-members.ts`

- Multi-user collaboration support
- Roles: 'owner', 'contributor', 'viewer'
- Permissions managed via `collection_role` ENUM

---

### 1.3 Decks System

#### Decks Table
**File**: `/home/mantis/Development/tcg-tracker/packages/db/src/schema/decks.ts:5-16`
**Migration**: `/home/mantis/Development/tcg-tracker/packages/db/drizzle/0001_add_decks.sql:6-15`

- `id` (UUID): Primary key
- `name` (VARCHAR 255)
- `description` (TEXT)
- `format` (VARCHAR 50): 'Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other'
- `collection_only` (BOOLEAN): Restricts deck to only cards from user's collections
- `collection_id` (UUID, nullable): Optional link to specific collection
- `owner_id` (UUID): Foreign key to users
- `created_at`, `updated_at`, `deleted_at`: Timestamps with soft delete

**Collection Restrictions** (Added in migrations 0002, 0004):
- If `collection_only=true` AND `collection_id=null`: Deck can use cards from ANY user collection
- If `collection_only=true` AND `collection_id` is set: Deck can ONLY use cards from that specific collection
- If `collection_only=false`: Deck can use any cards from Scryfall (not just owned cards)

#### Deck Cards (Junction Table)
**File**: `/home/mantis/Development/tcg-tracker/packages/db/src/schema/deck-cards.ts:5-16`

- `id` (UUID): Primary key
- `deck_id` (UUID): Foreign key to decks
- `card_id` (UUID): Foreign key to cards
- `quantity` (INTEGER): Number of copies (1-100, enforced by CHECK constraint)
- `card_type` (VARCHAR 20): 'mainboard', 'sideboard', 'commander'
- `deleted_at`: Soft delete

**Unique Constraint**: (deck_id, card_id, card_type) WHERE deleted_at IS NULL

**Partial Unique Index**: Excludes soft-deleted entries from constraint

---

## 2. Card Attributes & Keywords Tracking

### 2.1 Tracked Keywords
**Source**: `/home/mantis/Development/tcg-tracker/apps/api/src/lib/scryfall.ts:125`

Keywords are extracted from Scryfall API and stored as arrays:
- `keywords` (TEXT[]): ['Flying', 'Haste', 'First Strike', 'Lifelink', etc.]
- Indexed with GIN for efficient containment queries
- Filterable via advanced search

### 2.2 Type System
**Source**: `/home/mantis/Development/tcg-tracker/apps/api/src/lib/scryfall.ts:106-114`

Type parsing logic:
- Type line format: "Supertypes Types — Subtypes"
- Example: "Legendary Creature — Human Wizard"
  - Supertypes: ['Legendary']
  - Types: ['Creature']
  - Subtypes: ['Human', 'Wizard']

**Recognized Supertypes**: 'Legendary', 'Basic', 'Snow', 'World', 'Ongoing'

### 2.3 Scryfall Integration
**File**: `/home/mantis/Development/tcg-tracker/apps/api/src/lib/scryfall.ts:1-146`

#### Cached Fields from Scryfall:
```typescript
interface ScryfallCard {
  id: string
  oracle_id: string
  name: string
  type_line: string
  oracle_text?: string
  mana_cost?: string
  cmc: number
  colors?: string[]
  color_identity?: string[]
  power?: string
  toughness?: string
  loyalty?: string
  set: string
  set_name: string
  collector_number: string
  rarity: string
  artist?: string
  flavor_text?: string
  image_uris?: { small, normal, large, png }
  prices?: { usd, usd_foil, eur }
  legalities?: Record<string, string>
  keywords?: string[]
}
```

#### Transformation Logic:
- **Line 104-145**: `transformScryfallCard()` converts Scryfall format to database schema
- Parses type line into separate arrays
- Stores prices and legalities in `game_data` JSONB field
- No API key required, ~10 req/sec rate limit

---

## 3. API Endpoints

### 3.1 Cards Router
**File**: `/home/mantis/Development/tcg-tracker/apps/api/src/router/cards.ts:31-176`

#### `cards.search` (Line 35-48)
- **Input**: `{ query: string, page: number }`
- **Function**: Searches Scryfall API
- **Returns**: `{ cards: ScryfallCard[], hasMore: boolean, total: number }`
- **Note**: Does NOT cache cards - caching happens when adding to collection

#### `cards.getById` (Line 54-98)
- **Input**: `{ cardId: UUID }`
- **Function**:
  1. Check local database cache
  2. If not found, fetch from Scryfall
  3. Transform and cache card
- **Returns**: Complete card object
- **Caching Strategy**: `onConflictDoUpdate` with `updatedAt` timestamp

#### `cards.advancedSearch` (Line 104-175)
- **Input**: `{ query: string, filters?: { colors, types, keywords, rarity, cmcMin, cmcMax } }`
- **Function**:
  1. Search Scryfall by name
  2. Cache all found cards
  3. Apply client-side filters (colors, types, keywords, rarity, CMC range)
- **Returns**: `{ cards: Card[], total: number }`
- **Limitations**: Client-side filtering after Scryfall search

---

### 3.2 Collections Router
**File**: `/home/mantis/Development/tcg-tracker/apps/api/src/router/collections.ts:57-814`

#### `collections.list` (Line 61-88)
- Lists all collections for authenticated user
- Ordered by `updated_at DESC`
- Excludes soft-deleted

#### `collections.create` (Line 134-175)
- **Input**: `{ name, description?, isPublic? }`
- Creates new collection for user

#### `collections.addCard` (Line 315-482)
- **Input**: `{ collectionId, cardId, quantity, metadata? }`
- **Function**:
  1. Verify collection ownership
  2. Check if card exists in database (fetch from Scryfall if not)
  3. If card already in collection: ADD to existing quantity
  4. If new: Insert new collection_card entry
- **Note**: Automatic quantity merging

#### `collections.getCards` (Line 487-545)
- **Input**: `{ collectionId }`
- **Returns**: All cards in collection with full details
- Uses Drizzle relations to join with cards table

#### `collections.searchCards` (Line 717-813)
- **Input**: `{ collectionId?, query }`
- **Function**: Search cards within specific collection OR all user collections
- Uses PostgreSQL `ILIKE` for case-insensitive search
- Limit 50 results

---

### 3.3 Decks Router
**File**: `/home/mantis/Development/tcg-tracker/apps/api/src/router/decks.ts:46-581`

#### `decks.list` (Line 48-68)
- Lists all decks for authenticated user
- Ordered by `updated_at DESC`
- Excludes soft-deleted

#### `decks.get` (Line 71-126)
- **Input**: `{ deckId }`
- **Returns**: Deck with all cards (mainboard, sideboard, commander)
- Joins with cards table for full card details

#### `decks.create` (Line 129-179)
- **Input**: `{ name, description?, format?, collectionOnly?, collectionId? }`
- **Validation**: If `collectionId` provided, verifies user owns that collection
- Supports 8 formats: Standard, Modern, Commander, Legacy, Vintage, Pioneer, Pauper, Other

#### `decks.addCard` (Line 253-351)
- **Input**: `{ deckId, cardId, quantity, cardType }`
- **Function**:
  1. Verify deck ownership
  2. **If deck is collection-only**: Verify card exists in user's collections
  3. Add card or update quantity if already in deck
- **Validation Logic** (Line 282-319):
  - If `collectionOnly=true` AND `collectionId` is set: Check card is in that specific collection
  - If `collectionOnly=true` AND `collectionId` is null: Check card is in ANY user collection
  - Throws descriptive error if validation fails

#### `decks.analyze` (Line 479-580)
- **Input**: `{ deckId }`
- **Returns**: Comprehensive deck analytics:
  - `manaCurve`: CMC distribution (histogram)
  - `typeDistribution`: Card types count
  - `colorDistribution`: Color breakdown
  - `avgCMC`: Average converted mana cost
  - `totalCards`: Total card count
  - `mainboardCount`, `sideboardCount`: Unique card counts
- **Note**: Only analyzes mainboard for CMC calculations

---

## 4. Search & Recognition Features

### 4.1 Card Search
**Locations**:
- Scryfall API search (text-based)
- Collection search (local database, ILIKE)
- Advanced search with filters

### 4.2 OCR Card Recognition
**File**: `/home/mantis/Development/tcg-tracker/apps/web/src/hooks/useCardRecognition.ts:1-248`

#### Technology Stack:
- **OCR Engine**: Tesseract.js
- **Matching Algorithm**: Levenshtein distance for fuzzy matching
- **Confidence Scoring**: Similarity percentage (0-100%)

#### Workflow (Line 110-241):
1. **Image Processing**:
   - Validate image file
   - Initialize Tesseract worker
   - Extract text from image
2. **Text Extraction** (Line 77-100):
   - Split by lines, remove noise
   - Filter out non-card-name patterns
   - Clean OCR artifacts
3. **Card Matching** (Line 160-190):
   - Search each extracted name via API
   - Calculate similarity score using Levenshtein distance
   - Keep matches >60% confidence
4. **Results**:
   - Sort by confidence (highest first)
   - Remove duplicates
   - Return top 10 matches

#### Similarity Algorithm (Line 33-71):
```typescript
similarity = 1 - (levenshteinDistance / maxLength)
```
- Range: 0.0 to 1.0
- Threshold: 0.6 (60%) minimum confidence
- Used for handling OCR errors in card names

---

## 5. No Existing Recommendation System

**Finding**: The codebase currently has NO deck recommendation or card suggestion features.

**Evidence**:
- No recommendation algorithms found in API routes
- No similarity/synergy analysis endpoints
- No deck archetype detection
- No card pairing suggestions
- OCR recognition uses similarity ONLY for name matching, not for recommendations

**Opportunities for Enhancement**:
1. Deck archetype detection based on card composition
2. Card synergy recommendations within decks
3. Sideboard suggestions based on deck strategy
4. Budget alternatives for expensive cards
5. Missing card suggestions to complete deck strategies
6. Meta-game analysis and competitive deck comparisons

---

## 6. Key Technical Findings

### 6.1 Strengths
1. **Robust Schema Design**:
   - Soft deletes throughout for data preservation
   - JSONB fields for extensibility
   - Comprehensive indexing (B-tree + GIN)
   - Proper foreign key constraints

2. **Error Handling**:
   - `handlePromise` utility for async operations
   - Descriptive error messages
   - Proper HTTP status codes

3. **Performance Optimizations**:
   - Array types with GIN indexes for fast containment queries
   - On-demand card caching from Scryfall
   - Partial unique indexes to exclude soft-deleted rows

4. **Security**:
   - Authentication middleware for all protected routes
   - Ownership verification before mutations
   - tRPC for type-safe API calls

### 6.2 Data Flow Architecture

```
User Action → Frontend (React)
    ↓
tRPC Client → API Routes (apps/api/src/router)
    ↓
Drizzle ORM → PostgreSQL Database
    ↓
Cache Check → Scryfall API (if needed)
    ↓
Response → Frontend State (TanStack Query)
```

### 6.3 Notable Patterns

1. **Soft Delete Pattern**:
   - All major tables have `deleted_at` timestamp
   - Indexes use `WHERE deleted_at IS NULL`
   - Enables audit trail and data recovery

2. **Quantity Management**:
   - Collections: Increment quantity when adding duplicate
   - Decks: Update quantity or remove if set to 0
   - CHECK constraints enforce valid ranges

3. **Card Caching Strategy**:
   - Cards fetched from Scryfall on first use
   - `onConflictDoUpdate` keeps cards fresh
   - No preemptive bulk imports

---

## Files Analyzed

### Database Schema Files
- `/home/mantis/Development/tcg-tracker/schema.sql:1-374`
- `/home/mantis/Development/tcg-tracker/packages/db/src/schema/cards.ts:1-79`
- `/home/mantis/Development/tcg-tracker/packages/db/src/schema/collections.ts:1-32`
- `/home/mantis/Development/tcg-tracker/packages/db/src/schema/collection-cards.ts:1-62`
- `/home/mantis/Development/tcg-tracker/packages/db/src/schema/decks.ts:1-17`
- `/home/mantis/Development/tcg-tracker/packages/db/src/schema/deck-cards.ts:1-17`
- `/home/mantis/Development/tcg-tracker/packages/db/src/schema/index.ts:1-9`

### Migration Files
- `/home/mantis/Development/tcg-tracker/packages/db/drizzle/0001_add_decks.sql:1-57`
- `/home/mantis/Development/tcg-tracker/packages/db/drizzle/0002_add_collection_only_to_decks.sql:1-8`
- `/home/mantis/Development/tcg-tracker/packages/db/drizzle/0004_add_collection_id_to_decks.sql:1-14`

### API Route Files
- `/home/mantis/Development/tcg-tracker/apps/api/src/router/cards.ts:1-177`
- `/home/mantis/Development/tcg-tracker/apps/api/src/router/collections.ts:1-815`
- `/home/mantis/Development/tcg-tracker/apps/api/src/router/decks.ts:1-582`
- `/home/mantis/Development/tcg-tracker/apps/api/src/lib/scryfall.ts:1-146`

### Frontend Hooks
- `/home/mantis/Development/tcg-tracker/apps/web/src/hooks/useCardRecognition.ts:1-249`

---

## Errors/Issues

**None encountered** - All files were successfully read and analyzed.

---

## Recommendations for Deck Recommendation System

Based on this analysis, here are recommended approaches for building a deck recommendation system:

### 1. Data Foundation (Already Present)
- Card keywords, types, colors, CMC already tracked
- Deck composition and format information available
- Collection ownership data for "cards you own" filtering

### 2. Suggested Features

#### A. Card Synergy Analysis
- Calculate synergy scores between cards based on:
  - Shared keywords (e.g., +Vampire tribal synergy)
  - Color identity compatibility
  - CMC curve optimization
  - Type synergies (e.g., artifacts with artifact-matters cards)

#### B. Deck Archetype Detection
- Classify existing decks by strategy:
  - Aggro, Control, Midrange, Combo
  - Tribal themes
  - Color combinations
- Use classification for similar deck recommendations

#### C. Missing Card Suggestions
- Analyze deck composition
- Suggest cards that complement strategy
- Filter by:
  - Cards user owns (from collections)
  - Budget constraints (using `game_data.prices`)
  - Format legality (from `game_data.legalities`)

#### D. Mana Curve Optimization
- Leverage existing `decks.analyze` endpoint
- Suggest cards to smooth mana curve
- Identify CMC gaps in deck

### 3. Implementation Strategy

**Phase 1: Data Collection**
- Aggregate deck stats across all users
- Build card co-occurrence matrix
- Calculate keyword frequency by archetype

**Phase 2: Algorithm Development**
- Collaborative filtering (based on similar decks)
- Content-based filtering (based on card attributes)
- Hybrid approach combining both

**Phase 3: API Integration**
- New endpoint: `decks.getSuggestions`
- Input: deckId, maxResults, filterByCollection
- Output: Ranked list of card suggestions with reasoning

**Phase 4: Frontend**
- Suggestion panel in deck builder
- "Cards You Own" filter toggle
- Explanation of why card is suggested

---

## Technical Notes

### Database Performance Considerations
- GIN indexes enable `@>` (array contains) queries in O(log n)
- JSONB `game_data` supports path queries: `game_data @> '{"legalities": {"standard": "legal"}}'`
- Partial indexes reduce index size by excluding soft-deleted rows

### API Design Patterns
- All mutations verify ownership via middleware or inline checks
- Error messages are user-friendly and actionable
- Optimistic updates in frontend (TanStack Query)

### Extensibility Points
- `game_data` JSONB field can store future TCG-specific data
- Soft deletes preserve historical data
- Type system supports easy addition of new card types

---

## Conclusion

The TCG Tracker has a **solid foundation** for implementing a deck recommendation system. The schema is well-designed with proper indexing, the API follows best practices, and the data model captures all necessary card attributes.

**Key Strengths**:
- Comprehensive card attribute tracking (keywords, types, colors, CMC)
- Flexible JSONB storage for extensibility
- Performance-optimized with GIN indexes
- Clean separation of concerns (collections vs decks)

**Current Gaps**:
- No recommendation or similarity analysis features
- No archetype detection or deck classification
- No card synergy calculations
- No "complete your deck" suggestions

The next step would be to design the recommendation algorithm based on the available data structures and implement new API endpoints for suggestions.
