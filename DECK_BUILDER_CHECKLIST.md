# Deck Builder Implementation Checklist

**Feature:** Deck Builder
**Status:** Not Started
**Start Date:** TBD
**Target Completion:** 2-3 days

---

## 📋 Day 1: Backend Foundation

### Phase 1: Database Schema (2 hours)

#### 1.1 Create Migration File
- [ ] Create `packages/db/drizzle/0001_add_decks.sql`
- [ ] Add `decks` table definition
  - [ ] id (UUID primary key)
  - [ ] name (VARCHAR 255)
  - [ ] description (TEXT)
  - [ ] format (VARCHAR 50)
  - [ ] owner_id (UUID foreign key)
  - [ ] timestamps (created_at, updated_at, deleted_at)
- [ ] Add `deck_cards` junction table definition
  - [ ] id (UUID primary key)
  - [ ] deck_id (UUID foreign key)
  - [ ] card_id (UUID foreign key)
  - [ ] quantity (INTEGER with CHECK)
  - [ ] card_type (VARCHAR 20: mainboard/sideboard/commander)
  - [ ] timestamps
  - [ ] UNIQUE constraint on (deck_id, card_id, card_type)
- [ ] Add indexes
  - [ ] idx_decks_owner_id
  - [ ] idx_deck_cards_deck_id
  - [ ] idx_deck_cards_card_id
- [ ] Create `deck_stats` view
- [ ] Run migration: `psql -U mantis -d tcg_tracker -f packages/db/drizzle/0001_add_decks.sql`
- [ ] Verify tables: `psql -U mantis -d tcg_tracker -c "\dt decks"`

#### 1.2 Create Drizzle Schema Files
- [ ] Create `packages/db/src/schema/decks.ts`
  - [ ] Define decks table schema
  - [ ] Export decks constant
- [ ] Create `packages/db/src/schema/deck-cards.ts`
  - [ ] Import decks and cards tables
  - [ ] Define deckCards table schema
  - [ ] Add unique constraint
  - [ ] Export deckCards constant
- [ ] Update `packages/db/src/schema/index.ts`
  - [ ] Add `export * from './decks'`
  - [ ] Add `export * from './deck-cards'`
- [ ] Test: `bun run build` in packages/db (should compile without errors)

### Phase 2: Backend API Routes (3 hours)

#### 2.1 Create Deck Router
- [ ] Create `apps/api/src/router/decks.ts`
- [ ] Import dependencies (z, trpc, db, schemas)
- [ ] Define input validation schemas
  - [ ] createDeckSchema
  - [ ] updateDeckSchema
  - [ ] addCardToDeckSchema
  - [ ] updateCardQuantitySchema
  - [ ] removeCardSchema

#### 2.2 Implement CRUD Operations
- [ ] `decks.list` - List user's decks
  - [ ] Filter by owner_id
  - [ ] Filter out soft-deleted
  - [ ] Order by updated_at DESC
- [ ] `decks.get` - Get single deck with cards
  - [ ] Verify ownership
  - [ ] Join with deck_cards and cards
  - [ ] Return deck with nested cards array
- [ ] `decks.create` - Create new deck
  - [ ] Validate input
  - [ ] Insert with owner_id from context
  - [ ] Return created deck
- [ ] `decks.update` - Update deck metadata
  - [ ] Verify ownership
  - [ ] Update name, description, format
  - [ ] Update updated_at timestamp
- [ ] `decks.delete` - Soft delete deck
  - [ ] Verify ownership
  - [ ] Set deleted_at timestamp

#### 2.3 Implement Card Management
- [ ] `decks.addCard` - Add card to deck
  - [ ] Verify deck ownership
  - [ ] Insert or update on conflict
  - [ ] Support mainboard/sideboard/commander
- [ ] `decks.updateCardQuantity` - Update card quantity
  - [ ] If quantity = 0, soft delete
  - [ ] Otherwise update quantity
