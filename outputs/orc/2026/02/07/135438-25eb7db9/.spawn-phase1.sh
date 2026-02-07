#!/bin/bash

# Phase 1: Core Engine with Format Adapters
# Implement the foundational recommendation system with Standard and Commander format support

TASK="Implement Phase 1 of the MTG Deck Recommendation System based on the technical design at outputs/orc/2026/02/07/131513-ec715559/03-technical/technical-design-revised.md

Your responsibilities:
1. Create the format adapter architecture with interface and factory
2. Implement StandardAdapter (60-card, 4-of rules)
3. Implement CommanderAdapter (singleton, color identity)
4. Create CollectionService for collection-first queries
5. Update/create SynergyScorer with format-agnostic scoring
6. Create database schema migration for format support
7. Update the recommendations router with collection-first API

Deliverables (see section 7.2.1 in technical design):
- apps/api/src/lib/recommendation/format-adapters/types.ts
- apps/api/src/lib/recommendation/format-adapters/standard.ts
- apps/api/src/lib/recommendation/format-adapters/commander.ts
- apps/api/src/lib/recommendation/format-adapters/factory.ts
- apps/api/src/lib/recommendation/collection-service.ts
- apps/api/src/lib/recommendation/synergy-scorer.ts
- apps/api/src/router/recommendations.ts (update)
- packages/db/drizzle/XXXX_add_format_support.sql

IMPORTANT:
- Follow all acceptance criteria in section 7.2.2
- Use handlePromise for all async operations
- Follow TypeScript best practices from PROJECT_AGENTS.md
- Collection-first queries: filter by owned cards FIRST, then score
- Write unit tests for all adapters (>80% coverage)

OUTPUT:
Save summary to outputs/orc/2026/02/07/135438-25eb7db9/phase1-core-engine/summary.md

COMMIT:
After implementation, create a commit with message:
feat(recommendations): implement Phase 1 - core engine with format adapters

Implemented collection-first recommendation system with format adapter
architecture. Supports Standard (60-card, 4-of) and Commander (singleton,
color identity) formats.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo "$TASK"
