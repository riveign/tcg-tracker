import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CommanderSelector } from './CommanderSelector'
import { ColorIdentityDisplay } from './ColorPicker'
import { Edit, User } from 'lucide-react'

// Commander-specific strategies
const COMMANDER_STRATEGIES = [
  { value: 'aggro', label: 'Aggro - Fast, aggressive creatures' },
  { value: 'control', label: 'Control - Counterspells and removal' },
  { value: 'combo', label: 'Combo - Win through card combinations' },
  { value: 'midrange', label: 'Midrange - Balanced value creatures' },
  { value: 'stax', label: 'Stax - Resource denial' },
  { value: 'tokens', label: 'Tokens - Go wide with creature tokens' },
  { value: 'voltron', label: 'Voltron - Commander damage wins' },
  { value: 'aristocrats', label: 'Aristocrats - Sacrifice synergies' },
  { value: 'spellslinger', label: 'Spellslinger - Instants and sorceries' },
  { value: 'tribal', label: 'Tribal - Creature type synergies' },
  { value: 'reanimator', label: 'Reanimator - Graveyard recursion' },
  { value: 'landfall', label: 'Landfall - Land-based triggers' },
] as const

interface ScryfallCard {
  id: string
  name: string
  image_uris?: { normal?: string }
  color_identity?: string[]
}

interface CommanderDeckFormProps {
  form: UseFormReturn<any>
  disabled?: boolean
}

export function CommanderDeckForm({ form, disabled = false }: CommanderDeckFormProps) {
  const [commanderSelectorOpen, setCommanderSelectorOpen] = useState(false)

  const selectedCommander = form.watch('_selectedCommander') as ScryfallCard | null
  const colorIdentity = selectedCommander?.color_identity ?? []

  const handleCommanderSelect = (commander: ScryfallCard | null) => {
    if (commander) {
      // Store the full commander object for display
      form.setValue('_selectedCommander', commander)
      // Store just the ID for the API (will need to be resolved to internal UUID)
      form.setValue('_commanderScryfallId', commander.id)
      // Auto-set colors from commander's color identity
      form.setValue('colors', commander.color_identity ?? [])
    } else {
      form.setValue('_selectedCommander', null)
      form.setValue('_commanderScryfallId', null)
      form.setValue('colors', [])
    }
  }

  return (
    <div className="space-y-4">
      {/* Commander Selection */}
      <div className="space-y-2">
        <FormLabel>Commander</FormLabel>
        {selectedCommander ? (
          <Card className="border-accent-cyan/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                {selectedCommander.image_uris?.normal ? (
                  <img
                    src={selectedCommander.image_uris.normal}
                    alt={selectedCommander.name}
                    className="w-16 h-auto rounded shadow"
                  />
                ) : (
                  <div className="w-16 h-22 bg-surface-elevated rounded flex items-center justify-center">
                    <User className="w-6 h-6 text-text-secondary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary">{selectedCommander.name}</div>
                  <div className="mt-1">
                    <ColorIdentityDisplay colors={colorIdentity} />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setCommanderSelectorOpen(true)}
                  disabled={disabled}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-text-secondary"
            onClick={() => setCommanderSelectorOpen(true)}
            disabled={disabled}
          >
            <User className="w-4 h-4 mr-2" />
            Select a Commander...
          </Button>
        )}
        <FormDescription className="text-xs">
          Choose a legendary creature to lead your deck
        </FormDescription>
      </div>

      {/* Strategy Selection */}
      <FormField
        control={form.control}
        name="strategy"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Strategy (optional)</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || ''}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a strategy..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {COMMANDER_STRATEGIES.map((strategy) => (
                  <SelectItem key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription className="text-xs">
              Helps with card recommendations
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Commander Selector Dialog */}
      <CommanderSelector
        open={commanderSelectorOpen}
        onOpenChange={setCommanderSelectorOpen}
        currentCommander={selectedCommander ? {
          id: selectedCommander.id,
          name: selectedCommander.name,
          imageUrl: selectedCommander.image_uris?.normal,
          colorIdentity: selectedCommander.color_identity,
        } : null}
        onSelect={handleCommanderSelect}
      />
    </div>
  )
}
