import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { trpc } from '@/lib/trpc'

const collectionFormSchema = z.object({
  name: z.string().min(1, 'Collection name is required').max(255),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
})

type CollectionFormValues = z.infer<typeof collectionFormSchema>

interface CollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionId?: string | null
}

export const CollectionDialog = ({
  open,
  onOpenChange,
  collectionId,
}: CollectionDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const utils = trpc.useUtils()
  const isEditing = Boolean(collectionId)

  const { data: collection } = trpc.collections.get.useQuery(
    { id: collectionId! },
    { enabled: isEditing && Boolean(collectionId) }
  )

  const createMutation = trpc.collections.create.useMutation()
  const updateMutation = trpc.collections.update.useMutation()

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      name: '',
      description: '',
      isPublic: false,
    },
  })

  // Update form when editing an existing collection
  useEffect(() => {
    if (collection) {
      form.reset({
        name: collection.name,
        description: collection.description || '',
        isPublic: collection.isPublic,
      })
    } else if (!isEditing) {
      form.reset({
        name: '',
        description: '',
        isPublic: false,
      })
    }
  }, [collection, isEditing, form])

  const onSubmit = async (values: CollectionFormValues) => {
    try {
      setIsSubmitting(true)

      if (isEditing && collectionId) {
        await updateMutation.mutateAsync({
          id: collectionId,
          ...values,
        })
      } else {
        await createMutation.mutateAsync(values)
      }

      // Refresh collections list
      await utils.collections.list.invalidate()

      // Close dialog and reset form
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Failed to save collection:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Collection' : 'Create New Collection'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your collection details'
              : 'Create a new collection to organize your cards'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Collection"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your collection..."
                      className="resize-none"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Public Collection</FormLabel>
                    <FormDescription className="text-xs">
                      Allow others to view this collection
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Saving...'
                  : isEditing
                  ? 'Save Changes'
                  : 'Create Collection'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
