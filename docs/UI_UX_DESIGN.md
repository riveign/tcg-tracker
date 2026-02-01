# UI/UX Design Documentation

Design specifications for the TCG Collection Tracker single-page application.

## Design Goals

- **Aesthetic**: "Snappy, techy, pristine collection"
- **Platform**: Mobile-first (primary use case: scanning cards with phone camera)
- **Architecture**: Single-page app with multiple menus
- **Transitions**: Slick animations between views

## Visual Theme: Cyber-Minimal

### Color Palette

```css
/* Background */
--bg-primary: #0A0E14;      /* Deep space gray */
--bg-surface: #151922;      /* Elevated dark */

/* Accents */
--accent-cyan: #5ECBF5;     /* Neon cyan - actions/CTAs */
--accent-lavender: #B497BD; /* Digital lavender - premium features */
--success: #AADBC8;         /* Mint pixel - completed sets */

/* Text */
--text-primary: #E6EDF3;    /* Cool white */
--text-secondary: #8B949E;  /* Muted gray */
```

**Rationale:**
- Dark base makes card images pop (crucial for visual recognition)
- Cyber cyan gives "techy" vibe without being loud
- Digital lavender adds sophistication
- Modern app colors in 2026 are "calmer, deeper, function-focused"

### Typography

```css
/* Font Stack */
font-primary: 'Inter' or 'Geist Sans';   /* Body, UI elements */
font-display: 'Space Grotesk';            /* Headings */
font-mono: 'JetBrains Mono';              /* Card counts, numbers */
```

**Rationale:**
- Inter/Geist Sans: Clean, modern, excellent mobile readability
- Space Grotesk: Geometric, techy vibe without being overly futuristic
- Mono for numbers: Reinforces "collection tracker" precision aesthetic

### Card Display

**Grid Layout:**
- CSS Grid with `auto-fit` and `minmax()` for responsive layouts
- Mobile: 2-3 columns
- Tablet: 4-5 columns
- Desktop: 6-8 columns

**Card Component States:**
```
Default:   Subtle shadow, 8px rounded corners
Hover:     Lift up slightly, glow effect
Active:    Scale down 0.98, haptic feedback
Selected:  Cyan border glow
Owned:     Mint badge overlay
```

### Icons & Imagery

- **Icon System**: Lucide React or Heroicons
- **Style**: Outlined for inactive, filled for active
- **Size**: 24px base (touch-friendly)
- **Card Images**: Lazy load with blur-up placeholders, 4px rounded corners

## Navigation Structure

### Bottom Tab Bar (4 Primary Tabs)

```
┌──────────────────────────┐
│                          │
│      Main Content        │
│                          │
├──────────────────────────┤
│ [Collections] [Scan] [Complete] [Build] │
└──────────────────────────┘
```

1. **Collections** - Browse/manage collections
2. **Scan** - Camera OCR for adding cards
3. **Complete** - Aggregated view across all collections
4. **Build** - Deck builder interface

**Rationale:**
- Bottom tabs sit in thumb-friendly zone
- 3-5 primary destinations reduce cognitive load
- Camera/Scan deserves prominent placement as primary input method
- Research shows navigation accounts for 30-40% of mobile usability problems

## Page Transitions

### Recommended Technologies

- **View Transitions API** (native browser magic)
- **Framer Motion** (fallback for unsupported browsers)

### Transition Styles

```typescript
// Between tabs
transition: "slide-horizontal", duration: 200-300ms

// Card grid → Card detail
transition: "morph", // Card expands to full screen

// Opening deck builder
transition: "slide-up", // Like modal from bottom

// Collection switching
transition: "crossfade", duration: 150ms
```

## Component Library

### Recommended: shadcn/ui + Radix UI

**Why shadcn/ui:**
- ✅ Built on Radix UI primitives (accessibility baked in)
- ✅ Components copied into your project (full ownership)
- ✅ Tailwind CSS styled (easy customization)
- ✅ Modern, minimal aesthetic out of the box
- ✅ Tree-shakeable (only ship what you use)

**Theme Customization:**
```typescript
const theme = {
  radius: "0.5rem",        // Softer than default
  primary: "#5ECBF5",      // Neon cyan
  background: "#0A0E14",   // Deep space
  card: "#151922",         // Elevated surface
}
```

## Animation Library

### Recommended: Framer Motion

**Why Framer Motion:**
- ✅ Declarative API (easier to maintain)
- ✅ Built-in layout animations (perfect for card grid reordering)
- ✅ Gesture support (drag-to-reorder collections)
- ✅ Hardware-accelerated (smooth on lower-end phones)
- ✅ AnimatePresence for mount/unmount animations

**Key Animations:**

```typescript
// Card entrance stagger
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.05 }}
/>

// Collection switch morph
<AnimateSharedLayout>
  <motion.div layoutId="collection-header" />
</AnimateSharedLayout>

// Deck builder drag
<motion.div
  drag
  dragConstraints={...}
  whileDrag={{ scale: 1.1 }}
/>
```

## Core Views Wireframes

