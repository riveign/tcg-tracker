import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollectionCoverage } from '../CollectionCoverage';

// Mock the useFormatCoverage hook
vi.mock('@/hooks/useRecommendations', () => ({
  useFormatCoverage: vi.fn(),
}));

import { useFormatCoverage } from '@/hooks/useRecommendations';

const mockUseFormatCoverage = vi.mocked(useFormatCoverage);

describe('CollectionCoverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseFormatCoverage.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useFormatCoverage>);

    render(<CollectionCoverage collectionId="test-id" format="standard" />);
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseFormatCoverage.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to fetch' },
    } as unknown as ReturnType<typeof useFormatCoverage>);

    render(<CollectionCoverage collectionId="test-id" format="standard" />);
    expect(screen.getByText('Failed to load coverage data')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  it('renders single format coverage data', () => {
    mockUseFormatCoverage.mockReturnValue({
      data: {
        format: 'standard',
        totalLegalCards: 150,
        viableArchetypes: [
          { archetype: 'aggro', completeness: 85, keyCards: ['Lightning Bolt', 'Goblin Guide'] },
          { archetype: 'control', completeness: 90, keyCards: ['Counterspell', 'Wrath of God'] },
          { archetype: 'midrange', completeness: 75, keyCards: ['Tarmogoyf', 'Liliana'] },
        ],
        buildableDecks: [
          {
            archetype: 'Mono Red Aggro',
            completeness: 95,
            coreCardsOwned: ['Lightning Bolt', 'Goblin Guide'],
            missingCount: 2,
            missingKeyCards: ['Eidolon of the Great Revel'],
          },
          {
            archetype: 'Blue Control',
            completeness: 80,
            coreCardsOwned: ['Counterspell'],
            missingCount: 5,
            missingKeyCards: ['Jace, the Mind Sculptor'],
          },
        ],
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useFormatCoverage>);

    render(<CollectionCoverage collectionId="test-id" format="standard" />);

    expect(screen.getByText('Legal Cards')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Viable Archetypes')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('aggro (85%)')).toBeInTheDocument();
    expect(screen.getByText('control (90%)')).toBeInTheDocument();
    expect(screen.getByText('Mono Red Aggro')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('renders multi-format coverage when no format specified', () => {
    mockUseFormatCoverage.mockReturnValue({
      data: {
        standard: {
          format: 'standard',
          totalLegalCards: 100,
          viableArchetypes: [{ archetype: 'aggro', completeness: 80, keyCards: [] }],
          buildableDecks: [],
        },
        modern: {
          format: 'modern',
          totalLegalCards: 200,
          viableArchetypes: [{ archetype: 'combo', completeness: 70, keyCards: [] }],
          buildableDecks: [],
        },
        commander: {
          format: 'commander',
          totalLegalCards: 500,
          viableArchetypes: [],
          buildableDecks: [],
        },
        brawl: {
          format: 'brawl',
          totalLegalCards: 80,
          viableArchetypes: [],
          buildableDecks: [],
        },
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useFormatCoverage>);

    render(<CollectionCoverage collectionId="test-id" />);

    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Modern')).toBeInTheDocument();
    expect(screen.getByText('Commander')).toBeInTheDocument();
    expect(screen.getByText('Brawl')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    mockUseFormatCoverage.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useFormatCoverage>);

    render(<CollectionCoverage collectionId="test-id" format="standard" />);
    expect(screen.getByText('No coverage data available')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    mockUseFormatCoverage.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useFormatCoverage>);

    const { container } = render(
      <CollectionCoverage collectionId="test-id" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
