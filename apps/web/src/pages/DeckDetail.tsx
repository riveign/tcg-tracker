import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2, Edit } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { CardSearchDialog } from '@/components/cards/CardSearchDialog';
import { DeckCardGrid } from '@/components/decks/DeckCardGrid';
import { DeckStats } from '@/components/decks/DeckStats';
import { DeckDialog } from '@/components/decks/DeckDialog';

export function DeckDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mainboard' | 'sideboard'>('mainboard');

  const { data: deck, isLoading } = trpc.decks.get.useQuery(
    { deckId: id! },
    { enabled: !!id }
  );

  const { data: analytics } = trpc.decks.analyze.useQuery(
    { deckId: id! },
    { enabled: !!id }
  );

  const deleteDeckMutation = trpc.decks.delete.useMutation({
    onSuccess: () => {
      navigate('/decks');
    }
  });

  const utils = trpc.useUtils();

  const handleDelete = async () => {
    if (!deck) return;

    if (!confirm(`Are you sure you want to delete "${deck.name}"?`)) {
      return;
    }

    await deleteDeckMutation.mutateAsync({ deckId: id! });
  };

  if (!id) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12 text-red-400">
          Invalid deck ID
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12 text-red-400">
          Deck not found
        </div>
      </div>
    );
  }

  const mainboardCards = deck.cards.filter(c => c.cardType === 'mainboard');
  const sideboardCards = deck.cards.filter(c => c.cardType === 'sideboard');
  const commanderCards = deck.cards.filter(c => c.cardType === 'commander');

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/decks')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Decks
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary font-display">
              {deck.name}
            </h1>
            {deck.format && (
              <p className="text-sm text-accent-lavender font-medium mt-1">
                {deck.format}
              </p>
            )}
            {deck.description && (
              <p className="text-text-secondary mt-1">
                {deck.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsEditOpen(true)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        {analytics && (
          <DeckStats analytics={analytics} />
        )}
      </div>

      {/* Commander Section (if Commander format) */}
      {deck.format === 'Commander' && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">Commander</h2>
          {commanderCards.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center text-text-secondary">
                No commander selected
              </CardContent>
            </Card>
          ) : (
            <DeckCardGrid
              deckId={id!}
              cards={commanderCards}
              cardType="commander"
            />
          )}
        </div>
      )}

      {/* Tabs for Mainboard/Sideboard */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="mainboard">
              Mainboard ({mainboardCards.length})
            </TabsTrigger>
            <TabsTrigger value="sideboard">
              Sideboard ({sideboardCards.length})
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setIsSearchOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Cards
          </Button>
        </div>

        <TabsContent value="mainboard">
          {mainboardCards.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-text-secondary mb-4">No cards in mainboard yet</p>
                <Button onClick={() => setIsSearchOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first card
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DeckCardGrid
              deckId={id!}
              cards={mainboardCards}
              cardType="mainboard"
            />
          )}
        </TabsContent>

        <TabsContent value="sideboard">
          {sideboardCards.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-text-secondary mb-4">No cards in sideboard yet</p>
                <Button onClick={() => setIsSearchOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add sideboard cards
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DeckCardGrid
              deckId={id!}
              cards={sideboardCards}
              cardType="sideboard"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Add Card Dialog */}
      <CardSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        deckId={id}
        cardType={activeTab}
      />

      {/* Edit Deck Dialog */}
      <DeckDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        deckId={id}
      />
    </div>
  );
}
