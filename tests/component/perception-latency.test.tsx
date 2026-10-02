import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PerceptionLatency } from '@/components/interactive/perception-latency';

const SWERVES = ['Gentle', 'Standard (the study’s)', 'Hard', 'Extreme'];

function speedText() {
  return screen.getByTestId('max-speed-readout').textContent ?? '';
}

function avoidText() {
  return screen.getByTestId('avoid-readout').textContent ?? '';
}

function slider() {
  return screen.getByRole('slider', { name: /perception latency/i, hidden: true });
}

describe('PerceptionLatency', () => {
  it('renders the camera and swerve presets, the folded slider and reset, the drawing, and readouts', () => {
    render(<PerceptionLatency />);
    expect(screen.getByText('A drone that sees faster can safely fly faster')).toBeInTheDocument();
    expect(slider()).toBeInTheDocument();
    for (const label of ['Ordinary camera (7 hundredths of a second)', 'Faster camera (about 1 hundredth)', ...SWERVES]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /reset/i, hidden: true })).toBeInTheDocument();
    expect(screen.getByTestId('drone')).toBeInTheDocument();
    expect(screen.getByTestId('wall')).toBeInTheDocument();
    expect(screen.getByTestId('latency-band')).toBeInTheDocument();
    expect(screen.getByTestId('avoid-band')).toBeInTheDocument();
    expect(screen.getByTestId('max-speed-readout')).toBeInTheDocument();
    expect(screen.getByTestId('ttc-readout')).toBeInTheDocument();
    expect(screen.getByTestId('avoid-readout')).toBeInTheDocument();
  });

  it('opens at the stereo-camera operating point of the study', () => {
    render(<PerceptionLatency />);
    // 70 ms latency, u = 25 m/s^2: the Table I value is 19.21 m/s, about 69 km/h.
    expect(speedText()).toBe('19.21 m/s');
    expect(screen.getByTestId('latency-readout').textContent).toBe('70 ms');
    expect(screen.getByTestId('speedometer-reading').textContent).toBe('about 69 km/h');
    expect(screen.getByTestId('latency-plain-readout').textContent).toMatch(/about 1\.3 metres before its camera/);
    expect(
      screen.getByRole('button', { name: 'Ordinary camera (7 hundredths of a second)' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('increasing latency lowers the maximum speed', () => {
    render(<PerceptionLatency />);
    const before = speedText();
    fireEvent.change(slider(), { target: { value: '150' } });
    const after = speedText();
    expect(Number.parseFloat(after)).toBeLessThan(Number.parseFloat(before));
    expect(screen.getByTestId('latency-readout').textContent).toBe('150 ms');
    // Neither camera preset matches a hand-set delay.
    expect(
      screen.getByRole('button', { name: 'Ordinary camera (7 hundredths of a second)' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('the event camera preset sets the study latency and raises the top speed', () => {
    render(<PerceptionLatency />);
    fireEvent.click(screen.getByRole('button', { name: 'Faster camera (about 1 hundredth)' }));
    expect(screen.getByTestId('latency-readout').textContent).toBe('12 ms');
    expect(screen.getByTestId('speedometer-reading').textContent).toBe('about 80 km/h');
    expect((slider() as HTMLInputElement).value).toBe('12');
  });

  it('zero latency reaches the geometric limit of the agility', () => {
    render(<PerceptionLatency />);
    fireEvent.change(slider(), { target: { value: '0' } });
    // u = 25: 8 / (2 sqrt(0.75/25)) = 23.09 m/s.
    expect(speedText()).toBe('23.09 m/s');
  });

  it('the swerve selection changes the avoidance maneuver time', () => {
    render(<PerceptionLatency />);
    expect(avoidText()).toBe('346 ms');
    fireEvent.click(screen.getByRole('button', { name: 'Extreme' }));
    // 2 sqrt(0.75/200) = 122 ms.
    expect(avoidText()).toBe('122 ms');
    expect(screen.getByRole('button', { name: 'Extreme' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reset restores the study default state', () => {
    render(<PerceptionLatency />);
    fireEvent.change(slider(), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hard' }));
    fireEvent.click(screen.getByRole('button', { name: /reset/i, hidden: true }));
    expect(speedText()).toBe('19.21 m/s');
    expect(
      screen.getByRole('button', { name: 'Standard (the study’s)' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('names the sensor reference latencies and swerve units in the method', () => {
    render(<PerceptionLatency />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Stereo frame camera 70 ms');
    expect(text).toContain('Event camera 12 ms');
    expect(screen.getByText(/maximum speed = range \/ \(latency \+ 2 sqrt\(r \/ u\)\)/)).toBeInTheDocument();
    expect(text).toMatch(/Extreme 200 m\/s² \(about 20\.4 g\)/);
  });

  it('describes the sense-and-avoid timeline and tracks latency', () => {
    const { container } = render(<PerceptionLatency />);
    const img = screen.getByRole('img');
    const id = img.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/70 ms of perception latency/);
    expect(desc?.textContent).toMatch(/dashed margin/);
    fireEvent.change(slider(), { target: { value: '150' } });
    const moved = container.querySelector('[data-chart-description]')
      ?.textContent ?? '';
    expect(moved).toMatch(/150 ms/);
    expect(moved).not.toMatch(/70 ms of perception latency/);
  });

  it('announces the plain readout in a polite live region (VAL-EDU-038)', () => {
    render(<PerceptionLatency />);
    const readout = screen.getByTestId('latency-plain-readout');
    const live = readout.closest('[aria-live]');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).not.toHaveAttribute('aria-live', 'assertive');
    fireEvent.click(screen.getByRole('button', { name: 'Gentle' }));
    expect(readout.textContent).toMatch(/about 47 kilometres an hour/);
  });
});
