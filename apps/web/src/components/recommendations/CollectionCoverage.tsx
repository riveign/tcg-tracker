import { Card, CardContent } from '@/components/ui/card';
import { useFormatCoverage, type FormatCoverageOutput } from '@/hooks/useRecommendations';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormatType } from './FormatSelector';

/**
 * Props for the CollectionCoverage component
 */
export interface CollectionCoverageProps {
  /** Collection ID to analyze */
  collectionId: string;
  /** Optional format filter - if omitted, shows all formats */
  format?: FormatType;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ViableArchetype structure from API
 */
export interface ViableArchetype {
  archetype: string;
  completeness: number;
  keyCards: string[];
}

/**
 * BuildableDeck structure from API
 */
export interface BuildableDeck {
  archetype: string;
  completeness: number;
  coreCardsOwned: string[];
  missingCount: number;
  missingKeyCards: string[];
}

/**
 * Single format coverage structure
 */
export interface SingleFormatCoverage {
  format: FormatType;
  totalLegalCards: number;
  viableArchetypes: ViableArchetype[];
  buildableDecks: BuildableDeck[];
}

/**
 * Multi-format coverage structure
 */
export interface MultiFormatCoverage {
  standard: SingleFormatCoverage;
  modern: SingleFormatCoverage;
  commander: SingleFormatCoverage;
  brawl: SingleFormatCoverage;
}

/**
 * Type guard for single format coverage response
 */
function isSingleFormatCoverage(
  data: FormatCoverageOutput
): data is SingleFormatCoverage {
  return 'format' in data && typeof data.format === 'string';
}

/**
 * Progress bar component for coverage visualization
 */
function CoverageProgressBar({ percentage, label }: { percentage: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary font-medium">{percentage}%</span>
      </div>
      <div className="bg-background rounded-full h-2 overflow-hidden">
        <div
          className="bg-accent-cyan h-full transition-all duration-300 rounded-full"
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Single format coverage display
 */
function SingleFormatCoverageDisplay({ data }: { data: SingleFormatCoverage }) {
  // Calculate coverage percentage based on viable archetypes
  const coveragePercentage = data.viableArchetypes.length > 0
    ? Math.min(100, Math.round((data.viableArchetypes.length / 5) * 100))
    : 0;

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-text-secondary">Legal Cards</div>
            <div className="text-2xl font-bold text-text-primary mt-1">
              {data.totalLegalCards.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-text-secondary">Viable Archetypes</div>
            <div className="text-2xl font-bold text-text-primary mt-1">
              {data.viableArchetypes.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-text-secondary">Buildable Decks</div>
            <div className="text-2xl font-bold text-text-primary mt-1">
              {data.buildableDecks.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Progress */}
      <Card>
        <CardContent className="p-4">
          <CoverageProgressBar
            percentage={coveragePercentage}
            label="Format Coverage"
          />
        </CardContent>
      </Card>

      {/* Archetypes List */}
      {data.viableArchetypes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-text-secondary mb-3">
              Viable Archetypes
            </div>
            <div className="flex flex-wrap gap-2">
              {data.viableArchetypes.map((viable) => (
                <span
                  key={viable.archetype}
                  className="px-2 py-1 bg-accent-cyan/20 text-accent-cyan text-sm rounded-md"
                >
                  {viable.archetype} ({viable.completeness}%)
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buildable Decks Preview */}
      {data.buildableDecks.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-text-secondary mb-3">
              Top Buildable Decks
            </div>
            <div className="space-y-2">
              {data.buildableDecks.slice(0, 5).map((deck) => (
                <div key={deck.archetype} className="flex items-center justify-between">
                  <span className="text-sm text-text-primary truncate">
                    {deck.archetype}
                  </span>
                  <span className="text-sm text-accent-cyan font-medium ml-2">
                    {deck.completeness}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Multi-format coverage display (when no format is specified)
 */
function MultiFormatCoverageDisplay({ data }: { data: MultiFormatCoverage }) {
  const formats = [
    { key: 'standard', label: 'Standard', data: data.standard },
    { key: 'modern', label: 'Modern', data: data.modern },
    { key: 'commander', label: 'Commander', data: data.commander },
    { key: 'brawl', label: 'Brawl', data: data.brawl },
  ] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {formats.map(({ key, label, data: formatData }) => (
        <Card key={key}>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-text-secondary mb-2">
              {label}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Legal Cards</span>
                <span className="text-text-primary font-medium">
                  {formatData.totalLegalCards.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Archetypes</span>
                <span className="text-accent-cyan font-medium">
                  {formatData.viableArchetypes.length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Buildable</span>
                <span className="text-accent-lavender font-medium">
                  {formatData.buildableDecks.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * CollectionCoverage - Visual coverage metrics for a collection
 *
 * Displays format coverage including legal cards, viable archetypes,
 * and buildable decks. Supports single format or all-format view.
 */
export function CollectionCoverage({
  collectionId,
  format,
  className,
}: CollectionCoverageProps) {
  const { data, isLoading, error } = useFormatCoverage(
    { collectionId, format },
    { enabled: Boolean(collectionId) }
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-red-400 text-sm">Failed to load coverage data</p>
        <p className="text-text-secondary text-xs mt-1">{error.message}</p>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-text-secondary text-sm">No coverage data available</p>
      </div>
    );
  }

  // Render based on response type
  if (isSingleFormatCoverage(data)) {
    return (
      <div className={className}>
        <SingleFormatCoverageDisplay data={data} />
      </div>
    );
  }

  // Multi-format response
  return (
    <div className={className}>
      <MultiFormatCoverageDisplay data={data as MultiFormatCoverage} />
    </div>
  );
}
