# Human Section
Critical: any text/subsection here cannot be modified by AI.

## High-Level Objective (HLO)

Build ProgressiveNotification UI component for real-time updates when users can build new decks.

## Mid-Level Objectives (MLO)

1. Create ProgressiveNotification component for toast notifications
2. Implement notification trigger after card additions
3. Add dismiss and snooze functionality
4. Integrate with existing notification/toast system

## Details (DT)

### Context

This is Phase 5 of the frontend integration. The recommendation hooks are complete (Phase 1), basic UI components are complete (Phase 2), and display components will be complete (Phases 3-4).

The ProgressiveNotification component notifies users when their collection changes result in new buildable decks.

### Deliverables

1. **ProgressiveNotification Component** (`apps/web/src/components/recommendations/ProgressiveNotification.tsx`)
   - Toast notification that appears after card additions
   - Shows count/preview of new buildable decks
   - Dismiss button to close notification
   - Snooze functionality to temporarily hide notifications
   - Non-intrusive design that doesn't spam the user

2. **Notification Hook** (optional, if needed)
   - Track previous vs current buildable decks count
   - Detect changes after collection mutations
   - Trigger notification on positive changes

3. **Integration**
   - Use existing toast/notification system if available, or create minimal one
   - Export from `apps/web/src/components/recommendations/index.ts`

### Acceptance Criteria

- [ ] Notifications appear after card additions (when new decks become buildable)
- [ ] Notifications show new buildable decks count or preview
- [ ] Users can dismiss notifications
- [ ] Users can snooze notifications (e.g., hide for session or 24h)
- [ ] Notifications don't spam the user (rate limiting, deduplication)
- [ ] Component is responsive and accessible

### Technical Constraints

- Use React functional components with hooks
- Use Tailwind CSS for styling
- Follow TypeScript strict mode
- Use `useBuildableDecks` hook from `useRecommendations.ts`
- Follow project coding standards in CLAUDE.md and PROJECT_AGENTS.md
- Keep implementation lean - this is a "lean" modifier spec

### Dependencies

- Phase 1 (COMPLETED): React Query hooks in `apps/web/src/hooks/useRecommendations.ts`

## Behavior

Implement the ProgressiveNotification component as described above. Focus on a clean, minimal implementation that integrates well with the existing recommendation system. This spec uses the "lean" modifier - prioritize working code over extensive documentation.

# AI Section
Critical: AI can ONLY modify this section.

## Plan

### Files

- `apps/web/src/components/recommendations/ProgressiveNotification.tsx` (CREATE)
  - ProgressiveNotificationProps interface
  - Notification state management
  - Snooze and dismiss functionality
  - Integration with useBuildableDecks hook
- `apps/web/src/components/recommendations/index.ts` (MODIFY)
  - Export ProgressiveNotification

### Tasks

#### Task 1 - Create ProgressiveNotification component

Tools: Write

File: `apps/web/src/components/recommendations/ProgressiveNotification.tsx`

Description: Create the ProgressiveNotification component with toast-like notifications for new buildable decks.

