import { fireEvent, render, screen } from '@testing-library/react';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';
import { describe, expect, it } from 'vitest';
import { PerceptionLatency, RIDER_HINT, SLOW, corridorAt, runAt } from '@/components/interactive/perception-latency';
import {
  DRONE_REACH,
  RANGE_M,
  START_X,
  THROW,
  TIMER_MAX_MS,
  UNITS_PER_M,
  WALL_X,
  buildCorridor,
  needleDegrees,
  throwShare,
  wheelDegrees,
} from '@/components/iso/figures/latency-corridor';
import { AGILITY_STEPS, LATENCY_STEPS_MS, SENSORS, latencyOutcome } from '@/lib/aerial-latency';

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
    expect(desc?.textContent).toMatch(/no margin left/);
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

  it('draws the corridor: drone, wall, timer wheel, speed dial and the two gauge riders, with no words', () => {
    const { container } = render(<PerceptionLatency />);
    const svg = screen.getByRole('img');
    expect(svg.querySelectorAll('text')).toHaveLength(0);
    for (const id of ['drone', 'drone-carriage', 'wall', 'timer-wheel', 'speedometer', 'swerve-knob', 'gauge-riders']) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
    // Exactly one lit part: the rider for the stretch flown before the camera reports.
    const lit = container.querySelectorAll('.iso-solid[data-lit]');
    expect(lit).toHaveLength(1);
    expect(lit[0].closest('[data-testid="latency-band"]')).not.toBeNull();
    expect(svg.getAttribute('aria-label')).toMatch(/about 69 kilometres an hour/);
  });

  it('sets the riders to the model: speed times delay blind, the rest of the 8 metres swerving', () => {
    render(<PerceptionLatency />);
    const blind = () => Number(screen.getByTestId('latency-band').getAttribute('data-metres'));
    const swerve = () => Number(screen.getByTestId('avoid-band').getAttribute('data-metres'));
    const v = latencyOutcome(0.07, 25, 8).maxSpeedMs;
    expect(blind()).toBeCloseTo(v * 0.07, 2);
    expect(blind() + swerve()).toBeCloseTo(8, 2);
    fireEvent.change(slider(), { target: { value: '200' } });
    const slow = latencyOutcome(0.2, 25, 8).maxSpeedMs;
    expect(blind()).toBeCloseTo(slow * 0.2, 2);
    expect(blind()).toBeCloseTo(2.93, 1);
    expect(screen.getByTestId('speedometer-reading').textContent).toBe('about 53 km/h');
  });

  it('runs the corridor on a reader control only, and goes back to the still pose', () => {
    render(<PerceptionLatency />);
    const run = screen.getByTestId('corridor-run');
    // A secondary action carries no pressed state: its label says what it does next.
    expect(run).not.toHaveAttribute('aria-pressed');
    expect(run).toHaveTextContent('Fly the corridor');
    expect(screen.getByTestId('drone-carriage').getAttribute('transform')).toBe(buildCorridor({ tracks: 1 }).carriageShift(0));
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the run');
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(screen.getByRole('button', { name: 'Hard' }));
    expect(run).toHaveTextContent('Fly the corridor');
  });
});

describe('latency corridor model', () => {
  it('ends every run at the wall with the swerve just finished, at the top safe speed', () => {
    for (const ms of LATENCY_STEPS_MS) {
      for (const u of AGILITY_STEPS) {
        const { duration } = runAt(0, ms, u);
        const end = runAt(duration, ms, u);
        expect(end.xM).toBeCloseTo(RANGE_M, 6);
        expect(end.share).toBeCloseTo(1, 6);
        expect(end.timerLeftMs).toBe(0);
        // Just before the swerve starts the drone is at the end of its blind stretch.
        const { blindM, outcome } = corridorAt(ms, u);
        const tGate = -(START_X / UNITS_PER_M) / outcome.maxSpeedMs;
        const released = runAt(tGate + ms / 1000, ms, u);
        expect(released.xM).toBeCloseTo(blindM, 6);
        expect(released.share).toBeCloseTo(0, 9);
      }
    }
  });

  it('holds the report for the camera delay: the timer runs down only after the gate', () => {
    const before = runAt(0, 70, 25);
    expect(before.timerLeftMs).toBe(70);
    expect(before.xM).toBeLessThan(0);
    const { outcome } = corridorAt(70, 25);
    const tGate = -(START_X / UNITS_PER_M) / outcome.maxSpeedMs;
    expect(runAt(tGate + 0.035, 70, 25).timerLeftMs).toBeCloseTo(35, 6);
    expect(SLOW).toBeGreaterThan(1);
  });

  it('throws the drone with a full push then a full brake, past the wall edge by its own reach', () => {
    expect(throwShare(0)).toBe(0);
    expect(throwShare(0.5)).toBeCloseTo(0.5, 9);
    expect(throwShare(1)).toBe(1);
    expect(throwShare(0.25)).toBeCloseTo(0.125, 9);
    expect(THROW).toBeGreaterThan(DRONE_REACH);
    expect(WALL_X).toBe(RANGE_M * UNITS_PER_M);
  });

  it('turns the timer, the dial and the riders by the model, on fixed scales', () => {
    expect(wheelDegrees(0)).toBe(0);
    expect(wheelDegrees(TIMER_MAX_MS)).toBe(300);
    expect(wheelDegrees(70)).toBeCloseTo(105, 9);
    expect(needleDegrees(0)).toBe(0);
    expect(needleDegrees(250)).toBe(240);
    expect(needleDegrees(19.21 * 3.6)).toBeCloseTo((69.156 / 250) * 240, 2);
    const rig = buildCorridor({ tracks: 1 });
    expect(rig.lanes).toHaveLength(1);
    expect(buildCorridor({ tracks: 2 }).lanes).toHaveLength(2);
    // A rider set to 1 m is one gauge metre long.
    const { blind } = rig.ridersAt(0, 1, 7);
    expect(blind.outline).toBeTruthy();
    expect(SENSORS[0].rangeM).toBe(RANGE_M);
  });
});

describe('PerceptionLatency series encoding (VAL-B2-VIZ-002/004)', () => {
  it('names every plotted series in the plot or the legend and tells each pair apart without colour', () => {
    const { container } = render(<PerceptionLatency />);
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(['avoidance-maneuver', 'perception-latency']);
    // The still stage's hint is what names both riders, so it must say both.
    expect(RIDER_HINT).toMatch(/^Lit: .*before the camera reports\. Plain: swerve$/);
    expect(container.textContent).toContain(RIDER_HINT);
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
