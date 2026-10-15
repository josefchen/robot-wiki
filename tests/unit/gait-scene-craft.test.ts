import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  BEAT_TIMING,
  GAIT_SUPPORT_SCENE,
  GaitSupport,
  GaitSupportStage,
  LINE_UP,
  PAPER_GAP,
  RECAP_INDEX,
  SETTLE_PHASE,
  STRIDES_PER_BEAT,
  footMark,
  gaitSupportFrame,
  recapWords,
} from '@/components/motion/scenes/gait-support';
import { StaticTimeProvider } from '@/components/motion/scene-context';
import { beatSpans, posterTime } from '@/components/motion/timeline';
import {
  FOOT_ORDER,
  HEIGHT,
  PAPER_PER_STRIDE,
  PAPER_WINDOW,
  STRIDE,
  WIDTH,
  gaitPose,
} from '@/components/iso/figures/gait-treadmill';
import { GAITS, GAIT_ORDER, minStanceCount, stanceLegs } from '@/lib/gait';
import { MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

const SPANS = beatSpans(GAIT_SUPPORT_SCENE.beats);
const GAIT_SPANS = SPANS.slice(0, RECAP_INDEX);
const END = SPANS[SPANS.length - 1].end;
const at = (beat: number, k: number) => SPANS[beat].start + SPANS[beat].duration * k;
const SECTION = PAPER_GAP + STRIDES_PER_BEAT * PAPER_PER_STRIDE;
/** Ink laid in one lane for one gait, in paper units. */
const inkLength = (frame: ReturnType<typeof gaitSupportFrame>, gait: (typeof LINE_UP)[number], leg: (typeof FOOT_ORDER)[number]) =>
  frame.ink[gait][leg].reduce((sum, [a, b]) => sum + (b - a), 0);
/** Everything the stage draws at time t, for comparing two moments. */
const picture = (t: number) => {
  const frame = gaitSupportFrame(t);
  return { pose: frame.pose, paper: frame.paper, belt: frame.belt, needle: frame.needle, ink: frame.ink };
};
const stage = (t: number) =>
  renderToStaticMarkup(createElement(StaticTimeProvider, { value: t }, createElement(GaitSupportStage)));

describe('gait-support flagship scene craft', () => {
  it('meets one new gait per beat, then a recap that ends on the poster', () => {
    // The bound also stops mid-leap with no feet down, so beside the hop it hid the trend: the robot leaves it out.
    expect(LINE_UP).toEqual(['walk', 'trot', 'pronk']);
    expect(GAIT_SUPPORT_SCENE.beats.map((beat) => beat.id)).toEqual([...LINE_UP, 'recap']);
    expect(RECAP_INDEX).toBe(LINE_UP.length);
    expect(posterTime(SPANS)).toBe(END);
    SPANS.forEach((span, index) => {
      expect(gaitSupportFrame(span.end).visibleGaits).toEqual(LINE_UP.slice(0, index + 1));
    });
    expect(gaitSupportFrame(END).recap).toBe(true);
  });

  it('changes gait in the first tenth of a beat, strides to 85% and holds its settle moment at every beat end', () => {
    GAIT_SPANS.forEach((_, index) => {
      const id = LINE_UP[index];
      expect(gaitSupportFrame(at(index, 0.5)).phase, id).not.toBe(SETTLE_PHASE[id]);
      expect(gaitSupportFrame(at(index, 1)).phase, id).toBe(SETTLE_PHASE[id]);
      // From the end of its strides to the beat's end the robot stands still.
      expect(picture(at(index, BEAT_TIMING.strideEnd + 0.01)).pose).toEqual(picture(at(index, 1)).pose);
    });
    // Changing gait blends from the last gait's settle pose to the new gait's.
    const before = gaitPose('walk', SETTLE_PHASE.walk);
    const after = gaitPose('trot', SETTLE_PHASE.trot);
    const mid = gaitSupportFrame(at(1, BEAT_TIMING.change / 2)).pose;
    mid.feet.forEach((foot, index) => {
      const lo = Math.min(before.feet[index].dx, after.feet[index].dx) - 1e-9;
      const hi = Math.max(before.feet[index].dx, after.feet[index].dx) + 1e-9;
      expect(foot.dx).toBeGreaterThanOrEqual(lo);
      expect(foot.dx).toBeLessThanOrEqual(hi);
    });
    expect(gaitSupportFrame(at(1, BEAT_TIMING.change)).pose).toEqual(gaitPose('trot', gaitSupportFrame(at(1, BEAT_TIMING.change)).phase));
  });

  it('keeps every drawn line inside the stage margin on the narrowest full-size stage, at every 100 ms', () => {
    const margin = (4 * WIDTH) / MOTION_STAGE_TYPE.fullSizeMinStagePx;
    for (let t = 0; t <= END; t += 100) {
      // An empty slot of a live solid is written "M0 0" and paints nothing.
      const coordinates = [...stage(t).matchAll(/\bd="([^"]+)"/g)].filter((m) => m[1] !== 'M0 0').flatMap((m) => [...m[1].matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)].map((p) => [Number(p[1]), Number(p[2])]));
      expect(coordinates.length).toBeGreaterThan(100);
      const xs = coordinates.map(([x]) => x);
      const ys = coordinates.map(([, y]) => y);
      expect(Math.min(...xs), `t ${t}`).toBeGreaterThanOrEqual(margin - 0.5);
      expect(Math.max(...xs), `t ${t}`).toBeLessThanOrEqual(WIDTH - margin + 0.5);
      expect(Math.min(...ys), `t ${t}`).toBeGreaterThanOrEqual(margin - 0.5);
      expect(Math.max(...ys), `t ${t}`).toBeLessThanOrEqual(HEIGHT - margin + 0.5);
    }
  }, 60_000);

  it('inks each lane only while its foot is on the ground: a duty factor of the paper fed', () => {
    for (const gait of LINE_UP) {
      const frame = gaitSupportFrame(END);
      for (const leg of FOOT_ORDER) {
        // Two whole strides, so each foot is down exactly its duty factor of them.
        expect(inkLength(frame, gait, leg), `${gait} ${leg}`).toBeCloseTo(GAITS[gait].dutyFactor * STRIDES_PER_BEAT * PAPER_PER_STRIDE, 6);
      }
    }
    // Mid-stride, the ink laid so far follows the pose: a foot in the air adds none.
    const index = 1;
    const t0 = at(index, 0.5);
    const t1 = at(index, 0.5) + 10;
    const a = gaitSupportFrame(t0);
    const b = gaitSupportFrame(t1);
    for (const leg of FOOT_ORDER) {
      const grew = inkLength(b, 'trot', leg) - inkLength(a, 'trot', leg);
      const down = a.pose.feet[FOOT_ORDER.indexOf(leg)].down && b.pose.feet[FOOT_ORDER.indexOf(leg)].down;
      const up = !a.pose.feet[FOOT_ORDER.indexOf(leg)].down && !b.pose.feet[FOOT_ORDER.indexOf(leg)].down;
      if (down) expect(grew, leg).toBeGreaterThan(0);
      if (up) expect(grew, leg).toBe(0);
    }
  });

  it('settles on three, two and no feet down, with the leaps off the ground and the counter reading them', () => {
    const down = LINE_UP.map((id) => stanceLegs(GAITS[id], SETTLE_PHASE[id]).length);
    expect(down).toEqual([3, 2, 0]);
    // The bound's settle moment stays defined for the method note, which still lists it.
    expect(stanceLegs(GAITS.bound, SETTLE_PHASE.bound)).toHaveLength(0);
    for (const id of GAIT_ORDER) {
      const pose = gaitPose(id, SETTLE_PHASE[id]);
      expect(pose.feet.filter((foot) => foot.down)).toHaveLength(stanceLegs(GAITS[id], SETTLE_PHASE[id]).length);
      const lowest = Math.min(...pose.feet.map((foot) => foot.lift));
      if (id === 'bound' || id === 'pronk') {
        expect(lowest, id).toBeGreaterThan(0);
        expect(pose.rise, id).toBeGreaterThan(0);
      } else expect(lowest, id).toBe(0);
    }
    // The stance counter's needle reads the feet down at every gait's beat end.
    GAIT_SPANS.forEach((span, index) => expect(gaitSupportFrame(span.end).needle, LINE_UP[index]).toBe(down[index]));
  });

  it('feeds paper only while the robot strides, a blank gap between gaits, and the belt carries a foot back at its own speed', () => {
    GAIT_SPANS.forEach((span, index) => {
      expect(gaitSupportFrame(span.start).paper, `${span.beat.id} start`).toBeCloseTo(index * SECTION, 6);
      expect(gaitSupportFrame(span.end).paper, `${span.beat.id} end`).toBeCloseTo((index + 1) * SECTION, 6);
      // The gap is fed while the robot changes gait, before any ink.
      expect(gaitSupportFrame(at(index, BEAT_TIMING.change)).paper).toBeCloseTo(index * SECTION + PAPER_GAP, 6);
      for (const leg of FOOT_ORDER) expect(gaitSupportFrame(at(index, BEAT_TIMING.change)).ink[LINE_UP[index]][leg]).toEqual([]);
    });
    // Everything written fits the paper's window, so the recap shows all three gaits.
    expect(LINE_UP.length * SECTION).toBeLessThanOrEqual(PAPER_WINDOW);
    // A foot on the ground moves back a stride over its stance; the belt moves with it.
    for (const [index, id] of LINE_UP.entries()) {
      const travelled = gaitSupportFrame(SPANS[index].end).belt - gaitSupportFrame(SPANS[index].start).belt;
      expect(travelled, id).toBeCloseTo((STRIDES_PER_BEAT * STRIDE) / GAITS[id].dutyFactor, 2);
    }
  });

  it('holds the whole chart still through the recap: three gaits side by side on the paper', () => {
    const held = picture(SPANS[RECAP_INDEX].start + 1);
    for (const k of [0.3, 0.7, 1]) expect(picture(at(RECAP_INDEX, k))).toEqual(held);
    for (const gait of LINE_UP) for (const leg of FOOT_ORDER) expect(held.ink[gait][leg].length, `${gait} ${leg}`).toBeGreaterThan(0);
    // Earlier gaits sit further along the paper: walk, then trot, then hop toward the pens.
    const lastInk = (gait: (typeof LINE_UP)[number]) => Math.max(...FOOT_ORDER.flatMap((leg) => held.ink[gait][leg].map(([, b]) => b)));
    expect(lastInk('walk')).toBeLessThan(Math.min(...FOOT_ORDER.flatMap((leg) => held.ink.trot[leg].map(([a]) => a))));
    expect(lastInk('trot')).toBeLessThan(Math.min(...FOOT_ORDER.flatMap((leg) => held.ink.pronk[leg].map(([a]) => a))));
  });

  it('draws no words, one ink mark per gait and foot in the stance role, shown from its own beat on', () => {
    for (const t of [0, ...SPANS.map((span) => span.end)]) {
      const html = stage(t);
      expect(html, `t ${t}`).not.toMatch(/<(text|title|desc|foreignObject)\b/);
      const visibleText = html.replace(/<[^>]+>/g, '').trim();
      expect(visibleText, `t ${t}`).toBe('');
    }
    const poster = stage(END);
    for (const gait of LINE_UP) {
      for (const leg of FOOT_ORDER) {
        const mark = footMark(gait, leg);
        const element = poster.match(new RegExp(`<path[^>]*data-scene-mark="${mark}"[^>]*>`))?.[0] ?? '';
        expect(element, mark).toContain('fill="var(--role-state-stage)"');
        expect(element, mark).toContain('stroke="none"');
        expect(element, mark).toContain('opacity="1"');
      }
    }
    // Before its beat a gait's marks are hidden, so the roles evidence records each from its own beat.
    const first = stage(SPANS[0].end);
    for (const leg of FOOT_ORDER) {
      expect(first.match(new RegExp(`<path[^>]*data-scene-mark="${footMark('trot', leg)}"[^>]*>`))?.[0], leg).toContain('opacity="0"');
      expect(first.match(new RegExp(`<path[^>]*data-scene-mark="${footMark('walk', leg)}"[^>]*>`))?.[0], leg).toContain('opacity="1"');
    }
    // The mark names keep the scene's foot order: 0 right hind, 1 left hind, 2 right front, 3 left front.
    expect(FOOT_ORDER).toEqual(['rh', 'lh', 'rf', 'lf']);
    expect(footMark('walk', 'rh')).toBe('walk-foot-0');
  });

  it('reads out what tells the gaits apart on the poster, and keeps the fewest feet down one click away', () => {
    expect(recapWords()).toBe('Walk lifts one foot at a time, trot a diagonal pair, hop all four at once.');
    const html = renderToStaticMarkup(createElement(GaitSupport)).replaceAll('<!-- -->', '');
    expect(html).toContain(recapWords());
    // The bound left the robot's run but keeps its numbers and its description one click away.
    expect(html).toContain('The robot leaves out the bound');
    const fewest = GAIT_ORDER.map((id) => `${id === 'pronk' ? 'hop' : id} ${minStanceCount(GAITS[id])}`).join(', ');
    expect(fewest).toBe('walk 3, trot 2, bound 0, hop 0');
    expect(html).toContain(`The fewest feet down at any moment of the stride: ${fewest}.`);
  });

  it('gives the scene a stable anchor that clears the sticky header', () => {
    const html = renderToStaticMarkup(createElement(GaitSupport));
    const root = html.match(/<div[^>]*data-motion-scene="gait-support"[^>]*>/)?.[0] ?? '';
    expect(root).toContain('id="gait-support"');
    expect(root).toContain('scroll-mt-16');
    expect([...html.matchAll(/\bid="gait-support"/g)]).toHaveLength(1);
  });
});