- [ ] `decks.removeCard` - Remove card from deck
  - [ ] Soft delete (set deleted_at)

#### 2.4 Implement Analytics
- [ ] `decks.analyze` - Get deck statistics
  - [ ] Calculate mana curve (CMC distribution)
  - [ ] Calculate card type distribution
  - [ ] Calculate color distribution
  - [ ] Calculate average CMC
  - [ ] Count total cards, mainboard, sideboard

#### 2.5 Update Root Router
- [ ] Edit `apps/api/src/router/index.ts`
- [ ] Import decksRouter
- [ ] Add to appRouter: `decks: decksRouter`
- [ ] Verify TypeScript compilation
- [ ] Test server restarts without errors

#### 2.6 Manual Testing
- [ ] Test `decks.list` via curl/Postman
- [ ] Test `decks.create` via curl/Postman
- [ ] Test `decks.get` via curl/Postman
- [ ] Test `decks.addCard` via curl/Postman
- [ ] Test `decks.analyze` via curl/Postman

---

## 📋 Day 2: Frontend UI

### Phase 3: Frontend Pages & Components (5 hours)

#### 3.1 Create Decks List Page
- [ ] Create `apps/web/src/pages/Decks.tsx`
- [ ] Import tRPC hooks and UI components
- [ ] Use `trpc.decks.list.useQuery()`
- [ ] Render deck cards in grid layout
- [ ] Add "New Deck" button
- [ ] Show empty state if no decks
- [ ] Make deck cards clickable → navigate to detail
- [ ] Add loading skeleton

#### 3.2 Create Deck Dialog Component
- [ ] Create `apps/web/src/components/decks/DeckDialog.tsx`
- [ ] Reuse pattern from `CollectionDialog.tsx`
- [ ] Add form fields: name, description, format
- [ ] Format dropdown: Standard, Modern, Commander, etc.
- [ ] Use `trpc.decks.create.useMutation()`
- [ ] Use `trpc.decks.update.useMutation()` for editing
- [ ] Invalidate queries on success
- [ ] Show success/error toasts

#### 3.3 Create Deck Detail Page
- [ ] Create `apps/web/src/pages/DeckDetail.tsx`
- [ ] Get deck ID from URL params
- [ ] Use `trpc.decks.get.useQuery()`
- [ ] Use `trpc.decks.analyze.useQuery()`
- [ ] Show deck header (name, format, description)
- [ ] Add back button
- [ ] Add delete button
- [ ] Render tabs: Mainboard / Sideboard
- [ ] Add "Add Cards" button
- [ ] Show card count badges

#### 3.4 Create Deck Card Grid Component
- [ ] Create `apps/web/src/components/decks/DeckCardGrid.tsx`
- [ ] Accept props: deckId, cards, cardType
- [ ] Reuse CardQuantityControl pattern
- [ ] Display cards in responsive grid
- [ ] Show card images
- [ ] Show quantity badge
- [ ] Implement +/- quantity controls
- [ ] Use `trpc.decks.updateCardQuantity.useMutation()`
- [ ] Implement optimistic updates
- [ ] Add remove card functionality
- [ ] Show empty state

#### 3.5 Create Deck Stats Component
- [ ] Create `apps/web/src/components/decks/DeckStats.tsx`
- [ ] Accept analytics data as props
- [ ] Show stat cards:
  - [ ] Total cards
  - [ ] Mainboard count
  - [ ] Sideboard count
  - [ ] Average CMC
- [ ] Add placeholder for charts (implement in Phase 4)

#### 3.6 Update Card Search for Decks
- [ ] Update `apps/web/src/components/cards/CardSearchDialog.tsx`
- [ ] Add optional `mode` prop: "collection" | "deck"
- [ ] Add optional `deckId` prop
- [ ] Add optional `cardType` prop (mainboard/sideboard)
- [ ] When mode="deck", use `trpc.decks.addCard.useMutation()`
- [ ] Pass cardType when adding to deck

