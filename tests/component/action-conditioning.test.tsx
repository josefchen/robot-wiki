import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ActionConditioning } from '@/components/interactive/action-conditioning';

function sensitivity(): number {
  const el = screen.getByTestId('sensitivity-readout');
  const value = Number.parseFloat(el.textContent ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

function realism(): number {
  const el = screen.getByTestId('realism-readout');
  const value = Number.parseFloat(el.textContent ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

function finalBlockX(panel: 'a' | 'b'): number {
  const el = screen.getByTestId(`block-${panel}-4`);
  return Number(el.getAttribute('x'));
}

describe('ActionConditioning', () => {
  it('renders the shared initial frame, two rollout panels, action controls, readouts, and reset', () => {
    render(<ActionConditioning />);
    expect(screen.getByTestId('initial-frame')).toBeInTheDocument();
    expect(screen.getByTestId('rollout-panel-a')).toBeInTheDocument();
    expect(screen.getByTestId('rollout-panel-b')).toBeInTheDocument();
    // A control offering at least two distinct actions per rollout.
    expect(screen.getAllByRole('button', { name: /push left/i })).toHaveLength(
      2,
    );
    expect(
      screen.getAllByRole('button', { name: /lift gripper/i }),
    ).toHaveLength(2);
    expect(screen.getByTestId('sensitivity-readout')).toBeInTheDocument();
    expect(screen.getByTestId('realism-readout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('defaults to strong conditioning with diverging rollouts above the threshold', () => {
    render(<ActionConditioning />);
    expect(
      screen.getByRole('button', { name: /strong conditioning/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(sensitivity()).toBeGreaterThan(0.3);
    expect(finalBlockX('a')).not.toBe(finalBlockX('b'));
  });

  it('collapses both rollouts to near-identical futures under weak conditioning while realism stays high', async () => {
    const user = userEvent.setup();
    render(<ActionConditioning />);
    const realismStrong = realism();
    expect(realismStrong).toBeGreaterThanOrEqual(0.85);
    await user.click(
      screen.getByRole('button', { name: /weak conditioning/i }),
    );
    expect(sensitivity()).toBeLessThan(0.05);
    // The final frames of both rollouts now match to within a pixel or two
    // (the weak model keeps a 4% whisper of the action, so they are
    // near-identical rather than bit-identical).
    expect(Math.abs(finalBlockX('a') - finalBlockX('b'))).toBeLessThan(2);
    // Realism does not move with sensitivity: the decoupling is the point.
    expect(realism()).toBe(realismStrong);
  });

  it('reproduces the same score when the same action and conditioning are re-selected', async () => {
    const user = userEvent.setup();
    render(<ActionConditioning />);
    const before = sensitivity();
    // Swap rollout B from lift to push right: a different action pair gives
    // a different distance between the two futures.
    await user.click(screen.getAllByRole('button', { name: /push right/i })[1]);
    expect(sensitivity()).not.toBe(before);
    await user.click(
      screen.getAllByRole('button', { name: /lift gripper/i })[1],
    );
    expect(sensitivity()).toBe(before);
  });

  it('reports identical futures when both rollouts use the same action', async () => {
    const user = userEvent.setup();
    render(<ActionConditioning />);
    await user.click(screen.getAllByRole('button', { name: /push left/i })[1]);
    expect(sensitivity()).toBe(0);
  });

  it('reset restores the default actions and strong conditioning', async () => {
    const user = userEvent.setup();
    render(<ActionConditioning />);
    const initial = sensitivity();
    await user.click(
      screen.getByRole('button', { name: /weak conditioning/i }),
    );
    await user.click(screen.getAllByRole('button', { name: /push right/i })[0]);
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(sensitivity()).toBe(initial);
    expect(
      screen.getByRole('button', { name: /strong conditioning/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('initial-frame')).toBeInTheDocument();
    // Default pair: A = push left, B = lift gripper.
    const panelA = screen.getByTestId('rollout-panel-a');
    const panelB = screen.getByTestId('rollout-panel-b');
    expect(panelA).toHaveTextContent(/push left/i);
    expect(panelB).toHaveTextContent(/lift gripper/i);
  });

  it('exposes accessible chart labels describing both rollouts', () => {
    render(<ActionConditioning />);
    expect(
      screen.getByRole('img', { name: /shared initial frame/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /rollout a/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /rollout b/i })).toBeInTheDocument();
  });
});
