import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ExecutionModes } from '@/components/interactive/execution-modes';

function slider() {
  return screen.getByRole('slider', { name: /inference delay/i });
}

describe('ExecutionModes', () => {
  it('renders the three execution modes, the delay slider, readouts, and reset', () => {
    render(<ExecutionModes />);
    expect(screen.getByTestId('panel-synchronous')).toBeInTheDocument();
    expect(screen.getByTestId('panel-naive')).toBeInTheDocument();
    expect(screen.getByTestId('panel-rtc')).toBeInTheDocument();
    expect(slider()).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-label');
    expect(screen.getByTestId('dv-synchronous')).toBeInTheDocument();
    expect(screen.getByTestId('dv-naive')).toBeInTheDocument();
    expect(screen.getByTestId('dv-rtc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getAllByText(/0.30/).length).toBeGreaterThan(0);
  });

  it('covers a delay range of 0 to 200 ms', () => {
    render(<ExecutionModes />);
    expect(slider()).toHaveAttribute('min', '0');
    expect(slider()).toHaveAttribute('max', '200');
  });

  it('at zero delay all three modes stay within the jerk limit', () => {
    render(<ExecutionModes />);
    expect(slider()).toHaveValue('0');
    expect(screen.getByTestId('verdict-synchronous')).toHaveTextContent(
      /within/i,
    );
    expect(screen.getByTestId('verdict-naive')).toHaveTextContent(/within/i);
    expect(screen.getByTestId('verdict-rtc')).toHaveTextContent(/within/i);
    expect(screen.getByTestId('pause-readout')).toHaveTextContent('0 ms');
  });

  it('at 100 ms the naive switch exceeds the jerk limit while rtc holds', () => {
    render(<ExecutionModes />);
    fireEvent.change(slider(), { target: { value: '100' } });
    const naiveDv = Number(
      screen.getByTestId('dv-naive').getAttribute('data-value'),
    );
    expect(naiveDv).toBeGreaterThan(0.3);
    expect(screen.getByTestId('verdict-naive')).toHaveTextContent(/exceeds/i);
    expect(screen.getByTestId('verdict-rtc')).toHaveTextContent(/within/i);
    expect(screen.getByTestId('verdict-synchronous')).toHaveTextContent(
      /within/i,
    );
  });

  it('at 200 ms the naive spike roughly doubles while the sync pause grows to 200 ms', () => {
    render(<ExecutionModes />);
    fireEvent.change(slider(), { target: { value: '200' } });
    const naiveDv = Number(
      screen.getByTestId('dv-naive').getAttribute('data-value'),
    );
    expect(naiveDv).toBeGreaterThan(1.0);
    const rtcDv = Number(
      screen.getByTestId('dv-rtc').getAttribute('data-value'),
    );
    expect(rtcDv).toBeLessThan(0.3);
    expect(screen.getByTestId('pause-readout')).toHaveTextContent('200 ms');
  });

  it('reset restores the zero-delay state', async () => {
    const user = userEvent.setup();
    render(<ExecutionModes />);
    fireEvent.change(slider(), { target: { value: '200' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('0');
    expect(screen.getByTestId('verdict-naive')).toHaveTextContent(/within/i);
  });
});
