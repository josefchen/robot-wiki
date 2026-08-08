import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAIT,
  DEFAULT_PHASE,
  GAITS,
  GAIT_ORDER,
  LEGS,
  PHASE_STEP,
  footfallOrder,
  formatDuty,
  formatPhase,
  hasFlightPhase,
  inStance,
  legPhase,
  maxStanceCount,
  minStanceCount,
  playbackCadence,
  stanceCount,
  stanceLegs,
  stepPhase,
} from '@/lib/gait';

describe('gait definitions', () => {
  it('ships four canonical gaits in selector order', () => {
    expect(GAIT_ORDER).toEqual(['walk', 'trot', 'bound', 'pronk']);
    for (const id of GAIT_ORDER) {
      expect(GAITS[id].id).toBe(id);
      expect(GAITS[id].dutyFactor).toBeGreaterThan(0);
      expect(GAITS[id].dutyFactor).toBeLessThan(1);
    }
  });

  it('every gait offsets all four legs and every offset is inside the cycle', () => {
    for (const id of GAIT_ORDER) {
      for (const leg of LEGS) {
        const offset = GAITS[id].offsets[leg.id];
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThan(1);
      }
    }
  });

  it('duty factors fall as gaits get more ballistic', () => {
    expect(GAITS.walk.dutyFactor).toBeGreaterThan(GAITS.trot.dutyFactor);
    expect(GAITS.trot.dutyFactor).toBeGreaterThan(GAITS.bound.dutyFactor);
    expect(GAITS.bound.dutyFactor).toBeGreaterThan(GAITS.pronk.dutyFactor);
  });
});

describe('leg phase and stance', () => {
  const trot = GAITS.trot;

  it('leg phase wraps into [0, 1) relative to the strike offset', () => {
    expect(legPhase(trot, 'lf', 0)).toBe(0);
    expect(legPhase(trot, 'lf', 0.25)).toBeCloseTo(0.25, 10);
    // RF strikes halfway through the cycle, so at cycle phase 0.25 it is
    // three quarters through its own stride (late swing).
    expect(legPhase(trot, 'rf', 0.25)).toBeCloseTo(0.75, 10);
    expect(legPhase(trot, 'rf', 0.6)).toBeCloseTo(0.1, 10);
  });

  it('trot holds diagonal pairs in phase: LF with RH, RF with LH', () => {
    // Early in the cycle the LF/RH diagonal is in stance.
    expect(stanceLegs(trot, 0.1)).toEqual(['lf', 'rh']);
    // Just past halfway the other diagonal takes over.
    expect(stanceLegs(trot, 0.6)).toEqual(['rf', 'lh']);
    // The diagonals never mix.
    expect(stanceCount(trot, 0.3)).toBe(2);
  });

  it('walk keeps at least three feet down everywhere in the cycle', () => {
    const walk = GAITS.walk;
    for (let p = 0; p < 1; p += 0.01) {
      expect(stanceCount(walk, p)).toBeGreaterThanOrEqual(3);
    }
  });

  it('walk strikes in lateral sequence: LH, LF, RH, RF', () => {
    expect(footfallOrder(GAITS.walk)).toEqual(['lh', 'lf', 'rh', 'rf']);
  });

  it('bound alternates front and hind pairs with a suspension interval', () => {
    const bound = GAITS.bound;
    expect(stanceLegs(bound, 0.1)).toEqual(['lf', 'rf']);
    expect(stanceLegs(bound, 0.6)).toEqual(['lh', 'rh']);
    // Between hind liftoff and the next front strike nothing touches down.
    expect(stanceCount(bound, 0.47)).toBe(0);
    expect(stanceCount(bound, 0.97)).toBe(0);
  });

  it('pronk is airborne for most of the cycle', () => {
    const pronk = GAITS.pronk;
    expect(stanceCount(pronk, 0.1)).toBe(4);
    expect(stanceCount(pronk, 0.6)).toBe(0);
  });

  it('a foot exactly at its duty factor has lifted off', () => {
    // Leg phase equal to the duty factor is the first moment of swing.
    expect(inStance(GAITS.trot, 'lf', GAITS.trot.dutyFactor)).toBe(false);
    expect(inStance(GAITS.trot, 'lf', GAITS.trot.dutyFactor - 1e-9)).toBe(true);
  });
});

describe('cycle-level stability readouts', () => {
  it('walk and trot never leave the ground; bound and pronk do', () => {
    expect(minStanceCount(GAITS.walk)).toBe(3);
    expect(minStanceCount(GAITS.trot)).toBe(2);
    expect(minStanceCount(GAITS.bound)).toBe(0);
    expect(minStanceCount(GAITS.pronk)).toBe(0);
    expect(hasFlightPhase(GAITS.walk)).toBe(false);
    expect(hasFlightPhase(GAITS.trot)).toBe(false);
    expect(hasFlightPhase(GAITS.bound)).toBe(true);
    expect(hasFlightPhase(GAITS.pronk)).toBe(true);
  });

  it('pronk alone puts all four feet down at once', () => {
    expect(maxStanceCount(GAITS.pronk)).toBe(4);
    expect(maxStanceCount(GAITS.trot)).toBe(2);
    expect(maxStanceCount(GAITS.bound)).toBe(2);
  });
});

describe('phase stepping and formatting', () => {
  it('stepPhase advances and wraps deterministically', () => {
    expect(stepPhase(0, 1)).toBeCloseTo(PHASE_STEP, 10);
    expect(stepPhase(0.95, 1)).toBeCloseTo(0, 10);
    // Off-grid phases snap to the nearest grid point after stepping:
    // 0.02 - 0.05 wraps to 0.97, which snaps back onto the grid at 0.95.
    expect(stepPhase(0.02, -1)).toBeCloseTo(0.95, 10);
    // Repeated stepping stays on the 0.05 grid (no float drift).
    let p = DEFAULT_PHASE;
    for (let i = 0; i < 40; i++) p = stepPhase(p, 1);
    expect(p).toBeCloseTo(0, 10);
    expect(Number.isInteger(p / PHASE_STEP)).toBe(true);
  });

  it('formats phase and duty factor for the readouts', () => {
    expect(formatPhase(0)).toBe('0%');
    expect(formatPhase(0.35)).toBe('35%');
    expect(formatPhase(0.996)).toBe('100%');
    expect(formatDuty(0.75)).toBe('0.75');
    expect(formatDuty(0.5)).toBe('0.50');
  });

  it('defaults to the walk at the start of the cycle', () => {
    expect(DEFAULT_GAIT).toBe('walk');
    expect(DEFAULT_PHASE).toBe(0);
  });
});

describe('playback cadence', () => {
  it('plays smoothly by default and steps discretely under reduced motion', () => {
    const smooth = playbackCadence(false);
    const discrete = playbackCadence(true);
    expect(smooth.phasePerTick).toBeLessThan(discrete.phasePerTick);
    expect(discrete.tickMs).toBeGreaterThan(smooth.tickMs);
    // Discrete playback lands exactly on the 0.05 step grid.
    const ratio = discrete.phasePerTick / PHASE_STEP;
    expect(ratio).toBeCloseTo(Math.round(ratio), 10);
  });
});
