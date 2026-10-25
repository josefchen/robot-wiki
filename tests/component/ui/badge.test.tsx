import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/ui/badge';
import { StageStatusChip } from '@/components/ui/stage-status-chip';

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

  // The control-states sweep holds a Badge to its status colour and a stage
  // chip to its border; this marker is how it tells the two apart.
  it('marks itself as a badge, which a stage status chip does not', () => {
    render(
      <>
        <Badge variant="warn">vendor-reported</Badge>
        <StageStatusChip variant="warn" line="dashed">
          Demo only
        </StageStatusChip>
      </>,
    );
    expect(screen.getByText('vendor-reported')).toHaveAttribute('data-badge');
    expect(screen.getByText('Demo only')).not.toHaveAttribute('data-badge');
  });
});
