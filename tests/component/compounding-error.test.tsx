import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompoundingError } from '@/components/interactive/compounding-error';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import {
  DRIFT_SPAN,
  MAX_MOVES,
  RUN_LENGTH,
  WORST_EPSILON,
  X0,
  correctionPoints,
  driftScale,
  moveX,
  offsetAt,
  rolloutOf,
} from '@/components/iso/figures/copy-tracing-bench';
import { DAGGER_INTERVAL, accumulatedCost, simulateDeviation } from '@/lib/compounding-error';

function readout(): number {
  const el = screen.getByTestId('accumulated-deviation-readout');
  const value = Number.parseFloat((el.textContent ?? '').replace(/,/g, ''));
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

function fold(container: HTMLElement, kind: 'adjust' | 'method'): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-figure-fold="${kind}"]`);
  expect(el).not.toBeNull();
  return el!;
}

describe('CompoundingError', () => {
  it('leads with the takeaway, two preset groups, and the sliders and reset in "Adjust more"', () => {
    const { container } = render(<CompoundingError />);
    expect(container.querySelector('[data-figure-kicker]')?.textContent).toBe('Compounding error');
    expect(container.querySelector('[data-figure-title]')?.textContent).toBe(
      'Small mistakes snowball: twice the task, four times the drift',
    );
    const groups = container.querySelectorAll(':scope [data-figure-controls] > [data-preset-group]');
    expect(groups).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Short task (120 moves)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Twice as long (240 moves)' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'One move at a time' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '25 moves per plan' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'A teacher corrects it' })).toHaveAttribute('aria-pressed', 'false');
    const adjust = within(fold(container, 'adjust'));
    expect(adjust.getByRole('slider', { name: /per-step error/i })).toBeInTheDocument();
    expect(adjust.getByRole('slider', { name: /episode horizon/i })).toBeInTheDocument();
    expect(adjust.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('accumulated-deviation-readout')).toBeInTheDocument();
  });

  it('shows no symbols in the main view and keeps the formulas in "How this was made"', () => {
    const { container } = render(<CompoundingError defaultSteps={240} />);
    const frame = container.querySelector('[data-figure-frame="compounding-error"]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
    const method = fold(container, 'method');
    expect(method.textContent).toContain('εT(T+1)/2');
    expect(method.textContent).toContain('Ross, Gordon and Bagnell (2011)');
    expect(container.querySelector('[data-figure-stage]')?.textContent).not.toMatch(/ε|Δ/);
  });

  it('annotates the doubled task as about four times the drift at the article mount', () => {
    const { container } = render(<CompoundingError defaultSteps={240} />);
    const note = container.querySelector('[data-figure-stage] [data-figure-annotation]');
    expect(note?.textContent).toBe('Twice as long:about four times as far off course');
    expect(screen.getByTestId('accumulated-deviation-readout')).toHaveTextContent('1,505');
    expect(screen.getByTestId('half-deviation-readout')).toHaveTextContent('370');
    // The readout says it in plain words, from the same model sums.
    expect(container.querySelector('[data-readout]')?.textContent).toBe(
      '240 moves · drift 1,505 units · the first 120 moves drift 370',
    );
    expect(screen.getByTestId('robot-gripper')).toBeInTheDocument();
    expect(container.querySelector('[data-figure-stage]')?.textContent).toContain('the path a person showed it');
  });

  it('a teacher keeps the drift growing only about as fast as the task', async () => {
    const user = userEvent.setup();
    const { container } = render(<CompoundingError defaultSteps={240} />);
    await user.click(screen.getByRole('button', { name: 'A teacher corrects it' }));
    const note = container.querySelector('[data-figure-stage] [data-figure-annotation]');
    expect(note?.textContent).toBe('Twice as long:about twice as far off course');
  });

  it('increases the accumulated deviation as the error slider moves up', () => {
    render(<CompoundingError />);
    const before = readout();
    fireEvent.change(screen.getByRole('slider', { name: /per-step error/i }), {
      target: { value: '12' },
    });
    expect(readout()).toBeGreaterThan(before);
  });

  it('increases the accumulated deviation as the task gets longer', async () => {
    const user = userEvent.setup();
    render(<CompoundingError />);
    const before = readout();
    await user.click(screen.getByRole('button', { name: 'Twice as long (240 moves)' }));
    expect(readout()).toBeGreaterThan(before);
    fireEvent.change(screen.getByRole('slider', { name: /episode horizon/i }), {
      target: { value: '180' },
    });
    expect(screen.getByRole('button', { name: 'Twice as long (240 moves)' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Short task (120 moves)' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('planning 25 moves at once strictly lowers the deviation at identical settings', async () => {
    const user = userEvent.setup();
    render(<CompoundingError />);
    const perStep = readout();
    await user.click(screen.getByRole('button', { name: '25 moves per plan' }));
    expect(readout()).toBeLessThan(perStep);
    expect(screen.getByRole('button', { name: '25 moves per plan' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'One move at a time' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('the teacher drops the deviation readout and marks each correction', async () => {
    const user = userEvent.setup();
    const { container } = render(<CompoundingError />);
    const plain = readout();
    await user.click(screen.getByRole('button', { name: 'A teacher corrects it' }));
    expect(readout()).toBeLessThan(plain);
    expect(screen.getByRole('button', { name: 'A teacher corrects it' })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelectorAll('[data-part="teacher-corrections"] [data-correction]')).toHaveLength(6);
  });

  it('reset restores the default state', async () => {
    const user = userEvent.setup();
    render(<CompoundingError />);
    const initial = screen.getByTestId('accumulated-deviation-readout').textContent;
    fireEvent.change(screen.getByRole('slider', { name: /episode horizon/i }), {
      target: { value: '240' },
    });
    await user.click(screen.getByRole('button', { name: 'A teacher corrects it' }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('accumulated-deviation-readout')).toHaveTextContent(initial ?? '');
    expect(screen.getByRole('slider', { name: /episode horizon/i })).toHaveValue('120');
    expect(screen.getByRole('button', { name: 'One move at a time' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders the rollout trace and both illustrative reference curves', () => {
    const { container } = render(<CompoundingError />);
    expect(screen.getByRole('img', { name: /rollout trace/i })).toBeInTheDocument();
    const method = within(fold(container, 'method'));
    expect(method.getByRole('img', { name: /illustrative reference curves/i })).toBeInTheDocument();
    expect(screen.getByTestId('bc-bound-curve')).toBeInTheDocument();
    expect(screen.getByTestId('dagger-bound-curve')).toBeInTheDocument();
  });

  it('describes the bound chart with a sampled table and names the dashed bounds', () => {
    const { container } = render(<CompoundingError />);
    const table = container.querySelector('details[data-chart-data][data-chart-form="table"]');
    const desc = table?.previousElementSibling;
    expect(desc?.textContent).toMatch(/dashed curves/i);
    expect(desc?.textContent).toMatch(/deviation/i);
    expect(table).toBeTruthy();
    expect(table?.querySelectorAll('tbody tr').length).toBe(6);
    const boundsImg = screen.getByRole('img', { name: /illustrative reference curves/i });
    expect(boundsImg).toHaveAttribute('aria-describedby');
    const rolloutImg = screen.getByRole('img', { name: /rollout trace/i });
    expect(rolloutImg).toHaveAttribute('aria-describedby');
  });

  it('gives the doubled-horizon mount a structurally different bounds takeaway', () => {
    const lab = render(<CompoundingError defaultSteps={120} />);
    const labText =
      lab.container.querySelector('details[data-chart-form="table"]')?.previousElementSibling
        ?.textContent ?? '';
    lab.unmount();
    const pred = render(<CompoundingError defaultSteps={240} />);
    const predText =
      pred.container.querySelector('details[data-chart-form="table"]')?.previousElementSibling
        ?.textContent ?? '';
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/\d+/g, '#').trim();
    expect(labText.length).toBeGreaterThan(60);
    expect(predText.length).toBeGreaterThan(60);
    expect(norm(labText)).not.toBe(norm(predText));
    expect(predText).toMatch(/prediction-step reference panel/i);
  });

  it('draws the copy-tracing bench: the slide sits at the model drift, the wash is split at half the task', () => {
    const { container } = render(<CompoundingError defaultSteps={240} />);
    const svg = container.querySelector('[data-anatomy-drawing] svg')!;
    expect(svg).toHaveAccessibleName(/copy-tracing bench/i);
    expect(svg).toHaveAccessibleName(/1505 units, against 370 over the first 120 moves/);
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.querySelectorAll('[data-series]')).toHaveLength(0);
    expect(screen.getByTestId('drift-first-half').getAttribute('d')).toMatch(/^M/);
    expect(screen.getByTestId('drift-second-half').getAttribute('d')).toMatch(/^M/);
    expect(svg.querySelectorAll('.iso-solid[data-lit]').length).toBeGreaterThan(0);
  });

  it('starts and stops the bench from the one run button, with no pressed state', () => {
    render(<CompoundingError />);
    const run = screen.getByTestId('ce-run');
    expect(run).toHaveTextContent('Run the bench');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the bench');
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Run the bench');
    fireEvent.click(run);
    fireEvent.click(screen.getByRole('button', { name: 'A teacher corrects it' }));
    expect(run).toHaveTextContent('Run the bench');
  });
});

describe('copy-tracing bench model', () => {
  const params = { epsilon: 0.05, steps: 240, mode: 'per-step' as const, chunkSize: 25, dagger: false, maxSteps: 240 };

  it('moves the slide by the same recurrence the readout sums', () => {
    const bench = rolloutOf(params);
    const deviation = simulateDeviation(params);
    expect(bench.deviation).toEqual(deviation);
    for (const t of [0, 37, 120, 240]) expect(offsetAt(bench, t)).toBeCloseTo(deviation[t] * bench.scale);
    expect(Math.round(accumulatedCost(bench.deviation))).toBe(1505);
    expect(Math.round(accumulatedCost(bench.deviation.slice(0, 121)))).toBe(370);
  });

  it('fixes the drift scale at the worst reachable case, so the worst drift spans the template', () => {
    const worst = simulateDeviation({ epsilon: WORST_EPSILON, steps: 240, mode: 'per-step', chunkSize: 25, dagger: false });
    expect(driftScale(240, 25) * worst[240]).toBeCloseTo(DRIFT_SPAN);
    const bench = rolloutOf({ ...params, epsilon: WORST_EPSILON });
    expect(offsetAt(bench, 240)).toBeCloseTo(DRIFT_SPAN);
  });

  it('runs the task along the whole bench and marks one correction per teacher round', () => {
    expect(moveX(0, MAX_MOVES)).toBe(X0);
    expect(moveX(MAX_MOVES, MAX_MOVES)).toBe(X0 + RUN_LENGTH);
    const taught = rolloutOf({ ...params, dagger: true });
    expect(correctionPoints(taught, 240, true)).toHaveLength(240 / DAGGER_INTERVAL);
    expect(correctionPoints(taught, 240, false)).toHaveLength(0);
    // Each round winds the slide three quarters back.
    expect(offsetAt(taught, 20)).toBeCloseTo(0.25 * offsetAt(rolloutOf({ ...params, steps: 20 }), 20));
  });
});

describe('CompoundingError served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(<CompoundingError defaultSteps={240} />)}</main></body></html>`;

  it('passes the figure-system check', () => {
    const { figures, violations } = inspectFigureDocument(html, '/manipulation/bc-foundations/');
    expect(figures).toEqual(['compounding-error']);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('shows no symbol, formula or bare unit in the main view', () => {
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});
