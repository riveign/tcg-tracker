# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
