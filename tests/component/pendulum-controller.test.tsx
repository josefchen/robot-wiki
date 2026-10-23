import { act, fireEvent, render, screen } from '@testing-library/react';
import { seriesEncodingViolations, seriesEncodings } from '../helpers/series-encoding';
import userEvent from '@testing-library/user-event';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PendulumController, gravityPull } from '@/components/interactive/pendulum-controller';
import {
  BALANCED_DEG,
  DEG_PER_NM,
  FALLEN_DEG,
  PIVOT_Z,
  POLE_Y,
  ROD,
  SCALE_NM,
  gaugeNeedles,
  poleParts,
  tipOf,
  trailFor,
} from '@/components/iso/figures/pendulum-stand';
import { formatViolation, inspectFigureDocument } from '@/lib/figure-system-check';
import { mainViewSymbolHits } from '@/lib/figure-main-view';
import { DEFAULT_GAINS, INITIAL_STATE, PENDULUM_PARAMS, classifyStability, controlTorque } from '@/lib/pendulum';

/** Escape a literal string for embedding in a RegExp. */
function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/**
 * A matchMedia mock whose `matches` can flip mid-test, delivering the
 * change event to every registered listener the way a real media query
 * does. Proves the component TRACKS the setting instead of reading it
 * once at timer start.
 */
function mockReducedMotionLive(initial: boolean) {
  let matches = initial;
  const listeners: Array<(event: { matches: boolean }) => void> = [];
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_type: string, handler: unknown) => {
      listeners.push(handler as (event: { matches: boolean }) => void);
    },
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return {
    setMatches(next: boolean) {
      matches = next;
      for (const listener of listeners) listener({ matches: next });
    },
  };
}

function angleText() {
  return screen.getByTestId('pendulum-angle-readout').textContent ?? '';
}

function angleDeg() {
  return Number.parseFloat(angleText().replace('°', ''));
}

function statusText() {
  return screen.getByTestId('pendulum-status-readout').textContent ?? '';
}

