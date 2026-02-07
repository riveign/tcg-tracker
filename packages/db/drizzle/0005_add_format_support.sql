-- Migration: Add format support for recommendation system
-- Version: 0005
-- Description: Adds tables and columns for multi-format deck recommendations

-- =============================================================================
-- card_synergies table
-- Pre-computed synergy scores with format context
-- =============================================================================

CREATE TABLE IF NOT EXISTS card_synergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  related_card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  synergy_score DECIMAL(5,2) NOT NULL CHECK (synergy_score >= 0 AND synergy_score <= 100),
  mechanical_score DECIMAL(5,2) NOT NULL CHECK (mechanical_score >= 0 AND mechanical_score <= 40),
  strategic_score DECIMAL(5,2) NOT NULL CHECK (strategic_score >= 0 AND strategic_score <= 30),
  format_context_score DECIMAL(5,2) NOT NULL CHECK (format_context_score >= 0 AND format_context_score <= 20),
  theme_score DECIMAL(5,2) NOT NULL CHECK (theme_score >= 0 AND theme_score <= 10),
  synergy_reasons JSONB NOT NULL DEFAULT '[]',
  format_context TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT card_synergies_unique_pair_format UNIQUE (card_id, related_card_id, format_context)
);

-- Indexes for card_synergies
CREATE INDEX IF NOT EXISTS idx_card_synergies_card_id ON card_synergies(card_id);
CREATE INDEX IF NOT EXISTS idx_card_synergies_related_card_id ON card_synergies(related_card_id);
CREATE INDEX IF NOT EXISTS idx_card_synergies_format ON card_synergies(format_context);
CREATE INDEX IF NOT EXISTS idx_card_synergies_score ON card_synergies(synergy_score DESC);

-- =============================================================================
-- collection_format_coverage table
-- Cached analysis of collection viability per format
-- =============================================================================

CREATE TABLE IF NOT EXISTS collection_format_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  total_legal_cards INTEGER NOT NULL DEFAULT 0,
  viable_archetypes JSONB NOT NULL DEFAULT '[]',
  buildable_decks JSONB NOT NULL DEFAULT '[]',
  last_computed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT collection_format_coverage_unique UNIQUE (collection_id, format)
);

-- Indexes for collection_format_coverage
CREATE INDEX IF NOT EXISTS idx_collection_format_coverage_collection ON collection_format_coverage(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_format_coverage_format ON collection_format_coverage(format);

-- =============================================================================
-- Update decks table
-- Add format tracking and archetype detection
-- =============================================================================

-- Add detected_archetypes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'decks' AND column_name = 'detected_archetypes'
  ) THEN
    ALTER TABLE decks ADD COLUMN detected_archetypes TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Add archetype_confidence column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'decks' AND column_name = 'archetype_confidence'
  ) THEN
    ALTER TABLE decks ADD COLUMN archetype_confidence JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add last_analysis_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'decks' AND column_name = 'last_analysis_at'
  ) THEN
    ALTER TABLE decks ADD COLUMN last_analysis_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add index for format queries on decks table
CREATE INDEX IF NOT EXISTS idx_decks_format ON decks(format) WHERE deleted_at IS NULL;

-- Add GIN index for archetype queries
CREATE INDEX IF NOT EXISTS idx_decks_archetypes ON decks USING GIN(detected_archetypes) WHERE deleted_at IS NULL;

-- =============================================================================
-- Backfill existing Commander decks with lowercase format
-- =============================================================================

UPDATE decks
SET format = 'commander'
WHERE format = 'Commander' AND deleted_at IS NULL;

UPDATE decks
SET format = 'standard'
WHERE format = 'Standard' AND deleted_at IS NULL;

UPDATE decks
SET format = 'modern'
WHERE format = 'Modern' AND deleted_at IS NULL;

UPDATE decks
SET format = 'legacy'
WHERE format = 'Legacy' AND deleted_at IS NULL;

UPDATE decks
SET format = 'vintage'
WHERE format = 'Vintage' AND deleted_at IS NULL;

UPDATE decks
SET format = 'pioneer'
WHERE format = 'Pioneer' AND deleted_at IS NULL;

UPDATE decks
SET format = 'pauper'
WHERE format = 'Pauper' AND deleted_at IS NULL;
