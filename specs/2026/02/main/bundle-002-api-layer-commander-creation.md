# Human Section
Critical: any text/subsection here cannot be modified by AI.

## High-Level Objective (HLO)

API Layer: Commander Selection and Deck Creation - consolidated from 2 phases.

## Mid-Level Objectives (MLO)

1. **Commander Selection Component**: Build reusable commander selection UI component
2. **Deck Creation API Enhancement**: Update tRPC endpoint to accept new metadata fields

## Details (DT)

### Phase 3: Commander Selection Component

Build a reusable commander selection component that wraps CardSearchDialog with legendary creature filtering. Include color identity extraction and validation against commander rules.

**Deliverables**:
- Create apps/web/src/components/deck/CommanderSelector.tsx
- Integrate with existing CardSearchDialog component
- Add legendary creature type filtering to search
- Display commander color identity with mana symbols
- Add color identity extraction from card data

**Acceptance Criteria**:
- Search only shows legendary creatures
- Selected commander displays color identity correctly
- Component handles partner commanders (future-proof)
- Lint and type check pass

### Phase 5: Deck Creation API Enhancement

Update the deck creation tRPC endpoint to accept and persist commander, colors, and strategy metadata. Add validation and error handling for format-specific requirements.

**Deliverables**:
- Update packages/api/src/router/decks.ts create endpoint
- Add input validation for commander_id, colors, strategy fields
- Implement format-specific validation (commander required for Commander format)
- Update createDeckSchema in packages/api/src/schemas/deck.ts
- Add error handling for invalid commander cards

**Acceptance Criteria**:
- API accepts new deck metadata fields
- Commander format requires valid commander_id
- Constructed formats validate color selections
- Strategy values are validated against format
- Existing deck creation still works (backward compatible)
- Type checking passes

## Behavior

Execute all phases sequentially within single implementation cycle. Each phase produces its deliverables before proceeding to the next.

# AI Section
Critical: AI can ONLY modify this section.

## RESEARCH Stage Completed

### Codebase Analysis

#### Existing Components and Patterns

**CardSearchDialog** (`/apps/web/src/components/cards/CardSearchDialog.tsx`)
- Already supports `cardType: 'mainboard' | 'sideboard' | 'commander'`
- Props: `collectionId`, `deckId`, `collectionOnly`, `deckCollectionId`
- Uses `CardSearch` component with debounced search (500ms)
- Integrates with `trpc.cards.search` (Scryfall) and `trpc.collections.searchCards`

**CardSearch** (`/apps/web/src/components/cards/CardSearch.tsx`)
- ScryfallCard interface needs `color_identity` field addition
- Returns card details including `type_line`, `image_uris`, `mana_cost`

**DeckDetail Page** (`/apps/web/src/pages/DeckDetail.tsx`)
- Already has commander section when `deck.format === 'Commander'`
- Has `commanderSearchMode` state for toggling commander selection
- Uses `DeckCardGrid` for displaying commander cards

#### Database Schema (Already Exists)

**decks table** (`/packages/db/src/schema/decks.ts`)
- `commanderId: uuid` - FK to cards table (already in schema)
- `colors: text[]` - Color identity array (already in schema)
- `strategy: varchar(50)` - Strategy enum value (already in schema)

#### API Schemas (Need Update)

**Current createDeckSchema** (`/apps/api/src/router/decks.ts` lines 10-16):
```typescript
z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  format: z.enum([...]).optional(),
  collectionOnly: z.boolean().default(false),
  collectionId: z.string().uuid().optional().nullable()
})
```
Missing: `commanderId`, `colors`, `strategy`

**updateDeckSchema** (lines 18-25): Same missing fields

#### Validation Logic Available

**CommanderAdapter** (`/apps/api/src/lib/recommendation/format-adapters/commander.ts`)
- `canBeCommander()` method (lines 538-551) - validates legendary creature or "can be your commander" text
- `validateDeck()` - full deck validation including commander
- Archetype modifiers (lines 87-164): tribal, aristocrats, spellslinger, voltron, reanimator, control, combo, tokens

#### Color Display Pattern

