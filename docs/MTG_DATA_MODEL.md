# MTG Card Data Model Research

Research findings on how to model Magic: The Gathering cards for collection tracking and deck building.

## Card Type System

### Type Hierarchy

MTG has three levels of types:

1. **Supertypes** (appear before em-dash): Basic, Legendary, Snow, World
2. **Card Types** (core types):
   - **Evergreen**: Artifact, Battle, Creature, Enchantment, Instant, Land, Planeswalker, Sorcery
   - **Specialized**: Conspiracy, Dungeon, Kindred, Phenomenon, Plane, Scheme, Vanguard
3. **Subtypes** (appear after em-dash):
   - Land types: Plains, Island, Swamp, Mountain, Forest
   - Creature types: 308+ types (Elf, Goblin, Zombie, Dragon, etc.)
   - Artifact types: Equipment, Vehicle
   - Enchantment types: Aura, Saga, Shrine

### Storage Recommendation

Store full `type_line` and parse into three arrays:

```typescript
{
  type_line: "Legendary Creature — Elf Warrior",
  supertypes: ["Legendary"],
  types: ["Creature"],
  subtypes: ["Elf", "Warrior"]
}
```

This enables filtering at any level and supports future card types without schema changes.

## Keyword System

### Keyword Categories

**Evergreen Keywords** (16 total, appear in most sets):
- **Combat**: Flying, First Strike, Double Strike, Deathtouch, Trample, Vigilance, Reach, Lifelink, Menace
- **Speed**: Haste, Flash
- **Protection**: Hexproof, Indestructible, Ward
- **Other**: Defender, Scry

**Expert-Level Keywords** (100+ set-specific):
- Examples: Convoke, Delve, Flashback, Cycling, Kicker, Mutate

**Keyword Actions** (verbs):
- Examples: Create, Destroy, Exile, Sacrifice, Tap, Untap

**Ability Words** (thematic markers):
- Examples: Landfall, Constellation, Devotion

### Data Source

Scryfall provides real-time keyword catalog:
```
GET https://api.scryfall.com/catalog/keyword-abilities
```

Returns array of all keyword abilities, updated during spoiler seasons.

### Storage Recommendation

Store as array of strings from Scryfall's `keywords` field:

```typescript
keywords: ["Flying", "Trample", "Haste"]
```

Enables:
- Exact match filtering
- Multi-keyword searches
- Future-proof as new keywords are added

## Card Attributes

### Essential Fields (Scryfall-based)

```typescript
interface Card {
  // Unique identifiers
  id: string;              // Scryfall UUID (specific printing)
  oracle_id: string;       // Oracle identity (consistent across reprints)
  name: string;            // Card name

  // Type information
  type_line: string;       // "Legendary Creature — Elf Warrior"
  supertypes: string[];    // ["Legendary"]
  types: string[];         // ["Creature"]
  subtypes: string[];      // ["Elf", "Warrior"]

  // Mana & costs
  mana_cost: string;       // "{2}{G}{G}"
  mana_value: number;      // CMC (formerly converted mana cost)

  // Colors
  colors: string[];        // ["G"] - from mana cost
  color_identity: string[];// ["G"] - includes abilities

  // Game text
  oracle_text: string;     // Rules text
  keywords: string[];      // ["Flying", "Trample"]

  // Stats (nullable)
  power?: string;          // Can be "*", "1+*"
  toughness?: string;      // Can be "*", "2+*"
  loyalty?: string;        // Planeswalker starting loyalty
  defense?: string;        // Battle defense

  // Set information
  set: string;             // Set code (e.g., "neo")
  set_name: string;        // Full set name
  collector_number: string;// Card number in set
  rarity: "common" | "uncommon" | "rare" | "mythic" | "special" | "bonus";

  // Multiface support
  card_faces?: CardFace[]; // For double-faced, split, flip cards

  // Legality
  legalities: {
    standard: "legal" | "not_legal" | "restricted" | "banned";
    pioneer: "legal" | "not_legal" | "restricted" | "banned";
    modern: "legal" | "not_legal" | "restricted" | "banned";
    commander: "legal" | "not_legal" | "restricted" | "banned";
  };

  // Images
  image_uris: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
}
```

## Deck Building Filter Priority

Based on MTG Arena's advanced filters:

