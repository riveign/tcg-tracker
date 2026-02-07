# Human Section
Critical: any text/subsection here cannot be modified by AI.

## High-Level Objective (HLO)

Build React Query hooks foundation for MTG Deck Recommendation System frontend integration.

## Mid-Level Objectives (MLO)

1. Create useRecommendations.ts with hooks for all 6 backend API endpoints
2. Add TypeScript types for all API request/response structures
3. Implement proper error handling and loading states
4. Configure React Query cache strategies

## Details (DT)

### Backend API Context

The backend recommendation API is already complete at:
- `apps/api/src/router/recommendations.ts`

Available endpoints:
1. `getSuggestions(deckId, collectionId, format, limit, offset, categoryFilter)` - Get card recommendations
2. `getBuildableDecks(collectionId, format, limit)` - Find complete decks user can build
3. `getFormatCoverage(collectionId, format?)` - Show collection coverage by format
4. `getMultiFormatComparison(collectionId, deckIds[])` - Compare formats side-by-side
5. `getArchetype(deckId, format)` - Detect deck archetype
6. `getGaps(deckId, format)` - Find missing cards for deck completion

### Deliverables

1. Create `apps/web/src/hooks/useRecommendations.ts` with the following hooks:
   - `useSuggestions` - Card recommendations for a deck
   - `useBuildableDecks` - Complete buildable decks from collection
   - `useFormatCoverage` - Coverage metrics per format
   - `useMultiFormatComparison` - Multi-format comparison data
   - `useArchetype` - Deck archetype detection
   - `useGaps` - Missing cards analysis

2. Create TypeScript types in the hooks file for:
   - All request parameters
   - All response data structures
   - Loading states
   - Error types

3. Implement for each hook:
   - Proper React Query configuration (queryKey, queryFn)
   - Loading state handling
   - Error handling with informative messages
   - Cache invalidation strategies
   - Refetch triggers where appropriate

4. Configure React Query defaults:
   - Stale time settings
   - Cache time settings
   - Retry logic
   - Refetch on window focus behavior

### Acceptance Criteria

- [ ] All 6 backend endpoints have corresponding React Query hooks
- [ ] Hooks handle loading and error states properly
- [ ] TypeScript types are complete and accurate
- [ ] Cache invalidation strategies are implemented
- [ ] Hooks follow React Query best practices
- [ ] No TypeScript errors or warnings
- [ ] Hooks are exported from the file for use in components

### Technical Constraints

- Use TanStack Query (React Query)
- Use tRPC for API calls
- Follow TypeScript strict mode
- Follow project coding standards in CLAUDE.md and PROJECT_AGENTS.md

## Behavior

Implement the React Query hooks foundation as described above. This is the foundation for all frontend components in subsequent phases.

# AI Section
Critical: AI can ONLY modify this section.

## Research

### Codebase Analysis

#### Backend Router Structure
The recommendations router is located at `/home/mantis/Development/tcg-tracker/apps/api/src/router/recommendations.ts` and is already integrated into the root router at `/home/mantis/Development/tcg-tracker/apps/api/src/router/index.ts` as `recommendations: recommendationsRouter`.

**Available Endpoints:**

1. **getSuggestions** - Input schema:
   - `deckId: string.uuid()` (required)
   - `collectionId: string.uuid()` (required)
   - `format: enum('standard', 'modern', 'commander', 'brawl')` (required)
   - `limit: number.min(1).max(50).default(20)`
   - `offset: number.min(0).default(0)`
   - `categoryFilter: enum('ramp', 'cardDraw', 'removal', 'boardWipe', 'threats', 'all').default('all')`

   Returns: `{ suggestions, total, format, deckStage, hasMore }`

2. **getBuildableDecks** - Input schema:
   - `collectionId: string.uuid()` (required)
   - `format: formatEnum` (required)
   - `limit: number.min(1).max(20).default(10)`

   Returns: `{ format, totalLegalCards, buildableDecks, viableArchetypes }`

3. **getFormatCoverage** - Input schema:
   - `collectionId: string.uuid()` (required)
   - `format: formatEnum.optional()`

   Returns: Single format coverage OR all formats object `{ standard, modern, commander, brawl }`

4. **getArchetype** - Input schema:
   - `deckId: string.uuid()`
   - `format: formatEnum`

   Returns: `{ archetype, modifiers, confidence }`

5. **getGaps** - Input schema:
   - `deckId: string.uuid()`
   - `format: formatEnum`

   Returns: `DeckGapAnalysis { categoryBreakdown, overallScore, recommendations }`

6. **getMultiFormatComparison** - Input schema:
   - `collectionId: string.uuid()` (required)
   - `deckIds: array.uuid().min(1).max(10)`

   Returns: `{ comparisons: [{ deckId, deckName, viability: [{ format, isViable, completeness }] }] }`

#### Frontend tRPC Setup
- tRPC client configured at `/home/mantis/Development/tcg-tracker/apps/web/src/lib/trpc.ts`
- Uses `createTRPCReact<AppRouter>()` from `@trpc/react-query`
- Types imported from `@tcg-tracker/api/types` which exports `AppRouter` from the router index
- QueryClient defaults: `staleTime: 5 minutes`, `retry: 1`, `refetchOnWindowFocus: false`

