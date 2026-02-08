import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardSearch } from '@/components/cards/CardSearch'
import { X } from 'lucide-react'

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
  color_identity?: string[]
}

interface CommanderSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentCommander?: {
    id: string
    name: string
    imageUrl?: string
    colorIdentity?: string[]
  } | null
  onSelect: (commander: ScryfallCard | null) => void
  collectionId?: string | null
  collectionOnly?: boolean
}

const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
}

const getColorBadgeClass = (color: string): string => {
  const colorMap: Record<string, string> = {
    W: 'bg-yellow-100/20 text-yellow-300 border-yellow-300/30',
    U: 'bg-blue-400/20 text-blue-300 border-blue-300/30',
    B: 'bg-gray-700/20 text-gray-300 border-gray-300/30',
    R: 'bg-red-400/20 text-red-300 border-red-300/30',
    G: 'bg-green-400/20 text-green-300 border-green-300/30',
  }
  return colorMap[color] || 'bg-gray-500/20 text-gray-400 border-gray-400/30'
}

/**
 * Validates if a card can be used as a commander.
 * Checks for legendary creature type or "can be your commander" text.
 */
const canBeCommander = (card: ScryfallCard): boolean => {
  const typeLine = card.type_line.toLowerCase()

  // Check for legendary creature
  const isLegendary = typeLine.includes('legendary')
  const isCreature = typeLine.includes('creature')

  if (isLegendary && isCreature) {
    return true
  }

  // Note: Some planeswalkers can be commanders if they have "can be your commander"
  // in their oracle text. The backend will validate this on submission.
  // We allow the selection here and let backend validation provide the final check.

  return false
}

export const CommanderSelector = ({
  open,
  onOpenChange,
  currentCommander,
  onSelect,
  collectionId,
  collectionOnly = false,
}: CommanderSelectorProps) => {
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null)

  const handleCardSelect = useCallback((card: ScryfallCard) => {
    if (!canBeCommander(card)) {
      // Card cannot be a commander - could show a toast here
      return
    }
    setSelectedCard(card)
  }, [])

  const handleConfirm = useCallback(() => {
    if (selectedCard) {
      onSelect(selectedCard)
      setSelectedCard(null)
      onOpenChange(false)
    }
  }, [selectedCard, onSelect, onOpenChange])

  const handleClear = useCallback(() => {
    onSelect(null)
    setSelectedCard(null)
    onOpenChange(false)
  }, [onSelect, onOpenChange])

  const handleClose = useCallback(() => {
    setSelectedCard(null)
    onOpenChange(false)
  }, [onOpenChange])

  const displayCard = selectedCard || (currentCommander ? {
    id: currentCommander.id,
    name: currentCommander.name,
    image_uris: currentCommander.imageUrl ? { normal: currentCommander.imageUrl } : undefined,
    color_identity: currentCommander.colorIdentity,
  } as ScryfallCard : null)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Commander</DialogTitle>
          <DialogDescription>
            {collectionOnly
              ? "Search for a legendary creature from your collection to use as your commander."
              : "Search for a legendary creature to use as your commander. Only legendary creatures (and some planeswalkers) can be commanders."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search - always show to allow changing selection */}
          <CardSearch
            onCardSelect={handleCardSelect}
            placeholder={
              collectionOnly
                ? "Search for legendary creatures in your collection..."
                : "Search for legendary creatures..."
            }
            useCollectionSearch={collectionOnly}
            collectionId={collectionId}
          />

          {/* Selected Commander Preview */}
          {displayCard && (
            <div className="p-4 border border-accent-cyan/30 rounded-lg bg-surface-elevated space-y-3">
              <div className="flex items-start gap-4">
                {displayCard.image_uris?.normal && (
                  <img
                    src={displayCard.image_uris.normal}
                    alt={displayCard.name}
                    className="w-24 h-auto rounded shadow-lg"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary text-lg">
                    {displayCard.name}
                  </div>
                  {displayCard.type_line && (
                    <div className="text-sm text-text-secondary mt-1">
                      {displayCard.type_line}
                    </div>
                  )}

                  {/* Color Identity */}
                  {displayCard.color_identity && displayCard.color_identity.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-text-secondary mb-1.5">Color Identity</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {displayCard.color_identity.map((color) => (
                          <Badge
                            key={color}
                            variant="outline"
                            className={getColorBadgeClass(color)}
                          >
                            {COLOR_NAMES[color] || color}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {displayCard.color_identity?.length === 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-text-secondary mb-1.5">Color Identity</div>
                      <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-400/30">
                        Colorless
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Clear button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCard(null)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleClear}
            className="text-red-400 hover:text-red-300"
          >
            Remove Commander
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedCard}
            >
              Set Commander
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
