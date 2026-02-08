# Deck Creation API Documentation

## Overview

The deck creation API has been enhanced to support commander metadata, color identity, and deck strategy fields. This enables format-specific deck building (particularly for Commander format) while maintaining backward compatibility with existing deck creation flows.

**API Router:** `/apps/api/src/router/decks.ts`

## Endpoints

### Create Deck

Creates a new deck with optional commander and metadata.

**Endpoint:** `decks.create`

**Method:** `mutation`

**Authentication:** Required (protectedProcedure)

#### Input Schema

```typescript
const createDeckSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  format: z.enum([
    'Standard',
    'Modern',
    'Commander',
    'Legacy',
    'Vintage',
    'Pioneer',
    'Pauper',
    'Other'
  ]).optional(),
  collectionOnly: z.boolean().default(false),
  collectionId: z.string().uuid().optional().nullable(),
  // New commander/metadata fields
  commanderId: z.string().uuid().optional().nullable(),
  colors: z.array(z.enum(['W', 'U', 'B', 'R', 'G'])).optional(),
  strategy: z.string().max(50).optional().nullable(),
})
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Deck name (1-255 characters) |
| `description` | `string` | No | Deck description |
| `format` | `DeckFormat` | No | MTG format (Standard, Modern, Commander, etc.) |
| `collectionOnly` | `boolean` | No | Restrict to collection cards only (default: false) |
| `collectionId` | `string (UUID)` | No | Associated collection ID |
| `commanderId` | `string (UUID)` | No | Commander card ID (must exist in cards table) |
| `colors` | `string[]` | No | Color identity (WUBRG array, e.g., `['W', 'U', 'B']`) |
| `strategy` | `string` | No | Deck strategy/archetype (max 50 chars) |

#### Validation

**Commander Validation:**
1. If `commanderId` is provided, validates card exists in database
2. Validates card can be a commander using `canBeCommander()` function
3. Auto-extracts color identity from commander if `colors` not provided
4. Throws `BAD_REQUEST` error if commander is invalid

**Color Validation:**
- Colors must be valid WUBRG values: `W` (White), `U` (Blue), `B` (Black), `R` (Red), `G` (Green)
- Empty array represents colorless deck
- If commander is provided without colors, automatically uses commander's color identity

**Strategy Validation:**
- Maximum 50 characters
- No enum validation (flexible for different formats)
- Nullable field

#### Example Requests

**Commander Deck with Full Metadata:**
```typescript
const result = await trpc.decks.create.mutate({
  name: "Atraxa Superfriends",
  format: "Commander",
  commanderId: "123e4567-e89b-12d3-a456-426614174000",
  colors: ['W', 'U', 'B', 'G'], // WUBG identity
  strategy: "superfriends",
  description: "Proliferate and planeswalker-focused deck"
})
```

**Commander Deck with Auto-Extracted Colors:**
```typescript
// Colors will be extracted from commander's color_identity
const result = await trpc.decks.create.mutate({
  name: "Golos Lands",
  format: "Commander",
  commanderId: "456e7890-e89b-12d3-a456-426614174111",
  strategy: "lands"
})
```

**Standard Deck without Commander:**
```typescript
const result = await trpc.decks.create.mutate({
  name: "Mono Red Aggro",
  format: "Standard",
  colors: ['R'],
  strategy: "aggro"
})
```

**Backward Compatible (Existing Flow):**
```typescript
// All new fields are optional
const result = await trpc.decks.create.mutate({
  name: "My Deck",
  format: "Modern"
})
```

#### Error Responses

**Invalid Commander Card:**
```typescript
{
  code: 'BAD_REQUEST',
  message: 'Commander card not found. Please add the card to the system first.'
}
```

**Non-Legendary Commander:**
```typescript
{
  code: 'BAD_REQUEST',
  message: 'Selected card cannot be used as a commander. Only legendary creatures are valid commanders.'
}
```

**Database Error:**
```typescript
{
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Failed to validate commander'
}
```

### Update Deck

Updates an existing deck's metadata.

**Endpoint:** `decks.update`

**Method:** `mutation`

**Authentication:** Required (protectedProcedure)

#### Input Schema

```typescript
const updateDeckSchema = z.object({
  deckId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  format: z.enum([
    'Standard',
    'Modern',
    'Commander',
    'Legacy',
    'Vintage',
    'Pioneer',
    'Pauper',
    'Other'
  ]).optional(),
  collectionOnly: z.boolean().optional(),
  collectionId: z.string().uuid().optional().nullable(),
  // New commander/metadata fields
  commanderId: z.string().uuid().optional().nullable(),
  colors: z.array(z.enum(['W', 'U', 'B', 'R', 'G'])).optional(),
  strategy: z.string().max(50).optional().nullable(),
})
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deckId` | `string (UUID)` | Yes | Deck ID to update |
| All other fields from `createDeckSchema` | - | No | All fields are optional for updates |

#### Validation

Same validation rules as create endpoint, applied only to provided fields.

#### Example Requests

**Add Commander to Existing Deck:**
```typescript
const result = await trpc.decks.update.mutate({
  deckId: "deck-uuid",
  commanderId: "commander-uuid",
  format: "Commander"
})
```

**Update Strategy:**
```typescript
const result = await trpc.decks.update.mutate({
  deckId: "deck-uuid",
  strategy: "combo"
})
```

**Remove Commander:**
```typescript
const result = await trpc.decks.update.mutate({
  deckId: "deck-uuid",
  commanderId: null,
  colors: []
})
```

## Commander Validation Function

The API includes a `canBeCommander()` helper function for validation:

```typescript
interface CardForCommanderCheck {
  typeLine: string;
  supertypes: string[];
  types: string[];
  oracleText?: string | null;
}

