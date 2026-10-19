import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { JamOverhead, JAM_OVERHEAD_SCENE, jamOverheadFrame } from '@/components/motion/scenes/jam-overhead';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import {
  LEVELS,
  armTurn,
  chartTurn,
  hourLayout,
  picksBy,
  stateAt,
  timerAngle,
  totalsOf,
  traceOf,
} from '@/components/iso/figures/jam-recorder-desk';
import { computeEconomics, DEFAULT_INPUTS } from '@/lib/deployment-economics';

const HOUR = { cycleTimeSeconds: 6, successRatePercent: 99, uptimePercent: 95 };
const QUICK = computeEconomics({ ...DEFAULT_INPUTS, successRatePercent: 99, jamClearSeconds: 15 });
const SLOW = computeEconomics({ ...DEFAULT_INPUTS, successRatePercent: 99, jamClearSeconds: 300 });
const SPANS = beatSpans(JAM_OVERHEAD_SCENE.beats);

describe('jam overhead recorder model', () => {
  it('lays each hour out so the inked spans add up to the calculator time split', () => {
    for (const [fix, outputs] of [[15, QUICK], [300, SLOW]] as const) {
      const totals = totalsOf(hourLayout({ ...HOUR, jamClearSeconds: fix }));
      expect(totals.picking).toBeCloseTo(outputs.timeBreakdown.productive, 6);
      expect(totals.clearing).toBeCloseTo(outputs.timeBreakdown.jamClearing, 6);
      expect(totals.downtime).toBeCloseTo(outputs.timeBreakdown.downtime, 6);
      expect(totals.picking + totals.clearing + totals.downtime).toBeCloseTo(3600, 6);
    }
    // 15-second fixes take 1.4 minutes of the hour, 5-minute fixes 19.
    expect(QUICK.timeBreakdown.jamClearing / 60).toBeCloseTo(1.39, 2);
    expect(SLOW.timeBreakdown.jamClearing / 60).toBe(19);
  });

  it('puts one fix after every hundred good picks, the downtime last', () => {
    const slow = hourLayout({ ...HOUR, jamClearSeconds: 300 });
    expect(slow.map((segment) => segment.state)).toEqual([
      'picking', 'clearing', 'picking', 'clearing', 'picking', 'clearing', 'picking', 'clearing', 'downtime',
    ]);
    expect(slow[0].to - slow[0].from).toBeCloseTo(600, 6);
    expect(slow[1].to - slow[1].from).toBeCloseTo(300, 6);
    expect(slow.at(-1)).toEqual({ state: 'downtime', from: 3420, to: 3600 });
  });

  it('counts the good picks the calculator gives for each hour', () => {
    expect(picksBy(hourLayout({ ...HOUR, jamClearSeconds: 15 }), 3600, 6)).toBe(Math.floor(QUICK.netPicksPerHour));
    expect(picksBy(hourLayout({ ...HOUR, jamClearSeconds: 300 }), 3600, 6)).toBe(Math.floor(SLOW.netPicksPerHour));
    expect(Math.floor(QUICK.netPicksPerHour)).toBe(556);
    expect(Math.floor(SLOW.netPicksPerHour)).toBe(380);
    expect(picksBy(hourLayout({ ...HOUR, jamClearSeconds: 300 }), 600, 6)).toBe(100);
  });

  it('turns the paper once an hour and swings the pen to the ring for each state', () => {
    expect(chartTurn(0)).toBe(0);
    expect(chartTurn(1800)).toBe(180);
    expect(chartTurn(3600)).toBe(360);
    const slow = hourLayout({ ...HOUR, jamClearSeconds: 300 });
    expect(stateAt(slow, 100)).toBe('picking');
    expect(stateAt(slow, 700)).toBe('clearing');
    expect(stateAt(slow, 3500)).toBe('downtime');
    expect(armTurn(LEVELS.picking)).toBe(0);
    expect(armTurn(LEVELS.clearing)).not.toBe(0);
    // The jam timer's scale runs 0 to 5 minutes over 270 degrees.
    expect(timerAngle(300) - timerAngle(0)).toBe(270);
    expect(timerAngle(15)).toBeCloseTo(-135 + 13.5, 6);
  });

  it('inks one path per state, with nothing before the hour starts', () => {
    const slow = hourLayout({ ...HOUR, jamClearSeconds: 300 });
    expect(traceOf(slow, 0)).toEqual({ picking: '', clearing: '', downtime: '' });
    const done = traceOf(slow, 3600);
    expect(done.picking.match(/M/g)).toHaveLength(4);
    expect(done.clearing.match(/M/g)).toHaveLength(4);
    expect(done.downtime.match(/M/g)).toHaveLength(1);
  });
});

