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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc'

const deckFormSchema = z.object({
  name: z.string().min(1, 'Deck name is required').max(255),
  description: z.string().optional(),
  format: z.enum(['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other']).optional(),
  collectionOnly: z.boolean().default(false),
})

type DeckFormValues = z.infer<typeof deckFormSchema>

interface DeckDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId?: string | null
}

export const DeckDialog = ({
  open,
  onOpenChange,
  deckId,
}: DeckDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const utils = trpc.useUtils()
  const isEditing = Boolean(deckId)

  const { data: deck } = trpc.decks.get.useQuery(
    { deckId: deckId! },
    { enabled: isEditing && Boolean(deckId) }
  )

  const createMutation = trpc.decks.create.useMutation()
  const updateMutation = trpc.decks.update.useMutation()

  const form = useForm<DeckFormValues>({
    resolver: zodResolver(deckFormSchema),
    defaultValues: {
      name: '',
      description: '',
      format: undefined,
      collectionOnly: false,
    },
  })

  // Update form when editing an existing deck
  useEffect(() => {
    if (deck) {
      form.reset({
        name: deck.name,
        description: deck.description || '',
        format: deck.format as any || undefined,
        collectionOnly: deck.collectionOnly || false,
      })
    } else if (!isEditing) {
      form.reset({
        name: '',
        description: '',
        format: undefined,
        collectionOnly: false,
      })
    }
  }, [deck, isEditing, form])

  const onSubmit = async (values: DeckFormValues) => {
    try {
      setIsSubmitting(true)

      if (isEditing && deckId) {
        await updateMutation.mutateAsync({
          deckId,
          ...values,
        })
      } else {
        await createMutation.mutateAsync(values)
      }

      // Refresh decks list
      await utils.decks.list.invalidate()

      // Close dialog and reset form
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Failed to save deck:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Deck' : 'Create New Deck'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your deck details'
              : 'Create a new deck to build and test'}
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
                      placeholder="My Deck"
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
                      placeholder="Describe your deck strategy..."
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
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format (optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Modern">Modern</SelectItem>
                      <SelectItem value="Commander">Commander</SelectItem>
                      <SelectItem value="Legacy">Legacy</SelectItem>
                      <SelectItem value="Vintage">Vintage</SelectItem>
                      <SelectItem value="Pioneer">Pioneer</SelectItem>
                      <SelectItem value="Pauper">Pauper</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    The Magic format this deck is built for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="collectionOnly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Collection Cards Only</FormLabel>
                    <FormDescription className="text-xs">
                      Only allow cards from your collections in this deck
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
                  : 'Create Deck'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
