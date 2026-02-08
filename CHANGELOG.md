# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Multi-Step Deck Creation Wizard (2026-02-07)

**DeckDialog Multi-Step Wizard:**
- Refactored `DeckDialog` component into a 3-step wizard for deck creation
- Step 1: Basic information (name, description, format selection)
- Step 2: Format-specific metadata (Commander selection OR color/strategy)
- Step 3: Collection settings with summary review
- Added step indicator navigation with visual progress tracking
- Implemented back/next buttons with smart validation
- Step validation prevents advancing with incomplete required fields
- Form state persists across steps using react-hook-form
- Single-page layout maintained for edit mode (backward compatible)

**ColorPicker Component:**
- Created reusable color picker component for WUBRG color selection
- Visual mana color buttons with accurate Magic color scheme
- Interactive toggle buttons with ring indicators for selected colors
- Color identity feedback (mono-color, two-color, etc.)
- `ColorIdentityDisplay` component for read-only color badge display
- Supports disabled and read-only states
- Accessible ARIA labels and button states

**CommanderDeckForm Component:**
- Format-specific form for Commander decks (Step 2)
- Integrates `CommanderSelector` component for legendary creature selection
- Displays selected commander with card image and color identity
- Auto-extracts color identity from selected commander
- 12 Commander-specific strategies (Voltron, Stax, Aristocrats, Tribal, etc.)
- Strategy dropdown with descriptive labels
- Edit button to change selected commander

**ConstructedDeckForm Component:**
- Format-specific form for Constructed decks (Step 2)
- Uses `ColorPicker` for manual color selection
- 10 Constructed-specific strategies (Aggro, Control, Midrange, Tempo, etc.)
- Strategy dropdown optimized for 60-card formats

**User Experience Improvements:**
- Format selection determines which form appears in Step 2
- Summary view on Step 3 shows all selected metadata before creation
- Cancel button always available to close wizard
- Back button available on Steps 2-3 to revise previous choices
- Next button disabled until required fields are complete
- Create button only appears on final step
- Wizard resets to Step 1 when dialog closes

#### Commander Selection and Deck Creation API (2026-02-07)

**Commander Selection Component:**
- Created `CommanderSelector` component for selecting legendary creatures as commanders
- Integrated with existing `CardSearch` component for unified search experience
- Added color identity display with WUBRG mana color badges
- Implemented commander validation (legendary creatures and special planeswalkers)
- Added visual preview with card image, type line, and color identity
- Supports removing commanders with dedicated "Remove Commander" action
- Future-proof design supports partner commanders (single commander implemented)

**Deck Creation API Enhancements:**
- Added `commanderId`, `colors`, and `strategy` fields to deck creation endpoint
- Extended `createDeckSchema` and `updateDeckSchema` with new metadata fields
- Implemented `canBeCommander()` validation function for legendary creature checks
- Auto-extracts color identity from commander card when colors not explicitly provided
- Added validation for commander card existence and legendary status
- Throws user-friendly error messages for invalid commander selections
- Maintains full backward compatibility with existing deck creation flows

**Type System Extensions:**
- Added `color_identity` field to `ScryfallCard` interface
- Created color enum for WUBRG validation (`W`, `U`, `B`, `R`, `G`)
- Strategy field accepts up to 50-character strings for format-specific archetypes

**Testing:**
- Added 13 unit tests for deck schema validation and commander logic
- Tests cover valid/invalid commander scenarios, color validation, and backward compatibility
- All 151 API tests passing (100% pass rate)

#### Foundation Schema and Type System (2026-02-07)

**Database Schema Extensions:**
- Added `commander_id` field to decks table for storing commander card reference
- Added `colors` field to decks table for storing color identity as text array
- Added `strategy` field to decks table for storing format-specific deck strategies
- Added database indexes for efficient commander and strategy lookups
- Added GIN index for color array queries
- Migration 0006: Deck metadata fields with proper foreign keys and constraints

**Type System:**
- Created comprehensive `CommanderStrategy` enum with 18 strategies:
  - Tribal, Aristocrats, Spellslinger, Voltron, Stax, Combo, Tokens, Reanimator
  - Lands, Vehicles, Artifacts, Enchantments, Superfriends, GroupHug, Chaos
  - Stompy, Politics, Midrange
- Created `ConstructedStrategy` enum with 10 strategies:
  - Aggro, Control, Midrange, Combo, Tribal, Tempo, Ramp, Burn, Mill, Prison
- Added `ManaColor` type for WUBRG color system
- Added `ColorIdentity` type for color identity arrays
- Added `DeckFormat` type for supported formats (commander, standard, modern, etc.)
- Created `parseColorIdentity()` utility for parsing color strings
- Created `isValidStrategyForFormat()` validator for format/strategy combinations

**Developer Experience:**
- Created `packages/types` package with TypeScript strict mode configuration
- Exported `Deck` and `NewDeck` types from database schema
- Added comprehensive JSDoc comments for all new types and utilities
- All changes maintain backward compatibility with existing decks

### Changed

- Decks table schema now includes optional metadata fields for format-specific features
- Color identity stored as array for efficient GIN index queries

### Technical Details

**Migration:**
- Migration uses idempotent DO blocks for safe re-runs
- All new deck fields are nullable or have defaults to maintain compatibility
- Indexes include `deleted_at` filter for soft-delete optimization

**Type Safety:**
- All strategy enums are properly typed and exported
- Color identity parsing validates against WUBRG color set
- Format validation prevents invalid strategy/format combinations
- Strict TypeScript configuration ensures type safety across workspaces

## [0.1.0] - 2026-02-06

### Added

- Commander selection and recommendation quick-add features
- Card recommendation system integrated into deck detail view
- Collection modal search using Scryfall API
- Initial project setup with monorepo structure
- Database schema for users, collections, cards, and decks
- Basic deck builder functionality
