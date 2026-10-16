import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RewardShaping, drawnPose } from '@/components/interactive/reward-shaping';
import { beltSlats, bodyShift, capShift } from '@/components/iso/figures/reward-mixing-desk';
import { TERMS, classifyBehavior, defaultWeights, weightedTotal } from '@/lib/reward-shaping';

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

  it('stays balanced at torque 4.0 with velTrack 4.0 and states the relative threshold', () => {
    // Reproduction of the published false claim: torque 4.0 with
    // velTrack 4.0 classifies balanced (4.0 >= 2.5 but 4.0 < 2x4.0), so
    // an absolute "stay below the 2.5 bar" sentence was false here.
    const { container } = render(<RewardShaping />);
    fireEvent.change(slider(/torque/i), { target: { value: '40' } });
    fireEvent.change(slider(/linear velocity/i), { target: { value: '40' } });
    expect(statusText()).toMatch(/balanced/i);
    const desc =
      container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(desc).toMatch(
      /neither torque 4\.0 nor air time 0\.6 clears the 2\.5 attractor bar and 2x the 4\.0 velocity-tracking weight together/,
    );
    expect(desc).not.toMatch(/stay below/);
  });

  it('each named scoring rule selects its walk, and Balanced score restores the trot', async () => {
    const user = userEvent.setup();
    const { container } = render(<RewardShaping />);
    const litFaders = () => [...container.querySelectorAll('[data-lit-fader="true"]')];
    const balanced = screen.getByRole('button', { name: 'Balanced score' });
    expect(balanced.getAttribute('aria-pressed')).toBe('true');
    for (const [preset, status, walk, term, weight] of [
      ['Too strict on effort', /freez/i, 'Stands still', 'torque', '4.0'],
      ['Loves high steps', /pranc/i, 'Bounces in place', 'airTime', '4.0'],
      ['Ignores jerky moves', /chatter/i, 'Legs jitter', 'actionRate', '0.0'],
    ] as const) {
      await user.click(screen.getByRole('button', { name: preset }));
      expect(statusText()).toMatch(status);
      expect(screen.getByTestId('walk-readout').textContent).toBe(walk);
      // The fader the rule moved is the one lit, at the end of its slot; every other fader stays at the balanced score.
      expect(litFaders().map((fader) => fader.getAttribute('data-fader'))).toEqual([term]);
      expect(litFaders()[0]!.getAttribute('data-weight')).toBe(weight);
      for (const t of TERMS) {
        if (t.id === term) continue;
        expect(container.querySelector(`[data-fader="${t.id}"]`)?.getAttribute('data-weight')).toBe(t.defaultWeight.toFixed(1));
      }
      expect(screen.getByRole('button', { name: preset }).getAttribute('aria-pressed')).toBe('true');
    }
    await user.click(balanced);
    expect(statusText()).toMatch(/balanced/i);
    expect(screen.getByTestId('walk-readout').textContent).toBe('Steady trot');
    expect(litFaders().map((fader) => fader.getAttribute('data-fader'))).toEqual(['velTrack']);
    for (const t of TERMS) {
      expect(container.querySelector(`[data-fader="${t.id}"]`)?.getAttribute('data-weight')).toBe(t.defaultWeight.toFixed(1));
    }
    const expected = weightedTotal(defaultWeights()).toFixed(2);
    expect(screen.getByTestId('total-readout').textContent).toContain(expected);
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

  it('draws the desk and treadmill with no words, one lit fader, every cap at its weight and the robot at the model pose', async () => {
    // Reduced motion: faders and the walk jump to the chosen state, so the drawing can be read straight after a click.
    const matchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'), media: query, onchange: null,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      const user = userEvent.setup();
      const { container } = render(<RewardShaping />);
      const stage = screen.getByTestId('quad-preview');
      for (const preset of ['Balanced score', 'Too strict on effort', 'Loves high steps', 'Ignores jerky moves', 'Balanced score']) {
        await user.click(screen.getByRole('button', { name: preset }));
        expect(stage.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
        expect(stage.textContent).toBe('');
        const lit = stage.querySelectorAll('[data-lit]');
        expect(lit).toHaveLength(1);
        expect(lit[0]!.closest('[data-lit-fader="true"]')).not.toBeNull();
        const weights = Object.fromEntries(
          [...stage.querySelectorAll('[data-fader]')].map((fader) => [fader.getAttribute('data-fader'), Number(fader.getAttribute('data-weight'))]),
        ) as Parameters<typeof classifyBehavior>[0];
        for (const fader of stage.querySelectorAll('[data-fader]')) {
          expect(fader.getAttribute('transform')).toBe(capShift(Number(fader.getAttribute('data-weight'))));
        }
        const pose = drawnPose(classifyBehavior(weights), 0);
        expect(stage.querySelector('[data-part="robot-body"]')?.getAttribute('transform')).toBe(bodyShift(pose.rise));
        expect(stage.querySelector('[data-part="belt"] path:last-child')?.getAttribute('d')).toBe(beltSlats(pose.travel));
      }
      // Step moves the stride on by its five percent, and the drawing follows the model.
      await user.click(screen.getByRole('button', { name: 'Step the preview forward' }));
      expect(container.querySelector('[data-part="belt"] path:last-child')?.getAttribute('d')).toBe(beltSlats(drawnPose('balanced', 0.05).travel));
    } finally {
      window.matchMedia = matchMedia;
    }
  });
});
