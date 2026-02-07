import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useBuildableDecks,
  useFormatCoverage,
  type FormatCoverageOutput,
} from '@/hooks/useRecommendations';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormatType } from './FormatSelector';
import type { ViableArchetype, BuildableDeck } from './CollectionCoverage';

/**
 * Format display configuration
 */
const FORMATS: { value: FormatType; label: string; color: string }[] = [
  { value: 'standard', label: 'Standard', color: 'bg-blue-500' },
  { value: 'modern', label: 'Modern', color: 'bg-purple-500' },
  { value: 'commander', label: 'Commander', color: 'bg-green-500' },
  { value: 'brawl', label: 'Brawl', color: 'bg-orange-500' },
];

/**
 * Props for the FormatDashboard component
 */
export interface FormatDashboardProps {
  /** Collection ID to analyze */
  collectionId: string;
  /** Additional CSS classes */
  className?: string;
  /** Callback when a format is selected */
  onFormatSelect?: (format: FormatType) => void;
}

/**
 * Type guard for all-formats coverage response
 */
function isAllFormatsCoverage(
  data: FormatCoverageOutput
): data is {
  standard: { format: string; totalLegalCards: number; viableArchetypes: ViableArchetype[]; buildableDecks: BuildableDeck[] };
  modern: { format: string; totalLegalCards: number; viableArchetypes: ViableArchetype[]; buildableDecks: BuildableDeck[] };
  commander: { format: string; totalLegalCards: number; viableArchetypes: ViableArchetype[]; buildableDecks: BuildableDeck[] };
  brawl: { format: string; totalLegalCards: number; viableArchetypes: ViableArchetype[]; buildableDecks: BuildableDeck[] };
} {
  return 'standard' in data && 'modern' in data && 'commander' in data && 'brawl' in data;
}

/**
 * Format summary card for the overview grid
 */
function FormatSummaryCard({
  _format,
  label,
  color,
  totalLegalCards,
  archetypeCount,
  buildableCount,
  isSelected,
  onClick,
}: {
  _format: FormatType;
  label: string;
  color: string;
  totalLegalCards: number;
  archetypeCount: number;
  buildableCount: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-accent-cyan',
        isSelected && 'border-accent-cyan ring-1 ring-accent-cyan'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={cn('w-3 h-3 rounded-full', color)} />
          <CardTitle className="text-base">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Legal Cards</span>
          <span className="text-text-primary font-medium">
            {totalLegalCards.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Archetypes</span>
          <span className="text-accent-cyan font-medium">{archetypeCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Buildable Decks</span>
          <span className="text-accent-lavender font-medium">{buildableCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Detailed view for a single format
 */
function FormatDetailView({
  collectionId,
  _format,
}: {
  collectionId: string;
  _format: FormatType;
}) {
  const { data, isLoading, error } = useBuildableDecks(
    { collectionId, format, limit: 10 },
    { enabled: Boolean(collectionId && format) }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-accent-cyan" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 text-sm">Failed to load format details</p>
      </div>
    );
  }

  const buildableDecks = data?.buildableDecks ?? [];
  const viableArchetypes = data?.viableArchetypes ?? [];

  return (
    <div className="space-y-4">
      {/* Viable Archetypes */}
      {viableArchetypes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Viable Archetypes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {viableArchetypes.map((arch) => (
                <Badge
                  key={arch.archetype}
                  className="bg-accent-cyan/20 text-accent-cyan"
                >
                  {arch.archetype} ({arch.completeness}%)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buildable Decks */}
      {buildableDecks.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Buildable Decks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {buildableDecks.map((deck) => (
                <div
                  key={deck.archetype}
                  className="flex items-center justify-between p-2 rounded bg-surface-elevated"
                >
                  <div>
                    <div className="font-medium text-text-primary text-sm">
                      {deck.archetype}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Missing {deck.missingCount} cards
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-accent-cyan font-medium">
                      {deck.completeness}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8">
          <p className="text-text-secondary text-sm">
            No buildable decks found for this format
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * FormatDashboard - Multi-format comparison dashboard
 *
 * Displays coverage overview for all formats with tabs for detailed view.
 */
export function FormatDashboard({
  collectionId,
  className,
  onFormatSelect,
}: FormatDashboardProps) {
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('standard');

  const { data: coverageData, isLoading, error } = useFormatCoverage(
    { collectionId },
    { enabled: Boolean(collectionId) }
  );

  const handleFormatClick = (format: FormatType) => {
    setSelectedFormat(format);
    onFormatSelect?.(format);
  };

  // Loading state
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
        <p className="text-red-400 text-sm">Failed to load format dashboard</p>
        <p className="text-text-secondary text-xs mt-1">{error.message}</p>
      </div>
    );
  }

  // Check for all-formats response
  if (!coverageData || !isAllFormatsCoverage(coverageData)) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-text-secondary text-sm">No coverage data available</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Format Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FORMATS.map(({ value, label, color }) => {
          const formatData = coverageData[value];
          return (
            <FormatSummaryCard
              key={value}
              format={value}
              label={label}
              color={color}
              totalLegalCards={formatData.totalLegalCards}
              archetypeCount={formatData.viableArchetypes.length}
              buildableCount={formatData.buildableDecks.length}
              isSelected={selectedFormat === value}
              onClick={() => handleFormatClick(value)}
            />
          );
        })}
      </div>

      {/* Format Detail Tabs */}
      <Tabs value={selectedFormat} onValueChange={(v) => handleFormatClick(v as FormatType)}>
        <TabsList className="w-full md:w-auto">
          {FORMATS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value} className="flex-1 md:flex-none">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {FORMATS.map(({ value }) => (
          <TabsContent key={value} value={value}>
            <FormatDetailView collectionId={collectionId} format={value} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
