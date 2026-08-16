import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KalmanTracker } from '@/components/interactive/kalman-tracker';
import {
  DEFAULT_SEED,
  DEFAULT_SETTINGS,
  INITIAL_STEP,
  MAX_STEPS,
} from '@/lib/kalman';

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

function readout(id: string) {
  return screen.getByTestId(id).textContent ?? '';
}

describe('KalmanTracker', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the scene, noise sliders, controls, and readouts', () => {
    render(<KalmanTracker />);
    const scene = screen.getByTestId('kalman-scene');
    expect(scene).toBeInTheDocument();
    expect(scene).toHaveAttribute('role', 'img');
    expect(scene).toHaveAttribute('aria-label');
    expect(screen.getByTestId('kalman-band')).toBeInTheDocument();
    expect(screen.getByTestId('kalman-truth-line')).toBeInTheDocument();
    expect(screen.getByTestId('kalman-estimate-line')).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: /process noise/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('slider', { name: /measurement noise/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /run the tracker/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /step the tracker/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reseed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    for (const id of [
      'kalman-step-readout',
      'kalman-seed-readout',
      'kalman-sigma-readout',
      'kalman-gain-readout',
      'kalman-rms-readout',
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });

  it('starts paused at the known opening step with the default seed and matched settings', () => {
    render(<KalmanTracker />);
    expect(readout('kalman-step-readout')).toBe(
      `${INITIAL_STEP} / ${MAX_STEPS}`,
    );
    expect(readout('kalman-seed-readout')).toBe(String(DEFAULT_SEED));
    expect(screen.getByTestId('kalman-sigmaq-value')).toHaveTextContent(
      DEFAULT_SETTINGS.sigmaQ.toFixed(2),
    );
    expect(screen.getByTestId('kalman-sigmar-value')).toHaveTextContent(
      DEFAULT_SETTINGS.sigmaR.toFixed(2),
    );
  });

  it('responds to the measurement-noise slider while paused: band widens', () => {
    render(<KalmanTracker />);
    const before = Number.parseFloat(readout('kalman-sigma-readout'));
    fireEvent.change(
      screen.getByRole('slider', { name: /measurement noise/i }),
      { target: { value: '3' } },
    );
    expect(screen.getByTestId('kalman-sigmar-value')).toHaveTextContent('3.00');
    const after = Number.parseFloat(readout('kalman-sigma-readout'));
    expect(after).toBeGreaterThan(before);
  });

  it('responds to the process-noise slider while paused: band widens', () => {
    render(<KalmanTracker />);
    // The tracker opens mid-run, so the covariance already carries the
    // process noise's contribution and the band responds immediately.
    const before = Number.parseFloat(readout('kalman-sigma-readout'));
    fireEvent.change(screen.getByRole('slider', { name: /process noise/i }), {
      target: { value: '1' },
    });
    expect(screen.getByTestId('kalman-sigmaq-value')).toHaveTextContent('1.00');
    const after = Number.parseFloat(readout('kalman-sigma-readout'));
    expect(after).toBeGreaterThan(before);
  });

  it('run advances the tracker and pause freezes it', () => {
    vi.useFakeTimers();
    render(<KalmanTracker />);
    fireEvent.click(screen.getByRole('button', { name: /run the tracker/i }));
    expect(
      screen.getByRole('button', { name: /pause the tracker/i }),
    ).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(readout('kalman-step-readout')).not.toBe(`0 / ${MAX_STEPS}`);
    fireEvent.click(screen.getByRole('button', { name: /pause the tracker/i }));
    const frozen = readout('kalman-step-readout');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(readout('kalman-step-readout')).toBe(frozen);
  });

  it('step button advances exactly one step while paused', () => {
    render(<KalmanTracker />);
    fireEvent.click(screen.getByRole('button', { name: /step the tracker/i }));
    expect(readout('kalman-step-readout')).toBe(
      `${INITIAL_STEP + 1} / ${MAX_STEPS}`,
    );
    fireEvent.click(screen.getByRole('button', { name: /step the tracker/i }));
    expect(readout('kalman-step-readout')).toBe(
      `${INITIAL_STEP + 2} / ${MAX_STEPS}`,
    );
  });

  it('reproduces a run exactly after reset (same seed, same values)', () => {
    vi.useFakeTimers();
    render(<KalmanTracker />);
    const runAndCapture = () => {
      fireEvent.click(screen.getByRole('button', { name: /run the tracker/i }));
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      fireEvent.click(
        screen.getByRole('button', { name: /pause the tracker/i }),
      );
      return [
        readout('kalman-step-readout'),
        readout('kalman-sigma-readout'),
        readout('kalman-gain-readout'),
        readout('kalman-rms-readout'),
        screen.getByTestId('kalman-truth-line').getAttribute('points'),
      ];
    };
    const first = runAndCapture();
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(readout('kalman-step-readout')).toBe(
      `${INITIAL_STEP} / ${MAX_STEPS}`,
    );
    const second = runAndCapture();
    expect(second).toEqual(first);
  });

  it('reseed generates a fresh world and reset returns to the default one', () => {
    render(<KalmanTracker />);
    const defaultPath = screen
      .getByTestId('kalman-truth-line')
      .getAttribute('points');
    fireEvent.click(screen.getByRole('button', { name: /reseed/i }));
    expect(readout('kalman-seed-readout')).toBe(String(DEFAULT_SEED + 1));
    expect(readout('kalman-step-readout')).toBe(
      `${INITIAL_STEP} / ${MAX_STEPS}`,
    );
    const freshPath = screen
      .getByTestId('kalman-truth-line')
      .getAttribute('points');
    expect(freshPath).not.toBe(defaultPath);
    // The same seed always regenerates the same world.
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(readout('kalman-seed-readout')).toBe(String(DEFAULT_SEED));
    expect(screen.getByTestId('kalman-truth-line').getAttribute('points')).toBe(
      defaultPath,
    );
  });

  it('reseed keeps the slider settings', async () => {
    const user = userEvent.setup();
    render(<KalmanTracker />);
    fireEvent.change(
      screen.getByRole('slider', { name: /measurement noise/i }),
      { target: { value: '2.5' } },
    );
    await user.click(screen.getByRole('button', { name: /reseed/i }));
    expect(screen.getByTestId('kalman-sigmar-value')).toHaveTextContent('2.50');
  });

  it('reset restores default settings and stops playback', async () => {
    const user = userEvent.setup();
    render(<KalmanTracker />);
    fireEvent.change(
      screen.getByRole('slider', { name: /measurement noise/i }),
      { target: { value: '2.5' } },
    );
    await user.click(screen.getByRole('button', { name: /run the tracker/i }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(readout('kalman-step-readout')).toBe(
      `${INITIAL_STEP} / ${MAX_STEPS}`,
    );
    expect(screen.getByTestId('kalman-sigmar-value')).toHaveTextContent(
      DEFAULT_SETTINGS.sigmaR.toFixed(2),
    );
    expect(
      screen.getByRole('button', { name: /run the tracker/i }),
    ).toBeInTheDocument();
  });

  it('stops at the end of the episode and runs again from the top', () => {
    vi.useFakeTimers();
    render(<KalmanTracker />);
    fireEvent.click(screen.getByRole('button', { name: /run the tracker/i }));
    act(() => {
      vi.advanceTimersByTime(MAX_STEPS * 80 + 1000);
    });
    expect(readout('kalman-step-readout')).toBe(`${MAX_STEPS} / ${MAX_STEPS}`);
    // Playback stopped at the end; the run control is back.
    expect(
      screen.getByRole('button', { name: /run the tracker/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /run the tracker/i }));
    act(() => {
      vi.advanceTimersByTime(160);
    });
    const step = Number.parseInt(readout('kalman-step-readout'), 10);
    expect(step).toBeGreaterThanOrEqual(INITIAL_STEP + 1);
    expect(step).toBeLessThan(INITIAL_STEP + 10);
  });

  it('is keyboard-operable', async () => {
    const user = userEvent.setup();
    render(<KalmanTracker />);
    // Sliders are native range inputs: focusable, labeled, value-bearing.
    // (Arrow-key stepping is exercised against real Chromium in the e2e
    // spec; jsdom does not implement keyboard stepping for range inputs.)
    const slider = screen.getByRole('slider', { name: /measurement noise/i });
    slider.focus();
    expect(slider).toHaveFocus();
    expect(slider).toHaveAccessibleName(/measurement noise/i);
    // Buttons activate from the keyboard.
    const run = screen.getByRole('button', { name: /run the tracker/i });
    run.focus();
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('button', { name: /pause the tracker/i }),
    ).toBeInTheDocument();
    await user.keyboard('{Enter}');
  });

  it('under reduced motion, ticks still advance the tracker in coarse jumps', () => {
    mockReducedMotion(true);
    vi.useFakeTimers();
    render(<KalmanTracker />);
    fireEvent.click(screen.getByRole('button', { name: /run the tracker/i }));
    act(() => {
      // Two coarse ticks of 4 steps each.
      vi.advanceTimersByTime(700);
    });
    const step = Number.parseInt(readout('kalman-step-readout'), 10);
    expect(step).toBe(INITIAL_STEP + 8);
  });
});
