import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

const COLORS = [
  { value: 'W', label: 'White', color: 'bg-yellow-100/20 text-yellow-300' },
  { value: 'U', label: 'Blue', color: 'bg-blue-400/20 text-blue-300' },
  { value: 'B', label: 'Black', color: 'bg-gray-700/20 text-gray-300' },
  { value: 'R', label: 'Red', color: 'bg-red-400/20 text-red-300' },
  { value: 'G', label: 'Green', color: 'bg-green-400/20 text-green-300' },
]

const TYPES = [
  'Creature',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Planeswalker',
  'Land',
]

const RARITIES = [
  { value: 'common', label: 'Common', color: 'bg-gray-600/20 text-gray-500' },
  { value: 'uncommon', label: 'Uncommon', color: 'bg-gray-500/20 text-gray-400' },
  { value: 'rare', label: 'Rare', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'mythic', label: 'Mythic', color: 'bg-orange-500/20 text-orange-400' },
]

interface Filters {
  colors?: string[]
  types?: string[]
  rarity?: string[]
  cmcMin?: number
  cmcMax?: number
}

interface FilterBarProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
}

export const FilterBar = ({ filters, onFiltersChange }: FilterBarProps) => {
  const [expanded, setExpanded] = useState(false)

  const toggleColor = (color: string) => {
    const colors = filters.colors || []
    const newColors = colors.includes(color)
      ? colors.filter((c) => c !== color)
      : [...colors, color]
    onFiltersChange({ ...filters, colors: newColors.length > 0 ? newColors : undefined })
  }

  const toggleType = (type: string) => {
    const types = filters.types || []
    const newTypes = types.includes(type)
      ? types.filter((t) => t !== type)
      : [...types, type]
    onFiltersChange({ ...filters, types: newTypes.length > 0 ? newTypes : undefined })
  }

  const toggleRarity = (rarity: string) => {
    const rarities = filters.rarity || []
    const newRarities = rarities.includes(rarity)
      ? rarities.filter((r) => r !== rarity)
      : [...rarities, rarity]
    onFiltersChange({
      ...filters,
      rarity: newRarities.length > 0 ? newRarities : undefined,
    })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters =
    (filters.colors && filters.colors.length > 0) ||
    (filters.types && filters.types.length > 0) ||
    (filters.rarity && filters.rarity.length > 0) ||
    filters.cmcMin !== undefined ||
    filters.cmcMax !== undefined

  return (
    <div className="space-y-3">
      {/* Toggle and Clear */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide Filters' : 'Show Filters'}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Filter Options */}
      {expanded && (
        <div className="space-y-4 p-4 border border-surface-elevated rounded-lg bg-surface/50">
          {/* Colors */}
          <div>
            <div className="text-sm font-medium text-text-secondary mb-2">
              Colors
            </div>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <Badge
                  key={color.value}
                  className={`cursor-pointer ${
                    filters.colors?.includes(color.value)
                      ? color.color
                      : 'bg-surface-elevated text-text-secondary'
                  }`}
                  onClick={() => toggleColor(color.value)}
                >
                  {color.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Types */}
          <div>
            <div className="text-sm font-medium text-text-secondary mb-2">
              Card Types
            </div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((type) => (
                <Badge
                  key={type}
                  className={`cursor-pointer ${
                    filters.types?.includes(type)
                      ? 'bg-accent-cyan/20 text-accent-cyan'
                      : 'bg-surface-elevated text-text-secondary'
                  }`}
                  onClick={() => toggleType(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Rarity */}
          <div>
            <div className="text-sm font-medium text-text-secondary mb-2">
              Rarity
            </div>
            <div className="flex flex-wrap gap-2">
              {RARITIES.map((rarity) => (
                <Badge
                  key={rarity.value}
                  className={`cursor-pointer ${
                    filters.rarity?.includes(rarity.value)
                      ? rarity.color
                      : 'bg-surface-elevated text-text-secondary'
                  }`}
                  onClick={() => toggleRarity(rarity.value)}
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
                  onFiltersChange({
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
                  onFiltersChange({
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
    </div>
  )
}
