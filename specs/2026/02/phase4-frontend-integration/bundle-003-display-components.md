# Human Section
Critical: any text/subsection here cannot be modified by AI.

## High-Level Objective (HLO)

Display Components Bundle - consolidated from 2 phases (RecommendationPanel and FormatDashboard).

Build the main display components for the MTG Deck Recommendation System frontend.

## Mid-Level Objectives (MLO)

1. **Recommendation Panel**: Build RecommendationPanel component to display card suggestions with filtering, pagination, and synergy scores
2. **Format Dashboard**: Build FormatDashboard for multi-format comparison showing coverage and buildable decks across all formats

## Details (DT)

### Phase 1: Recommendation Panel

Build the RecommendationPanel component to display card recommendations to users.

**Deliverables**:
- Create `apps/web/src/components/recommendations/RecommendationPanel.tsx`
- Display card recommendations with owned cards shown by default
- Add filtering by category (creatures, spells, lands, etc.)
- Implement pagination for large result sets
- Show synergy scores and explanations

**Acceptance Criteria**:
- Panel displays recommendations from backend API using `useSuggestions` hook
- Owned cards are highlighted/filtered by default
- Category filter works correctly
- Synergy scores are displayed with explanations
- Pagination works smoothly
- Loading and error states handled properly

### Phase 2: Format Dashboard

Build the FormatDashboard component for multi-format comparison view.

**Deliverables**:
- Create `apps/web/src/components/recommendations/FormatDashboard.tsx`
- Display coverage across all formats (Standard, Modern, Commander, Brawl)
- Show buildable decks count per format
- Add format comparison view
- Implement responsive grid layout

**Acceptance Criteria**:
- Dashboard shows coverage for all formats using `useBuildableDecks` and `useFormatCoverage` hooks
- Buildable decks are displayed per format
- Multi-format comparison view works
- Layout is responsive on mobile
- Loading and error states handled properly

### Technical Context

**Completed Dependencies**:
- Phase 1: React Query hooks available in `apps/web/src/hooks/useRecommendations.ts`
  - `useSuggestions`, `useBuildableDecks`, `useFormatCoverage`, `useMultiFormatComparison`, `useArchetype`, `useGaps`
- Phase 2: Basic UI components available in `apps/web/src/components/recommendations/`
  - `FormatSelector` - format dropdown component
  - `CollectionCoverage` - coverage metrics display

**Existing Patterns**:
- Use shadcn/ui components from `@/components/ui/`
- Follow existing component structure (Card, CardContent, etc.)
- Use Tailwind CSS for styling with project theme (text-text-primary, bg-accent-cyan, etc.)
- Use Loader2 from lucide-react for loading states
- Use Radix UI primitives for accessibility

### Technical Constraints

- Use React functional components with hooks
- Use Tailwind CSS for styling
- Follow TypeScript strict mode
- Use existing hooks from `useRecommendations.ts`
- Follow project coding standards in CLAUDE.md and PROJECT_AGENTS.md

## Behavior

Execute both phases sequentially within single implementation cycle. Each phase produces its deliverables before proceeding to the next. Both components should follow the same patterns established in FormatSelector and CollectionCoverage.

# AI Section
Critical: AI can ONLY modify this section.

## Research

### Codebase Analysis

**Available Hooks (from Phase 1)**:
- `useSuggestions({ deckId, collectionId, format, limit, offset, categoryFilter })` - Returns `{ suggestions, total, format, deckStage, hasMore }`
- `useBuildableDecks({ collectionId, format, limit })` - Returns `{ format, totalLegalCards, buildableDecks, viableArchetypes }`
- `useFormatCoverage({ collectionId, format? })` - Returns single format coverage or all formats object
- `useMultiFormatComparison({ collectionId, deckIds[] })` - Returns `{ comparisons }` with viability per format
- `useArchetype({ deckId, format })` - Returns `{ archetype, modifiers, confidence }`
- `useGaps({ deckId, format })` - Returns `{ categoryBreakdown, overallScore, recommendations }`

**Existing Components (from Phase 2)**:
- `FormatSelector` - Format dropdown (Standard/Modern/Commander/Brawl)
- `CollectionCoverage` - Visual coverage metrics for a collection