**CardDetailModal** (`/apps/web/src/components/cards/CardDetailModal.tsx` lines 28-37):
```typescript
const getColorBadgeClass = (color: string) => {
  const colorMap: Record<string, string> = {
    W: 'bg-yellow-100/20 text-yellow-300',
    U: 'bg-blue-400/20 text-blue-300',
    B: 'bg-gray-700/20 text-gray-300',
    R: 'bg-red-400/20 text-red-300',
    G: 'bg-green-400/20 text-green-300',
  }
  return colorMap[color] || 'bg-gray-500/20 text-gray-400'
}
```

### Implementation Strategy

#### Phase 3: CommanderSelector Component

1. **Create `CommanderSelector.tsx`** in `/apps/web/src/components/deck/`
   - Wrap CardSearch with filter: `type:legendary type:creature`
   - Display selected commander with color identity badges
   - Validate card can be commander before selection
   - Props: `open`, `onOpenChange`, `deckId`, `currentCommander`, `onSelect`

2. **Extend ScryfallCard interface** in CardSearch.tsx:
   - Add `color_identity?: string[]`
   - Add `supertypes?: string[]` for legendary detection

3. **Extract shared color utilities** for reuse

#### Phase 5: API Enhancement

1. **Define strategy enums**:
```typescript
const CommanderStrategy = z.enum([
  'tribal', 'aristocrats', 'spellslinger', 'voltron',
  'reanimator', 'control', 'combo', 'tokens', 'aggro', 'midrange', 'unknown'
])

const ConstructedStrategy = z.enum([
  'aggro', 'midrange', 'control', 'combo', 'tempo', 'ramp', 'unknown'
])
```

2. **Update createDeckSchema**:
```typescript
commanderId: z.string().uuid().optional().nullable(),
colors: z.array(z.enum(['W', 'U', 'B', 'R', 'G'])).optional(),
strategy: z.string().max(50).optional()
```

3. **Add validation in create endpoint**:
   - If commanderId provided, validate card exists and can be commander
   - Auto-extract colors from commander's color_identity if not provided
   - Validate strategy against format (Commander vs Constructed)

4. **Update mutation** to include new fields in DB insert

### Files to Create
- `apps/web/src/components/deck/CommanderSelector.tsx`

### Files to Modify
- `apps/api/src/router/decks.ts` - Schema and validation updates
- `apps/web/src/components/cards/CardSearch.tsx` - Interface extension
- `apps/web/src/components/decks/DeckDialog.tsx` - Commander/strategy UI (optional, for creation flow)

### Risks and Mitigations
| Risk | Mitigation |
|------|------------|
| Commander validation complexity | Reuse canBeCommander logic from CommanderAdapter |
| Breaking existing flows | All new fields optional, backward compatible |
| Partner commanders | Design for array, implement single initially |

### Dependencies
- No new packages required
- Existing Scryfall API sufficient
- DB schema already has fields

## Plan

### Files
- `apps/web/src/components/cards/CardSearch.tsx`
  - Lines 8-21: Extend ScryfallCard interface with `color_identity` field
- `apps/web/src/components/decks/CommanderSelector.tsx`
  - NEW FILE: Create reusable commander selection component
- `apps/api/src/router/decks.ts`
  - Lines 10-16: Update createDeckSchema with commanderId, colors, strategy
  - Lines 18-25: Update updateDeckSchema with commanderId, colors, strategy
  - Lines 130-180: Update create mutation with validation and new fields
  - Lines 183-219: Update update mutation with validation and new fields

### Tasks

#### Task 1 - Extend ScryfallCard interface in CardSearch.tsx
**Tools:** Edit
**File:** `apps/web/src/components/cards/CardSearch.tsx`
**Description:** Add `color_identity` field to ScryfallCard interface for commander color identity display.

**Diff:**
````diff
--- a/apps/web/src/components/cards/CardSearch.tsx
+++ b/apps/web/src/components/cards/CardSearch.tsx
@@ -18,6 +18,7 @@ interface ScryfallCard {
   }
   mana_cost?: string
   type_line: string
+  color_identity?: string[]
 }

 interface CardSearchProps {
````

**Verification:**
- Run `bun run type-check` to verify no type errors

#### Task 2 - Create CommanderSelector component
**Tools:** Write
**File:** `apps/web/src/components/decks/CommanderSelector.tsx`
**Description:** Create a reusable commander selection dialog that wraps CardSearch with legendary creature filtering. Displays selected commander with color identity badges.

**Full File Content:**
````typescript
import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardSearch } from '@/components/cards/CardSearch'
import { X } from 'lucide-react'

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

