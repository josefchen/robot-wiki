import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ControlLoopBudget } from '@/components/interactive/control-loop-budget';

function slider() {
  return screen.getByRole('slider', { name: /model size/i });
}

function verdict() {
  return screen.getByTestId('verdict-readout');
}

describe('ControlLoopBudget', () => {
  it('keeps the model-size slider, readouts, cited latencies and reset in Adjust more', () => {
    const { container } = render(<ControlLoopBudget />);
    const adjust = container.querySelector('details[data-figure-fold="adjust"]')!;
    expect(slider()).toHaveAttribute('aria-label');
    expect(adjust).toContainElement(slider());
    expect(adjust).toContainElement(screen.getByTestId('latency-readout'));
    expect(adjust).toContainElement(screen.getByTestId('hz-readout'));
    expect(adjust).toContainElement(verdict());
    expect(adjust).toContainElement(screen.getByTestId('ref-rtc-mobile'));
    expect(adjust).toContainElement(screen.getByRole('button', { name: /reset/i }));
    expect(container.querySelector('[data-figure-fold="method"]')).toHaveTextContent(
      /20 ms budget/i,
    );
  });

  it('leads with the takeaway, two computer presets and the beats', () => {
    const { container } = render(<ControlLoopBudget />);
    expect(container.querySelector('[data-figure-title]')).toHaveTextContent(
      "The robot's brain thinks slower than the arm needs",
    );
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Control-loop budget');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      'the arm either waits or keeps going on stale orders',
    );
    expect(screen.getByRole('button', { name: "Robot's own computer" })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // 52.57 ms against 20 ms beats: the beats at 20 and 40 ms pass with no command.
    expect(container.querySelectorAll('[data-clb-beat="missed"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-clb-beat]')).toHaveLength(9);
    const note = container.querySelectorAll('[data-figure-annotation]');
    expect(note).toHaveLength(1);
    expect(note[0].textContent).toBe(
      'The arm needs a new commandevery fiftieth of a second; thiscomputer takes over twice as long',
    );
  });

  it('the data-centre preset shows the cited H100 prediction inside one beat', async () => {
    const user = userEvent.setup();
    const { container } = render(<ControlLoopBudget />);
    await user.click(screen.getByRole('button', { name: 'Data-centre computer' }));
    expect(container.querySelectorAll('[data-clb-beat="missed"]')).toHaveLength(0);
    expect(verdict()).toHaveTextContent('closes at 50 Hz');
    expect(screen.getByTestId('hz-readout')).toHaveTextContent('163 Hz');
    expect(container.querySelector('[data-figure-annotation]')?.textContent).toContain(
      'answers before',
    );
    // The slider still shows the robot's own computer on the teaching curve.
    expect(screen.getByTestId('latency-readout')).toHaveTextContent('52.6 ms');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(container.querySelectorAll('[data-clb-beat="missed"]')).toHaveLength(2);
  });

  it('defaults to the pi0 anchor: 3.0B at 52.6 ms, missing the 50 Hz loop', () => {
    render(<ControlLoopBudget />);
    expect(slider()).toHaveValue('3');
    expect(screen.getByTestId('latency-readout')).toHaveTextContent('52.6 ms');
    expect(screen.getByTestId('hz-readout')).toHaveTextContent('19 Hz');
    expect(verdict()).toHaveTextContent(/does not close/i);
  });

  it('closes the loop at small model sizes', () => {
    render(<ControlLoopBudget />);
    fireEvent.change(slider(), { target: { value: '0.5' } });
    expect(screen.getByTestId('latency-readout')).toHaveTextContent('8.8 ms');
    expect(verdict()).toHaveTextContent(/closes/i);
  });

  it('misses the loop badly at the pi0-L end of the slider', () => {
    render(<ControlLoopBudget />);
    fireEvent.change(slider(), { target: { value: '9.1' } });
    expect(screen.getByTestId('latency-readout')).toHaveTextContent('256.4 ms');
    expect(verdict()).toHaveTextContent(/does not close/i);
    expect(screen.getByTestId('missed-readout')).toHaveTextContent('12');
  });

  it('shows the sourced reference latencies', () => {
    render(<ControlLoopBudget />);
    expect(screen.getByTestId('ref-pi06-h100')).toHaveTextContent('63 ms');
    expect(screen.getByTestId('ref-rtc-mobile')).toHaveTextContent('138.98 ms');
    expect(screen.getByTestId('ref-rtc-static')).toHaveTextContent('108.76 ms');
    expect(screen.getByTestId('ref-pi07-tolerance')).toHaveTextContent(
      '240 ms',
    );
  });

  it('distinguishes roofline predictions, hypothetical models, and the teaching coordinate', () => {
    render(<ControlLoopBudget />);
    const note = screen.getByTestId('model-assumption-note');
    expect(note).toHaveTextContent(/illustrative teaching model/i);
    expect(note).toHaveTextContent(/not hardware profiling/i);
    expect(note).toHaveTextContent(/2.7B pi0/);
    expect(note).toHaveTextContent(/hypothetical 9.1B pi0-L/);
    expect(note).toHaveTextContent(/deliberately places the first reference at 3.0B/);
    const method = screen.getByTestId('model-assumption-note').closest('[data-figure-fold="method"]')!;
    expect(method).toHaveTextContent('pi0 reference (modeled)');
    expect(method).toHaveTextContent('pi0-L hypothetical');
    expect(screen.queryByText(/^pi0(?:-L)? .*measured$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/reciprocal inference rate, not robot Hz/i)).toBeInTheDocument();
  });

  it('reset restores the default state', async () => {
    const user = userEvent.setup();
    render(<ControlLoopBudget />);
    fireEvent.change(slider(), { target: { value: '9.1' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('3');
    expect(screen.getByTestId('latency-readout')).toHaveTextContent('52.6 ms');
  });

  it('honors a custom initial model size', () => {
    render(<ControlLoopBudget defaultParamsB={1.1} />);
    expect(slider()).toHaveValue('1.1');
    expect(screen.getByTestId('params-readout')).toHaveTextContent(
      '1.1B params',
    );
    expect(screen.getByTestId('latency-readout')).toHaveTextContent('19.3 ms');
    expect(screen.getByTestId('hz-readout')).toHaveTextContent('52 Hz');
    expect(verdict()).toHaveTextContent(/closes/i);
  });

  it('reset returns to the custom initial size, not the stock default', async () => {
    const user = userEvent.setup();
    render(<ControlLoopBudget defaultParamsB={1.1} />);
    fireEvent.change(slider(), { target: { value: '9.1' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('1.1');
    expect(screen.getByTestId('latency-readout')).toHaveTextContent('19.3 ms');
  });

  it('syncs a changed initial prop to state during render', () => {
    const { rerender } = render(<ControlLoopBudget defaultParamsB={1.1} />);
    expect(slider()).toHaveValue('1.1');
    rerender(<ControlLoopBudget defaultParamsB={3} />);
    expect(slider()).toHaveValue('3');
    expect(screen.getByTestId('latency-readout')).toHaveTextContent('52.6 ms');
  });
});
