# Type System Documentation

This document describes the TypeScript type system for deck strategies, color identities, and format validation in the TCG Tracker application.

## Overview

The type system provides:
- Format-specific deck strategy enums
- Color identity types and parsing
- Runtime validation for strategy/format combinations
- Compile-time type safety across all packages

**Package:** `@tcg-tracker/types`
**Location:** `/packages/types/src/index.ts`

## Strategy Types

### CommanderStrategy

Enum of deck strategies specific to multiplayer Commander (EDH) and Brawl formats.

```typescript
enum CommanderStrategy {
  Tribal = 'tribal',
  Aristocrats = 'aristocrats',
  Spellslinger = 'spellslinger',
  Voltron = 'voltron',
  Stax = 'stax',
  Combo = 'combo',
  Tokens = 'tokens',
  Reanimator = 'reanimator',
  Lands = 'lands',
  Vehicles = 'vehicles',
  Artifacts = 'artifacts',
  Enchantments = 'enchantments',
  Superfriends = 'superfriends',
  GroupHug = 'group_hug',
  Chaos = 'chaos',
  Stompy = 'stompy',
  Politics = 'politics',
  Midrange = 'midrange',
}
```

#### Strategy Descriptions

**Tribal**
- Focus: Creature type synergy
- Examples: Elves, Dragons, Zombies, Vampires
- Key cards: Lords, type-specific payoffs

**Aristocrats**
- Focus: Sacrifice and death triggers
- Strategy: Generate value from creatures dying
- Key cards: Blood Artist, Zulaport Cutthroat

**Spellslinger**
- Focus: Instant and sorcery spells
- Strategy: Cast many non-creature spells with payoffs
- Key cards: Talrand, Young Pyromancer, Guttersnipe

**Voltron**
- Focus: Commander damage
- Strategy: Stack equipment/auras on commander
- Key cards: Swords, boots, auras granting protection

**Stax**
- Focus: Resource denial
- Strategy: Prevent opponents from executing their gameplan
- Key cards: Winter Orb, Sphere of Resistance, Rule of Law

**Combo**
- Focus: Infinite combos
- Strategy: Assemble specific card combinations for instant wins
- Key cards: Thoracle, Demonic Consultation, Kikki-Jiki combos

**Tokens**
- Focus: Token generation
- Strategy: Go-wide with many small creatures
- Key cards: Doubling Season, Anointed Procession

**Reanimator**
- Focus: Graveyard recursion
- Strategy: Cheat big creatures from graveyard into play
- Key cards: Reanimate, Animate Dead, Living Death

**Lands**
- Focus: Land-based synergies
- Strategy: Extra land drops, landfall triggers
- Key cards: Azusa, Tatyova, Scapeshift

**Vehicles**
- Focus: Vehicle tribal
- Strategy: Crew and attack with artifact vehicles
- Key cards: Depala, Greasefang

**Artifacts**
- Focus: Artifact synergies
- Strategy: Artifact cost reduction, recursion
- Key cards: Urza, Breya, artifact payoffs

**Enchantments**
- Focus: Enchantment synergies
- Strategy: Enchantress effects, constellation
- Key cards: Sythis, Sanctum Weaver

**Superfriends**
- Focus: Planeswalkers
- Strategy: Protect and ultimate planeswalkers
- Key cards: The Chain Veil, Doubling Season, proliferate

**Group Hug**
- Focus: Symmetrical benefits
- Strategy: Political play through group draw/ramp
- Key cards: Howling Mine, Mana Flare

**Chaos**
- Focus: Random/chaotic effects
- Strategy: Unpredictable board states
- Key cards: Warp World, Scrambleverse

**Stompy**
- Focus: Big creatures
- Strategy: Ramp into large threats
- Key cards: Craterhoof Behemoth, Ghalta

**Politics**
- Focus: Multiplayer interaction
- Strategy: Deal-making and kingmaking
- Key cards:Zedruu, Council's Judgment

**Midrange**
- Focus: Value and flexibility
- Strategy: Efficient creatures and value engines
- Key cards: Card advantage engines, removal

### ConstructedStrategy

Enum of deck strategies for 1v1 constructed formats (Standard, Modern, Pioneer, Legacy, Vintage, Pauper).

```typescript
enum ConstructedStrategy {
  Aggro = 'aggro',
  Control = 'control',
  Midrange = 'midrange',
  Combo = 'combo',
  Tribal = 'tribal',
  Tempo = 'tempo',
  Ramp = 'ramp',
  Burn = 'burn',
  Mill = 'mill',
  Prison = 'prison',
}
```

