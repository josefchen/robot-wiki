import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppearancePhysicsPush } from '@/components/interactive/appearance-physics-push';
import {
  STROKE_CONTACT,
  STROKE_MAX,
  TRACK_MM,
  cockedStroke,
  mugOffset,
  mugTransform,
  padFace,
  pushTimeline,
} from '@/components/iso/figures/push-bench';
import {
  CONTACT_TIME_S,
  FRICTION_MU,
  GRAVITY_MS2,
  MASS_KG,
  TRACK_MAX_M,
  displacementForForce,
} from '@/lib/appearance-physics-push';

function movedCm(): number {
  const value = Number.parseFloat(screen.getByTestId('displacement-readout').textContent ?? '');
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

const scene = (name: RegExp) => screen.getByRole('button', { name });
const push = () => screen.getByRole('button', { name: /push the mug/i });
const strength = () => screen.getByRole('slider', { name: /push strength/i });
/** Where the real mug is drawn when it waits on its stand at the back of the bench. */
const ON_STAND = mugTransform(mugOffset(0, 0, 1));
const slideOf = (forceN: number) => ({
  v0: (forceN * CONTACT_TIME_S) / MASS_KG,
  decel: FRICTION_MU * GRAVITY_MS2,
  free: displacementForForce(forceN) * 1000,
  slow: 4,
});

describe('AppearancePhysicsPush', () => {
  it('shows the scene presets and the push, with strength, layers and reset under "Adjust more"', () => {
    const { container } = render(<AppearancePhysicsPush />);
    expect(scene(/^picture only$/i)).toHaveAttribute('aria-pressed', 'true');
    expect(scene(/^picture plus physics$/i)).toHaveAttribute('aria-pressed', 'false');
    expect(push()).toBeInTheDocument();
    const fold = container.querySelector<HTMLElement>('[data-figure-fold="adjust"]')!;
    expect(within(fold).getByRole('slider', { name: /push strength/i })).toHaveValue('4');
    expect(within(fold).getByRole('button', { name: /^picture$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(fold).getByRole('button', { name: /^shape, weight and friction$/i }))
      .toHaveAttribute('aria-pressed', 'false');
    expect(within(fold).getByRole('button', { name: /^physics solver$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(fold).getByRole('button', { name: /^reset$/i })).toBeInTheDocument();
    expect(screen.getByTestId('displacement-readout')).toHaveTextContent('0 centimetres');
    expect(screen.getByTestId('push-note')).toHaveTextContent(/only a picture/i);
  });

  it('push does nothing when the scene is only a picture', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(push());
    expect(movedCm()).toBe(0);
    const mug = screen.getByTestId('mug');
    expect(mug).toHaveAttribute('transform', ON_STAND);
    expect(mug).toHaveAttribute('data-position-mm', '0');
    expect(mug).not.toHaveAttribute('data-on-plate');
    expect(screen.getByTestId('push-test-note')).toHaveTextContent(/renderer is not a simulator/i);
    expect(screen.queryAllByTestId('motion-ghost')).toHaveLength(0);
  });

  it('picture plus physics turns the same push into visible motion', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(scene(/^picture plus physics$/i));
    expect(screen.getByTestId('displacement-readout')).toHaveTextContent('18.1 centimetres');
    const mug = screen.getByTestId('mug');
    expect(mug).toHaveAttribute('data-on-plate');
    expect(mug).toHaveAttribute('data-position-mm', '181');
    await waitFor(() => expect(mug.getAttribute('transform')).not.toBe(ON_STAND));
    expect(screen.getAllByTestId('motion-ghost')).toHaveLength(1);
    expect(screen.getByTestId('push-note')).toHaveTextContent(/same push slides the mug/i);
    // A second push accumulates more displacement.
    await user.click(push());
    expect(screen.getByTestId('displacement-readout')).toHaveTextContent('36.2 centimetres');
    expect(mug).toHaveAttribute('data-position-mm', '362');
    expect(screen.getAllByTestId('motion-ghost')).toHaveLength(2);
  });

  it('a stronger push slides the mug further', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(scene(/^picture plus physics$/i));
    const gentle = movedCm();
    fireEvent.change(strength(), { target: { value: '8' } });
    await user.click(push());
    expect(movedCm() - gentle).toBeGreaterThan(gentle);
  });

  it('reset restores the picture-only scene and the default strength', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(scene(/^picture plus physics$/i));
    fireEvent.change(strength(), { target: { value: '8' } });
    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(movedCm()).toBe(0);
    expect(scene(/^picture only$/i)).toHaveAttribute('aria-pressed', 'true');
    expect(strength()).toHaveValue('4');
    const mug = screen.getByTestId('mug');
    expect(mug).toHaveAttribute('data-position-mm', '0');
    expect(mug).not.toHaveAttribute('data-on-plate');
    await waitFor(() => expect(mug).toHaveAttribute('transform', ON_STAND), { timeout: 4000 });
  });

  it('is deterministic: the same inputs reproduce the same displacement', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(scene(/^picture plus physics$/i));
    await user.click(push());
    const firstRun = movedCm();
    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    await user.click(scene(/^picture plus physics$/i));
    await user.click(push());
    expect(movedCm()).toBeCloseTo(firstRun, 10);
  });

  it('with the solver off, shape, weight and friction alone do not move the mug', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(screen.getByRole('button', { name: /^shape, weight and friction$/i }));
    await user.click(screen.getByRole('button', { name: /^physics solver$/i }));
    await user.click(push());
    expect(movedCm()).toBe(0);
    expect(screen.getByTestId('push-note')).toHaveTextContent(/no solver/i);
    expect(screen.getByTestId('mug')).toHaveAttribute('data-on-plate');
    expect(scene(/^picture only$/i)).toHaveAttribute('aria-pressed', 'false');
    expect(scene(/^picture plus physics$/i)).toHaveAttribute('aria-pressed', 'false');
  });

  it('hides the picture layer on toggle while motion state is preserved', async () => {
    const user = userEvent.setup();
    render(<AppearancePhysicsPush />);
    await user.click(scene(/^picture plus physics$/i));
    await user.click(screen.getByRole('button', { name: /^picture$/i }));
    expect(screen.queryByTestId('mug-appearance')).not.toBeInTheDocument();
    expect(movedCm()).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /^picture$/i }));
    expect(screen.getByTestId('mug-appearance')).toBeInTheDocument();
  });

  it('renders the scene with an accessible description', () => {
    render(<AppearancePhysicsPush />);
    expect(screen.getByRole('img', { name: /mug on a table/i })).toBeInTheDocument();
  });

  it('describes the picture-only push and tracks the strength slider', () => {
    const { container } = render(<AppearancePhysicsPush />);
    const img = screen.getByRole('img', { name: /mug on a table/i });
    const id = img.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    const desc = container.querySelector(`[id="${CSS.escape(id!)}"]`);
    expect(desc?.textContent).toMatch(/a push of 4 newtons/);
    expect(desc?.textContent).toMatch(/leaves the mug at 0 centimetres/);
    fireEvent.change(strength(), { target: { value: '8' } });
    const moved = container.querySelector('[data-chart-description]')?.textContent ?? '';
    expect(moved).toMatch(/a push of 8 newtons/);
  });

  it('keeps words out of the drawing and the run button unpressed', () => {
    const { container } = render(<AppearancePhysicsPush />);
    const svg = container.querySelector('svg[role="img"]')!;
    expect(svg.querySelectorAll('text, title, desc, foreignObject')).toHaveLength(0);
    expect(push()).not.toHaveAttribute('aria-pressed');
  });
});

