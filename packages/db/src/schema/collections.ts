import { pgTable, uuid, varchar, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Visibility and sharing settings
    isPublic: boolean("is_public").notNull().default(false),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete support
  },
  (table) => ({
    ownerIdIdx: index("idx_collections_owner_id").on(table.ownerId).where(sql`${table.deletedAt} IS NULL`),
    isPublicIdx: index("idx_collections_is_public").on(table.isPublic).where(sql`${table.deletedAt} IS NULL`),
    deletedAtIdx: index("idx_collections_deleted_at").on(table.deletedAt),
  })
);

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
