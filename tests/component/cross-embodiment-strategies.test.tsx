import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CrossEmbodimentStrategies } from '@/components/interactive/cross-embodiment-strategies';
import { renderWithCitations } from '../helpers/widget-citations';

const render = renderWithCitations('CrossEmbodimentStrategies');

function strategyButton(name: RegExp | string) {
  return screen.getByRole('button', { name });
}

describe('CrossEmbodimentStrategies', () => {
  it('renders the three strategy toggles, four embodiment rows, and a reset', () => {
    render(<CrossEmbodimentStrategies />);
    expect(strategyButton("Pad each robot's own list")).toBeInTheDocument();
    expect(strategyButton('Translate between bodies')).toBeInTheDocument();
    expect(strategyButton('Describe where the hand goes')).toBeInTheDocument();
    for (const id of ['arm', 'bimanual', 'humanoid', 'human-hand']) {
      expect(screen.getByTestId(`row-${id}`)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('strategy-detail')).toBeInTheDocument();
  });

  it('leads with the takeaway and a grid where only the hand-motion way fills the person row', () => {
    const { container } = render(<CrossEmbodimentStrategies />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Describe hand motion, not joints, and human videos become usable',
    );
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Cross-embodiment');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'from many robots and from people on video',
    );
    const filled = (strategy: string) =>
      container
        .querySelector(`[data-overview-cell="${strategy}:human-hand"]`)
        ?.getAttribute('data-filled');
    expect(filled('padded')).toBe('false');
    expect(filled('motion-transfer')).toBe('false');
    expect(filled('relative-eef')).toBe('true');
    expect(container.querySelectorAll('[data-overview-body]')).toHaveLength(4);
    const notes = container.querySelectorAll('[data-figure-annotation]');
    expect(notes).toHaveLength(1);
    expect(notes[0].textContent).toBe("Only this way can a person'svideo fill the robot's slots");
    // The full strips, their readouts, the detail and Reset sit in Adjust more.
    const adjust = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(adjust).toContainElement(screen.getByTestId('row-arm'));
    expect(adjust).toContainElement(screen.getByTestId('strategy-detail'));
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
  });

  it('a preset brings its column forward in the grid', () => {
    const { container } = render(<CrossEmbodimentStrategies />);
    fireEvent.click(strategyButton("Pad each robot's own list"));
    expect(
      container.querySelector('[data-overview-column="padded"]')?.getAttribute('data-selected'),
    ).toBe('true');
    expect(
      container.querySelector('[data-overview-column="relative-eef"]')?.getAttribute('data-selected'),
    ).toBe('false');
  });

  it('starts in the shared relative EEF space with the human-hand row populated', () => {
    render(<CrossEmbodimentStrategies />);
    expect(strategyButton('Describe where the hand goes')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(strategyButton("Pad each robot's own list")).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const hand = screen.getByTestId('row-human-hand');
    expect(hand).toHaveTextContent(/8 shared dims/);
    expect(hand.querySelectorAll('rect[data-series="active"]')).toHaveLength(8);
    expect(screen.getByRole('img', { name: /7-DoF arm under the Shared relative EEF space strategy/ })).toBeInTheDocument();
  });

  it('padded mode shows the toggle pressed and zero-padding visible', () => {
    render(<CrossEmbodimentStrategies />);
    fireEvent.click(strategyButton("Pad each robot's own list"));
    expect(strategyButton("Pad each robot's own list")).toHaveAttribute(
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

  it('shows the unmodelled human adapter in the padded toy', () => {
    render(<CrossEmbodimentStrategies />);
    fireEvent.click(strategyButton("Pad each robot's own list"));
    const hand = screen.getByTestId('row-human-hand');
    expect(hand).toHaveTextContent(/no adapter modelled/i);
    expect(screen.getByTestId('human-video-readout')).toHaveTextContent(
      /no adapter modelled in this toy/i,
    );
  });

  it('relative-EEF mode puts the human hand in the shared space with zero padding removed', () => {
    render(<CrossEmbodimentStrategies />);
    fireEvent.click(strategyButton('Describe where the hand goes'));
    expect(strategyButton('Describe where the hand goes')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(strategyButton("Pad each robot's own list")).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const hand = screen.getByTestId('row-human-hand');
    expect(hand).toHaveTextContent(/shared dims/);
    expect(hand).not.toHaveTextContent(/no slot/i);
    expect(screen.getByTestId('human-video-readout')).toHaveTextContent(
      /N1.7 README: 20K hours/i,
    );
    // No row zero-pads in relative-EEF mode.
    expect(screen.queryAllByText(/zero-padded/)).toHaveLength(0);
  });

  it('motion-transfer mode distinguishes partial disclosure from its illustration', () => {
    render(<CrossEmbodimentStrategies />);
    fireEvent.click(strategyButton('Translate between bodies'));
    expect(screen.getByTestId('underspecified-flag')).toBeInTheDocument();
    for (const id of ['arm', 'bimanual', 'humanoid']) {
      expect(screen.getByTestId(`row-${id}`)).toHaveTextContent(/not model dimensions/);
      const row = screen.getByTestId(`row-${id}`);
      const pattern = row.querySelector('pattern');
      expect(pattern).not.toBeNull();
      expect(row.querySelector(`rect[fill="url(#${pattern!.id})"]`)).not.toBeNull();
    }
    expect(screen.getByText('hatched: illustrative link, not model dimensions')).toBeInTheDocument();
    expect(screen.getByTestId('row-human-hand')).toHaveTextContent(
      /mapping not specified in this illustration/i,
    );
  });

  it('hides the under-specified flag outside motion-transfer mode', () => {
    render(<CrossEmbodimentStrategies />);
    expect(screen.queryByTestId('underspecified-flag')).not.toBeInTheDocument();
    fireEvent.click(strategyButton('Describe where the hand goes'));
    expect(screen.queryByTestId('underspecified-flag')).not.toBeInTheDocument();
  });

  it('reset restores the default relative EEF view', async () => {
    const user = userEvent.setup();
    render(<CrossEmbodimentStrategies />);
    fireEvent.click(strategyButton("Pad each robot's own list"));
    expect(screen.getByTestId('row-arm')).toHaveTextContent(/24 zero-padded/);
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(strategyButton('Describe where the hand goes')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('row-arm')).toHaveTextContent(/8 shared dims/);
    expect(screen.queryAllByText(/zero-padded/)).toHaveLength(0);
  });

  it('links every strategy to its source', () => {
    render(<CrossEmbodimentStrategies />);
    const detail = screen.getByTestId('strategy-detail');
    const link = detail.querySelector('a[href]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toMatch(/^https?:\/\//);
  });
});
