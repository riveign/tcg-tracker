-- Migration: Add collection_only field to decks
-- Created: 2026-02-01
-- Description: Add collection_only boolean to restrict deck building to owned cards only

ALTER TABLE decks ADD COLUMN collection_only BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN decks.collection_only IS 'If true, only cards from user collections can be added to this deck';
