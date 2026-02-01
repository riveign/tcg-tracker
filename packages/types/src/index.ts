// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateUserInput {
  email: string;
  username: string;
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
}

// ============================================================================
// Collection Types
// ============================================================================

export type CollectionRole = 'owner' | 'contributor' | 'viewer';

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string;
}

// ============================================================================
// Card Types (Scryfall-based)
// ============================================================================

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'mythic';

export interface CardImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
}

export interface Card {
  // Identifiers
  id: string;              // Scryfall UUID (specific printing)
  oracle_id: string;       // Groups identical cards across printings

  // Core info
  name: string;
  type_line: string;       // "Legendary Creature — Elf Warrior"
  oracle_text: string;     // Rules text

  // Type arrays (for filtering)
  types: string[];         // ["Creature"]
  subtypes: string[];      // ["Elf", "Warrior"]
  supertypes: string[];    // ["Legendary"]
  keywords: string[];      // ["Flying", "Haste"]

  // Mana
  mana_cost: string;       // "{2}{G}{G}"
  cmc: number;             // Converted mana cost
  colors: string[];        // ["G"]
  color_identity: string[]; // ["G"]

  // Stats
  power?: string;
  toughness?: string;
  loyalty?: string;

  // Set info
  set_code: string;
  set_name: string;
  collector_number: string;
  rarity: CardRarity;

  // Images
  image_uris: CardImageUris;

  // Extensibility
  game_data: Record<string, any>; // MTG-specific (legalities, prices)
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface ApiSuccess<T = any> {
  data: T;
  message?: string;
}

// ============================================================================
// tRPC Types (Placeholder - will be implemented in backend)
// ============================================================================

// This is a placeholder type that will be replaced with the actual
// AppRouter type from the backend once tRPC routes are implemented
export type AppRouter = any;
