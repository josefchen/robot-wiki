import { fireEvent, render, screen } from '@testing-library/react';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';
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
      "Choosing a move takes 2.6 times the available time",
    );
    expect(container.querySelector('[data-figure-kicker]')).toHaveTextContent('Control-loop budget');
    expect(container.querySelector('[data-figure-caption]')).toHaveTextContent(
      "This computer takes 2.6 command intervals to choose a move; the arm must wait or reuse old orders.",
    );
    expect(screen.getByRole('button', { name: "Robot's own computer" })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('control-time-comparison')).toHaveTextContent('Choosing a move takes 52.6 milliseconds; the arm has 20 milliseconds between commands. That is 2.6 times the available time.');
    const timingBasis = screen.getByText(/Computer timings are predictions from VLA-Perf, a robot timing study/);
    expect(timingBasis.closest('details')).toBeNull();
    expect(timingBasis).toHaveTextContent('values for other model sizes are illustrative.');
    // The beat feeder: 52.57 ms is 2.6 beats a stroke, so about 2 pockets in 5 carry a fresh order.
    const drawing = screen.getByRole('img', { name: /beat feeder/i });
    expect(drawing.getAttribute('aria-label')).toContain('takes 2.6 beats to stamp each token');
    expect(drawing.getAttribute('aria-label')).toContain('Of the 11 pockets past the feeler, 4 hold a token: 19 of every 50 beats get a fresh order.');
    expect(container.querySelectorAll('[data-testid="wheel-tokens"] [data-pocket]')).toHaveLength(20);
    expect(container.querySelectorAll('[data-testid="wheel-tokens"] [data-pocket]:not([display="none"])')).toHaveLength(4);
    expect(container.querySelector('[data-readout]')).toHaveTextContent('This beat: fresh order · 19 of 50 beats a second get one');
    expect(container.querySelector('[data-anatomy-hint]')).toHaveTextContent('the blue feeler drops in and the arm reuses its last order');
    expect(container.querySelectorAll('.iso-solid[data-lit]').length).toBeGreaterThan(0);
    expect(container.querySelector('[data-testid="feeler"]')!.querySelectorAll('.iso-solid[data-lit]')).toHaveLength(
      container.querySelectorAll('.iso-solid[data-lit]').length,
    );
  });

  it('the data-centre preset shows the cited H100 prediction inside one beat', async () => {
    const user = userEvent.setup();
    const { container } = render(<ControlLoopBudget />);
    await user.click(screen.getByRole('button', { name: 'Data-center computer' }));
    expect(screen.getByRole('img', { name: /beat feeder/i }).getAttribute('aria-label')).toContain(
      'Of the 11 pockets past the feeler, 11 hold a token: 50 of every 50 beats get a fresh order.',
    );
    expect(container.querySelector('[data-readout]')).toHaveTextContent('50 of 50 beats a second get one');
    expect(verdict()).toHaveTextContent('closes at 50 Hz');
    expect(screen.getByTestId('control-time-comparison')).toHaveTextContent('Choosing a move takes 6.2 milliseconds; the arm has 20 milliseconds between commands. That is 0.3 times the available time.');
    expect(screen.getByTestId('hz-readout')).toHaveTextContent('163 Hz');
    // The slider still shows the robot's own computer on the teaching curve.
    expect(screen.getByTestId('latency-readout')).toHaveTextContent('52.6 ms');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(container.querySelector('[data-readout]')).toHaveTextContent('19 of 50 beats a second get one');
  });

  it('defaults to the π0 anchor: 3.0B at 52.6 ms, missing the 50 Hz loop', () => {
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

  it('misses the loop badly at the π0-L end of the slider', () => {
    render(<ControlLoopBudget />);
    fireEvent.change(slider(), { target: { value: '9.1' } });
    expect(screen.getByTestId('latency-readout')).toHaveTextContent('256.4 ms');
    expect(screen.getByTestId('control-time-comparison')).toHaveTextContent('That is 12.8 times the available time.');
    expect(verdict()).toHaveTextContent(/does not close/i);
    expect(screen.getByTestId('missed-readout')).toHaveTextContent('12');
  });

  it('names the slider by its visible label and says the latency in its value text', () => {
    render(<ControlLoopBudget />);
    expect(slider().getAttribute('aria-label')).toMatch(/^Model size on the robot's own computer, teaching curve/);
    expect(slider()).toHaveAttribute('aria-valuetext', '3.0 billion parameters, 52.6 ms per inference');
    fireEvent.change(slider(), { target: { value: '9.1' } });
    const latency = screen.getByTestId('latency-readout').textContent ?? '';
    expect(latency).toBe('256.4 ms');
    expect(slider()).toHaveAttribute('aria-valuetext', `9.1 billion parameters, ${latency} per inference`);
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
    expect(note).toHaveTextContent(/2.7B π0/);
    expect(note).toHaveTextContent(/hypothetical 9.1B π0-L/);
    expect(note).toHaveTextContent(/deliberately places the first reference at 3.0B/);
    const method = screen.getByTestId('model-assumption-note').closest('[data-figure-fold="method"]')!;
    expect(method).toHaveTextContent('π0 reference (modeled)');
    expect(method).toHaveTextContent('π0-L hypothetical');
    expect(screen.queryByText(/^π0(?:-L)? .*measured$/i)).not.toBeInTheDocument();
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

describe('ControlLoopBudget series encoding (DI-VIZ-002/004)', () => {
  it('draws a machine, not plotted series, so it has no series to name', () => {
    const { container } = render(<ControlLoopBudget />);
    expect(Object.keys(seriesEncodings(container))).toEqual([]);
    expect(container.querySelector('[data-series-labelled]')).toBeNull();
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
