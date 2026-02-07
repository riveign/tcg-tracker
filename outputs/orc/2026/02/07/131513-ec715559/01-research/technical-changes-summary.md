# Technical Design Changes Summary

**Date**: 2026-02-07
**Session**: 131513-ec715559
**Status**: Ready for Review

---

## Overview

This document summarizes the key technical changes between the original technical design (v1.0) and the revised design (v2.0) for the MTG Deck Recommendation System.

---

## 1. Architecture Changes

### From: Single-Format Engine
```
v1.0: Commander-focused recommendation engine
      - Single format (Commander/EDH)
      - Optional collection filter
      - Score all legal cards, then filter
```

### To: Format-Agnostic Engine with Adapters
```
v2.0: Multi-format architecture
      - Format-agnostic core engine
      - Format-specific rule adapters
      - Collection as primary data source
```

### Key Addition: Format Adapter Pattern

| Adapter | Deck Size | Copy Limit | Special Rules |
|---------|-----------|------------|---------------|
| StandardAdapter | 60 cards | 4-of | Recent sets only |
| ModernAdapter | 60 cards | 4-of | Modern card pool |
| CommanderAdapter | 99+1 | Singleton | Color identity |
| BrawlAdapter | 59+1 | Singleton | Standard-legal pool |

---

## 2. Data Flow Changes

### Before (v1.0)
```
1. Load all legal cards (~25,000)
2. Score every card
3. Filter by collection (optional)
4. Return results
```

### After (v2.0)
```
1. Load user's collection (~1,500 avg)
2. Filter by format legality
3. Apply format constraints
4. Score remaining candidates
5. Return results (all owned)
```

### Performance Impact
- **94% reduction** in cards to score
- **94% faster** recommendation generation
- **90% reduction** in memory usage

---

## 3. Data Model Changes

### New Tables

#### `collection_format_coverage`
```sql
CREATE TABLE collection_format_coverage (
  id UUID PRIMARY KEY,
  collection_id UUID REFERENCES collections(id),
  format TEXT NOT NULL,
  total_legal_cards INTEGER,
  viable_archetypes JSONB,
  buildable_decks JSONB,
  last_computed TIMESTAMP,
  UNIQUE(collection_id, format)
);
```

### Schema Extensions

#### `decks` table
- Added: `format TEXT` - Required format identifier
- Added: `detected_archetypes TEXT[]` - Archetype tags
- Added: `archetype_confidence JSONB` - Confidence scores

#### `card_synergies` table
- Added: `format_context TEXT` - Format-specific synergy scores
- Updated: Unique constraint includes format context

---

## 4. API Changes

### Updated Endpoints

#### `getSuggestions`
| Parameter | v1.0 | v2.0 |
|-----------|------|------|
| `collectionId` | Optional | **REQUIRED** |
| `format` | N/A | **REQUIRED** |
| `collectionOnly` | Boolean flag | Removed (always true) |

### New Endpoints

| Endpoint | Purpose |
|----------|---------|
| `getBuildableDecks` | Get archetypes buildable from collection |
| `getFormatCoverage` | Analyze collection across all formats |
| `getMultiFormatComparison` | Compare deck viability across formats |

### Example Request Changes

```typescript
// v1.0
getSuggestions({
  deckId: "...",
  collectionOnly: true,  // Optional flag
});

// v2.0
getSuggestions({
  deckId: "...",
  collectionId: "...",   // REQUIRED
  format: "modern",      // REQUIRED
});
```

---

## 5. Scoring Algorithm Changes

### Synergy Score Components

| Component | v1.0 | v2.0 |
|-----------|------|------|
| Mechanical | 0-40 pts | 0-40 pts (unchanged) |
| Strategic | 0-30 pts | 0-30 pts (unchanged) |
| Mana | 0-20 pts | Renamed: Format Context |
| Theme | 0-10 pts | 0-10 pts (unchanged) |

### Format Context Scoring (New)
- Replaces "mana synergy"
- Format-specific value adjustments
- 60-card: Values 4-of consistency
- Singleton: Values unique effects
- Commander: Adds political value bonus

### Deck Composition Targets

Now format-specific:

| Category | Standard | Commander |
|----------|----------|-----------|
| Lands | 20-24 | 34-40 |
| Ramp | N/A | 8-15 |
| Creatures | 12-28 | 10-25 |
| Removal | 4-12 | 8-12 |

---

## 6. New Features

### Progressive Deck Improvement
- Monitor collection changes
- Re-analyze deck viability automatically
- Notify users of improved deck options
- Triggered on: Card scan, bulk import, trade

### Multi-Format Dashboard
- View buildable decks per format
- Compare collection coverage
- Identify multi-format staples
- Cross-format deck utilization

---

## 7. Caching Strategy Changes

### Format-Specific TTLs

| Format | TTL | Reason |
|--------|-----|--------|
| Standard | 24 hours | Set rotation |
| Modern | 7 days | Stable format |
| Commander | 7 days | Stable with occasional bans |
| Brawl | 24 hours | Standard rotation affects |

### Cache Invalidation Triggers
- Set releases
- Ban announcements
- Collection changes

---

## 8. Implementation Phase Changes

### v1.0 Phases
1. Core Engine (Week 1-2)
2. Deck Analysis (Week 3-4)
3. Progressive Logic (Week 5-6)
4. Frontend (Week 7-8)

### v2.0 Phases
1. Core Engine + Format Adapters (Week 1-3)
   - Standard + Commander adapters
   - Collection-first flow
2. Modern + Brawl Support (Week 4-5)
   - Additional adapters
   - Banned lists
3. Multi-Format + Progressive (Week 6-7)
   - Coverage analysis
   - Notifications
4. Frontend Integration (Week 8-10)
   - Format selector
   - Multi-format dashboard

---

## 9. Migration Requirements

### For Existing Installations

1. **Schema Migration**
   - Add `format` column to `decks` table
   - Create `collection_format_coverage` table
   - Update `card_synergies` unique constraint

2. **Data Backfill**
   - Set `format = 'commander'` for existing Commander decks
   - Compute initial format coverage for collections

3. **API Client Updates**
   - Add `collectionId` parameter (now required)
   - Add `format` parameter (now required)
   - Update response handling for new fields

---

## 10. Key Takeaways

### Why These Changes Matter

1. **Collection-First**: Users see only cards they can use immediately
2. **Multi-Format**: Same collection supports 4+ competitive formats
3. **Performance**: 94% reduction in scoring workload
4. **Progressive**: Deck options improve automatically as collection grows
5. **Competitive Focus**: Build optimal decks without purchases

### Technical Benefits

- Isolated format rules in adapters
- Shared scoring logic reduces duplication
- Collection-scoped queries improve performance
- Format-specific caching optimizes resources
- Progressive updates enable real-time improvements

---

*This summary accompanies the full Technical Design Document v2.0*
