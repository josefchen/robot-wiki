import { describe, expect, it } from 'vitest';
import {
  CAM_BASE,
  CAM_NOSE,
  EDIT_MAX,
  HOLE_GAP,
  HOLE_X,
  LEARNED_EDIT,
  LIFT_RANGE,
  MODES,
  PEG_OFFSET,
  bestNoise,
  camOutline,
  inHole,
  insideRepertoire,
  liftAt,
  pegAt,
  readoutFor,
  runAt,
  runSeconds,
  settledPose,
  switchAt,
  switchSeconds,
  type ModeId,
  type Pose,
} from '@/lib/noise-or-edit';
import { PARTS, camParts, movingAt, pegParts, type LivePart } from '@/components/iso/figures/cam-follower-bench';
import { symbolHits } from '@/lib/figure-main-view';

const settings: number[] = [];
for (let deg = 0; deg < 360; deg += 0.5) settings.push(deg);

describe('the noise-or-edit model', () => {
  it('draws a convex cam whose reach toward the follower runs exactly between its lowest and highest lift', () => {
    const outline = camOutline(1);
    for (let i = 0; i < outline.length; i++) {
      const [a, b, c] = [outline[i]!, outline[(i + 1) % outline.length]!, outline[(i + 2) % outline.length]!];
      expect((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])).toBeGreaterThan(0);
    }
    expect(LIFT_RANGE).toEqual([CAM_BASE, CAM_BASE + CAM_NOSE]);
    expect(liftAt(0)).toBeCloseTo(LIFT_RANGE[1], 9);
    expect(liftAt(180)).toBeCloseTo(LIFT_RANGE[0], 3);
    for (const deg of settings) {
      expect(liftAt(deg)).toBeGreaterThanOrEqual(LIFT_RANGE[0] - 1e-6);
      expect(liftAt(deg)).toBeLessThanOrEqual(LIFT_RANGE[1] + 1e-9);
    }
  });

  it('lands the peg on the strip for every noise, and never in the hole: steering the noise has a ceiling', () => {
    for (const deg of settings) {
      const x = pegAt(deg, 0);
      expect(insideRepertoire(x)).toBe(true);
      expect(inHole(x)).toBe(false);
    }
    // The best the search can do is the cam's nose at the follower, which still lands short by the gap.
    expect(bestNoise()).toBe(0);
    expect(HOLE_X - pegAt(bestNoise(), 0)).toBeCloseTo(HOLE_GAP, 9);
    expect(HOLE_X).toBeGreaterThan(LIFT_RANGE[1] + PEG_OFFSET);
  });

  it('reaches the hole with a small edit, inside the edit’s bounded travel', () => {
    expect(LEARNED_EDIT).toBeLessThanOrEqual(EDIT_MAX);
    expect(LEARNED_EDIT).toBeLessThan(LIFT_RANGE[1] - LIFT_RANGE[0]);
    expect(inHole(pegAt(bestNoise(), LEARNED_EDIT))).toBe(true);
    expect(insideRepertoire(pegAt(bestNoise(), LEARNED_EDIT))).toBe(false);
    // The edit is bounded: asking for more than its travel moves the peg no further.
    expect(pegAt(0, 100)).toBe(pegAt(0, EDIT_MAX));
    expect(inHole(pegAt(settledPose('noise').deg, settledPose('noise').edit))).toBe(false);
    expect(inHole(pegAt(settledPose('edit').deg, settledPose('edit').edit))).toBe(true);
  });

  it('runs the search once round the dial, edits only when an edit is allowed, and never jumps', () => {
    for (const mode of MODES.map((m) => m.id)) {
      for (const from of [settledPose('noise'), settledPose('edit')]) {
        const seconds = runSeconds(mode);
        let last = runAt(mode, 0, from);
        expect(last.deg).toBeCloseTo(from.deg, 9);
        let turned = 0;
        let edited = 0;
        for (let k = 1; k <= 4000; k++) {
          const pose = runAt(mode, (k / 4000) * (seconds + 0.2), from);
          // The dial's angle, compared round the circle: 360 at the end of the turn is the same place as 0.
          expect(Math.abs((((pose.deg - last.deg) % 360) + 540) % 360 - 180)).toBeLessThan(1);
          expect(Math.abs(pose.edit - last.edit)).toBeLessThan(0.05);
          expect(Math.abs(pose.drop - last.drop)).toBeLessThan(0.02);
          if (pose.phase === 'search') {
            turned = Math.max(turned, pose.deg);
            expect(pose.drop).toBe(0);
            expect(insideRepertoire(pegAt(pose.deg, pose.edit))).toBe(true);
          }
          if (pose.phase === 'edit') edited = Math.max(edited, pose.edit);
          last = pose;
        }
        expect(turned).toBeGreaterThan(359);
        expect(edited > 0).toBe(mode === 'edit');
        expect(runAt(mode, seconds + 1, from)).toEqual(settledPose(mode));
      }
    }
  });

  it('switches from one mode to the other by raising the peg, turning the edit screw and lowering it, with no jump', () => {
    for (const [from, to] of [['noise', 'edit'], ['edit', 'noise']] as Array<[ModeId, ModeId]>) {
      let last: Pose = switchAt(to, 0, settledPose(from));
      expect(last.edit).toBe(settledPose(from).edit);
      for (let k = 1; k <= 1000; k++) {
        const pose = switchAt(to, (k / 1000) * (switchSeconds + 0.1), settledPose(from));
        expect(Math.abs(pose.edit - last.edit)).toBeLessThan(0.06);
        expect(Math.abs(pose.drop - last.drop)).toBeLessThan(0.02);
        last = pose;
      }
      expect(last).toEqual(settledPose(to));
    }
  });

  it('reads every moment in plain words that fit one line on a phone', () => {
    expect(readoutFor('noise', settledPose('noise'))).toBe('Steered noise only · peg lands short');
    expect(readoutFor('edit', settledPose('edit'))).toBe('Noise and an edit · peg in the hole');
    const seen = new Set<string>();
    for (const mode of MODES.map((m) => m.id)) {
      for (let k = 0; k <= 400; k++) seen.add(readoutFor(mode, runAt(mode, (k / 400) * runSeconds(mode))));
      for (let k = 0; k <= 100; k++) seen.add(readoutFor(mode, switchAt(mode, (k / 100) * switchSeconds, settledPose(mode === 'edit' ? 'noise' : 'edit'))));
    }
    expect(seen.size).toBeGreaterThanOrEqual(6);
    for (const text of seen) {
      expect(text.length).toBeLessThanOrEqual(40);
      expect(symbolHits(text)).toEqual([]);
    }
  });
});