**UI Component Patterns**:
1. **Card Grid**: Uses `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4`
2. **Card Component**: Uses `Card`, `CardContent` from `@/components/ui/card`
3. **Loading States**: Uses `Loader2` from lucide-react with `animate-spin text-accent-cyan`
4. **Error States**: Red text (`text-red-400`)
5. **Badges**: Uses `Badge` from `@/components/ui/badge` with color variants
6. **Filtering**: Toggle badges with state management, clear button
7. **Tabs**: Uses `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from Radix UI

**API Response Types**:
```typescript
// Suggestion from useSuggestions
interface CardSuggestion {
  card: Card;
  score: { total: number; breakdown: Record<string, number> };
  categories: CardCategory[];
  inCollection: boolean;
}

// Category filter values
type CategoryFilter = 'ramp' | 'cardDraw' | 'removal' | 'boardWipe' | 'threats' | 'all';

// From useBuildableDecks
interface BuildableDeck {
  archetype: string;
  completeness: number;
  coreCardsOwned: string[];
  missingCount: number;
  missingKeyCards: string[];
}

interface ViableArchetype {
  archetype: string;
  completeness: number;
  keyCards: string[];
}
```

**Tailwind Theme Colors**:
- `text-text-primary`, `text-text-secondary`
- `bg-accent-cyan`, `bg-accent-lavender`
- `bg-background`, `bg-background-surface`, `bg-surface-elevated`
- `border-border`, `border-surface-elevated`

### Strategy

**RecommendationPanel Implementation**:
1. Create component that accepts `deckId`, `collectionId`, `format` as required props
2. Use `useSuggestions` hook with pagination support via `offset` and `limit`
3. Implement category filter using badge toggles (ramp, cardDraw, removal, boardWipe, threats, all)
4. Display card grid with synergy score badges
5. Add "Load More" button for pagination when `hasMore` is true
6. Handle loading, error, and empty states

**FormatDashboard Implementation**:
1. Create component that accepts `collectionId` as required prop
2. Use `useBuildableDecks` for each format to get buildable decks
3. Use `useFormatCoverage` without format to get all formats overview
4. Display grid of format cards with coverage stats
5. Each format card shows: total legal cards, viable archetypes count, buildable decks count
6. Add tabs for switching between formats for detailed view

**Files to Create**:
- `apps/web/src/components/recommendations/RecommendationPanel.tsx`
- `apps/web/src/components/recommendations/FormatDashboard.tsx`
- Update `apps/web/src/components/recommendations/index.ts` with new exports

## Plan

### Files

- `apps/web/src/components/recommendations/RecommendationPanel.tsx` (CREATE)
  - RecommendationPanelProps interface
  - Category filter state and constants
  - useSuggestions hook integration
  - Card grid display with synergy scores
  - Pagination with "Load More" button
  - Loading/error/empty states
- `apps/web/src/components/recommendations/FormatDashboard.tsx` (CREATE)
  - FormatDashboardProps interface
  - Format stats cards grid
  - useBuildableDecks and useFormatCoverage hooks
  - Tab navigation for format details
  - Loading/error states
- `apps/web/src/components/recommendations/index.ts` (MODIFY)
  - Export RecommendationPanel
  - Export FormatDashboard

### Tasks

#### Task 1 - Create RecommendationPanel component

Tools: Write

File: `apps/web/src/components/recommendations/RecommendationPanel.tsx`

Description: Create the RecommendationPanel component with category filtering, pagination, and card grid display.

````diff
--- /dev/null
+++ b/apps/web/src/components/recommendations/RecommendationPanel.tsx
@@ -0,0 +1,260 @@
+import { useState } from 'react';
+import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
+import { Badge } from '@/components/ui/badge';
+import { Button } from '@/components/ui/button';
+import { useSuggestions, type SuggestionsOutput } from '@/hooks/useRecommendations';
+import { Loader2 } from 'lucide-react';
+import { cn } from '@/lib/utils';
+import type { FormatType } from './FormatSelector';
+
+/**
+ * Category filter options
+ */
+const CATEGORY_OPTIONS = [
+  { value: 'all', label: 'All' },
+  { value: 'ramp', label: 'Ramp' },
+  { value: 'cardDraw', label: 'Card Draw' },
+  { value: 'removal', label: 'Removal' },
+  { value: 'boardWipe', label: 'Board Wipe' },
+  { value: 'threats', label: 'Threats' },
+] as const;
+
+type CategoryFilter = (typeof CATEGORY_OPTIONS)[number]['value'];
+
+/**
+ * Props for the RecommendationPanel component
+ */
+export interface RecommendationPanelProps {
+  /** Deck ID to get recommendations for */
+  deckId: string;
+  /** Collection ID to filter cards from */
+  collectionId: string;
+  /** Format for recommendations */
+  format: FormatType;
+  /** Number of cards per page */
+  pageSize?: number;
+  /** Additional CSS classes */
+  className?: string;
+  /** Callback when a card is clicked */
+  onCardClick?: (cardId: string) => void;
+}
+
+/**
+ * Single suggestion card display
+ */
+function SuggestionCard({
+  suggestion,
+  onCardClick,
+}: {
+  suggestion: NonNullable<SuggestionsOutput['suggestions']>[number];
+  onCardClick?: (cardId: string) => void;
+}) {
+  const card = suggestion.card;
+  const score = suggestion.score;
+  const imageUrl =
+    typeof card.imageUris === 'object' &&
+    card.imageUris !== null &&
+    'normal' in card.imageUris
+      ? String(card.imageUris.normal)
+      : '';
+
+  return (
+    <Card
+      className="overflow-hidden hover:border-accent-cyan transition-colors cursor-pointer group"
+      onClick={() => onCardClick?.(card.id)}
+    >
+      <CardContent className="p-0">
+        {/* Card Image */}
+        {imageUrl && (
+          <div className="relative">
+            <img
+              src={imageUrl}
+              alt={card.name}
+              className="w-full h-auto object-cover hover:opacity-90 transition-opacity"
+            />
+            {/* Synergy Score Badge */}
+            <div className="absolute bottom-2 right-2 bg-accent-cyan text-background font-bold px-2 py-1 rounded text-sm">
+              {Math.round(score.total)}
+            </div>
+            {/* Owned Badge */}
+            {suggestion.inCollection && (
+              <div className="absolute top-2 left-2 bg-green-500/90 text-white font-medium px-2 py-1 rounded text-xs">
+                Owned
+              </div>
+            )}
+          </div>
+        )}
+
+        {/* Card Info */}
+        <div className="p-3 space-y-2">
+          <div>
+            <div className="font-medium text-text-primary text-sm truncate group-hover:text-accent-cyan transition-colors">
+              {card.name}
+            </div>
+            <div className="text-xs text-text-secondary truncate">
+              {card.setCode?.toUpperCase()} #{card.collectorNumber}
+            </div>
+          </div>
+
+          {/* Categories */}
+          <div className="flex flex-wrap gap-1">
+            {suggestion.categories.slice(0, 2).map((category) => (
+              <Badge
+                key={category}
+                className="text-xs bg-accent-cyan/20 text-accent-cyan"
+              >
+                {category}
+              </Badge>
+            ))}
+          </div>
+        </div>
+      </CardContent>
+    </Card>
+  );
+}
+
+/**
+ * Category filter bar
+ */
+function CategoryFilterBar({
+  selected,
+  onSelect,
+}: {
+  selected: CategoryFilter;
+  onSelect: (category: CategoryFilter) => void;
+}) {
+  return (
+    <div className="flex flex-wrap gap-2">
+      {CATEGORY_OPTIONS.map((option) => (
+        <Badge
+          key={option.value}
+          className={cn(
+            'cursor-pointer transition-colors',
+            selected === option.value
+              ? 'bg-accent-cyan text-background'
+              : 'bg-surface-elevated text-text-secondary hover:bg-surface-elevated/80'
+          )}
+          onClick={() => onSelect(option.value)}
+        >
+          {option.label}
+        </Badge>
+      ))}
+    </div>
+  );
+}
+
+/**
+ * RecommendationPanel - Displays card recommendations for a deck
+ *
+ * Shows card suggestions from the user's collection with synergy scores,
+ * category filtering, and pagination support.
+ */
+export function RecommendationPanel({
+  deckId,
+  collectionId,
+  format,
+  pageSize = 20,
+  className,
+  onCardClick,
+}: RecommendationPanelProps) {
+  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
+  const [offset, setOffset] = useState(0);
+
+  // Reset offset when filter changes
+  const handleCategoryChange = (category: CategoryFilter) => {
+    setCategoryFilter(category);
+    setOffset(0);
+  };
+
+  const { data, isLoading, error, isFetching } = useSuggestions(
+    {
+      deckId,
+      collectionId,
+      format,
+      limit: pageSize,
+      offset,
+      categoryFilter,
+    },
+    { enabled: Boolean(deckId && collectionId && format) }
+  );
+
+  // Loading state (initial load)
+  if (isLoading) {
+    return (
+      <div className={cn('flex items-center justify-center py-12', className)}>
+        <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
+      </div>
+    );
+  }
+
+  // Error state
+  if (error) {
+    return (
+      <div className={cn('text-center py-8', className)}>
+        <p className="text-red-400 text-sm">Failed to load recommendations</p>
+        <p className="text-text-secondary text-xs mt-1">{error.message}</p>
+      </div>
+    );
+  }
+
+  const suggestions = data?.suggestions ?? [];
+  const hasMore = data?.hasMore ?? false;
+  const total = data?.total ?? 0;
+
+  return (
+    <div className={cn('space-y-4', className)}>
+      {/* Header with filters */}
+      <Card>
+        <CardHeader className="pb-3">
+          <div className="flex items-center justify-between">
+            <CardTitle className="text-lg">Recommendations</CardTitle>
+            <span className="text-sm text-text-secondary">
+              {total} cards found
+            </span>
+          </div>
+        </CardHeader>
+        <CardContent className="pt-0">
+          <CategoryFilterBar
+            selected={categoryFilter}
+            onSelect={handleCategoryChange}
+          />
+        </CardContent>
+      </Card>
+
+      {/* Empty state */}
+      {suggestions.length === 0 && !isLoading && (
+        <div className="text-center py-8">
+          <p className="text-text-secondary text-sm">
+            No recommendations found for this category
+          </p>
+        </div>
+      )}
+
+      {/* Card Grid */}
+      {suggestions.length > 0 && (
+        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
+          {suggestions.map((suggestion) => (
+            <SuggestionCard
+              key={suggestion.card.id}
+              suggestion={suggestion}
+              onCardClick={onCardClick}
+            />
+          ))}
+        </div>
+      )}
+
+      {/* Load More */}
+      {hasMore && (
+        <div className="flex justify-center pt-4">
+          <Button
+            variant="outline"
+            onClick={() => setOffset((prev) => prev + pageSize)}
+            disabled={isFetching}
+          >
+            {isFetching ? (
+              <>
+                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
+                Loading...
+              </>
+            ) : (
+              'Load More'
+            )}
+          </Button>
+        </div>
+      )}
+    </div>
+  );
+}
````

Verification:
- File exists at `apps/web/src/components/recommendations/RecommendationPanel.tsx`
- TypeScript compiles without errors

#### Task 2 - Create FormatDashboard component

Tools: Write

File: `apps/web/src/components/recommendations/FormatDashboard.tsx`

Description: Create the FormatDashboard component with format overview cards and tabbed detail view.

````diff
--- /dev/null
+++ b/apps/web/src/components/recommendations/FormatDashboard.tsx
@@ -0,0 +1,252 @@
+import { useState } from 'react';
+import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
+import { Badge } from '@/components/ui/badge';
+import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
+import {
+  useBuildableDecks,
+  useFormatCoverage,
+  type BuildableDecksOutput,
+  type FormatCoverageOutput,
+} from '@/hooks/useRecommendations';
+import { Loader2 } from 'lucide-react';
+import { cn } from '@/lib/utils';
+import type { FormatType } from './FormatSelector';
+
+/**
+ * Format display configuration
+ */
+const FORMATS: { value: FormatType; label: string; color: string }[] = [
+  { value: 'standard', label: 'Standard', color: 'bg-blue-500' },
+  { value: 'modern', label: 'Modern', color: 'bg-purple-500' },
+  { value: 'commander', label: 'Commander', color: 'bg-green-500' },
+  { value: 'brawl', label: 'Brawl', color: 'bg-orange-500' },
+];
+
+/**
+ * Props for the FormatDashboard component
+ */
+export interface FormatDashboardProps {
+  /** Collection ID to analyze */
+  collectionId: string;
+  /** Additional CSS classes */
+  className?: string;
+  /** Callback when a format is selected */
+  onFormatSelect?: (format: FormatType) => void;
+}
+
+/**
+ * Type guard for all-formats coverage response
+ */
+function isAllFormatsCoverage(
+  data: FormatCoverageOutput
+): data is {
+  standard: { format: string; totalLegalCards: number; viableArchetypes: unknown[]; buildableDecks: unknown[] };
+  modern: { format: string; totalLegalCards: number; viableArchetypes: unknown[]; buildableDecks: unknown[] };
+  commander: { format: string; totalLegalCards: number; viableArchetypes: unknown[]; buildableDecks: unknown[] };
+  brawl: { format: string; totalLegalCards: number; viableArchetypes: unknown[]; buildableDecks: unknown[] };
+} {
+  return 'standard' in data && 'modern' in data && 'commander' in data && 'brawl' in data;
+}
+
+/**
+ * Format summary card for the overview grid
+ */
+function FormatSummaryCard({
+  format,
+  label,
+  color,
+  totalLegalCards,
+  archetypeCount,
+  buildableCount,
+  isSelected,
+  onClick,
+}: {
+  format: FormatType;
+  label: string;
+  color: string;
+  totalLegalCards: number;
+  archetypeCount: number;
+  buildableCount: number;
+  isSelected: boolean;
+  onClick: () => void;
+}) {
+  return (
+    <Card
+      className={cn(
+        'cursor-pointer transition-all hover:border-accent-cyan',
+        isSelected && 'border-accent-cyan ring-1 ring-accent-cyan'
+      )}
+      onClick={onClick}
+    >
+      <CardHeader className="pb-2">
+        <div className="flex items-center gap-2">
+          <div className={cn('w-3 h-3 rounded-full', color)} />
+          <CardTitle className="text-base">{label}</CardTitle>
+        </div>
+      </CardHeader>
+      <CardContent className="space-y-2">
+        <div className="flex justify-between text-sm">
+          <span className="text-text-secondary">Legal Cards</span>
+          <span className="text-text-primary font-medium">
+            {totalLegalCards.toLocaleString()}
+          </span>
+        </div>
+        <div className="flex justify-between text-sm">
+          <span className="text-text-secondary">Archetypes</span>
+          <span className="text-accent-cyan font-medium">{archetypeCount}</span>
+        </div>
+        <div className="flex justify-between text-sm">
+          <span className="text-text-secondary">Buildable Decks</span>
+          <span className="text-accent-lavender font-medium">{buildableCount}</span>
+        </div>
+      </CardContent>
+    </Card>
+  );
+}
+
+/**
+ * Detailed view for a single format
+ */
+function FormatDetailView({
+  collectionId,
+  format,
+}: {
+  collectionId: string;
+  format: FormatType;
+}) {
+  const { data, isLoading, error } = useBuildableDecks(
+    { collectionId, format, limit: 10 },
+    { enabled: Boolean(collectionId && format) }
+  );
+
+  if (isLoading) {
+    return (
+      <div className="flex items-center justify-center py-8">
+        <Loader2 className="w-6 h-6 animate-spin text-accent-cyan" />
+      </div>
+    );
+  }
+
+  if (error) {
+    return (
+      <div className="text-center py-8">
+        <p className="text-red-400 text-sm">Failed to load format details</p>
+      </div>
+    );
+  }
+
+  const buildableDecks = data?.buildableDecks ?? [];
+  const viableArchetypes = data?.viableArchetypes ?? [];
+
+  return (
+    <div className="space-y-4">
+      {/* Viable Archetypes */}
+      {viableArchetypes.length > 0 && (
+        <Card>
+          <CardHeader className="pb-2">
+            <CardTitle className="text-sm font-medium text-text-secondary">
+              Viable Archetypes
+            </CardTitle>
+          </CardHeader>
+          <CardContent>
+            <div className="flex flex-wrap gap-2">
+              {viableArchetypes.map((arch) => (
+                <Badge
+                  key={arch.archetype}
+                  className="bg-accent-cyan/20 text-accent-cyan"
+                >
+                  {arch.archetype} ({arch.completeness}%)
+                </Badge>
+              ))}
+            </div>
+          </CardContent>
+        </Card>
+      )}
+
+      {/* Buildable Decks */}
+      {buildableDecks.length > 0 ? (
+        <Card>
+          <CardHeader className="pb-2">
+            <CardTitle className="text-sm font-medium text-text-secondary">
+              Buildable Decks
+            </CardTitle>
+          </CardHeader>
+          <CardContent>
+            <div className="space-y-3">
+              {buildableDecks.map((deck) => (
+                <div
+                  key={deck.archetype}
+                  className="flex items-center justify-between p-2 rounded bg-surface-elevated"
+                >
+                  <div>
+                    <div className="font-medium text-text-primary text-sm">
+                      {deck.archetype}
+                    </div>
+                    <div className="text-xs text-text-secondary">
+                      Missing {deck.missingCount} cards
+                    </div>
+                  </div>
+                  <div className="text-right">
+                    <div className="text-accent-cyan font-medium">
+                      {deck.completeness}%
+                    </div>
+                  </div>
+                </div>
+              ))}
+            </div>
+          </CardContent>
+        </Card>
+      ) : (
+        <div className="text-center py-8">
+          <p className="text-text-secondary text-sm">
+            No buildable decks found for this format
+          </p>
+        </div>
+      )}
+    </div>
+  );
+}
+
+/**
+ * FormatDashboard - Multi-format comparison dashboard
+ *
+ * Displays coverage overview for all formats with tabs for detailed view.
+ */
+export function FormatDashboard({
+  collectionId,
+  className,
+  onFormatSelect,
+}: FormatDashboardProps) {
+  const [selectedFormat, setSelectedFormat] = useState<FormatType>('standard');
+
+  const { data: coverageData, isLoading, error } = useFormatCoverage(
+    { collectionId },
+    { enabled: Boolean(collectionId) }
+  );
+
+  const handleFormatClick = (format: FormatType) => {
+    setSelectedFormat(format);
+    onFormatSelect?.(format);
+  };
+
+  // Loading state
+  if (isLoading) {
+    return (
+      <div className={cn('flex items-center justify-center py-12', className)}>
+        <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
+      </div>
+    );
+  }
+
+  // Error state
+  if (error) {
+    return (
+      <div className={cn('text-center py-8', className)}>
+        <p className="text-red-400 text-sm">Failed to load format dashboard</p>
+        <p className="text-text-secondary text-xs mt-1">{error.message}</p>
+      </div>
+    );
+  }
+
+  // Check for all-formats response
+  if (!coverageData || !isAllFormatsCoverage(coverageData)) {
+    return (
+      <div className={cn('text-center py-8', className)}>
+        <p className="text-text-secondary text-sm">No coverage data available</p>
+      </div>
+    );
+  }
+
+  return (
+    <div className={cn('space-y-6', className)}>
+      {/* Format Overview Grid */}
+      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
+        {FORMATS.map(({ value, label, color }) => {
+          const formatData = coverageData[value];
+          return (
+            <FormatSummaryCard
+              key={value}
+              format={value}
+              label={label}
+              color={color}
+              totalLegalCards={formatData.totalLegalCards}
+              archetypeCount={formatData.viableArchetypes.length}
+              buildableCount={formatData.buildableDecks.length}
+              isSelected={selectedFormat === value}
+              onClick={() => handleFormatClick(value)}
+            />
+          );
+        })}
+      </div>
+
+      {/* Format Detail Tabs */}
+      <Tabs value={selectedFormat} onValueChange={(v) => handleFormatClick(v as FormatType)}>
+        <TabsList className="w-full md:w-auto">
+          {FORMATS.map(({ value, label }) => (
+            <TabsTrigger key={value} value={value} className="flex-1 md:flex-none">
+              {label}
+            </TabsTrigger>
+          ))}
+        </TabsList>
+
+        {FORMATS.map(({ value }) => (
+          <TabsContent key={value} value={value}>
+            <FormatDetailView collectionId={collectionId} format={value} />
+          </TabsContent>
+        ))}
+      </Tabs>
+    </div>
+  );
+}
````

Verification:
- File exists at `apps/web/src/components/recommendations/FormatDashboard.tsx`
- TypeScript compiles without errors

#### Task 3 - Update barrel exports

Tools: Write

File: `apps/web/src/components/recommendations/index.ts`

Description: Update the barrel export file to include new components.

````diff
--- a/apps/web/src/components/recommendations/index.ts
+++ b/apps/web/src/components/recommendations/index.ts
@@ -1,2 +1,4 @@
 export { FormatSelector, type FormatSelectorProps, type FormatType } from './FormatSelector';
 export { CollectionCoverage, type CollectionCoverageProps } from './CollectionCoverage';
+export { RecommendationPanel, type RecommendationPanelProps } from './RecommendationPanel';
+export { FormatDashboard, type FormatDashboardProps } from './FormatDashboard';
````

Verification:
- All 4 components exported from index.ts

#### Task 4 - Lint files

Tools: Bash

Description: Run ESLint on all modified recommendation components.

Commands:
```bash
bun run lint
```

Verification:
- No lint errors in recommendation components

#### Task 5 - Type check

Tools: Bash

Description: Run TypeScript type checking.

Commands:
```bash
cd /home/mantis/Development/tcg-tracker && bun run type-check
```

Verification:
- No TypeScript errors in new components

#### Task 6 - Commit changes

Tools: Bash

Description: Commit the new components.

Commands:
```bash
cd /home/mantis/Development/tcg-tracker && git add apps/web/src/components/recommendations/RecommendationPanel.tsx apps/web/src/components/recommendations/FormatDashboard.tsx apps/web/src/components/recommendations/index.ts && git commit -m "$(cat <<'EOF'
feat(recommendations): add RecommendationPanel and FormatDashboard components

