import { describe, expect, it } from 'vitest';
import {
  BOOM_FOOT,
  BOOM_LENGTH,
  DIAL_MAX,
  STICK_LENGTH,
  TELESCOPE_MAX,
  TIP_FROM_PIN,
  armParts,
  boardMarks,
  cylindersFor,
  dialAngle,
  poseFor,
} from '../../components/iso/figures/practice-excavator';
import {
  EARLIER_MINUTES,
  ENSEMBLE_MEMBERS,
  LOOK_AHEAD,
  MACHINE_TONNES,
  PAPER_CHECKPOINTS,
  PRACTICE,
  STILL_PRACTICE,
  guessesAt,
  normalAt,
  practiceOf,
  referenceAt,
  tracedAt,
  wander,
} from '../../lib/excavator-practice';

const gap = (a: readonly [number, number], b: readonly [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const samples = Array.from({ length: 101 }, (_, k) => k / 100);

describe('the excavator practice model', () => {
  it('holds the paper\'s numbers: an 11.5-ton machine, five models, 100 to 150 minutes before, and the four checkpoints', () => {
    expect(MACHINE_TONNES).toBe(11.5);
    expect(ENSEMBLE_MEMBERS).toBe(5);
    expect(EARLIER_MINUTES).toEqual({ from: 100, to: 150 });
    expect(PRACTICE.map((p) => p.minutes)).toEqual([3, 10, 20, 40]);
    expect(STILL_PRACTICE).toBe('twenty');
    // At 20 minutes the mean tracking error (2.7 cm) is within the earlier controllers' range (2.8 to 4.5 cm).
    expect(PAPER_CHECKPOINTS.twentyMinuteTrackingErrorCm).toBeLessThanOrEqual(PAPER_CHECKPOINTS.earlierTrackingErrorCm.afterHundred);
    expect(practiceOf('twenty').reads).toBe('20 minutes · matches earlier controllers');
    // At 40 minutes every objective's mean path error is under a centimetre.
    for (const cm of PAPER_CHECKPOINTS.fortyMinuteContourErrorCm) expect(cm).toBeLessThan(1);
    expect(practiceOf('forty').reads).toBe('40 minutes · under 1 cm off on average');
    expect(practiceOf('three').reads).toBe('3 minutes · large misses');
    expect(practiceOf('ten').reads).toBe('10 minutes · closer to the path');
    // The drawn misses at 20 and 40 minutes are the paper's mean errors.
    expect(practiceOf('twenty').missM).toBeCloseTo(PAPER_CHECKPOINTS.twentyMinuteTrackingErrorCm / 100, 6);
    expect(practiceOf('forty').missM).toBeCloseTo(PAPER_CHECKPOINTS.fortyMinuteContourErrorCm[0] / 100, 6);
  });

  it('misses and fans out less with every step of practice', () => {
    for (let k = 1; k < PRACTICE.length; k++) {
      expect(PRACTICE[k]!.missM).toBeLessThan(PRACTICE[k - 1]!.missM);
      expect(PRACTICE[k]!.spreadM).toBeLessThan(PRACTICE[k - 1]!.spreadM);
    }
  });

  it('starts on the path and never strays further than its miss', () => {
    for (const practice of PRACTICE) {
      expect(gap(tracedAt(practice, 0), referenceAt(0))).toBeLessThan(1e-9);
      for (const s of samples) {
        expect(Math.abs(wander(s))).toBeLessThanOrEqual(1);
        const off = gap(tracedAt(practice, s), referenceAt(s));
        expect(off).toBeLessThanOrEqual(practice.missM + 1e-9);
        // The miss is across the path, along its normal.
        const n = normalAt(s);
        expect(Math.hypot(n[0], n[1])).toBeCloseTo(1, 9);
      }
    }
  });

  it('draws five guesses from where the tip is, fanning out by the practice\'s spread', () => {
    for (const practice of PRACTICE) {
      const guesses = guessesAt(practice, 0.4);
      expect(guesses).toHaveLength(ENSEMBLE_MEMBERS);
      const ends = guesses.map((g) => g[g.length - 1]!);
      for (const guess of guesses) expect(guess[0]).toEqual(tracedAt(practice, 0.4));
      const end = referenceAt(0.4 + LOOK_AHEAD);
      const n = normalAt(0.4 + LOOK_AHEAD);
      const offsets = ends.map((p) => (p[0] - end[0]) * n[0] + (p[1] - end[1]) * n[1]);
      const fan = Math.max(...offsets) - Math.min(...offsets);
      expect(fan).toBeGreaterThan(practice.spreadM * 1.5);
      expect(fan).toBeLessThan(practice.spreadM * 2.5);
    }
    // No guesses once the path is done.
    expect(boardMarks(practiceOf('three'), 1).guesses).toHaveLength(0);
  });
});

describe('the excavator\'s arm', () => {
  it('puts the shovel tip exactly where the model says, with the boom and stick at their lengths', () => {
    for (const practice of PRACTICE) {
      for (const s of samples) {
        const tip = tracedAt(practice, s);
        const pose = poseFor(tip);
        expect(gap(pose.boomTip, BOOM_FOOT)).toBeCloseTo(BOOM_LENGTH, 6);
        expect(gap(pose.pin, pose.boomTip)).toBeCloseTo(STICK_LENGTH + pose.extension, 6);
        expect(gap([pose.pin[0] + TIP_FROM_PIN[0], pose.pin[1] + TIP_FROM_PIN[1]], tip)).toBeLessThan(1e-9);
        expect(pose.extension).toBeGreaterThanOrEqual(0);
        expect(pose.extension).toBeLessThanOrEqual(TELESCOPE_MAX);
        // Boom up: the boom tip stays above the line from the foot to the shovel's pin.
        const cross = (pose.pin[0] - BOOM_FOOT[0]) * (pose.boomTip[1] - BOOM_FOOT[1]) - (pose.pin[1] - BOOM_FOOT[1]) * (pose.boomTip[0] - BOOM_FOOT[0]);
        expect(cross).toBeGreaterThan(0);
      }
    }
  });

  it('keeps every cylinder\'s rod inside its barrel and out of its gland, in every pose', () => {
    for (const practice of PRACTICE) {
      for (const s of samples) {
        const cyls = cylindersFor(poseFor(tracedAt(practice, s)));
        for (const cyl of [cyls.boom, cyls.stick, cyls.shovel]) {
          const length = gap(cyl.base, cyl.eye);
          // Longer than the barrel (the rod shows) and shorter than twice it (the rod is still held).
          expect(length).toBeGreaterThan(cyl.barrel + 0.05);
          expect(length).toBeLessThan(2 * cyl.barrel);
        }
      }
    }
  });

  it('builds the same list of arm parts in every pose, so the live code can redraw it in place', () => {
    const names = armParts(tracedAt(practiceOf('twenty'), 0.6)).map((p) => p.name);
    for (const practice of PRACTICE) {
      for (const s of [0, 0.3, 0.7, 1]) expect(armParts(tracedAt(practice, s)).map((p) => p.name)).toEqual(names);
    }
    expect(names.length).toBeGreaterThan(20);
  });

  it('reads 0 to 150 minutes over three quarters of a turn on the trainer\'s dial', () => {
    expect(DIAL_MAX).toBe(EARLIER_MINUTES.to);
    expect(((dialAngle(0) - dialAngle(DIAL_MAX)) * 180) / Math.PI).toBeCloseTo(270, 9);
    expect(dialAngle(20)).toBeGreaterThan(dialAngle(EARLIER_MINUTES.from));
    expect(dialAngle(-5)).toBe(dialAngle(0));
  });
});
