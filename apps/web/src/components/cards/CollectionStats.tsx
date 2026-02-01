import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Stats {
  totalUniqueCards: number
  totalQuantity: number
  collections: number
  colorBreakdown: Record<string, number>
  rarityBreakdown: Record<string, number>
}

interface CollectionStatsProps {
  stats: Stats
}

const COLOR_MAP: Record<string, { name: string; class: string }> = {
  W: { name: 'White', class: 'bg-yellow-100/20 text-yellow-300' },
  U: { name: 'Blue', class: 'bg-blue-400/20 text-blue-300' },
  B: { name: 'Black', class: 'bg-gray-700/20 text-gray-300' },
  R: { name: 'Red', class: 'bg-red-400/20 text-red-300' },
  G: { name: 'Green', class: 'bg-green-400/20 text-green-300' },
}

const RARITY_MAP: Record<string, { name: string; class: string }> = {
  common: { name: 'Common', class: 'bg-gray-600/20 text-gray-500' },
  uncommon: { name: 'Uncommon', class: 'bg-gray-500/20 text-gray-400' },
  rare: { name: 'Rare', class: 'bg-yellow-500/20 text-yellow-400' },
  mythic: { name: 'Mythic', class: 'bg-orange-500/20 text-orange-400' },
}

export const CollectionStats = ({ stats }: CollectionStatsProps) => {
  const topColor = Object.entries(stats.colorBreakdown).sort(
    ([, a], [, b]) => b - a
  )[0]

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-text-secondary">Total Cards</div>
            <div className="text-2xl font-bold text-text-primary mt-1">
              {stats.totalQuantity.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-text-secondary">Unique Cards</div>
            <div className="text-2xl font-bold text-text-primary mt-1">
              {stats.totalUniqueCards.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-text-secondary">Collections</div>
            <div className="text-2xl font-bold text-text-primary mt-1">
              {stats.collections}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-text-secondary">Top Color</div>
            <div className="text-2xl font-bold text-text-primary mt-1">
              {topColor ? (
                <Badge className={COLOR_MAP[topColor[0]]?.class}>
                  {COLOR_MAP[topColor[0]]?.name || topColor[0]}
                </Badge>
              ) : (
                <span className="text-lg">—</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Color Breakdown */}
        {Object.keys(stats.colorBreakdown).length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-text-secondary mb-3">
                Color Distribution
              </div>
              <div className="space-y-2">
                {Object.entries(stats.colorBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([color, count]) => (
                    <div key={color} className="flex items-center justify-between">
                      <Badge className={COLOR_MAP[color]?.class}>
                        {COLOR_MAP[color]?.name || color}
                      </Badge>
                      <span className="text-sm text-text-primary font-medium">
                        {count} ({((count / stats.totalQuantity) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rarity Breakdown */}
        {Object.keys(stats.rarityBreakdown).length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-text-secondary mb-3">
                Rarity Distribution
              </div>
              <div className="space-y-2">
                {Object.entries(stats.rarityBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([rarity, count]) => (
                    <div key={rarity} className="flex items-center justify-between">
                      <Badge className={RARITY_MAP[rarity]?.class}>
                        {RARITY_MAP[rarity]?.name || rarity}
                      </Badge>
                      <span className="text-sm text-text-primary font-medium">
                        {count} ({((count / stats.totalQuantity) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
