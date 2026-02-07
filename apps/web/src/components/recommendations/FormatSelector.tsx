import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * Supported MTG format types
 */
export type FormatType = 'standard' | 'modern' | 'commander' | 'brawl';

/**
 * Format display configuration
 */
const FORMAT_OPTIONS: { value: FormatType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'modern', label: 'Modern' },
  { value: 'commander', label: 'Commander' },
  { value: 'brawl', label: 'Brawl' },
];

/**
 * Props for the FormatSelector component
 */
export interface FormatSelectorProps {
  /** Currently selected format */
  value: FormatType;
  /** Callback when format selection changes */
  onValueChange: (value: FormatType) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Placeholder text when no format is selected */
  placeholder?: string;
}

/**
 * FormatSelector - Dropdown for selecting MTG format
 *
 * Displays all supported formats with proper capitalization.
 * Uses Radix Select primitives for accessibility.
 */
export function FormatSelector({
  value,
  onValueChange,
  disabled = false,
  className,
  placeholder = 'Select format',
}: FormatSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as FormatType)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'w-full md:w-[180px] bg-background-surface border-border',
          'text-text-primary focus:ring-accent-cyan',
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-background-surface border-border">
        {FORMAT_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="text-text-primary focus:bg-accent-cyan/20 focus:text-text-primary"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
