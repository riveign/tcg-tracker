import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface CardData {
  card: {
    id: string
    name: string
    setCode: string
    collectorNumber: string
    rarity: string
    imageUris: unknown
  }
  totalQuantity: number
  collections: Array<{
    id: string
    name: string
    quantity: number
  }>
}

interface CompleteCardGridProps {
  cards: CardData[]
  onCardClick?: (cardId: string) => void
}

export const CompleteCardGrid = ({ cards, onCardClick }: CompleteCardGridProps) => {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleExpanded = (cardId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId)
    } else {
      newExpanded.add(cardId)
    }
    setExpandedCards(newExpanded)
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {cards.map((cardData) => {
        const isExpanded = expandedCards.has(cardData.card.id)

        return (
          <Card
            key={cardData.card.id}
            className="overflow-hidden hover:border-accent-cyan transition-colors"
          >
            <CardContent className="p-0">
              {/* Card Image */}
              {cardData.card.imageUris && (
                <div
                  className="relative cursor-pointer"
                  onClick={() => onCardClick?.(cardData.card.id)}
                >
                  <img
                    src={
                      typeof cardData.card.imageUris === 'object' &&
                      cardData.card.imageUris !== null &&
                      'normal' in cardData.card.imageUris
                        ? String(cardData.card.imageUris.normal)
                        : ''
                    }
                    alt={cardData.card.name}
                    className="w-full h-auto object-cover hover:opacity-90 transition-opacity"
                  />
                  {/* Total Quantity Badge */}
                  <div className="absolute bottom-2 right-2 bg-accent-cyan text-background font-bold px-2 py-1 rounded text-sm">
                    ×{cardData.totalQuantity}
                  </div>
                  {/* Multi-Collection Badge */}
                  {cardData.collections.length > 1 && (
                    <div className="absolute top-2 right-2 bg-accent-lavender text-background font-bold px-2 py-1 rounded text-xs">
                      {cardData.collections.length} collections
                    </div>
                  )}
                </div>
              )}

              {/* Card Info */}
              <div className="p-3 space-y-2">
                <div
                  className="cursor-pointer"
                  onClick={() => onCardClick?.(cardData.card.id)}
                >
                  <div className="font-medium text-text-primary text-sm truncate hover:text-accent-cyan transition-colors">
                    {cardData.card.name}
                  </div>
                  <div className="text-xs text-text-secondary truncate">
                    {cardData.card.setCode.toUpperCase()} #
                    {cardData.card.collectorNumber}
                  </div>
                </div>

                {/* Rarity Badge */}
                <Badge className={getRarityBadgeClass(cardData.card.rarity)}>
                  {cardData.card.rarity}
                </Badge>

                {/* Collection Breakdown */}
                {cardData.collections.length > 1 && (
                  <div className="border-t border-surface-elevated pt-2">
                    <button
                      onClick={() => toggleExpanded(cardData.card.id)}
                      className="flex items-center justify-between w-full text-xs text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <span>Collections</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1">
                        {cardData.collections.map((collection) => (
                          <div
                            key={collection.id}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-text-secondary truncate mr-2">
                              {collection.name}
                            </span>
                            <span className="text-text-primary font-medium">
                              ×{collection.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
