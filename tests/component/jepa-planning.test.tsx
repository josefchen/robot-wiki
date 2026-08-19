import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { JepaPlanning } from '@/components/interactive/jepa-planning';

function distanceReadout(): number {
  const el = screen.getByTestId('distance-readout');
  const value = Number.parseFloat(el.textContent ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

describe('JepaPlanning', () => {
  it('renders the search-budget slider, goal toggles, plan and reset controls, and the no-decoder note', () => {
    render(<JepaPlanning />);
    expect(
      screen.getByRole('slider', { name: /search budget/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /goal: pick/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /goal: place/i }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: /plan step/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('distance-readout')).toBeInTheDocument();
    expect(screen.getByTestId('no-decoder-note')).toHaveTextContent(
      /no pixel decoder/i,
    );
  });

  it('decreases the goal-latent distance over successive planning steps', async () => {
    const user = userEvent.setup();
    render(<JepaPlanning />);
    const plan = screen.getByRole('button', { name: /plan step/i });
    const initial = distanceReadout();
    const values: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      await user.click(plan);
      values.push(distanceReadout());
    }
    expect(values[0]).toBeLessThan(initial);
    expect(values[1]).toBeLessThan(values[0]);
    expect(values[2]).toBeLessThan(values[1]);
    expect(screen.getByTestId('step-readout')).toHaveTextContent('3');
  });

  it('is deterministic: the same steps reproduce the same distances', async () => {
    const user = userEvent.setup();
    render(<JepaPlanning />);
    const plan = screen.getByRole('button', { name: /plan step/i });
    await user.click(plan);
    await user.click(plan);
    const firstRun = distanceReadout();
    await user.click(screen.getByRole('button', { name: /reset/i }));
    await user.click(plan);
    await user.click(plan);
    expect(distanceReadout()).toBeCloseTo(firstRun, 12);
  });

  it('reset restores the initial state', async () => {
    const user = userEvent.setup();
    render(<JepaPlanning />);
    const initial = screen.getByTestId('distance-readout').textContent;
    await user.click(screen.getByRole('button', { name: /plan step/i }));
    fireEvent.change(screen.getByRole('slider', { name: /search budget/i }), {
      target: { value: '48' },
    });
    await user.click(screen.getByRole('button', { name: /goal: place/i }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('distance-readout')).toHaveTextContent(
      initial ?? '',
    );
    expect(screen.getByTestId('step-readout')).toHaveTextContent('0');
    expect(
      screen.getByRole('slider', { name: /search budget/i }),
    ).toHaveValue('24');
    expect(
      screen.getByRole('button', { name: /goal: pick/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('switching the goal restarts planning from the initial state', async () => {
    const user = userEvent.setup();
    render(<JepaPlanning />);
    const pickInitial = distanceReadout();
    await user.click(screen.getByRole('button', { name: /plan step/i }));
    await user.click(screen.getByRole('button', { name: /goal: place/i }));
    expect(screen.getByTestId('step-readout')).toHaveTextContent('0');
    const placeInitial = distanceReadout();
    expect(placeInitial).toBeGreaterThan(0);
    expect(placeInitial).not.toBeCloseTo(pickInitial, 6);
    expect(
      screen.getByRole('button', { name: /goal: place/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('the candidate fan size follows the search budget', async () => {
    const user = userEvent.setup();
    render(<JepaPlanning />);
    const plan = screen.getByRole('button', { name: /plan step/i });
    await user.click(plan);
    expect(screen.getAllByTestId('candidate-sequence')).toHaveLength(24);
    fireEvent.change(screen.getByRole('slider', { name: /search budget/i }), {
      target: { value: '8' },
    });
    await user.click(plan);
    expect(screen.getAllByTestId('candidate-sequence')).toHaveLength(8);
  });

  it('renders the latent-space plane and distance trace with accessible labels', () => {
    render(<JepaPlanning />);
    expect(
      screen.getByRole('img', { name: /latent space/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /goal-embedding distance/i }),
    ).toBeInTheDocument();
  });

  it('shares one state description across both roots and tracks the budget', () => {
    const { container } = render(<JepaPlanning />);
    const plane = screen.getByRole('img', { name: /latent space/i });
    const trace = screen.getByRole('img', { name: /goal-embedding distance/i });
    expect(plane.getAttribute('aria-describedby')).toBe(
      trace.getAttribute('aria-describedby'),
    );
    const id = plane.getAttribute('aria-describedby');
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/search budget of 24 sequences/);
    fireEvent.change(screen.getByRole('slider', { name: /search budget/i }), {
      target: { value: '8' },
    });
    expect(
      container.querySelector('[data-chart-description]')?.textContent,
    ).toMatch(/search budget of 8 sequences/);
  });
});

  it('tracks the plane clause against executed planning steps', async () => {
    const user = userEvent.setup();
    const { container } = render(<JepaPlanning />);
    const read = () =>
      container.querySelector('[data-chart-description]')?.textContent ?? '';
    // Step 0: the plane really is two latents and nothing else.
    expect(read()).toMatch(/two points/);
    // State 1: one Plan step executes; the fan and the executed path are
    // on the plane, so the two-points claim must be gone.
    await user.click(screen.getByRole('button', { name: /plan step/i }));
    expect(screen.getAllByTestId('candidate-sequence').length).toBeGreaterThan(
      0,
    );
    expect(read()).not.toMatch(/two points/);
    expect(read()).toMatch(/candidate fan/i);
    // State 2: reset returns the plane to the two-latent start.
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(read()).toMatch(/two points/);
  });
