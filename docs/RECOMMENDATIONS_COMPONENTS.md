# MTG Deck Recommendations - UI Components Documentation

## Overview

This document provides comprehensive documentation for the UI components built for the MTG Deck Recommendation System. These components are part of Phase 4 (Frontend Integration) and provide the visual interface for displaying format selection and collection coverage metrics.

## Components

### FormatSelector

A dropdown component for selecting Magic: The Gathering formats.

#### Location
`apps/web/src/components/recommendations/FormatSelector.tsx`

#### Description
`FormatSelector` provides an accessible dropdown interface for users to select from supported MTG formats (Standard, Modern, Commander, Brawl). Built on Radix UI primitives for full keyboard navigation and ARIA support.

#### Props

```typescript
interface FormatSelectorProps {
  /** Currently selected format */
  value: FormatType;
  /** Callback when format selection changes */
  onValueChange: (value: FormatType) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Placeholder text when no format is selected */
  placeholder?: string;
}
```

#### FormatType

```typescript
type FormatType = 'standard' | 'modern' | 'commander' | 'brawl';
```

#### Usage Example

```tsx
import { FormatSelector } from '@/components/recommendations';
import { useState } from 'react';

function MyComponent() {
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('standard');

  return (
    <FormatSelector
      value={selectedFormat}
      onValueChange={setSelectedFormat}
      placeholder="Choose a format"
    />
  );
}
```

#### Features

- **Accessibility**: Built on Radix UI Select primitives with full keyboard navigation
- **Responsive Design**: Full width on mobile (w-full), fixed width on desktop (md:w-[180px])
- **Theming**: Follows project design tokens (text-text-primary, bg-background-surface, etc.)
- **Disabled State**: Can be disabled via the `disabled` prop
- **Custom Styling**: Accepts additional classes via `className` prop

#### Styling

The component uses Tailwind CSS with the project's custom color tokens:
- Background: `bg-background-surface`
- Text: `text-text-primary`
- Border: `border-border`
- Focus ring: `focus:ring-accent-cyan`
- Selected option: `focus:bg-accent-cyan/20`

---

### CollectionCoverage

A component that displays visual coverage metrics for a Magic: The Gathering collection.

#### Location
`apps/web/src/components/recommendations/CollectionCoverage.tsx`

#### Description
`CollectionCoverage` displays comprehensive format coverage data including legal card counts, viable archetypes, and buildable decks. Supports both single-format and multi-format views with automatic type detection.

#### Props

```typescript
interface CollectionCoverageProps {
  /** Collection ID to analyze */
  collectionId: string;
  /** Optional format filter - if omitted, shows all formats */
  format?: FormatType;
  /** Additional CSS classes */
  className?: string;
}
```

#### Data Types

```typescript
interface ViableArchetype {
  archetype: string;
  completeness: number;
  keyCards: string[];
}

interface BuildableDeck {
  archetype: string;
  completeness: number;
  coreCardsOwned: string[];
  missingCount: number;
  missingKeyCards: string[];
}

interface SingleFormatCoverage {
  format: FormatType;
  totalLegalCards: number;
  viableArchetypes: ViableArchetype[];
  buildableDecks: BuildableDeck[];
}

interface MultiFormatCoverage {
  standard: SingleFormatCoverage;
  modern: SingleFormatCoverage;
  commander: SingleFormatCoverage;
  brawl: SingleFormatCoverage;
}
```

#### Usage Examples

**Single Format View**

```tsx
import { CollectionCoverage } from '@/components/recommendations';

function CollectionDetails() {
  const collectionId = 'abc123';
  const selectedFormat = 'commander';

  return (
    <CollectionCoverage
      collectionId={collectionId}
      format={selectedFormat}
    />
  );
}
```

**Multi-Format View**

```tsx
import { CollectionCoverage } from '@/components/recommendations';

function CollectionOverview() {
  const collectionId = 'abc123';

  // Omit format to show all formats
  return <CollectionCoverage collectionId={collectionId} />;
}
```

**With Format Selector**

```tsx
import { CollectionCoverage, FormatSelector } from '@/components/recommendations';
import { useState } from 'react';

function RecommendationsPanel() {
  const [format, setFormat] = useState<FormatType>('standard');
  const collectionId = 'abc123';

  return (
    <div className="space-y-4">
      <FormatSelector value={format} onValueChange={setFormat} />
      <CollectionCoverage collectionId={collectionId} format={format} />
    </div>
  );
}
```

