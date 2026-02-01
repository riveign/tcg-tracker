# TCG Collection Tracker - Web App

The frontend application for TCG Collection Tracker, built with React, TypeScript, and Vite.

## Features

- **Collections Management**: Create and manage multiple card collections
- **OCR Scanning**: Add cards to your collection using camera or image upload
- **Complete View**: Aggregated view of all cards across collections
- **Deck Builder**: Create and manage decks with statistics

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom cyber-minimal theme
- **Component Library**: shadcn/ui + Radix UI
- **State Management**: Zustand
- **Data Fetching**: TanStack Query + tRPC
- **Forms**: React Hook Form + Zod
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Setup

### Prerequisites

- Bun (recommended) or Node.js 20+
- Backend API running on http://localhost:3000

### Installation

1. Install dependencies:

```bash
bun install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Update `.env` if your backend runs on a different URL:

```env
VITE_API_URL=http://localhost:3000
```

### Development

Start the development server:

```bash
bun run dev
```

The app will be available at http://localhost:5173

### Build

Build for production:

```bash
bun run build
```

Preview production build:

```bash
bun run preview
```

## Project Structure

```
apps/web/
├── src/
│   ├── components/
│   │   ├── layout/          # Shell, BottomNav
│   │   └── ui/              # shadcn/ui components
│   ├── contexts/            # React contexts (Auth)
│   ├── lib/                 # Utilities (tRPC, auth, utils)
│   ├── pages/               # Route pages
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json
```

## Design System

### Color Palette (Cyber-Minimal Theme)

- **Background**: `#0A0E14` (Deep space gray)
- **Surface**: `#151922` (Elevated dark)
- **Accent Cyan**: `#5ECBF5` (Actions, primary buttons)
- **Accent Lavender**: `#B497BD` (Premium features)
- **Success**: `#AADBC8` (Completed states)
- **Text Primary**: `#E6EDF3` (Cool white)
- **Text Secondary**: `#8B949E` (Muted gray)

### Typography

- **Sans**: Inter (body text)
- **Display**: Space Grotesk (headings)
- **Mono**: JetBrains Mono (code)

### Navigation

Bottom tab bar with 4 primary tabs:
1. **Collections** - Browse/manage collections
2. **Scan** - Camera OCR for adding cards
3. **Complete** - Aggregated view
4. **Build** - Deck builder

## Authentication

Internal JWT-based authentication (no Clerk):

- Token stored in `localStorage`
- Auth state managed with Zustand
- Protected routes redirect to `/login`
- Public routes redirect to `/collections` when authenticated

## API Integration

tRPC client configured to connect to backend API:

- Base URL: `VITE_API_URL` environment variable
- Auth token automatically included in requests
- Type-safe API calls with full TypeScript support

## Development Notes

### Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Update bottom navigation if needed in `src/components/layout/BottomNav.tsx`

### Adding shadcn/ui Components

Components are manually included. To add more:

1. Copy component code from [shadcn/ui](https://ui.shadcn.com/)
2. Place in `src/components/ui/`
3. Ensure dependencies are in `package.json`

### Path Aliases

Use `@/` prefix for absolute imports:

```typescript
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { trpc } from '@/lib/trpc'
```

## TODO

- [ ] Connect login/signup to backend API
- [ ] Implement collections CRUD operations
- [ ] Add OCR scanning with Tesseract.js + OpenCV.js
- [ ] Implement card search/filtering
- [ ] Add deck builder functionality
- [ ] Implement animations with Framer Motion
- [ ] Add loading states and error handling
- [ ] PWA setup for offline support

## License

MIT
