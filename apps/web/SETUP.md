# Web App Setup Guide

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Visit http://localhost:5173

## Installation Steps

### 1. Install Dependencies

Using Bun (recommended):
```bash
bun install
```

Using npm:
```bash
npm install
```

### 2. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` to configure your backend API URL:
```env
VITE_API_URL=http://localhost:3000
```

### 3. Start Development Server

```bash
bun run dev
```

The application will start on http://localhost:5173 with hot module replacement enabled.

## Available Scripts

- `bun run dev` - Start development server with HMR
- `bun run build` - Build for production (outputs to `dist/`)
- `bun run preview` - Preview production build locally
- `bun run lint` - Run ESLint to check code quality

## Prerequisites

### Required
- Node.js 20+ or Bun
- Backend API running (default: http://localhost:3000)

### Optional
- VS Code with recommended extensions:
  - ESLint
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

## Project Configuration

### TypeScript

TypeScript is configured with strict mode enabled. Path aliases are set up:

```typescript
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
```

### Tailwind CSS

Custom cyber-minimal theme configured with:
- Background: #0A0E14
- Surface: #151922
- Accent Cyan: #5ECBF5
- Accent Lavender: #B497BD

Use Tailwind classes throughout the app. Custom theme values:
```tsx
<div className="bg-background text-text-primary">
  <button className="bg-accent-cyan hover:bg-accent-lavender">
    Click me
  </button>
</div>
```

### shadcn/ui Components

Components are manually included in `src/components/ui/`. To add more:

1. Visit https://ui.shadcn.com/
2. Copy component code
3. Place in `src/components/ui/`
4. Add any required dependencies

Currently included:
- Button
- Card
- Input
- Label
- Dialog
- Tabs
- Form (with react-hook-form integration)

## Backend Integration

The app connects to a tRPC backend API. Configure the API URL in `.env`:

```env
VITE_API_URL=http://localhost:3000
```

tRPC client automatically includes JWT auth token from localStorage in all requests.

## Authentication Flow

1. User visits protected route
2. Redirected to `/login` if not authenticated
3. After login, JWT token stored in localStorage
4. Token automatically included in all API requests
5. Auth state managed with Zustand

## Routing

Routes are defined in `src/App.tsx`:

**Public routes** (redirect to app if authenticated):
- `/login` - Login page
- `/signup` - Signup page

**Protected routes** (require authentication):
- `/collections` - Collections management
- `/scan` - OCR card scanning
- `/complete` - Complete collection view
- `/build` - Deck builder

## Development Tips

### Hot Module Replacement

Vite provides instant HMR. Changes to React components will update without full page reload.

### Type Safety

- All API calls are type-safe via tRPC
- Forms use Zod schemas for validation
- Components use TypeScript for props

### State Management

- **Auth**: Zustand store with localStorage persistence
- **API data**: TanStack Query via tRPC hooks
- **Forms**: React Hook Form with Zod validation

### Adding a New Page

1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. (Optional) Add to bottom navigation in `src/components/layout/BottomNav.tsx`

Example:
```tsx
// src/pages/NewPage.tsx
export const NewPage = () => {
  return <div>New Page Content</div>
}

// src/App.tsx
import { NewPage } from '@/pages/NewPage'

// In AppRoutes component
<Route path="new" element={<NewPage />} />
```

## Troubleshooting

### Port already in use

Change the port in `vite.config.ts`:
```ts
server: {
  port: 5174, // Change this
}
```

### Can't connect to backend

1. Ensure backend is running on the configured URL
2. Check `.env` file has correct `VITE_API_URL`
3. Check browser console for CORS errors
4. Verify backend has CORS enabled for `http://localhost:5173`

### TypeScript errors

Run type checking:
```bash
bun run build
```

Or use VS Code's TypeScript server for real-time errors.

### Module not found errors

1. Check import path uses `@/` prefix for absolute imports
2. Ensure dependency is in `package.json`
3. Try removing `node_modules` and reinstalling:
   ```bash
   rm -rf node_modules
   bun install
   ```

## Next Steps

1. **Connect Authentication**: Implement login/signup with backend API
2. **Collections CRUD**: Wire up collections management to backend
3. **OCR Integration**: Add Tesseract.js and OpenCV.js for card scanning
4. **Card Search**: Integrate with Scryfall API for card lookups
5. **Deck Builder**: Implement deck creation and management
6. **Animations**: Add Framer Motion transitions between pages
7. **PWA**: Set up service worker for offline support

## Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [tRPC](https://trpc.io/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