describe('the cam-and-follower bench drawing', () => {
  const lit = (parts: LivePart[]) => parts.filter((p) => p.kind === 'solid' && p.lit);
  const flatX = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 0);

  it('lights one part, the peg, and keeps the same parts in every pose', () => {
    expect(PARTS.some((p) => p.kind === 'solid' && p.lit)).toBe(false);
    const counts = (pose: { deg: number; edit: number; drop: number; locked: boolean }) =>
      Object.fromEntries(Object.entries(movingAt(pose)).map(([slot, parts]) => [slot, parts.length]));
    const still = counts({ deg: 0, edit: 0, drop: 1, locked: true });
    for (const deg of [0, 45, 90, 180, 270]) {
      for (const drop of [0, 0.5]) {
        const pose = { deg, edit: 0, drop, locked: true };
        const live = movingAt(pose);
        const litParts = Object.values(live).flatMap(lit);
        expect(litParts.length).toBeGreaterThanOrEqual(1);
        expect(litParts.every((p) => p.kind === 'solid' && p.name === 'peg')).toBe(true);
        expect(counts(pose)).toEqual(still);
      }
    }
  });

  it('turns the drawn cam with the dial: its silhouette reaches farthest right when its nose faces the follower', () => {
    const reach = (deg: number) => {
      const cam = camParts(deg).find((p) => p.kind === 'solid' && p.name === 'cam');
      if (!cam || cam.kind !== 'solid') throw new Error('no cam');
      return Math.max(...flatX(cam.paths.outline));
    };
    expect(reach(0)).toBeGreaterThan(reach(90));
    expect(reach(0)).toBeGreaterThan(reach(180));
  });

  it('draws the peg down in the hole only when the edit puts it there', () => {
    const tipOf = (parts: LivePart[]) => {
      const peg = parts.filter((p) => p.kind === 'solid' && p.name === 'peg');
      return peg.length;
    };
    // Short of the hole the peg ends in its chamfered tip; in the hole the bush's rim hides the tip.
    expect(tipOf(pegParts(pegAt(0, 0), 1, false))).toBe(2);
    expect(tipOf(pegParts(pegAt(0, LEARNED_EDIT), 1, true))).toBe(1);
  });
});