### 1. Collection View (Landing)

```
┌─────────────────────────┐
│  [Back] Collection Name  │  ← Sticky header
│  [Filter] [Sort] [Search]│  ← Action bar
├─────────────────────────┤
│                          │
│  ┌───┐ ┌───┐ ┌───┐     │  ← Card grid (2-3 cols mobile)
│  │ █ │ │ █ │ │ █ │     │    Badge overlay:
│  │   │ │   │ │   │     │    • Owned count
│  └───┘ └───┘ └───┘     │    • Foil indicator
│                          │    • Set symbol
│  ┌───┐ ┌───┐ ┌───┐     │
│  │ █ │ │ █ │ │ █ │     │
│  └───┘ └───┘ └───┘     │
│                          │
│  [Pull to refresh]       │  ← Infinite scroll
└─────────────────────────┘
│ [Collections] [Scan] [Complete] [Build] │
└─────────────────────────┘
```

**Interactions:**
- Tap card → Expand to detail view (morph animation)
- Swipe card left → Quick actions (Add to deck, Remove, Share)
- Pull down → Refresh collection
- Filter chips → Slide in filter panel from right

**Key Elements:**
- Collection header with name, logo, completion percentage bar
- Filter chips (Color, Rarity, CMC) - horizontally scrollable
- Card badges showing quantity, foil status
- Empty state: "Scan your first card" with camera icon

### 2. Card Scanner

```
┌─────────────────────────┐
│                          │
│      ┌─────────┐        │  ← Card outline overlay
│      │    █    │        │    (guides user)
│      └─────────┘        │
│                          │
│  Auto-detect ON         │  ← Status indicator
│  Center card in frame   │  ← Helper text
│                          │
├─────────────────────────┤
│  [Flash] [X] [Batch]    │  ← Bottom controls
└─────────────────────────┘
```

**Post-scan confirmation:**

```
┌─────────────────────────┐
│  ✓ Card Detected         │  ← Success banner
├─────────────────────────┤
│      ┌─────────┐        │  ← Detected card preview
│      │  Card   │        │
│      │  Image  │        │
│      └─────────┘        │
│                          │
│  Lightning Bolt          │  ← Card name
│  Instant • 1 Mana       │  ← Card type
│                          │
│  Quantity: [1] [+][-]   │  ← Quantity selector
│  Condition: [NM ▼]      │  ← Condition dropdown
│  Foil: [ ] Toggle       │  ← Foil checkbox
│                          │
│  [Add to Collection]     │  ← Primary action
│  [Scan Another]         │  ← Secondary action
└─────────────────────────┘
```

**Interactions:**
- Auto-capture when card detected (no button tap needed)
- Haptic feedback on successful scan
- Batch mode: Immediately return to camera after adding
- Flash toggle for low-light conditions

### 3. Complete Collection (All Cards)

```
┌─────────────────────────┐
│  All Collections         │  ← Header
│  [Filter] [Group By ▼]  │  ← Controls
├─────────────────────────┤
│  ── Streets of New Cap. ─│  ← Set divider (sticky on scroll)
│  1,234 / 2,500 cards    │    Progress bar
│  ████████░░ 49%         │
│                          │
│  ┌───┐ ┌───┐ ┌───┐     │  ← Card grid
│  │ █ │ │ █ │ │ █ │     │    Quantity badge
│  └─1─┘ └─0─┘ └─3─┘     │
│                          │
│  ── Dominaria United ──  │  ← Next set divider
│  892 / 1,800 cards      │
│  ██████░░░░ 50%         │
└─────────────────────────┘
```

**Group By Options:**
- Set (chronological)
- Color identity
- Card type
- Rarity
- CMC

**Interactions:**
- Tap set divider → Collapse/expand set
- Tap "Group By" → Bottom sheet with grouping options
- Card tap → Detail view

### 4. Deck Builder

```
┌─────────────────────────┐
│  [<] New Deck [Save]    │  ← Header with actions
├─────────────────────────┤
│  ┌─────────┬─────────┐ │  ← Tab switcher
│  │  Deck   │Sideboard│ │
│  └─────────┴─────────┘ │
│                          │
│  ── Creatures (12) ────  │  ← Type grouping
│  Lightning Bolt      x4 │  ← Deck list (compact)
│  Counterspell        x3 │
│  Shock                x2│
│                          │
│  ── Instants (8) ──────  │
│  Lightning Bolt      x4 │
│  Counterspell        x3 │
│                          │
│  [+ Add Cards]           │  ← Add button
├─────────────────────────┤
│  60 cards │ Avg CMC 2.1 │  ← Deck stats
└─────────────────────────┘
```

**Add Cards Modal:**

```
┌─────────────────────────┐
│  [Cancel] Add Cards      │  ← Slide up modal
│  [Search cards...]       │  ← Search bar
│  [Filter by color]       │  ← Quick filters
├─────────────────────────┤
│  ┌───┐ ┌───┐ ┌───┐     │  ← Available cards
│  │ █ │ │ █ │ │ █ │     │    from collections
│  │ + │ │ + │ │ + │     │    Tap + to add
│  └───┘ └───┘ └───┘     │
└─────────────────────────┘
```

