# Human Section
Critical: any text/subsection here cannot be modified by AI.

## High-Level Objective (HLO)

Build FormatSelector and CollectionCoverage UI components for the MTG Deck Recommendation System.

## Mid-Level Objectives (MLO)

1. Create FormatSelector component for format dropdown/selector
2. Create CollectionCoverage component for visual coverage metrics
3. Implement responsive design using Tailwind CSS
4. Add proper TypeScript types and props interfaces

## Details (DT)

### Context

Phase 1 is complete with all React Query hooks available in `apps/web/src/hooks/useRecommendations.ts`. This phase builds the basic UI components that will be used by the recommendation panel and dashboard in subsequent phases.

### Deliverables

1. **FormatSelector Component** (`apps/web/src/components/recommendations/FormatSelector.tsx`)
   - Display all supported formats: Standard, Commander, Modern, Brawl
   - Allow user to select a format
   - Emit selected format to parent component
   - Responsive design for mobile devices
   - Follow existing UI/UX patterns in the app

2. **CollectionCoverage Component** (`apps/web/src/components/recommendations/CollectionCoverage.tsx`)
   - Display visual coverage metrics (percentage, card counts)
   - Use `useFormatCoverage` hook from Phase 1
   - Show coverage breakdown by card types or categories
   - Progress bars or visual indicators
   - Responsive design for mobile devices
   - Handle loading and error states

3. **TypeScript Types**
   - Props interfaces for both components
   - Type-safe component APIs
   - Proper exported types for consumers

4. **Responsive Design**
   - Use Tailwind CSS for styling
   - Mobile-first responsive design
   - Follow existing component patterns in the app

### Acceptance Criteria

- [ ] FormatSelector displays all supported formats (Standard, Commander, Modern, Brawl)
- [ ] CollectionCoverage shows visual coverage metrics
- [ ] Components are responsive for mobile devices
- [ ] Components follow existing UI/UX patterns in the app
- [ ] TypeScript types are complete and accurate
- [ ] No TypeScript errors or warnings
- [ ] Components integrate with Phase 1 hooks

### Technical Constraints

- Use React functional components with hooks
- Use Tailwind CSS for styling
- Follow TypeScript strict mode
- Use Phase 1 hooks (`useFormatCoverage`)
- Follow project coding standards in CLAUDE.md and PROJECT_AGENTS.md

### Dependencies

- **Phase 1 (COMPLETED)**: React Query hooks in `apps/web/src/hooks/useRecommendations.ts`

## Behavior

Implement the two basic UI components as described above. These components will be foundational for the recommendation panel and dashboard in subsequent phases.

# AI Section
Critical: AI can ONLY modify this section.

## RESEARCH Stage

### Codebase Analysis

**Existing UI Component Architecture**:
- Location: `/apps/web/src/components/`
- Structure: `ui/` (shadcn primitives), `cards/`, `decks/`, `collections/`, `layout/`
- No `recommendations/` folder exists - needs to be created

**Key Patterns Identified**:

1. **Props Interface Pattern** (from `CollectionStats.tsx`):
   ```typescript
   interface ComponentProps {
     propName: PropType;
   }
   export const Component = ({ propName }: ComponentProps) => { ... }
   ```

2. **Select Component** - Uses Radix UI via `@/components/ui/select`
   - Components: `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`

3. **Loading/Error States** (from `CardSearch.tsx`, `CollectionDetail.tsx`):
   - Loading: `Loader2` spinner from lucide-react with `text-accent-cyan`
   - Error: Simple red text message (`text-red-400`)

4. **Progress Bars** (from `Scan.tsx`):
   ```typescript
   <div className="bg-background-card rounded-full h-2 overflow-hidden">
     <div className="bg-accent-cyan h-full transition-all duration-300"
          style={{ width: `${progress}%` }} />
   </div>
   ```

5. **Stats Grid** (from `CollectionStats.tsx`, `DeckStats.tsx`):
   ```typescript
   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
     <Card>
       <CardContent className="p-4">
         <div className="text-sm text-text-secondary">Label</div>
         <div className="text-2xl font-bold text-text-primary">{value}</div>
       </CardContent>
     </Card>
   </div>
   ```

**Tailwind Configuration** (`/apps/web/tailwind.config.js`):
- Custom colors: `text-text-primary`, `text-text-secondary`, `bg-accent-cyan`, `bg-accent-lavender`
- Fonts: `font-sans` (Inter), `font-display` (Space Grotesk)
- Uses `tailwindcss-animate` plugin

**Phase 1 Hook Analysis** (`useFormatCoverage`):
- Input: `{ collectionId: string; format?: FormatType }`
- When format omitted: Returns coverage for ALL formats as object with format keys
- Output includes: `totalLegalCards`, `viableArchetypes[]`, `buildableDecks[]`

**Supported Formats**:
```typescript
type FormatType = 'standard' | 'modern' | 'commander' | 'brawl';
```

### Technical Approach

**FormatSelector Component**:
1. Use existing Radix Select primitives from `@/components/ui/select`
2. Props: `value`, `onValueChange`, `disabled?`, `className?`
3. Display format labels with proper capitalization
4. Responsive: Full width on mobile

**CollectionCoverage Component**:
1. Use `useFormatCoverage` hook with optional format parameter
2. Display metrics in Card grid (matching existing patterns)
3. Progress bar for coverage percentage
4. Show: Legal Cards, Viable Archetypes count, Buildable Decks count
5. Handle loading/error states per existing patterns

### Files to Create
- `/apps/web/src/components/recommendations/FormatSelector.tsx`
- `/apps/web/src/components/recommendations/CollectionCoverage.tsx`
- `/apps/web/src/components/recommendations/index.ts` (barrel export)

### Dependencies Verified
- Phase 1 hooks available in `useRecommendations.ts`
- UI primitives available in `@/components/ui/`
- Tailwind theme configured with required colors
- `lucide-react` available for icons