#### Strategy Descriptions

**Aggro**
- Focus: Fast damage
- Strategy: Low-curve efficient creatures, close games quickly
- Speed: Wins turns 3-5

**Control**
- Focus: Late game
- Strategy: Counter/remove threats, win with finishers
- Speed: Wins turns 10+

**Midrange**
- Focus: Value and flexibility
- Strategy: Efficient creatures and removal
- Speed: Wins turns 6-8

**Combo**
- Focus: Specific card combinations
- Strategy: Assemble combo pieces for instant win
- Speed: Varies by combo

**Tribal**
- Focus: Creature type synergy
- Strategy: Build around creature type with lords
- Examples: Humans, Goblins, Elves

**Tempo**
- Focus: Efficient threats + disruption
- Strategy: Deploy cheap threats, protect with counters
- Examples: Delver, Monkey

**Ramp**
- Focus: Mana acceleration
- Strategy: Accelerate to big payoffs early
- Key cards: Rampant Growth, Llanowar Elves

**Burn**
- Focus: Direct damage
- Strategy: Deal 20 damage with burn spells
- Key cards: Lightning Bolt, Lava Spike

**Mill**
- Focus: Library depletion
- Strategy: Force opponent to draw from empty library
- Key cards: Glimpse the Unthinkable, Ruin Crab

**Prison**
- Focus: Resource lock
- Strategy: Prevent opponent from playing the game
- Key cards: Ensnaring Bridge, Chalice of the Void

### DeckStrategy

Union type of all possible strategy values.

```typescript
type DeckStrategy = CommanderStrategy | ConstructedStrategy;
```

## Color Types

### ManaColor

Individual mana color represented as single character.

```typescript
type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G';
```

**Color Mapping:**
- `W` = White (Plains)
- `U` = Blue (Island)
- `B` = Black (Swamp)
- `R` = Red (Mountain)
- `G` = Green (Forest)

**Note:** Uses 'U' for blue to avoid confusion with 'B' (black) in MTG notation.

### ColorIdentity

Array of mana colors representing a deck's color identity.

```typescript
type ColorIdentity = ManaColor[];
```

**Examples:**
```typescript
const monoWhite: ColorIdentity = ['W'];
const azorius: ColorIdentity = ['W', 'U'];
const jund: ColorIdentity = ['B', 'R', 'G'];
const fiveColor: ColorIdentity = ['W', 'U', 'B', 'R', 'G'];
const colorless: ColorIdentity = [];
```

**Common Color Combinations:**
- Allied pairs: WU (Azorius), UB (Dimir), BR (Rakdos), RG (Gruul), GW (Selesnya)
- Enemy pairs: WB (Orzhov), UR (Izzet), BG (Golgari), RW (Boros), GU (Simic)
- Shards: WUG (Bant), UBR (Grixis), BRG (Jund), RGW (Naya), GWU (Esper)
- Wedges: WBG (Abzan), URW (Jeskai), BGU (Sultai), RWB (Mardu), GUR (Temur)

## Format Types

### DeckFormat

Supported Magic: The Gathering formats.

```typescript
type DeckFormat =
  | 'commander'
  | 'standard'
  | 'modern'
  | 'pioneer'
  | 'legacy'
  | 'vintage'
  | 'pauper'
  | 'brawl';
```

**Format Characteristics:**

**Commander**
- Multiplayer (typically 4 players)
- 100-card singleton
- Uses CommanderStrategy enum
- Color identity restrictions

**Brawl**
- 1v1 or multiplayer
- 60-card singleton
- Uses CommanderStrategy enum
- Standard-legal cards only

**Standard**
- 1v1 competitive
- 60-card minimum
- Uses ConstructedStrategy enum
- Most recent sets only

**Modern**
- 1v1 competitive
- 60-card minimum
- Uses ConstructedStrategy enum
- Cards from 8th Edition forward

**Pioneer**
- 1v1 competitive
- 60-card minimum
- Uses ConstructedStrategy enum
- Cards from Return to Ravnica forward

**Legacy**
- 1v1 competitive
- 60-card minimum
- Uses ConstructedStrategy enum
- All cards (with banned list)

**Vintage**
- 1v1 competitive
- 60-card minimum
- Uses ConstructedStrategy enum
- All cards (with restricted list)

**Pauper**
- 1v1 competitive
- 60-card minimum
- Uses ConstructedStrategy enum
- Commons only

