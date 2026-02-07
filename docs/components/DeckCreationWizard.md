# Multi-Step Deck Creation Wizard

## Overview

The multi-step deck creation wizard provides a guided experience for creating new decks with format-specific metadata collection. The wizard intelligently branches based on format selection to collect relevant information for Commander decks (commander selection) versus Constructed decks (color selection).

## Components

### DeckDialog (Main Component)

**File:** `apps/web/src/components/decks/DeckDialog.tsx`

The main dialog component that orchestrates the multi-step wizard flow.

#### Features

- **3-Step Wizard Flow:**
  - Step 1: Basic Info (name, description, format)
  - Step 2: Format-Specific (commander/strategy OR colors/strategy)
  - Step 3: Collection Settings (collection link, collection-only mode)
- **Smart Validation:** Next button disabled until required fields complete
- **Step Persistence:** Form state maintained when navigating between steps
- **Backward Compatibility:** Edit mode displays all fields on single page
- **Visual Progress:** Step indicator shows current position and completed steps

#### Props

```typescript
interface DeckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId?: string
}
```

#### Usage

```tsx
import { DeckDialog } from '@/components/decks/DeckDialog'

function MyComponent() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <DeckDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
    />
  )
}
```

#### Form Schema

```typescript
const deckFormSchema = z.object({
  name: z.string().min(1, 'Deck name is required').max(255),
  description: z.string().max(1000).optional(),
  format: z.enum(['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other']).optional(),
  collectionOnly: z.boolean().default(false),
  collectionId: z.string().uuid().optional().nullable(),
  colors: z.array(z.enum(['W', 'U', 'B', 'R', 'G'])).default([]),
  strategy: z.string().max(50).optional().nullable(),
  // Internal fields (not sent to API)
  _selectedCommander: z.any().optional().nullable(),
  _commanderScryfallId: z.string().optional().nullable(),
})
```

#### Step Validation Logic

**Step 1 → Step 2:**
- `name` must be non-empty
- `format` must be selected

**Step 2 → Step 3:**
- No hard validation (commander and strategy are optional)
- User can proceed to review summary

**Step 3 → Submit:**
- All validation rules from schema apply

#### Commander Integration

When a commander is selected in Step 2:

1. Commander stored in `_selectedCommander` (full Scryfall object)
2. Scryfall ID stored in `_commanderScryfallId`
3. Color identity auto-extracted to `colors` field
4. On submit, deck created first, then commander added via `addCard` mutation

```typescript
// After deck creation
if (_commanderScryfallId && newDeck) {
  await addCardMutation.mutateAsync({
    deckId: newDeck.id,
    cardId: _commanderScryfallId,
    quantity: 1,
    cardType: 'commander',
  })
}
```

---

### ColorPicker Component

**File:** `apps/web/src/components/decks/ColorPicker.tsx`

A reusable component for selecting Magic: The Gathering mana colors.

#### Features

- **WUBRG Color Buttons:** Visual mana color circles with accurate Magic color scheme
- **Toggle Selection:** Click to add/remove colors
- **Visual Feedback:** Selected colors show ring indicator and scale effect
- **Color Count Display:** Shows mono-color, two-color, etc. based on selection
- **Accessibility:** Full ARIA label support with pressed states
- **State Management:** Controlled component with `value` and `onChange` props

#### Props

```typescript
interface ColorPickerProps {
  value: string[]              // Array of selected colors: ['W', 'U', 'B', 'R', 'G']
  onChange: (colors: string[]) => void
  disabled?: boolean           // Disable all interactions
  readOnly?: boolean           // Display-only mode
}
```

#### Usage

```tsx
import { ColorPicker } from '@/components/decks/ColorPicker'

function MyForm() {
  const [colors, setColors] = useState<string[]>([])

  return (
    <ColorPicker
      value={colors}
      onChange={setColors}
    />
  )
}
```

#### Color Scheme

