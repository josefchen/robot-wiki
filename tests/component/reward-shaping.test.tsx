import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RewardShaping } from '@/components/interactive/reward-shaping';
import { TERMS, defaultWeights, weightedTotal } from '@/lib/reward-shaping';

function slider(name: RegExp) {
  return screen.getByRole('slider', { name });
}

function statusText() {
  return screen.getByTestId('behavior-status').textContent ?? '';
}

describe('RewardShaping', () => {
  it('renders the full term set as labeled sliders with a preview, readout, and reset', () => {
    render(<RewardShaping />);
    expect(screen.getAllByRole('slider').length).toBeGreaterThanOrEqual(10);
    for (const required of [
      /velocity tracking/i,
      /torque/i,
      /action-rate/i,
      /foot air time/i,
      /base height/i,
      /orientation/i,
      /joint.?limit/i,
      /collision/i,
      /stumble/i,
      /termination/i,
    ]) {
      expect(
        slider(required),
        `missing slider ${required}`,
      ).toBeInTheDocument();
    }
    expect(screen.getByTestId('quad-preview')).toBeInTheDocument();
    expect(screen.getByTestId('total-readout')).toBeInTheDocument();
    expect(screen.getByTestId('behavior-status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('defaults to a balanced gait with the default weighted total', () => {
    render(<RewardShaping />);
    expect(statusText()).toMatch(/balanced/i);
    const expected = weightedTotal(defaultWeights()).toFixed(2);
    expect(screen.getByTestId('total-readout').textContent).toContain(
      expected,
    );
  });

  it('maxing the torque penalty drives the freeze attractor', () => {
    render(<RewardShaping />);
    fireEvent.change(slider(/torque/i), { target: { value: '40' } });
    expect(statusText()).toMatch(/freez/i);
    expect(screen.getByTestId('quad-preview').getAttribute('aria-label')).toMatch(
      /freez/i,
    );
  });

  it('maxing the foot air time reward drives the prance attractor', () => {
    render(<RewardShaping />);
    fireEvent.change(slider(/foot air time/i), { target: { value: '40' } });
    expect(statusText()).toMatch(/pranc/i);
  });

  it('zeroing the action-rate penalty drives the chatter attractor', () => {
    render(<RewardShaping />);
    fireEvent.change(slider(/action-rate/i), { target: { value: '0' } });
    expect(statusText()).toMatch(/chatter/i);
  });

  it('moving a weight updates the weighted total readout', () => {
    render(<RewardShaping />);
    const before = screen.getByTestId('total-readout').textContent;
    fireEvent.change(slider(/velocity tracking/i), {
      target: { value: '40' },
    });
    const after = screen.getByTestId('total-readout').textContent;
    expect(after).not.toBe(before);
  });

  it('reset restores default weights and the balanced state', async () => {
    const user = userEvent.setup();
    render(<RewardShaping />);
    fireEvent.change(slider(/torque/i), { target: { value: '40' } });
    expect(statusText()).toMatch(/freez/i);
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(statusText()).toMatch(/balanced/i);
    const expected = weightedTotal(defaultWeights()).toFixed(2);
    expect(screen.getByTestId('total-readout').textContent).toContain(
      expected,
    );
    expect(TERMS.length).toBe(12);
  });

  it('describes the attractor instead of enumerating the twelve weights', () => {
    const { container } = render(<RewardShaping />);
    const img = screen.getByTestId('quad-preview');
    const id = img.getAttribute('aria-describedby');
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/balanced trot/);
    expect(desc?.textContent).toMatch(/total of -5\.52 per step/);
    expect(desc?.textContent).not.toMatch(/Linear velocity tracking/);
    fireEvent.change(slider(/torque/i), { target: { value: '40' } });
    expect(
      container.querySelector('[data-chart-description]')?.textContent,
    ).toMatch(/freeze attractor/);
    fireEvent.change(slider(/torque/i), { target: { value: '8' } });
    fireEvent.change(slider(/foot air time/i), { target: { value: '40' } });
    expect(
      container.querySelector('[data-chart-description]')?.textContent,
    ).toMatch(/prance attractor/);
    fireEvent.change(slider(/action-rate/i), { target: { value: '0' } });
    expect(
      container.querySelector('[data-chart-description]')?.textContent,
    ).toMatch(/chatter attractor/);
  });

  it('play toggles to pause and back', async () => {
    const user = userEvent.setup();
    render(<RewardShaping />);
    const play = screen.getByRole('button', { name: /play/i });
    await user.click(play);
    expect(
      screen.getByRole('button', { name: /pause/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /pause/i }));
    expect(
      screen.getByRole('button', { name: /play/i }),
    ).toBeInTheDocument();
  });
});
