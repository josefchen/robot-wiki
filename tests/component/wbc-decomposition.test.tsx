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
    expect(approachButton(/^figure ai$/i)).toBeInTheDocument();
    expect(approachButton(/^nvidia$/i)).toBeInTheDocument();
    expect(approachButton(/^google deepmind$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('wbc-diagram')).toBeInTheDocument();
    expect(screen.getByTestId('representative-readout')).toBeInTheDocument();
    expect(screen.getByTestId('layers-readout')).toBeInTheDocument();
    expect(screen.getByTestId('fastest-loop-readout')).toBeInTheDocument();
    expect(screen.getByTestId('wbc-stats')).toBeInTheDocument();
  });

  it('names whose robot brain each design is and keeps the technical names one click away', () => {
    const { container } = render(<WbcDecomposition />);
    expect(screen.getByRole('group', { name: 'Robot brain by' })).toBeInTheDocument();
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      'Robot brains are layered: slow thinking above, fast reflexes below',
    );
    expect(screen.getByTestId('humanoid')).toBeInTheDocument();
    const diagram = screen.getByTestId('wbc-diagram');
    // Each layer does one plainly different job: decide, plan the limbs, drive the motors.
    expect(screen.getByTestId('layer-0')).toHaveTextContent(/^Sees the scene and decides\s*what to do next$/);
    expect(screen.getByTestId('layer-1')).toHaveTextContent(/^Plans how each arm and leg\s*moves, 200 times a second$/);
    expect(screen.getByTestId('layer-2')).toHaveTextContent(/^Drives every joint motor,\s*1,000 times a second$/);
    expect(diagram).not.toHaveTextContent(/S0|Hz|not disclosed|slowest/);
    // Grey arrows run down the stack and from the bottom layer into the robot.
    expect(diagram.querySelectorAll('[data-flow-arrow]')).toHaveLength(3);
    // The speeds on the stage are the selected company's own.
    expect(container.querySelector('[data-figure-frame="wbc-decomposition"]')).toHaveTextContent(
      'Schematic; speeds as published by Figure AI',
    );
    const note = container.querySelectorAll('[data-figure-annotation]');
    expect(note).toHaveLength(1);
    expect(note[0]).toHaveTextContent(/Fastest layer: it keeps the\s*robot balanced as it moves/);
    // The note's arrow rises to the bottom layer, the one that drives the joint motors: the only
    // full-weight outline, in ink, so no outline colour is left for a first-time reader to decode.
    const tip = (note[0].querySelector('[data-annotation-pointer="arrow"] polygon')?.getAttribute('points') ?? '')
      .split(' ')[0]
      .split(',')
      .map(Number);
    expect(tip[1]).toBeGreaterThan(168);
    expect(tip[1]).toBeLessThan(174);
    expect(container.querySelectorAll('[data-noted]')).toHaveLength(1);
    expect(screen.getByTestId('layer-2')).toHaveAttribute('data-noted');
    const outlines = [0, 1, 2].map((i) => screen.getByTestId(`layer-${i}`).querySelector('rect'));
    expect(new Set(outlines.map((rect) => rect?.getAttribute('stroke'))).size).toBe(2);
    expect(outlines[2]?.getAttribute('stroke-width')).not.toBe(outlines[0]?.getAttribute('stroke-width'));
    expect(container.querySelector('[data-figure-source]')).toBeNull();
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
    expect(approachButton(/^figure ai$/i)).toHaveAttribute(
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
    await user.click(approachButton(/^nvidia$/i));
    expect(approachButton(/^nvidia$/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('wbc-diagram').innerHTML).not.toBe(before);
    expect(screen.getByTestId('representative-readout')).toHaveTextContent(
      /GEAR-SONIC/,
    );
    expect(screen.getByTestId('layers-readout')).toHaveTextContent('2');
    expect(screen.getByTestId('fastest-loop-readout')).toHaveTextContent(
      '50 Hz',
    );
    expect(screen.getByTestId('wbc-diagram')).toHaveTextContent(/50 times a second/);
    expect(screen.getByTestId('wbc-layers')).toHaveTextContent(/GR00T/);
    expect(screen.getByTestId('wbc-stats')).toHaveTextContent('3B');
    expect(screen.getByTestId('wbc-stats')).toHaveTextContent('20,000 h');
  });

  it('switching to the end-to-end VLA shows one policy feet to fingertips', async () => {
    const user = userEvent.setup();
    render(<WbcDecomposition />);
    await user.click(approachButton(/^google deepmind$/i));
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
      /one network for the whole\s*body/i,
    );
  });

  it('reset restores the default approach after interaction', async () => {
    const user = userEvent.setup();
    render(<WbcDecomposition />);
    await user.click(approachButton(/^google deepmind$/i));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(approachButton(/^figure ai$/i)).toHaveAttribute(
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
    fireEvent.click(approachButton(/^nvidia$/i));
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
    await user.click(approachButton(/^nvidia$/i));
    expect(screen.getByRole('img')).toHaveAccessibleName(/latent/i);
  });
});