describe('the push bench model', () => {
  const rest = { c: 0, s: cockedStroke(4), x: 0, parked: 0 };

  it('lays the 50 cm track out as the ruler, and the pad meets the mug face at the contact stroke', () => {
    expect(TRACK_MM).toBe(TRACK_MAX_M * 1000);
    expect(padFace(STROKE_CONTACT)).toBe(-40);
    expect(padFace(STROKE_CONTACT, 181)).toBe(181 - 40);
    expect(padFace(STROKE_MAX)).toBeGreaterThan(0);
  });

  it('slides the mug the model distance, d = v²/2μg, in the time friction takes, slowed four times', () => {
    const to = displacementForForce(4) * 1000;
    const run = pushTimeline(rest, { c: 0, from: 0, to, body: true, moves: true, forceN: 4 }, slideOf(4));
    const end = run.at(run.duration).pose;
    expect(end.x).toBeCloseTo(to, 6);
    expect(end.s).toBeCloseTo(cockedStroke(4), 6);
    const slide = slideOf(4);
    const sliding = (slide.v0 / slide.decel) * slide.slow;
    expect(run.duration).toBeCloseTo(0.16 + sliding, 6);
    // Halfway through the slide the mug has covered three quarters of its distance: friction slows it evenly.
    expect(run.at(0.16 + sliding / 2).pose.x).toBeCloseTo(0.75 * slide.free, 6);
    expect(run.at(0.16 + sliding / 2).phase).toMatch(/^sliding · 13\.6 centimetres from the start$/);
  });

  it('stops the mug at the end stop when the model clamps it, and fires from behind it on a later push', () => {
    const from = 362.4;
    const run = pushTimeline({ ...rest, c: 181.2, x: from }, { c: from, from, to: 500, body: true, moves: true, forceN: 10 }, slideOf(10));
    expect(run.at(0.1).pose.c).toBeGreaterThan(181.2);
    expect(run.at(0.1).phase).toMatch(/rolling the plunger up/);
    const end = run.at(run.duration).pose;
    expect(end.c).toBe(from);
    expect(end.x).toBe(500);
  });

  it('sends the plunger through the picture when nothing is on the plate, and leaves the mug where it is', () => {
    const run = pushTimeline({ ...rest, parked: 1 }, { c: 0, from: 0, to: 0, body: false, moves: false, forceN: 4 }, slideOf(4));
    const strokes = Array.from({ length: 60 }, (_, i) => run.at((i / 59) * run.duration).pose);
    expect(Math.max(...strokes.map((p) => p.s))).toBeCloseTo(STROKE_MAX, 6);
    expect(strokes.every((p) => p.x === 0)).toBe(true);
    expect(run.at(0.2).phase).toBe('the plunger passes through the picture');
  });
});
