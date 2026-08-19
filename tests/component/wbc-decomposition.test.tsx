import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { WbcDecomposition } from '@/components/interactive/wbc-decomposition';

function approachButton(name: RegExp) {
  return screen.getByRole('button', { name });
}

describe('WbcDecomposition', () => {
  it('renders the three approach buttons, the stack diagram, stats, and reset', () => {
    render(<WbcDecomposition />);
    expect(approachButton(/motion-tracking rl/i)).toBeInTheDocument();
    expect(approachButton(/latent-action hierarchy/i)).toBeInTheDocument();
    expect(approachButton(/end-to-end vla/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('wbc-diagram')).toBeInTheDocument();
    expect(screen.getByTestId('representative-readout')).toBeInTheDocument();
    expect(screen.getByTestId('layers-readout')).toBeInTheDocument();
    expect(screen.getByTestId('fastest-loop-readout')).toBeInTheDocument();
    expect(screen.getByTestId('wbc-stats')).toBeInTheDocument();
  });

  it('defaults to the Helix 02 S0 motion-tracking stack with sourced figures', () => {
    render(<WbcDecomposition />);
    expect(approachButton(/motion-tracking rl/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('representative-readout')).toHaveTextContent(
      /Helix 02 S0/,
    );
    expect(screen.getByTestId('layers-readout')).toHaveTextContent('3');
    expect(screen.getByTestId('fastest-loop-readout')).toHaveTextContent(
      '1000 Hz',
    );
    expect(screen.getByTestId('wbc-diagram')).toHaveTextContent(/S0/);
    expect(screen.getByTestId('wbc-diagram')).toHaveTextContent(/S1/);
    expect(screen.getByTestId('wbc-stats')).toHaveTextContent('10M');
    expect(screen.getByTestId('wbc-stats')).toHaveTextContent('200,000+');
  });

  it('switching to the latent-action hierarchy updates the diagram and stats', async () => {
    const user = userEvent.setup();
    render(<WbcDecomposition />);
    const before = screen.getByTestId('wbc-diagram').innerHTML;
    await user.click(approachButton(/latent-action hierarchy/i));
    expect(approachButton(/latent-action hierarchy/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('wbc-diagram').innerHTML).not.toBe(before);
    expect(screen.getByTestId('representative-readout')).toHaveTextContent(
      /GEAR-SONIC/,
    );
    expect(screen.getByTestId('layers-readout')).toHaveTextContent('2');
    expect(screen.getByTestId('fastest-loop-readout')).toHaveTextContent(
      /not disclosed/,
    );
    expect(screen.getByTestId('wbc-diagram')).toHaveTextContent(/GR00T/);
    expect(screen.getByTestId('wbc-stats')).toHaveTextContent('3B');
    expect(screen.getByTestId('wbc-stats')).toHaveTextContent('20,000 h');
  });

  it('switching to the end-to-end VLA shows one policy feet to fingertips', async () => {
    const user = userEvent.setup();
    render(<WbcDecomposition />);
    await user.click(approachButton(/end-to-end vla/i));
    expect(screen.getByTestId('representative-readout')).toHaveTextContent(
      /Gemini Robotics 2/,
    );
    expect(screen.getByTestId('layers-readout')).toHaveTextContent('2');
    expect(screen.getByTestId('fastest-loop-readout')).toHaveTextContent(
      /not disclosed/,
    );
    expect(screen.getByTestId('wbc-stats')).toHaveTextContent('22');
    expect(screen.getByTestId('wbc-stats')).toHaveTextContent(
      '< 200 examples',
    );
    expect(screen.getByTestId('wbc-diagram')).toHaveTextContent(
      /feet to fingertips/i,
    );
  });

  it('reset restores the default approach after interaction', async () => {
    const user = userEvent.setup();
    render(<WbcDecomposition />);
    await user.click(approachButton(/end-to-end vla/i));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(approachButton(/motion-tracking rl/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('representative-readout')).toHaveTextContent(
      /Helix 02 S0/,
    );
    expect(screen.getByTestId('fastest-loop-readout')).toHaveTextContent(
      '1000 Hz',
    );
  });

  it('describes the default Helix stack and tracks the approach buttons', () => {
    const { container } = render(<WbcDecomposition />);
    const img = screen.getByTestId('wbc-diagram');
    const id = img.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/Motion-tracking RL/);
    expect(desc?.textContent).toMatch(/1000 Hz/);
    fireEvent.click(approachButton(/latent-action hierarchy/i));
    const moved = container.querySelector('[data-chart-description]')
      ?.textContent ?? '';
    expect(moved).toMatch(/Latent-action hierarchy/);
    expect(moved).not.toMatch(/Motion-tracking RL/);
  });

  it('exposes an accessible svg label that tracks the selected approach', async () => {
    const user = userEvent.setup();
    render(<WbcDecomposition />);
    const diagram = screen.getByRole('img');
    expect(diagram).toHaveAccessibleName(/motion-tracking/i);
    await user.click(approachButton(/latent-action hierarchy/i));
    expect(screen.getByRole('img')).toHaveAccessibleName(/latent/i);
  });
});
