-- TCG Collection Tracker Database Schema
-- PostgreSQL schema for Magic: The Gathering collection tracking
-- Designed for extensibility to support other TCGs in the future

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS
-- ============================================================================
-- Core user accounts for authentication and ownership
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete support
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- ============================================================================
-- CARDS
-- ============================================================================
-- MTG card master data based on Scryfall schema
-- This table stores canonical card information, not user ownership
CREATE TABLE cards (
    -- Core identifiers (from Scryfall)
    id UUID PRIMARY KEY, -- Scryfall card ID (unique per printing)
    oracle_id UUID NOT NULL, -- Groups functionally identical cards across printings

    -- Basic card information
    name VARCHAR(255) NOT NULL,
    type_line TEXT NOT NULL,
    oracle_text TEXT, -- Rules text

    -- Type information (denormalized for filtering performance)
    types TEXT[] NOT NULL DEFAULT '{}', -- ['Creature', 'Artifact']
    subtypes TEXT[] NOT NULL DEFAULT '{}', -- ['Human', 'Wizard']
    supertypes TEXT[] NOT NULL DEFAULT '{}', -- ['Legendary', 'Snow']
    keywords TEXT[] NOT NULL DEFAULT '{}', -- ['Flying', 'Haste']

    -- Mana and costs
    mana_cost VARCHAR(100), -- '{2}{U}{U}'
    cmc DECIMAL(5,2), -- Converted mana cost (mana value)
    colors TEXT[] NOT NULL DEFAULT '{}', -- ['U', 'R']
    color_identity TEXT[] NOT NULL DEFAULT '{}', -- For Commander

    -- Card stats (nullable for non-creatures)
    power VARCHAR(10), -- Can be '*', '1+*', etc.
    toughness VARCHAR(10),
    loyalty VARCHAR(10), -- For planeswalkers

    -- Printing information
    set_code VARCHAR(10) NOT NULL, -- 'MOM', 'ONE', etc.
    set_name VARCHAR(255) NOT NULL,
    collector_number VARCHAR(20) NOT NULL,
    rarity VARCHAR(20) NOT NULL, -- 'common', 'uncommon', 'rare', 'mythic'

    -- Additional metadata
    artist VARCHAR(255),
    flavor_text TEXT,

    -- Image URIs (storing as JSONB for flexibility with different sizes)
    image_uris JSONB, -- {'small': 'url', 'normal': 'url', 'large': 'url'}

    -- Game-specific data stored as JSONB for extensibility
    -- This allows future support for other TCGs without schema changes
    game_data JSONB NOT NULL DEFAULT '{}', -- MTG-specific: legalities, prices, etc.

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Unique constraint on set + collector number (identifies specific printing)
    UNIQUE(set_code, collector_number)
);

-- Performance indexes for common filter operations
CREATE INDEX idx_cards_oracle_id ON cards(oracle_id);
CREATE INDEX idx_cards_name ON cards(name);
CREATE INDEX idx_cards_set_code ON cards(set_code);
CREATE INDEX idx_cards_rarity ON cards(rarity);
CREATE INDEX idx_cards_cmc ON cards(cmc);

-- GIN indexes for array columns (enables efficient filtering)
CREATE INDEX idx_cards_types ON cards USING GIN(types);
CREATE INDEX idx_cards_subtypes ON cards USING GIN(subtypes);
CREATE INDEX idx_cards_keywords ON cards USING GIN(keywords);
CREATE INDEX idx_cards_colors ON cards USING GIN(colors);
CREATE INDEX idx_cards_color_identity ON cards USING GIN(color_identity);

-- GIN index for JSONB game_data (enables queries on nested JSON)
CREATE INDEX idx_cards_game_data ON cards USING GIN(game_data);

-- ============================================================================
-- COLLECTIONS
-- ============================================================================
-- Named collections owned by users
-- Users can have multiple collections (e.g., "Competitive Deck", "Trade Binder")
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Visibility and sharing settings
    is_public BOOLEAN NOT NULL DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete support
);

