# TCG Collection Tracker - Next Phase Plan

**Date:** February 1, 2026
**Current Status:** ✅ All MVP Features Complete (6/6)
**Next Feature:** 🎯 Deck Builder
**Estimated Timeline:** 2-3 days

---

## 📊 Current State Summary

### ✅ Completed Features (Production Ready)
1. **Authentication & Collections CRUD** - Full user management
2. **Card Search & Add to Collection** - Scryfall integration
3. **Collection Card Management** - Quantities, updates, removal
4. **Complete Collection View** - Aggregated view with analytics
5. **Advanced Card Search** - Multi-filter support with keywords
6. **Collection Search & Filtering** - Search within collections

### 🎯 Next Priority: Deck Builder

The Deck Builder is the next major feature that will allow users to:
- Build decks from their collections
- Analyze mana curves and card distributions
- Test deck compositions
- Export deck lists
- Track multiple deck versions

---

## 🚀 Phase 1: Database Schema (Day 1 - Morning)

### Tasks

#### 1.1 Create Deck Tables
Create new migration file: `packages/db/drizzle/0001_add_decks.sql`

```sql
-- Create decks table
CREATE TABLE decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    format VARCHAR(50), -- 'Standard', 'Modern', 'Commander', 'Legacy', etc.
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create deck_cards junction table
CREATE TABLE deck_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0 AND quantity <= 100),
    card_type VARCHAR(20) NOT NULL DEFAULT 'mainboard', -- 'mainboard', 'sideboard', 'commander'
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(deck_id, card_id, card_type) WHERE deleted_at IS NULL
);

-- Indexes for performance
CREATE INDEX idx_decks_owner_id ON decks(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_deck_cards_deck_id ON deck_cards(deck_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_deck_cards_card_id ON deck_cards(card_id) WHERE deleted_at IS NULL;

-- View for deck statistics
CREATE VIEW deck_stats AS
SELECT
    d.id AS deck_id,
    d.name AS deck_name,
    d.format,
    COUNT(DISTINCT dc.card_id) FILTER (WHERE dc.card_type = 'mainboard') AS mainboard_count,
    SUM(dc.quantity) FILTER (WHERE dc.card_type = 'mainboard') AS total_mainboard_cards,
    COUNT(DISTINCT dc.card_id) FILTER (WHERE dc.card_type = 'sideboard') AS sideboard_count,
    SUM(dc.quantity) FILTER (WHERE dc.card_type = 'sideboard') AS total_sideboard_cards,
    COUNT(DISTINCT dc.card_id) FILTER (WHERE dc.card_type = 'commander') AS commander_count,
    AVG(c.cmc) FILTER (WHERE dc.card_type = 'mainboard') AS avg_cmc,
    d.owner_id,
    d.created_at,
    d.updated_at
FROM decks d
LEFT JOIN deck_cards dc ON d.id = dc.deck_id AND dc.deleted_at IS NULL
LEFT JOIN cards c ON dc.card_id = c.id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.name, d.format, d.owner_id, d.created_at, d.updated_at;
```

#### 1.2 Create Drizzle Schema Files
Create: `packages/db/src/schema/decks.ts`

```typescript
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const decks = pgTable('decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  format: varchar('format', { length: 50 }),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
});
```

Create: `packages/db/src/schema/deck-cards.ts`

```typescript
import { pgTable, uuid, integer, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { decks } from './decks';
import { cards } from './cards';

export const deckCards = pgTable('deck_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  deckId: uuid('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  cardType: varchar('card_type', { length: 20 }).notNull().default('mainboard'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  uniqueDeckCardType: unique().on(table.deckId, table.cardId, table.cardType)
}));
```

Update: `packages/db/src/schema/index.ts`

```typescript
export * from './users';
export * from './cards';
export * from './collections';
export * from './collection-cards';
export * from './collection-members';
export * from './decks'; // NEW
export * from './deck-cards'; // NEW
```

#### 1.3 Run Migration

