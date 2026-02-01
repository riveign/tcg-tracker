import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card as CardComponent, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc'

interface CardDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardId: string | null
}

export const CardDetailModal = ({
  open,
  onOpenChange,
  cardId,
}: CardDetailModalProps) => {
  const { data: card, isLoading } = trpc.cards.getById.useQuery(
    { cardId: cardId! },
    { enabled: Boolean(cardId) && open }
  )

  const getColorBadgeClass = (color: string) => {
    const colorMap: Record<string, string> = {
      W: 'bg-yellow-100/20 text-yellow-300',
      U: 'bg-blue-400/20 text-blue-300',
      B: 'bg-gray-700/20 text-gray-300',
      R: 'bg-red-400/20 text-red-300',
      G: 'bg-green-400/20 text-green-300',
    }
    return colorMap[color] || 'bg-gray-500/20 text-gray-400'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Card Details</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
          </div>
        )}

        {!isLoading && card && (
          <div className="grid md:grid-cols-[auto_1fr] gap-6">
            {/* Card Image */}
            <div className="flex justify-center items-start md:justify-start">
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
                  className="rounded-lg shadow-lg w-full max-w-[300px] h-auto object-contain aspect-[5/7]"
                />
              )}
            </div>

            {/* Card Details */}
            <div className="space-y-4">
              {/* Name and Mana Cost */}
              <div>
                <h2 className="text-2xl font-bold text-text-primary">
                  {card.name}
                </h2>
                {card.manaCost && (
                  <div className="text-text-secondary mt-1">{card.manaCost}</div>
                )}
              </div>

              {/* Type Line */}
              <CardComponent>
                <CardContent className="p-3">
                  <div className="text-sm text-text-secondary">Type</div>
                  <div className="text-text-primary font-medium">
                    {card.typeLine}
                  </div>
                </CardContent>
              </CardComponent>

              {/* Oracle Text */}
              {card.oracleText && (
                <CardComponent>
                  <CardContent className="p-3">
                    <div className="text-sm text-text-secondary mb-2">
                      Card Text
                    </div>
                    <div className="text-text-primary text-sm whitespace-pre-line">
                      {card.oracleText}
                    </div>
                  </CardContent>
                </CardComponent>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {/* Power/Toughness */}
                {card.power && card.toughness && (
                  <CardComponent>
                    <CardContent className="p-3">
                      <div className="text-sm text-text-secondary">P/T</div>
                      <div className="text-text-primary font-medium">
                        {card.power}/{card.toughness}
                      </div>
                    </CardContent>
                  </CardComponent>
                )}

                {/* Loyalty */}
                {card.loyalty && (
                  <CardComponent>
                    <CardContent className="p-3">
                      <div className="text-sm text-text-secondary">Loyalty</div>
                      <div className="text-text-primary font-medium">
                        {card.loyalty}
                      </div>
                    </CardContent>
                  </CardComponent>
                )}

                {/* CMC */}
                <CardComponent>
                  <CardContent className="p-3">
                    <div className="text-sm text-text-secondary">Mana Value</div>
                    <div className="text-text-primary font-medium">
                      {card.cmc}
                    </div>
                  </CardContent>
                </CardComponent>

                {/* Rarity */}
                <CardComponent>
                  <CardContent className="p-3">
                    <div className="text-sm text-text-secondary mb-1">Rarity</div>
                    <Badge className={getRarityBadgeClass(card.rarity)}>
                      {card.rarity}
                    </Badge>
                  </CardContent>
                </CardComponent>
              </div>

              {/* Set Info */}
              <CardComponent>
                <CardContent className="p-3">
                  <div className="text-sm text-text-secondary">Set</div>
                  <div className="text-text-primary font-medium">
                    {card.setName} ({card.setCode.toUpperCase()}) #
                    {card.collectorNumber}
                  </div>
                </CardContent>
              </CardComponent>

              {/* Colors */}
              {card.colors && card.colors.length > 0 && (
                <CardComponent>
                  <CardContent className="p-3">
                    <div className="text-sm text-text-secondary mb-2">Colors</div>
                    <div className="flex gap-2 flex-wrap">
                      {card.colors.map((color) => (
                        <Badge key={color} className={getColorBadgeClass(color)}>
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </CardComponent>
              )}

              {/* Flavor Text */}
              {card.flavorText && (
                <CardComponent>
                  <CardContent className="p-3">
                    <div className="text-sm text-text-secondary mb-2">
                      Flavor Text
                    </div>
                    <div className="text-text-primary text-sm italic">
                      {card.flavorText}
                    </div>
                  </CardContent>
                </CardComponent>
              )}

              {/* Artist */}
              {card.artist && (
                <div className="text-sm text-text-secondary">
                  Illustrated by {card.artist}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