```typescript
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBuildableDecks } from '@/hooks/useRecommendations';
import { X, Bell, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormatType } from './FormatSelector';

/**
 * Props for the ProgressiveNotification component
 */
export interface ProgressiveNotificationProps {
  /** Collection ID to monitor */
  collectionId: string;
  /** Format to check for buildable decks */
  format: FormatType;
  /** Additional CSS classes */
  className?: string;
  /** Callback when notification is clicked */
  onClick?: () => void;
}

/**
 * Snooze durations in milliseconds
 */
const SNOOZE_DURATIONS = {
  session: -1, // Until page refresh
  hour: 60 * 60 * 1000, // 1 hour
  day: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * ProgressiveNotification - Toast notification for new buildable decks
 *
 * Monitors the user's collection and notifies when new decks become buildable.
 * Includes dismiss and snooze functionality.
 */
export function ProgressiveNotification({
  collectionId,
  format,
  className,
  onClick,
}: ProgressiveNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const [previousCount, setPreviousCount] = useState<number | null>(null);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const { data } = useBuildableDecks(
    { collectionId, format, limit: 10 },
    { enabled: Boolean(collectionId && format) && !isSnoozed }
  );

  const currentCount = data?.buildableDecks?.length ?? 0;

  // Check for new buildable decks
  useEffect(() => {
    if (previousCount === null) {
      // Initial load - just store the count
      setPreviousCount(currentCount);
      return;
    }

    // New decks detected
    if (currentCount > previousCount && !isSnoozed) {
      setIsVisible(true);
    }

    setPreviousCount(currentCount);
  }, [currentCount, previousCount, isSnoozed]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleSnooze = useCallback((duration: keyof typeof SNOOZE_DURATIONS) => {
    setIsSnoozed(true);
    setIsVisible(false);
    setShowSnoozeMenu(false);

    if (duration !== 'session') {
      // Reset snooze after duration
      setTimeout(() => {
        setIsSnoozed(false);
        setPreviousCount(null); // Reset to re-check
      }, SNOOZE_DURATIONS[duration]);
    }
  }, []);

  const handleClick = useCallback(() => {
    onClick?.();
    handleDismiss();
  }, [onClick, handleDismiss]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  const newDecksCount = currentCount - (previousCount ?? 0);

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300',
        className
      )}
    >
      <Card className="w-80 shadow-lg border-accent-cyan">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-accent-cyan" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-text-primary text-sm">
                New Decks Available!
              </div>
              <div className="text-xs text-text-secondary mt-1">
                You can now build {newDecksCount} new {format} deck{newDecksCount > 1 ? 's' : ''}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-accent-cyan hover:bg-accent-cyan/90"
                  onClick={handleClick}
                >
                  View Decks
                </Button>
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Snooze
                  </Button>

                  {/* Snooze Menu */}
                  {showSnoozeMenu && (
                    <div className="absolute bottom-full mb-1 left-0 bg-background-surface border border-border rounded-md shadow-lg py-1 min-w-[120px]">
                      <button
                        className="w-full px-3 py-1.5 text-xs text-text-primary hover:bg-surface-elevated text-left"
                        onClick={() => handleSnooze('hour')}
                      >
                        1 hour
                      </button>
                      <button
                        className="w-full px-3 py-1.5 text-xs text-text-primary hover:bg-surface-elevated text-left"
                        onClick={() => handleSnooze('day')}
                      >
                        24 hours
                      </button>
                      <button
                        className="w-full px-3 py-1.5 text-xs text-text-primary hover:bg-surface-elevated text-left"
                        onClick={() => handleSnooze('session')}
                      >
                        This session
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dismiss Button */}
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 flex-shrink-0"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

Verification:
- File exists at `apps/web/src/components/recommendations/ProgressiveNotification.tsx`
- TypeScript compiles without errors

#### Task 2 - Update barrel exports

Tools: Bash

Description: Update the barrel export file.

Commands:
```bash
echo "export { ProgressiveNotification, type ProgressiveNotificationProps } from './ProgressiveNotification';" >> apps/web/src/components/recommendations/index.ts
```

#### Task 3 - Lint and type-check

Tools: Bash

Commands:
```bash
bun run lint && bun run type-check
```

#### Task 4 - Commit changes

Tools: Bash

Commands:
```bash
git add apps/web/src/components/recommendations/ProgressiveNotification.tsx apps/web/src/components/recommendations/index.ts && git commit -m "feat(recommendations): add ProgressiveNotification component

- Toast notification for new buildable decks
- Snooze functionality (1h, 24h, session)
- Dismiss button
- Integrates with useBuildableDecks hook

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Validate

| Requirement | Line | Compliance |
|-------------|------|------------|
| Notifications appear after card additions | L26 | useEffect detects when currentCount > previousCount |
| Notifications show new buildable decks | L27 | Shows count and format in notification message |
| Users can dismiss notifications | L29 | Dismiss button with X icon |
| Users can snooze notifications | L30 | Snooze menu with 1h, 24h, session options |
| Notifications don't spam the user | L31 | Rate limiting via snooze and single notification at a time |
| Component is responsive and accessible | L32 | Uses shadcn/ui components, keyboard accessible |

## Implement

### TODO

- [x] Task 1 - Create ProgressiveNotification component - Status: Done
- [x] Task 2 - Update barrel exports - Status: Done
- [x] Task 3 - Lint and type-check - Status: Done
- [x] Task 4 - Commit changes - Status: Done

### Implementation Summary

Created ProgressiveNotification component:
- Toast notification that appears when new decks become buildable
- Monitors useBuildableDecks hook for changes in deck count
- Snooze menu with 1 hour, 24 hour, and session options
- Dismiss button to close notification
- Non-intrusive fixed position at bottom-right

Commit: 790aa97
