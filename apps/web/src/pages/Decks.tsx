import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { DeckDialog } from '../components/decks/DeckDialog';
import { useNavigate } from 'react-router-dom';

export function Decks() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: decks, isLoading } = trpc.decks.list.useQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-text-primary font-display">My Decks</h1>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Deck
        </Button>
      </div>

      {decks && decks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary mb-4">You don't have any decks yet.</p>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Deck
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks?.map((deck) => (
            <Card
              key={deck.id}
              className="cursor-pointer hover:border-accent-cyan transition-colors group"
              onClick={() => navigate(`/decks/${deck.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-text-primary group-hover:text-accent-cyan transition-colors">
                  {deck.name}
                </CardTitle>
                {deck.format && (
                  <div className="text-sm font-medium text-accent-lavender">
                    {deck.format}
                  </div>
                )}
              </CardHeader>
              {deck.description && (
                <CardContent>
                  <p className="text-sm text-text-secondary line-clamp-2">
                    {deck.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <DeckDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
