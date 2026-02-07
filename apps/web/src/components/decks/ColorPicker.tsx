import { cn } from '@/lib/utils'

const COLORS = [
  { id: 'W', name: 'White', symbol: 'W', bgClass: 'bg-yellow-100', textClass: 'text-yellow-900', borderClass: 'border-yellow-300' },
  { id: 'U', name: 'Blue', symbol: 'U', bgClass: 'bg-blue-400', textClass: 'text-blue-900', borderClass: 'border-blue-500' },
  { id: 'B', name: 'Black', symbol: 'B', bgClass: 'bg-gray-700', textClass: 'text-gray-100', borderClass: 'border-gray-500' },
  { id: 'R', name: 'Red', symbol: 'R', bgClass: 'bg-red-500', textClass: 'text-red-100', borderClass: 'border-red-600' },
  { id: 'G', name: 'Green', symbol: 'G', bgClass: 'bg-green-500', textClass: 'text-green-100', borderClass: 'border-green-600' },
] as const

interface ColorPickerProps {
  value: string[]
  onChange: (colors: string[]) => void
  disabled?: boolean
  readOnly?: boolean
}

export function ColorPicker({ value, onChange, disabled = false, readOnly = false }: ColorPickerProps) {
  const toggleColor = (colorId: string) => {
    if (disabled || readOnly) return

    if (value.includes(colorId)) {
      onChange(value.filter(c => c !== colorId))
    } else {
      onChange([...value, colorId])
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {COLORS.map((color) => {
          const isSelected = value.includes(color.id)
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => toggleColor(color.id)}
              disabled={disabled}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all border-2',
                color.bgClass,
                color.textClass,
                isSelected
                  ? `${color.borderClass} ring-2 ring-offset-2 ring-offset-background ring-accent-cyan scale-110`
                  : 'border-transparent opacity-50 hover:opacity-75',
                disabled && 'cursor-not-allowed opacity-30',
                readOnly && 'cursor-default'
              )}
              title={color.name}
              aria-label={`${isSelected ? 'Remove' : 'Add'} ${color.name}`}
              aria-pressed={isSelected}
            >
              {color.symbol}
            </button>
          )
        })}
      </div>
      {value.length === 0 && !readOnly && (
        <p className="text-xs text-text-secondary">
          Select the colors for your deck (optional)
        </p>
      )}
      {value.length > 0 && (
        <p className="text-xs text-text-secondary">
          {value.length === 1
            ? 'Mono-color deck'
            : value.length === 2
            ? 'Two-color deck'
            : value.length === 3
            ? 'Three-color deck'
            : value.length === 4
            ? 'Four-color deck'
            : 'Five-color deck'}
        </p>
      )}
    </div>
  )
}

// Display-only version for showing commander color identity
export function ColorIdentityDisplay({ colors }: { colors: string[] }) {
  if (colors.length === 0) {
    return (
      <span className="text-sm text-text-secondary">Colorless</span>
    )
  }

  return (
    <div className="flex gap-1.5">
      {COLORS.filter(c => colors.includes(c.id)).map((color) => (
        <span
          key={color.id}
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs',
            color.bgClass,
            color.textClass
          )}
          title={color.name}
        >
          {color.symbol}
        </span>
      ))}
    </div>
  )
}
