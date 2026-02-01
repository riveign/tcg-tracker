# TCG Tracker - Feature Roadmap

**Current Status:** ✅ Auth & Collections CRUD complete
**Last Updated:** February 1, 2026

---

## 🎯 Next 3 Needle-Mover Features

### 1. Card Search & Add to Collection ⭐ PRIORITY 1

**Value:** Core functionality - users need to find and add cards to their collections

**User Flow:**
1. User opens a collection
2. Clicks "Add Cards" button
3. Searches for card by name (Scryfall API)
4. Sees card results with images and details
5. Selects card and specifies quantity
6. Card is added to collection

**Backend Tasks:**
- [ ] Scryfall API integration utility (`apps/api/src/lib/scryfall.ts`)
  - Search cards by name endpoint
  - Get card by ID endpoint
  - Handle card data transformation
- [ ] tRPC route: `cards.search` (query)
  - Input: `{ query: string, page?: number }`
  - Output: `{ cards: Card[], hasMore: boolean }`
- [ ] tRPC route: `collections.addCard` (mutation)
  - Input: `{ collectionId: string, cardId: string, quantity: number, metadata?: object }`
  - Output: `{ success: boolean, collectionCard: CollectionCard }`
- [ ] tRPC route: `collections.getCards` (query)
  - Input: `{ collectionId: string }`
  - Output: `{ cards: CollectionCardWithDetails[] }`
- [ ] Insert card into `cards` table if doesn't exist (upsert)
- [ ] Insert/update into `collection_cards` junction table

**Frontend Tasks:**
- [ ] Create `CardSearch` component (`apps/web/src/components/cards/CardSearch.tsx`)
  - Search input with debounce
  - Loading states
  - Results grid with card images
- [ ] Create `CardSearchDialog` component
  - Search interface
  - Quantity input
  - Add button
- [ ] Create `CollectionDetail` page (`apps/web/src/pages/CollectionDetail.tsx`)
  - Collection header with stats
  - "Add Cards" button
  - Card grid display
  - Empty state
- [ ] Update routing to include `/collections/:id`
- [ ] Make collection cards clickable to open detail page

**API Integration:**
- Scryfall API: `https://api.scryfall.com/cards/search?q={query}`
- Store Scryfall card ID as primary key in `cards` table
- Cache card data locally to avoid repeated API calls

**Estimated Effort:** 4-6 hours

---

### 2. Collection Card Management ⭐ PRIORITY 2

**Value:** Users need to manage cards within their collections (view, update quantity, remove)

**User Flow:**
1. User views collection detail page
2. Sees grid of cards with images and quantities
3. Can update quantity with +/- buttons
4. Can remove cards
5. Can view detailed card info in a modal

**Backend Tasks:**
- [ ] tRPC route: `collections.updateCardQuantity` (mutation)
  - Input: `{ collectionId: string, cardId: string, quantity: number }`
  - Output: `{ success: boolean }`
- [ ] tRPC route: `collections.removeCard` (mutation)
  - Input: `{ collectionId: string, cardId: string }`
  - Output: `{ success: boolean }`
  - Soft delete (set `deleted_at`)
- [ ] tRPC route: `cards.getById` (query)
  - Input: `{ cardId: string }`
  - Output: `{ card: Card }`

**Frontend Tasks:**
- [ ] Create `CardGrid` component (`apps/web/src/components/cards/CardGrid.tsx`)
  - Responsive grid layout
  - Card images with hover effects
  - Quantity badge
  - Click to view details
- [ ] Create `CardDetailModal` component
  - Full card image
  - All card stats (type, mana cost, text, etc.)
  - Legalities
  - Price info (if available from Scryfall)
- [ ] Create `CardQuantityControl` component
  - +/- buttons
  - Current quantity display
  - Remove button
- [ ] Update `CollectionDetail` page to use `CardGrid`
- [ ] Add optimistic updates for quantity changes
- [ ] Add loading skeletons

**Visual Design:**
- Card grid: 2-4 columns depending on screen size
- Card hover: slight scale + border glow
- Quantity badge: bottom-right corner with accent color
- Empty state: friendly message + "Add Cards" CTA

**Estimated Effort:** 3-4 hours

---

### 3. Complete Collection View (Aggregated) ⭐ PRIORITY 3

**Value:** Users see ALL their cards across all collections - key differentiator and discovery feature

**User Flow:**
1. User navigates to "Complete" tab in bottom nav
2. Sees aggregated view of ALL unique cards they own
3. Can filter by color, type, rarity, CMC
4. Can see which collections each card is in
5. Can see total quantity across all collections
6. Can see progress stats (total unique cards, total cards, etc.)

**Backend Tasks:**
- [ ] Use `user_complete_collection` view (already exists in schema!)
  - View aggregates cards across all user collections
