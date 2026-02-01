CREATE TYPE "public"."collection_role" AS ENUM('owner', 'contributor', 'viewer');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"oracle_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type_line" text NOT NULL,
	"oracle_text" text,
	"types" text[] DEFAULT '{}' NOT NULL,
	"subtypes" text[] DEFAULT '{}' NOT NULL,
	"supertypes" text[] DEFAULT '{}' NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"mana_cost" varchar(100),
	"cmc" numeric(5, 2),
	"colors" text[] DEFAULT '{}' NOT NULL,
	"color_identity" text[] DEFAULT '{}' NOT NULL,
	"power" varchar(10),
	"toughness" varchar(10),
	"loyalty" varchar(10),
	"set_code" varchar(10) NOT NULL,
	"set_name" varchar(255) NOT NULL,
	"collector_number" varchar(20) NOT NULL,
	"rarity" varchar(20) NOT NULL,
	"artist" varchar(255),
	"flavor_text" text,
	"image_uris" jsonb,
	"game_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cards_set_code_collector_number_key" UNIQUE("set_code","collector_number")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"owner_id" uuid NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "collection_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "collection_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_members_collection_id_user_id_key" UNIQUE("collection_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "collection_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"card_metadata" jsonb DEFAULT '{}' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_cards_collection_id_card_id_key" UNIQUE NULLS NOT DISTINCT("collection_id","card_id"),
	CONSTRAINT "collection_cards_quantity_check" CHECK ("collection_cards"."quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_members" ADD CONSTRAINT "collection_members_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_members" ADD CONSTRAINT "collection_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD CONSTRAINT "collection_cards_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD CONSTRAINT "collection_cards_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email") WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_users_username" ON "users" USING btree ("username") WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_users_deleted_at" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_cards_oracle_id" ON "cards" USING btree ("oracle_id");--> statement-breakpoint
CREATE INDEX "idx_cards_name" ON "cards" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_cards_set_code" ON "cards" USING btree ("set_code");--> statement-breakpoint
CREATE INDEX "idx_cards_rarity" ON "cards" USING btree ("rarity");--> statement-breakpoint
CREATE INDEX "idx_cards_cmc" ON "cards" USING btree ("cmc");--> statement-breakpoint
CREATE INDEX "idx_cards_types" ON "cards" USING gin ("types");--> statement-breakpoint
CREATE INDEX "idx_cards_subtypes" ON "cards" USING gin ("subtypes");--> statement-breakpoint
CREATE INDEX "idx_cards_keywords" ON "cards" USING gin ("keywords");--> statement-breakpoint
CREATE INDEX "idx_cards_colors" ON "cards" USING gin ("colors");--> statement-breakpoint
CREATE INDEX "idx_cards_color_identity" ON "cards" USING gin ("color_identity");--> statement-breakpoint
CREATE INDEX "idx_cards_game_data" ON "cards" USING gin ("game_data");--> statement-breakpoint
CREATE INDEX "idx_collections_owner_id" ON "collections" USING btree ("owner_id") WHERE "collections"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_collections_is_public" ON "collections" USING btree ("is_public") WHERE "collections"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_collections_deleted_at" ON "collections" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_collection_members_collection_id" ON "collection_members" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "idx_collection_members_user_id" ON "collection_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_collection_members_role" ON "collection_members" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_collection_cards_collection_id" ON "collection_cards" USING btree ("collection_id") WHERE "collection_cards"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_collection_cards_card_id" ON "collection_cards" USING btree ("card_id") WHERE "collection_cards"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_collection_cards_deleted_at" ON "collection_cards" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_collection_cards_metadata" ON "collection_cards" USING gin ("card_metadata");