```bash
cd packages/db
# Generate migration
bun drizzle-kit generate

# Apply migration (if using Drizzle push)
bun drizzle-kit push

# OR apply manually
psql -U mantis -d tcg_tracker -f drizzle/0001_add_decks.sql
```

**Estimated Time:** 1-2 hours

---

## 🔧 Phase 2: Backend Routes (Day 1 - Afternoon)

### Tasks

#### 2.1 Create Deck Router
Create: `apps/api/src/router/decks.ts`

```typescript
import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../lib/trpc';
import { db } from '@tcg-tracker/db';
import { decks, deckCards, cards } from '@tcg-tracker/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

// Input schemas
const createDeckSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  format: z.enum(['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other']).optional()
});

const addCardToDeckSchema = z.object({
  deckId: z.string().uuid(),
  cardId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  cardType: z.enum(['mainboard', 'sideboard', 'commander']).default('mainboard')
});

export const decksRouter = router({
  // List all decks for authenticated user
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const userDecks = await db.query.decks.findMany({
        where: and(
          eq(decks.ownerId, ctx.user.userId),
          isNull(decks.deletedAt)
        ),
        orderBy: (decks, { desc }) => [desc(decks.updatedAt)]
      });
      return userDecks;
    }),

  // Get single deck with all cards
  get: protectedProcedure
    .input(z.object({ deckId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const deck = await db.query.decks.findFirst({
        where: and(
          eq(decks.id, input.deckId),
          eq(decks.ownerId, ctx.user.userId),
          isNull(decks.deletedAt)
        )
      });

      if (!deck) {
        throw new Error('Deck not found');
      }

      // Get all cards in deck
      const deckCardsList = await db
        .select({
          id: deckCards.id,
          quantity: deckCards.quantity,
          cardType: deckCards.cardType,
          card: cards
        })
        .from(deckCards)
        .innerJoin(cards, eq(deckCards.cardId, cards.id))
        .where(and(
          eq(deckCards.deckId, input.deckId),
          isNull(deckCards.deletedAt)
        ));

      return {
        ...deck,
        cards: deckCardsList
      };
    }),

  // Create new deck
  create: protectedProcedure
    .input(createDeckSchema)
    .mutation(async ({ ctx, input }) => {
      const [newDeck] = await db.insert(decks).values({
        name: input.name,
        description: input.description,
        format: input.format,
        ownerId: ctx.user.userId
      }).returning();

      return newDeck;
    }),

  // Update deck
  update: protectedProcedure
    .input(z.object({
      deckId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      format: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { deckId, ...updates } = input;

      const [updatedDeck] = await db
        .update(decks)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(
          eq(decks.id, deckId),
          eq(decks.ownerId, ctx.user.userId),
          isNull(decks.deletedAt)
        ))
        .returning();

      return updatedDeck;
    }),

  // Soft delete deck
  delete: protectedProcedure
    .input(z.object({ deckId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(decks)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(decks.id, input.deckId),
          eq(decks.ownerId, ctx.user.userId)
        ));

      return { success: true };
    }),

  // Add card to deck
  addCard: protectedProcedure
    .input(addCardToDeckSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify deck ownership
      const deck = await db.query.decks.findFirst({
        where: and(
          eq(decks.id, input.deckId),
          eq(decks.ownerId, ctx.user.userId),
          isNull(decks.deletedAt)
        )
      });

      if (!deck) {
        throw new Error('Deck not found');
      }

      // Add or update card in deck
      const [deckCard] = await db
        .insert(deckCards)
        .values({
          deckId: input.deckId,
          cardId: input.cardId,
          quantity: input.quantity,
          cardType: input.cardType
        })
        .onConflictDoUpdate({
          target: [deckCards.deckId, deckCards.cardId, deckCards.cardType],
          set: {
            quantity: input.quantity,
            updatedAt: new Date(),
            deletedAt: null
          }
        })
        .returning();

      return deckCard;
    }),

  // Update card quantity in deck
  updateCardQuantity: protectedProcedure
    .input(z.object({
      deckId: z.string().uuid(),
      cardId: z.string().uuid(),
      quantity: z.number().int().min(0).max(100),
      cardType: z.enum(['mainboard', 'sideboard', 'commander']).default('mainboard')
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.quantity === 0) {
        // Remove card if quantity is 0
        await db
          .update(deckCards)
          .set({ deletedAt: new Date() })
          .where(and(
            eq(deckCards.deckId, input.deckId),
            eq(deckCards.cardId, input.cardId),
            eq(deckCards.cardType, input.cardType)
          ));
      } else {
        await db
          .update(deckCards)
          .set({
            quantity: input.quantity,
            updatedAt: new Date()
          })
          .where(and(
            eq(deckCards.deckId, input.deckId),
            eq(deckCards.cardId, input.cardId),
            eq(deckCards.cardType, input.cardType),
            isNull(deckCards.deletedAt)
          ));
      }

      return { success: true };
    }),

  // Remove card from deck
  removeCard: protectedProcedure
    .input(z.object({
      deckId: z.string().uuid(),
      cardId: z.string().uuid(),
      cardType: z.enum(['mainboard', 'sideboard', 'commander']).default('mainboard')
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(deckCards)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(deckCards.deckId, input.deckId),
          eq(deckCards.cardId, input.cardId),
          eq(deckCards.cardType, input.cardType)
        ));

      return { success: true };
    }),

  // Get deck analytics
  analyze: protectedProcedure
    .input(z.object({ deckId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const deckCardsList = await db
        .select({
          quantity: deckCards.quantity,
          cardType: deckCards.cardType,
          card: cards
        })
        .from(deckCards)
        .innerJoin(cards, eq(deckCards.cardId, cards.id))
        .where(and(
          eq(deckCards.deckId, input.deckId),
          isNull(deckCards.deletedAt)
        ));

      // Calculate mana curve (CMC distribution)
      const manaCurve = deckCardsList
        .filter(dc => dc.cardType === 'mainboard')
        .reduce((acc, dc) => {
          const cmc = dc.card.cmc || 0;
          acc[cmc] = (acc[cmc] || 0) + dc.quantity;
          return acc;
        }, {} as Record<number, number>);

      // Calculate card type distribution
      const typeDistribution = deckCardsList
        .filter(dc => dc.cardType === 'mainboard')
        .reduce((acc, dc) => {
          const types = dc.card.types || [];
          types.forEach(type => {
            acc[type] = (acc[type] || 0) + dc.quantity;
          });
          return acc;
        }, {} as Record<string, number>);

      // Calculate color distribution
      const colorDistribution = deckCardsList
        .filter(dc => dc.cardType === 'mainboard')
        .reduce((acc, dc) => {
          const colors = dc.card.colors || [];
          colors.forEach(color => {
            acc[color] = (acc[color] || 0) + dc.quantity;
          });
          return acc;
        }, {} as Record<string, number>);

      // Calculate average CMC
      const totalCards = deckCardsList
        .filter(dc => dc.cardType === 'mainboard')
        .reduce((sum, dc) => sum + dc.quantity, 0);

      const totalCMC = deckCardsList
        .filter(dc => dc.cardType === 'mainboard')
        .reduce((sum, dc) => sum + (dc.card.cmc || 0) * dc.quantity, 0);

      const avgCMC = totalCards > 0 ? totalCMC / totalCards : 0;

      return {
        manaCurve,
        typeDistribution,
        colorDistribution,
        avgCMC,
        totalCards,
        mainboardCount: deckCardsList.filter(dc => dc.cardType === 'mainboard').length,
        sideboardCount: deckCardsList.filter(dc => dc.cardType === 'sideboard').length
      };
    })
});
```

