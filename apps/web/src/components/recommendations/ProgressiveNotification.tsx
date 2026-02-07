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
