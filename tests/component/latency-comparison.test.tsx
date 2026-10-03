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

  it('opens on the larger tested delay, where the averaged move fails', () => {
    render(<LatencyComparison />);
    expect(slider()).toHaveValue('200');
    expect(screen.getByTestId('te-throughput-readout')).toHaveTextContent('0%');
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(/fails/i);
    expect(screen.getByTestId('te-offmode-marker')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+0.2 second' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('the None preset shows both strategies at full throughput', async () => {
    const user = userEvent.setup();
    render(<LatencyComparison />);
    await user.click(screen.getByRole('button', { name: 'None' }));
    expect(slider()).toHaveValue('0');
    expect(screen.getByTestId('te-throughput-readout')).toHaveTextContent(
      '100%',
    );
    expect(screen.getByTestId('rtc-throughput-readout')).toHaveTextContent(
      '100%',
    );
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(
      /works/i,
    );
  });

  it('temporal ensembling fails at 200 ms while real-time chunking holds', () => {
    render(<LatencyComparison defaultDelayMs={0} />);
    fireEvent.change(slider(), { target: { value: '200' } });
    expect(screen.getByTestId('te-throughput-readout')).toHaveTextContent('0%');
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(
      /fails/i,
    );
    expect(screen.getByTestId('rtc-throughput-readout')).toHaveTextContent(
      '100%',
    );
  });

  it('marks the averaged action as off-mode once the ensemble fails', () => {
    render(<LatencyComparison defaultDelayMs={0} />);
    expect(screen.queryByTestId('te-offmode-marker')).not.toBeInTheDocument();
    fireEvent.change(slider(), { target: { value: '160' } });
    expect(screen.getByTestId('te-offmode-marker')).toBeInTheDocument();
  });

  it('reset restores the zero-delay state', async () => {
    const user = userEvent.setup();
    render(<LatencyComparison defaultDelayMs={0} />);
    fireEvent.change(slider(), { target: { value: '200' } });
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('0');
    expect(screen.getByTestId('te-throughput-readout')).toHaveTextContent(
      '100%',
    );
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(
      /works/i,
    );
  });

  it('reset restores the opening delay after a preset', async () => {
    const user = userEvent.setup();
    render(<LatencyComparison />);
    await user.click(screen.getByRole('button', { name: 'None' }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(slider()).toHaveValue('200');
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(/fails/i);
  });

  it('labels the modeled curves as a qualitative model of published results', () => {
    render(<LatencyComparison />);
    expect(screen.getAllByText(/qualitative model/i).length).toBeGreaterThan(0);
  });

  it('honors a custom default delay', () => {
    render(<LatencyComparison defaultDelayMs={100} />);
    expect(slider()).toHaveValue('100');
    expect(screen.getByTestId('te-status-readout')).toHaveTextContent(
      /fails/i,
    );
    expect(screen.getByRole('button', { name: '+0.1 second' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('names the TE status so mounts in different regimes describe differently', () => {
    const throughputText = (delay: number) => {
      const { container, unmount } = render(<LatencyComparison defaultDelayMs={delay} />);
      const text = container.querySelector('[data-chart-description]')?.textContent ?? '';
      unmount();
      return text;
    };
    const nominal = throughputText(0);
    const failed = throughputText(100);
    expect(nominal).toMatch(/temporal ensembling, marked nominal,/);
    expect(failed).toMatch(/temporal ensembling, marked failed,/);
    const key = (text: string) => text.toLowerCase().replace(/\d+/g, '#');
    expect(key(nominal)).not.toBe(key(failed));
  });

  it('describes both series roots with sampled tables and names the honesty markers', () => {
    const { container } = render(<LatencyComparison />);
    const descs = [...container.querySelectorAll('[data-chart-description]')];
    expect(descs).toHaveLength(2);
    expect(descs[0].textContent).toMatch(/protective stops at its \+100 and \+200 ms settings/i);
    expect(descs[0].textContent).toMatch(/not a universal latency threshold/i);
    expect(descs[1].textContent).toMatch(/obstacle between the two dashed plan routes is drawn for illustration/i);
    expect(descs[1].textContent).toMatch(/modelled modes rather than measured actions/i);
    const tables = container.querySelectorAll('details[data-chart-data][data-chart-form="table"]');
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      const rows = table.querySelectorAll('tbody tr').length;
      expect(rows).toBeGreaterThanOrEqual(5);
      expect(rows).toBeLessThanOrEqual(10);
    }
  });
});
