import { pgTable, uuid, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { collections } from './collections';
import { cards } from './cards';

export const decks = pgTable(
  'decks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    format: varchar('format', { length: 50 }),
    collectionOnly: boolean('collection_only').notNull().default(false),
    collectionId: uuid('collection_id').references(() => collections.id, { onDelete: 'set null' }),
    ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Deck metadata for recommendations
    commanderId: uuid('commander_id').references(() => cards.id, { onDelete: 'set null' }),
    colors: text('colors').array().notNull().default(sql`'{}'`), // Color identity ['W', 'U', 'B', 'R', 'G']
    strategy: varchar('strategy', { length: 50 }), // CommanderStrategy or ConstructedStrategy enum value

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table) => ({
    commanderIdx: index('idx_decks_commander_id').on(table.commanderId),
    strategyIdx: index('idx_decks_strategy').on(table.strategy),
  })
);

export type Deck = typeof decks.$inferSelect;
export type NewDeck = typeof decks.$inferInsert;
