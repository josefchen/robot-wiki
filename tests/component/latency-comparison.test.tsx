import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LatencyComparison } from '@/components/interactive/latency-comparison';

function slider() {
  return screen.getByRole('slider', { name: /inference delay/i });
}

describe('LatencyComparison', () => {
  it('renders the delay slider, both labeled traces, readouts, and reset', () => {
    render(<LatencyComparison />);
    expect(slider()).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-label');
    expect(screen.getAllByText(/temporal ensembling/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/real-time chunking/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('te-throughput-readout')).toBeInTheDocument();
    expect(screen.getByTestId('rtc-throughput-readout')).toBeInTheDocument();
    expect(screen.getByTestId('te-status-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('covers an injected delay range from 0 to at least 200 ms', () => {
    render(<LatencyComparison />);
    expect(slider()).toHaveAttribute('min', '0');
    const max = Number(slider().getAttribute('max'));
    expect(max).toBeGreaterThanOrEqual(200);
  });

  it('defaults to 0 ms with both strategies at full throughput', () => {
    render(<LatencyComparison />);
    expect(slider()).toHaveValue('0');
    expect(screen.getByTestId('te-throughput-readout')).toHaveTextContent(
      '100%',
    );
    expect(screen.getByTestId('rtc-throughput-readout')).toHaveTextContent(
      '100%',
    );
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(
      /nominal/i,
    );
  });

  it('temporal ensembling fails at 200 ms while real-time chunking holds', () => {
    render(<LatencyComparison />);
    fireEvent.change(slider(), { target: { value: '200' } });
    expect(screen.getByTestId('te-throughput-readout')).toHaveTextContent('0%');
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(
      /failed/i,
    );
    expect(screen.getByTestId('rtc-throughput-readout')).toHaveTextContent(
      '100%',
    );
  });

  it('marks the averaged action as off-mode once the ensemble fails', () => {
    render(<LatencyComparison />);
    expect(screen.queryByTestId('te-offmode-marker')).not.toBeInTheDocument();
    fireEvent.change(slider(), { target: { value: '160' } });
    expect(screen.getByTestId('te-offmode-marker')).toBeInTheDocument();
  });

  it('reset restores the zero-delay state', async () => {
    const user = userEvent.setup();
    render(<LatencyComparison />);
    fireEvent.change(slider(), { target: { value: '200' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('0');
    expect(screen.getByTestId('te-throughput-readout')).toHaveTextContent(
      '100%',
    );
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(
      /nominal/i,
    );
  });

  it('labels the modeled curves as a qualitative model of published results', () => {
    render(<LatencyComparison />);
    expect(screen.getByText(/qualitative model/i)).toBeInTheDocument();
  });

  it('honors a custom default delay', () => {
    render(<LatencyComparison defaultDelayMs={200} />);
    expect(slider()).toHaveValue('200');
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(
      /failed/i,
    );
  });
});
