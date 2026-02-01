# TCG Tracker - Quick Start Guide

## 🚀 Start Development (5 seconds)

```bash
cd /home/mantis/Development/tcg-tracker

# Terminal 1
bun run dev:api

# Terminal 2
bun run dev:web
```

**URLs:**
- Frontend: http://localhost:5174
- Backend: http://localhost:3001

---

## 📱 Test the App

1. **Signup** → Create account
2. **Create Collection** → "New Collection" button
3. **Add Cards** → Open collection → "Add Cards" → Search "Lightning Bolt"
4. **Search Globally** → Click "Search" tab → Search with filters
5. **View Complete** → Click "Complete" tab → See all your cards
6. **Search Collection** → In collection detail, use search bar

---

## 🔑 Key Commands

```bash
# Install dependencies
bun install

# Build everything
bun run build

# Build specific package
bun run --filter @tcg-tracker/api build
bun run --filter @tcg-tracker/web build

# Database (if needed)
psql -U mantis -d tcg_tracker -f schema.sql
```

---

## 📂 Important Files

**Backend:**
- `apps/api/src/router/cards.ts` - Card search
- `apps/api/src/router/collections.ts` - Collection management
- `apps/api/src/router/complete.ts` - Aggregated view
- `apps/api/src/lib/scryfall.ts` - Scryfall API

**Frontend:**
- `apps/web/src/pages/Search.tsx` - Global search
- `apps/web/src/pages/CollectionDetail.tsx` - Collection view
- `apps/web/src/pages/Complete.tsx` - Complete collection
- `apps/web/src/components/cards/` - All card components

---

## 🎯 Next: Deck Builder

See `HANDOVER.md` for detailed deck builder implementation plan.

**Quick Preview:**
1. Create `decks` and `deck_cards` tables
2. Add `apps/api/src/router/decks.ts`
3. Create `apps/web/src/pages/DeckDetail.tsx`
4. Add mana curve visualization
5. Implement deck stats
