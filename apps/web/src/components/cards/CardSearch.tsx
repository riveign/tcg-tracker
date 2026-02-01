import { useState, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { useDebounce } from '@/hooks/useDebounce'

interface ScryfallCard {
  id: string
  name: string
  set_name: string
  set: string
  collector_number: string
  rarity: string
  image_uris?: {
    small?: string
    normal?: string
  }
  mana_cost?: string
  type_line: string
}

interface CardSearchProps {
  onCardSelect: (card: ScryfallCard) => void
  placeholder?: string
}

export const CardSearch = ({ onCardSelect, placeholder = 'Search for a card...' }: CardSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 500)

  const { data, isLoading, error } = trpc.cards.search.useQuery(
    { query: debouncedSearch, page: 1 },
    { enabled: debouncedSearch.length > 0 }
  )

  const handleCardClick = useCallback(
    (card: ScryfallCard) => {
      onCardSelect(card)
      setSearchQuery('')
    },
    [onCardSelect]
  )

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary animate-spin" />
        )}
      </div>

      {/* Results */}
      {searchQuery && (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {isLoading && (
            <div className="text-center py-8 text-text-secondary">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-400">
              Error searching cards. Please try again.
            </div>
          )}

          {!isLoading && data && data.cards.length === 0 && (
            <div className="text-center py-8 text-text-secondary">
              No cards found for "{searchQuery}"
            </div>
          )}

          {!isLoading && data && data.cards.length > 0 && (
            <>
              <div className="text-xs text-text-secondary mb-2">
                Found {data.total} cards
              </div>
              {data.cards.map((card) => (
                <Card
                  key={card.id}
                  className="cursor-pointer hover:border-accent-cyan transition-colors"
                  onClick={() => handleCardClick(card)}
                >
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      {/* Card Image */}
                      {card.image_uris?.small && (
                        <img
                          src={card.image_uris.small}
                          alt={card.name}
                          className="w-16 h-auto rounded object-cover"
                        />
                      )}

                      {/* Card Details */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-primary truncate">
                          {card.name}
                        </div>
                        <div className="text-xs text-text-secondary truncate">
                          {card.type_line}
                        </div>
                        <div className="text-xs text-text-secondary mt-1">
                          {card.set_name} ({card.set.toUpperCase()}) #{card.collector_number}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              card.rarity === 'mythic'
                                ? 'bg-orange-500/20 text-orange-400'
                                : card.rarity === 'rare'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : card.rarity === 'uncommon'
                                ? 'bg-gray-500/20 text-gray-400'
                                : 'bg-gray-600/20 text-gray-500'
                            }`}
                          >
                            {card.rarity}
                          </span>
                          {card.mana_cost && (
                            <span className="text-xs text-text-secondary">
                              {card.mana_cost}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {data.hasMore && (
                <div className="text-xs text-center text-text-secondary py-2">
                  Showing first page of results
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
