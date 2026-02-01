# @tcg-tracker/types

Shared TypeScript types for the TCG Collection Tracker monorepo.

## Installation

This package is used internally within the monorepo. To use it in other packages:

```json
{
  "dependencies": {
    "@tcg-tracker/types": "workspace:*"
  }
}
```

## Usage

```typescript
import type { User, Card, Collection, CollectionRole } from '@tcg-tracker/types';
```

## Type Categories

### User Types
- `User` - User account entity
- `CreateUserInput` - Input for creating a new user
- `UpdateUserInput` - Input for updating user details

### Collection Types
- `Collection` - Collection entity
- `CollectionRole` - User role within a collection ('owner' | 'contributor' | 'viewer')
- `CreateCollectionInput` - Input for creating a new collection
- `UpdateCollectionInput` - Input for updating collection details

### Card Types
- `Card` - MTG card entity (based on Scryfall API structure)
- `CardRarity` - Card rarity levels ('common' | 'uncommon' | 'rare' | 'mythic')
- `CardImageUris` - Card image URLs in different sizes

### API Response Types
- `ApiError` - Standard error response format
- `ApiSuccess<T>` - Standard success response format with generic data payload

## Development

```bash
# Build type declarations
bun run build

# Watch mode
bun run dev

# Type check only
bun run type-check
```