## Utility Functions

### parseColorIdentity

Parse color string into typed ColorIdentity array.

```typescript
function parseColorIdentity(colors: string): ColorIdentity
```

**Parameters:**
- `colors` - Color string using WUBRG notation (e.g., "WU", "BRG")

**Returns:**
- `ColorIdentity` - Typed array of valid ManaColor values

**Behavior:**
- Case-insensitive input
- Filters invalid characters
- Validates against WUBRG color set
- Returns empty array for colorless

**Examples:**
```typescript
parseColorIdentity("WU")      // → ['W', 'U']
parseColorIdentity("WUBRG")   // → ['W', 'U', 'B', 'R', 'G']
parseColorIdentity("")        // → []
parseColorIdentity("wubg")    // → ['W', 'U', 'B', 'G'] (case-insensitive)
parseColorIdentity("WXU")     // → ['W', 'U'] (invalid 'X' filtered)
```

**Type Safety:**
```typescript
const colors = parseColorIdentity("WU");
// colors is ColorIdentity, not string[]
// TypeScript knows it only contains 'W' | 'U' | 'B' | 'R' | 'G'
```

### isValidStrategyForFormat

Validate that a strategy is appropriate for a given format.

```typescript
function isValidStrategyForFormat(
  format: DeckFormat,
  strategy: DeckStrategy
): boolean
```

**Parameters:**
- `format` - The deck format (commander, standard, modern, etc.)
- `strategy` - The strategy to validate

**Returns:**
- `boolean` - `true` if strategy is valid for format

**Validation Rules:**
- Commander/Brawl formats accept only CommanderStrategy values
- Other formats accept only ConstructedStrategy values
- Prevents invalid combinations like Commander strategies in Standard

**Examples:**
```typescript
// Valid combinations
isValidStrategyForFormat('commander', CommanderStrategy.Tribal)    // → true
isValidStrategyForFormat('standard', ConstructedStrategy.Aggro)    // → true
isValidStrategyForFormat('modern', ConstructedStrategy.Control)    // → true

// Invalid combinations
isValidStrategyForFormat('commander', ConstructedStrategy.Aggro)   // → false
isValidStrategyForFormat('standard', CommanderStrategy.Voltron)    // → false
isValidStrategyForFormat('modern', CommanderStrategy.Stax)         // → false
```

**Usage in Validation:**
```typescript
function validateDeck(deck: Deck): string[] {
  const errors: string[] = [];

  if (deck.strategy && !isValidStrategyForFormat(deck.format, deck.strategy)) {
    errors.push(`Strategy '${deck.strategy}' is not valid for ${deck.format} format`);
  }

  return errors;
}
```

## Usage Examples

### Creating a Commander Deck

```typescript
import { CommanderStrategy, parseColorIdentity } from '@tcg-tracker/types';

const deck = {
  name: "Ur-Dragon Tribal",
  format: 'commander',
  commanderId: '12345-uuid-for-ur-dragon',
  colors: parseColorIdentity('WUBRG'),  // Five-color
  strategy: CommanderStrategy.Tribal,
};
```

### Creating a Standard Deck

```typescript
import { ConstructedStrategy, parseColorIdentity } from '@tcg-tracker/types';

const deck = {
  name: "Mono-Red Aggro",
  format: 'standard',
  colors: parseColorIdentity('R'),
  strategy: ConstructedStrategy.Aggro,
};
```

### Validating User Input

```typescript
import { isValidStrategyForFormat, DeckFormat, DeckStrategy } from '@tcg-tracker/types';

function validateDeckStrategy(
  format: DeckFormat,
  strategy: string
): { valid: boolean; error?: string } {
  // Check if strategy is valid for format
  if (!isValidStrategyForFormat(format, strategy as DeckStrategy)) {
    return {
      valid: false,
      error: `Strategy '${strategy}' is not valid for ${format} format`
    };
  }

  return { valid: true };
}
```

### Filtering Decks by Color Identity

```typescript
import { ColorIdentity, parseColorIdentity } from '@tcg-tracker/types';

function filterDecksByColors(decks: Deck[], colors: string): Deck[] {
  const targetColors = parseColorIdentity(colors);

  return decks.filter(deck => {
    // Check if deck colors match target colors exactly
    return (
      deck.colors.length === targetColors.length &&
      deck.colors.every(c => targetColors.includes(c))
    );
  });
}

// Find all Azorius (WU) decks
const azoriusDecks = filterDecksByColors(allDecks, 'WU');
```

### Strategy Selection UI

