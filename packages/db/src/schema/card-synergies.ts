/**
 * Card Synergies Schema
 *
 * Pre-computed synergy scores between card pairs with format context.
 */

import {
  pgTable,
  uuid,
  decimal,
  jsonb,
  timestamp,
  text,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { cards } from './cards';

export const cardSynergies = pgTable(
  'card_synergies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    relatedCardId: uuid('related_card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    synergyScore: decimal('synergy_score', { precision: 5, scale: 2 }).notNull(),
    mechanicalScore: decimal('mechanical_score', { precision: 5, scale: 2 }).notNull(),
    strategicScore: decimal('strategic_score', { precision: 5, scale: 2 }).notNull(),
    formatContextScore: decimal('format_context_score', { precision: 5, scale: 2 }).notNull(),
    themeScore: decimal('theme_score', { precision: 5, scale: 2 }).notNull(),
    synergyReasons: jsonb('synergy_reasons').notNull().default(sql`'[]'`),
    formatContext: text('format_context').notNull().default('all'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueCardPairFormat: unique('card_synergies_unique_pair_format').on(
      table.cardId,
      table.relatedCardId,
      table.formatContext
    ),
    cardIdIdx: index('idx_card_synergies_card_id').on(table.cardId),
    relatedCardIdIdx: index('idx_card_synergies_related_card_id').on(table.relatedCardId),
    formatIdx: index('idx_card_synergies_format').on(table.formatContext),
    scoreIdx: index('idx_card_synergies_score').on(table.synergyScore),
    synergyScoreCheck: check(
      'card_synergies_synergy_score_check',
      sql`${table.synergyScore} >= 0 AND ${table.synergyScore} <= 100`
    ),
    mechanicalScoreCheck: check(
      'card_synergies_mechanical_score_check',
      sql`${table.mechanicalScore} >= 0 AND ${table.mechanicalScore} <= 40`
    ),
    strategicScoreCheck: check(
      'card_synergies_strategic_score_check',
      sql`${table.strategicScore} >= 0 AND ${table.strategicScore} <= 30`
    ),
    formatContextScoreCheck: check(
      'card_synergies_format_context_score_check',
      sql`${table.formatContextScore} >= 0 AND ${table.formatContextScore} <= 20`
    ),
    themeScoreCheck: check(
      'card_synergies_theme_score_check',
      sql`${table.themeScore} >= 0 AND ${table.themeScore} <= 10`
    ),
  })
);

export type CardSynergy = typeof cardSynergies.$inferSelect;
export type NewCardSynergy = typeof cardSynergies.$inferInsert;

// Relations
export const cardSynergiesRelations = relations(cardSynergies, ({ one }) => ({
  card: one(cards, {
    fields: [cardSynergies.cardId],
    references: [cards.id],
    relationName: 'cardSynergySource',
  }),
  relatedCard: one(cards, {
    fields: [cardSynergies.relatedCardId],
    references: [cards.id],
    relationName: 'cardSynergyTarget',
  }),
}));
