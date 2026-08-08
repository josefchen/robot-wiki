import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MpcVsRl } from '@/components/interactive/mpc-vs-rl';
import { PERTURBATIONS } from '@/lib/mpc-vs-rl';

describe('MpcVsRl', () => {
  it('renders a perturbation control per scripted disturbance plus both controller panels', () => {
    render(<MpcVsRl />);
    for (const p of PERTURBATIONS) {
      const escaped = p.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(
        screen.getByRole('button', { name: new RegExp(escaped, 'i') }),
      ).toBeInTheDocument();
    }
    expect(screen.getByTestId('perturbation-chart')).toBeInTheDocument();
    expect(screen.getByTestId('mpc-trace')).toBeInTheDocument();
    expect(screen.getByTestId('rl-trace')).toBeInTheDocument();
    expect(screen.getByTestId('mpc-status')).toBeInTheDocument();
    expect(screen.getByTestId('rl-status')).toBeInTheDocument();
    expect(screen.getByTestId('mpc-annotation')).toBeInTheDocument();
    expect(screen.getByTestId('rl-annotation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('compute-per-step readouts differ between the controllers', () => {
    render(<MpcVsRl />);
    const mpc = screen.getByTestId('mpc-compute').textContent;
    const rl = screen.getByTestId('rl-compute').textContent;
    expect(mpc).not.toBe(rl);
    expect(mpc).toMatch(/re-solve|optimiz/i);
    expect(rl).toMatch(/forward pass/i);
  });

  it('a push is rejected cleanly by MPC and absorbed with oscillation by the policy', () => {
    render(<MpcVsRl />);
    expect(screen.getByTestId('mpc-status').textContent).toMatch(/recovers/i);
    expect(screen.getByTestId('rl-status').textContent).toMatch(/recovers/i);
    const mpcTrace = screen
      .getByTestId('mpc-trace')
      .getAttribute('points');
    const rlTrace = screen.getByTestId('rl-trace').getAttribute('points');
    expect(mpcTrace).not.toBe(rlTrace);
  });

  it('the low-friction patch trips the model-based controller, not the randomized policy', async () => {
    const user = userEvent.setup();
    render(<MpcVsRl />);
    await user.click(
      screen.getByRole('button', { name: /low-friction/i }),
    );
    expect(screen.getByTestId('mpc-status').textContent).toMatch(/falls/i);
    expect(screen.getByTestId('rl-status').textContent).toMatch(/recovers/i);
    expect(
      screen.getByTestId('mpc-annotation').textContent,
    ).toMatch(/friction|model/i);
  });

  it('switching perturbations updates the annotations', async () => {
    const user = userEvent.setup();
    render(<MpcVsRl />);
    const before = screen.getByTestId('mpc-annotation').textContent;
    await user.click(screen.getByRole('button', { name: /payload/i }));
    const after = screen.getByTestId('mpc-annotation').textContent;
    expect(after).not.toBe(before);
  });

  it('reset returns to the default perturbation', async () => {
    const user = userEvent.setup();
    render(<MpcVsRl />);
    await user.click(
      screen.getByRole('button', { name: /low-friction/i }),
    );
    expect(screen.getByTestId('mpc-status').textContent).toMatch(/falls/i);
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByTestId('mpc-status').textContent).toMatch(/recovers/i);
  });
});
