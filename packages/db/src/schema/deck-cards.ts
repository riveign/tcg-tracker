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