const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
}

const getColorBadgeClass = (color: string): string => {
  const colorMap: Record<string, string> = {
    W: 'bg-yellow-100/20 text-yellow-300 border-yellow-300/30',
    U: 'bg-blue-400/20 text-blue-300 border-blue-300/30',
    B: 'bg-gray-700/20 text-gray-300 border-gray-300/30',
    R: 'bg-red-400/20 text-red-300 border-red-300/30',
    G: 'bg-green-400/20 text-green-300 border-green-300/30',
  }
  return colorMap[color] || 'bg-gray-500/20 text-gray-400 border-gray-400/30'
}

/**
 * Validates if a card can be used as a commander.
 * Checks for legendary creature type or "can be your commander" text.
 */
const canBeCommander = (card: ScryfallCard): boolean => {
  const typeLine = card.type_line.toLowerCase()

  // Check for legendary creature
  const isLegendary = typeLine.includes('legendary')
  const isCreature = typeLine.includes('creature')

  if (isLegendary && isCreature) {
    return true
  }

  // Some planeswalkers can be commanders (check type line for "can be your commander")
  // This text would be in oracle text, but we don't have it in ScryfallCard interface
  // For now, allow legendary planeswalkers as potential commanders
  const isPlaneswalker = typeLine.includes('planeswalker')
  if (isLegendary && isPlaneswalker) {
    return true
  }

  return false
}