#### 2.2 Update Root Router
Update: `apps/api/src/router/index.ts`

```typescript
import { router } from '../lib/trpc';
import { authRouter } from './auth';
import { collectionsRouter } from './collections';
import { cardsRouter } from './cards';
import { completeRouter } from './complete';
import { decksRouter } from './decks'; // NEW

export const appRouter = router({
  auth: authRouter,
  collections: collectionsRouter,
  cards: cardsRouter,
  complete: completeRouter,
  decks: decksRouter // NEW
});

export type AppRouter = typeof appRouter;
```

**Estimated Time:** 2-3 hours

---

## 🎨 Phase 3: Frontend Components (Day 2)

### Tasks

#### 3.1 Create Decks List Page
Create: `apps/web/src/pages/Decks.tsx`

```typescript
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { DeckDialog } from '../components/decks/DeckDialog';
import { useNavigate } from 'react-router-dom';

export function Decks() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: decks, isLoading } = trpc.decks.list.useQuery();

  if (isLoading) {
    return <div>Loading decks...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Decks</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Deck
        </Button>
      </div>

      {decks && decks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">You don't have any decks yet.</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Deck
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks?.map((deck) => (
            <Card
              key={deck.id}
              className="cursor-pointer hover:border-accent-cyan transition-colors"
              onClick={() => navigate(`/decks/${deck.id}`)}
            >
              <CardHeader>
                <CardTitle>{deck.name}</CardTitle>
                <CardDescription>
                  {deck.format && <span className="text-accent-lavender">{deck.format}</span>}
                  {deck.description && <p className="mt-2 text-sm">{deck.description}</p>}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <DeckDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
```

