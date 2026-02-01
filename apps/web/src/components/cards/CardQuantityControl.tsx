import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Trash2, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc'

interface CardQuantityControlProps {
  collectionId: string
  cardId: string
  currentQuantity: number
  onUpdate?: (newQuantity: number) => void
  onRemove?: () => void
}

export const CardQuantityControl = ({
  collectionId,
  cardId,
  currentQuantity,
  onUpdate,
  onRemove,
}: CardQuantityControlProps) => {
  const [isUpdating, setIsUpdating] = useState(false)
  const utils = trpc.useUtils()

  const updateQuantityMutation = trpc.collections.updateCardQuantity.useMutation()
  const removeCardMutation = trpc.collections.removeCard.useMutation()

  const handleQuantityChange = async (delta: number) => {
    const newQuantity = currentQuantity + delta
    if (newQuantity < 1) return

    setIsUpdating(true)
    try {
      // Optimistic update
      const queryKey = { collectionId }
      const previousData = utils.collections.getCards.getData(queryKey)

      // Update cache optimistically
      if (previousData) {
        utils.collections.getCards.setData(queryKey, (old) =>
          old?.map((card) =>
            card.card.id === cardId
              ? { ...card, quantity: newQuantity }
              : card
          )
        )
      }

      // Notify parent immediately
      onUpdate?.(newQuantity)

      // Perform the mutation
      await updateQuantityMutation.mutateAsync({
        collectionId,
        cardId,
        quantity: newQuantity,
      })

      // Invalidate to get the final server state
      await utils.collections.getCards.invalidate({ collectionId })
    } catch (error) {
      console.error('Failed to update quantity:', error)
      // Rollback on error
      await utils.collections.getCards.invalidate({ collectionId })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this card from the collection?')) {
      return
    }

    setIsUpdating(true)
    try {
      // Optimistic update
      const queryKey = { collectionId }
      const previousData = utils.collections.getCards.getData(queryKey)

      // Remove from cache optimistically
      if (previousData) {
        utils.collections.getCards.setData(
          queryKey,
          previousData.filter((card) => card.card.id !== cardId)
        )
      }

      // Notify parent immediately
      onRemove?.()

      // Perform the mutation
      await removeCardMutation.mutateAsync({
        collectionId,
        cardId,
      })

      // Invalidate to get the final server state
      await utils.collections.getCards.invalidate({ collectionId })
    } catch (error) {
      console.error('Failed to remove card:', error)
      // Rollback on error
      await utils.collections.getCards.invalidate({ collectionId })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 bg-surface-elevated rounded-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => handleQuantityChange(-1)}
          disabled={currentQuantity <= 1 || isUpdating}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <div className="flex items-center justify-center min-w-[2rem] px-2">
          {isUpdating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span className="text-sm font-medium">{currentQuantity}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => handleQuantityChange(1)}
          disabled={isUpdating}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-400/10"
        onClick={handleRemove}
        disabled={isUpdating}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}