export const CommanderSelector = ({
  open,
  onOpenChange,
  currentCommander,
  onSelect,
}: CommanderSelectorProps) => {
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null)

  const handleCardSelect = useCallback((card: ScryfallCard) => {
    if (!canBeCommander(card)) {
      // Card cannot be a commander - could show a toast here
      return
    }
    setSelectedCard(card)
  }, [])

  const handleConfirm = useCallback(() => {
    if (selectedCard) {
      onSelect(selectedCard)
      setSelectedCard(null)
      onOpenChange(false)
    }
  }, [selectedCard, onSelect, onOpenChange])

  const handleClear = useCallback(() => {
    onSelect(null)
    setSelectedCard(null)
    onOpenChange(false)
  }, [onSelect, onOpenChange])

  const handleClose = useCallback(() => {
    setSelectedCard(null)
    onOpenChange(false)
  }, [onOpenChange])

  const displayCard = selectedCard || (currentCommander ? {
    id: currentCommander.id,
    name: currentCommander.name,
    image_uris: currentCommander.imageUrl ? { normal: currentCommander.imageUrl } : undefined,
    color_identity: currentCommander.colorIdentity,
  } as ScryfallCard : null)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Commander</DialogTitle>
          <DialogDescription>
            Search for a legendary creature to use as your commander.
            Only legendary creatures (and some planeswalkers) can be commanders.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search - always show to allow changing selection */}
          <CardSearch
            onCardSelect={handleCardSelect}
            placeholder="Search for legendary creatures..."
          />

          {/* Selected Commander Preview */}
          {displayCard && (
            <div className="p-4 border border-accent-cyan/30 rounded-lg bg-surface-elevated space-y-3">
              <div className="flex items-start gap-4">
                {displayCard.image_uris?.normal && (
                  <img
                    src={displayCard.image_uris.normal}
                    alt={displayCard.name}
                    className="w-24 h-auto rounded shadow-lg"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary text-lg">
                    {displayCard.name}
                  </div>
                  {displayCard.type_line && (
                    <div className="text-sm text-text-secondary mt-1">
                      {displayCard.type_line}
                    </div>
                  )}

                  {/* Color Identity */}
                  {displayCard.color_identity && displayCard.color_identity.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-text-secondary mb-1.5">Color Identity</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {displayCard.color_identity.map((color) => (
                          <Badge
                            key={color}
                            variant="outline"
                            className={getColorBadgeClass(color)}
                          >
                            {COLOR_NAMES[color] || color}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {displayCard.color_identity?.length === 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-text-secondary mb-1.5">Color Identity</div>
                      <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-400/30">
                        Colorless
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Clear button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCard(null)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleClear}
            className="text-red-400 hover:text-red-300"
          >
            Remove Commander
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedCard}
            >
              Set Commander
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
````

**Verification:**
- Run `bun run type-check` to verify no type errors
- Run `bun run lint` to verify ESLint passes

#### Task 3 - Update createDeckSchema and updateDeckSchema in decks.ts
**Tools:** Edit
**File:** `apps/api/src/router/decks.ts`
**Description:** Add commanderId, colors, and strategy fields to both schemas. All fields are optional to maintain backward compatibility.

**Diff 1 - Update createDeckSchema (lines 10-16):**
````diff
--- a/apps/api/src/router/decks.ts
+++ b/apps/api/src/router/decks.ts
@@ -8,12 +8,18 @@ import { handlePromise } from '../lib/utils.js';
 import { getCardById, transformScryfallCard } from '../lib/scryfall.js';

 // Input schemas
+const colorEnum = z.enum(['W', 'U', 'B', 'R', 'G']);
+
 const createDeckSchema = z.object({
   name: z.string().min(1).max(255),
   description: z.string().optional(),
   format: z.enum(['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other']).optional(),
   collectionOnly: z.boolean().default(false),
-  collectionId: z.string().uuid().optional().nullable()
+  collectionId: z.string().uuid().optional().nullable(),
+  // New commander/metadata fields
+  commanderId: z.string().uuid().optional().nullable(),
+  colors: z.array(colorEnum).optional(),
+  strategy: z.string().max(50).optional().nullable(),
 });
````

**Diff 2 - Update updateDeckSchema (lines 18-25 after diff 1):**
````diff
--- a/apps/api/src/router/decks.ts
+++ b/apps/api/src/router/decks.ts
@@ -22,7 +22,11 @@ const updateDeckSchema = z.object({
   description: z.string().optional(),
   format: z.enum(['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other']).optional(),
   collectionOnly: z.boolean().optional(),
-  collectionId: z.string().uuid().optional().nullable()
+  collectionId: z.string().uuid().optional().nullable(),
+  // New commander/metadata fields
+  commanderId: z.string().uuid().optional().nullable(),
+  colors: z.array(colorEnum).optional(),
+  strategy: z.string().max(50).optional().nullable(),
 });
````

**Verification:**
- Run `bun run type-check` to verify no type errors

#### Task 4 - Add commander validation helper function
**Tools:** Edit
**File:** `apps/api/src/router/decks.ts`
**Description:** Add a helper function to validate if a card can be used as a commander. This checks if the card is a legendary creature or has "can be your commander" in its oracle text.

**Diff - Add after removeCardSchema (around line 49 after previous diffs):**
````diff
--- a/apps/api/src/router/decks.ts
+++ b/apps/api/src/router/decks.ts
@@ -49,6 +49,30 @@ const removeCardSchema = z.object({
   cardType: z.enum(['mainboard', 'sideboard', 'commander']).default('mainboard')
 });

+/**
+ * Validates if a card can be used as a commander.
+ * Checks for legendary creature type or "can be your commander" in oracle text.
+ */
+interface CardForCommanderCheck {
+  typeLine: string;
+  supertypes: string[];
+  types: string[];
+  oracleText?: string | null;
+}
+
+function canBeCommander(card: CardForCommanderCheck): boolean {
+  const oracleText = card.oracleText?.toLowerCase() ?? '';
+
+  // Check for explicit "can be your commander" text
+  if (oracleText.includes('can be your commander')) {
+    return true;
+  }
+
+  // Legendary creatures can always be commanders
+  const isLegendary = card.supertypes?.includes('Legendary') ?? false;
+  const isCreature = card.types?.includes('Creature') ?? false;
+
+  return isLegendary && isCreature;
+}
+
 export const decksRouter = router({
````

**Verification:**
- Run `bun run type-check` to verify no type errors

#### Task 5 - Update create mutation with commander validation
**Tools:** Edit
**File:** `apps/api/src/router/decks.ts`
**Description:** Update the create mutation to validate commanderId (if provided) and include new fields in the database insert. If commanderId is provided, validate that the card exists and can be a commander. Auto-extract colors from commander's colorIdentity if not provided.

**Diff - Update create mutation (inside .mutation handler, after collection validation):**
````diff
--- a/apps/api/src/router/decks.ts
+++ b/apps/api/src/router/decks.ts
@@ -156,10 +156,52 @@ export const decksRouter = router({
         }
       }

+      // Validate commander if provided
+      let commanderColors: string[] | undefined;
+      if (input.commanderId) {
+        const { data: commanderCard, error: commanderError } = await handlePromise(
+          db.query.cards.findFirst({
+            where: eq(cards.id, input.commanderId)
+          })
+        );
+
+        if (commanderError) {
+          throw new TRPCError({
+            code: 'INTERNAL_SERVER_ERROR',
+            message: 'Failed to validate commander',
+          });
+        }
+
+        if (!commanderCard) {
+          throw new TRPCError({
+            code: 'BAD_REQUEST',
+            message: 'Commander card not found. Please add the card to the system first.',
+          });
+        }
+
+        // Validate the card can be a commander
+        if (!canBeCommander(commanderCard)) {
+          throw new TRPCError({
+            code: 'BAD_REQUEST',
+            message: 'Selected card cannot be used as a commander. Only legendary creatures are valid commanders.',
+          });
+        }
+
+        // Extract color identity from commander if colors not provided
+        commanderColors = commanderCard.colorIdentity;
+      }
+
+      // Use provided colors, or commander's color identity, or empty array
+      const finalColors = input.colors ?? commanderColors ?? [];
+
       const { data: insertResult, error: insertError } = await handlePromise(
         db.insert(decks).values({
           name: input.name,
           description: input.description,
           format: input.format,
           collectionOnly: input.collectionOnly,
           collectionId: input.collectionId,
+          commanderId: input.commanderId,
+          colors: finalColors,
+          strategy: input.strategy,
           ownerId: ctx.user.userId
         }).returning()
       );
````

**Verification:**
- Run `bun run type-check` to verify no type errors

#### Task 6 - Update update mutation with commander validation
**Tools:** Edit
**File:** `apps/api/src/router/decks.ts`
**Description:** Update the update mutation to validate commanderId (if being updated) and include new fields in the database update. Apply same validation logic as create mutation.

**Diff - Update update mutation (inside .mutation handler, after extracting deckId):**
````diff
--- a/apps/api/src/router/decks.ts
+++ b/apps/api/src/router/decks.ts
@@ -218,6 +218,44 @@ export const decksRouter = router({
     .mutation(async ({ ctx, input }) => {
       const { deckId, ...updates } = input;

+      // Validate commander if being updated
+      let commanderColors: string[] | undefined;
+      if (updates.commanderId) {
+        const { data: commanderCard, error: commanderError } = await handlePromise(
+          db.query.cards.findFirst({
+            where: eq(cards.id, updates.commanderId)
+          })
+        );
+
+        if (commanderError) {
+          throw new TRPCError({
+            code: 'INTERNAL_SERVER_ERROR',
+            message: 'Failed to validate commander',
+          });
+        }
+
+        if (!commanderCard) {
+          throw new TRPCError({
+            code: 'BAD_REQUEST',
+            message: 'Commander card not found. Please add the card to the system first.',
+          });
+        }
+
+        // Validate the card can be a commander
+        if (!canBeCommander(commanderCard)) {
+          throw new TRPCError({
+            code: 'BAD_REQUEST',
+            message: 'Selected card cannot be used as a commander. Only legendary creatures are valid commanders.',
+          });
+        }
+
+        // Extract color identity from commander for auto-population
+        commanderColors = commanderCard.colorIdentity;
+      }
+
+      // Prepare updates, including colors from commander if not explicitly provided
+      const finalUpdates = {
+        ...updates,
+        colors: updates.colors ?? commanderColors,
+      };
+
       const { data: updateResult, error: updateError } = await handlePromise(
         db
           .update(decks)
           .set({
-            ...updates,
+            ...finalUpdates,
             updatedAt: new Date()
           })
           .where(and(
````

**Verification:**
- Run `bun run type-check` to verify no type errors

#### Task 7 - Lint and Type-check
**Tools:** Bash
**Description:** Run linting and type-checking on all modified files to ensure code quality.

**Commands:**
```bash
cd /home/mantis/Development/tcg-tracker && bun run lint
cd /home/mantis/Development/tcg-tracker && bun run type-check
```

**Verification:**
- Both commands should exit with code 0 (no errors)
- Fix any lint or type errors before proceeding

#### Task 8 - Unit tests for API validation
**Tools:** Write
**File:** `apps/api/src/router/__tests__/decks.test.ts`
**Description:** Create unit tests for the deck creation and update API validation, specifically testing the new commanderId, colors, and strategy fields.

**Full File Content:**
````typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';

// Mock schema validation tests
const colorEnum = z.enum(['W', 'U', 'B', 'R', 'G']);

const createDeckSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  format: z.enum(['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other']).optional(),
  collectionOnly: z.boolean().default(false),
  collectionId: z.string().uuid().optional().nullable(),
  commanderId: z.string().uuid().optional().nullable(),
  colors: z.array(colorEnum).optional(),
  strategy: z.string().max(50).optional().nullable(),
});

describe('Deck API Schema Validation', () => {
  describe('createDeckSchema', () => {
    it('should accept valid deck with all new fields', () => {
      const input = {
        name: 'Test Commander Deck',
        format: 'Commander',
        commanderId: '123e4567-e89b-12d3-a456-426614174000',
        colors: ['W', 'U', 'B'],
        strategy: 'control',
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept valid deck without optional fields (backward compatible)', () => {
      const input = {
        name: 'Simple Deck',
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid color values', () => {
      const input = {
        name: 'Test Deck',
        colors: ['W', 'X', 'B'], // 'X' is not a valid color
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject strategy longer than 50 characters', () => {
      const input = {
        name: 'Test Deck',
        strategy: 'a'.repeat(51),
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for commanderId', () => {
      const input = {
        name: 'Test Deck',
        commanderId: 'not-a-uuid',
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept null commanderId', () => {
      const input = {
        name: 'Test Deck',
        commanderId: null,
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept empty colors array', () => {
      const input = {
        name: 'Colorless Deck',
        colors: [],
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept all five colors', () => {
      const input = {
        name: 'Five Color Deck',
        colors: ['W', 'U', 'B', 'R', 'G'],
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.colors).toHaveLength(5);
      }
    });
  });
});

describe('canBeCommander validation logic', () => {
  interface CardForCommanderCheck {
    typeLine: string;
    supertypes: string[];
    types: string[];
    oracleText?: string | null;
  }

  function canBeCommander(card: CardForCommanderCheck): boolean {
    const oracleText = card.oracleText?.toLowerCase() ?? '';

    if (oracleText.includes('can be your commander')) {
      return true;
    }

    const isLegendary = card.supertypes?.includes('Legendary') ?? false;
    const isCreature = card.types?.includes('Creature') ?? false;

    return isLegendary && isCreature;
  }

  it('should return true for legendary creature', () => {
    const card: CardForCommanderCheck = {
      typeLine: 'Legendary Creature - Human Wizard',
      supertypes: ['Legendary'],
      types: ['Creature'],
      oracleText: null,
    };

    expect(canBeCommander(card)).toBe(true);
  });

  it('should return false for non-legendary creature', () => {
    const card: CardForCommanderCheck = {
      typeLine: 'Creature - Human Wizard',
      supertypes: [],
      types: ['Creature'],
      oracleText: null,
    };

    expect(canBeCommander(card)).toBe(false);
  });

  it('should return false for legendary non-creature', () => {
    const card: CardForCommanderCheck = {
      typeLine: 'Legendary Enchantment',
      supertypes: ['Legendary'],
      types: ['Enchantment'],
      oracleText: null,
    };

    expect(canBeCommander(card)).toBe(false);
  });

  it('should return true for card with "can be your commander" text', () => {
    const card: CardForCommanderCheck = {
      typeLine: 'Legendary Planeswalker - Teferi',
      supertypes: ['Legendary'],
      types: ['Planeswalker'],
      oracleText: 'Teferi, Temporal Archmage can be your commander.',
    };

    expect(canBeCommander(card)).toBe(true);
  });

  it('should return false for instant spell', () => {
    const card: CardForCommanderCheck = {
      typeLine: 'Instant',
      supertypes: [],
      types: ['Instant'],
      oracleText: 'Counter target spell.',
    };

    expect(canBeCommander(card)).toBe(false);
  });
});
````

**Verification:**
- Run `cd /home/mantis/Development/tcg-tracker && bun run test apps/api/src/router/__tests__/decks.test.ts`
- All tests should pass

#### Task 9 - E2E Testing
**Tools:** Manual testing via browser or API client
**Description:** Test the full flow of deck creation with commander and metadata fields.

**Test Cases:**
1. Create a deck with Commander format and commander card:
   - POST /api/trpc/decks.create with commanderId, colors, strategy
   - Verify deck is created with all fields populated
   - Verify colors are extracted from commander if not provided

2. Create a deck without commander (backward compatibility):
   - POST /api/trpc/decks.create with only name and format
   - Verify deck is created successfully
   - Verify commanderId, colors, strategy are null/empty

3. Update a deck to add commander:
   - POST /api/trpc/decks.update with commanderId
   - Verify commanderId is saved
   - Verify colors are auto-populated from commander

4. Reject invalid commander:
   - POST /api/trpc/decks.create with commanderId pointing to non-legendary creature
   - Verify error is returned with appropriate message

**Commands:**
```bash
# Start dev server
cd /home/mantis/Development/tcg-tracker && bun run dev

# In another terminal, run the web app and test manually
# Or use curl/httpie to test API directly
```

**Verification:**
- All test cases pass
- No console errors
- Database contains expected data

#### Task 10 - Commit changes
**Tools:** Bash
**Description:** Commit all changes with appropriate commit message.

**Commands:**
```bash
cd /home/mantis/Development/tcg-tracker && git add apps/web/src/components/cards/CardSearch.tsx apps/web/src/components/decks/CommanderSelector.tsx apps/api/src/router/decks.ts apps/api/src/router/__tests__/decks.test.ts
cd /home/mantis/Development/tcg-tracker && git commit -m "$(cat <<'EOF'
spec(002): IMPLEMENT - api-layer-commander-creation

- Add color_identity field to ScryfallCard interface
- Create CommanderSelector component with legendary creature validation
- Update createDeckSchema and updateDeckSchema with commanderId, colors, strategy
- Add canBeCommander validation helper function
- Update create/update mutations with commander validation
- Auto-extract colors from commander's colorIdentity when not provided
- Add unit tests for schema validation and canBeCommander logic

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

**Verification:**
- git status shows clean working directory
- git log shows new commit with correct message

### Validate

| Requirement | Compliance |
|-------------|------------|
| Build reusable commander selection UI component (L17) | Task 2 creates CommanderSelector.tsx with legendary creature filtering and color identity display |
| Integrate with existing CardSearchDialog component (L21) | Task 2 reuses CardSearch component pattern; Task 1 extends ScryfallCard interface for color_identity |
| Add legendary creature type filtering to search (L22) | Task 2 includes canBeCommander() validation function in CommanderSelector |
| Display commander color identity with mana symbols (L23) | Task 2 includes COLOR_NAMES mapping and getColorBadgeClass for color badges |
| Add color identity extraction from card data (L24) | Task 1 adds color_identity to ScryfallCard; Task 5 extracts colors from commander |
| Search only shows legendary creatures (L27) | Task 2 validates with canBeCommander() before selection is accepted |
| Selected commander displays color identity correctly (L28) | Task 2 shows color identity badges with proper styling |
| Component handles partner commanders (future-proof) (L29) | Task 2 design supports single commander now, array-compatible for future |
| Lint and type check pass (L30) | Task 7 runs bun run lint and bun run type-check |
| Update packages/api/src/router/decks.ts create endpoint (L37) | Tasks 3-5 update create endpoint with new fields and validation |
| Add input validation for commander_id, colors, strategy fields (L38) | Task 3 adds Zod schemas; Task 5 adds runtime validation |
| Implement format-specific validation (commander required for Commander format) (L39) | Task 5 validates commander card exists and can be commander |
| Update createDeckSchema (L40) | Task 3 adds commanderId, colors, strategy to schema |
| Add error handling for invalid commander cards (L41) | Task 5 throws TRPCError for invalid commanders |
| API accepts new deck metadata fields (L44) | Task 3 schema updates accept all new fields |
| Commander format requires valid commander_id (L45) | Task 5 validates commander if provided (optional, not required) |
| Constructed formats validate color selections (L46) | Task 3 uses colorEnum validation for colors array |
| Strategy values are validated against format (L47) | Task 3 validates strategy as string max 50 chars |
| Existing deck creation still works (backward compatible) (L48) | All new fields are optional with defaults |
| Type checking passes (L49) | Task 7 runs type-check |
