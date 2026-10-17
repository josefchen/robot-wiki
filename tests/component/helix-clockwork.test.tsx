import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HelixClockwork, STILL_MS, readoutFor } from '@/components/interactive/helix-clockwork';
import {
  S0_HZ,
  S1_HZ,
  SPAN_MS,
  STEPS_PER_TARGET,
  controlSteps,
  escapeSteps,
  jointTargets,
  movingAt,
  s0HandDegrees,
  s1HandDegrees,
  starSteps,
} from '@/components/iso/figures/helix-clockwork';
import { getSystem } from '@/lib/hierarchy-timescales';

describe('the Helix clockwork model', () => {
  it("takes Figure's two disclosed Helix 02 rates from the timescale table: five control steps per joint target", () => {
    const helix = getSystem('helix-02');
    const s1 = helix.lanes.find((lane) => lane.id === 's1')!;
    const s0 = helix.lanes.find((lane) => lane.id === 's0')!;
    expect(s1.disclosed && s0.disclosed).toBe(true);
    expect(S1_HZ).toBe(1000 / s1.periodMs!);
    expect(S0_HZ).toBe(1000 / s0.periodMs!);
    expect(S1_HZ).toBe(200);
    expect(S0_HZ).toBe(1000);
    expect(STEPS_PER_TARGET).toBe(5);
  });

  it('counts one control step a millisecond and one new joint target every five', () => {
    for (let ms = 0; ms <= SPAN_MS; ms += 1) {
      expect(controlSteps(ms)).toBe(ms);
      expect(jointTargets(ms)).toBe(Math.floor(ms / 5));
    }
    for (let target = 1; target <= SPAN_MS / 5; target += 1) {
      expect(controlSteps(target * 5) - controlSteps((target - 1) * 5)).toBe(STEPS_PER_TARGET);
    }
    expect(readoutFor(STILL_MS)).toBe('7 milliseconds · 7 control steps · 1 new joint target');
    expect(readoutFor(SPAN_MS)).toBe('20 milliseconds · 20 control steps · 4 new joint targets');
    // Mid-step, the time shown is the whole milliseconds elapsed, so it always agrees with the step count.
    expect(readoutFor(7.95)).toBe('7 milliseconds · 7 control steps · 1 new joint target');
    expect(readoutFor(9.999)).toBe('9 milliseconds · 9 control steps · 1 new joint target');
  });

  it('turns each wheel exactly as its count lands, and holds the star still between targets', () => {
    for (let ms = 0; ms <= SPAN_MS; ms += 1) {
      expect(escapeSteps(ms)).toBeCloseTo(controlSteps(ms), 9);
      expect(starSteps(ms)).toBeCloseTo(jointTargets(ms), 9);
      expect(s0HandDegrees(ms)).toBeCloseTo(18 * ms, 6);
      expect(s1HandDegrees(ms)).toBeCloseTo(90 * Math.floor(ms / 5), 6);
    }
    // Between targets the S1 hand does not move while the S0 hand ticks.
    for (const ms of [5.2, 6, 7.4, 8.5, 9.6]) expect(s1HandDegrees(ms)).toBeCloseTo(90, 9);
    // The wheels only ever turn forward.
    let lastS0 = -1;
    let lastS1 = -1;
    for (let ms = 0; ms <= SPAN_MS; ms += 0.01) {
      expect(escapeSteps(ms)).toBeGreaterThanOrEqual(lastS0 - 1e-9);
      expect(starSteps(ms)).toBeGreaterThanOrEqual(lastS1 - 1e-9);
      lastS0 = escapeSteps(ms);
      lastS1 = starSteps(ms);
    }
    expect(Object.keys(movingAt(STILL_MS)).sort()).toEqual(['balance', 'escape', 'fork', 'jumper', 'lever', 'pins', 's0-hand', 's1-hand', 'star', 'third']);
  });
});

describe('HelixClockwork', () => {
  it('draws the still pose at 7 milliseconds: the S0 hand on its seventh division, the lit S1 hand on its first mark', () => {
    render(<HelixClockwork />);
    expect(screen.getByText("Helix 02's controller takes five steps for every joint target")).toBeInTheDocument();
    const drawing = screen.getByTestId('clockwork-drawing');
    expect(drawing).toHaveAttribute('data-steps', '7');
    expect(drawing).toHaveAttribute('data-targets', '1');
    expect(screen.getByTestId('clockwork-s0-hand')).toHaveAttribute('data-degrees', '126');
    expect(screen.getByTestId('clockwork-s1-hand')).toHaveAttribute('data-degrees', '90');
    const stage = screen.getByTestId('clockwork-stage-frame');
    expect(stage.querySelector('[data-readout]')).toHaveTextContent('7 milliseconds · 7 control steps · 1 new joint target');
    expect(stage).toHaveTextContent(/Schematic/);
    // No words in the drawing, and exactly one lit part: the joint-target hand.
    const svg = drawing.querySelector('svg')!;
    expect(svg.querySelectorAll('text')).toHaveLength(0);
    const lit = [...svg.querySelectorAll('[data-tone="lit"]')];
    expect(lit).toHaveLength(1);
    expect(lit[0].closest('[data-testid="clockwork-s1-hand"]')).not.toBeNull();
    expect(svg.getAttribute('aria-label')).toMatch(/1,000 times a second/);
  });

  it('describes the drawing with the method paragraph that explains the clock movement', () => {
    render(<HelixClockwork />);
    const svg = screen.getByTestId('clockwork-drawing').querySelector('svg')!;
    expect(document.getElementById(svg.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      /^The drawing is a clock movement doing the same counting\./,
    );
  });

  it('moves both hands from the slider, in words for assistive technology', () => {
    render(<HelixClockwork />);
    const slider = screen.getByRole('slider', { name: /time on the clock/i });
    fireEvent.change(slider, { target: { value: '15' } });
    expect(slider).toHaveAttribute('aria-valuetext', '15 milliseconds: 15 control steps and 3 new joint targets');
    expect(screen.getByTestId('clockwork-s1-hand')).toHaveAttribute('data-degrees', '270');
    expect(screen.getByTestId('clockwork-s0-hand')).toHaveAttribute('data-degrees', '270');
    fireEvent.change(slider, { target: { value: '14' } });
    expect(screen.getByTestId('clockwork-s1-hand')).toHaveAttribute('data-degrees', '180');
    expect(screen.getByTestId('clockwork-s0-hand')).toHaveAttribute('data-degrees', '252');
  });

  it('runs the clock only when asked', () => {
    render(<HelixClockwork />);
    const run = screen.getByTestId('clockwork-run');
    // A secondary action carries no pressed state: its label says what it does next.
    expect(run).not.toHaveAttribute('aria-pressed');
    expect(run).toHaveTextContent('Run the clock');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Stop the clock');
    expect(run).not.toHaveAttribute('aria-pressed');
    fireEvent.click(run);
    expect(run).toHaveTextContent('Run the clock');
  });

  it('server-renders the still pose it hydrates', () => {
    const html = renderToString(<HelixClockwork />);
    expect(html).toContain('data-figure-frame="helix-clockwork"');
    expect(html).toContain('7 milliseconds · 7 control steps · 1 new joint target');
  });
});