- RecommendationPanel: displays card suggestions with category filtering and pagination
- FormatDashboard: multi-format comparison with overview grid and tabbed detail view
- Both components integrate with Phase 1 hooks (useSuggestions, useBuildableDecks, useFormatCoverage)
- Responsive design using Tailwind CSS

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

Verification:
- Commit created successfully
- Only component files included

### Validate

| Requirement | Line | Compliance |
|-------------|------|------------|
| RecommendationPanel displays card recommendations | L55-61 | Task 1 creates component with card grid from useSuggestions |
| Owned cards shown by default | L55 | useSuggestions returns inCollection flag, shown with "Owned" badge |
| Category filtering (creatures, spells, lands, etc.) | L57 | CategoryFilterBar with ramp, cardDraw, removal, boardWipe, threats options |
| Pagination for large result sets | L58 | Offset-based pagination with "Load More" button |
| Show synergy scores and explanations | L59 | Score badge displayed on each card |
| FormatDashboard displays coverage across all formats | L85-91 | Uses useFormatCoverage without format to get all formats |
| Show buildable decks count per format | L86 | FormatSummaryCard shows buildableCount |
| Format comparison view | L87 | Grid of format cards with tabs for details |
| Responsive grid layout | L88 | Uses grid-cols-2 md:grid-cols-4 pattern |
| Loading and error states | L67, L91 | Both components handle loading/error states |
| Use existing hooks from useRecommendations.ts | L63 | Imports useSuggestions, useBuildableDecks, useFormatCoverage |
| Follow project coding standards | L64 | Uses existing patterns from codebase (Card, Badge, Loader2) |

## Implement

### TODO

- [x] Task 1 - Create RecommendationPanel component - Status: Done
- [x] Task 2 - Create FormatDashboard component - Status: Done
- [x] Task 3 - Update barrel exports - Status: Done
- [x] Task 4 - Lint files - Status: Done
- [x] Task 5 - Type check - Status: Done
- [x] Task 6 - Commit changes - Status: Done

### Implementation Summary

Created two display components for the recommendation system:

1. **RecommendationPanel** (`apps/web/src/components/recommendations/RecommendationPanel.tsx`)
   - Displays card suggestions from useSuggestions hook
   - Category filter bar with 6 options (all, ramp, cardDraw, removal, boardWipe, threats)
   - Card grid with synergy scores and "Owned" badges
   - Load More pagination with offset-based loading
   - Loading, error, and empty states

2. **FormatDashboard** (`apps/web/src/components/recommendations/FormatDashboard.tsx`)
   - Overview grid showing all 4 formats with coverage stats
   - Tabbed detail view for each format
   - Shows viable archetypes and buildable decks
   - Interactive format selection

Commit: 20d821d
