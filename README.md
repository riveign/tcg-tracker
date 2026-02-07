# TCG Collection Tracker

A mobile-first single-page application for tracking Magic: The Gathering card collections with advanced search, filtering, and deck building capabilities.

## 🎯 Project Vision

Create a "snappy, techy, pristine collection" tracker that:
- Organizes multiple collections with aggregated views
- Provides powerful card search with advanced filtering
- Enables deck-building tools with MTG Arena-style filtering
- Supports collaborative collection management
- Extends to support other TCGs in the future

## 📚 Documentation

**Start Here:**
- **[QUICK_START.md](./QUICK_START.md)** - Get started in 5 seconds
- **[HANDOVER.md](./HANDOVER.md)** - Complete project documentation and next steps

**Planning & Research:**
- **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** - Original implementation plan and tech stack
- **[schema.sql](./schema.sql)** - PostgreSQL database schema
- **[docs/MTG_DATA_MODEL.md](./docs/MTG_DATA_MODEL.md)** - Card modeling and keyword extraction research
- **[docs/OCR_RESEARCH.md](./docs/OCR_RESEARCH.md)** - OCR technology evaluation and recommendations
- **[docs/UI_UX_DESIGN.md](./docs/UI_UX_DESIGN.md)** - UI/UX wireframes and design system

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18+ with TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui + Radix UI
- **Animation**: Framer Motion + View Transitions API
- **State**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js 20+ (or Bun)
- **Framework**: Hono + tRPC
- **Database**: PostgreSQL 16+ with Drizzle ORM
- **Auth**: Clerk

### OCR & Data
- **OCR**: Tesseract.js + OpenCV.js (client-side)
- **Card API**: Scryfall API
- **Image Processing**: Client-side preprocessing

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway or Render
- **Database**: Neon (serverless PostgreSQL)

## 🚀 Quick Start

### Prerequisites
- Bun (package manager)
- PostgreSQL 16+
- Git

### Development
```bash
cd /home/mantis/Development/tcg-tracker

# Terminal 1 - Backend
bun run dev:api

# Terminal 2 - Frontend
bun run dev:web
```

**URLs:**
- Frontend: http://localhost:5174
- Backend: http://localhost:3001

See [QUICK_START.md](./QUICK_START.md) for full setup and testing instructions.

## 📋 Project Status

**Current Phase**: Deck Recommendation System (Phase 4) 🚧

**Completed:**
- ✅ Monorepo structure with Turborepo
- ✅ Frontend (React + Vite + TypeScript + Tailwind + shadcn/ui)
- ✅ Backend (Hono + tRPC + Drizzle ORM)
- ✅ PostgreSQL database with soft deletes
- ✅ User authentication with Clerk
- ✅ Collection management (create, update, delete)
- ✅ Card search integration with Scryfall API
- ✅ Add/remove cards from collections
- ✅ Card quantity management with optimistic updates
- ✅ Complete collection view (aggregated across all collections)
- ✅ Advanced filtering (colors, types, keywords, rarity, CMC)
- ✅ Collection search (within individual or complete collections)
- ✅ MTG Deck Recommendation System backend (Phase 1-3)
- ✅ React Query hooks for recommendation API (Phase 4.1)

**In Progress (Phase 4 - Frontend Integration):**
- ✅ Hooks foundation with 6 API endpoints
- ⏳ Card suggestions UI component
- ⏳ Buildable decks explorer
- ⏳ Format coverage dashboard

**Next Steps:**
1. Complete Phase 4 frontend components
2. Add mana curve visualization to deck builder
3. Implement deck statistics and validation

See [HANDOVER.md](./HANDOVER.md) for complete implementation details and next steps.

## 🎨 Design Aesthetic