describe('PendulumController', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the scene, three gain sliders, controls, and readouts', () => {
    render(<PendulumController />);
    const scene = screen.getByTestId('pendulum-scene');
    expect(scene).toBeInTheDocument();
    expect(scene).toHaveAttribute('role', 'img');
    expect(scene).toHaveAttribute('aria-label');
    expect(
      screen.getByRole('slider', { name: /proportional gain kp/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: /integral gain ki/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: /derivative gain kd/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /run the simulation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /give it a push/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    for (const id of [
      'pendulum-angle-readout',
      'pendulum-rate-readout',
      'pendulum-integral-readout',
      'pendulum-torque-readout',
      'pendulum-status-readout',
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });

  it('starts paused at the 12-degree release state with default gains', () => {
    render(<PendulumController />);
    expect(angleText()).toBe('+12.0°');
    expect(statusText()).toMatch(/holding at release/i);
    expect(screen.getByTestId('pendulum-gain-kp-value')).toHaveTextContent(
      DEFAULT_GAINS.kp.toFixed(1),
    );
    expect(screen.getByTestId('pendulum-gain-ki-value')).toHaveTextContent(
      DEFAULT_GAINS.ki.toFixed(1),
    );
    expect(screen.getByTestId('pendulum-gain-kd-value')).toHaveTextContent(
      DEFAULT_GAINS.kd.toFixed(1),
    );
  });

  it('moving a gain slider updates its readout immediately', () => {
    render(<PendulumController />);
    fireEvent.change(
      screen.getByRole('slider', { name: /proportional gain kp/i }),
      { target: { value: '10' } },
    );
    expect(screen.getByTestId('pendulum-gain-kp-value')).toHaveTextContent(
      '10.0',
    );
    // Paused sim does not move just because gains changed.
    expect(angleText()).toBe('+12.0°');
  });

  it('running the sim with default gains pulls the pole toward upright', () => {
    vi.useFakeTimers();
    render(<PendulumController />);
    fireEvent.click(screen.getByRole('button', { name: /run the simulation/i }));
    expect(
      screen.getByRole('button', { name: /pause the simulation/i }),
    ).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    // After ~4 s of the default loop the pole is near its small steady lean,
    // far inside the 12-degree release.
    expect(Math.abs(angleDeg())).toBeLessThan(6);
    expect(statusText()).not.toMatch(/fallen/i);
  });

  it('dropping Kp below the gravity threshold while running loses the pole', () => {
    vi.useFakeTimers();
    render(<PendulumController />);
    fireEvent.click(screen.getByRole('button', { name: /run the simulation/i }));
    fireEvent.change(
      screen.getByRole('slider', { name: /proportional gain kp/i }),
      { target: { value: '5' } },
    );
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(Math.abs(angleDeg())).toBeGreaterThan(60);
    expect(statusText()).toBe('fallen');
  });

  it('push kicks the pole and starts playback from paused', () => {
    vi.useFakeTimers();
    render(<PendulumController />);
    fireEvent.click(screen.getByRole('button', { name: /give it a push/i }));
    // Playback starts so the kick's effect is visible.
    expect(
      screen.getByRole('button', { name: /pause the simulation/i }),
    ).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // The impulse (2 rad/s) briefly swings the pole well past the release.
    expect(Math.abs(angleDeg())).toBeGreaterThan(13);
  });

  it('pause freezes the trajectory', () => {
    vi.useFakeTimers();
    render(<PendulumController />);
    fireEvent.click(screen.getByRole('button', { name: /run the simulation/i }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(
      screen.getByRole('button', { name: /pause the simulation/i }),
    );
    const frozen = angleText();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(angleText()).toBe(frozen);
  });

  it('keeps its live readout quiet while the simulation runs and polite when paused', () => {
    vi.useFakeTimers();
    render(<PendulumController />);
    const live = () => screen.getByTestId('pendulum-angle-readout').closest('p');
    expect(live()).toHaveAttribute('aria-live', 'polite');
    fireEvent.click(screen.getByRole('button', { name: /run the simulation/i }));
    expect(live()).toHaveAttribute('aria-live', 'off');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole('button', { name: /pause the simulation/i }));
    expect(live()).toHaveAttribute('aria-live', 'polite');
  });

  it('reset restores the release state and default gains', async () => {
    const user = userEvent.setup();
    render(<PendulumController />);
    fireEvent.change(
      screen.getByRole('slider', { name: /proportional gain kp/i }),
      { target: { value: '5' } },
    );
    await user.click(screen.getByRole('button', { name: /run the simulation/i }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(angleText()).toBe('+12.0°');
    expect(statusText()).toMatch(/holding at release/i);
    expect(screen.getByTestId('pendulum-gain-kp-value')).toHaveTextContent(
      DEFAULT_GAINS.kp.toFixed(1),
    );
    // Reset also stops playback.
    expect(
      screen.getByRole('button', { name: /run the simulation/i }),
    ).toBeInTheDocument();
  });

  it('under reduced motion, ticks still advance the sim in coarse jumps', () => {
    mockReducedMotion(true);
    vi.useFakeTimers();
    render(<PendulumController />);
    fireEvent.click(screen.getByRole('button', { name: /run the simulation/i }));
    act(() => {
      // Two coarse ticks of 0.32 s each.
      vi.advanceTimersByTime(700);
    });
    // The loop has visibly pulled the pole in from the 12-degree release,
    // so coarse playback advances the sim just like smooth playback does.
    expect(Math.abs(angleDeg())).toBeLessThan(11);
  });

  it('honors a custom initial Kp without touching the other gains', () => {
    render(<PendulumController defaultKp={9} />);
    expect(screen.getByTestId('pendulum-gain-kp-value')).toHaveTextContent(
      '9.0',
    );
    expect(screen.getByTestId('pendulum-gain-ki-value')).toHaveTextContent(
      DEFAULT_GAINS.ki.toFixed(1),
    );
    expect(screen.getByTestId('pendulum-gain-kd-value')).toHaveTextContent(
      DEFAULT_GAINS.kd.toFixed(1),
    );
  });

  it('reset returns to the custom initial Kp, not the stock default', async () => {
    const user = userEvent.setup();
    render(<PendulumController defaultKp={9} />);
    fireEvent.change(
      screen.getByRole('slider', { name: /proportional gain kp/i }),
      { target: { value: '25' } },
    );
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('pendulum-gain-kp-value')).toHaveTextContent(
      '9.0',
    );
    expect(angleText()).toBe('+12.0°');
  });

  it('syncs a changed initial Kp to state during render', () => {
    const { rerender } = render(<PendulumController defaultKp={9} />);
    expect(screen.getByTestId('pendulum-gain-kp-value')).toHaveTextContent(
      '9.0',
    );
    rerender(<PendulumController defaultKp={25} />);
    expect(screen.getByTestId('pendulum-gain-kp-value')).toHaveTextContent(
      '25.0',
    );
  });

  it('derives the prediction-mount threshold clause from live Kp against PENDULUM_PARAMS.gravity', () => {
    // The control page mounts the prediction step at 9.5, half a unit
    // under the hold threshold. Every expectation below is computed from
    // PENDULUM_PARAMS, never pinned: the threshold string, the step-
    // aligned probe values on both sides, and the rendered clause all
    // derive from the params module.
    const { container } = render(<PendulumController defaultKp={9.5} />);
    const read = () =>
      container.querySelector('[data-chart-description]')?.textContent ?? '';
    const threshold = PENDULUM_PARAMS.gravity.toFixed(2);
    const kpSlider = () =>
      screen.getByRole('slider', { name: /proportional gain kp/i });
    // First slider step strictly above the threshold (steps are 0.5).
    const above = Math.ceil((PENDULUM_PARAMS.gravity + 0.1) * 2) / 2;
    // A step below the threshold that is NOT the mount's own default, so
    // the return to the under-clause is attributed to the comparison and
    // not to restoring the initial value.
    const below = Math.floor(PENDULUM_PARAMS.gravity * 2) / 2 - 1;
    expect(below).toBeLessThan(PENDULUM_PARAMS.gravity);
    expect(above).toBeGreaterThan(PENDULUM_PARAMS.gravity);

    // Load state: under the threshold, mount untouched.
    expect(read()).toMatch(
      new RegExp(`starts at Kp ${esc('9.5')}, under the ${esc(threshold)} mgl hold threshold`),
    );

    // Driven above the threshold: the direction must follow the live
    // value, the threshold stays derived, and the pedagogical point
    // (the threshold is the line where holding becomes possible) stays.
    fireEvent.change(kpSlider(), { target: { value: String(above) } });
    expect(read()).toMatch(
      new RegExp(`Kp ${esc(above.toFixed(1))}, above the ${esc(threshold)} mgl hold threshold`),
    );
    expect(read()).toMatch(/where the loop can hold it/);
    expect(read()).not.toMatch(/under the/);
    // The mount no longer "starts" at the reader's own value.
    expect(read()).not.toMatch(/starts at/);

    // Back below the threshold: the clause follows the live value again.
    fireEvent.change(kpSlider(), { target: { value: String(below) } });
    expect(read()).toMatch(
      new RegExp(`Kp ${esc(below.toFixed(1))}, under the ${esc(threshold)} mgl hold threshold`),
    );
    expect(read()).not.toMatch(/above the/);
  });

  it('tracks a mid-playback reduced-motion change instead of reading it once', () => {
    vi.useFakeTimers();
    const media = mockReducedMotionLive(false);
    render(<PendulumController />);
    fireEvent.click(
      screen.getByRole('button', { name: /run the simulation/i }),
    );
    // Smooth cadence (33 ms ticks) has been advancing the pole.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const before = angleText();
    expect(angleText()).not.toBe('+12.0°');
    // The reader enables reduced motion mid-playback: the timer must
    // rebuild at the coarse cadence (320 ms ticks), not keep the smooth
    // cadence captured at Run time.
    act(() => {
      media.setMatches(true);
    });
    const frozen = angleText();
    expect(frozen).toBe(before);
    act(() => {
      // Under the coarse cadence no tick falls inside 300 ms.
      vi.advanceTimersByTime(300);
    });
    expect(angleText()).toBe(frozen);
    act(() => {
      // Crossing the 320 ms mark fires exactly one coarse tick.
      vi.advanceTimersByTime(30);
    });
    expect(angleText()).not.toBe(frozen);
  });

  it('opens on the motor pushing back against gravity, with no outcome shown yet', () => {
    const { container } = render(<PendulumController defaultKp={9.5} />);
    expect(screen.getByTestId('pendulum-motor')).toBeInTheDocument();
    // The gauge's two needles stand for the push and the pull, and the hint names each, so neither reads as a stray mark.
    const push = Number(screen.getByTestId('pendulum-push-arrow').getAttribute('data-push-sweep-deg'));
    const pull = Number(screen.getByTestId('pendulum-gravity-arrow').getAttribute('data-pull-sweep-deg'));
    const torque = controlTorque(INITIAL_STATE, { ...DEFAULT_GAINS, kp: 9.5 }, PENDULUM_PARAMS);
    expect(push).toBeCloseTo(Math.abs(torque) * DEG_PER_NM, 1);
    expect(pull).toBeCloseTo(gravityPull(INITIAL_STATE.theta) * DEG_PER_NM, 1);
    // Too gentle: at release the push is short of the pull.
    expect(push).toBeLessThan(pull);
    expect(container.querySelector('[data-anatomy-hint]')?.textContent).toBe(
      "Long needle: the motor's push. Short needle: gravity's pull.",
    );
    expect(container.querySelector('[data-readout]')?.textContent).toBe('Released 12 degrees off upright');
    // The one lit part is the push needle.
    const lit = screen.getByTestId('pendulum-scene').querySelectorAll('.iso-solid[data-lit]');
    expect(lit).toHaveLength(1);
    expect(screen.getByTestId('pendulum-push-arrow').contains(lit[0])).toBe(true);
    // No words in the drawing.
    const svg = screen.getByTestId('pendulum-scene');
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(svg.textContent).toBe('');
    expect(screen.getByRole('group', { name: 'How hard the motor pushes back' })).toBeInTheDocument();
    expect(screen.queryByTestId('pendulum-stage-status')).toBeNull();
    expect(screen.queryByTestId('pendulum-trail')).toBeNull();
    expect(screen.getByRole('button', { name: 'Too gentle' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Strong enough' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('sizes the push-back needle by the motor torque', () => {
    const sweep = (kp: number) => {
      const { unmount } = render(<PendulumController defaultKp={kp} />);
      const value = Number(screen.getByTestId('pendulum-push-arrow').getAttribute('data-push-sweep-deg'));
      unmount();
      return value;
    };
    expect(sweep(25)).toBeGreaterThan(sweep(9.5) * 2);
  });

  it('a correction strength releases the pole again and runs it to its outcome', () => {
    vi.useFakeTimers();
    render(<PendulumController defaultKp={9.5} />);
    fireEvent.click(screen.getByRole('button', { name: 'Too gentle' }));
    expect(screen.getByRole('button', { name: /pause the simulation/i })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    // Just under the threshold the pole comes to rest about 50 degrees off
    // upright: settled, but the stage must not call that balanced.
    expect(statusText()).toBe('settled');
    expect(angleDeg()).toBeGreaterThan(45);
    expect(screen.getByTestId('pendulum-stage-status')).toHaveTextContent('stuck leaning');
    expect(screen.getByTestId('pendulum-trail')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Strong enough' }));
    expect(screen.getByTestId('pendulum-gain-kp-value')).toHaveTextContent(DEFAULT_GAINS.kp.toFixed(1));
    expect(screen.getByRole('button', { name: 'Strong enough' })).toHaveAttribute('aria-pressed', 'true');
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(statusText()).toBe('settled');
    expect(Math.abs(angleDeg())).toBeLessThan(6);
    expect(screen.getByTestId('pendulum-stage-status')).toHaveTextContent('balanced');
  });

  it('calls a pole that falls past the line fallen over on the stage', () => {
    vi.useFakeTimers();
    render(<PendulumController defaultKp={5} />);
    fireEvent.click(screen.getByRole('button', { name: /give it a push/i }));
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(statusText()).toBe('fallen');
    expect(screen.getByTestId('pendulum-stage-status')).toHaveTextContent('fallen over');
  });
});

  it('derives the takeaway from live gains and playback state, not the mount default', () => {
    vi.useFakeTimers();
    const { container } = render(<PendulumController />);
    const read = () =>
      container.querySelector('[data-chart-description]')?.textContent ?? '';
    // Default state: gains match DEFAULT_GAINS and playback is paused.
    expect(read()).toMatch(/Default gains/);
    // State 1: the reader retunes Kp; the numbers are the reader's, so the
    // "Default" label must follow the gains, not the mount.
    fireEvent.change(
      screen.getByRole('slider', { name: /proportional gain kp/i }),
      { target: { value: '40' } },
    );
    expect(read()).toMatch(/Kp 40\.0/);
    expect(read()).not.toMatch(/Default gains/);
    // Moving Kp back to the stock value restores the label.
    fireEvent.change(
      screen.getByRole('slider', { name: /proportional gain kp/i }),
      { target: { value: '25' } },
    );
    expect(read()).toMatch(/Default gains/);
    // State 2: playback running; the readouts advance every tick, so the
    // takeaway must not claim they are frozen.
    fireEvent.click(
      screen.getByRole('button', { name: /run the simulation/i }),
    );
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(read()).not.toMatch(/frozen/);
    // Pausing freezes them again, and the two buttons that unfreeze them
    // are named as they print.
    fireEvent.click(
      screen.getByRole('button', { name: /pause the simulation/i }),
    );
    expect(read()).toMatch(/frozen until Run or Give it a push\./);
    expect(screen.getByRole('button', { name: 'Give it a push' })).toBeInTheDocument();
  });

describe('balance stand model', () => {
  it('puts the weight one pole length from the pivot at the lean the sim reports, right of upright for a positive lean', () => {
    for (const deg of [0, 12, -30, 60, 180]) {
      const theta = (deg * Math.PI) / 180;
      const [x, y, z] = tipOf(theta);
      expect(Math.hypot(x, z - PIVOT_Z)).toBeCloseTo(ROD, 9);
      expect(y).toBe(POLE_Y);
      expect(Math.sign(Math.round(x * 1e6))).toBe(Math.sign(Math.round(Math.sin(theta) * 1e6)));
    }
    const pole = poleParts(0.3);
    // The one lit part is the motor's push needle on the gauge; nothing on the pole is lit.
    expect([...pole.rod, ...pole.weight, ...pole.hub].filter((part) => part.kind === 'solid' && part.lit)).toHaveLength(0);
  });

  it('sweeps both needles from one zero by the same degrees per newton-metre, up to the scale top', () => {
    const needles = gaugeNeedles(5.24, 2.84);
    expect(needles.push.sweepDeg).toBeCloseTo(5.24 * DEG_PER_NM, 9);
    expect(needles.pull.sweepDeg).toBeCloseTo(2.84 * DEG_PER_NM, 9);
    expect(gaugeNeedles(-40, 99).push.sweepDeg).toBe(SCALE_NM * DEG_PER_NM);
    expect(gaugeNeedles(-40, 99).pull.sweepDeg).toBe(SCALE_NM * DEG_PER_NM);
    // Gravity's pull: m g l sin(lean) plus the side load's 0.8.
    expect(gravityPull(0)).toBeCloseTo(PENDULUM_PARAMS.biasTorque, 9);
    expect(gravityPull(Math.PI / 2)).toBeCloseTo(PENDULUM_PARAMS.gravity + PENDULUM_PARAMS.biasTorque, 9);
    // Strong enough beats the pull at release; too gentle does not.
    const pull = gravityPull(INITIAL_STATE.theta);
    expect(Math.abs(controlTorque(INITIAL_STATE, DEFAULT_GAINS, PENDULUM_PARAMS))).toBeGreaterThan(pull);
    expect(Math.abs(controlTorque(INITIAL_STATE, { ...DEFAULT_GAINS, kp: 9.5 }, PENDULUM_PARAMS))).toBeLessThan(pull);
  });

  it('prints the fallen zone on the plate where the lab calls the pole fallen', () => {
    const at = (deg: number) => [{ theta: (deg * Math.PI) / 180, thetaDot: 0, integral: 0, t: 0 }];
    expect(classifyStability(at(FALLEN_DEG + 0.5))).toBe('fallen');
    expect(classifyStability(at(FALLEN_DEG - 0.5))).not.toBe('fallen');
    // The upright band is the lean the stage still calls balanced.
    expect(BALANCED_DEG).toBe(10);
  });

  it("inks the weight's recent path on the plate, from a dot where it starts", () => {
    expect(trailFor([0.2])).toBeNull();
    const ink = trailFor([0.2, 0.1, 0]);
    expect(ink).not.toBeNull();
    expect(ink!.d.split('L')).toHaveLength(3);
  });
});

describe('PendulumController served HTML', () => {
  const html = `<!doctype html><html><body><main>${renderToStaticMarkup(
    <PendulumController defaultKp={9.5} />,
  )}</main></body></html>`;

  it('passes the figure-system check and shows no symbol or bare unit in the main view', () => {
    const { figures, violations } = inspectFigureDocument(html, '/classical/control/');
    expect(figures).toEqual(['pendulum-controller']);
    expect(violations.map(formatViolation)).toEqual([]);
    const frame = new JSDOM(html).window.document.querySelector('[data-figure-frame]')!;
    expect(mainViewSymbolHits(frame)).toEqual([]);
  });
});

describe('PendulumController series encoding (VAL-B2-VIZ-002/004)', () => {
  beforeEach(() => mockReducedMotion(false));

  it('names every plotted series in the plot or the legend and tells each pair apart without colour', () => {
    const { container } = render(<PendulumController />);
    expect(Object.keys(seriesEncodings(container)).sort()).toEqual(['pendulum-pole']);
    expect(seriesEncodingViolations(container)).toEqual([]);
  });
});