#### Features

- **Auto Data Fetching**: Uses `useFormatCoverage` hook from Phase 1 for automatic data fetching
- **Loading States**: Shows spinner during data fetch
- **Error Handling**: Displays user-friendly error messages
- **Empty States**: Handles missing or empty data gracefully
- **Type Detection**: Automatically detects single vs multi-format responses
- **Progress Visualization**: Coverage percentage shown with animated progress bar
- **Responsive Grid**: 2 columns on mobile, 3 columns on desktop for stats
- **Archetype Tags**: Visual tags for viable archetypes with completeness percentage
- **Buildable Decks**: List of top 5 buildable decks with completeness scores

#### Single Format View Layout

When a specific format is selected:

1. **Stats Grid** (3 metrics in cards)
   - Legal Cards (total count)
   - Viable Archetypes (count)
   - Buildable Decks (count)

2. **Coverage Progress Bar**
   - Visual percentage indicator
   - Based on viable archetypes (5 archetypes = 100%)

3. **Viable Archetypes List** (if any exist)
   - Tag-based display
   - Shows archetype name and completeness percentage
   - Color: `bg-accent-cyan/20 text-accent-cyan`

4. **Top Buildable Decks** (if any exist)
   - Shows up to 5 decks
   - Deck name and completeness percentage
   - Truncated text for long names

#### Multi-Format View Layout

When no format is specified:

- **Grid of Format Cards** (2 columns on mobile, 2 on desktop)
- Each card shows for one format:
  - Format name (Standard, Modern, Commander, Brawl)
  - Legal Cards count
  - Viable Archetypes count (cyan color)
  - Buildable Decks count (lavender color)

#### States

**Loading State**
```tsx
<Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
```

**Error State**
```tsx
<div>
  <p className="text-red-400 text-sm">Failed to load coverage data</p>
  <p className="text-text-secondary text-xs">{error.message}</p>
</div>
```

**Empty State**
```tsx
<p className="text-text-secondary text-sm">No coverage data available</p>
```

#### Styling

The component uses Tailwind CSS with project design tokens:
- Cards: `Card` and `CardContent` components from `@/components/ui/card`
- Primary text: `text-text-primary`
- Secondary text: `text-text-secondary`
- Accent colors: `text-accent-cyan`, `text-accent-lavender`
- Progress bar: `bg-accent-cyan` on `bg-background` base
- Spacing: `space-y-4` for vertical rhythm, `gap-4` for grid gaps

---

## Component Architecture

### Dependencies

Both components depend on:
- **React Query Hooks** (Phase 1): `useFormatCoverage` from `@/hooks/useRecommendations`
- **UI Primitives**: `Card`, `CardContent`, `Select` components from `@/components/ui/`
- **Icons**: `Loader2` from `lucide-react`
- **Utilities**: `cn` from `@/lib/utils`

### Type Safety

All components are built with TypeScript strict mode:
- Explicit prop interfaces exported for consumers
- No use of `any` types
- Type guards for runtime type checking (`isSingleFormatCoverage`)
- Proper generic typing for React Query hooks

### Accessibility

- **Keyboard Navigation**: Full keyboard support via Radix UI primitives
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Management**: Clear focus indicators with `focus:ring-accent-cyan`
- **Semantic HTML**: Proper heading hierarchy and semantic elements

### Responsive Design

Both components follow mobile-first responsive design:
- Full width on mobile, constrained on desktop
- Grid columns adapt: `grid-cols-2 md:grid-cols-3`
- Touch-friendly hit areas
- Readable text sizes across breakpoints

---

## Integration Guide

### Step 1: Import Components

```tsx
import {
  FormatSelector,
  CollectionCoverage,
  type FormatType,
  type FormatSelectorProps,
  type CollectionCoverageProps,
} from '@/components/recommendations';
```

### Step 2: Set Up State

```tsx
import { useState } from 'react';

function MyPage() {
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('standard');
  const collectionId = 'your-collection-id';

  // ... rest of component
}
```

### Step 3: Render Components

```tsx
return (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-medium mb-2">Select Format</h2>
      <FormatSelector
        value={selectedFormat}
        onValueChange={setSelectedFormat}
      />
    </div>

    <div>
      <h2 className="text-lg font-medium mb-4">Collection Coverage</h2>
      <CollectionCoverage
        collectionId={collectionId}
        format={selectedFormat}
      />
    </div>
  </div>
);
```