**Cyber-Minimal Theme:**
- Deep space gray backgrounds (#0A0E14)
- Neon cyan accents (#5ECBF5)
- Digital lavender highlights (#B497BD)
- Clean, modern typography (Inter + Space Grotesk)
- Smooth animations and transitions

## 🗂️ Project Structure

```
tcg-tracker/
├── apps/
│   ├── web/                      # Frontend (React + Vite)
│   │   ├── src/
│   │   │   ├── components/       # UI components
│   │   │   │   ├── cards/        # Card-related components
│   │   │   │   ├── layout/       # Layout components
│   │   │   │   └── ui/           # shadcn/ui components
│   │   │   ├── pages/            # Route pages
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   │   └── useRecommendations.ts # Recommendation system hooks
│   │   │   └── lib/              # Utilities (tRPC client)
│   │   └── package.json
│   └── api/                      # Backend (Hono + tRPC)
│       ├── src/
│       │   ├── router/           # tRPC routers
│       │   │   ├── auth.ts       # Authentication
│       │   │   ├── cards.ts      # Card search
│       │   │   ├── collections.ts # Collection management
│       │   │   ├── complete.ts   # Aggregated view
│       │   │   └── recommendations.ts # MTG deck recommendations
│       │   └── lib/              # Scryfall API integration
│       │       └── recommendation/ # Recommendation system
│       └── package.json
├── packages/
│   └── db/                       # Database (Drizzle ORM)
│       ├── src/schema/           # Database schema
│       └── drizzle.config.ts
├── docs/                         # Research and documentation
├── schema.sql                    # PostgreSQL schema
├── HANDOVER.md                   # Complete project documentation
├── QUICK_START.md                # Quick reference guide
└── PROJECT_PLAN.md               # Original implementation plan
```

## 🎯 Implemented Features

**Authentication:**
- ✅ User signup and login with Clerk
- ✅ Protected routes and API endpoints

**Collections:**
- ✅ Create, edit, delete collections
- ✅ Add cards from Scryfall search
- ✅ Update card quantities with optimistic updates
- ✅ Remove cards from collections
- ✅ View collection statistics

**Card Search:**
- ✅ Global card search with Scryfall API
- ✅ Advanced filtering (colors, types, keywords, rarity, CMC)
- ✅ Search within individual collections
- ✅ Search across complete collection

**Complete Collection View:**
- ✅ Aggregated view of all cards across collections
- ✅ Collection breakdown per card
- ✅ Statistics (total cards, unique cards, color/rarity distribution)
- ✅ Advanced filtering and search

**Card Details:**
- ✅ Full card modal with image, stats, legalities
- ✅ Mana cost, power/toughness, oracle text
- ✅ Flavor text and artist information

**Deck Recommendation System (Backend):**
- ✅ Multi-format card suggestions (Standard, Modern, Commander, Brawl)
- ✅ Buildable deck discovery from collection
- ✅ Format coverage analysis
- ✅ Multi-format deck comparison
- ✅ Archetype detection
- ✅ Gap analysis with category breakdown
- ✅ React Query hooks for all recommendation endpoints

## 🚧 Planned Features

**Next Up (Phase 4 - Frontend Integration):**
- [ ] Card suggestions UI component with category filtering
- [ ] Buildable decks explorer with format selection
- [ ] Format coverage dashboard with viability indicators
- [ ] Multi-format comparison view
- [ ] Deck archetype display
- [ ] Gap analysis UI with recommendation cards

**Upcoming:**
- [ ] Deck builder with mana curve visualization
- [ ] Deck statistics and validation
- [ ] Add cards from collection to deck

**Future:**
- [ ] Card scanning with OCR
- [ ] Multi-user collections with roles
- [ ] Export to Moxfield/Archidekt
- [ ] Price tracking integration
- [ ] Support for Pokemon TCG, Yu-Gi-Oh
- [ ] Trading marketplace
- [ ] Social features (following, sharing)
- [ ] Advanced analytics and insights

## 📖 License

TBD

## 🤝 Contributing

This is currently a personal project. Contribution guidelines coming soon.

## 📞 Contact

TBD
