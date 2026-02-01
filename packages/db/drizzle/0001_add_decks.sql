-- Migration: Add Decks Tables
-- Created: 2026-02-01
-- Description: Add decks and deck_cards tables for deck builder feature

-- Create decks table
CREATE TABLE decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    format VARCHAR(50), -- 'Standard', 'Modern', 'Commander', 'Legacy', etc.
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create deck_cards junction table
CREATE TABLE deck_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0 AND quantity <= 100),
    card_type VARCHAR(20) NOT NULL DEFAULT 'mainboard', -- 'mainboard', 'sideboard', 'commander'
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_decks_owner_id ON decks(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_deck_cards_deck_id ON deck_cards(deck_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_deck_cards_card_id ON deck_cards(card_id) WHERE deleted_at IS NULL;

-- Unique constraint for deck_cards (partial index to exclude soft-deleted)
CREATE UNIQUE INDEX idx_deck_cards_unique ON deck_cards(deck_id, card_id, card_type) WHERE deleted_at IS NULL;

-- View for deck statistics
CREATE VIEW deck_stats AS
SELECT
    d.id AS deck_id,
    d.name AS deck_name,
    d.format,
    COUNT(DISTINCT dc.card_id) FILTER (WHERE dc.card_type = 'mainboard') AS mainboard_count,
    SUM(dc.quantity) FILTER (WHERE dc.card_type = 'mainboard') AS total_mainboard_cards,
    COUNT(DISTINCT dc.card_id) FILTER (WHERE dc.card_type = 'sideboard') AS sideboard_count,
    SUM(dc.quantity) FILTER (WHERE dc.card_type = 'sideboard') AS total_sideboard_cards,
    COUNT(DISTINCT dc.card_id) FILTER (WHERE dc.card_type = 'commander') AS commander_count,
    AVG(c.cmc) FILTER (WHERE dc.card_type = 'mainboard') AS avg_cmc,
    d.owner_id,
    d.created_at,
    d.updated_at
FROM decks d
LEFT JOIN deck_cards dc ON d.id = dc.deck_id AND dc.deleted_at IS NULL
LEFT JOIN cards c ON dc.card_id = c.id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.name, d.format, d.owner_id, d.created_at, d.updated_at;
