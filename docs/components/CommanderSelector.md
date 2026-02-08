# CommanderSelector Component

## Overview

The `CommanderSelector` component is a reusable dialog component for selecting and managing commanders in MTG deck building. It provides a streamlined interface for searching legendary creatures, displaying color identity, and validating commander eligibility.

**Location:** `/apps/web/src/components/decks/CommanderSelector.tsx`

## Features

- **Legendary Creature Filtering**: Automatically validates that selected cards can be commanders
- **Color Identity Display**: Shows commander color identity with WUBRG mana color badges
- **Visual Preview**: Displays card image, type line, and metadata
- **Commander Validation**: Checks for legendary creature type or "can be your commander" oracle text
- **Remove Commander**: Dedicated action to clear commander selection
- **Future-Proof Design**: Architecture supports partner commanders (single implementation)

## Props

```typescript
interface CommanderSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentCommander?: {
    id: string
    name: string
    imageUrl?: string
    colorIdentity?: string[]
  } | null
  onSelect: (commander: ScryfallCard | null) => void
}
```

### Prop Details

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | Yes | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | Yes | Callback when dialog open state changes |
| `currentCommander` | `object \| null` | No | Currently selected commander to display |
| `currentCommander.id` | `string` | Yes* | Card UUID (*required if currentCommander provided) |
| `currentCommander.name` | `string` | Yes* | Card name (*required if currentCommander provided) |
| `currentCommander.imageUrl` | `string` | No | Card image URL |
| `currentCommander.colorIdentity` | `string[]` | No | WUBRG color array (e.g., `['W', 'U', 'B']`) |
| `onSelect` | `(commander: ScryfallCard \| null) => void` | Yes | Callback when commander is selected or removed |

## ScryfallCard Interface

The component uses and returns this interface:

```typescript
interface ScryfallCard {
  id: string
  name: string
  set_name: string
  set: string
  collector_number: string
  rarity: string
  image_uris?: {
    small?: string
    normal?: string
  }
  mana_cost?: string
  type_line: string
  color_identity?: string[]
}
```

## Usage Examples

### Basic Usage

```tsx
import { CommanderSelector } from '@/components/decks/CommanderSelector'
import { useState } from 'react'

function DeckBuilder() {
  const [isOpen, setIsOpen] = useState(false)
  const [commander, setCommander] = useState(null)

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Select Commander
      </button>

      <CommanderSelector
        open={isOpen}
        onOpenChange={setIsOpen}
        currentCommander={commander}
        onSelect={(selected) => {
          setCommander(selected)
          console.log('Commander selected:', selected)
        }}
      />
    </>
  )
}
```

### With Existing Commander

```tsx
import { CommanderSelector } from '@/components/decks/CommanderSelector'

function EditDeck({ deck }) {
  const [isOpen, setIsOpen] = useState(false)

  const currentCommander = deck.commander ? {
    id: deck.commander.id,
    name: deck.commander.name,
    imageUrl: deck.commander.imageUrl,
    colorIdentity: deck.commander.colorIdentity,
  } : null

  const handleCommanderChange = (selected) => {
    if (selected) {
      // Update deck with new commander
      updateDeck({
        commanderId: selected.id,
        colors: selected.color_identity,
      })
    } else {
      // Remove commander from deck
      updateDeck({
        commanderId: null,
        colors: [],
      })
    }
  }

  return (
    <CommanderSelector
      open={isOpen}
      onOpenChange={setIsOpen}
      currentCommander={currentCommander}
      onSelect={handleCommanderChange}
    />
  )
}
```

## Commander Validation

The component includes a `canBeCommander()` validation function that checks:

1. **Legendary Creatures**: Cards with both "Legendary" supertype and "Creature" type
2. **Legendary Planeswalkers**: Planeswalkers that can be commanders (future-proof)

```typescript
const canBeCommander = (card: ScryfallCard): boolean => {
  const typeLine = card.type_line.toLowerCase()

  // Check for legendary creature
  const isLegendary = typeLine.includes('legendary')
  const isCreature = typeLine.includes('creature')

  if (isLegendary && isCreature) {
    return true
  }

  // Some planeswalkers can be commanders
  const isPlaneswalker = typeLine.includes('planeswalker')
  if (isLegendary && isPlaneswalker) {
    return true
  }

  return false
}
```

### Valid Commanders

- Legendary Creature - Human Wizard
- Legendary Creature - Dragon
- Legendary Planeswalker (some special cases)

### Invalid Commanders

- Creature - Goblin (not legendary)
- Legendary Enchantment (not a creature)
- Instant or Sorcery (any type)

## Color Identity Display

The component displays color identity using color-coded badges:

| Color | Badge Class | Example |
|-------|-------------|---------|
| White (W) | Yellow with yellow border | `bg-yellow-100/20 text-yellow-300 border-yellow-300/30` |
| Blue (U) | Blue with blue border | `bg-blue-400/20 text-blue-300 border-blue-300/30` |
| Black (B) | Gray with gray border | `bg-gray-700/20 text-gray-300 border-gray-300/30` |
| Red (R) | Red with red border | `bg-red-400/20 text-red-300 border-red-300/30` |
| Green (G) | Green with green border | `bg-green-400/20 text-green-300 border-green-300/30` |
| Colorless | Gray | `bg-gray-500/20 text-gray-400 border-gray-400/30` |

