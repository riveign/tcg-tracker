import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormatSelector, type FormatType } from '../FormatSelector';

describe('FormatSelector', () => {
  const defaultProps = {
    value: 'standard' as FormatType,
    onValueChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with selected value', () => {
    render(<FormatSelector {...defaultProps} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
  });

  it('displays all format options when opened', async () => {
    const user = userEvent.setup();
    render(<FormatSelector {...defaultProps} />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByRole('option', { name: 'Standard' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Modern' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Commander' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Brawl' })).toBeInTheDocument();
  });

  it('calls onValueChange when a format is selected', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<FormatSelector {...defaultProps} onValueChange={onValueChange} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Commander' }));

    expect(onValueChange).toHaveBeenCalledWith('commander');
  });

  it('renders in disabled state', () => {
    render(<FormatSelector {...defaultProps} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('displays placeholder when specified', () => {
    render(
      <FormatSelector
        {...defaultProps}
        value={'' as FormatType}
        placeholder="Choose a format"
      />
    );
    expect(screen.getByText('Choose a format')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<FormatSelector {...defaultProps} className="custom-class" />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveClass('custom-class');
  });
});
