import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2, Edit, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { CardSearchDialog } from '@/components/cards/CardSearchDialog';
import { DeckCardGrid } from '@/components/decks/DeckCardGrid';
import { DeckStats } from '@/components/decks/DeckStats';
import { DeckDialog } from '@/components/decks/DeckDialog';
import { RecommendationPanel, CollectionCoverage } from '@/components/recommendations';

export function DeckDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mainboard' | 'sideboard' | 'recommendations'>('mainboard');
  const [commanderSearchMode, setCommanderSearchMode] = useState(false);

  // Safe to use id! because queries are only enabled when id exists
  // and we have early return guard below at line 48-56
  const { data: deck, isLoading } = trpc.decks.get.useQuery(
    { deckId: id! },
    { enabled: !!id }
  );

  const { data: analytics } = trpc.decks.analyze.useQuery(
    { deckId: id! },
    { enabled: !!id }
  );

  // Get user's collections for recommendations fallback
  const { data: collections } = trpc.collections.list.useQuery();

  const deleteDeckMutation = trpc.decks.delete.useMutation({
    onSuccess: async () => {
      await utils.decks.list.invalidate();
      navigate('/decks');
    }
  });

  const utils = trpc.useUtils();

  const handleDelete = async () => {
    if (!deck) return;

    if (!confirm(`Are you sure you want to delete "${deck.name}"?`)) {
      return;
    }

    // Safe to use id! because we have deck loaded (checked above) which means id exists
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

  // Map deck format to recommendation format
  const getRecommendationFormat = (): 'standard' | 'modern' | 'commander' | 'brawl' | undefined => {
    if (!deck.format) return undefined;
    const format = deck.format.toLowerCase();
    if (format.includes('commander') || format.includes('edh')) return 'commander';
    if (format.includes('brawl')) return 'brawl';
    if (format.includes('modern')) return 'modern';
    if (format.includes('standard')) return 'standard';
    return undefined;
  };

  const recommendationFormat = getRecommendationFormat();

  // Use deck's linked collection, or fallback to user's first collection
  const recommendationCollectionId = deck.collectionId || collections?.[0]?.id;

  // At this point id is guaranteed to exist (early returns above handle missing id)
  // So all id! usages below in JSX are safe
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Commander</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSearchOpen(true);
                setCommanderSearchMode(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {commanderCards.length === 0 ? 'Set Commander' : 'Change Commander'}
            </Button>
          </div>
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

      {/* Tabs for Mainboard/Sideboard/Recommendations */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="mainboard">
              Mainboard ({mainboardCards.length})
            </TabsTrigger>
            <TabsTrigger value="sideboard">
              Sideboard ({sideboardCards.length})
            </TabsTrigger>
            {recommendationFormat && (
              <TabsTrigger value="recommendations" className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Suggestions
              </TabsTrigger>
            )}
          </TabsList>
          {activeTab !== 'recommendations' && (
            <Button onClick={() => setIsSearchOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Cards
            </Button>
          )}
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

        {recommendationFormat && (
          <TabsContent value="recommendations" className="space-y-6">
            {!recommendationCollectionId ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-text-secondary mb-4">
                    Create a collection with cards to get personalized recommendations.
                  </p>
                  <Button onClick={() => navigate('/collections')}>
                    Go to Collections
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {!deck.collectionId && (
                  <Card className="bg-accent-cyan/10 border-accent-cyan/30">
                    <CardContent className="p-4">
                      <p className="text-sm text-text-secondary">
                        💡 Using your first collection for recommendations. Link a specific collection to this deck for more targeted suggestions.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Collection Coverage */}
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-3">
                    Your Collection Coverage
                  </h3>
                  <CollectionCoverage
                    collectionId={recommendationCollectionId}
                    format={recommendationFormat}
                  />
                </div>

                {/* Card Recommendations */}
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-3">
                    Suggested Cards for {deck.format}
                  </h3>
                  <p className="text-sm text-text-secondary mb-4">
                    Based on your collection and this deck's format, here are cards that might improve your deck.
                  </p>
                  <RecommendationPanel
                    deckId={id!}
                    collectionId={recommendationCollectionId}
                    format={recommendationFormat}
                  />
                </div>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Add Card Dialog */}
      <CardSearchDialog
        open={isSearchOpen}
        onOpenChange={(open) => {
          setIsSearchOpen(open);
          if (!open) setCommanderSearchMode(false); // Reset commander mode when closing
        }}
        deckId={id}
        cardType={
          commanderSearchMode
            ? 'commander'
            : activeTab === 'recommendations'
            ? 'mainboard'
            : activeTab
        }
        collectionOnly={deck.collectionOnly}
        deckCollectionId={deck.collectionId}
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
