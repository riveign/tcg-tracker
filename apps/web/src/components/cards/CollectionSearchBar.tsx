import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, X, Filter } from 'lucide-react'

interface SearchFilters {
  query: string
  colors?: string[]
  types?: string[]
  keywords?: string[]
  rarity?: string[]
}

interface CollectionSearchBarProps {
  onFiltersChange: (filters: SearchFilters) => void
  placeholder?: string
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
  'Hexproof',
  'Menace',
  'Reach',
]

export const CollectionSearchBar = ({ onFiltersChange, placeholder = 'Search your cards...' }: CollectionSearchBarProps) => {
  const [filters, setFilters] = useState<SearchFilters>({ query: '' })
  const [showFilters, setShowFilters] = useState(false)

  const updateFilters = (newFilters: SearchFilters) => {
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const toggleArrayFilter = <K extends keyof SearchFilters>(key: K, value: string) => {
    const current = (filters[key] as string[]) || []
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    updateFilters({
      ...filters,
      [key]: updated.length > 0 ? updated : undefined,
    })
  }

  const clearFilters = () => {
    updateFilters({ query: '' })
    setShowFilters(false)
  }

  const hasActiveFilters =
    filters.query ||
    (filters.colors && filters.colors.length > 0) ||
    (filters.types && filters.types.length > 0) ||
    (filters.keywords && filters.keywords.length > 0) ||
    (filters.rarity && filters.rarity.length > 0)

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <Input
            type="text"
            placeholder={placeholder}
            value={filters.query}
            onChange={(e) => updateFilters({ ...filters, query: e.target.value })}
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide' : 'Show'}
        </Button>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="icon" onClick={clearFilters}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="space-y-3 p-4 border border-surface-elevated rounded-lg bg-surface/50">
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
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-text-secondary">Active filters:</span>
          {filters.colors?.map((color) => {
            const colorInfo = COLORS.find((c) => c.value === color)
            return (
              <Badge key={color} className={colorInfo?.color}>
                {colorInfo?.label}
              </Badge>
            )
          })}
          {filters.types?.map((type) => (
            <Badge key={type} className="bg-accent-cyan/20 text-accent-cyan">
              {type}
            </Badge>
          ))}
          {filters.keywords?.map((keyword) => (
            <Badge key={keyword} className="bg-accent-lavender/20 text-accent-lavender">
              {keyword}
            </Badge>
          ))}
          {filters.rarity?.map((rarity) => {
            const rarityInfo = RARITIES.find((r) => r.value === rarity)
            return (
              <Badge key={rarity} className={rarityInfo?.color}>
                {rarityInfo?.label}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