```typescript
import { CommanderStrategy, ConstructedStrategy } from '@tcg-tracker/types';

function getStrategiesForFormat(format: DeckFormat): string[] {
  if (format === 'commander' || format === 'brawl') {
    return Object.values(CommanderStrategy);
  }
  return Object.values(ConstructedStrategy);
}

// In a React component
const strategyOptions = getStrategiesForFormat(deckFormat).map(strategy => ({
  value: strategy,
  label: strategy.charAt(0).toUpperCase() + strategy.slice(1),
}));
```

## Type Safety Patterns

### Type Guards

Use TypeScript type guards to narrow strategy types:

```typescript
import { CommanderStrategy, ConstructedStrategy } from '@tcg-tracker/types';

function isCommanderStrategy(strategy: string): strategy is CommanderStrategy {
  return Object.values(CommanderStrategy).includes(strategy as CommanderStrategy);
}

function isConstructedStrategy(strategy: string): strategy is ConstructedStrategy {
  return Object.values(ConstructedStrategy).includes(strategy as ConstructedStrategy);
}

// Usage
const strategy: string = userInput;
if (isCommanderStrategy(strategy)) {
  // TypeScript knows strategy is CommanderStrategy
  console.log(`Valid commander strategy: ${strategy}`);
}
```

### Exhaustive Switch

Use exhaustive switch statements for strategy handling:

```typescript
function getStrategyIcon(strategy: CommanderStrategy): string {
  switch (strategy) {
    case CommanderStrategy.Tribal:
      return '🦎';
    case CommanderStrategy.Aristocrats:
      return '💀';
    case CommanderStrategy.Spellslinger:
      return '⚡';
    // ... all other cases
    default:
      // TypeScript will error if any case is missing
      const _exhaustive: never = strategy;
      return '❓';
  }
}
```

## Package Configuration

### package.json

```json
{
  "name": "@tcg-tracker/types",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "types": "./dist/index.d.ts"
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

## Testing

### Example Test Cases

```typescript
import { describe, it, expect } from 'bun:test';
import {
  parseColorIdentity,
  isValidStrategyForFormat,
  CommanderStrategy,
  ConstructedStrategy,
} from '@tcg-tracker/types';

describe('parseColorIdentity', () => {
  it('parses valid color strings', () => {
    expect(parseColorIdentity('WU')).toEqual(['W', 'U']);
    expect(parseColorIdentity('WUBRG')).toEqual(['W', 'U', 'B', 'R', 'G']);
  });

  it('handles case insensitive input', () => {
    expect(parseColorIdentity('wubg')).toEqual(['W', 'U', 'B', 'G']);
  });

  it('filters invalid characters', () => {
    expect(parseColorIdentity('WXU')).toEqual(['W', 'U']);
  });

  it('returns empty array for colorless', () => {
    expect(parseColorIdentity('')).toEqual([]);
  });
});

describe('isValidStrategyForFormat', () => {
  it('allows commander strategies in commander format', () => {
    expect(isValidStrategyForFormat('commander', CommanderStrategy.Tribal)).toBe(true);
  });

  it('allows constructed strategies in standard format', () => {
    expect(isValidStrategyForFormat('standard', ConstructedStrategy.Aggro)).toBe(true);
  });

  it('blocks commander strategies in standard format', () => {
    expect(isValidStrategyForFormat('standard', CommanderStrategy.Voltron)).toBe(false);
  });

  it('blocks constructed strategies in commander format', () => {
    expect(isValidStrategyForFormat('commander', ConstructedStrategy.Aggro)).toBe(false);
  });
});
```

## Future Enhancements

### Potential Additions

1. **Color Combination Utilities**
   - `getColorName()` - Convert colors to guild/shard names
   - `isSubsetOf()` - Check if colors are subset of another identity

2. **Strategy Metadata**
   - Add icons/emoji for each strategy
   - Add descriptions for UI tooltips
   - Add related card type filters

3. **Format Metadata**
   - Card pool size estimates
   - Popular strategies per format
   - Format-specific validation rules

4. **Advanced Validation**
   - Color identity subset checking for partners
   - Companion validation
   - Deck size validation per format

## References

- [MTG Color Pie Philosophy](https://mtg.fandom.com/wiki/Color)
- [Commander Format Rules](https://mtg.fandom.com/wiki/Commander_(format))
- [MTG Competitive Formats](https://magic.wizards.com/en/formats)
- [EDHREC Archetypes](https://edhrec.com/archetypes)
