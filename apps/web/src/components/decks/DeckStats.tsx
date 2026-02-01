import { Card, CardContent } from '@/components/ui/card';

interface DeckAnalytics {
  manaCurve: Record<number, number>;
  typeDistribution: Record<string, number>;
  colorDistribution: Record<string, number>;
  avgCMC: number;
  totalCards: number;
  mainboardCount: number;
  sideboardCount: number;
}

interface DeckStatsProps {
  analytics: DeckAnalytics;
}

export function DeckStats({ analytics }: DeckStatsProps) {
  // Get top 3 card types
  const topTypes = Object.entries(analytics.typeDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // Get colors
  const colors = Object.entries(analytics.colorDistribution)
    .sort(([, a], [, b]) => b - a);

  // Color name mapping
  const colorNames: Record<string, string> = {
    W: 'White',
    U: 'Blue',
    B: 'Black',
    R: 'Red',
    G: 'Green',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Cards */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-text-secondary">Total Cards</div>
          <div className="text-2xl font-bold text-text-primary">
            {analytics.totalCards}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {analytics.mainboardCount} mainboard
          </div>
        </CardContent>
      </Card>

      {/* Average CMC */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-text-secondary">Avg. CMC</div>
          <div className="text-2xl font-bold text-text-primary">
            {analytics.avgCMC.toFixed(2)}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            Converted Mana Cost
          </div>
        </CardContent>
      </Card>

      {/* Card Types */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-text-secondary">Top Types</div>
          <div className="text-sm font-medium text-text-primary mt-1 space-y-1">
            {topTypes.length > 0 ? (
              topTypes.map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span className="truncate">{type}</span>
                  <span className="text-accent-cyan ml-2">{count}</span>
                </div>
              ))
            ) : (
              <div className="text-text-secondary">No cards yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-text-secondary">Colors</div>
          <div className="text-sm font-medium text-text-primary mt-1 space-y-1">
            {colors.length > 0 ? (
              colors.slice(0, 3).map(([color, count]) => (
                <div key={color} className="flex justify-between">
                  <span className="truncate">{colorNames[color] || color}</span>
                  <span className="text-accent-cyan ml-2">{count}</span>
                </div>
              ))
            ) : (
              <div className="text-text-secondary">Colorless</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mana Curve Preview */}
      <Card className="col-span-2 md:col-span-4">
        <CardContent className="p-4">
          <div className="text-sm text-text-secondary mb-3">Mana Curve</div>
          <div className="flex items-end gap-1 h-24">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((cmc) => {
              const count = analytics.manaCurve[cmc] || 0;
              const maxCount = Math.max(...Object.values(analytics.manaCurve), 1);
              const height = (count / maxCount) * 100;

              return (
                <div key={cmc} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-text-secondary font-medium">
                    {count}
                  </div>
                  <div
                    className="w-full bg-accent-cyan rounded-t transition-all"
                    style={{ height: `${height}%` }}
                  />
                  <div className="text-xs text-text-secondary">
                    {cmc === 7 ? '7+' : cmc}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