CREATE INDEX idx_collections_owner_id ON collections(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_collections_is_public ON collections(is_public) WHERE deleted_at IS NULL;
CREATE INDEX idx_collections_deleted_at ON collections(deleted_at);

-- ============================================================================
-- COLLECTION MEMBERS
-- ============================================================================
-- Multi-user collaboration on collections
-- Defines who has access to a collection and their permission level
CREATE TYPE collection_role AS ENUM ('owner', 'contributor', 'viewer');

CREATE TABLE collection_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role collection_role NOT NULL DEFAULT 'viewer',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Ensure a user can only have one role per collection
    UNIQUE(collection_id, user_id)
);

CREATE INDEX idx_collection_members_collection_id ON collection_members(collection_id);
CREATE INDEX idx_collection_members_user_id ON collection_members(user_id);
CREATE INDEX idx_collection_members_role ON collection_members(role);

-- ============================================================================
-- COLLECTION CARDS
-- ============================================================================
-- Junction table linking collections to cards with quantities
-- Tracks which cards are in which collections and how many
CREATE TABLE collection_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

    -- Quantity tracking
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),

    -- Optional: condition tracking for TCG cards
    -- Stored as JSONB for flexibility (e.g., {'condition': 'NM', 'foil': true})
    card_metadata JSONB NOT NULL DEFAULT '{}',

    -- Soft delete: when removing cards from collection, we preserve history
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- A card can appear once per collection (update quantity instead)
    UNIQUE(collection_id, card_id) WHERE deleted_at IS NULL
);

