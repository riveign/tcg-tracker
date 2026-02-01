import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search as SearchIcon, Loader2, Filter } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { CardDetailModal } from '@/components/cards/CardDetailModal'

interface AdvancedFilters {
  colors?: string[]
  types?: string[]
  keywords?: string[]
  rarity?: string[]
  cmcMin?: number
  cmcMax?: number
}

const COLORS = [
  { value: 'W', label: 'White', color: 'bg-yellow-100/20 text-yellow-300' },
  { value: 'U', label: 'Blue', color: 'bg-blue-400/20 text-blue-300' },
  { value: 'B', label: 'Black', color: 'bg-gray-700/20 text-gray-300' },
  { value: 'R', label: 'Red', color: 'bg-red-400/20 text-red-300' },
  { value: 'G', label: 'Green', color: 'bg-green-400/20 text-green-300' },
]

const TYPES = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land']

const RARITIES = [
  { value: 'common', label: 'Common', color: 'bg-gray-600/20 text-gray-500' },
  { value: 'uncommon', label: 'Uncommon', color: 'bg-gray-500/20 text-gray-400' },
  { value: 'rare', label: 'Rare', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'mythic', label: 'Mythic', color: 'bg-orange-500/20 text-orange-400' },
]

const COMMON_KEYWORDS = [
  'Flying',
  'Haste',
  'Trample',
  'Vigilance',
  'Lifelink',
  'Deathtouch',
  'First Strike',
  'Double Strike',
  'Hexproof',
  'Indestructible',
  'Menace',
  'Reach',
  'Flash',
]

export const Search = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<AdvancedFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const { data, isLoading } = trpc.cards.advancedSearch.useQuery(
    { query: searchQuery, filters },
    { enabled: searchQuery.length > 0 }
  )

  const toggleArrayFilter = <K extends keyof AdvancedFilters>(
    key: K,
    value: string
  ) => {
    const current = (filters[key] as string[]) || []
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    setFilters({
      ...filters,
      [key]: updated.length > 0 ? updated : undefined,
    })
  }

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId)
    setDetailModalOpen(true)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const getRarityBadgeClass = (rarity: string) => {
    const rarityMap: Record<string, string> = {
      mythic: 'bg-orange-500/20 text-orange-400',
      rare: 'bg-yellow-500/20 text-yellow-400',
      uncommon: 'bg-gray-500/20 text-gray-400',
      common: 'bg-gray-600/20 text-gray-500',
    }
    return rarityMap[rarity] || 'bg-gray-600/20 text-gray-500'
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary font-display">
          Card Search
        </h1>
        <p className="text-text-secondary mt-1">
          Search for Magic: The Gathering cards by name, keywords, and more
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <Input
              type="text"
              placeholder="Search for cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="space-y-4 p-4 border border-surface-elevated rounded-lg bg-surface/50">
            {/* Colors */}
            <div>
              <div className="text-sm font-medium text-text-secondary mb-2">Colors</div>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <Badge
                    key={color.value}
                    className={`cursor-pointer ${
                      filters.colors?.includes(color.value)
                        ? color.color
                        : 'bg-surface-elevated text-text-secondary'
                    }`}
                    onClick={() => toggleArrayFilter('colors', color.value)}
                  >
                    {color.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Types */}
            <div>
              <div className="text-sm font-medium text-text-secondary mb-2">Card Types</div>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((type) => (
                  <Badge
                    key={type}
                    className={`cursor-pointer ${
                      filters.types?.includes(type)
                        ? 'bg-accent-cyan/20 text-accent-cyan'
                        : 'bg-surface-elevated text-text-secondary'
                    }`}
                    onClick={() => toggleArrayFilter('types', type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <div className="text-sm font-medium text-text-secondary mb-2">Keywords</div>
              <div className="flex flex-wrap gap-2">
                {COMMON_KEYWORDS.map((keyword) => (
                  <Badge
                    key={keyword}
                    className={`cursor-pointer ${
                      filters.keywords?.includes(keyword)
                        ? 'bg-accent-lavender/20 text-accent-lavender'
                        : 'bg-surface-elevated text-text-secondary'
                    }`}
                    onClick={() => toggleArrayFilter('keywords', keyword)}
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Rarity */}
            <div>
              <div className="text-sm font-medium text-text-secondary mb-2">Rarity</div>
              <div className="flex flex-wrap gap-2">
                {RARITIES.map((rarity) => (
                  <Badge
                    key={rarity.value}
                    className={`cursor-pointer ${
                      filters.rarity?.includes(rarity.value)
                        ? rarity.color
                        : 'bg-surface-elevated text-text-secondary'
                    }`}
                    onClick={() => toggleArrayFilter('rarity', rarity.value)}
                  >
                    {rarity.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* CMC Range */}
            <div>
              <div className="text-sm font-medium text-text-secondary mb-2">
                Mana Value Range
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={filters.cmcMin ?? ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      cmcMin: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="w-20 px-2 py-1 bg-surface-elevated border border-surface-elevated rounded text-sm"
                />
                <span className="text-text-secondary">to</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={filters.cmcMax ?? ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      cmcMax: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="w-20 px-2 py-1 bg-surface-elevated border border-surface-elevated rounded text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
        </div>
      )}

      {/* No Search Yet */}
      {!searchQuery && (
        <div className="text-center py-12">
          <SearchIcon className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary">
            Enter a card name to start searching
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && searchQuery && data && (
        <>
          <div className="text-sm text-text-secondary">
            Found {data.cards.length} card{data.cards.length !== 1 ? 's' : ''}
          </div>

          {data.cards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary">No cards found matching your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {data.cards.map((card: any) => (
                <Card
                  key={card.id}
                  className="overflow-hidden hover:border-accent-cyan transition-colors cursor-pointer"
                  onClick={() => handleCardClick(card.id)}
                >
                  <CardContent className="p-0">
                    {/* Card Image */}
                    {card.imageUris && (
                      <img
                        src={
                          typeof card.imageUris === 'object' &&
                          card.imageUris !== null &&
                          'normal' in card.imageUris
                            ? String(card.imageUris.normal)
                            : ''
                        }
                        alt={card.name}
                        className="w-full h-auto object-cover hover:opacity-90 transition-opacity"
                      />
                    )}

                    {/* Card Info */}
                    <div className="p-3 space-y-2">
                      <div className="font-medium text-text-primary text-sm truncate">
                        {card.name}
                      </div>
                      <div className="text-xs text-text-secondary truncate">
                        {card.setCode.toUpperCase()} #{card.collectorNumber}
                      </div>
                      <Badge className={getRarityBadgeClass(card.rarity)}>
                        {card.rarity}
                      </Badge>

                      {/* Keywords */}
                      {card.keywords && card.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {card.keywords.slice(0, 3).map((keyword: string) => (
                            <Badge
                              key={keyword}
                              className="bg-accent-lavender/20 text-accent-lavender text-xs"
                            >
                              {keyword}
                            </Badge>
                          ))}
                          {card.keywords.length > 3 && (
                            <Badge className="bg-surface-elevated text-text-secondary text-xs">
                              +{card.keywords.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Card Detail Modal */}
      <CardDetailModal
        open={detailModalOpen}
        onOpenChange={(open) => {
          setDetailModalOpen(open)
          if (!open) setSelectedCardId(null)
        }}
        cardId={selectedCardId}
      />
    </div>
  )
}
