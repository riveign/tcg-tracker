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

// ============================================================================
// Deck Strategy Types
// ============================================================================

/**
 * Commander-specific deck strategies
 * Based on common archetypes in EDH format
 */
export enum CommanderStrategy {
  Tribal = 'tribal',                    // Creature type synergy (Elves, Dragons, etc.)
  Aristocrats = 'aristocrats',          // Sacrifice and death triggers
  Spellslinger = 'spellslinger',        // Instant/sorcery-focused
  Voltron = 'voltron',                  // Commander damage focus
  Stax = 'stax',                        // Resource denial/prison
  Combo = 'combo',                      // Infinite combo wins
  Tokens = 'tokens',                    // Token generation and go-wide
  Reanimator = 'reanimator',            // Graveyard recursion
  Lands = 'lands',                      // Land-based synergies
  Vehicles = 'vehicles',                // Vehicle tribal
  Artifacts = 'artifacts',              // Artifact synergies
  Enchantments = 'enchantments',        // Enchantment synergies
  Superfriends = 'superfriends',        // Planeswalker-focused
  GroupHug = 'group_hug',               // Symmetrical benefits
  Chaos = 'chaos',                      // Random/chaotic effects
  Stompy = 'stompy',                    // Big creatures/combat
  Politics = 'politics',                // Multiplayer interaction
  Midrange = 'midrange',                // Value-based strategy
}

/**
 * Constructed format deck strategies
 * Applicable to Standard, Modern, Pioneer, Legacy, Vintage
 */
export enum ConstructedStrategy {
  Aggro = 'aggro',                      // Fast, low-curve aggressive
  Control = 'control',                  // Counter/removal, late-game
  Midrange = 'midrange',                // Value creatures/spells
  Combo = 'combo',                      // Specific card combos
  Tribal = 'tribal',                    // Creature type synergy
  Tempo = 'tempo',                      // Efficient threats + disruption
  Ramp = 'ramp',                        // Mana acceleration
  Burn = 'burn',                        // Direct damage
  Mill = 'mill',                        // Library depletion
  Prison = 'prison',                    // Lock opponent's resources
}

/**
 * Magic: The Gathering color identity
 * W = White, U = Blue, B = Black, R = Red, G = Green
 */
export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G';

/**
 * Color identity as array of mana colors
 * Examples: ['W', 'U'], ['R', 'G'], []
 */
export type ColorIdentity = ManaColor[];

/**
 * Format types supported by the application
 */
export type DeckFormat =
  | 'commander'
  | 'standard'
  | 'modern'
  | 'pioneer'
  | 'legacy'
  | 'vintage'
  | 'pauper'
  | 'brawl';

/**
 * Union type of all possible strategy values
 */
export type DeckStrategy = CommanderStrategy | ConstructedStrategy;

// ============================================================================
// Color Identity Utilities
// ============================================================================

/**
 * Parse color identity string to array
 * @param colors - Color string like "WU", "BRG", or ""
 * @returns Array of ManaColor values
 */
export function parseColorIdentity(colors: string): ColorIdentity {
  const validColors: ManaColor[] = ['W', 'U', 'B', 'R', 'G'];
  return Array.from(colors.toUpperCase())
    .filter((c): c is ManaColor => validColors.includes(c as ManaColor));
}

/**
 * Validate that a strategy is valid for a given format
 * @param format - The deck format
 * @param strategy - The strategy to validate
 * @returns true if strategy is valid for format
 */
export function isValidStrategyForFormat(
  format: DeckFormat,
  strategy: DeckStrategy
): boolean {
  if (format === 'commander' || format === 'brawl') {
    return Object.values(CommanderStrategy).includes(strategy as CommanderStrategy);
  }
  return Object.values(ConstructedStrategy).includes(strategy as ConstructedStrategy);
}