| Color | Symbol | Background | Text | Border |
|-------|--------|------------|------|--------|
| White | W | yellow-100 | yellow-900 | yellow-300 |
| Blue | U | blue-400 | blue-900 | blue-500 |
| Black | B | gray-700 | gray-100 | gray-500 |
| Red | R | red-500 | red-100 | red-600 |
| Green | G | green-500 | green-100 | green-600 |

#### ColorIdentityDisplay Component

Display-only version for showing commander color identity.

```typescript
interface ColorIdentityDisplayProps {
  colors: string[]  // Array of color codes: ['W', 'U', 'B', 'R', 'G']
}
```

**Usage:**

```tsx
import { ColorIdentityDisplay } from '@/components/decks/ColorPicker'

<ColorIdentityDisplay colors={['W', 'U', 'B']} />
// Renders: [W] [U] [B] badges
```

---

### CommanderDeckForm Component

**File:** `apps/web/src/components/decks/CommanderDeckForm.tsx`

Format-specific form for Commander decks. Appears as Step 2 when "Commander" format is selected.

#### Features

- **Commander Selection:** Integrates `CommanderSelector` component
- **Visual Commander Card:** Displays selected commander with image and color identity
- **Auto Color Identity:** Extracts color identity from selected commander
- **Commander Strategies:** 12 Commander-specific strategy options
- **Edit Commander:** Change selected commander without losing form state

#### Props

```typescript
interface CommanderDeckFormProps {
  form: UseFormReturn<any>  // react-hook-form instance
  disabled?: boolean         // Disable all inputs
}
```

#### Commander Strategies

1. **Aggro** - Fast, aggressive creatures
2. **Control** - Counterspells and removal
3. **Combo** - Win through card combinations
4. **Midrange** - Balanced value creatures
5. **Stax** - Resource denial
6. **Tokens** - Go wide with creature tokens
7. **Voltron** - Commander damage wins
8. **Aristocrats** - Sacrifice synergies
9. **Spellslinger** - Instants and sorceries
10. **Tribal** - Creature type synergies
11. **Reanimator** - Graveyard recursion
12. **Landfall** - Land-based triggers

#### Usage

```tsx
import { CommanderDeckForm } from '@/components/decks/CommanderDeckForm'
import { useForm } from 'react-hook-form'

function WizardStep2() {
  const form = useForm()

  return <CommanderDeckForm form={form} />
}
```

#### Commander Selection Flow

1. User clicks "Select a Commander..." button
2. `CommanderSelector` dialog opens
3. User searches for legendary creature using `CardSearch`
4. On selection:
   - `_selectedCommander` stores full Scryfall card object
   - `_commanderScryfallId` stores Scryfall ID
   - `colors` auto-filled from `color_identity`
5. Commander card preview displays with edit button

---

### ConstructedDeckForm Component

**File:** `apps/web/src/components/decks/ConstructedDeckForm.tsx`

Format-specific form for Constructed decks (Standard, Modern, Pioneer, etc.). Appears as Step 2 when non-Commander format is selected.

#### Features

- **Color Selection:** Manual color picking with `ColorPicker` component
- **Constructed Strategies:** 10 strategies optimized for 60-card formats
- **Optional Fields:** Colors and strategy are optional

#### Props

```typescript
interface ConstructedDeckFormProps {
  form: UseFormReturn<any>  // react-hook-form instance
  disabled?: boolean         // Disable all inputs
}
```

#### Constructed Strategies

1. **Aggro** - Fast, aggressive creatures
2. **Control** - Counterspells and removal
3. **Combo** - Win through card combinations
4. **Midrange** - Balanced value creatures
5. **Tempo** - Efficient threats with disruption
6. **Ramp** - Accelerate into big threats
7. **Burn** - Direct damage spells
8. **Mill** - Win by emptying library
9. **Tokens** - Go wide with creature tokens
10. **Tribal** - Creature type synergies

#### Usage

