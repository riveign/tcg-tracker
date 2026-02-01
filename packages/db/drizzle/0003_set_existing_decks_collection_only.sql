-- Migration: Set all existing decks to collection_only mode
-- Created: 2026-02-01
-- Description: Update all existing decks to have collection_only = true

UPDATE decks
SET collection_only = true
WHERE collection_only = false
  AND deleted_at IS NULL;

-- Report how many decks were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % deck(s) to collection-only mode', updated_count;
END $$;
