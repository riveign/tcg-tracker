import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Globe, Lock } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { CollectionDialog } from '@/components/collections/CollectionDialog'

export const Collections = () => {
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<string | null>(null)

  const { data: collections, isLoading } = trpc.collections.list.useQuery()
  const deleteMutation = trpc.collections.delete.useMutation()
  const utils = trpc.useUtils()

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }

    await deleteMutation.mutateAsync({ id })
    utils.collections.list.invalidate()
  }

  const handleEdit = (id: string) => {
    setEditingCollection(id)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingCollection(null)
  }

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
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          New Collection
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-text-secondary">
          Loading collections...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && collections?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary mb-4">No collections yet</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create your first collection
          </Button>
        </div>
      )}

      {/* Collections grid */}
      {!isLoading && collections && collections.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Card
              key={collection.id}
              className="hover:border-accent-cyan transition-colors group cursor-pointer"
              onClick={() => navigate(`/collections/${collection.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-accent-cyan flex items-center gap-2">
                      {collection.name}
                      {collection.isPublic ? (
                        <Globe className="w-4 h-4 text-text-secondary" />
                      ) : (
                        <Lock className="w-4 h-4 text-text-secondary" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {collection.description || 'No description'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(collection.id)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(collection.id, collection.name)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
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
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Updated:</span>
                    <span className="text-text-primary font-medium">
                      {new Date(collection.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Collection Dialog */}
      <CollectionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        collectionId={editingCollection}
      />
    </div>
  )
}