```tsx
import { ConstructedDeckForm } from '@/components/decks/ConstructedDeckForm'
import { useForm } from 'react-hook-form'

function WizardStep2() {
  const form = useForm()

  return <ConstructedDeckForm form={form} />
}
```

---

## Wizard Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Step 1: Basic Info                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ • Deck Name (required)                                │  │
│  │ • Description (optional)                              │  │
│  │ • Format (required)                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓ Next                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────┴────────────────┐
            ↓                                ↓
┌────────────────────────────┐  ┌────────────────────────────┐
│  Step 2: Commander Format  │  │ Step 2: Constructed Format │
│  ┌──────────────────────┐  │  │  ┌──────────────────────┐  │
│  │ • Commander Select   │  │  │  │ • Color Picker      │  │
│  │ • Color Identity     │  │  │  │ • Strategy Select   │  │
│  │   (auto-extracted)   │  │  │  │                     │  │
│  │ • Strategy Dropdown  │  │  │  │                     │  │
│  └──────────────────────┘  │  │  └──────────────────────┘  │
│         ↓ Next              │  │         ↓ Next              │
└────────────────────────────┘  └────────────────────────────┘
            │                                │
            └───────────────┬────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Step 3: Collection Settings                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ • Summary (name, format, colors, strategy)            │  │
│  │ • Collection Link (optional)                          │  │
│  │ • Collection-Only Mode (toggle)                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                         ↓ Create Deck                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Guide

### Adding the Wizard to a Page

```tsx
import { useState } from 'react'
import { DeckDialog } from '@/components/decks/DeckDialog'
import { Button } from '@/components/ui/button'

export function DecksPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  return (
    <div>
      <Button onClick={() => setCreateDialogOpen(true)}>
        Create New Deck
      </Button>

      <DeckDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}
```

### Editing an Existing Deck

```tsx
import { DeckDialog } from '@/components/decks/DeckDialog'

export function DeckDetailPage({ deckId }: { deckId: string }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  return (
    <div>
      <Button onClick={() => setEditDialogOpen(true)}>
        Edit Deck
      </Button>

      {/* Edit mode: shows all fields on single page */}
      <DeckDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        deckId={deckId}
      />
    </div>
  )
}
```

---

## API Integration

### Deck Creation Mutation

```typescript
// Internal form values
const formValues = {
  name: "My Commander Deck",
  description: "Atraxa Superfriends",
  format: "Commander",
  collectionOnly: false,
  collectionId: null,
  colors: ['W', 'U', 'B', 'G'],
  strategy: "voltron",
  _selectedCommander: { /* Scryfall card object */ },
  _commanderScryfallId: "abc123"
}

// Values sent to API (internal fields removed)
const apiValues = {
  name: "My Commander Deck",
  description: "Atraxa Superfriends",
  format: "Commander",
  collectionOnly: false,
  collectionId: null,
  colors: ['W', 'U', 'B', 'G'],
  strategy: "voltron"
}

// Create deck
const newDeck = await createMutation.mutateAsync(apiValues)

// Add commander card (if selected)
if (_commanderScryfallId) {
  await addCardMutation.mutateAsync({
    deckId: newDeck.id,
    cardId: _commanderScryfallId,
    quantity: 1,
    cardType: 'commander'
  })
}
```

### Deck Update Mutation

```typescript
// Update uses same schema but includes deckId
const updateValues = {
  deckId: "deck-uuid",
  name: "Updated Deck Name",
  description: "Updated description",
  format: "Commander",
  colors: ['W', 'U'],
  strategy: "control",
  collectionOnly: true,
  collectionId: "collection-uuid"
}

await updateMutation.mutateAsync(updateValues)
```

---

## Type Definitions

### Step Type

```typescript
type Step = 1 | 2 | 3
```

### Deck Form Values