**High Priority (v1):**
1. Color/Color Identity - Most common filter
2. Mana Value (CMC) - Curve building
3. Type/Subtype - Deck archetypes
4. Rarity - Collection/budget constraints
5. Keywords - Finding specific abilities
6. Power/Toughness - Creature evaluation
7. Set - Standard rotation awareness

**Medium Priority:**
8. Format legality - Commander vs Standard
9. Card text search - Specific effects
10. Multicolor/Hybrid - Fixing requirements

**Lower Priority (v2+):**
11. Artist/Flavor text
12. Pricing
13. Foil/Treatment

## Data Sources

### Scryfall API (RECOMMENDED PRIMARY)

**Pros:**
- REST API with excellent documentation
- Real-time updates during spoiler seasons
- Comprehensive search syntax
- High-quality images at multiple resolutions
- Free with no API key (10 req/sec rate limit)

**Key Endpoints:**
```
GET /cards/named?fuzzy={name}    // Fuzzy name matching (for OCR)
GET /cards/search?q={query}      // Advanced filtering
GET /catalog/keyword-abilities   // All keywords
GET /bulk-data                   // Daily full database export
```

**Best For:**
- OCR name → card details lookup
- Real-time search and filtering
- Card images for display

### MTGJSON (RECOMMENDED FOR BULK/OFFLINE)

**Pros:**
- Daily full database exports (JSON, CSV, SQL)
- No API calls needed
- Comprehensive card metadata
- Free and open source

**Cons:**
- Large file sizes (100MB+ compressed)
- Requires local database setup
- Less real-time than Scryfall

**Best For:**
- Offline-first apps
- Bulk imports
- Reducing API dependency

### Recommended Hybrid Approach

1. **Initial Data**: Download MTGJSON bulk data for base card database
2. **OCR Lookup**: Use Scryfall `/cards/named` with fuzzy matching
3. **Live Search**: Scryfall search API for real-time filtering
4. **Images**: Scryfall image URIs
5. **Updates**: Daily MTGJSON refresh + Scryfall for new spoilers

## Extensibility for Other TCGs

### Common TCG Patterns

**Pokemon TCG:**
- Single type + weakness/resistance
- HP instead of power/toughness
- Evolution mechanics
- Multiple attacks with costs

**Yu-Gi-Oh:**
- Monster/Spell/Trap types
- ATK/DEF stats
- Level/Rank/Link system
- Attribute system (LIGHT, DARK)

### Recommended Extensible Schema

```typescript
// Base card interface (TCG-agnostic)
interface BaseCard {
  id: string;
  game: "mtg" | "pokemon" | "yugioh";
  name: string;
  image_url: string;
  types: string[];
  subtypes: string[];
  keywords: string[];

  // Game-specific data (polymorphic)
  game_data: MTGCardData | PokemonCardData | YuGiOhCardData;

  // Text fields
  text: string;
  flavor_text?: string;
}

// MTG-specific extension
interface MTGCardData {
  type: "mtg";
  mana_cost: string;
  mana_value: number;
  colors: string[];
  power?: string;
  toughness?: string;
  legalities: Record<string, string>;
}
```

### Database Design (PostgreSQL)

```sql
CREATE TABLE cards (
  id UUID PRIMARY KEY,
  game VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  types TEXT[] NOT NULL,
  subtypes TEXT[],
  keywords TEXT[],

  -- Game-specific data as JSONB
  game_data JSONB NOT NULL,

  -- Indexes for filtering
  CREATE INDEX idx_cards_game ON cards(game);
  CREATE INDEX idx_cards_types ON cards USING GIN(types);
  CREATE INDEX idx_cards_keywords ON cards USING GIN(keywords);
);
```

## Implementation Strategy

### v1: MTG-Only
Start with full MTG schema, hardcode `game: "mtg"`

### v2: Prepare for Multi-TCG
Add game discriminator field

### v3: Extract Common Fields
Move MTG-specific fields into nested `game_data` object

## Sources

- [Scryfall API Documentation](https://scryfall.com/docs/api)
- [Scryfall Card Objects](https://scryfall.com/docs/api/cards)
- [MTGJSON](https://mtgjson.com/)
- [MTG Card Types - Draftsim](https://draftsim.com/mtg-card-types/)
- [MTG Keyword Abilities - MTG Wiki](https://mtg.fandom.com/wiki/Keyword_ability)
