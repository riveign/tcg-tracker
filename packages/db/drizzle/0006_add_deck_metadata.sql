-- Migration: Add deck metadata for recommendations
-- Version: 0006
-- Description: Adds commander_id, colors, and strategy fields to decks table

-- =============================================================================
-- Add new columns to decks table
-- =============================================================================

-- Add commander_id column (nullable, references cards table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'decks' AND column_name = 'commander_id'
  ) THEN
    ALTER TABLE decks ADD COLUMN commander_id UUID REFERENCES cards(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add colors column (array of color identity, default empty array)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'decks' AND column_name = 'colors'
  ) THEN
    ALTER TABLE decks ADD COLUMN colors TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Add strategy column (varchar for strategy enum values)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'decks' AND column_name = 'strategy'
  ) THEN
    ALTER TABLE decks ADD COLUMN strategy VARCHAR(50);
  END IF;
END $$;

-- =============================================================================
-- Add indexes for new columns
-- =============================================================================

-- Index for commander_id lookups (find all decks with specific commander)
CREATE INDEX IF NOT EXISTS idx_decks_commander_id ON decks(commander_id) WHERE deleted_at IS NULL;

-- Index for strategy lookups (find all decks with specific strategy)
CREATE INDEX IF NOT EXISTS idx_decks_strategy ON decks(strategy) WHERE deleted_at IS NULL;

-- GIN index for colors array queries (find decks with specific color combinations)
CREATE INDEX IF NOT EXISTS idx_decks_colors ON decks USING GIN(colors) WHERE deleted_at IS NULL;
