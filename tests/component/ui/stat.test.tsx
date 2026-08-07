import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stat } from '@/components/ui/stat';

describe('Stat', () => {
  it('renders value and label', () => {
    render(<Stat label="Chunk size at 44% success" value="k=100" />);
    expect(screen.getByText('k=100')).toBeInTheDocument();
    expect(screen.getByText('Chunk size at 44% success')).toBeInTheDocument();
  });

  it('renders an optional note', () => {
    render(<Stat label="Horizon" value="50 Hz" note="ALOHA control rate" />);
    expect(screen.getByText('ALOHA control rate')).toBeInTheDocument();
  });
});