**Deck Stats:**
- Total cards (60/100 for Commander)
- Average CMC
- Color distribution (pie chart)
- Card type breakdown
- Mana curve (bar chart)

### 5. Collection Management

```
┌─────────────────────────┐
│  Collections             │  ← Header
│  [+ New] [Import]        │  ← Actions
├─────────────────────────┤
│  ┌───────────────────┐  │  ← Collection card
│  │ My Main Collection│  │
│  │ 2,345 cards       │  │
│  │ ████████░░ 67%    │  │  Progress bar
│  │ Updated 2h ago    │  │
│  │ [Edit] [Share]    │  │
│  └───────────────────┘  │
│                          │
│  ┌───────────────────┐  │
│  │ Commander Staples │  │
│  │ 487 cards         │  │
│  │ ██████░░░░ 45%    │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

## Mobile Interaction Patterns

### Pull-to-Refresh
- Use for Collection View and Complete Collection
- Visual feedback: Spinner appears at 60px pull threshold
- Animation: Smooth rubber-band physics
- Don't use on Deck Builder (no dynamic updates)

### Swipe Gestures
- **Collection View**: Swipe left on card → Quick actions
- **Deck Builder**: Swipe between deck and sideboard
- **Complete Collection**: Swipe between set groupings

### Camera Integration
1. Full-screen takeover with card outline overlay
2. Auto-detection highlights card automatically
3. "Center card in frame" helper text
4. Vibration + sound on successful scan
5. Slide-up confirmation sheet with card details

### Touch Optimizations
- **Minimum Touch Targets**: 44x44px (iOS) or 48x48dp (Android)
- **Spacing**: 8px minimum between tappable elements
- **Avoid**: Long-press (not discoverable), double-tap (conflicts with zoom)

## Advanced UX Considerations

### Loading States
**Philosophy**: Never show spinners - use skeletons and optimistic updates

```tsx
{isLoading ? (
  <div className="grid grid-cols-3 gap-2">
    {Array.from({ length: 12 }).map((_, i) => (
      <Skeleton key={i} className="aspect-[2/3] rounded" />
    ))}
  </div>
) : (
  <CardGrid cards={data} />
)}
```

### Optimistic Updates
```tsx
const addCard = useMutation({
  mutationFn: addCardToCollection,
  onMutate: async (newCard) => {
    // Add card to UI immediately
    queryClient.setQueryData(['collection'], old => [...old, newCard]);
  },
  onError: (err, newCard, context) => {
    // Rollback on error
    queryClient.setQueryData(['collection'], context.previousCards);
  },
});
```

### Empty States
- **No cards in collection**: Illustration + "Tap Scan to add your first card"
- **Network errors**: Toast notification + Retry button
- **OCR failures**: "Card not recognized - try again" + Manual search option

### Accessibility
- Color contrast ratios >4.5:1 (WCAG 2.1 AA)
- Touch targets 44x44px minimum
- Screen reader labels on all interactive elements
- Keyboard navigation support (for PWA desktop mode)
- Reduced motion support

## Performance Budgets

**Target Metrics:**
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Lighthouse Performance: >90
- Bundle size: <200KB initial

**Optimization Strategies:**
- Route-based code splitting
- Image lazy loading with blur placeholders
- Virtual scrolling for large card grids (>500 cards)
- Service worker for offline support

## Tech Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Components | shadcn/ui + Radix UI | Accessible, customizable, modern |
| Animation | Framer Motion | Layout animations, gestures |
| Transitions | View Transitions API | Native browser morphing |
| Styling | Tailwind CSS | Utility-first, small bundle |
| Icons | Lucide React | Modern, tree-shakeable |
| Forms | React Hook Form + Zod | Performance, validation |
| State | Zustand | Minimal boilerplate |
| Data Fetching | TanStack Query | Caching, optimistic updates |

## Reference Examples

### Similar Apps
- **Moxfield**: Clean UI, excellent deck builder
- **Archidekt**: Visual deck builder, stats analysis
- **MTG Arena**: Filter system reference (color, type, CMC)

### Design Inspiration
- **Pinterest**: Masonry card grid
- **Spotify**: Bottom tabs + smooth transitions
- **Instagram Reels**: Swipe gestures
- **Google Lens**: Camera scanning UX

## Sources

- [Mobile Navigation UX Best Practices 2026](https://www.designstudiouiux.com/blog/mobile-navigation-ux/)
- [shadcn/ui vs Radix UI](https://saasindie.com/blog/shadcn-vs-radix-themes-comparison)
- [Framer Motion vs React Spring](https://www.dhiwise.com/post/react-spring-vs-framer-motion-a-detailed-guide-to-react)
- [Modern App Color Palettes 2026](https://webosmotic.com/blog/modern-app-colors/)
- [View Transitions API](https://developer.chrome.com/docs/web-platform/view-transitions/same-document)
- [Mobile OCR Best Practices](https://packagex.io/platform/vision-sdk)
