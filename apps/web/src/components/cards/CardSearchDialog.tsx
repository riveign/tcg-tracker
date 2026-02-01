import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CardSearch } from './CardSearch'
import { trpc } from '@/lib/trpc'
import { Minus, Plus } from 'lucide-react'

interface ScryfallCard {
  id: string
  name: string
  set_name: string
  image_uris?: {
    small?: string
    normal?: string
  }
}

interface CardSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionId?: string
  deckId?: string
  cardType?: 'mainboard' | 'sideboard' | 'commander'
}

export const CardSearchDialog = ({
  open,
  onOpenChange,
  collectionId,
  deckId,
  cardType = 'mainboard',
}: CardSearchDialogProps) => {
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const utils = trpc.useUtils()
  const addCardToCollectionMutation = trpc.collections.addCard.useMutation()
  const addCardToDeckMutation = trpc.decks.addCard.useMutation()

  const isDeckMode = !!deckId

  const handleCardSelect = (card: ScryfallCard) => {
    setSelectedCard(card)
  }

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta))
  }

  const handleAddCard = async () => {
    if (!selectedCard) return

    try {
      setIsSubmitting(true)

      if (isDeckMode && deckId) {
        // Add to deck
        await addCardToDeckMutation.mutateAsync({
          deckId,
          cardId: selectedCard.id,
          quantity,
          cardType,
        })

        // Invalidate deck queries to refresh
        await utils.decks.get.invalidate({ deckId })
        await utils.decks.analyze.invalidate({ deckId })
      } else if (collectionId) {
        // Add to collection
        await addCardToCollectionMutation.mutateAsync({
          collectionId,
          cardId: selectedCard.id,
          quantity,
        })

        // Invalidate collection cards query to refresh the list
        await utils.collections.getCards.invalidate({ collectionId })
      }

      // Reset and close
      setSelectedCard(null)
      setQuantity(1)
      onOpenChange(false)
    } catch (error) {
      console.error(`Failed to add card to ${isDeckMode ? 'deck' : 'collection'}:`, error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedCard(null)
    setQuantity(1)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isDeckMode ? `Add Cards to ${cardType === 'commander' ? 'Commander' : cardType === 'sideboard' ? 'Sideboard' : 'Mainboard'}` : 'Add Cards to Collection'}
          </DialogTitle>
          <DialogDescription>
            {isDeckMode ? `Search for cards and add them to your deck's ${cardType}` : 'Search for cards and add them to your collection'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Card Search */}
          {!selectedCard && (
            <CardSearch
              onCardSelect={handleCardSelect}
              placeholder="Search for a card by name..."
            />
          )}

          {/* Selected Card Preview */}
          {selectedCard && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-accent-cyan/30 rounded-lg bg-surface-elevated">
                <div className="flex gap-4">
                  {selectedCard.image_uris?.normal && (
                    <img
                      src={selectedCard.image_uris.normal}
                      alt={selectedCard.name}
                      className="w-32 h-auto rounded"
                    />
                  )}
                  <div>
                    <div className="font-medium text-text-primary text-lg">
                      {selectedCard.name}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {selectedCard.set_name}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCard(null)}
                >
                  Change Card
                </Button>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center w-20"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddCard}
            disabled={!selectedCard || isSubmitting}
          >
            {isSubmitting ? 'Adding...' : `Add ${quantity} Card${quantity > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
