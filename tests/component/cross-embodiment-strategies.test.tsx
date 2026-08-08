import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CrossEmbodimentStrategies } from '@/components/interactive/cross-embodiment-strategies';

function strategyButton(name: RegExp | string) {
  return screen.getByRole('button', { name });
}

describe('CrossEmbodimentStrategies', () => {
  it('renders the three strategy toggles, four embodiment rows, and a reset', () => {
    render(<CrossEmbodimentStrategies />);
    expect(strategyButton(/padded shared vector/i)).toBeInTheDocument();
    expect(strategyButton(/motion transfer/i)).toBeInTheDocument();
    expect(strategyButton(/shared relative EEF/i)).toBeInTheDocument();
    for (const id of ['arm', 'bimanual', 'humanoid', 'human-hand']) {
      expect(screen.getByTestId(`row-${id}`)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('strategy-detail')).toBeInTheDocument();
  });

  it('starts in padded mode with the toggle pressed and zero-padding visible', () => {
    render(<CrossEmbodimentStrategies />);
    expect(strategyButton(/padded shared vector/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const arm = screen.getByTestId('row-arm');
    expect(arm).toHaveTextContent(/8 active/);
    expect(arm).toHaveTextContent(/24 zero-padded/);
    const humanoid = screen.getByTestId('row-humanoid');
    expect(humanoid).toHaveTextContent(/29 active/);
    expect(humanoid).toHaveTextContent(/3 zero-padded/);
  });

  it('blocks the human-hand row in padded mode', () => {
    render(<CrossEmbodimentStrategies />);
    const hand = screen.getByTestId('row-human-hand');
    expect(hand).toHaveTextContent(/no slot/i);
    expect(screen.getByTestId('human-video-readout')).toHaveTextContent(
      /cannot enter/i,
    );
  });

  it('relative-EEF mode puts the human hand in the shared space with zero padding removed', () => {
    render(<CrossEmbodimentStrategies />);
    fireEvent.click(strategyButton(/shared relative EEF/i));
    expect(strategyButton(/shared relative EEF/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(strategyButton(/padded shared vector/i)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const hand = screen.getByTestId('row-human-hand');
    expect(hand).toHaveTextContent(/shared dims/);
    expect(hand).not.toHaveTextContent(/no slot/i);
    expect(screen.getByTestId('human-video-readout')).toHaveTextContent(
      /20,000 hours|20K hours/i,
    );
    // No row zero-pads in relative-EEF mode.
    expect(screen.queryAllByText(/zero-padded/)).toHaveLength(0);
  });

  it('motion-transfer mode is flagged as publicly under-specified', () => {
    render(<CrossEmbodimentStrategies />);
    fireEvent.click(strategyButton(/motion transfer/i));
    expect(screen.getByTestId('underspecified-flag')).toBeInTheDocument();
    for (const id of ['arm', 'bimanual', 'humanoid']) {
      expect(screen.getByTestId(`row-${id}`)).toHaveTextContent(/latent/);
    }
    expect(screen.getByTestId('row-human-hand')).toHaveTextContent(
      /not disclosed/i,
    );
  });

  it('hides the under-specified flag outside motion-transfer mode', () => {
    render(<CrossEmbodimentStrategies />);
    expect(screen.queryByTestId('underspecified-flag')).not.toBeInTheDocument();
    fireEvent.click(strategyButton(/shared relative EEF/i));
    expect(screen.queryByTestId('underspecified-flag')).not.toBeInTheDocument();
  });

  it('reset restores the default padded view', async () => {
    const user = userEvent.setup();
    render(<CrossEmbodimentStrategies />);
    fireEvent.click(strategyButton(/shared relative EEF/i));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(strategyButton(/padded shared vector/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('row-arm')).toHaveTextContent(/24 zero-padded/);
  });

  it('links every strategy to its source', () => {
    render(<CrossEmbodimentStrategies />);
    const detail = screen.getByTestId('strategy-detail');
    const link = detail.querySelector('a[href]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toMatch(/^https?:\/\//);
  });
});
