import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { JepaPlanning, OPENING_STEPS } from '@/components/interactive/jepa-planning';
import { ARM, HEAD_X, RAIL_X0, RAIL_X1, fanOf, toTable } from '@/components/iso/figures/planning-table';
import { GOALS, INITIAL_STATE, goalDistance, planStep } from '@/lib/jepa-planning';

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
    expect(planButton()).not.toHaveAttribute('aria-disabled');
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

  it('the stage note names the options count, and the lit feeler is the kept move', () => {
    const { container } = render(<JepaPlanning />);
    const note = container.querySelector('[data-figure-annotation]');
    expect(note?.textContent).toContain('Each step: try 24 possible moves,');
    expect(note?.textContent).toContain('keep the one closest to the goal');
    expect(container.querySelectorAll('[data-figure-annotation]')).toHaveLength(1);
    expect(screen.getByTestId('plan-note')).toHaveTextContent('Each step: try 24 possible moves, keep the one closest to the goal');
    const kept = container.querySelectorAll('[data-candidate="kept"]');
    expect(kept).toHaveLength(1);
    expect(kept[0]!.querySelector('[data-lit]')).not.toBeNull();
    expect(screen.getByTestId('candidate-fan').querySelector('.iso-line[data-tone="lit"]')).not.toBeNull();
    fireEvent.change(slider(), { target: { value: '8' } });
    expect(screen.getByTestId('plan-note')).toHaveTextContent('Each step: try 8 possible moves,');
    expect(container.querySelectorAll('[data-candidate="kept"]')).toHaveLength(1);
  });

  it('stands the probe head on the current summary, and its kept feeler is the move with the least distance left', () => {
    render(<JepaPlanning />);
    const goal = GOALS[0]!.point;
    let state = INITIAL_STATE;
    for (let i = 0; i < OPENING_STEPS; i += 1) state = planStep({ state, goal, stepIndex: i, candidateCount: 24 }).next;
    const head = screen.getByTestId('probe-head');
    const [x, y] = toTable(state);
    expect(Number(head.getAttribute('data-x'))).toBeCloseTo(x, 1);
    expect(Number(head.getAttribute('data-y'))).toBeCloseTo(y, 1);
    const next = planStep({ state, goal, stepIndex: OPENING_STEPS, candidateCount: 24 });
    const energies = next.candidates.map((c) => c.energy);
    expect(next.candidates[next.chosenIndex]!.energy).toBe(Math.min(...energies));
    // Turning the plane onto the table keeps every distance: table distance is the toy distance times the scale.
    const a = toTable(INITIAL_STATE);
    const b = toTable(goal);
    expect(Math.hypot(a[0] - b[0], a[1] - b[1]) / goalDistance(INITIAL_STATE, goal)).toBeCloseTo(300, 6);
  });

  it('spreads the fan for display without moving the kept pin or changing which pin is closest', () => {
    for (const goalPoint of GOALS.map((g) => g.point)) {
      for (const count of [4, 8, 24, 64]) {
        let state = INITIAL_STATE;
        for (let step = 0; step < 6; step += 1) {
          const next = planStep({ state, goal: goalPoint, stepIndex: step, candidateCount: count });
          const ends = next.candidates.map((c) => c.endpoint);
          const shown = fanOf(state, goalPoint, ends, next.chosenIndex);
          // The kept pin is the model's own predicted landing.
          expect(shown[next.chosenIndex]!.x).toBeCloseTo(ends[next.chosenIndex]!.x, 12);
          expect(shown[next.chosenIndex]!.y).toBeCloseTo(ends[next.chosenIndex]!.y, 12);
          // Every pin keeps the model's reach, and the kept one is strictly the closest to the goal.
          const reach = Math.hypot(ends[0]!.x - state.x, ends[0]!.y - state.y);
          const keptDistance = goalDistance(shown[next.chosenIndex]!, goalPoint);
          shown.forEach((p, i) => {
            expect(Math.hypot(p.x - state.x, p.y - state.y)).toBeCloseTo(reach, 9);
            if (i !== next.chosenIndex) expect(goalDistance(p, goalPoint)).toBeGreaterThan(keptDistance);
          });
          state = next.next;
        }
      }
    }
  });

  it('keeps the gantry bridge on its rails for every head position the figure can show', () => {
    for (const goalPoint of GOALS.map((g) => g.point)) {
      for (let count = 4; count <= 64; count += 4) {
        let state = INITIAL_STATE;
        for (let step = 0; step < 12 && goalDistance(state, goalPoint) > 0.03; step += 1) {
          state = planStep({ state, goal: goalPoint, stepIndex: step, candidateCount: count }).next;
          if (step + 1 < OPENING_STEPS) continue;
          const [x] = toTable(state);
          expect(x).toBeGreaterThanOrEqual(HEAD_X.min - 0.1);
          expect(x).toBeLessThanOrEqual(HEAD_X.max + 0.1);
          expect(x - ARM).toBeGreaterThan(RAIL_X0);
          expect(x - ARM).toBeLessThan(RAIL_X1);
        }
      }
    }
  });

  it('reads the distance left on the stage readout and stops the fan once the goal is reached', async () => {
    const user = userEvent.setup();
    const { container } = render(<JepaPlanning />);
    expect(container.querySelector('[data-readout]')).toHaveTextContent('move 2 · 55% of the distance left · 24 tried');
    for (let i = 0; i < 12; i += 1) {
      if (planButton().getAttribute('aria-disabled') === 'true') break;
      await user.click(planButton());
    }
    // Unavailable once the goal is reached but still focusable, so the last move keeps keyboard focus.
    expect(planButton()).toHaveAttribute('aria-disabled', 'true');
    expect(planButton()).toHaveFocus();
    expect(screen.queryByTestId('candidate-fan')).toBeNull();
    const reached = container.querySelector('[data-readout]')?.textContent;
    expect(reached).toMatch(/goal reached after \d+ moves/);
    await user.click(planButton());
    expect(container.querySelector('[data-readout]')?.textContent).toBe(reached);
  });
});
