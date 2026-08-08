/**
 * Contact-geometry model for the why-rl-locomotion interactive. Pure data and
 * helpers, unit-tested in tests/unit/contact-geometry.test.ts.
 *
 * The interactive injects a contact-model error epsilon into two MDPs: a
 * quadruped stance (locomotion) and a peg insertion (manipulation). The
 * physics is intentionally schematic: what matters is the asymmetry in
 * contact count and error tolerance, which is the sourced claim (reality-gap
 * survey, arXiv:2510.20808), not any specific simulator's contact solver.
 *
 * Determinism: every scene is a fixed constant. No Math.random anywhere.
 */

export type ScenarioId = 'locomotion' | 'manipulation';

export interface ContactPoint {
  id: string;
  /** SVG coordinates in the shared 640x320 viewport. */
  x: number;
  y: number;
  /** Nominal physical contact-patch radius in millimeters. */
  patchRadiusMm: number;
  /** Contact normal direction in degrees (0 = up, 90 = right). */
  normalDeg: number;
}

export interface ScenarioSpec {
  id: ScenarioId;
  label: string;
  /** Short physical caption shown under the scene. */
  sceneCaption: string;
  contacts: ContactPoint[];
  /** Contact-model error magnitude the system absorbs before failure, mm. */
  toleranceMm: number;
  /** Pixels per millimeter used to render the error offset and the tolerance band. */
  pxPerMm: number;
  /** Patch-characteristic summary for the readout. */
  patchSummary: string;
  /** Outcome strings below and above the tolerance. */
  outcomeOk: string;
  outcomeFail: string;
}

/** Slider bounds and default for the injected contact-model error. */
export const MIN_ERROR_MM = 0;
export const MAX_ERROR_MM = 30;
export const DEFAULT_ERROR_MM = 2;

export const SCENARIO_ORDER: ScenarioId[] = ['locomotion', 'manipulation'];

/* Scene geometry constants (shared viewport 640x320). */

/** Terrain line height for the locomotion scene. */
export const GROUND_Y = 246;
/** Foot x positions for the quadruped stance. */
export const FOOT_XS = [150, 263, 377, 490] as const;

/** Peg-insertion scene geometry. */
export const PEG = {
  centerX: 320,
  width: 60,
  topY: 92,
  bottomY: 258,
} as const;
export const HOLE = {
  leftX: 284,
  rightX: 356,
  mouthY: 170,
  floorY: 300,
} as const;

const locomotionContacts: ContactPoint[] = FOOT_XS.map((x, i) => ({
  id: `foot-${i}`,
  x,
  y: GROUND_Y,
  patchRadiusMm: 5,
  normalDeg: 0,
}));

const manipulationContacts: ContactPoint[] = [
  // Left wall of the peg against the left hole wall.
  { id: 'wall-l-1', x: PEG.centerX - PEG.width / 2, y: 190, patchRadiusMm: 0.2, normalDeg: 90 },
  { id: 'wall-l-2', x: PEG.centerX - PEG.width / 2, y: 220, patchRadiusMm: 0.2, normalDeg: 90 },
  { id: 'wall-l-3', x: PEG.centerX - PEG.width / 2, y: 250, patchRadiusMm: 0.2, normalDeg: 90 },
  // Right wall.
  { id: 'wall-r-1', x: PEG.centerX + PEG.width / 2, y: 190, patchRadiusMm: 0.2, normalDeg: -90 },
  { id: 'wall-r-2', x: PEG.centerX + PEG.width / 2, y: 220, patchRadiusMm: 0.2, normalDeg: -90 },
  { id: 'wall-r-3', x: PEG.centerX + PEG.width / 2, y: 250, patchRadiusMm: 0.2, normalDeg: -90 },
  // Hole-mouth rim contacts.
  { id: 'rim-l', x: HOLE.leftX, y: HOLE.mouthY, patchRadiusMm: 0.2, normalDeg: 45 },
  { id: 'rim-r', x: HOLE.rightX, y: HOLE.mouthY, patchRadiusMm: 0.2, normalDeg: -45 },
  // Chamfer tip contacts at the peg's leading edge.
  { id: 'chamfer-l', x: PEG.centerX - 14, y: PEG.bottomY, patchRadiusMm: 0.2, normalDeg: 135 },
  { id: 'chamfer-r', x: PEG.centerX + 14, y: PEG.bottomY, patchRadiusMm: 0.2, normalDeg: -135 },
  // Finger grip pads near the peg top.
  { id: 'finger-l-1', x: PEG.centerX - PEG.width / 2, y: 100, patchRadiusMm: 0.2, normalDeg: 90 },
  { id: 'finger-l-2', x: PEG.centerX - PEG.width / 2, y: 122, patchRadiusMm: 0.2, normalDeg: 90 },
  { id: 'finger-r-1', x: PEG.centerX + PEG.width / 2, y: 100, patchRadiusMm: 0.2, normalDeg: -90 },
  { id: 'finger-r-2', x: PEG.centerX + PEG.width / 2, y: 122, patchRadiusMm: 0.2, normalDeg: -90 },
];

