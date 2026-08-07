import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge>open weights</Badge>);
    expect(screen.getByText('open weights')).toBeInTheDocument();
  });

  it('exposes the variant for styling hooks', () => {
    render(<Badge variant="ok">high confidence</Badge>);
    expect(screen.getByText('high confidence')).toHaveAttribute(
      'data-variant',
      'ok',
    );
  });
});
