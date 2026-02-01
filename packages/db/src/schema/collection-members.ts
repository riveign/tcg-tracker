import { pgTable, uuid, timestamp, index, unique, pgEnum } from "drizzle-orm/pg-core";
import { collections } from "./collections";
import { users } from "./users";

// Define the collection_role enum
export const collectionRoleEnum = pgEnum("collection_role", ["owner", "contributor", "viewer"]);

export const collectionMembers = pgTable(
  "collection_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: collectionRoleEnum("role").notNull().default("viewer"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Ensure a user can only have one role per collection
    collectionUserUnique: unique("collection_members_collection_id_user_id_key").on(
      table.collectionId,
      table.userId
    ),
    collectionIdIdx: index("idx_collection_members_collection_id").on(table.collectionId),
    userIdIdx: index("idx_collection_members_user_id").on(table.userId),
    roleIdx: index("idx_collection_members_role").on(table.role),
  })
);

export type CollectionMember = typeof collectionMembers.$inferSelect;
export type NewCollectionMember = typeof collectionMembers.$inferInsert;
export type CollectionRole = (typeof collectionRoleEnum.enumValues)[number];