#### 3.7 Update Routing
- [ ] Edit `apps/web/src/App.tsx`
- [ ] Import Decks and DeckDetail pages
- [ ] Add route: `/decks` → `<Decks />`
- [ ] Add route: `/decks/:id` → `<DeckDetail />`

#### 3.8 Update Navigation
- [ ] Edit `apps/web/src/components/layout/BottomNav.tsx`
- [ ] Change "Build" button link from `/build` to `/decks`
- [ ] Update icon or label if needed

#### 3.9 End-to-End Testing
- [ ] Navigate to http://localhost:5174/decks
- [ ] Click "New Deck"
- [ ] Fill out form and create deck
- [ ] Verify deck appears in list
- [ ] Click deck to view details
- [ ] Click "Add Cards"
- [ ] Search for a card
- [ ] Add card to mainboard
- [ ] Verify card appears in grid
- [ ] Test +/- quantity controls
- [ ] Test remove card
- [ ] Switch to Sideboard tab
- [ ] Add card to sideboard
- [ ] Verify card appears
- [ ] Test delete deck
- [ ] Verify redirect to decks list

---

## 📋 Day 3: Analytics & Polish

### Phase 4: Charts & Visualization (2 hours)

#### 4.1 Install Chart Library
- [ ] `cd apps/web`
- [ ] `bun add recharts`
- [ ] Verify installation

#### 4.2 Create Mana Curve Chart
- [ ] Create `apps/web/src/components/decks/ManaCurveChart.tsx`
- [ ] Import Recharts components (BarChart, Bar, XAxis, YAxis, etc.)
- [ ] Accept `manaCurve` data as props (Record<number, number>)
- [ ] Transform data for Recharts format
- [ ] Configure bar chart:
  - [ ] X-axis: CMC (0-7+)
  - [ ] Y-axis: Card count
  - [ ] Bars: accent-cyan color
- [ ] Add tooltips
- [ ] Add responsive container
- [ ] Style with Tailwind

#### 4.3 Create Type Distribution Chart
- [ ] Create `apps/web/src/components/decks/TypeDistributionChart.tsx`
- [ ] Import Recharts PieChart components
- [ ] Accept `typeDistribution` data as props
- [ ] Configure pie chart with type labels
- [ ] Color-code by type
- [ ] Add legend
- [ ] Add tooltips with percentages

#### 4.4 Create Color Distribution Chart
- [ ] Create `apps/web/src/components/decks/ColorDistributionChart.tsx`
- [ ] Import Recharts PieChart components
- [ ] Accept `colorDistribution` data as props
- [ ] Use MTG color scheme:
  - [ ] W: #F0F2C0
  - [ ] U: #5ECBF5
  - [ ] B: #4A4E54
  - [ ] R: #F87171
  - [ ] G: #86EFAC
- [ ] Add legend
- [ ] Add tooltips

#### 4.5 Integrate Charts into DeckStats
- [ ] Update `DeckStats.tsx`
- [ ] Import all chart components
- [ ] Create layout with charts:
  - [ ] Top: Stat cards
  - [ ] Middle: Mana curve chart (full width)
  - [ ] Bottom: Type and Color charts (side by side)
- [ ] Make responsive (stack on mobile)

### Phase 5: Export & Format Validation (1 hour)

#### 5.1 Export Functionality
- [ ] Create `apps/web/src/lib/deckExport.ts`
- [ ] Implement `exportAsText(deck, cards)` function
- [ ] Format: "Quantity CardName\n"
- [ ] Separate mainboard and sideboard
- [ ] Support commander notation
- [ ] Add deck name and format as header

#### 5.2 Add Export Button
- [ ] Add "Export" button to DeckDetail page
- [ ] Use export function
- [ ] Copy to clipboard functionality
- [ ] Show success toast
- [ ] Alternative: Download as .txt file

#### 5.3 Format Validation (Optional)
- [ ] Create `apps/web/src/lib/formatValidation.ts`
- [ ] Define format rules:
  - [ ] Standard: 60 cards min, 4-copy limit
  - [ ] Modern: 60 cards min, 4-copy limit
  - [ ] Commander: 100 cards exactly, 1-copy limit (except basic lands)