#### Existing Hook Patterns
Current hooks in `/home/mantis/Development/tcg-tracker/apps/web/src/hooks/`:
- `useDebounce.ts` - Simple debounce utility
- `useCardRecognition.ts` - OCR-based card recognition (complex, self-contained)

Pattern for tRPC hook usage across the codebase:
```typescript
// Query pattern
const { data, isLoading } = trpc.<router>.<endpoint>.useQuery(
  { inputParams },
  { enabled: Boolean(condition) }
);

// Cache invalidation pattern
const utils = trpc.useUtils();
await utils.<router>.<endpoint>.invalidate({ params });

// Mutation pattern
const mutation = trpc.<router>.<endpoint>.useMutation({
  onSuccess: async () => {
    await utils.<router>.<list>.invalidate();
  }
});
```

#### Type System
Types for the recommendation system are defined in `/home/mantis/Development/tcg-tracker/apps/api/src/lib/recommendation/format-adapters/types.ts` and exported via `/home/mantis/Development/tcg-tracker/apps/api/src/lib/recommendation/index.ts`.

Key types already available:
- `FormatType`, `CardCategory`, `DeckStage`, `CardType`
- `SynergyScore`, `ScoreBreakdown`, `ScoringContext`
- `DeckGapAnalysis`, `CategoryAnalysis`, `GapRecommendation`
- `FormatCoverage`, `ViableArchetype`, `BuildableDeck`
- `CardSuggestion`, `RecommendationResult`

**CRITICAL**: These types are NOT currently exported from `@tcg-tracker/api/types`. The current types.ts only exports `AppRouter`. We need to either:
1. Infer types from tRPC client using `inferProcedureOutput`/`inferProcedureInput`
2. Export recommendation types from `@tcg-tracker/api/types`

#### Testing Patterns
Backend tests use Bun test framework at `/home/mantis/Development/tcg-tracker/apps/api/src/lib/recommendation/__tests__/`. No frontend tests currently exist for hooks. Given this is a hooks-only spec, unit testing is less critical as types are inferred from tRPC.

### Strategy

#### Implementation Approach

1. **Create `/home/mantis/Development/tcg-tracker/apps/web/src/hooks/useRecommendations.ts`**

   Use tRPC's type inference (`RouterOutput`/`RouterInput`) to derive types directly from the router, avoiding type duplication:
   ```typescript
   import { trpc } from '@/lib/trpc';
   import type { inferRouterOutputs, inferRouterInputs } from '@trpc/server';
   import type { AppRouter } from '@tcg-tracker/api/types';

   type RouterOutput = inferRouterOutputs<AppRouter>;
   type RouterInput = inferRouterInputs<AppRouter>;
   ```

2. **Hook Structure**
   Each hook will:
   - Accept typed input parameters
   - Use `trpc.recommendations.<endpoint>.useQuery()` with appropriate options
   - Be conditionally enabled using `enabled: Boolean(requiredParams)`
   - Return `{ data, isLoading, error, refetch }` pattern

3. **Cache Strategy**
   - `getSuggestions`: 2 min stale time (changes with collection/deck updates)
   - `getBuildableDecks`: 5 min stale time (stable unless collection changes)
   - `getFormatCoverage`: 5 min stale time (stable)
   - `getArchetype`: 10 min stale time (stable for same deck)
   - `getGaps`: 5 min stale time (stable for same deck)
   - `getMultiFormatComparison`: 5 min stale time

4. **Cache Invalidation Helpers**
   Export utility functions to invalidate recommendation caches:
   - `useInvalidateRecommendations()` - returns utils with invalidation methods
   - This allows components to invalidate after deck/collection mutations

5. **Error Handling**
   Use tRPC's built-in error handling. Each hook exposes `error` from useQuery which contains typed TRPCClientError.

#### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/src/hooks/useRecommendations.ts` | Create | Main hooks file with all 6 hooks |

#### Deliverables

1. `useSuggestions(params)` - Paginated card recommendations
2. `useBuildableDecks(params)` - Complete buildable decks
3. `useFormatCoverage(params)` - Format coverage metrics
4. `useMultiFormatComparison(params)` - Multi-deck format comparison
5. `useArchetype(params)` - Deck archetype detection
6. `useGaps(params)` - Gap analysis for deck
7. `useInvalidateRecommendations()` - Cache invalidation utility

#### Type Exports

All types will be inferred from the tRPC router using:
```typescript
// Input types
export type SuggestionsInput = RouterInput['recommendations']['getSuggestions'];
export type BuildableDecksInput = RouterInput['recommendations']['getBuildableDecks'];
// ... etc

// Output types
export type SuggestionsOutput = RouterOutput['recommendations']['getSuggestions'];
export type BuildableDecksOutput = RouterOutput['recommendations']['getBuildableDecks'];
// ... etc
```

This approach ensures types stay in sync with the backend without manual duplication.
