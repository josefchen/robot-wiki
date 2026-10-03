import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { JepaPlanning, OPENING_STEPS } from '@/components/interactive/jepa-planning';

function distanceReadout(): number {
  const el = screen.getByTestId('distance-readout');
  const value = Number.parseFloat(el.textContent ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

const slider = () => screen.getByRole('slider', { name: /options tried each step/i });
const planButton = () => screen.getByRole('button', { name: /plan next move/i });
const describedText = (container: HTMLElement) =>
  container.querySelector('[data-chart-description]')?.textContent ?? '';

describe('JepaPlanning', () => {
  it('renders the options slider, plan button, goal presets, reset and the no-decoder note', () => {
    render(<JepaPlanning />);
    expect(slider()).toHaveValue('24');
    expect(slider()).toHaveAttribute('aria-valuetext', '24 options');
    expect(planButton()).toBeEnabled();
    expect(screen.getByTestId('goal-pick')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('goal-place')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('distance-readout')).toBeInTheDocument();
    const note = screen.getByTestId('no-decoder-note');
    expect(note).toHaveTextContent(/no pixel decoder/i);
    expect(note).toHaveTextContent(/synthetic two-dimensional points/);
    expect(note).toHaveTextContent(/loads no trained encoder or predictor/);
  });

  it('decreases the goal distance over successive planning steps', async () => {
    const user = userEvent.setup();
    render(<JepaPlanning />);
    const initial = distanceReadout();
    const values: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      await user.click(planButton());
      values.push(distanceReadout());
    }
    expect(values[0]).toBeLessThan(initial);
    expect(values[1]).toBeLessThan(values[0]);
    expect(values[2]).toBeLessThan(values[1]);
    expect(screen.getByTestId('step-readout')).toHaveTextContent(String(OPENING_STEPS + 3));
  });

  it('is deterministic: the same steps reproduce the same distances', async () => {
    const user = userEvent.setup();
    render(<JepaPlanning />);
    await user.click(planButton());
    await user.click(planButton());
    const firstRun = distanceReadout();
    await user.click(screen.getByRole('button', { name: /reset/i }));
    await user.click(planButton());
    await user.click(planButton());
    expect(distanceReadout()).toBeCloseTo(firstRun, 12);
  });

  it('reset restores the opening state', async () => {
    const user = userEvent.setup();
    render(<JepaPlanning />);
    const initial = screen.getByTestId('distance-readout').textContent;
    await user.click(planButton());
    fireEvent.change(slider(), { target: { value: '48' } });
    await user.click(screen.getByTestId('goal-place'));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('distance-readout')).toHaveTextContent(initial ?? '');
    expect(screen.getByTestId('step-readout')).toHaveTextContent(String(OPENING_STEPS));
    expect(slider()).toHaveValue('24');
    expect(screen.getByTestId('goal-pick')).toHaveAttribute('aria-pressed', 'true');
  });

  it('switching the goal restarts planning from the opening state and swaps the goal picture', async () => {
    const user = userEvent.setup();
    render(<JepaPlanning />);
    const pickInitial = distanceReadout();
    expect(screen.getByTestId('picture-now')).toBeInTheDocument();
    expect(screen.getByTestId('picture-pick')).toBeInTheDocument();
    await user.click(planButton());
    await user.click(screen.getByTestId('goal-place'));
    expect(screen.getByTestId('step-readout')).toHaveTextContent(String(OPENING_STEPS));
    const placeInitial = distanceReadout();
    expect(placeInitial).toBeGreaterThan(0);
    expect(placeInitial).not.toBeCloseTo(pickInitial, 6);
    expect(screen.getByTestId('goal-place')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('picture-place')).toBeInTheDocument();
    expect(screen.queryByTestId('picture-pick')).toBeNull();
  });

  it('the fan of tried moves follows the options slider', async () => {
    const user = userEvent.setup();
    render(<JepaPlanning />);
    expect(screen.getAllByTestId('candidate-sequence')).toHaveLength(24);
    fireEvent.change(slider(), { target: { value: '8' } });
    expect(screen.getAllByTestId('candidate-sequence')).toHaveLength(8);
    await user.click(planButton());
    expect(screen.getAllByTestId('candidate-sequence')).toHaveLength(8);
  });

  it('renders the plan and the distance strip with accessible labels', () => {
    render(<JepaPlanning />);
    expect(screen.getByRole('img', { name: /compact summaries/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /distance left to the goal/i })).toBeInTheDocument();
  });

  it('shares one state description across both roots and tracks the budget', () => {
    const { container } = render(<JepaPlanning />);
    const plane = screen.getByRole('img', { name: /compact summaries/i });
    const trace = screen.getByRole('img', { name: /distance left to the goal/i });
    expect(plane.getAttribute('aria-describedby')).toBe(trace.getAttribute('aria-describedby'));
    const id = plane.getAttribute('aria-describedby');
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/With 24 options tried each step/);
    fireEvent.change(slider(), { target: { value: '8' } });
    expect(describedText(container)).toMatch(/With 8 options tried each step/);
  });

  it('opens with planning steps already taken, so the path and the fan are on the plane', async () => {
    const user = userEvent.setup();
    const { container } = render(<JepaPlanning />);
    expect(screen.getByTestId('step-readout')).toHaveTextContent(String(OPENING_STEPS));
    expect(screen.getByTestId('walked-path')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-fan')).toBeInTheDocument();
    expect(describedText(container)).toMatch(/walked path and the fan of 24 tried moves/);
    expect(describedText(container)).toMatch(new RegExp(`after ${OPENING_STEPS} planning steps`));
    await user.click(planButton());
    expect(describedText(container)).toMatch(new RegExp(`after ${OPENING_STEPS + 1} planning steps`));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(describedText(container)).toMatch(new RegExp(`after ${OPENING_STEPS} planning steps`));
  });

  it('the stage note names the options count and points at the kept move', () => {
    const { container } = render(<JepaPlanning />);
    const note = container.querySelector('[data-figure-annotation]');
    expect(note?.textContent).toContain('Each step: try 24 possible moves,');
    expect(note?.textContent).toContain('keep the one closest to the goal');
    expect(note?.querySelector('circle')).not.toBeNull();
    expect(container.querySelectorAll('[data-figure-annotation]')).toHaveLength(1);
    fireEvent.change(slider(), { target: { value: '8' } });
    expect(container.querySelector('[data-figure-annotation]')?.textContent).toContain(
      'Each step: try 8 possible moves,',
    );
  });
});
