/**
 * Collection Format Coverage Schema
 *
 * Cached analysis of collection viability per format.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { collections } from './collections';

export const collectionFormatCoverage = pgTable(
  'collection_format_coverage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    format: text('format').notNull(),
    totalLegalCards: integer('total_legal_cards').notNull().default(0),
    viableArchetypes: jsonb('viable_archetypes').notNull().default(sql`'[]'`),
    buildableDecks: jsonb('buildable_decks').notNull().default(sql`'[]'`),
    lastComputed: timestamp('last_computed', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueCollectionFormat: unique('collection_format_coverage_unique').on(
      table.collectionId,
      table.format
    ),
    collectionIdIdx: index('idx_collection_format_coverage_collection').on(table.collectionId),
    formatIdx: index('idx_collection_format_coverage_format').on(table.format),
  })
);

export type CollectionFormatCoverage = typeof collectionFormatCoverage.$inferSelect;
export type NewCollectionFormatCoverage = typeof collectionFormatCoverage.$inferInsert;

// Relations
export const collectionFormatCoverageRelations = relations(
  collectionFormatCoverage,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionFormatCoverage.collectionId],
      references: [collections.id],
    }),
  })
);
