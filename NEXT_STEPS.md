# Next Steps - TCG Collection Tracker

This document outlines the next steps to begin implementation after the planning phase.

## 📋 What's Been Done

✅ Complete project planning and research
✅ Database schema design (`schema.sql`)
✅ MTG card data model research
✅ OCR technology evaluation
✅ UI/UX design and wireframes
✅ Tech stack selection
✅ Git repository initialized

## 🎯 Current Status

**Phase**: Planning Complete
**Next Phase**: Foundation Setup (Week 1)

## 🚀 Immediate Next Steps

### Step 1: Review Documentation

Before starting implementation, review these key documents:

1. **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** - Full implementation plan and roadmap
2. **[schema.sql](./schema.sql)** - Database schema
3. **[docs/](./docs/)** - Research documents

### Step 2: Set Up Development Environment

#### Install Prerequisites

```bash
# Ensure you have Node.js 20+ or Bun installed
node --version  # Should be v20 or higher

# Install pnpm (recommended package manager)
npm install -g pnpm
```

#### Create Project Structure

The project will use a monorepo structure:

```
tcg-tracker/
├── apps/
│   ├── web/          # Frontend (React + Vite)
│   └── api/          # Backend (Hono + tRPC)
├── packages/
│   ├── db/           # Database schema + Drizzle ORM
│   ├── ui/           # Shared UI components
│   └── types/        # Shared TypeScript types
├── docs/             # ✅ Already created
├── schema.sql        # ✅ Already created
└── PROJECT_PLAN.md   # ✅ Already created
```

### Step 3: Initialize Monorepo

Choose one of these approaches:

#### Option A: Turborepo (Recommended)

```bash
cd /home/mantis/Development/tcg-tracker

# Initialize Turborepo
npx create-turbo@latest .
# Choose: pnpm, Yes to TypeScript, Yes to ESLint

# Create apps and packages directories
mkdir -p apps/web apps/api packages/db packages/ui packages/types
```

#### Option B: Manual Setup with pnpm Workspaces

```bash
cd /home/mantis/Development/tcg-tracker

# Create package.json for workspace
cat > package.json << 'EOF'
{
  "name": "tcg-tracker",
  "version": "0.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "pnpm --parallel dev",
    "build": "pnpm --parallel build",
    "lint": "pnpm --parallel lint"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.0"
  }
}
EOF

# Create workspace structure
mkdir -p apps/web apps/api packages/db packages/ui packages/types
```

### Step 4: Initialize Frontend (React + Vite)

```bash
cd apps

# Create Vite React TypeScript app
pnpm create vite web --template react-ts

cd web

# Install dependencies
pnpm install

# Install Tailwind CSS
pnpm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install shadcn/ui
pnpm dlx shadcn@latest init
# Choose: New York style, Zinc color, CSS variables: yes

# Install core dependencies
pnpm install framer-motion lucide-react zustand @tanstack/react-query react-hook-form zod
```

### Step 5: Initialize Backend (Hono + tRPC)

```bash
cd ../api

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@tcg-tracker/api",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts",
    "start": "node dist/index.js"
  }
}
EOF

# Install dependencies
pnpm install hono @hono/node-server @trpc/server @trpc/client zod

# Install dev dependencies
pnpm install -D tsx tsup typescript @types/node
```

### Step 6: Set Up Database Package (Drizzle ORM)

```bash
cd ../../packages/db

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@tcg-tracker/db",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:generate": "drizzle-kit generate"
  }
}
EOF

# Install dependencies
pnpm install drizzle-orm @neondatabase/serverless
pnpm install -D drizzle-kit
```

### Step 7: Set Up PostgreSQL Database

#### Option A: Neon (Recommended - Serverless)

1. Go to https://neon.tech
2. Create a free account
3. Create a new project called "tcg-tracker"
4. Copy the connection string

#### Option B: Local PostgreSQL

```bash
# Install PostgreSQL (if not already installed)
# On Ubuntu/Debian:
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb tcg_tracker
```

### Step 8: Run Database Schema

```bash
# Connect to your database and run schema.sql
psql <your-connection-string> -f schema.sql

# OR if using local PostgreSQL:
psql -U postgres -d tcg_tracker -f schema.sql
```

### Step 9: Set Up Environment Variables

Create `.env.local` in each app:

**apps/web/.env.local:**
```env
VITE_API_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-key>
```

**apps/api/.env.local:**
```env
DATABASE_URL=<your-neon-connection-string>
CLERK_SECRET_KEY=<your-clerk-secret>
PORT=3000
```

### Step 10: Start Development

```bash
# From root directory
cd /home/mantis/Development/tcg-tracker

# Start all services
pnpm dev

# Frontend will be at: http://localhost:5173
# Backend will be at: http://localhost:3000
```

## 📝 Implementation Order (Week 1)

Once setup is complete, follow this order:

### Day 1-2: Foundation
- [ ] Set up tRPC router structure
- [ ] Create Drizzle schema from SQL
- [ ] Test database connection
- [ ] Set up Clerk authentication

### Day 3-4: Basic UI
- [ ] Create app shell with bottom navigation
- [ ] Set up routing (React Router or TanStack Router)
- [ ] Create basic layout components
- [ ] Implement theme system (Tailwind config)

### Day 5: First Feature
- [ ] Create collections table CRUD operations
- [ ] Build Collections list view
- [ ] Build "Create Collection" form
- [ ] Test end-to-end flow

## 🔧 Recommended VS Code Extensions

If using VS Code, install these extensions:

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **PostCSS Language Support** - CSS support
- **Drizzle ORM** - Database schema autocomplete
- **Error Lens** - Inline error display

## 📚 Key Resources

### Documentation
- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Hono](https://hono.dev/)
- [tRPC](https://trpc.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Clerk](https://clerk.com/docs)
- [Scryfall API](https://scryfall.com/docs/api)

### Community
- [MTGScan GitHub](https://github.com/fortierq/mtgscan) - OCR reference
- [Scryfall Discord](https://scryfall.com/discord) - API support

## 🎯 Success Criteria for Week 1

By end of Week 1, you should have:

- ✅ Monorepo set up with working dev server
- ✅ Database connected and schema deployed
- ✅ Authentication working (login/signup)
- ✅ Basic UI shell with navigation
- ✅ One complete feature (collections CRUD)

## 💡 Tips

1. **Start Small**: Don't try to build everything at once. Focus on one feature at a time.
2. **Test as You Go**: Test each component/API route as you build it.
3. **Use the Research**: Refer back to the docs/ folder when making decisions.
4. **Follow the Plan**: The PROJECT_PLAN.md has a detailed week-by-week breakdown.
5. **Keep It Simple**: Resist the urge to over-engineer. V1 is about core functionality.

## 📞 When You Return

When starting a new chat session, say:

> "I'm ready to start implementing the TCG Collection Tracker. I've reviewed the planning docs. Let's begin with [Step X from NEXT_STEPS.md]."

Or if you need help with a specific part:

> "I'm working on [specific feature] from the TCG Collection Tracker. Here's where I'm at: [context]. I need help with [specific question]."

## 🎉 Ready to Build!

You have everything you need to start building. The planning is complete, the architecture is solid, and the path forward is clear. Let's build something awesome! 🚀