### Color Names Mapping

```typescript
const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
}
```

## Component Behavior

### User Flow

1. **Open Dialog**: User clicks trigger to open commander selection
2. **Search**: User searches for legendary creatures using `CardSearch`
3. **Validation**: Component validates selected card can be commander
4. **Preview**: Card preview shows with image, type line, and color identity
5. **Confirm/Cancel**:
   - **Set Commander**: Confirms selection and closes dialog
   - **Remove Commander**: Clears commander and closes dialog
   - **Cancel**: Closes dialog without changes

### State Management

```typescript
const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null)
```

- `selectedCard`: Temporary selection before confirmation
- `currentCommander`: Persisted commander from parent component
- Dialog shows `selectedCard` if present, otherwise `currentCommander`

### Callbacks

**handleCardSelect(card)**
- Called when user selects a card from search
- Validates card with `canBeCommander()`
- Updates temporary `selectedCard` state
- Silently ignores invalid commanders (could show toast notification)

**handleConfirm()**
- Calls `onSelect(selectedCard)` with selected card
- Clears temporary state
- Closes dialog

**handleClear()**
- Calls `onSelect(null)` to remove commander
- Clears temporary state
- Closes dialog

**handleClose()**
- Clears temporary state
- Closes dialog without changes

## Styling

The component uses Tailwind CSS with custom color classes:

```tsx
<Dialog open={open} onOpenChange={handleClose}>
  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```

### Key Style Classes

- **Dialog**: `sm:max-w-[600px] max-h-[90vh] overflow-y-auto`
- **Card Preview**: `p-4 border border-accent-cyan/30 rounded-lg bg-surface-elevated space-y-3`
- **Card Image**: `w-24 h-auto rounded shadow-lg`
- **Color Badges**: Dynamic classes from `getColorBadgeClass()`
- **Remove Button**: `text-red-400 hover:text-red-300`

## Integration with CardSearch

The component integrates with the existing `CardSearch` component:

```tsx
<CardSearch
  onCardSelect={handleCardSelect}
  placeholder="Search for legendary creatures..."
/>
```

**Note:** `CardSearch` performs the actual Scryfall API search. The `CommanderSelector` adds validation on top of the search results.

## Future Enhancements

### Partner Commanders

The component is designed to support partner commanders in the future:

```typescript
// Future: Support multiple commanders
interface CommanderSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentCommanders?: Array<{
    id: string
    name: string
    imageUrl?: string
    colorIdentity?: string[]
  }> | null
  onSelect: (commanders: ScryfallCard[] | null) => void
  allowPartner?: boolean // Enable partner commander selection
}
```

### Oracle Text Validation

Currently, the component doesn't have access to oracle text in the `ScryfallCard` interface. Future versions could add:

```typescript
interface ScryfallCard {
  // ... existing fields
  oracle_text?: string
}

// Enhanced validation
const canBeCommander = (card: ScryfallCard): boolean => {
  const oracleText = card.oracle_text?.toLowerCase() ?? ''

  if (oracleText.includes('can be your commander')) {
    return true
  }

  // ... rest of validation
}
```

### Toast Notifications

Add user feedback for invalid commander selections:

```typescript
import { toast } from '@/components/ui/use-toast'

const handleCardSelect = useCallback((card: ScryfallCard) => {
  if (!canBeCommander(card)) {
    toast({
      title: 'Invalid Commander',
      description: 'Only legendary creatures can be commanders.',
      variant: 'destructive',
    })
    return
  }
  setSelectedCard(card)
}, [])
```

## Testing

The component's validation logic is thoroughly tested in `/apps/api/src/router/__tests__/decks.test.ts`:

```typescript
describe('canBeCommander validation logic', () => {
  it('should return true for legendary creature', () => {
    const card = {
      typeLine: 'Legendary Creature - Human Wizard',
      supertypes: ['Legendary'],
      types: ['Creature'],
      oracleText: null,
    }
    expect(canBeCommander(card)).toBe(true)
  })

  it('should return false for non-legendary creature', () => {
    const card = {
      typeLine: 'Creature - Human Wizard',
      supertypes: [],
      types: ['Creature'],
      oracleText: null,
    }
    expect(canBeCommander(card)).toBe(false)
  })

  // ... more tests
})
```

## Related Components

- **CardSearch** (`/apps/web/src/components/cards/CardSearch.tsx`) - Search interface
- **CardDetailModal** (`/apps/web/src/components/cards/CardDetailModal.tsx`) - Color badge patterns
- **DeckDialog** (`/apps/web/src/components/decks/DeckDialog.tsx`) - Deck creation flow

## API Integration

See [Deck Creation API Documentation](../api/deck-creation.md) for backend integration details.
