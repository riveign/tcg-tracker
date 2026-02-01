import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { CardSearchDialog } from '@/components/cards/CardSearchDialog'
import { CardQuantityControl } from '@/components/cards/CardQuantityControl'
import { CardDetailModal } from '@/components/cards/CardDetailModal'
import { CollectionSearchBar } from '@/components/cards/CollectionSearchBar'

interface SearchFilters {
  query: string
  colors?: string[]
  types?: string[]
  keywords?: string[]
  rarity?: string[]
}

export const CollectionDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ query: '' })

  const { data: collection, isLoading: collectionLoading } = trpc.collections.get.useQuery(
    { id: id! },
    { enabled: Boolean(id) }
  )

  const { data: cards, isLoading: cardsLoading } = trpc.collections.getCards.useQuery(
    { collectionId: id! },
    { enabled: Boolean(id) }
  )

  // Filter cards based on search - MUST be called before any conditional returns
  const filteredCards = useMemo(() => {
    if (!cards) return []

    return cards.filter((collectionCard: any) => {
      const card = collectionCard.card

      // Text search
      if (searchFilters.query) {
        const query = searchFilters.query.toLowerCase()
        const matchesName = card.name.toLowerCase().includes(query)
        const matchesType = card.typeLine.toLowerCase().includes(query)
        if (!matchesName && !matchesType) return false
      }

      // Color filter
      if (searchFilters.colors && searchFilters.colors.length > 0) {
        const hasMatchingColor = searchFilters.colors.some((color: string) =>
          card.colors.includes(color)
        )
        if (!hasMatchingColor) return false
      }

      // Type filter
      if (searchFilters.types && searchFilters.types.length > 0) {
        const hasMatchingType = searchFilters.types.some((type: string) =>
          card.types.includes(type)
        )
        if (!hasMatchingType) return false
      }

      // Keyword filter
      if (searchFilters.keywords && searchFilters.keywords.length > 0) {
        const hasAllKeywords = searchFilters.keywords.every((keyword: string) =>
          card.keywords.includes(keyword)
        )
        if (!hasAllKeywords) return false
      }

      // Rarity filter
      if (searchFilters.rarity && searchFilters.rarity.length > 0) {
        if (!searchFilters.rarity.includes(card.rarity)) return false
      }

      return true
    })
  }, [cards, searchFilters])

  const totalCards = cards?.reduce((sum: number, card: { quantity: number }) => sum + card.quantity, 0) || 0
  const uniqueCards = cards?.length || 0
  const filteredTotalCards = filteredCards.reduce((sum: number, card: { quantity: number }) => sum + card.quantity, 0)

  // Conditional renders AFTER all hooks
  if (!id) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12 text-red-400">
          Invalid collection ID
        </div>
      </div>
    )
  }

  if (collectionLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12 text-red-400">
          Collection not found
        </div>
      </div>
    )
  }

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId)
    setDetailModalOpen(true)
  }

  const handleDetailModalClose = () => {
    setDetailModalOpen(false)
    setSelectedCardId(null)
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/collections')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collections
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary font-display">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-text-secondary mt-1">
                {collection.description}
              </p>
            )}
          </div>
          <Button onClick={() => setSearchDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Cards
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-text-secondary">Total Cards</div>
              <div className="text-2xl font-bold text-text-primary">
                {totalCards}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-text-secondary">Unique Cards</div>
              <div className="text-2xl font-bold text-text-primary">
                {uniqueCards}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filter */}
      <CollectionSearchBar onFiltersChange={setSearchFilters} />

      {/* Cards Grid */}
      {cardsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-accent-cyan" />
        </div>
      )}

      {!cardsLoading && cards && cards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary mb-4">No cards in this collection yet</p>
          <Button onClick={() => setSearchDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add your first card
          </Button>
        </div>
      )}

      {/* Filtered Results Summary */}
      {!cardsLoading && cards && cards.length > 0 && filteredCards.length !== cards.length && (
        <div className="text-sm text-text-secondary">
          Showing {filteredCards.length} of {cards.length} cards ({filteredTotalCards} of {totalCards} total)
        </div>
      )}

      {/* No Results from Filter */}
      {!cardsLoading && cards && cards.length > 0 && filteredCards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary">No cards match your search filters</p>
        </div>
      )}

      {!cardsLoading && filteredCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredCards.map((collectionCard: {
            id: string
            quantity: number
            card: {
              id: string
              name: string
              setCode: string
              collectorNumber: string
              imageUris: unknown
            }
          }) => (
            <Card
              key={collectionCard.id}
              className="overflow-hidden hover:border-accent-cyan transition-colors group"
            >
              <CardContent className="p-0">
                {/* Card Image */}
                {collectionCard.card.imageUris && (
                  <div
                    className="relative cursor-pointer"
                    onClick={() => handleCardClick(collectionCard.card.id)}
                  >
                    <img
                      src={
                        typeof collectionCard.card.imageUris === 'object' &&
                        collectionCard.card.imageUris !== null &&
                        'normal' in collectionCard.card.imageUris
                          ? String(collectionCard.card.imageUris.normal)
                          : ''
                      }
                      alt={collectionCard.card.name}
                      className="w-full h-auto object-cover hover:opacity-90 transition-opacity"
                    />
                    {/* Quantity Badge */}
                    <div className="absolute bottom-2 right-2 bg-accent-cyan text-background font-bold px-2 py-1 rounded text-sm">
                      ×{collectionCard.quantity}
                    </div>
                  </div>
                )}

                {/* Card Info and Controls */}
                <div className="p-3 space-y-2">
                  <div
                    className="cursor-pointer"
                    onClick={() => handleCardClick(collectionCard.card.id)}
                  >
                    <div className="font-medium text-text-primary text-sm truncate hover:text-accent-cyan transition-colors">
                      {collectionCard.card.name}
                    </div>
                    <div className="text-xs text-text-secondary truncate">
                      {collectionCard.card.setCode.toUpperCase()} #
                      {collectionCard.card.collectorNumber}
                    </div>
                  </div>

                  {/* Quantity Control */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <CardQuantityControl
                      collectionId={id!}
                      cardId={collectionCard.card.id}
                      currentQuantity={collectionCard.quantity}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Card Dialog */}
      <CardSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        collectionId={id}
      />

      {/* Card Detail Modal */}
      <CardDetailModal
        open={detailModalOpen}
        onOpenChange={handleDetailModalClose}
        cardId={selectedCardId}
      />
    </div>
  )
}
