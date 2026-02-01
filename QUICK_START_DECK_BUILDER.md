# Quick Start: Deck Builder Implementation

**Date:** February 1, 2026
**Status:** Ready to begin
**Estimated Time:** 2-3 days

---

## 🚀 Start Here

### Step 1: Review Documentation (15 minutes)
1. Read `HANDOVER.md` - Understand current state
2. Read `NEXT_PHASE.md` - Full implementation plan
3. Review this file - Quick start guide

### Step 2: Verify Environment (5 minutes)
```bash
cd /home/mantis/Development/tcg-tracker

# Check database is running
psql -U mantis -d tcg_tracker -c "SELECT COUNT(*) FROM users;"

# Install dependencies (if needed)
bun install

# Start dev servers
bun run dev
```

You should see:
- API: http://localhost:3001
- Web: http://localhost:5174

### Step 3: Begin Implementation

Follow these phases in order:

---

## 📋 Phase 1: Database (Start Here - Day 1 Morning)

### Create Migration File
```bash
cd packages/db
touch drizzle/0001_add_decks.sql
```

Copy SQL from `NEXT_PHASE.md` Phase 1.1 into this file.

### Create Schema Files
```bash
touch src/schema/decks.ts
touch src/schema/deck-cards.ts
```

Copy TypeScript code from `NEXT_PHASE.md` Phase 1.2 into these files.

### Update Exports
Edit `packages/db/src/schema/index.ts` and add:
```typescript
export * from './decks';
export * from './deck-cards';
```

### Run Migration
```bash
# From packages/db directory
psql -U mantis -d tcg_tracker -f drizzle/0001_add_decks.sql

# Verify tables created
psql -U mantis -d tcg_tracker -c "\dt decks"
psql -U mantis -d tcg_tracker -c "\dt deck_cards"
```

**✅ Checkpoint:** You should see both tables listed.

---

## 📋 Phase 2: Backend API (Day 1 Afternoon)

### Create Deck Router
```bash
cd apps/api/src/router
touch decks.ts
```

Copy the complete router code from `NEXT_PHASE.md` Phase 2.1.

### Update Root Router
Edit `apps/api/src/router/index.ts`:
```typescript
import { decksRouter } from './decks';

export const appRouter = router({
  // ... existing routers
  decks: decksRouter  // ADD THIS
});
```

### Test Backend
```bash
# Backend should auto-reload
# Check terminal for any TypeScript errors

# Optional: Test with curl
curl http://localhost:3001/api/trpc/decks.list
```

**✅ Checkpoint:** Backend should compile without errors.

---

## 📋 Phase 3: Frontend Pages (Day 2)

### Create Decks Page
```bash
cd apps/web/src/pages
touch Decks.tsx
```

Copy code from `NEXT_PHASE.md` Phase 3.1.

### Create Deck Detail Page
```bash
touch DeckDetail.tsx
```

Copy code from `NEXT_PHASE.md` Phase 3.2.

### Create Deck Components
```bash
cd ../components
mkdir decks
cd decks
touch DeckDialog.tsx
touch DeckCardGrid.tsx
touch DeckStats.tsx
```

For each component:
1. Start with a basic stub
2. Reuse patterns from collection components
3. Iterate and improve

### Update Routing
Edit `apps/web/src/App.tsx`:
```typescript
import { Decks } from './pages/Decks';
import { DeckDetail } from './pages/DeckDetail';

// Add routes:
<Route path="/decks" element={<Decks />} />
<Route path="/decks/:id" element={<DeckDetail />} />
```

### Update Navigation
Edit `apps/web/src/components/layout/BottomNav.tsx`:
Change the "Build" link from `/build` to `/decks`.

### Test Frontend
1. Navigate to http://localhost:5174/decks
2. Click "New Deck"
3. Create a deck
4. Verify it appears in the list
5. Click the deck to view details

**✅ Checkpoint:** Can create and view decks.

---

## 📋 Phase 4: Analytics (Day 3)

### Install Chart Library
```bash
cd apps/web
bun add recharts
```

### Create Chart Components
```bash
cd src/components/decks
touch ManaCurveChart.tsx
touch TypeDistributionChart.tsx
touch ColorDistributionChart.tsx
```

### Implement Analytics
1. Use the `decks.analyze` tRPC query
2. Pass data to chart components
3. Style with Tailwind classes
4. Add tooltips and labels

### Polish
- [ ] Add loading skeletons
- [ ] Add error handling
- [ ] Test optimistic updates
- [ ] Test on mobile
- [ ] Fix any TypeScript errors

**✅ Checkpoint:** Deck builder fully functional!

---

## 🎯 Key Files Reference

### Backend
- `packages/db/src/schema/decks.ts` - Deck table schema
- `packages/db/src/schema/deck-cards.ts` - Deck cards junction table
- `apps/api/src/router/decks.ts` - All deck API routes

### Frontend
- `apps/web/src/pages/Decks.tsx` - Deck list page
- `apps/web/src/pages/DeckDetail.tsx` - Single deck view
- `apps/web/src/components/decks/` - All deck components

### Database
- `packages/db/drizzle/0001_add_decks.sql` - Migration file

---

## 💡 Tips

1. **Reuse Existing Patterns**
   - Copy from `collections.ts` for deck CRUD
   - Copy from `CollectionDetail.tsx` for deck detail
   - Reuse `CardQuantityControl` component

2. **Test as You Go**
   - After Phase 1: Test database tables exist
   - After Phase 2: Test API routes work
   - After Phase 3: Test UI flows

3. **Use Existing Components**
   - `CardDetailModal` - Already works
   - `CardSearch` - Can be adapted
   - `Button`, `Card`, `Dialog` - shadcn/ui components

4. **Don't Overcomplicate**
   - Start simple, iterate later
   - MVP first, polish second
   - Working > Perfect

---

## 🐛 Common Issues

### "Table doesn't exist"
Run migration: `psql -U mantis -d tcg_tracker -f packages/db/drizzle/0001_add_decks.sql`

### TypeScript errors in schema
Make sure you exported from `packages/db/src/schema/index.ts`

### API route not found
Check you added `decks: decksRouter` to root router in `apps/api/src/router/index.ts`

### Frontend can't find route
Check you added routes to `apps/web/src/App.tsx`

---

## ✅ Daily Goals

### Day 1
**Goal:** Backend complete and tested
- [ ] Database tables created
- [ ] All CRUD routes working
- [ ] Can create/read/update/delete decks via API

### Day 2
**Goal:** Basic UI functional
- [ ] Can create decks from UI
- [ ] Can view deck list
- [ ] Can view deck details
- [ ] Can add cards to deck

### Day 3
**Goal:** Polish and analytics
- [ ] Mana curve chart working
- [ ] Stats dashboard complete
- [ ] Export functionality works
- [ ] Mobile responsive
- [ ] All bugs fixed

---

## 📞 When You Return

If starting a new session, say:

> "I'm ready to implement the Deck Builder feature for the TCG Tracker. I've reviewed NEXT_PHASE.md. Let's start with Phase 1 - creating the database schema."

Or if continuing:

> "Continuing Deck Builder implementation. I'm on [Phase X], just completed [task]. Next up: [next task]."

---

## 🎉 You're Ready!

Everything is documented and ready to go. Follow the phases in order, test as you go, and reuse existing patterns.

**Start with Phase 1, Step 1: Create the migration file.**

Good luck! 🚀
