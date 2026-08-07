import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Aside } from '@/components/ui/aside';

describe('Aside', () => {
  it('renders children', () => {
    render(<Aside>Teleop farms measure data in robot-hours.</Aside>);
    expect(
      screen.getByText('Teleop farms measure data in robot-hours.'),
    ).toBeInTheDocument();
  });

  it('renders an optional title used as the accessible name', () => {
    render(<Aside title="Aside">Body</Aside>);
    expect(screen.getByText('Aside')).toBeInTheDocument();
  });
});