function canBeCommander(card: CardForCommanderCheck): boolean {
  const oracleText = card.oracleText?.toLowerCase() ?? '';

  // Check for explicit "can be your commander" text
  if (oracleText.includes('can be your commander')) {
    return true;
  }

  // Legendary creatures can always be commanders
  const isLegendary = card.supertypes?.includes('Legendary') ?? false;
  const isCreature = card.types?.includes('Creature') ?? false;

  return isLegendary && isCreature;
}
```

### Validation Rules

**Valid Commanders:**
- Legendary creatures (e.g., "Legendary Creature - Dragon")
- Cards with "can be your commander" in oracle text
- Legendary planeswalkers with explicit commander text

**Invalid Commanders:**
- Non-legendary creatures
- Legendary non-creatures (enchantments, artifacts, etc.)
- Instant/sorcery spells
- Any non-legendary permanent

### Database Card Structure

The validation function expects cards with this structure:

```typescript
interface Card {
  id: string;
  name: string;
  typeLine: string;         // "Legendary Creature - Human Wizard"
  supertypes: string[];     // ["Legendary"]
  types: string[];          // ["Creature"]
  oracleText?: string | null;
  colorIdentity: string[];  // ["W", "U", "B", "R", "G"]
  // ... other card fields
}
```

## Color Identity System

### Color Enum

```typescript
const colorEnum = z.enum(['W', 'U', 'B', 'R', 'G'])
```

### Color Codes

| Code | Color | Full Name |
|------|-------|-----------|
| `W` | White | Plains |
| `U` | Blue | Island |
| `B` | Black | Swamp |
| `R` | Red | Mountain |
| `G` | Green | Forest |

### Color Identity Examples

**Mono-Color:**
```typescript
colors: ['R'] // Mono-red
```

**Two-Color (Guild):**
```typescript
colors: ['W', 'U'] // Azorius (white-blue)
colors: ['B', 'R'] // Rakdos (black-red)
```

**Three-Color (Shard/Wedge):**
```typescript
colors: ['W', 'U', 'B'] // Esper
colors: ['W', 'B', 'G'] // Abzan
```

**Four-Color:**
```typescript
colors: ['W', 'U', 'B', 'R'] // Non-green
```

**Five-Color (WUBRG):**
```typescript
colors: ['W', 'U', 'B', 'R', 'G'] // All colors
```

**Colorless:**
```typescript
colors: [] // Colorless
```

### Auto-Extraction from Commander

If `commanderId` is provided without `colors`, the API automatically extracts color identity:

```typescript
// Input
{
  commanderId: "atraxa-uuid",
  // colors not provided
}

// Commander card has colorIdentity: ['W', 'U', 'B', 'G']

