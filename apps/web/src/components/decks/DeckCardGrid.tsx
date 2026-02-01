import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardDetailModal } from '@/components/cards/CardDetailModal';
import { trpc } from '@/lib/trpc';

interface DeckCard {
  id: string;
  quantity: number;
  cardType: string;
  card: {
    id: string;
    name: string;
    setCode: string;
    collectorNumber: string;
    imageUris: unknown;
  };
}

interface DeckCardGridProps {
  deckId: string;
  cards: DeckCard[];
  cardType: 'mainboard' | 'sideboard' | 'commander';
}

export function DeckCardGrid({ deckId, cards, cardType }: DeckCardGridProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const utils = trpc.useUtils();

  const updateQuantityMutation = trpc.decks.updateCardQuantity.useMutation({
    onMutate: async ({ cardId, quantity }) => {
      // Cancel outgoing queries
      await utils.decks.get.cancel({ deckId });

      // Snapshot previous value
      const previousDeck = utils.decks.get.getData({ deckId });

      // Optimistically update
      utils.decks.get.setData({ deckId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          cards: old.cards.map((c) =>
            c.card.id === cardId && c.cardType === cardType
              ? { ...c, quantity }
              : c
          ),
        };
      });

      return { previousDeck };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousDeck) {
        utils.decks.get.setData({ deckId }, context.previousDeck);
      }
    },
    onSettled: () => {
      // Refetch to ensure data is correct
      utils.decks.get.invalidate({ deckId });
      utils.decks.analyze.invalidate({ deckId });
    },
  });

  const removeCardMutation = trpc.decks.removeCard.useMutation({
    onMutate: async ({ cardId }) => {
      await utils.decks.get.cancel({ deckId });
      const previousDeck = utils.decks.get.getData({ deckId });

      utils.decks.get.setData({ deckId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          cards: old.cards.filter(
            (c) => !(c.card.id === cardId && c.cardType === cardType)
          ),
        };
      });

      return { previousDeck };
    },
    onError: (err, variables, context) => {
      if (context?.previousDeck) {
        utils.decks.get.setData({ deckId }, context.previousDeck);
      }
    },
    onSettled: () => {
      utils.decks.get.invalidate({ deckId });
      utils.decks.analyze.invalidate({ deckId });
    },
  });

  const handleUpdateQuantity = (cardId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveCard(cardId);
      return;
    }

    updateQuantityMutation.mutate({
      deckId,
      cardId,
      quantity: newQuantity,
      cardType,
    });
  };

  const handleRemoveCard = (cardId: string) => {
    removeCardMutation.mutate({
      deckId,
      cardId,
      cardType,
    });
  };

  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId);
    setDetailModalOpen(true);
  };

  const handleDetailModalClose = () => {
    setDetailModalOpen(false);
    setSelectedCardId(null);
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {cards.map((deckCard) => (
          <Card
            key={deckCard.id}
            className="overflow-hidden hover:border-accent-cyan transition-colors group"
          >
            <CardContent className="p-0">
              {/* Card Image */}
              {deckCard.card.imageUris && (
                <div
                  className="relative cursor-pointer"
                  onClick={() => handleCardClick(deckCard.card.id)}
                >
                  <img
                    src={
                      typeof deckCard.card.imageUris === 'object' &&
                      deckCard.card.imageUris !== null &&
                      'normal' in deckCard.card.imageUris
                        ? String(deckCard.card.imageUris.normal)
                        : ''
                    }
                    alt={deckCard.card.name}
                    className="w-full h-auto object-cover hover:opacity-90 transition-opacity"
                  />
                  {/* Quantity Badge */}
                  <div className="absolute bottom-2 right-2 bg-accent-cyan text-background font-bold px-2 py-1 rounded text-sm">
                    ×{deckCard.quantity}
                  </div>
                </div>
              )}

              {/* Card Info and Controls */}
              <div className="p-3 space-y-2">
                <div
                  className="cursor-pointer"
                  onClick={() => handleCardClick(deckCard.card.id)}
                >
                  <div className="font-medium text-text-primary text-sm truncate hover:text-accent-cyan transition-colors">
                    {deckCard.card.name}
                  </div>
                  <div className="text-xs text-text-secondary truncate">
                    {deckCard.card.setCode.toUpperCase()} #
                    {deckCard.card.collectorNumber}
                  </div>
                </div>

                {/* Quantity Control */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        handleUpdateQuantity(
                          deckCard.card.id,
                          deckCard.quantity - 1
                        )
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <span className="text-sm font-medium text-text-primary min-w-[2ch] text-center">
                      {deckCard.quantity}
                    </span>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        handleUpdateQuantity(
                          deckCard.card.id,
                          deckCard.quantity + 1
                        )
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-300"
                      onClick={() => handleRemoveCard(deckCard.card.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Card Detail Modal */}
      <CardDetailModal
        open={detailModalOpen}
        onOpenChange={handleDetailModalClose}
        cardId={selectedCardId}
      />
    </>
  );
}
