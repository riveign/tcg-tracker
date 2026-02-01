import { pgTable, uuid, varchar, text, decimal, jsonb, timestamp, index, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const cards = pgTable(
  "cards",
  {
    // Core identifiers (from Scryfall)
    id: uuid("id").primaryKey(), // Scryfall card ID (unique per printing)
    oracleId: uuid("oracle_id").notNull(), // Groups functionally identical cards across printings

    // Basic card information
    name: varchar("name", { length: 255 }).notNull(),
    typeLine: text("type_line").notNull(),
    oracleText: text("oracle_text"), // Rules text

    // Type information (denormalized for filtering performance)
    types: text("types").array().notNull().default(sql`'{}'`), // ['Creature', 'Artifact']
    subtypes: text("subtypes").array().notNull().default(sql`'{}'`), // ['Human', 'Wizard']
    supertypes: text("supertypes").array().notNull().default(sql`'{}'`), // ['Legendary', 'Snow']
    keywords: text("keywords").array().notNull().default(sql`'{}'`), // ['Flying', 'Haste']

    // Mana and costs
    manaCost: varchar("mana_cost", { length: 100 }), // '{2}{U}{U}'
    cmc: decimal("cmc", { precision: 5, scale: 2 }), // Converted mana cost (mana value)
    colors: text("colors").array().notNull().default(sql`'{}'`), // ['U', 'R']
    colorIdentity: text("color_identity").array().notNull().default(sql`'{}'`), // For Commander

    // Card stats (nullable for non-creatures)
    power: varchar("power", { length: 10 }), // Can be '*', '1+*', etc.
    toughness: varchar("toughness", { length: 10 }),
    loyalty: varchar("loyalty", { length: 10 }), // For planeswalkers

    // Printing information
    setCode: varchar("set_code", { length: 10 }).notNull(), // 'MOM', 'ONE', etc.
    setName: varchar("set_name", { length: 255 }).notNull(),
    collectorNumber: varchar("collector_number", { length: 20 }).notNull(),
    rarity: varchar("rarity", { length: 20 }).notNull(), // 'common', 'uncommon', 'rare', 'mythic'

    // Additional metadata
    artist: varchar("artist", { length: 255 }),
    flavorText: text("flavor_text"),

    // Image URIs (storing as JSONB for flexibility with different sizes)
    imageUris: jsonb("image_uris"), // {'small': 'url', 'normal': 'url', 'large': 'url'}

    // Game-specific data stored as JSONB for extensibility
    // This allows future support for other TCGs without schema changes
    gameData: jsonb("game_data").notNull().default(sql`'{}'`), // MTG-specific: legalities, prices, etc.

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint on set + collector number (identifies specific printing)
    setCollectorUnique: unique("cards_set_code_collector_number_key").on(
      table.setCode,
      table.collectorNumber
    ),
    // Performance indexes for common filter operations
    oracleIdIdx: index("idx_cards_oracle_id").on(table.oracleId),
    nameIdx: index("idx_cards_name").on(table.name),
    setCodeIdx: index("idx_cards_set_code").on(table.setCode),
    rarityIdx: index("idx_cards_rarity").on(table.rarity),
    cmcIdx: index("idx_cards_cmc").on(table.cmc),
    // GIN indexes for array columns (enables efficient filtering)
    typesIdx: index("idx_cards_types").using("gin", table.types),
    subtypesIdx: index("idx_cards_subtypes").using("gin", table.subtypes),
    keywordsIdx: index("idx_cards_keywords").using("gin", table.keywords),
    colorsIdx: index("idx_cards_colors").using("gin", table.colors),
    colorIdentityIdx: index("idx_cards_color_identity").using("gin", table.colorIdentity),
    // GIN index for JSONB game_data (enables queries on nested JSON)
    gameDataIdx: index("idx_cards_game_data").using("gin", table.gameData),
  })
);

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