CREATE INDEX idx_collection_cards_collection_id ON collection_cards(collection_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_collection_cards_card_id ON collection_cards(card_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_collection_cards_deleted_at ON collection_cards(deleted_at);

-- GIN index for card_metadata queries
CREATE INDEX idx_collection_cards_metadata ON collection_cards USING GIN(card_metadata);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Complete Collection View
-- Aggregates all cards across all collections for a user
-- Provides a virtual "complete collection" without duplicating data
CREATE VIEW user_complete_collection AS
SELECT
    u.id AS user_id,
    u.username,
    c.id AS card_id,
    c.name AS card_name,
    c.set_code,
    c.collector_number,
    c.rarity,
    c.oracle_id,
    -- Sum quantities across all collections the user owns or is a member of
    SUM(cc.quantity) AS total_quantity,
    -- Array of collections containing this card
    ARRAY_AGG(DISTINCT col.name) AS collection_names,
    -- Array of collection IDs
    ARRAY_AGG(DISTINCT col.id) AS collection_ids
FROM users u
-- Get all collections the user owns
LEFT JOIN collections col ON col.owner_id = u.id AND col.deleted_at IS NULL
-- Get all collections the user is a member of
LEFT JOIN collection_members cm ON cm.user_id = u.id
LEFT JOIN collections col_shared ON col_shared.id = cm.collection_id AND col_shared.deleted_at IS NULL
-- Get cards from both owned and shared collections
LEFT JOIN collection_cards cc ON (cc.collection_id = col.id OR cc.collection_id = col_shared.id)
    AND cc.deleted_at IS NULL
LEFT JOIN cards c ON c.id = cc.card_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username, c.id, c.name, c.set_code, c.collector_number, c.rarity, c.oracle_id;

-- Collection Summary View
-- Provides quick stats about each collection
CREATE VIEW collection_summary AS
SELECT
    col.id AS collection_id,
    col.name AS collection_name,
    col.owner_id,
    u.username AS owner_username,
    COUNT(DISTINCT cc.card_id) AS unique_cards,
    COALESCE(SUM(cc.quantity), 0) AS total_cards,
    col.is_public,
    col.created_at,
    col.updated_at
FROM collections col
JOIN users u ON u.id = col.owner_id
LEFT JOIN collection_cards cc ON cc.collection_id = col.id AND cc.deleted_at IS NULL
WHERE col.deleted_at IS NULL AND u.deleted_at IS NULL
GROUP BY col.id, col.name, col.owner_id, u.username, col.is_public, col.created_at, col.updated_at;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_members_updated_at BEFORE UPDATE ON collection_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collection_cards_updated_at BEFORE UPDATE ON collection_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Helper function to check if a user has access to a collection
CREATE OR REPLACE FUNCTION user_has_collection_access(
    p_user_id UUID,
    p_collection_id UUID,
    p_required_role collection_role DEFAULT 'viewer'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_owner BOOLEAN;
    v_member_role collection_role;
BEGIN
    -- Check if user is the owner
    SELECT EXISTS(
        SELECT 1 FROM collections
        WHERE id = p_collection_id
        AND owner_id = p_user_id
        AND deleted_at IS NULL
    ) INTO v_is_owner;

    IF v_is_owner THEN
        RETURN TRUE;
    END IF;

    -- Check if user is a member with sufficient role
    SELECT role INTO v_member_role
    FROM collection_members
    WHERE collection_id = p_collection_id
    AND user_id = p_user_id;

    -- Role hierarchy: owner > contributor > viewer
    RETURN CASE
        WHEN v_member_role = 'owner' THEN TRUE
        WHEN v_member_role = 'contributor' AND p_required_role IN ('contributor', 'viewer') THEN TRUE
        WHEN v_member_role = 'viewer' AND p_required_role = 'viewer' THEN TRUE
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts with soft delete support';
COMMENT ON TABLE cards IS 'MTG card master data from Scryfall. Stores canonical card information, not ownership.';
COMMENT ON TABLE collections IS 'Named collections owned by users. Users can have multiple collections.';
COMMENT ON TABLE collection_members IS 'Multi-user collaboration on collections with role-based access.';
COMMENT ON TABLE collection_cards IS 'Junction table linking collections to cards with quantities. Supports soft deletes for history preservation.';

COMMENT ON COLUMN cards.id IS 'Scryfall card ID - unique per printing';
COMMENT ON COLUMN cards.oracle_id IS 'Groups functionally identical cards across different printings';
COMMENT ON COLUMN cards.game_data IS 'JSONB field for MTG-specific data (legalities, prices). Enables future TCG extensibility.';
COMMENT ON COLUMN collection_cards.card_metadata IS 'Optional card-specific metadata (condition, foil status, etc.)';

COMMENT ON VIEW user_complete_collection IS 'Virtual aggregation of all cards across all collections a user owns or is a member of';
COMMENT ON VIEW collection_summary IS 'Quick statistics about each collection';

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Find all blue creatures with CMC <= 3 in a user's complete collection
/*
SELECT
    card_name,
    set_code,
    total_quantity,
    collection_names
FROM user_complete_collection
WHERE user_id = '...'
AND 'U' = ANY(colors)
AND 'Creature' = ANY(types)
AND cmc <= 3;
*/

-- Get all members of a collection with their roles
/*
SELECT
    u.username,
    cm.role,
    cm.created_at
FROM collection_members cm
JOIN users u ON u.id = cm.user_id
WHERE cm.collection_id = '...'
ORDER BY cm.role, u.username;
*/

-- Find cards in multiple collections (duplicates across collections)
/*
SELECT
    c.name,
    c.set_code,
    ARRAY_AGG(col.name) AS collections,
    ARRAY_AGG(cc.quantity) AS quantities
FROM collection_cards cc
JOIN cards c ON c.id = cc.card_id
JOIN collections col ON col.id = cc.collection_id
WHERE col.owner_id = '...'
AND col.deleted_at IS NULL
AND cc.deleted_at IS NULL
GROUP BY c.id, c.name, c.set_code
HAVING COUNT(DISTINCT cc.collection_id) > 1;
*/
