/**
 * Quadruped gait model for the legged-locomotion gait diagram.
 *
 * A gait is a footfall-timing pattern: each leg strikes the ground at a
 * fixed offset within the stride cycle and stays in stance for the gait's
 * duty factor (the fraction of the cycle a foot spends on the ground).
 * These are the canonical patterns quadruped controllers and learned
 * policies reproduce: the lateral-sequence walk, the diagonal trot, the
 * bound with its suspension interval, and the all-feet-together pronk.
 *
 * Pure functions only; the component and the tests share this model.
 */

export type LegId = 'lf' | 'rf' | 'lh' | 'rh';

export interface Leg {
  id: LegId;
  short: string;
  name: string;
  side: 'front' | 'hind';
}

/** Display and readout order: front left/right, then hind left/right. */
export const LEGS: Leg[] = [
  { id: 'lf', short: 'LF', name: 'left front', side: 'front' },
  { id: 'rf', short: 'RF', name: 'right front', side: 'front' },
  { id: 'lh', short: 'LH', name: 'left hind', side: 'hind' },
  { id: 'rh', short: 'RH', name: 'right hind', side: 'hind' },
];

export type GaitId = 'walk' | 'trot' | 'bound' | 'pronk';

export interface GaitDef {
  id: GaitId;
  name: string;
  /** Fraction of the stride cycle each foot spends in stance. */
  dutyFactor: number;
  /** Fraction of the cycle at which each leg strikes the ground. */
  offsets: Record<LegId, number>;
  /** Short caption describing the pattern. */
  note: string;
}

export const GAITS: Record<GaitId, GaitDef> = {
  walk: {
    id: 'walk',
    name: 'Walk',
    dutyFactor: 0.75,
    // Lateral-sequence walk: hind foot, then the forefoot on the same side.
    offsets: { lh: 0, lf: 0.25, rh: 0.5, rf: 0.75 },
    note: 'Four-beat gait; three feet stay down at all times.',
  },
  trot: {
    id: 'trot',
    name: 'Trot',
    dutyFactor: 0.5,
    // Diagonal pairs: LF with RH, RF with LH.
    offsets: { lf: 0, rh: 0, rf: 0.5, lh: 0.5 },
    note: 'Diagonal pairs strike together; two feet down at all times.',
  },
  bound: {
    id: 'bound',
    name: 'Bound',
    dutyFactor: 0.45,
    // Front pair, then hind pair, with a suspension interval between.
    offsets: { lf: 0, rf: 0, lh: 0.5, rh: 0.5 },
    note: 'Front pair and hind pair alternate, with suspension between.',
  },
  pronk: {
    id: 'pronk',
    name: 'Pronk',
    dutyFactor: 0.35,
    offsets: { lf: 0, rf: 0, lh: 0, rh: 0 },
    note: 'All four feet strike and lift together; mostly airborne.',
  },
};

export const GAIT_ORDER: GaitId[] = ['walk', 'trot', 'bound', 'pronk'];

export const DEFAULT_GAIT: GaitId = 'walk';
export const DEFAULT_PHASE = 0;

/** Phase increment for the step controls, as a fraction of the cycle. */
export const PHASE_STEP = 0.05;

function wrap01(v: number): number {
  return ((v % 1) + 1) % 1;
}

/**
 * A leg's position within its own stride: 0 at foot strike, the duty
 * factor at liftoff. Handles a cycle phase of exactly 1 (slider end) by
 * wrapping to the cycle start.
 */
export function legPhase(gait: GaitDef, leg: LegId, phase: number): number {
  return wrap01(phase - gait.offsets[leg]);
}

/** A leg is in stance from its strike offset until the duty factor. */
export function inStance(gait: GaitDef, leg: LegId, phase: number): boolean {
  return legPhase(gait, leg, phase) < gait.dutyFactor;
}

/** Legs on the ground at a cycle phase, in display order. */
export function stanceLegs(gait: GaitDef, phase: number): LegId[] {
  return LEGS.filter((l) => inStance(gait, l.id, phase)).map((l) => l.id);
}

export function stanceCount(gait: GaitDef, phase: number): number {
  return stanceLegs(gait, phase).length;
}

const SCAN_SAMPLES = 2000;

/** Fewest feet on the ground anywhere in the cycle. */
export function minStanceCount(gait: GaitDef): number {
  let min = LEGS.length;
  for (let i = 0; i < SCAN_SAMPLES; i++) {
    min = Math.min(min, stanceCount(gait, i / SCAN_SAMPLES));
  }
  return min;
}

/** Most feet on the ground anywhere in the cycle. */
export function maxStanceCount(gait: GaitDef): number {
  let max = 0;
  for (let i = 0; i < SCAN_SAMPLES; i++) {
    max = Math.max(max, stanceCount(gait, i / SCAN_SAMPLES));
  }
  return max;
}

/** True when some interval of the cycle has every foot off the ground. */
export function hasFlightPhase(gait: GaitDef): boolean {
  return minStanceCount(gait) === 0;
}

/** Legs sorted by strike offset: the footfall order of the gait. */
export function footfallOrder(gait: GaitDef): LegId[] {
  return LEGS.map((l) => l.id).sort(
    (a, b) => gait.offsets[a] - gait.offsets[b],
  );
}

/**
 * Advance or rewind the cycle phase by PHASE_STEP, wrapping at the cycle
 * boundary and snapping to the step grid so repeated steps never drift.
 */
export function stepPhase(phase: number, dir: 1 | -1): number {
  const next = wrap01(phase + dir * PHASE_STEP);
  const snapped = Math.round(next / PHASE_STEP) * PHASE_STEP;
  return Math.round(wrap01(snapped) * 1e6) / 1e6;
}

export function formatPhase(phase: number): string {
  return `${Math.round(phase * 100)}%`;
}

export function formatDuty(dutyFactor: number): string {
  return dutyFactor.toFixed(2);
}

export interface PlaybackCadence {
  tickMs: number;
  phasePerTick: number;
}

/**
 * Playback cadence. Normal playback advances smoothly; under
 * prefers-reduced-motion the playhead jumps in discrete PHASE_STEP
 * increments, so the cycle information is still reachable without
 * continuous motion.
 */
export function playbackCadence(reducedMotion: boolean): PlaybackCadence {
  return reducedMotion
    ? { tickMs: 320, phasePerTick: 0.1 }
    : { tickMs: 50, phasePerTick: 0.01 };
}
