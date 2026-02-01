# @tcg-tracker/db

Database package for the TCG Collection Tracker, using Drizzle ORM with PostgreSQL.

## Setup

### 1. Environment Variables

Copy the example environment file and configure your database connection:

```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL`:

```env
DATABASE_URL=postgresql://mantis@localhost:5432/tcg_tracker
```

### 2. Install Dependencies

From the workspace root:

```bash
bun install
```

### 3. Database Schema

The database schema is defined in TypeScript using Drizzle ORM in `src/schema/`:

- `users.ts` - User accounts with soft delete support
- `cards.ts` - MTG card master data from Scryfall
- `collections.ts` - Named collections owned by users
- `collection-members.ts` - Multi-user collaboration with role-based access
- `collection-cards.ts` - Junction table linking collections to cards with quantities

## Scripts

### Generate Migration

Generate a new migration file from schema changes:

```bash
bun run db:generate
```

### Push Schema to Database

Push schema changes directly to the database (for development):

```bash
bun run db:push
```

### Drizzle Studio

Launch Drizzle Studio to browse and edit your database:

```bash
bun run db:studio
```

This will open a web interface at `https://local.drizzle.studio`.

## Usage

### Import the Database Client

```typescript
import { db } from "@tcg-tracker/db";
```

### Query Examples

```typescript
import { db, users, cards, collections } from "@tcg-tracker/db";
import { eq, and, sql } from "drizzle-orm";

// Get all users
const allUsers = await db.select().from(users);

// Get user by email
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, "user@example.com"))
  .limit(1);

// Get cards in a collection
const collectionCards = await db
  .select()
  .from(collectionCards)
  .where(
    and(
      eq(collectionCards.collectionId, collectionId),
      sql`${collectionCards.deletedAt} IS NULL`
    )
  );

// Insert a new collection
const newCollection = await db
  .insert(collections)
  .values({
    name: "My Commander Deck",
    description: "Atraxa deck",
    ownerId: userId,
  })
  .returning();
```

### Type Exports

All table types are exported for type safety:

```typescript
import type {
  User,
  NewUser,
  Card,
  NewCard,
  Collection,
  NewCollection,
  CollectionMember,
  CollectionRole,
} from "@tcg-tracker/db";
```

## Schema Details

### Soft Deletes

Tables with `deleted_at` fields support soft deletes:
- `users`
- `collections`
- `collection_cards`

Always filter out soft-deleted records in queries:

```typescript
where(sql`${table.deletedAt} IS NULL`)
```

### Indexes

The schema includes optimized indexes for:
- Partial indexes on soft-delete enabled tables
- GIN indexes for array columns (types, colors, keywords)
- GIN indexes for JSONB columns (game_data, card_metadata)
- Standard B-tree indexes for foreign keys and common queries

### JSONB Fields

- `cards.image_uris` - Card images at different sizes
- `cards.game_data` - MTG-specific data (legalities, prices, etc.)
- `collection_cards.card_metadata` - Card condition, foil status, etc.

## Test Connection

Verify your database connection:

```bash
bun run src/test-connection.ts
```

## Documentation

See the main project documentation for:
- Database schema diagrams
- Entity relationships
- Query patterns
- Migration strategy
