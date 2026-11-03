import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppearancePhysicsPush } from '@/components/interactive/appearance-physics-push';
import { PendulumController } from '@/components/interactive/pendulum-controller';
import { advancePendulum, applyPush, controlTorque, DEFAULT_GAINS, formatDeg, INITIAL_STATE, PENDULUM_PARAMS } from '@/lib/pendulum';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} })));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('input traces preserve figure outputs', () => {
  it('records applied forces without replacing the established displacement behavior', () => {
    const { container } = render(<AppearancePhysicsPush />), stage = screen.getByTestId('push-bench');
    const inputs = () => JSON.parse(stage.getAttribute('data-source-forces')!);
    const moved = () => Number.parseFloat(screen.getByTestId('displacement-readout').textContent!);
    expect(inputs()).toEqual([]); expect(moved()).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: /^Picture plus physics$/ }));
    expect(inputs()).toEqual([4]); expect(moved()).toBe(18.1);
    fireEvent.change(container.querySelector('input[aria-label^="Push strength"]')!, { target: { value: '6' } });
    expect(inputs()).toEqual([4]); expect(moved()).toBe(18.1);
    fireEvent.click(screen.getByRole('button', { name: /Push the mug/ }));
    expect(inputs()).toEqual([4, 6]); expect(moved()).toBe(50);
    fireEvent.click(screen.getByRole('button', { name: /^Physics solver$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Push the mug/ }));
    expect(inputs()).toEqual([4, 6]); expect(moved()).toBe(50);
    fireEvent.click(screen.getByRole('button', { name: /^Reset$/ }));
    expect(inputs()).toEqual([]); expect(moved()).toBe(0); expect(stage).toHaveAttribute('data-source-trace-complete', 'true');
  });
  it('retains original pendulum outputs through timing, retuning, push and reset', () => {
    const { container } = render(<PendulumController />), stage = screen.getByTestId('pendulum-stage-frame');
    const inputs = () => JSON.parse(stage.getAttribute('data-source-inputs')!);
    const check = (state: typeof INITIAL_STATE, gains = DEFAULT_GAINS) => {
      expect(screen.getByTestId('pendulum-angle-readout')).toHaveTextContent(`${formatDeg(state.theta)}°`);
      expect(screen.getByTestId('pendulum-rate-readout')).toHaveTextContent(`${formatDeg(state.thetaDot)}°/s`);
      expect(screen.getByTestId('pendulum-integral-readout')).toHaveTextContent(state.integral.toFixed(2));
      expect(screen.getByTestId('pendulum-torque-readout')).toHaveTextContent(`${controlTorque(state, gains, PENDULUM_PARAMS).toFixed(1)} N·m`);
    };
    check(INITIAL_STATE); expect(inputs()).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Run the simulation' }));
    act(() => vi.advanceTimersByTime(640));
    let expected = advancePendulum(advancePendulum(INITIAL_STATE, DEFAULT_GAINS, PENDULUM_PARAMS, 0.32), DEFAULT_GAINS, PENDULUM_PARAMS, 0.32);
    check(expected); expect(inputs()).toEqual([{ kind: 'advance', steps: 308, ...DEFAULT_GAINS }]);
    fireEvent.change(container.querySelector('input[aria-label^="React to the lean"]')!, { target: { value: '40' } });
    const changed = { ...DEFAULT_GAINS, kp: 40 };
    act(() => vi.advanceTimersByTime(320)); expected = advancePendulum(expected, changed, PENDULUM_PARAMS, 0.32); check(expected, changed);
    expect(inputs().at(-1)).toEqual({ kind: 'advance', steps: 154, ...changed });
    fireEvent.click(screen.getByRole('button', { name: 'Pause the simulation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Give it a push' })); expected = applyPush(expected); check(expected, changed);
    expect(inputs().at(-1)).toEqual({ kind: 'push', impulse: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Reset the simulation and restore default gains' }));
    check(INITIAL_STATE); expect(inputs()).toEqual([]); expect(stage).toHaveAttribute('data-source-steps', '0'); expect(stage).toHaveAttribute('data-source-trace-complete', 'true');
  });
});
