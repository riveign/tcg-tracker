import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Mock schema validation tests
const colorEnum = z.enum(['W', 'U', 'B', 'R', 'G']);

const createDeckSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  format: z.enum(['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other']).optional(),
  collectionOnly: z.boolean().default(false),
  collectionId: z.string().uuid().optional().nullable(),
  commanderId: z.string().uuid().optional().nullable(),
  colors: z.array(colorEnum).optional(),
  strategy: z.string().max(50).optional().nullable(),
});

describe('Deck API Schema Validation', () => {
  describe('createDeckSchema', () => {
    it('should accept valid deck with all new fields', () => {
      const input = {
        name: 'Test Commander Deck',
        format: 'Commander',
        commanderId: '123e4567-e89b-12d3-a456-426614174000',
        colors: ['W', 'U', 'B'],
        strategy: 'control',
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept valid deck without optional fields (backward compatible)', () => {
      const input = {
        name: 'Simple Deck',
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid color values', () => {
      const input = {
        name: 'Test Deck',
        colors: ['W', 'X', 'B'], // 'X' is not a valid color
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject strategy longer than 50 characters', () => {
      const input = {
        name: 'Test Deck',
        strategy: 'a'.repeat(51),
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for commanderId', () => {
      const input = {
        name: 'Test Deck',
        commanderId: 'not-a-uuid',
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept null commanderId', () => {
      const input = {
        name: 'Test Deck',
        commanderId: null,
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept empty colors array', () => {
      const input = {
        name: 'Colorless Deck',
        colors: [],
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept all five colors', () => {
      const input = {
        name: 'Five Color Deck',
        colors: ['W', 'U', 'B', 'R', 'G'],
      };

      const result = createDeckSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.colors).toHaveLength(5);
      }
    });
  });
});

describe('canBeCommander validation logic', () => {
  interface CardForCommanderCheck {
    typeLine: string;
    supertypes: string[];
    types: string[];
    oracleText?: string | null;
  }

  function canBeCommander(card: CardForCommanderCheck): boolean {
    const oracleText = card.oracleText?.toLowerCase() ?? '';

    if (oracleText.includes('can be your commander')) {
      return true;
    }

    const isLegendary = card.supertypes?.includes('Legendary') ?? false;
    const isCreature = card.types?.includes('Creature') ?? false;

    return isLegendary && isCreature;
  }

  it('should return true for legendary creature', () => {
    const card: CardForCommanderCheck = {
      typeLine: 'Legendary Creature - Human Wizard',
      supertypes: ['Legendary'],
      types: ['Creature'],
      oracleText: null,
    };

    expect(canBeCommander(card)).toBe(true);
  });

  it('should return false for non-legendary creature', () => {
    const card: CardForCommanderCheck = {
      typeLine: 'Creature - Human Wizard',
      supertypes: [],
      types: ['Creature'],
      oracleText: null,
    };

    expect(canBeCommander(card)).toBe(false);
  });

  it('should return false for legendary non-creature', () => {
    const card: CardForCommanderCheck = {
      typeLine: 'Legendary Enchantment',
      supertypes: ['Legendary'],
      types: ['Enchantment'],
      oracleText: null,
    };

    expect(canBeCommander(card)).toBe(false);
  });

  it('should return true for card with "can be your commander" text', () => {
    const card: CardForCommanderCheck = {
      typeLine: 'Legendary Planeswalker - Teferi',
      supertypes: ['Legendary'],
      types: ['Planeswalker'],
      oracleText: 'Teferi, Temporal Archmage can be your commander.',
    };

    expect(canBeCommander(card)).toBe(true);
  });

  it('should return false for instant spell', () => {
    const card: CardForCommanderCheck = {
      typeLine: 'Instant',
      supertypes: [],
      types: ['Instant'],
      oracleText: 'Counter target spell.',
    };

    expect(canBeCommander(card)).toBe(false);
  });
});