### Step 4: Handle Edge Cases

```tsx
// Disable format selector during loading
const { isLoading } = useFormatCoverage({ collectionId, format: selectedFormat });

<FormatSelector
  value={selectedFormat}
  onValueChange={setSelectedFormat}
  disabled={isLoading}
/>
```

---

## Testing

### Unit Tests

Test files are located in:
- `apps/web/src/components/recommendations/__tests__/FormatSelector.test.tsx`
- `apps/web/src/components/recommendations/__tests__/CollectionCoverage.test.tsx`

**Note**: Testing infrastructure (vitest, @testing-library/react) must be installed in the project to run tests.

### FormatSelector Test Coverage

- Renders with selected value
- Displays all format options when opened
- Calls onValueChange when format selected
- Renders in disabled state
- Displays placeholder when specified
- Applies custom className

### CollectionCoverage Test Coverage

- Renders loading state with spinner
- Renders error state with message
- Renders single format coverage data
- Renders multi-format coverage (all formats)
- Renders empty state when no data
- Applies custom className

### Manual Testing Checklist

- [ ] Format selector displays all 4 formats
- [ ] Format selection updates coverage display
- [ ] Loading spinner appears during data fetch
- [ ] Error message displays on network failure
- [ ] Empty state displays when no data available
- [ ] Progress bar animates correctly
- [ ] Archetype tags display with percentages
- [ ] Buildable decks list shows top 5 items
- [ ] Multi-format grid shows all 4 formats
- [ ] Responsive layout works on mobile
- [ ] Keyboard navigation works in selector
- [ ] Focus indicators are visible

---

## Performance Considerations

### Data Fetching

- Uses React Query for automatic caching and deduplication
- Query is disabled when `collectionId` is falsy
- Automatic background refetching keeps data fresh

### Rendering

- Components use functional React with hooks
- No unnecessary re-renders (stable callback references)
- Progress bar uses CSS transitions for smooth animation

### Bundle Size

- Minimal dependencies (Radix UI, lucide-react already in project)
- No external charting libraries
- Components are tree-shakeable via barrel exports

---

## Troubleshooting

### Issue: Format selector not displaying options

**Cause**: Select component not properly mounted or props incorrect

**Solution**: Ensure `value` and `onValueChange` props are provided and value is a valid `FormatType`

### Issue: Coverage data not loading

**Cause**: Invalid `collectionId` or API error

**Solution**:
1. Verify `collectionId` is a valid UUID
2. Check browser console for API errors
3. Ensure Phase 1 hooks are properly set up
4. Verify collection exists in database

### Issue: Loading state stuck

**Cause**: API request hanging or React Query config issue

**Solution**:
1. Check network tab for failed requests
2. Verify API endpoint is accessible
3. Check React Query devtools for query status

### Issue: TypeScript errors

**Cause**: Missing type imports or incorrect types

**Solution**:
1. Import types from barrel export: `import { type FormatType } from '@/components/recommendations'`
2. Ensure Phase 1 types are exported from hooks
3. Run `pnpm exec tsc --noEmit` to check all type errors

---

## Future Enhancements

Potential improvements for future iterations:

1. **Filtering**: Filter buildable decks by completeness threshold
2. **Sorting**: Sort archetypes by completeness or alphabetically
3. **Details View**: Click archetype/deck to see detailed card breakdown
4. **Export**: Export coverage data as CSV or JSON
5. **Comparison**: Compare coverage across multiple collections
6. **Trends**: Show coverage change over time
7. **Recommendations**: Highlight which cards to acquire for specific archetypes
8. **Color Coding**: Use MTG color identity for archetype tags

---

## Related Documentation

- [MTG Data Model](./MTG_DATA_MODEL.md) - Database schema and data structures
- [UI/UX Design](./UI_UX_DESIGN.md) - Design system and patterns
- Phase 1 Documentation - React Query hooks (to be created)
- Phase 3 Documentation - Recommendation panel integration (to be created)

---

## Changelog

### v1.0.0 (Phase 4 - Basic UI Components)

**Initial Release** - February 2026

- FormatSelector component with Radix UI primitives
- CollectionCoverage component with single/multi-format views
- Loading, error, and empty states
- Responsive design for mobile and desktop
- TypeScript strict mode compliance
- Unit test definitions (infrastructure pending)
- Full JSDoc documentation
- Barrel exports for clean imports
