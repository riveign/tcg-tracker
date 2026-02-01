import { useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { FilterBar } from '@/components/cards/FilterBar'
import { CompleteCardGrid } from '@/components/cards/CompleteCardGrid'
import { CollectionStats } from '@/components/cards/CollectionStats'
import { CardDetailModal } from '@/components/cards/CardDetailModal'
import { CollectionSearchBar } from '@/components/cards/CollectionSearchBar'

interface Filters {
  colors?: string[]
  types?: string[]
  keywords?: string[]
  rarity?: string[]
  cmcMin?: number
  cmcMax?: number
}

interface SearchFilters {
  query: string
  colors?: string[]
  types?: string[]
  keywords?: string[]
  rarity?: string[]
}

export const Complete = () => {
  const [filters, setFilters] = useState<Filters>({})
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ query: '' })
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const { data, isLoading } = trpc.complete.getAll.useQuery({ filters })
  const { data: stats } = trpc.complete.getStats.useQuery()

  // Apply search filters to the results
  const filteredCards = useMemo(() => {
    if (!data?.cards) return []

    return data.cards.filter((cardData: any) => {
      const card = cardData.card

      // Text search
      if (searchFilters.query) {
        const query = searchFilters.query.toLowerCase()
        const matchesName = card.name.toLowerCase().includes(query)
        const matchesType = card.typeLine?.toLowerCase().includes(query)
        if (!matchesName && !matchesType) return false
      }

      // Color filter (from search bar)
      if (searchFilters.colors && searchFilters.colors.length > 0) {
        const hasMatchingColor = searchFilters.colors.some((color: string) =>
          card.colors.includes(color)
        )
        if (!hasMatchingColor) return false
      }

      // Type filter (from search bar)
      if (searchFilters.types && searchFilters.types.length > 0) {
        const hasMatchingType = searchFilters.types.some((type: string) =>
          card.types.includes(type)
        )
        if (!hasMatchingType) return false
      }

      // Keyword filter (from search bar)
      if (searchFilters.keywords && searchFilters.keywords.length > 0) {
        const hasAllKeywords = searchFilters.keywords.every((keyword: string) =>
          card.keywords.includes(keyword)
        )
        if (!hasAllKeywords) return false
      }

      // Rarity filter (from search bar)
      if (searchFilters.rarity && searchFilters.rarity.length > 0) {
        if (!searchFilters.rarity.includes(card.rarity)) return false
      }

      return true
    })
  }, [data?.cards, searchFilters])

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId)
    setDetailModalOpen(true)
  }

  const handleDetailModalClose = () => {
    setDetailModalOpen(false)
    setSelectedCardId(null)
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary font-display">
          Complete Collection
        </h1>
        <p className="text-text-secondary mt-1">
          View all your cards across all collections
        </p>
      </div>

      {/* Stats */}
      {stats && <CollectionStats stats={stats} />}

      {/* Search Bar */}
      <CollectionSearchBar
        onFiltersChange={setSearchFilters}
        placeholder="Search your complete collection..."
      />

      {/* Advanced Filters */}
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.cards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary mb-4">
            {filters.colors || filters.types || filters.rarity || filters.cmcMin || filters.cmcMax
              ? 'No cards match your filters'
              : 'No cards in your collection yet'}
          </p>
          {!filters.colors && !filters.types && !filters.rarity && (
            <p className="text-text-secondary text-sm">
              Start by creating a collection and adding some cards!
            </p>
          )}
        </div>
      )}

      {/* Results Summary */}
      {!isLoading && data && filteredCards.length > 0 && (
        <div className="text-sm text-text-secondary">
          {filteredCards.length !== data.cards.length ? (
            <>
              Showing {filteredCards.length} of {data.cards.length} unique card{data.cards.length !== 1 ? 's' : ''}
              {' '}({filteredCards.reduce((sum: number, c: any) => sum + c.totalQuantity, 0)} of {data.stats.totalCards} total)
            </>
          ) : (
            <>
              Showing {data.cards.length} unique card{data.cards.length !== 1 ? 's' : ''} (
              {data.stats.totalCards} total)
            </>
          )}
        </div>
      )}

      {/* No Results from Search */}
      {!isLoading && data && data.cards.length > 0 && filteredCards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary">No cards match your search</p>
        </div>
      )}

      {/* Card Grid */}
      {!isLoading && filteredCards.length > 0 && (
        <CompleteCardGrid cards={filteredCards} onCardClick={handleCardClick} />
      )}

      {/* Card Detail Modal */}
      <CardDetailModal
        open={detailModalOpen}
        onOpenChange={handleDetailModalClose}
        cardId={selectedCardId}
      />
    </div>
  )
}
