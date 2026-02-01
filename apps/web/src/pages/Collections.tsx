import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const Collections = () => {
  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary font-display">
            Collections
          </h1>
          <p className="text-text-secondary mt-1">
            Manage your card collections
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Collection
        </Button>
      </div>

      {/* Collections grid - placeholder */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:border-accent-cyan transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="text-accent-cyan">Main Collection</CardTitle>
            <CardDescription>Your primary card collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Total Cards:</span>
                <span className="text-text-primary font-medium">0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Unique Cards:</span>
                <span className="text-text-primary font-medium">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
