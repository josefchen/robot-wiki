import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LatentImagination } from '@/components/interactive/latent-imagination';

function deviationReadout(): number {
  const el = screen.getByTestId('deviation-readout');
  const value = Number.parseFloat(el.textContent ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

describe('LatentImagination', () => {
  it('renders the horizon and error sliders, mode toggles, readout, and reset', () => {
    render(<LatentImagination />);
    expect(
      screen.getByRole('slider', { name: /imagination horizon/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: /one-step model error/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /with decoder/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /decoder-free/i }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('deviation-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('increases the deviation readout monotonically as the horizon extends', () => {
    render(<LatentImagination />);
    const horizon = screen.getByRole('slider', {
      name: /imagination horizon/i,
    });
    const at15 = deviationReadout();
    fireEvent.change(horizon, { target: { value: '30' } });
    const at30 = deviationReadout();
    fireEvent.change(horizon, { target: { value: '50' } });
    const at50 = deviationReadout();
    expect(at30).toBeGreaterThan(at15);
    expect(at50).toBeGreaterThan(at30);
  });

  it('increases the deviation readout as the model error grows', () => {
    render(<LatentImagination />);
    const before = deviationReadout();
    fireEvent.change(screen.getByRole('slider', { name: /model error/i }), {
      target: { value: '6' },
    });
    expect(deviationReadout()).toBeGreaterThan(before);
  });

  it('decoder mode shows decoded imagined frames', () => {
    render(<LatentImagination />);
    expect(screen.getByTestId('decoded-frames')).toBeInTheDocument();
    expect(screen.queryByTestId('decoder-free-note')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reward-error-readout')).not.toBeInTheDocument();
  });

  it('decoder-free mode replaces frames with a no-image annotation and a reward readout', async () => {
    const user = userEvent.setup();
    render(<LatentImagination />);
    await user.click(screen.getByRole('button', { name: /decoder-free/i }));
    expect(
      screen.getByRole('button', { name: /decoder-free/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('decoder-free-note')).toHaveTextContent(
      /no image reconstruction/i,
    );
    expect(screen.queryByTestId('decoded-frames')).not.toBeInTheDocument();
    const reward = screen.getByTestId('reward-error-readout');
    expect(Number.parseFloat(reward.textContent ?? '')).toBeGreaterThan(0);
  });

  it('reward readout also grows as the horizon extends in decoder-free mode', async () => {
    const user = userEvent.setup();
    render(<LatentImagination />);
    await user.click(screen.getByRole('button', { name: /decoder-free/i }));
    const read = () =>
      Number.parseFloat(
        screen.getByTestId('reward-error-readout').textContent ?? '',
      );
    const short = read();
    fireEvent.change(screen.getByRole('slider', { name: /imagination horizon/i }), {
      target: { value: '50' },
    });
    expect(read()).toBeGreaterThan(short);
  });

  it('reset restores the default state', async () => {
    const user = userEvent.setup();
    render(<LatentImagination />);
    const initial = screen.getByTestId('deviation-readout').textContent;
    fireEvent.change(screen.getByRole('slider', { name: /imagination horizon/i }), {
      target: { value: '50' },
    });
    await user.click(screen.getByRole('button', { name: /decoder-free/i }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('deviation-readout')).toHaveTextContent(
      initial ?? '',
    );
    expect(
      screen.getByRole('slider', { name: /imagination horizon/i }),
    ).toHaveValue('15');
    expect(
      screen.getByRole('button', { name: /with decoder/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('decoded-frames')).toBeInTheDocument();
  });

  it('renders the rollout and deviation charts with accessible labels', () => {
    render(<LatentImagination />);
    expect(
      screen.getByRole('img', { name: /imagined rollout/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /latent deviation/i }),
    ).toBeInTheDocument();
    // The published 3-15 step horizon range is annotated on the chart.
    expect(screen.getByTestId('typical-range-band')).toBeInTheDocument();
  });

  it('describes the deviation chart with a sampled table and the rollout as state', () => {
    const { container } = render(<LatentImagination />);
    const tableDesc = [...container.querySelectorAll('[data-chart-description]')].find(
      (el) => /shaded band/i.test(el.textContent ?? ''),
    );
    expect(tableDesc?.textContent).toMatch(/published 3 to 15/i);
    const table = container.querySelector(
      'details[data-chart-data][data-chart-form="table"]',
    );
    expect(table).toBeTruthy();
    const rows = table?.querySelectorAll('tbody tr').length ?? 0;
    expect(rows).toBeGreaterThanOrEqual(5);
    expect(rows).toBeLessThanOrEqual(10);
    expect(
      screen.getByRole('img', { name: /latent deviation/i }),
    ).toHaveAttribute('aria-describedby');
    const rollout = screen.getByRole('img', { name: /imagined rollout/i });
    const rolloutId = rollout.getAttribute('aria-describedby');
    expect(rolloutId).toBeTruthy();
    const rolloutDesc = container.querySelector(`[id="${CSS.escape(rolloutId!)}"]`);
    expect(rolloutDesc?.textContent).toMatch(/latent rollout view/);
    expect(rolloutDesc?.textContent).toMatch(/dashed true trajectory/);
    fireEvent.change(
      screen.getByRole('slider', { name: /imagination horizon/i }),
      { target: { value: '30' } },
    );
    const moved = container.querySelector(`#${CSS.escape(rolloutId!)}`)
      ?.textContent ?? '';
    expect(moved).toMatch(/t = 30 of 50/);
  });
});