- [ ] tRPC route: `complete.getAll` (query)
  - Input: `{ filters?: { colors?: string[], types?: string[], rarity?: string[] } }`
  - Output: `{ cards: CompleteCollectionCard[], stats: Stats }`
- [ ] tRPC route: `complete.getStats` (query)
  - Output: `{ totalUniqueCards: number, totalQuantity: number, collections: number }`

**Frontend Tasks:**
- [ ] Create `Complete` page (`apps/web/src/pages/Complete.tsx`)
  - Stats header (total cards, unique cards, value)
  - Filter bar (color, type, rarity, CMC)
  - Card grid with aggregated quantities
  - Show which collections contain each card
- [ ] Create `CompleteCardGrid` component
  - Similar to `CardGrid` but shows aggregated data
  - Badge showing total quantity across collections
  - Expandable to show per-collection breakdown
- [ ] Create `FilterBar` component
  - Color filter (WUBRG)
  - Type filter (Creature, Instant, Sorcery, etc.)
  - Rarity filter (Common, Uncommon, Rare, Mythic)
  - CMC range slider
- [ ] Create `CollectionStats` component
  - Total unique cards
  - Total quantity
  - Most collected color
  - Rarity breakdown chart

**Visual Design:**
- Stats cards at top: 3-4 key metrics
- Filter bar: horizontal scroll on mobile, fixed row on desktop
- Card grid: same as collection view but with multi-collection info
- Color-coded badges for mana colors

**Estimated Effort:** 4-5 hours

---

## 📊 Implementation Order

### Week 1 (Current)
✅ Authentication
✅ Collections CRUD

### Week 2
- **Day 1-2:** Feature 1 - Card Search & Add to Collection
- **Day 3:** Feature 2 - Collection Card Management
- **Day 4:** Feature 3 - Complete Collection View
- **Day 5:** Polish, bug fixes, testing

---

## 🚀 Quick Start Commands

When you're ready to continue:

```bash
# Start development servers
cd /home/mantis/Development/tcg-tracker
bun run dev

# Backend: http://localhost:3001
# Frontend: http://localhost:5174
```

### Starting Feature 1 (Card Search)

**First Steps:**
1. Create Scryfall API utility
2. Add tRPC routes for search and add card
3. Create CardSearch component
4. Update Collections page to link to detail view

**Key Files to Create/Modify:**
- `apps/api/src/lib/scryfall.ts` - NEW
- `apps/api/src/router/cards.ts` - NEW
- `apps/web/src/components/cards/CardSearch.tsx` - NEW
- `apps/web/src/pages/CollectionDetail.tsx` - NEW
- `apps/web/src/App.tsx` - Add route

---

## 🎨 Design Notes

### Card Display
- Use Scryfall image URLs (`image_uris.normal` or `image_uris.small`)
- Default aspect ratio: 63:88 (standard MTG card)
- Lazy load images for performance
- Show placeholder while loading

### Color Scheme (Already in Tailwind config)
- Background: `#0A0E14`
- Accent Cyan: `#5ECBF5` (primary actions)
- Accent Lavender: `#B497BD` (premium features)
- Success: `#AADBC8` (completed states)

### Mana Color Mapping
```
W: White   → #F0F2C0 (pale yellow)
U: Blue    → #5ECBF5 (accent cyan)
B: Black   → #4A4E54 (dark gray)
R: Red     → #F87171 (coral red)
G: Green   → #86EFAC (bright green)
```

---

## 🔮 Future Features (Post-MVP)

**Week 3+:**
- [ ] OCR Card Scanning (camera + Tesseract.js)
- [ ] Deck Builder
- [ ] Multi-user collections (collaboration)
- [ ] Price tracking & collection value
- [ ] Trade lists
- [ ] Set completion tracking
- [ ] Export to Moxfield/Archidekt

---

## 📝 Notes

**Scryfall API:**
- Rate limit: ~10 requests per second
- Free to use, no API key required
- Excellent documentation: https://scryfall.com/docs/api

**Database:**
- `cards` table uses Scryfall card ID as primary key
- `collection_cards` junction table tracks quantity and metadata
- Soft deletes supported everywhere

**Performance:**
- Card images should be lazy loaded
- Implement virtual scrolling for large collections (>100 cards)
- Cache Scryfall responses in database
- Use React Query cache for frontend

---

## ✅ Success Criteria

After these 3 features are complete, users should be able to:
1. ✅ Create an account and login
2. ✅ Create and manage collections
3. ✅ Search for cards by name
4. ✅ Add cards to collections with quantities
5. ✅ View all cards in a collection
6. ✅ Update card quantities and remove cards
7. ✅ See aggregated view of all owned cards
8. ✅ Filter and explore their complete collection

**This represents a fully functional V1 of the TCG Collection Tracker!** 🎉
