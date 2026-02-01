import { pgTable, uuid, integer, jsonb, timestamp, index, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { collections } from "./collections";
import { cards } from "./cards";

export const collectionCards = pgTable(
  "collection_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),

    // Quantity tracking
    quantity: integer("quantity").notNull().default(1),

    // Optional: condition tracking for TCG cards
    // Stored as JSONB for flexibility (e.g., {'condition': 'NM', 'foil': true})
    cardMetadata: jsonb("card_metadata").notNull().default(sql`'{}'`),

    // Soft delete: when removing cards from collection, we preserve history
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Check constraint for quantity >= 0
    quantityCheck: check("collection_cards_quantity_check", sql`${table.quantity} >= 0`),
    // A card can appear once per collection (update quantity instead)
    collectionCardUnique: unique("collection_cards_collection_id_card_id_key")
      .on(table.collectionId, table.cardId)
      .nullsNotDistinct(),
    collectionIdIdx: index("idx_collection_cards_collection_id")
      .on(table.collectionId)
      .where(sql`${table.deletedAt} IS NULL`),
    cardIdIdx: index("idx_collection_cards_card_id").on(table.cardId).where(sql`${table.deletedAt} IS NULL`),
    deletedAtIdx: index("idx_collection_cards_deleted_at").on(table.deletedAt),
    // GIN index for card_metadata queries
    metadataIdx: index("idx_collection_cards_metadata").using("gin", table.cardMetadata),
  })
);

export type CollectionCard = typeof collectionCards.$inferSelect;
export type NewCollectionCard = typeof collectionCards.$inferInsert;
