/**
 * Scryfall API Integration
 * https://scryfall.com/docs/api
 *
 * Rate limit: ~10 requests per second
 * No API key required
 */

export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  type_line: string;
  oracle_text?: string;
  mana_cost?: string;
  cmc: number;
  colors?: string[];
  color_identity?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  artist?: string;
  flavor_text?: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
  };
  prices?: {
    usd?: string;
    usd_foil?: string;
    eur?: string;
  };
  legalities?: Record<string, string>;
  keywords?: string[];
}

export interface ScryfallSearchResponse {
  object: 'list';
  total_cards: number;
  has_more: boolean;
  data: ScryfallCard[];
}

const SCRYFALL_API_BASE = 'https://api.scryfall.com';

/**
 * Search for cards by name
 */
export async function searchCards(
  query: string,
  page: number = 1
): Promise<{ cards: ScryfallCard[]; hasMore: boolean; total: number }> {
  const url = new URL(`${SCRYFALL_API_BASE}/cards/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('page', page.toString());
  url.searchParams.set('order', 'name');

  const response = await fetch(url.toString());

  if (!response.ok) {
    if (response.status === 404) {
      // No cards found
      return { cards: [], hasMore: false, total: 0 };
    }
    throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
  }

  const data: ScryfallSearchResponse = await response.json();

  return {
    cards: data.data,
    hasMore: data.has_more,
    total: data.total_cards,
  };
}

/**
 * Get a single card by Scryfall ID
 */
export async function getCardById(cardId: string): Promise<ScryfallCard | null> {
  const url = `${SCRYFALL_API_BASE}/cards/${cardId}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Parse set code and collector number from search query
 * Supports formats: ECL #212, ECL 212, ecl#212, ECL-212
 */
export function parseSetCodeQuery(query: string): { setCode: string; collectorNumber: string } | null {
  const pattern = /^([a-z0-9]+)\s*[#\s-]\s*(\d+[a-z]?)$/i;
  const match = query.trim().match(pattern);

  if (!match) {
    return null;
  }

  return {
    setCode: match[1].toUpperCase(),
    collectorNumber: match[2],
  };
}

/**
 * Search for a specific card by set code and collector number
 */
export async function searchBySetCode(
  setCode: string,
  collectorNumber: string
): Promise<ScryfallCard | null> {
  const url = `${SCRYFALL_API_BASE}/cards/${setCode}/${collectorNumber}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Transform Scryfall card data to our database schema
 */
export function transformScryfallCard(scryfallCard: ScryfallCard) {
  // Parse type line into types, subtypes, supertypes
  const typeLineParts = scryfallCard.type_line.split('—').map((s) => s.trim());
  const mainTypes = typeLineParts[0]?.split(' ') || [];
  const subtypesString = typeLineParts[1] || '';
  const subtypes = subtypesString ? subtypesString.split(' ').filter(Boolean) : [];

  // Separate supertypes from types
  const supertypesList = ['Legendary', 'Basic', 'Snow', 'World', 'Ongoing'];
  const supertypes = mainTypes.filter((t) => supertypesList.includes(t));
  const types = mainTypes.filter((t) => !supertypesList.includes(t));

  return {
    id: scryfallCard.id,
    oracleId: scryfallCard.oracle_id,
    name: scryfallCard.name,
    typeLine: scryfallCard.type_line,
    oracleText: scryfallCard.oracle_text || null,
    types,
    subtypes,
    supertypes,
    keywords: scryfallCard.keywords || [],
    manaCost: scryfallCard.mana_cost || null,
    cmc: scryfallCard.cmc.toString(),
    colors: scryfallCard.colors || [],
    colorIdentity: scryfallCard.color_identity || [],
    power: scryfallCard.power || null,
    toughness: scryfallCard.toughness || null,
    loyalty: scryfallCard.loyalty || null,
    setCode: scryfallCard.set,
    setName: scryfallCard.set_name,
    collectorNumber: scryfallCard.collector_number,
    rarity: scryfallCard.rarity,
    artist: scryfallCard.artist || null,
    flavorText: scryfallCard.flavor_text || null,
    imageUris: scryfallCard.image_uris || null,
    gameData: {
      legalities: scryfallCard.legalities || {},
      prices: scryfallCard.prices || {},
    },
  };
}
