import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CompoundingError } from '@/components/interactive/compounding-error';
import { mainViewSymbolHits } from '@/lib/figure-main-view';

function readout(): number {
  const el = screen.getByTestId('accumulated-deviation-readout');
  const value = Number.parseFloat(el.textContent ?? '');
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
    expect(screen.getByTestId('accumulated-deviation-readout')).toHaveTextContent('1505');
    expect(screen.getByTestId('half-deviation-readout')).toHaveTextContent('370');
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
    expect(
      container.querySelectorAll('[data-series="teacher-corrections"] [data-chart-mark="cross"]'),
    ).toHaveLength(6);
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
});
