/**
 * Format Adapter Factory
 *
 * Creates the appropriate format adapter based on the requested format.
 * This provides a single entry point for obtaining format adapters
 * throughout the recommendation system.
 */

import type { FormatAdapter, FormatType } from './types.js';
import { StandardAdapter } from './standard.js';
import { CommanderAdapter } from './commander.js';

// =============================================================================
// Adapter Cache
// =============================================================================

// Cache adapters to avoid repeated instantiation
const adapterCache = new Map<FormatType, FormatAdapter>();

// =============================================================================
// Factory Implementation
// =============================================================================

/**
 * FormatAdapterFactory creates and caches format adapters.
 *
 * @example
 * ```typescript
 * const adapter = FormatAdapterFactory.create('standard');
 * const isLegal = adapter.isLegal(card);
 * ```
 */
export class FormatAdapterFactory {
  /**
   * Create or retrieve a cached format adapter for the given format
   * @param format The format to create an adapter for
   * @returns The format adapter
   * @throws Error if the format is not supported
   */
  static create(format: FormatType): FormatAdapter {
    // Check cache first
    const cached = adapterCache.get(format);
    if (cached) {
      return cached;
    }

    // Create new adapter
    const adapter = FormatAdapterFactory.createAdapter(format);

    // Cache and return
    adapterCache.set(format, adapter);
    return adapter;
  }

  /**
   * Get all supported format types
   * @returns Array of supported format types
   */
  static getSupportedFormats(): FormatType[] {
    return ['standard', 'modern', 'commander', 'brawl'];
  }

  /**
   * Check if a format is supported
   * @param format The format to check
   * @returns true if the format is supported
   */
  static isSupported(format: string): format is FormatType {
    return FormatAdapterFactory.getSupportedFormats().includes(format as FormatType);
  }

  /**
   * Clear the adapter cache (useful for testing)
   */
  static clearCache(): void {
    adapterCache.clear();
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private static createAdapter(format: FormatType): FormatAdapter {
    switch (format) {
      case 'standard':
        return new StandardAdapter();

      case 'modern':
        // Modern uses similar rules to Standard but with different legality
        // For Phase 1, we reuse StandardAdapter with a note for Phase 2 implementation
        // TODO: Implement dedicated ModernAdapter in Phase 2
        return new StandardAdapter();

      case 'commander':
        return new CommanderAdapter();

      case 'brawl':
        // Brawl is similar to Commander but with Standard legality
        // For Phase 1, we use CommanderAdapter with a note for Phase 2 implementation
        // TODO: Implement dedicated BrawlAdapter in Phase 2
        return new CommanderAdapter();

      default: {
        // Exhaustive check - this should never happen if FormatType is properly defined
        const exhaustiveCheck: never = format;
        throw new Error(`Unsupported format: ${exhaustiveCheck}`);
      }
    }
  }
}

// =============================================================================
// Convenience Export
// =============================================================================

/**
 * Convenience function to create a format adapter
 * @param format The format to create an adapter for
 * @returns The format adapter
 */
export function createFormatAdapter(format: FormatType): FormatAdapter {
  return FormatAdapterFactory.create(format);
}