// Database Insert
{
  commanderId: "atraxa-uuid",
  colors: ['W', 'U', 'B', 'G'] // Auto-extracted
}
```

## Strategy Field

The `strategy` field accepts free-form text up to 50 characters, allowing flexibility for different formats and archetypes.

### Common Commander Strategies

- `tribal` - Creature type-focused (e.g., Elves, Goblins)
- `aristocrats` - Sacrifice synergies
- `spellslinger` - Instant/sorcery-focused
- `voltron` - Single large creature
- `reanimator` - Graveyard recursion
- `control` - Controlling the game state
- `combo` - Combo wins
- `tokens` - Token generation
- `stax` - Resource denial
- `superfriends` - Planeswalker-focused
- `lands` - Land-based strategies
- `grouphug` - Helping all players
- `chaos` - Random effects

### Common Constructed Strategies

- `aggro` - Fast aggressive
- `midrange` - Value-based
- `control` - Counterspells and removal
- `combo` - Combo wins
- `tempo` - Efficient threats with disruption
- `ramp` - Mana acceleration
- `burn` - Direct damage
- `mill` - Library destruction
- `prison` - Locking opponents out

## Database Schema

The deck creation API writes to these database fields:

```typescript
// Database table: decks
{
  id: UUID,
  name: string,
  description: string | null,
  format: string | null,
  collectionOnly: boolean,
  collectionId: UUID | null,
  commanderId: UUID | null,        // FK to cards.id
  colors: string[] | null,         // Array of WUBRG
  strategy: string | null,         // Max 50 chars
  ownerId: UUID,                   // From auth context
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp | null
}
```

### Foreign Key Constraints

- `commanderId` references `cards(id)` with `ON DELETE SET NULL`
- `collectionId` references `collections(id)` with `ON DELETE SET NULL`
- `ownerId` references `users(id)` with `ON DELETE CASCADE`

### Indexes

- Primary key on `id`
- Index on `owner_id` for user deck queries
- Index on `commander_id` for commander lookups
- GIN index on `colors` for efficient array queries
- Index on `strategy` for archetype filtering
- All indexes include `WHERE deleted_at IS NULL` for soft-delete optimization

## Backward Compatibility

All new fields are optional and nullable, ensuring existing deck creation flows continue to work:

**Before (Still Works):**
```typescript
trpc.decks.create.mutate({
  name: "My Deck",
  format: "Modern"
})
```

**After (Enhanced):**
```typescript
trpc.decks.create.mutate({
  name: "My Commander Deck",
  format: "Commander",
  commanderId: "uuid",
  colors: ['W', 'U', 'B'],
  strategy: "control"
})
```

### Migration Strategy

Existing decks in the database will have:
- `commanderId: null`
- `colors: null` or `[]`
- `strategy: null`

These can be updated later via the `decks.update` endpoint.

## Testing

Unit tests are located in `/apps/api/src/router/__tests__/decks.test.ts`

### Test Coverage

**Schema Validation (8 tests):**
- Valid deck with all new fields
- Backward compatibility (optional fields)
- Invalid color values rejection
- Strategy max length validation
- Invalid UUID rejection
- Null value handling
- Empty colors array
- Five-color validation

**Commander Validation (5 tests):**
- Legendary creature (valid)
- Non-legendary creature (invalid)
- Legendary non-creature (invalid)
- "Can be your commander" oracle text (valid)
- Non-creature spell (invalid)

**Total Test Results:**
- 151/151 API tests passing (100%)
- All modified files pass type-check
- All modified files pass ESLint

## Integration Examples

### React Query Hook

```typescript
import { trpc } from '@/lib/trpc'

function CreateCommanderDeck() {
  const createDeck = trpc.decks.create.useMutation()

  const handleCreate = async (commander: ScryfallCard) => {
    try {
      const deck = await createDeck.mutateAsync({
        name: `${commander.name} EDH`,
        format: 'Commander',
        commanderId: commander.id,
        colors: commander.color_identity,
        strategy: 'control',
      })

      console.log('Deck created:', deck)
    } catch (error) {
      console.error('Failed to create deck:', error)
    }
  }

  return <CommanderSelector onSelect={handleCreate} />
}
```

### Update Commander

```typescript
function UpdateDeckCommander({ deckId }: { deckId: string }) {
  const updateDeck = trpc.decks.update.useMutation()

  const handleUpdateCommander = async (commander: ScryfallCard | null) => {
    try {
      await updateDeck.mutateAsync({
        deckId,
        commanderId: commander?.id ?? null,
        colors: commander?.color_identity ?? [],
      })
    } catch (error) {
      console.error('Failed to update commander:', error)
    }
  }

  return <CommanderSelector onSelect={handleUpdateCommander} />
}
```

## Related Documentation

- [CommanderSelector Component](../components/CommanderSelector.md)
- [Database Schema](../../schema.sql)
- [API Router Source](../../apps/api/src/router/decks.ts)

## Future Enhancements

### Partner Commander Support

Future versions may support partner commanders with multiple `commanderId` fields:

```typescript
// Potential future schema
{
  commanderIds: z.array(z.string().uuid()).optional(),
  partnerType: z.enum(['none', 'partner', 'partner-with', 'friends-forever']).optional()
}
```

### Format-Specific Validation

Enhanced validation for format-specific requirements:

```typescript
// Commander format requires commander
if (format === 'Commander' && !commanderId) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Commander format requires a commander card'
  })
}
```

### Strategy Enum

More strict strategy validation with format-specific enums:

```typescript
const CommanderStrategy = z.enum([
  'tribal', 'aristocrats', 'spellslinger', 'voltron',
  'reanimator', 'control', 'combo', 'tokens', 'stax'
])

const ConstructedStrategy = z.enum([
  'aggro', 'midrange', 'control', 'combo', 'tempo', 'ramp'
])
```
