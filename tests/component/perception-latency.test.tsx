import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PerceptionLatency } from '@/components/interactive/perception-latency';

function speedText() {
  return screen.getByTestId('max-speed-readout').textContent ?? '';
}

function avoidText() {
  return screen.getByTestId('avoid-readout').textContent ?? '';
}

describe('PerceptionLatency', () => {
  it('renders the slider, agility buttons, reset, chart, and readouts', () => {
    render(<PerceptionLatency />);
    expect(
      screen.getByRole('slider', { name: /perception latency/i }),
    ).toBeInTheDocument();
    for (const label of ['10 m/s²', '25 m/s²', '50 m/s²', '200 m/s²']) {
      expect(
        screen.getByRole('button', { name: new RegExp(`^${label}$`) }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(screen.getByTestId('latency-band')).toBeInTheDocument();
    expect(screen.getByTestId('avoid-band')).toBeInTheDocument();
    expect(screen.getByTestId('max-speed-readout')).toBeInTheDocument();
    expect(screen.getByTestId('ttc-readout')).toBeInTheDocument();
    expect(screen.getByTestId('avoid-readout')).toBeInTheDocument();
  });

  it('opens at the stereo-camera operating point of the study', () => {
    render(<PerceptionLatency />);
    // 70 ms latency, u = 25 m/s^2: the Table I value is 19.21 m/s.
    expect(speedText()).toBe('19.21 m/s');
    expect(screen.getByTestId('latency-readout').textContent).toBe('70 ms');
  });

  it('increasing latency lowers the maximum speed', () => {
    render(<PerceptionLatency />);
    const slider = screen.getByRole('slider', { name: /perception latency/i });
    const before = speedText();
    fireEvent.change(slider, { target: { value: '150' } });
    const after = speedText();
    expect(Number.parseFloat(after)).toBeLessThan(Number.parseFloat(before));
    expect(screen.getByTestId('latency-readout').textContent).toBe('150 ms');
  });

  it('zero latency reaches the geometric limit of the agility', () => {
    render(<PerceptionLatency />);
    const slider = screen.getByRole('slider', { name: /perception latency/i });
    fireEvent.change(slider, { target: { value: '0' } });
    // u = 25: 8 / (2 sqrt(0.75/25)) = 23.09 m/s.
    expect(speedText()).toBe('23.09 m/s');
  });

  it('the agility selection changes the avoidance maneuver time', () => {
    render(<PerceptionLatency />);
    expect(avoidText()).toBe('346 ms');
    fireEvent.click(screen.getByRole('button', { name: '200 m/s²' }));
    // 2 sqrt(0.75/200) = 122 ms.
    expect(avoidText()).toBe('122 ms');
    expect(screen.getByRole('button', { name: '200 m/s²' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('reset restores the study default state', () => {
    render(<PerceptionLatency />);
    fireEvent.change(
      screen.getByRole('slider', { name: /perception latency/i }),
      {
        target: { value: '0' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: '50 m/s²' }));
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(speedText()).toBe('19.21 m/s');
    expect(screen.getByRole('button', { name: /^25 m\/s²$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('names the sensor reference latencies from the study', () => {
    render(<PerceptionLatency />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Stereo frame camera 70 ms');
    expect(text).toContain('Event camera 12 ms');
  });
});
