import { useEffect, useState, useMemo } from 'react'
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
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'
import { CommanderDeckForm } from './CommanderDeckForm'
import { ConstructedDeckForm } from './ConstructedDeckForm'
import { ColorIdentityDisplay } from './ColorPicker'

const deckFormSchema = z.object({
  name: z.string().min(1, 'Deck name is required').max(255),
  description: z.string().optional(),
  format: z.enum(['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other']).optional(),
  collectionOnly: z.boolean().default(false),
  collectionId: z.string().uuid().optional().nullable(),
  // New fields for commander/metadata
  colors: z.array(z.enum(['W', 'U', 'B', 'R', 'G'])).default([]),
  strategy: z.string().max(50).optional().nullable(),
  // Internal fields for commander selection (not sent to API directly)
  _selectedCommander: z.any().optional().nullable(),
  _commanderScryfallId: z.string().optional().nullable(),
})

const FORMATS = ['Standard', 'Modern', 'Commander', 'Legacy', 'Vintage', 'Pioneer', 'Pauper', 'Other'] as const

type Step = 1 | 2 | 3

const TOTAL_STEPS = 3

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
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const utils = trpc.useUtils()
  const isEditing = Boolean(deckId)

  // Safe to use deckId! because query is only enabled when isEditing && Boolean(deckId)
  const { data: deck } = trpc.decks.get.useQuery(
    { deckId: deckId! },
    { enabled: isEditing && Boolean(deckId) }
  )

  const { data: collections = [] } = trpc.collections.list.useQuery()

  const addCardMutation = trpc.decks.addCard.useMutation()

  const createMutation = trpc.decks.create.useMutation()
  const updateMutation = trpc.decks.update.useMutation()

  const form = useForm<DeckFormValues>({
    resolver: zodResolver(deckFormSchema),
    defaultValues: {
      name: '',
      description: '',
      format: undefined,
      collectionOnly: false,
      collectionId: null,
      colors: [],
      strategy: null,
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
        collectionId: deck.collectionId || null,
        colors: (deck.colors as string[]) || [],
        strategy: deck.strategy || null,
        // For editing, we don't have the full commander object
        _selectedCommander: null,
        _commanderScryfallId: null,
      })
    } else if (!isEditing) {
      form.reset({
        name: '',
        description: '',
        format: undefined,
        collectionOnly: false,
        collectionId: null,
        colors: [],
        strategy: null,
        _selectedCommander: null,
        _commanderScryfallId: null,
      })
      setCurrentStep(1)
    }
  }, [deck, isEditing, form])

  // Reset step when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1)
    }
  }, [open])

  const selectedFormat = form.watch('format')
  const isCommanderFormat = selectedFormat === 'Commander'
  const nameValue = form.watch('name')
  const formatValue = form.watch('format')

  // Step validation
  const canAdvanceFromStep1 = useMemo(() => {
    return nameValue?.trim().length > 0 && formatValue !== undefined
  }, [nameValue, formatValue])

  const canAdvanceFromStep2 = true // Step 2 fields are optional

  const onSubmit = async (values: DeckFormValues) => {
    // Prevent submission if not on final step (unless editing)
    if (!isEditing && currentStep < TOTAL_STEPS) {
      return
    }

    try {
      setIsSubmitting(true)

      // Remove internal fields before sending to API
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _selectedCommander, _commanderScryfallId, ...apiValues } = values

      if (isEditing && deckId) {
        await updateMutation.mutateAsync({
          deckId,
          ...apiValues,
          // For editing, we might need to handle commander differently
          // This depends on whether we have internal card ID
        })
      } else {
        // Create deck first
        const newDeck = await createMutation.mutateAsync(apiValues)

        // If commander was selected, add it as a commander card
        if (_commanderScryfallId && newDeck) {
          try {
            await addCardMutation.mutateAsync({
              deckId: newDeck.id,
              cardId: _commanderScryfallId,
              quantity: 1,
              cardType: 'commander',
            })
          } catch (commanderError) {
            console.error('Failed to add commander to deck:', commanderError)
            // Deck was created, commander add failed - acceptable degradation
          }
        }
      }

      // Refresh decks list
      await utils.decks.list.invalidate()

      // Close dialog and reset form
      setCurrentStep(1)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Failed to save deck:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => (prev + 1) as Step)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    }
  }

  const handleClose = () => {
    setCurrentStep(1)
    form.reset()
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Prevent Enter key from submitting form during multi-step flow
    if (e.key === 'Enter' && !isEditing && currentStep < TOTAL_STEPS) {
      // Don't prevent if target is a button or select
      const target = e.target as HTMLElement
      if (target.tagName === 'BUTTON' || target.getAttribute('role') === 'combobox') {
        return
      }

      e.preventDefault()
      // Advance to next step if current step is valid
      if (
        (currentStep === 1 && canAdvanceFromStep1) ||
        (currentStep === 2 && canAdvanceFromStep2)
      ) {
        handleNext()
      }
    }
  }

  // Step indicator component
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
              currentStep === step
                ? 'bg-accent-cyan text-background'
                : currentStep > step
                ? 'bg-accent-cyan/30 text-accent-cyan'
                : 'bg-surface-elevated text-text-secondary'
            )}
          >
            {step}
          </div>
          {step < TOTAL_STEPS && (
            <div
              className={cn(
                'w-8 h-0.5 mx-1',
                currentStep > step ? 'bg-accent-cyan/30' : 'bg-surface-elevated'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Basic Information'
      case 2:
        return isCommanderFormat ? 'Commander & Strategy' : 'Colors & Strategy'
      case 3:
        return 'Collection Settings'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Deck' : 'Create New Deck'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update your deck details' : getStepTitle()}
          </DialogDescription>
        </DialogHeader>

        {!isEditing && <StepIndicator />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-4">
            {/* Step 1: Basic Info */}
            {(currentStep === 1 || isEditing) && (
              <>
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
                      <FormLabel>Format {!isEditing && <span className="text-red-400">*</span>}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FORMATS.map((format) => (
                            <SelectItem key={format} value={format}>
                              {format}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        {!isEditing
                          ? 'Select format to continue'
                          : 'The Magic format this deck is built for'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Step 2: Format-Specific Form */}
            {currentStep === 2 && !isEditing && (
              isCommanderFormat ? (
                <CommanderDeckForm form={form} disabled={isSubmitting} />
              ) : (
                <ConstructedDeckForm form={form} disabled={isSubmitting} />
              )
            )}

            {/* Step 3: Collection Settings */}
            {(currentStep === 3 || isEditing) && (
              <>
                {/* Summary (create mode only) */}
                {!isEditing && currentStep === 3 && (
                  <div className="p-3 bg-surface-elevated rounded-lg space-y-2">
                    <h4 className="text-sm font-medium text-text-primary">Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-text-secondary">Name:</div>
                      <div className="text-text-primary">{form.watch('name')}</div>

                      <div className="text-text-secondary">Format:</div>
                      <div className="text-text-primary">{form.watch('format')}</div>

                      {form.watch('colors')?.length > 0 && (
                        <>
                          <div className="text-text-secondary">Colors:</div>
                          <div><ColorIdentityDisplay colors={form.watch('colors') ?? []} /></div>
                        </>
                      )}

                      {form.watch('strategy') && (
                        <>
                          <div className="text-text-secondary">Strategy:</div>
                          <div className="text-text-primary capitalize">{form.watch('strategy')}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="collectionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection (optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                        value={field.value || 'none'}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a collection" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">All Collections (Aggregate)</SelectItem>
                          {collections.map((collection) => (
                            <SelectItem key={collection.id} value={collection.id}>
                              {collection.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Link deck to a specific collection or use all collections
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
              </>
            )}

            {/* For editing mode, show all form sections plus strategy/colors */}
            {isEditing && (
              isCommanderFormat ? (
                <CommanderDeckForm form={form} disabled={isSubmitting} />
              ) : (
                <ConstructedDeckForm form={form} disabled={isSubmitting} />
              )
            )}

            <DialogFooter>
              {/* Left side: Cancel or Back */}
              <div className="flex-1 flex justify-start">
                {!isEditing && currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {/* Right side: Next or Submit */}
              {!isEditing && currentStep < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    isSubmitting ||
                    (currentStep === 1 && !canAdvanceFromStep1) ||
                    (currentStep === 2 && !canAdvanceFromStep2)
                  }
                >
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? 'Saving...'
                    : isEditing
                    ? 'Save Changes'
                    : 'Create Deck'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
