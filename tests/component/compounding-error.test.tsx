import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CompoundingError } from '@/components/interactive/compounding-error';

function readout(): number {
  const el = screen.getByTestId('accumulated-deviation-readout');
  const value = Number.parseFloat(el.textContent ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

describe('CompoundingError', () => {
  it('renders both sliders, mode and DAgger toggles, readout, and reset', () => {
    render(<CompoundingError />);
    expect(
      screen.getByRole('slider', { name: /per-step error/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: /episode horizon/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /per-timestep prediction/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /chunk of 25 actions/i }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: /dagger/i }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('accumulated-deviation-readout'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reset/i }),
    ).toBeInTheDocument();
  });

  it('increases the accumulated deviation as the error slider moves up', () => {
    render(<CompoundingError />);
    const before = readout();
    fireEvent.change(screen.getByRole('slider', { name: /per-step error/i }), {
      target: { value: '12' },
    });
    expect(readout()).toBeGreaterThan(before);
  });

  it('increases the accumulated deviation as the horizon slider moves up', () => {
    render(<CompoundingError />);
    const before = readout();
    fireEvent.change(screen.getByRole('slider', { name: /episode horizon/i }), {
      target: { value: '240' },
    });
    expect(readout()).toBeGreaterThan(before);
  });

  it('chunked prediction strictly lowers the deviation at identical settings', async () => {
    const user = userEvent.setup();
    render(<CompoundingError />);
    const perStep = readout();
    await user.click(screen.getByRole('button', { name: /chunk of 25 actions/i }));
    expect(readout()).toBeLessThan(perStep);
    expect(
      screen.getByRole('button', { name: /chunk of 25 actions/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /per-timestep prediction/i }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('DAgger relabeling drops the deviation readout', async () => {
    const user = userEvent.setup();
    render(<CompoundingError />);
    const plain = readout();
    await user.click(screen.getByRole('button', { name: /dagger/i }));
    expect(readout()).toBeLessThan(plain);
    expect(screen.getByRole('button', { name: /dagger/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('reset restores the default state', async () => {
    const user = userEvent.setup();
    render(<CompoundingError />);
    const initial = screen.getByTestId(
      'accumulated-deviation-readout',
    ).textContent;
    fireEvent.change(screen.getByRole('slider', { name: /episode horizon/i }), {
      target: { value: '240' },
    });
    await user.click(screen.getByRole('button', { name: /dagger/i }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(
      screen.getByTestId('accumulated-deviation-readout'),
    ).toHaveTextContent(initial ?? '');
    expect(
      screen.getByRole('slider', { name: /episode horizon/i }),
    ).toHaveValue('120');
    expect(screen.getByRole('button', { name: /dagger/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('renders the rollout trace and both theoretical bound curves', () => {
    render(<CompoundingError />);
    expect(
      screen.getByRole('img', { name: /rollout trace/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /regret bounds/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('bc-bound-curve')).toBeInTheDocument();
    expect(screen.getByTestId('dagger-bound-curve')).toBeInTheDocument();
  });

  it('describes the bound chart with a sampled table and names the dashed bounds', () => {
    const { container } = render(<CompoundingError />);
    const table = container.querySelector(
      'details[data-chart-data][data-chart-form="table"]',
    );
    const desc = table?.previousElementSibling;
    expect(desc?.textContent).toMatch(/dashed curves/i);
    expect(desc?.textContent).toMatch(/deviation/i);
    const details = container.querySelector(
      'details[data-chart-data][data-chart-form="table"]',
    );
    expect(details).toBeTruthy();
    expect(details?.querySelectorAll('tbody tr').length).toBe(6);
    const boundsImg = screen.getByRole('img', { name: /regret bounds/i });
    expect(boundsImg).toHaveAttribute('aria-describedby');
    const rolloutImg = screen.getByRole('img', { name: /rollout trace/i });
    expect(rolloutImg).toHaveAttribute('aria-describedby');
  });

  it('gives the doubled-horizon mount a structurally different bounds takeaway', () => {
    const lab = render(<CompoundingError defaultSteps={120} />);
    const labText =
      lab.container.querySelector('details[data-chart-form="table"]')
        ?.previousElementSibling?.textContent ?? '';
    lab.unmount();
    const pred = render(<CompoundingError defaultSteps={240} />);
    const predText =
      pred.container.querySelector('details[data-chart-form="table"]')
        ?.previousElementSibling?.textContent ?? '';
    const norm = (s: string) =>
      s.toLowerCase().replace(/\s+/g, ' ').replace(/\d+/g, '#').trim();
    expect(labText.length).toBeGreaterThan(60);
    expect(predText.length).toBeGreaterThan(60);
    expect(norm(labText)).not.toBe(norm(predText));
    expect(predText).toMatch(/prediction-step bounds panel/i);
  });
});
