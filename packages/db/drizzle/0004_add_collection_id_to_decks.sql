-- Migration: Add collection_id field to decks
-- Created: 2026-02-01
-- Description: Add collection_id foreign key to link decks to specific collections

ALTER TABLE decks ADD COLUMN collection_id UUID;

-- Add foreign key constraint
ALTER TABLE decks ADD CONSTRAINT decks_collection_id_fkey
  FOREIGN KEY (collection_id)
  REFERENCES collections(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN decks.collection_id IS 'Optional link to a specific collection. If set with collection_only=true, deck can only use cards from this collection. If null with collection_only=true, deck can use cards from any user collection.';
