import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSuggestions, type SuggestionsOutput } from '@/hooks/useRecommendations';
import { Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormatType } from './FormatSelector';
import { trpc } from '@/lib/trpc';

/**
 * Category filter options
 */
const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'ramp', label: 'Ramp' },
  { value: 'cardDraw', label: 'Card Draw' },
  { value: 'removal', label: 'Removal' },
  { value: 'boardWipe', label: 'Board Wipe' },
  { value: 'threats', label: 'Threats' },
] as const;

type CategoryFilter = (typeof CATEGORY_OPTIONS)[number]['value'];

/**
 * Props for the RecommendationPanel component
 */
export interface RecommendationPanelProps {
  /** Deck ID to get recommendations for */
  deckId: string;
  /** Collection ID to filter cards from */
  collectionId: string;
  /** Format for recommendations */
  format: FormatType;
  /** Number of cards per page */
  pageSize?: number;
  /** Additional CSS classes */
  className?: string;
  /** Callback when a card is clicked */
  onCardClick?: (cardId: string) => void;
}

/**
 * Single suggestion card display
 */
function SuggestionCard({
  suggestion,
  deckId,
  collectionId,
  format,
  onCardClick,
}: {
  suggestion: NonNullable<SuggestionsOutput['suggestions']>[number];
  deckId: string;
  collectionId: string;
  format: FormatType;
  onCardClick?: (cardId: string) => void;
}) {
  const card = suggestion.card;
  const score = suggestion.score;
  const imageUrl =
    typeof card.imageUris === 'object' &&
    card.imageUris !== null &&
    'normal' in card.imageUris
      ? String(card.imageUris.normal)
      : '';

  const utils = trpc.useUtils();
  const addCardMutation = trpc.decks.addCard.useMutation({
    onSuccess: async () => {
      // Invalidate recommendations to remove the added card from suggestions
      // Only on success - no need to refetch if nothing changed
      await utils.recommendations.getSuggestions.invalidate({
        deckId,
        collectionId,
        format,
      });
    },
    onError: (error) => {
      // Log error for user feedback
      console.error('Failed to add card to deck:', error.message);
    },
    onSettled: async () => {
      // Always invalidate deck queries to ensure consistency
      await utils.decks.get.invalidate({ deckId });
      await utils.decks.analyze.invalidate({ deckId });
    },
  });

  const handleAddToDeck = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    addCardMutation.mutate({
      deckId,
      cardId: card.id,
      quantity: 1,
      cardType: 'mainboard',
    });
  };

  return (
    <Card
      className="overflow-hidden hover:border-accent-cyan transition-colors cursor-pointer group"
      onClick={() => onCardClick?.(card.id)}
    >
      <CardContent className="p-0">
        {/* Card Image */}
        {imageUrl && (
          <div className="relative">
            <img
              src={imageUrl}
              alt={card.name}
              className="w-full h-auto object-cover hover:opacity-90 transition-opacity"
            />
            {/* Synergy Score Badge */}
            <div className="absolute bottom-2 right-2 bg-gradient-to-br from-accent-cyan to-accent-lavender text-white font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5">
              <span className="text-xs opacity-90">Synergy</span>
              <span className="text-lg">{Math.round(score.total)}</span>
            </div>
            {/* Owned Badge */}
            {suggestion.inCollection && (
              <div className="absolute top-2 left-2 bg-green-500/90 text-white font-medium px-2 py-1 rounded text-xs">
                Owned
              </div>
            )}
          </div>
        )}

        {/* Card Info */}
        <div className="p-3 space-y-2">
          <div>
            <div className="font-medium text-text-primary text-sm truncate group-hover:text-accent-cyan transition-colors">
              {card.name}
            </div>
            <div className="text-xs text-text-secondary truncate">
              {card.setCode?.toUpperCase()} #{card.collectorNumber}
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1">
            {suggestion.categories.slice(0, 2).map((category) => (
              <Badge
                key={category}
                className="text-xs bg-accent-cyan/20 text-accent-cyan"
              >
                {category}
              </Badge>
            ))}
          </div>

          {/* Score Breakdown */}
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-text-secondary space-y-0.5">
              {score.mechanical > 0 && (
                <div className="flex justify-between">
                  <span>Mechanical</span>
                  <span className="font-medium text-accent-cyan">+{Math.round(score.mechanical)}</span>
                </div>
              )}
              {score.strategic > 0 && (
                <div className="flex justify-between">
                  <span>Strategic</span>
                  <span className="font-medium text-text-primary">+{Math.round(score.strategic)}</span>
                </div>
              )}
              {score.formatContext > 0 && (
                <div className="flex justify-between">
                  <span>Format Fit</span>
                  <span className="font-medium text-text-primary">+{Math.round(score.formatContext)}</span>
                </div>
              )}
              {score.theme > 0 && (
                <div className="flex justify-between">
                  <span>Theme</span>
                  <span className="font-medium text-text-primary">+{Math.round(score.theme)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Add to Deck Button */}
          <Button
            onClick={handleAddToDeck}
            disabled={addCardMutation.isPending}
            className="w-full mt-2 gap-2"
            size="sm"
          >
            {addCardMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                Add to Deck
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Category filter bar
 */
function CategoryFilterBar({
  selected,
  onSelect,
}: {
  selected: CategoryFilter;
  onSelect: (category: CategoryFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_OPTIONS.map((option) => (
        <Badge
          key={option.value}
          className={cn(
            'cursor-pointer transition-colors',
            selected === option.value
              ? 'bg-accent-cyan text-background'
              : 'bg-surface-elevated text-text-secondary hover:bg-surface-elevated/80'
          )}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </Badge>
      ))}
    </div>
  );
}

/**
 * RecommendationPanel - Displays card recommendations for a deck
 *
 * Shows card suggestions from the user's collection with synergy scores,
 * category filtering, and pagination support.
 */
export function RecommendationPanel({
  deckId,
  collectionId,
  format,
  pageSize = 20,
  className,
  onCardClick,
}: RecommendationPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [offset, setOffset] = useState(0);

  // Reset offset when filter changes
  const handleCategoryChange = (category: CategoryFilter) => {
    setCategoryFilter(category);
    setOffset(0);
  };

  const { data, isLoading, error, isFetching } = useSuggestions(
    {
      deckId,
      collectionId,
      format,
      limit: pageSize,
      offset,
      categoryFilter,
    },
    { enabled: Boolean(deckId && collectionId && format) }
  );

  // Loading state (initial load)
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-red-400 text-sm">Failed to load recommendations</p>
        <p className="text-text-secondary text-xs mt-1">{error.message}</p>
      </div>
    );
  }

  const suggestions = data?.suggestions ?? [];
  const hasMore = data?.hasMore ?? false;
  const total = data?.total ?? 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recommendations</CardTitle>
            <span className="text-sm text-text-secondary">
              {total} cards found
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CategoryFilterBar
            selected={categoryFilter}
            onSelect={handleCategoryChange}
          />
        </CardContent>
      </Card>

      {/* Empty state */}
      {suggestions.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-text-secondary text-sm">
            No recommendations found for this category
          </p>
        </div>
      )}

      {/* Card Grid */}
      {suggestions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.card.id}
              suggestion={suggestion}
              deckId={deckId}
              collectionId={collectionId}
              format={format}
              onCardClick={onCardClick}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setOffset((prev) => prev + pageSize)}
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
