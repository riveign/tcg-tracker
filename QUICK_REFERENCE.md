# Quick Reference Guide

Essential information at a glance for the TCG Collection Tracker project.

## 📁 Project Structure

```
tcg-tracker/
├── README.md              # Project overview
├── PROJECT_PLAN.md        # Complete implementation plan
├── NEXT_STEPS.md          # What to do next
├── schema.sql             # PostgreSQL database schema
├── docs/
│   ├── MTG_DATA_MODEL.md  # Card modeling research
│   ├── OCR_RESEARCH.md    # OCR technology evaluation
│   └── UI_UX_DESIGN.md    # Design system & wireframes
└── (apps/ and packages/ - to be created)
```

## 🛠️ Tech Stack Decisions

| Component | Choice | Why |
|-----------|--------|-----|
| Frontend Framework | React + TypeScript + Vite | Modern, fast, type-safe |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, accessible components |
| Animation | Framer Motion | Layout animations, gestures |
| State Management | Zustand | Minimal boilerplate |
| Data Fetching | TanStack Query | Caching, optimistic updates |
| Backend Framework | Hono + tRPC | Fast, type-safe API |
| Database | PostgreSQL + Drizzle ORM | Relational, JSONB for extensibility |
| Auth | Clerk | Drop-in authentication |
| OCR | Tesseract.js + OpenCV.js | Client-side, free, privacy-first |
| Card Data | Scryfall API | Best MTG card data source |
| Hosting | Vercel (FE) + Railway (BE) | Easy deployment, good DX |

## 🎨 Design Tokens

```css
/* Colors */
--bg-primary: #0A0E14;
--bg-surface: #151922;
--accent-cyan: #5ECBF5;
--accent-lavender: #B497BD;
--success: #AADBC8;
--text-primary: #E6EDF3;
--text-secondary: #8B949E;

/* Typography */
font-primary: 'Inter' or 'Geist Sans';
font-display: 'Space Grotesk';
font-mono: 'JetBrains Mono';

/* Spacing */
radius: 0.5rem (8px);
touch-target: 44px minimum;
```

## 🗄️ Database Schema Overview

**Core Tables:**
- `users` - User accounts
- `cards` - MTG card master data (from Scryfall)
- `collections` - User-owned collections
- `collection_members` - Multi-user collaboration
- `collection_cards` - Junction table (collection + card + quantity)

**Views:**
- `user_complete_collection` - Aggregated cards across all collections
- `collection_summary` - Quick stats per collection

## 🔑 Key API Endpoints (Scryfall)

```
# Fuzzy name search (for OCR)
GET https://api.scryfall.com/cards/named?fuzzy={name}

# Advanced search
GET https://api.scryfall.com/cards/search?q={query}

# All keywords
GET https://api.scryfall.com/catalog/keyword-abilities

# Bulk data download
GET https://api.scryfall.com/bulk-data
```

## 📱 Core Features (v1 MVP)

1. ✅ User authentication (Clerk)
2. ✅ Collection management (CRUD)
3. ✅ Card scanning with OCR (Tesseract.js)
4. ✅ Multi-user collections
5. ✅ Complete collection aggregation
6. ✅ Advanced filtering (color, type, CMC, keywords)
7. ✅ Deck builder with mana curve
8. ✅ Export to Moxfield/Archidekt

## 🎯 Performance Targets

- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Lighthouse Performance: >90
- Bundle size: <200KB initial

## 📊 Implementation Phases

### Week 1: Foundation
- Monorepo setup
- Database connection
- Authentication
- Basic UI shell

### Week 2-3: Core Features
- Collection CRUD
- Scryfall integration
- Card display & filtering
- Add cards manually

### Week 4: OCR Scanning
- Camera capture UI
- Image preprocessing
- OCR integration
- Fuzzy matching

### Week 5-6: Advanced Features
- Complete collection view
- Multi-user collections
- Deck builder
- Export functionality

### Week 7-8: Polish
- Animations
- Loading states
- Error handling
- Accessibility
- PWA setup

## 🧪 Testing Strategy

**Test with:**
- Standard frame cards
- Modern frame cards
- Foils
- Poor lighting conditions
- Angled photos

**Expected OCR Accuracy:**
- 70-85% with good lighting (Tesseract.js)
- 95%+ with cloud OCR (future enhancement)

## 🚦 Getting Started Commands

```bash
# Navigate to project
cd /home/mantis/Development/tcg-tracker

# Review documentation
cat PROJECT_PLAN.md
cat NEXT_STEPS.md

# Follow setup steps from NEXT_STEPS.md
# Step 1: Review docs
# Step 2: Set up dev environment
# Step 3: Initialize monorepo
# Step 4-6: Initialize apps
# Step 7: Set up database
# Step 8: Run schema
# Step 9: Configure env vars
# Step 10: Start development
```

## 🔗 Essential Links

**Documentation:**
- [Scryfall API Docs](https://scryfall.com/docs/api)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [tRPC Docs](https://trpc.io/)

**Tools:**
- [Neon (Database)](https://neon.tech/)
- [Clerk (Auth)](https://clerk.com/)
- [Vercel (Hosting)](https://vercel.com/)

**Reference:**
- [MTGScan GitHub](https://github.com/fortierq/mtgscan) - OCR reference implementation
- [Moxfield](https://moxfield.com/) - Deck builder UX reference

## 💡 Development Tips

1. **One feature at a time** - Don't try to build everything simultaneously
2. **Test continuously** - Test each component as you build
3. **Refer to docs** - Use the research in docs/ when making decisions
4. **Keep it simple** - Avoid over-engineering, focus on v1 core features
5. **Mobile-first** - Test on mobile regularly (primary use case)

## 🐛 Common Issues & Solutions

**Issue**: Database connection fails
**Solution**: Check DATABASE_URL in .env, ensure Neon project is active

**Issue**: Tesseract.js is slow
**Solution**: Ensure proper image preprocessing, crop to name region only

**Issue**: Scryfall rate limiting
**Solution**: Implement request caching, respect 10 req/sec limit

**Issue**: Build size too large
**Solution**: Use route-based code splitting, lazy load components

## 📞 When You Need Help

Provide context:
1. What you're trying to accomplish
2. What you've already tried
3. Specific error messages or behavior
4. Relevant code snippets

Example:
> "I'm implementing the OCR scanner. I've set up OpenCV.js preprocessing and Tesseract.js, but accuracy is only 40%. Here's my current preprocessing code: [code]. How can I improve it?"

## 🎉 Success Milestones

- [ ] Week 1: Can create and view collections
- [ ] Week 2: Can manually add cards from Scryfall
- [ ] Week 3: Can filter cards by color/type/CMC
- [ ] Week 4: Can scan cards with phone camera
- [ ] Week 5: Can build decks from collection
- [ ] Week 6: Can share collections with friends
- [ ] Week 7: App feels snappy with smooth animations
- [ ] Week 8: Ready to deploy v1!

---

**Remember**: This is a v1 MVP. Ship it, then iterate based on real usage! 🚀
