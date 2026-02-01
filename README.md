# TCG Collection Tracker

A mobile-first single-page application for tracking Magic: The Gathering card collections with OCR scanning, deck building, and multi-user collaboration.

## 🎯 Project Vision

Create a "snappy, techy, pristine collection" tracker that:
- Scans cards using phone camera + OCR
- Organizes multiple collections with aggregated views
- Enables collaborative collection management
- Provides powerful deck-building tools with MTG Arena-style filtering
- Extends to support other TCGs in the future

## 📚 Documentation

- **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** - Complete implementation plan, tech stack, and roadmap
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
- Node.js 20+ or Bun
- PostgreSQL 16+ (or Neon account)
- Git

### Setup (Coming Soon)
```bash
# Clone the repository
git clone <repo-url>
cd tcg-tracker

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

## 📋 Project Status

**Current Phase**: Planning Complete ✅

**Next Steps**:
1. Set up monorepo structure (frontend + backend)
2. Initialize frontend with Vite + React + TypeScript
3. Initialize backend with Hono + Drizzle + tRPC
4. Set up PostgreSQL database and run schema
5. Configure Tailwind CSS + shadcn/ui
6. Implement authentication with Clerk

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the full 8-week implementation roadmap.

## 🎨 Design Aesthetic

**Cyber-Minimal Theme:**
- Deep space gray backgrounds (#0A0E14)
- Neon cyan accents (#5ECBF5)
- Digital lavender highlights (#B497BD)
- Clean, modern typography (Inter + Space Grotesk)
- Smooth animations and transitions

## 🗂️ Project Structure (Planned)

```
tcg-tracker/
├── apps/
│   ├── web/          # Frontend (React + Vite)
│   └── api/          # Backend (Hono + tRPC)
├── packages/
│   ├── db/           # Database schema + Drizzle ORM
│   ├── ui/           # Shared UI components
│   └── types/        # Shared TypeScript types
├── docs/             # Research and documentation
├── schema.sql        # PostgreSQL schema
└── PROJECT_PLAN.md   # Implementation plan
```

## 🎯 Core Features (v1 MVP)

- ✅ User authentication
- ✅ Collection management (CRUD)
- ✅ Card scanning with OCR
- ✅ Multi-user collections with roles
- ✅ Complete collection aggregation
- ✅ Advanced filtering (color, type, CMC, keywords)
- ✅ Deck builder with mana curve
- ✅ Export to Moxfield/Archidekt

## 🔮 Future Features (v2+)

- [ ] Support for Pokemon TCG, Yu-Gi-Oh
- [ ] Price tracking integration
- [ ] Trading marketplace
- [ ] Social features (following, sharing)
- [ ] Batch card scanning
- [ ] Advanced analytics and insights
- [ ] Collection value tracking

## 📖 License

TBD

## 🤝 Contributing

This is currently a personal project. Contribution guidelines coming soon.

## 📞 Contact

TBD
