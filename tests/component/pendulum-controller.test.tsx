import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PendulumController } from '@/components/interactive/pendulum-controller';
import { DEFAULT_GAINS } from '@/lib/pendulum';

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
      screen.getByRole('button', { name: /push the pole/i }),
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
    fireEvent.click(screen.getByRole('button', { name: /push the pole/i }));
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
});
