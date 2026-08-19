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
  it('renders the model-size slider, readouts, reset, and the 20 ms budget line', () => {
    render(<ControlLoopBudget />);
    expect(slider()).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-label');
    expect(screen.getByTestId('latency-readout')).toBeInTheDocument();
    expect(screen.getByTestId('hz-readout')).toBeInTheDocument();
    expect(verdict()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getAllByText(/20 ms budget/i).length).toBeGreaterThan(0);
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
    expect(screen.getByTestId('ref-rtc-mobile')).toHaveTextContent('139 ms');
    expect(screen.getByTestId('ref-rtc-static')).toHaveTextContent('108 ms');
    expect(screen.getByTestId('ref-pi07-tolerance')).toHaveTextContent(
      '240 ms',
    );
  });

  it('marks the scaling between anchors as an illustrative model', () => {
    render(<ControlLoopBudget />);
    expect(screen.getByText(/illustrative/i)).toBeInTheDocument();
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