- [ ] Implement validation function
- [ ] Show warnings in DeckStats component
- [ ] Highlight illegal cards

### Phase 6: Polish & Bug Fixes (2 hours)

#### 6.1 Loading States
- [ ] Add skeleton loaders for decks list
- [ ] Add skeleton loaders for deck detail
- [ ] Add skeleton loaders for charts
- [ ] Add loading spinners for mutations

#### 6.2 Error Handling
- [ ] Add error boundaries for pages
- [ ] Show error toasts for failed mutations
- [ ] Handle "deck not found" gracefully
- [ ] Handle "no cards in deck" state

#### 6.3 Optimistic Updates
- [ ] Verify optimistic updates work for:
  - [ ] Adding cards to deck
  - [ ] Updating card quantity
  - [ ] Removing cards
- [ ] Ensure rollback on error

#### 6.4 Mobile Responsiveness
- [ ] Test on mobile viewport
- [ ] Ensure charts are responsive
- [ ] Verify grid layouts work
- [ ] Test bottom navigation
- [ ] Fix any overflow issues

#### 6.5 TypeScript Cleanup
- [ ] Fix any remaining TS errors
- [ ] Add missing type annotations
- [ ] Remove unused imports
- [ ] Run `bun run build` successfully

#### 6.6 Final Testing
- [ ] Test complete user flow on desktop
- [ ] Test complete user flow on mobile
- [ ] Test with empty deck
- [ ] Test with large deck (100+ cards)
- [ ] Test error cases
- [ ] Test with different formats
- [ ] Verify all mutations invalidate correctly

---

## ✅ Definition of Done

### Functionality
- [ ] Can create, read, update, delete decks
- [ ] Can add cards to mainboard
- [ ] Can add cards to sideboard
- [ ] Can update card quantities
- [ ] Can remove cards from deck
- [ ] Mana curve chart displays correctly
- [ ] Type distribution chart displays correctly
- [ ] Color distribution chart displays correctly
- [ ] Can export deck as text
- [ ] All stats calculate accurately

### Code Quality
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] All tRPC queries working
- [ ] Optimistic updates implemented
- [ ] Error handling in place
- [ ] Loading states present

### UX
- [ ] Responsive on mobile and desktop
- [ ] Smooth animations and transitions
- [ ] Clear empty states
- [ ] Helpful error messages
- [ ] Success feedback for actions

### Documentation
- [ ] Code is well-commented
- [ ] Component props documented
- [ ] Complex logic explained

---

## 🎯 Success Metrics

After completion:
- [ ] Can build a complete deck from scratch in < 5 minutes
- [ ] Charts load in < 1 second
- [ ] All mutations complete in < 500ms (optimistic)
- [ ] Zero blocking bugs
- [ ] Works on Chrome, Firefox, Safari
- [ ] Works on mobile (iOS/Android)

---

## 📝 Notes

### Patterns to Reuse
- Collections CRUD → Decks CRUD
- CollectionDialog → DeckDialog
- CardQuantityControl → Deck card quantity controls
- CompleteCardGrid → DeckCardGrid

### New Patterns
- Charts with Recharts
- Tab-based navigation (mainboard/sideboard)
- Export functionality

### Keep in Mind
- Commander decks: 100 cards exactly
- Sideboard: typically 15 cards max
- Basic lands: no limit in most formats
- Legendary rule: 1 of each legendary

---

## 🐛 Known Issues to Watch For

- [ ] Optimistic updates can cause race conditions
- [ ] Chart rendering can be slow with large datasets
- [ ] Need to handle double-faced cards properly
- [ ] Card type parsing may need refinement
- [ ] CMC calculation for X-spells

---

**Start Date:** _________
**Completion Date:** _________
**Total Time:** _________

---

Mark items as complete as you go. Good luck! 🚀
