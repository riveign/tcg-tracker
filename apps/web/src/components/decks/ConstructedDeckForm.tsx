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
import { ColorPicker } from './ColorPicker'

// Constructed-specific strategies
const CONSTRUCTED_STRATEGIES = [
  { value: 'aggro', label: 'Aggro - Fast, aggressive creatures' },
  { value: 'control', label: 'Control - Counterspells and removal' },
  { value: 'combo', label: 'Combo - Win through card combinations' },
  { value: 'midrange', label: 'Midrange - Balanced value creatures' },
  { value: 'tempo', label: 'Tempo - Efficient threats with disruption' },
  { value: 'ramp', label: 'Ramp - Accelerate into big threats' },
  { value: 'burn', label: 'Burn - Direct damage spells' },
  { value: 'mill', label: 'Mill - Win by emptying library' },
  { value: 'tokens', label: 'Tokens - Go wide with creature tokens' },
  { value: 'tribal', label: 'Tribal - Creature type synergies' },
] as const

interface ConstructedDeckFormProps {
  form: UseFormReturn<any>
  disabled?: boolean
}

export function ConstructedDeckForm({ form, disabled = false }: ConstructedDeckFormProps) {
  return (
    <div className="space-y-4">
      {/* Color Selection */}
      <FormField
        control={form.control}
        name="colors"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Deck Colors (optional)</FormLabel>
            <FormControl>
              <ColorPicker
                value={field.value ?? []}
                onChange={field.onChange}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

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
                {CONSTRUCTED_STRATEGIES.map((strategy) => (
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
    </div>
  )
}