describe('jam overhead scene timeline', () => {
  it('runs the quick hour in the first beat, turns the slow timer, then runs the slow hour', () => {
    expect(jamOverheadFrame(SPANS[0].start).quickHour).toBe(0);
    expect(jamOverheadFrame(SPANS[0].end).quickHour).toBe(3600);
    const turned = SPANS[1].start + 0.25 * SPANS[1].duration;
    expect(jamOverheadFrame(turned).jamClearSeconds).toBe(300);
    expect(jamOverheadFrame(turned).slowHour).toBe(0);
    expect(jamOverheadFrame(SPANS[1].end).slowHour).toBe(3600);
    expect(jamOverheadFrame(SPANS[1].end).outputs).toEqual(SLOW);
  });
});

describe('JamOverhead stage', () => {
  it('draws the poster as two finished hours, the slow pen the one lit part', () => {
    const { container } = render(<JamOverhead />);
    const stage = container.querySelector('[data-motion-stage] svg')!;
    expect(stage).not.toBeNull();
    // No words in the drawing.
    expect(stage.querySelectorAll('text')).toHaveLength(0);
    // Both recorders carry the three classified marks in their roles.
    for (const cell of ['quick', 'slow']) {
      const recorder = stage.querySelector(`[data-recorder="${cell}"]`)!;
      expect(recorder.querySelector('[data-scene-mark="productive-time"]')!.getAttribute('stroke')).toBe('var(--role-value-stage)');
      for (const mark of ['clearing-time', 'downtime']) {
        expect(recorder.querySelector(`[data-scene-mark="${mark}"]`)!.getAttribute('stroke')).toBe('var(--role-constraint-stage)');
      }
    }
    // The poster is the end of both hours: each chart's ink is the model's whole hour.
    const slowInk = traceOf(hourLayout({ ...HOUR, jamClearSeconds: 300 }), 3600);
    const slow = stage.querySelector('[data-recorder="slow"]')!;
    expect(slow.querySelector('[data-scene-mark="clearing-time"]')!.getAttribute('d')).toBe(slowInk.clearing);
    expect(slow.querySelector('[data-scene-mark="productive-time"]')!.getAttribute('d')).toBe(slowInk.picking);
    const lit = [...stage.querySelectorAll('[data-tone="lit"]')];
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.every((node) => node.closest('[data-recorder="slow"]'))).toBe(true);
    // The recap's heavier jam ink is fully drawn on the poster.
    const heavy = [...slow.querySelectorAll('[data-scene-mark="clearing-time"]')].find((node) => node.getAttribute('opacity') !== null)!;
    expect(heavy.getAttribute('opacity')).toBe('1');
    // The final beat's caption and the readout's payback numbers.
    expect(screen.getByTestId('motion-caption')).toHaveTextContent(JAM_OVERHEAD_SCENE.beats[3].caption);
    expect(container.textContent).toContain('Pays for itself in 11.8 months with quick fixes, 17.3 with slow ones');
  });

  it('server-renders the same poster it hydrates', () => {
    expect(posterTime(SPANS)).toBe(SPANS[3].end);
    const html = renderToString(<JamOverhead />);
    expect(html).toContain('data-motion-scene="jam-overhead"');
    expect(html).toContain('data-recorder="slow"');
    expect(html).not.toContain('<text');
  });

  it('gives the flagship a stable anchor that clears the sticky header', () => {
    const html = renderToString(<JamOverhead />);
    const root = html.match(/<div[^>]*data-motion-scene="jam-overhead"[^>]*>/)?.[0] ?? '';
    expect(root).toContain('id="jam-overhead"');
    expect(root).toContain('scroll-mt-16');
    expect([...html.matchAll(/\bid="jam-overhead"/g)]).toHaveLength(1);
  });
});
