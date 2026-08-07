import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Callout } from '@/components/ui/callout';

describe('Callout', () => {
  it('renders info variant as a note', () => {
    render(<Callout variant="info">Chunk size trades latency for smoothness.</Callout>);
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('Chunk size trades latency for smoothness.');
    expect(note).toHaveAttribute('data-variant', 'info');
  });

  it('renders warn variant as a note with a warning label', () => {
    render(<Callout variant="warn">N-of-10 trials hide variance.</Callout>);
    const note = screen.getByRole('note');
    expect(note).toHaveAttribute('data-variant', 'warn');
    expect(note).toHaveAccessibleName(/warning/i);
  });

  it('renders error variant as an alert', () => {
    render(<Callout variant="error">Citation missing.</Callout>);
    expect(screen.getByRole('alert')).toHaveTextContent('Citation missing.');
  });

  it('renders an optional title', () => {
    render(
      <Callout variant="info" title="Why this matters">
        Body
      </Callout>,
    );
    expect(screen.getByText('Why this matters')).toBeInTheDocument();
  });
});
