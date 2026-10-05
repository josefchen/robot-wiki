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
    expect(approachButton(/copies human motion/i)).toBeInTheDocument();
    expect(approachButton(/learned movement codes/i)).toBeInTheDocument();
    expect(approachButton(/one big network/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('wbc-diagram')).toBeInTheDocument();
    expect(screen.getByTestId('representative-readout')).toBeInTheDocument();
    expect(screen.getByTestId('layers-readout')).toBeInTheDocument();
    expect(screen.getByTestId('fastest-loop-readout')).toBeInTheDocument();
    expect(screen.getByTestId('wbc-stats')).toBeInTheDocument();
  });

  it('names the designs in plain words and keeps the technical names one click away', () => {
    const { container } = render(<WbcDecomposition />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Robot brains are layered: slow thinking above, fast reflexes below',
    );
    expect(screen.getByTestId('humanoid')).toBeInTheDocument();
    const diagram = screen.getByTestId('wbc-diagram');
    expect(diagram).toHaveTextContent('Keeps balance and moves every');
    expect(diagram).toHaveTextContent('joint, 1,000 times a second');
    expect(diagram).not.toHaveTextContent(/S0|Hz/);
    const note = container.querySelectorAll('[data-figure-annotation]');
    expect(note).toHaveLength(1);
    expect(note[0]).toHaveTextContent(/Fastest layer: adjusts every joint\s*1,000 times a second/);
    const method = container.querySelector('details[data-figure-fold="method"]')!;
    expect(method).toContainElement(screen.getByTestId('wbc-stats'));
    expect(method).toHaveTextContent('motion-tracking RL');
    expect(method).toHaveTextContent('latent-action hierarchy');
    expect(method).toHaveTextContent('end-to-end VLA');
    expect(container.querySelector('details[data-figure-fold="adjust"]')).toContainElement(
      screen.getByRole('button', { name: /reset/i }),
    );
  });

  it('defaults to the Helix 02 S0 motion-tracking stack with sourced figures', () => {
    render(<WbcDecomposition />);
    expect(approachButton(/copies human motion/i)).toHaveAttribute(
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
    expect(screen.getByTestId('wbc-layers')).toHaveTextContent(/S0/);
    expect(screen.getByTestId('wbc-layers')).toHaveTextContent(/S1/);
    expect(screen.getByTestId('wbc-stats')).toHaveTextContent('10M');
    expect(screen.getByTestId('wbc-stats')).toHaveTextContent('200,000+');
  });

  it('switching to the latent-action hierarchy updates the diagram and stats', async () => {
    const user = userEvent.setup();
    render(<WbcDecomposition />);
    const before = screen.getByTestId('wbc-diagram').innerHTML;
    await user.click(approachButton(/learned movement codes/i));
    expect(approachButton(/learned movement codes/i)).toHaveAttribute(
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
    expect(screen.getByTestId('wbc-layers')).toHaveTextContent(/GR00T/);
    expect(screen.getByTestId('wbc-stats')).toHaveTextContent('3B');
    expect(screen.getByTestId('wbc-stats')).toHaveTextContent('20,000 h');
  });

  it('switching to the end-to-end VLA shows one policy feet to fingertips', async () => {
    const user = userEvent.setup();
    render(<WbcDecomposition />);
    await user.click(approachButton(/one big network/i));
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
    expect(screen.getByTestId('wbc-layers')).toHaveTextContent(
      /feet to fingertips/i,
    );
    expect(screen.getByTestId('wbc-diagram')).toHaveTextContent(
      /one network moves the whole\s*body/i,
    );
  });

  it('reset restores the default approach after interaction', async () => {
    const user = userEvent.setup();
    render(<WbcDecomposition />);
    await user.click(approachButton(/one big network/i));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(approachButton(/copies human motion/i)).toHaveAttribute(
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
    fireEvent.click(approachButton(/learned movement codes/i));
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
    await user.click(approachButton(/learned movement codes/i));
    expect(screen.getByRole('img')).toHaveAccessibleName(/latent/i);
  });
});
