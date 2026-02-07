# Product Scope Revision Summary

**Session**: 131513-ec715559
**Date**: 2026-02-07
**Status**: COMPLETED

---

## Key Changes Made

### 1. Product Vision Section

**Before**: Commander/EDH-specific focus ("The 99-Card Problem")

**After**: Multi-format, collection-first approach:
- **Problem**: Players have card collections but struggle to build competitive, synergistic decks across different formats
- **Target Users**: MTG players (casual to competitive) who want to maximize their existing collections
- **Vision**: "Build the best possible decks from the cards you already own. Compete with friends across Standard, Modern, Commander, and Brawl formats without buying new cards."

### 2. Core Features Section

**Added**:
- Multi-Format Deck Recommendations (Standard, Modern, Commander, Brawl)
- Collection-Constrained Deck Building as DEFAULT mode (not optional toggle)
- Multi-Format Deck Suggestions (same collection, different formats)
- Format-Agnostic Synergy Scoring with format context adaptation
- Progressive Deck Improvement (notifications when collection grows)

**Modified**:
- Synergy scoring now includes "Format Context" component
- Deck Composition Analysis supports both 60-card and 100-card formats

### 3. User Stories Section

**Added Stories**:
- 3.1 Collection-First Deck Discovery
- 3.2 Multi-Format Collection Utilization
- 3.3 60-Card Constructed Deck Building (Standard/Modern specific)
- 3.5 Brawl Deck Building
- 3.6 Progressive Collection Growth
- 3.7 Competitive Play Without Purchases
- 3.8 Deck Gap Analysis (With Purchase Intent) - separated from default flow

**Modified Stories**:
- Commander deck building now emphasizes "cards I own" as PRIMARY constraint
- All stories default to collection-constrained mode

### 4. Out of Scope Section

**Removed from Out-of-Scope** (now in-scope for v1):
- Multi-format support

**Added to Out-of-Scope**:
- Legacy, Vintage, Pauper, Pioneer, Historic formats (v2 candidates)
- Arena Collection Sync (v2)

**Clarification Added**:
- v1 explicitly supports Standard, Modern, Commander, Brawl
- Other formats are v2+ candidates with clear progression path

### 5. Success Metrics Section

**Added Metrics**:

| Category | New Metric | Target |
|----------|------------|--------|
| Collection Utilization | Collection Coverage Rate | >25% |
| Collection Utilization | Dormant Card Activation | +15% |
| Collection Utilization | Cross-Format Card Usage | Track baseline |
| Collection Utilization | Collection Growth to Deck Impact | >50% of additions |
| Competitive | Zero-Purchase Deck Builds | >80% of decks |
| Competitive | Deck Competitiveness Score | >3.5/5 avg |
| Competitive | Event-Ready Builds | Track adoption |
| Competitive | Win Rate Improvement | Track correlation |
| Engagement | Multi-Format Usage | >30% |
| Technical | Collection Sync Time | <500ms |

---

## Files Created/Modified

| File | Action | Location |
|------|--------|----------|
| product-scope-revised.md | Created | `outputs/orc/2026/02/07/131513-ec715559/02-product/` |
| revision-summary.md | Created | `outputs/orc/2026/02/07/131513-ec715559/01-research/` |

---

## Source Document

Based on: `outputs/orc/2026/02/07/122148-4f3cc411/02-product/product-scope.md` (v1.0)

---

## Implementation Impact

### Schema Changes Required

Added to technical constraints:
- `format_context` field in card_synergies table
- `format` field on decks table
- New `collection_format_coverage` table for caching

### API Changes Required

New endpoints proposed:
- `collections.getFormatCoverage()`
- `collections.getAllFormatCoverage()`
- `decks.getBuildableDecks()`
- `collections.getRecentImpact()`

### UI Changes Required

- Format selector in deck builder
- "Build from collection" as primary flow
- Multi-format dashboard
- Progressive improvement notifications

---

## Next Steps

1. Engineering review of revised scope
2. Technical feasibility assessment for multi-format synergy scoring
3. Schema migration planning
4. API design detailed specification
5. UI/UX mockups for collection-first workflow
