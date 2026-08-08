import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScalingLawsTable } from '@/components/mdx/scaling-laws-table';

describe('ScalingLawsTable', () => {
  it('renders all six scaling-law rows with their sources', () => {
    render(<ScalingLawsTable />);
    for (const key of [
      'environments',
      'objects',
      'demos',
      'tasks',
      'experts',
      'embodiments',
    ]) {
      expect(screen.getByTestId(`scaling-row-${key}`)).toBeInTheDocument();
    }
    expect(screen.getAllByText('Lin et al. 2024')).toHaveLength(3);
    expect(screen.getAllByText('Shi et al. 2025')).toHaveLength(3);
  });

  it('carries the diversity-over-density findings verbatim', () => {
    render(<ScalingLawsTable />);
    expect(screen.getByText('Environments')).toBeInTheDocument();
    expect(screen.getAllByText('strong positive, power law')).toHaveLength(2);
    expect(screen.getByText('about 50 per env')).toBeInTheDocument();
    expect(screen.getByText('negative unless debiased')).toBeInTheDocument();
    expect(screen.getByText('single-embodiment suffices')).toBeInTheDocument();
  });

  it('renders inside its own horizontal scroll container', () => {
    const { container } = render(<ScalingLawsTable />);
    expect(container.firstChild).toHaveClass('overflow-x-auto');
  });
});