#### 3.2 Create Deck Detail Page
Create: `apps/web/src/pages/DeckDetail.tsx`

```typescript
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, BarChart3 } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CardSearchDialog } from '../components/cards/CardSearchDialog';
import { DeckCardGrid } from '../components/decks/DeckCardGrid';
import { DeckStats } from '../components/decks/DeckStats';

export function DeckDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mainboard' | 'sideboard'>('mainboard');

  const { data: deck, isLoading } = trpc.decks.get.useQuery(
    { deckId: id! },
    { enabled: !!id }
  );

  const { data: analytics } = trpc.decks.analyze.useQuery(
    { deckId: id! },
    { enabled: !!id }
  );

  const deleteDeckMutation = trpc.decks.delete.useMutation({
    onSuccess: () => {
      navigate('/decks');
    }
  });

  if (isLoading) {
    return <div>Loading deck...</div>;
  }

  if (!deck) {
    return <div>Deck not found</div>;
  }

  const mainboardCards = deck.cards.filter(c => c.cardType === 'mainboard');
  const sideboardCards = deck.cards.filter(c => c.cardType === 'sideboard');

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/decks')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          {deck.format && (
            <p className="text-sm text-accent-lavender">{deck.format}</p>
          )}
          {deck.description && (
            <p className="text-sm text-muted-foreground mt-1">{deck.description}</p>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={() => deleteDeckMutation.mutate({ deckId: id! })}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {analytics && (
        <DeckStats analytics={analytics} />
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="mainboard">
              Mainboard ({mainboardCards.length})
            </TabsTrigger>
            <TabsTrigger value="sideboard">
              Sideboard ({sideboardCards.length})
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setIsSearchOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Cards
          </Button>
        </div>

        <TabsContent value="mainboard">
          <DeckCardGrid
            deckId={id!}
            cards={mainboardCards}
            cardType="mainboard"
          />
        </TabsContent>

        <TabsContent value="sideboard">
          <DeckCardGrid
            deckId={id!}
            cards={sideboardCards}
            cardType="sideboard"
          />
        </TabsContent>
      </Tabs>

      <CardSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onAddCard={(cardId, quantity) => {
          // Add to deck instead of collection
          // Implementation in CardSearchDialog needs to be updated
        }}
        mode="deck"
        deckId={id}
        cardType={activeTab}
      />
    </div>
  );
}
```

#### 3.3 Create Supporting Components

Create: `apps/web/src/components/decks/DeckDialog.tsx` - Similar to CollectionDialog
Create: `apps/web/src/components/decks/DeckCardGrid.tsx` - Reuse CardQuantityControl pattern
Create: `apps/web/src/components/decks/DeckStats.tsx` - Analytics dashboard
Create: `apps/web/src/components/decks/ManaCurveChart.tsx` - Bar chart component

