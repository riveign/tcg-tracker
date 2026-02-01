# TCG Collection Tracker - Project Plan

## Overview

A mobile-first single-page application for tracking Magic: The Gathering card collections with OCR scanning, deck building, and multi-user collaboration. Designed with a "snappy, techy, pristine collection" aesthetic.

---

## Tech Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Component Library**: shadcn/ui + Radix UI
- **Animation**: Framer Motion + View Transitions API
- **Icons**: Lucide React
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v7 or TanStack Router

### Backend
- **Runtime**: Node.js 20+ (or Bun for performance)
- **Framework**: Hono or Express
- **Database**: PostgreSQL 16+
- **ORM**: Drizzle ORM
- **Authentication**: Clerk or NextAuth.js
- **API**: tRPC (type-safe) or REST

### OCR & Image Processing
- **OCR Engine**: Tesseract.js (client-side, free)
- **Image Processing**: OpenCV.js
- **Card Data API**: Scryfall API

### Infrastructure
- **Hosting**: Vercel (frontend) + Railway/Render (backend)
- **Database**: Neon or Supabase (PostgreSQL)
- **File Storage**: Cloudflare R2 or AWS S3 (for user uploads)
- **CDN**: Cloudflare

---

## Core Features (v1 MVP)

### 1. User Authentication
- Email/password or OAuth (Google, GitHub)
- Session management
- Profile management

### 2. Card Scanning (OCR)
- Mobile camera capture
- Client-side OCR with Tesseract.js
- OpenCV.js preprocessing (contrast, crop, threshold)
- Scryfall fuzzy name matching
- Manual fallback for failed scans

### 3. Collection Management
- Create multiple named collections
- Add/remove cards with quantity tracking
- Edit collection metadata (name, description)
- Soft delete support

### 4. Complete Collection View
- Aggregated view across all user collections
- Total quantity per card across collections
- Grouped by set, color, type, rarity

### 5. Card Filtering & Search
- Filter by:
  - Color/Color Identity
  - Card Type (Creature, Instant, Sorcery, etc.)
  - Mana Value (CMC)
  - Keywords (Flying, Trample, etc.)
  - Rarity
  - Set
- Full-text search on card names
- Saved filter presets

### 6. Deck Builder
- Create decks from collection
- Deck vs Sideboard sections
- Card quantity management
- Deck statistics:
  - Total cards
  - Average CMC
  - Mana curve chart
  - Color distribution
- Export to Moxfield/Archidekt format

### 7. Multi-User Collections
- Invite collaborators to collections
- Role-based access (Owner, Contributor, Viewer)
- Shared collection updates in real-time

---

## Database Schema

See `schema.sql` for full PostgreSQL schema.

**Core Tables:**
- `users` - User accounts
- `cards` - MTG card master data (from Scryfall)
- `collections` - User-owned collections
- `collection_members` - Multi-user collaboration
- `collection_cards` - Junction table (collection + card + quantity)

**Key Features:**
- JSONB fields for extensibility (`game_data`, `card_metadata`)
- GIN indexes on arrays (types, keywords, colors)
- Soft deletes throughout
- Auto-updating timestamps

---

## Data Model

### Card Structure (Scryfall-based)

```typescript
interface Card {
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
  rarity: "common" | "uncommon" | "rare" | "mythic";

  // Images
  image_uris: {
    small: string;
    normal: string;
    large: string;
    png: string;
  };

  // Extensibility
  game_data: Record<string, any>; // MTG-specific (legalities, prices)
}
```

---

## UI/UX Design

### Visual Theme: "Cyber-Minimal"

**Color Palette:**
```css
--bg-primary: #0A0E14;      /* Deep space gray */
--bg-surface: #151922;      /* Elevated dark */
--accent-cyan: #5ECBF5;     /* Neon cyan - actions */
--accent-lavender: #B497BD; /* Digital lavender - premium */
--success: #AADBC8;         /* Mint pixel - completed */
--text-primary: #E6EDF3;    /* Cool white */
--text-secondary: #8B949E;  /* Muted gray */
```

**Typography:**
- Primary: Inter or Geist Sans
- Display: Space Grotesk
- Mono: JetBrains Mono

### Navigation

**Bottom Tab Bar (4 primary tabs):**
1. Collections - Browse/manage collections
2. Scan - Camera OCR for adding cards
3. Complete - Aggregated view
4. Build - Deck builder

### Page Transitions

- Between tabs: Horizontal slide (200-300ms)
- Card grid → Detail: Morph animation (View Transitions API)
- Modals: Slide up from bottom
- Collection switch: Crossfade (150ms)

### Core Views

1. **Collection View** - Card grid with filters, pull-to-refresh
2. **Card Scanner** - Full-screen camera with auto-detect overlay
3. **Complete Collection** - Grouped by set with progress bars
4. **Deck Builder** - Deck list + add cards modal
5. **Collection Management** - Collection cards with stats

See UI/UX research document for detailed wireframes.

---

## OCR Implementation

### Recommended Approach (v1)

**Client-Side OCR Pipeline:**

```
Camera Capture → OpenCV.js Preprocessing → Tesseract.js → Scryfall Fuzzy Match
```

**Preprocessing Steps:**
1. Crop to card name region (~8% from left, ~55% from top, 84% width, 8% height)
2. Grayscale conversion
3. CLAHE contrast enhancement
4. Binarization (Otsu threshold)

