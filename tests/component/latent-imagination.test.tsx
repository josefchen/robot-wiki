import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LatentImagination } from '@/components/interactive/latent-imagination';

function deviationReadout(): number {
  const value = Number.parseFloat(screen.getByTestId('deviation-readout').textContent ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

const horizon = () => screen.getByRole('slider', { name: /how far ahead to imagine/i });
const accuracy = () => screen.getByRole('slider', { name: /how accurate each step is/i });
const adjustFold = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-figure-fold="adjust"]')!;
const methodFold = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-figure-fold="method"]')!;

describe('LatentImagination', () => {
  it('shows two plain sliders, with the model choice and reset under "Adjust more"', () => {
    const { container } = render(<LatentImagination />);
    expect(horizon()).toHaveValue('15');
    expect(horizon()).toHaveAttribute('aria-valuetext', '15 steps');
    expect(accuracy()).toHaveValue('2');
    expect(accuracy()).toHaveAttribute('aria-valuetext', '2.0% off per step');
    const fold = adjustFold(container);
    expect(within(fold).getByRole('button', { name: /^dreamer \(draws pictures\)$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(fold).getByRole('button', { name: /^td-mpc2 \(no pictures\)$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(within(fold).getByRole('button', { name: /^reset$/i })).toBeInTheDocument();
  });

  it('opens on the insight: the imagined ball is already off the real flight 15 steps ahead', () => {
    render(<LatentImagination />);
    expect(screen.getByTestId('drift-note')).toHaveTextContent('15 steps ahead:');
    expect(screen.getByTestId('drift-note')).toHaveTextContent('already this far off');
    expect(screen.getByTestId('drift-bracket')).toBeInTheDocument();
    const real = Number(screen.getByTestId('real-ball').getAttribute('cy'));
    const imagined = Number(screen.getByTestId('imagined-ball').getAttribute('cy'));
    expect(imagined - real).toBeCloseTo(0.301 * 80, 0);
    expect(screen.getByTestId('decoded-frames').querySelectorAll('circle')).toHaveLength(3);
  });

  it('grows the drift monotonically as the robot imagines further ahead', () => {
    render(<LatentImagination />);
    const at15 = deviationReadout();
    fireEvent.change(horizon(), { target: { value: '30' } });
    const at30 = deviationReadout();
    fireEvent.change(horizon(), { target: { value: '50' } });
    const at50 = deviationReadout();
    expect(at15).toBeCloseTo(0.301, 3);
    expect(at30).toBeGreaterThan(at15);
    expect(at50).toBeGreaterThan(at30);
  });

  it('stays close for a short look-ahead and says so', () => {
    render(<LatentImagination />);
    fireEvent.change(horizon(), { target: { value: '1' } });
    expect(screen.getByTestId('drift-note')).toHaveTextContent('1 step ahead:');
    expect(screen.getByTestId('drift-note')).toHaveTextContent('still close to the real flight');
    expect(screen.queryByTestId('drift-bracket')).toBeNull();
  });

  it('a sloppier step drifts faster, and far enough the imagined ball hits the floor', () => {
    render(<LatentImagination />);
    const sharp = deviationReadout();
    fireEvent.change(accuracy(), { target: { value: '6' } });
    expect(deviationReadout()).toBeGreaterThan(sharp);
    fireEvent.change(horizon(), { target: { value: '50' } });
    expect(screen.getByTestId('drift-note')).toHaveTextContent('it has already hit the floor');
    expect(screen.getByTestId('deviation-readout')).toHaveTextContent('3.09');
  });

  it('TD-MPC2 draws no pictures and reports the reward error instead', async () => {
    const user = userEvent.setup();
    const { container } = render(<LatentImagination />);
    await user.click(within(adjustFold(container)).getByRole('button', { name: /td-mpc2/i }));
    expect(screen.queryByTestId('decoded-frames')).toBeNull();
    expect(screen.getByTestId('decoder-free-note')).toHaveTextContent(/draws no pictures/i);
    expect(screen.getByTestId('reward-error-bars')).toHaveTextContent(/at step 4/);
    expect(screen.getByTestId('reward-error-readout')).toHaveTextContent('0.105');
    expect(screen.getByTestId('imagined-path')).toBeInTheDocument();
  });

  it('reset restores the look-ahead, the step accuracy and the Dreamer view', async () => {
    const user = userEvent.setup();
    const { container } = render(<LatentImagination />);
    fireEvent.change(horizon(), { target: { value: '40' } });
    fireEvent.change(accuracy(), { target: { value: '5' } });
    await user.click(within(adjustFold(container)).getByRole('button', { name: /td-mpc2/i }));
    await user.click(within(adjustFold(container)).getByRole('button', { name: /^reset$/i }));
    expect(horizon()).toHaveValue('15');
    expect(accuracy()).toHaveValue('2');
    expect(screen.getByTestId('decoded-frames')).toBeInTheDocument();
    expect(deviationReadout()).toBeCloseTo(0.301, 3);
  });

  it('keeps the recurrence, the deviation chart and its illustrative band in "How this was made"', () => {
    const { container } = render(<LatentImagination />);
    const method = methodFold(container);
    expect(method).toHaveTextContent(/toy recurrence, not a measured model/);
    expect(within(method).getByRole('img', { name: /latent deviation versus imagination step/i })).toBeInTheDocument();
    expect(within(method).getByTestId('typical-range-band')).toBeInTheDocument();
    expect(within(method).getByTestId('deviation-curve')).toBeInTheDocument();
    expect(method).toHaveTextContent(/teaching choice, not a published range/);
    const details = method.querySelector<HTMLDetailsElement>('details[data-chart-form="state"]');
    expect(details?.open).toBe(true);
  });

  it('describes the throw and the sampled deviation table for the current state', () => {
    const { container } = render(<LatentImagination />);
    const texts = [...container.querySelectorAll('[data-chart-description]')].map((el) => el.textContent ?? '');
    expect(texts.some((t) => /latent deviation grows from 0 at step 0 to 0\.301 units at the current 15-step horizon/.test(t))).toBe(true);
    expect(texts.some((t) => /imagines 15 steps ahead, at 2\.0% off per step, is 0\.301 units/.test(t))).toBe(true);
  });
});