export const SCENARIOS: Record<ScenarioId, ScenarioSpec> = {
  locomotion: {
    id: 'locomotion',
    label: 'Locomotion',
    sceneCaption:
      'Quadruped stance: four near-point foot-ground contacts on a rigid substrate.',
    contacts: locomotionContacts,
    toleranceMm: 20,
    pxPerMm: 2,
    patchSummary: 'r ≤ 5 mm, near-point',
    outcomeOk: 'stable: all 4 feet loaded',
    outcomeFail: 'support lost: foot float exceeds tolerance',
  },
  manipulation: {
    id: 'manipulation',
    label: 'Manipulation',
    sceneCaption:
      'Peg insertion: 14 simultaneous contacts across walls, rim, chamfer, and grip pads.',
    contacts: manipulationContacts,
    toleranceMm: 0.5,
    pxPerMm: 12,
    patchSummary: 'r ≤ 0.2 mm, distributed',
    outcomeOk: 'seats: peg clears both walls',
    outcomeFail: 'jammed: peg binds against the wall',
  },
};

/** The six MDP properties behind the locomotion/manipulation asymmetry. */
export interface MdpRow {
  key: string;
  property: string;
  locomotion: string;
  manipulation: string;
}

export const MDP_ROWS: MdpRow[] = [
  {
    key: 'observation-sufficiency',
    property: 'Observation sufficiency',
    locomotion:
      'Proprioception (joint positions and velocities, IMU) plus an optional terrain heightscan is nearly sufficient; body state is directly measured.',
    manipulation:
      'Object pose, geometry, mass, friction, and deformability are not measured; they must be inferred from pixels.',
  },
  {
    key: 'contact-structure',
    property: 'Contact structure',
    locomotion:
      'A small number of near-point foot-ground contacts, mostly against a rigid, high-friction substrate.',
    manipulation:
      'Many simultaneous, geometrically intricate contacts between non-convex parts at tight tolerance.',
  },
  {
    key: 'contact-error-sensitivity',
    property: 'Sensitivity to contact-model error',
    locomotion:
      'High-bandwidth feedback (50-1000 Hz) and a stable gait attractor absorb modeling error.',
    manipulation:
      'Insertion and assembly failures are irreversible on a millimeter scale; the policy cannot recover into an attractor.',
  },
  {
    key: 'reward-density',
    property: 'Reward density',
    locomotion: 'Dense: track a commanded body velocity.',
    manipulation: 'Sparse: did the connector seat?',
  },
  {
    key: 'environment-authoring',
    property: 'Environment authoring cost',
    locomotion:
      'Terrain is procedurally generated heightfields, essentially free.',
    manipulation:
      'Every task needs new assets with correct physics parameters; "SimReady asset" pipelines exist as a commercial category for this reason.',
  },
  {
    key: 'episode-reset',
    property: 'Episode reset',
    locomotion: 'Free in simulation, cheap on hardware.',
    manipulation: 'Real resets need a human or a second robot.',
  },
];

export function scenarioById(id: ScenarioId): ScenarioSpec {
  return SCENARIOS[id];
}

export function contactCount(spec: ScenarioSpec): number {
  return spec.contacts.length;
}

export function maxPatchRadiusMm(spec: ScenarioSpec): number {
  return Math.max(...spec.contacts.map((c) => c.patchRadiusMm));
}

/** ok while the injected error stays within the system's tolerance. */
export function outcomeFor(spec: ScenarioSpec, errorMm: number): 'ok' | 'fail' {
  return errorMm <= spec.toleranceMm ? 'ok' : 'fail';
}

/** Pixels the scene shifts for a given error, rounded for SSR/hydration parity. */
export function errorOffsetPx(spec: ScenarioSpec, errorMm: number): number {
  return Number((errorMm * spec.pxPerMm).toFixed(2));
}

/**
 * Offset used for rendering. Locomotion renders the true offset (it stays on
 * canvas at the slider maximum). The peg is clamped at four clearances: past
 * the jam point the exact position carries no information, and the true
 * offset would push the peg out of the viewport.
 */
export function renderedOffsetPx(spec: ScenarioSpec, errorMm: number): number {
  const raw = errorOffsetPx(spec, errorMm);
  if (spec.id === 'manipulation') {
    return Math.min(raw, 4 * toleranceBandPx(spec));
  }
  return raw;
}

/** Tolerance band half-width in pixels, rounded for SSR/hydration parity. */
export function toleranceBandPx(spec: ScenarioSpec): number {
  return Number((spec.toleranceMm * spec.pxPerMm).toFixed(2));
}

/** "20 mm", "0.5 mm": integers without a trailing .0, fractions at one decimal. */
export function formatMm(value: number): string {
  return Number.isInteger(value)
    ? `${value} mm`
    : `${value.toFixed(1)} mm`;
}