**OCR Configuration:**
```javascript
await Tesseract.recognize(canvas, 'eng', {
  tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\' ',
  psm: 7 // Single text line
});
```

**Scryfall Fuzzy Matching:**
```
GET https://api.scryfall.com/cards/named?fuzzy={ocr_result}
```

**Expected Accuracy:** 70-85% with good lighting
**Fallback:** Manual name entry with autocomplete

### Future Enhancements (v2+)

- Google Cloud Vision API for 95%+ accuracy
- Batch scanning (multiple cards in one photo)
- Set symbol recognition
- Visual similarity search (image matching)

---

## API Design

### tRPC Routes (Type-Safe)

```typescript
// Collections
collections.list          // Get user's collections
collections.create        // Create new collection
collections.update        // Update collection metadata
collections.delete        // Soft delete collection
collections.addMember     // Add collaborator
collections.removeMember  // Remove collaborator

// Cards
cards.search              // Search Scryfall API
cards.getByName           // Fuzzy match by name (OCR)
cards.getById             // Get specific card

// Collection Cards
collectionCards.add       // Add card to collection
collectionCards.update    // Update quantity/metadata
collectionCards.remove    // Remove from collection
collectionCards.list      // List cards in collection

// Complete Collection
completeCollection.get    // Get aggregated view

// Deck Builder
decks.create              // Create deck
decks.update              // Update deck
decks.addCard             // Add card to deck
decks.removeCard          // Remove card from deck
decks.export              // Export to Moxfield/Archidekt
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up monorepo (Turborepo or Nx)
- [ ] Initialize frontend (Vite + React + TypeScript)
- [ ] Initialize backend (Hono + Drizzle + tRPC)
- [ ] Set up PostgreSQL database (Neon)
- [ ] Run schema.sql to create tables
- [ ] Configure Tailwind CSS + shadcn/ui
- [ ] Set up authentication (Clerk)

### Phase 2: Core Features (Week 2-3)
- [ ] Implement collection CRUD
- [ ] Scryfall API integration
- [ ] Card display components (grid, detail view)
- [ ] Basic filtering (color, type, rarity)
- [ ] Add cards to collection manually

### Phase 3: OCR Scanning (Week 4)
- [ ] Camera capture UI
- [ ] OpenCV.js preprocessing
- [ ] Tesseract.js integration
- [ ] Scryfall fuzzy matching
- [ ] Confirmation flow

### Phase 4: Advanced Features (Week 5-6)
- [ ] Complete collection view
- [ ] Multi-user collections
- [ ] Deck builder
- [ ] Mana curve visualization
- [ ] Export functionality

### Phase 5: Polish & Optimization (Week 7-8)
- [ ] Animations (Framer Motion)
- [ ] Loading states (skeletons)
- [ ] Error handling
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Performance optimization
- [ ] PWA setup (service worker, offline)

---

## Performance Targets

- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Lighthouse Performance: >90
- Bundle size: <200KB initial load

**Optimization Strategies:**
- Route-based code splitting
- Image lazy loading with blur placeholders
- Virtual scrolling for large card grids (>500 cards)
- TanStack Query caching
- Service worker for offline support

---

## Deployment

### Frontend (Vercel)
- Automatic deploys from Git
- Edge functions for SSR/API routes
- CDN for static assets

### Backend (Railway or Render)
- Docker container deployment
- Auto-scaling
- Health checks

### Database (Neon)
- Serverless PostgreSQL
- Automatic backups
- Connection pooling

---

## Extensibility (Future TCG Support)

The database schema is designed for extensibility:

**Current (v1): MTG-only**
```typescript
interface Card {
  game: "mtg";
  // ... MTG-specific fields
}
```

**Future (v2): Multi-TCG**
```typescript
interface BaseCard {
  id: string;
  game: "mtg" | "pokemon" | "yugioh";
  name: string;
  types: string[];
  keywords: string[];
  game_data: MTGData | PokemonData | YuGiOhData; // JSONB
}
```

**Migration Path:**
1. Add `game` field (default "mtg")
2. Move MTG-specific fields into `game_data` JSONB
3. Create type guards for game-specific logic
4. Update filters to handle multi-game data

---

## Resources

### APIs
- [Scryfall API](https://scryfall.com/docs/api) - MTG card data
- [MTGJSON](https://mtgjson.com/) - Bulk data downloads

### Libraries
- [Tesseract.js](https://github.com/naptha/tesseract.js) - OCR
- [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html) - Image preprocessing
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM
- [tRPC](https://trpc.io/) - Type-safe API

### References
- [MTGScan](https://github.com/fortierq/mtgscan) - OCR scanner reference
- [Moxfield](https://moxfield.com/) - Deck builder UX
- [Archidekt](https://archidekt.com/) - Visual deck builder

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Set up development environment** - Install tools, create repos
3. **Initialize project** - Run setup scripts from Phase 1
4. **Start with Collection Management** - Core CRUD operations
5. **Iterate incrementally** - Add features one by one, test thoroughly

---

## Notes

- Prioritize mobile experience (primary use case)
- Keep v1 simple - focus on core collection tracking + OCR
- Defer advanced features (pricing, trading, social) to v2
- Maintain clean architecture for future TCG extensibility
- Regular user testing with real MTG cards
