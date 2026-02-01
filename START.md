# 🚀 How to Start TCG Collection Tracker

## Quick Start (One Command)

From the project root directory:

```bash
./start.sh
```

OR

```bash
bun run dev
```

Both commands do the same thing - start the API server and frontend!

---

## What Gets Started

When you run the startup command, two servers will start:

1. **API Server** - http://localhost:3001
   - Backend tRPC API
   - Handles database operations
   - Scryfall API integration

2. **Frontend** - http://localhost:5174
   - React web application
   - Your main interface

---

## First Time Setup

If this is your first time running the project:

### 1. Install Dependencies
```bash
bun install
```

### 2. Check Database
Make sure PostgreSQL is running and the database exists:
```bash
psql -U mantis -d tcg_tracker -c "SELECT 1;"
```

If you get an error, create the database:
```bash
createdb -U mantis tcg_tracker
```

### 3. Run Migrations
```bash
psql -U mantis -d tcg_tracker -f schema.sql
psql -U mantis -d tcg_tracker -f packages/db/drizzle/0001_add_decks.sql
```

### 4. Start the App
```bash
./start.sh
```

---

## Individual Commands

If you need to run servers separately:

### Start API Only
```bash
bun run dev:api
```

### Start Frontend Only
```bash
bun run dev:web
```

### Both in Parallel
```bash
bun run dev
```

---

## Stopping the Servers

Press `Ctrl + C` in the terminal where the servers are running.

---

## Troubleshooting

### Port Already in Use
If you get "port in use" errors:

**For API (port 3001):**
```bash
lsof -ti:3001 | xargs kill -9
```

**For Frontend (port 5174):**
```bash
lsof -ti:5174 | xargs kill -9
```

### Database Connection Error
- Make sure PostgreSQL is running: `systemctl status postgresql`
- Check database exists: `psql -U mantis -l | grep tcg_tracker`

### Build Errors
```bash
# Clean install
rm -rf node_modules apps/*/node_modules packages/*/node_modules
bun install
```

---

## URLs

Once started, access the application at:

- **Frontend:** http://localhost:5174
- **API Health Check:** http://localhost:3001/health

---

## Development Database Tools

```bash
# Open Drizzle Studio (database GUI)
bun run db:studio

# Push schema changes
bun run db:push

# Generate migrations
bun run db:generate
```

---

**Happy coding! 🎉**