#### 3.4 Update Navigation
Update: `apps/web/src/components/layout/BottomNav.tsx`

Change "Build" navigation to link to `/decks` instead of `/build`

#### 3.5 Update Routing
Update: `apps/web/src/App.tsx`

```typescript
// Add routes
<Route path="/decks" element={<Decks />} />
<Route path="/decks/:id" element={<DeckDetail />} />
```

**Estimated Time:** 4-5 hours

---

## 📊 Phase 4: Analytics & Polish (Day 3)

### Tasks

#### 4.1 Mana Curve Visualization
- Install chart library (Recharts recommended)
- Create bar chart component for CMC distribution
- Add hover tooltips showing card counts

#### 4.2 Card Type Distribution
- Pie/donut chart showing creature vs non-creature split
- Breakdown by specific types (Instant, Sorcery, etc.)

#### 4.3 Color Distribution
- Visual breakdown of WUBRG colors
- Color identity pie chart
- Multi-color detection

#### 4.4 Format Validation
- Check deck legality for selected format
- Show warnings for illegal cards
- Display deck size requirements

#### 4.5 Export Functionality
- Export deck as text list
- Support for various formats (Arena, MTGO, simple text)
- Copy to clipboard

#### 4.6 Polish
- Loading skeletons for all pages
- Error handling and user feedback
- Optimistic updates for all mutations
- Mobile responsiveness
- Keyboard shortcuts

**Estimated Time:** 3-4 hours

---

## 📋 Implementation Checklist

### Day 1
- [ ] Create database migration files
- [ ] Create Drizzle schema for decks and deck_cards
- [ ] Run migrations
- [ ] Create decksRouter with all CRUD operations
- [ ] Test all backend routes with curl/Postman
- [ ] Update root router

### Day 2
- [ ] Create Decks list page
- [ ] Create DeckDetail page
- [ ] Create DeckDialog component
- [ ] Create DeckCardGrid component
- [ ] Create DeckStats component
- [ ] Update CardSearchDialog to support deck mode
- [ ] Update navigation and routing
- [ ] Test full user flow

### Day 3
- [ ] Install and configure Recharts
- [ ] Create ManaCurveChart component
- [ ] Create TypeDistributionChart component
- [ ] Create ColorDistributionChart component
- [ ] Add format validation logic
- [ ] Implement export functionality
- [ ] Add loading states and error handling
- [ ] Test on mobile devices
- [ ] Final polish and bug fixes

---

## 🎯 Success Criteria

After completion, users should be able to:
- ✅ Create and manage multiple decks
- ✅ Add cards from search or collection to decks
- ✅ Organize cards into mainboard/sideboard
- ✅ View mana curve visualization
- ✅ See card type and color distribution
- ✅ Check average CMC and deck composition
- ✅ Export deck lists
- ✅ Delete and edit decks

---

## 💡 Future Enhancements (Post-Deck Builder)

### Week 3+
1. **Deck Testing/Goldfish**
   - Virtual playtesting
   - Opening hand simulator
   - Mulligan logic

2. **Deck Comparison**
   - Compare multiple decks side-by-side
   - Highlight differences
   - Merge/split functionality

3. **Deck Versioning**
   - Track deck changes over time
   - Revert to previous versions
   - Compare versions

4. **Social Features**
   - Share decks publicly
   - Import decks from URLs
   - Like/favorite community decks
   - Comments and ratings

5. **Advanced Analytics**
   - Win rate tracking
   - Match history
   - Sideboarding guides
   - Matchup analysis

---

## 📞 Getting Started

When ready to begin:

```bash
# Ensure database is running
# Ensure dev servers are running
cd /home/mantis/Development/tcg-tracker
bun run dev

# Backend: http://localhost:3001
# Frontend: http://localhost:5174
```

Start with Phase 1, Task 1.1 - Create the database migration file.

---

**Let's build an amazing deck builder! 🃏✨**