```typescript
type DeckFormValues = {
  name: string
  description?: string
  format?: 'Standard' | 'Modern' | 'Commander' | 'Legacy' | 'Vintage' | 'Pioneer' | 'Pauper' | 'Other'
  collectionOnly: boolean
  collectionId?: string | null
  colors: ('W' | 'U' | 'B' | 'R' | 'G')[]
  strategy?: string | null
  // Internal fields
  _selectedCommander?: any | null
  _commanderScryfallId?: string | null
}
```

### Scryfall Card Interface

```typescript
interface ScryfallCard {
  id: string
  name: string
  image_uris?: { normal?: string }
  color_identity?: string[]
}
```

---

## Styling & Theming

All components use Tailwind CSS with the project's design system:

- **Colors:** `bg-surface-elevated`, `text-text-primary`, `text-text-secondary`
- **Accent:** `accent-cyan` for active states and selections
- **Borders:** `border-accent-cyan/30` for highlighted cards
- **Transitions:** `transition-all` for smooth state changes

### Step Indicator Styling

```typescript
// Current step: cyan background with background text
'bg-accent-cyan text-background'

// Completed step: cyan background with opacity
'bg-accent-cyan/30 text-accent-cyan'

// Pending step: elevated surface with secondary text
'bg-surface-elevated text-text-secondary'
```

---

## Testing Recommendations

### Unit Tests

**ColorPicker:**
- Color selection/deselection
- Multiple color selection
- Disabled state behavior
- Read-only state behavior

**CommanderDeckForm:**
- Commander selection flow
- Color identity auto-extraction
- Strategy dropdown functionality

**ConstructedDeckForm:**
- Color picker integration
- Strategy dropdown functionality

**DeckDialog:**
- Step navigation (next/back)
- Step validation logic
- Form state persistence
- Edit mode vs. create mode
- Commander integration on submit

### E2E Tests

1. **Create Commander Deck:**
   - Navigate to Decks page
   - Click "New Deck"
   - Fill name and select Commander format
   - Select commander from search
   - Verify color identity auto-fills
   - Select strategy
   - Review summary
   - Create deck
   - Verify deck created with commander

2. **Create Constructed Deck:**
   - Navigate to Decks page
   - Click "New Deck"
   - Fill name and select Modern format
   - Select colors manually
   - Select strategy
   - Review summary
   - Create deck
   - Verify deck created with metadata

3. **Edit Existing Deck:**
   - Open deck detail page
   - Click edit
   - Verify single-page layout
   - Verify existing values populated
   - Update values
   - Save changes
   - Verify changes persist

4. **Navigation:**
   - Start wizard
   - Navigate forward through steps
   - Use back button to return
   - Verify form state preserved
   - Cancel at any step
   - Verify dialog closes and resets

---

## Known Limitations

1. **Edit Mode Commander Display:** When editing a deck, the existing commander is not displayed. The form allows changing the commander but doesn't show the current one.

2. **Single Commander Only:** Current implementation supports one commander. Partner commanders are not yet implemented.

3. **Commander Optional:** Commander selection is optional in Step 2. Users can create a Commander deck without selecting a commander card.

4. **No Commander Card Removal:** Once a commander is selected during creation, there's no way to remove it (only change it).

---

## Future Enhancements

1. **Partner Commander Support:** Allow selecting two partner commanders
2. **Commander Display in Edit Mode:** Fetch and display existing commander
3. **Commander Removal:** Add "Remove Commander" button in creation wizard
4. **Strategy Auto-Suggestion:** Suggest strategies based on commander/colors
5. **Color Validation:** Warn if deck colors don't match commander color identity
6. **Step Progress Persistence:** Remember step on dialog close/reopen
7. **Deck Templates:** Pre-fill wizard with template data
8. **Format Validation:** Validate deck legality for selected format

---

## Related Documentation

- [CommanderSelector Component](./CommanderSelector.md)
- [MTG Data Model](../MTG_DATA_MODEL.md)
- [Type System](../TYPE_SYSTEM.md)
- [UI/UX Design Guidelines](../UI_UX_DESIGN.md)
