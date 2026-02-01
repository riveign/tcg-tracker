import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const Build = () => {
  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary font-display">
            Deck Builder
          </h1>
          <p className="text-text-secondary mt-1">
            Create and manage your decks
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Deck
        </Button>
      </div>

      {/* Decks grid - placeholder */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:border-accent-lavender transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="text-accent-lavender">Sample Deck</CardTitle>
            <CardDescription>Commander / EDH</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Main Deck:</span>
                <span className="text-text-primary font-medium">0 / 60</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Sideboard:</span>
                <span className="text-text-primary font-medium">0 / 15</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Avg. CMC:</span>
                <span className="text-text-primary font-medium">0.00</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
