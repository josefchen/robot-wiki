/**
 * Generated from motion-tokens.json by scripts/generate-motion-tokens.ts.
 * Do not edit: change motion-tokens.json and regenerate.
 */
export type MotionRoleName =
  | 'state'
  | 'measurement'
  | 'action'
  | 'value'
  | 'constraint'
  | 'reference'
  | 'highlight';

export type MotionRoleVariant = 'stage' | 'text' | 'graphic';

export interface MotionRole {
  means: string;
  stage: string;
  stageContrast: number;
  lightText: string;
  lightGraphic: string;
  lightGraphicTreatment?: string;
  encoding: string;
}

/** The semantic colour roles. The same quantity has the same colour on every page. */
export const MOTION_ROLES: Record<MotionRoleName, MotionRole> = {
  state: {
    means: "estimate, belief, position, the main object",
    stage: '#1C1C1A',
    stageContrast: 17.1,
    lightText: '#1C1C1A',
    lightGraphic: '#1C1C1A',
    encoding: "solid 1.5 px stroke",
  },
  measurement: {
    means: "observation, sensor reading, data point",
    stage: '#3F3F3B',
    stageContrast: 10.7,
    lightText: '#3F3F3B',
    lightGraphic: '#3F3F3B',
    encoding: "cross or dot markers",
  },
  action: {
    means: "policy output, control input, command",
    stage: '#1C1C1A',
    stageContrast: 17.1,
    lightText: '#1C1C1A',
    lightGraphic: '#1C1C1A',
    encoding: "arrows, arrowheads",
  },
  value: {
    means: "reward, return, value, cost, score",
    stage: '#3F3F3B',
    stageContrast: 10.7,
    lightText: '#3F3F3B',
    lightGraphic: '#3F3F3B',
    encoding: "filled bars or areas",
  },
  constraint: {
    means: "obstacle, collision, error, limit, failure",
    stage: '#1C1C1A',
    stageContrast: 17.1,
    lightText: '#1C1C1A',
    lightGraphic: '#1C1C1A',
    encoding: "45 degree hatch fill",
  },
  reference: {
    means: "ground truth, target, baseline",
    stage: '#A3A39E',
    stageContrast: 2.5,
    lightText: '#6C6B66',
    lightGraphic: '#A3A39E',
    encoding: "dashed 1 px",
  },
  highlight: {
    means: "Indicate, selection, the thing to look at now",
    stage: '#3B6EA8',
    stageContrast: 5.4,
    lightText: '#3B6EA8',
    lightGraphic: '#3B6EA8',
    lightGraphicTreatment: 'the one accent series or mark per figure, in the muted blue',
    encoding: "the one accent: the highlighted series, its marker and its plain note, never a control fill",
  },
};

/** CSS custom property reference for a role variant, e.g. var(--role-state-stage). */
export function motionRoleVar(
  role: MotionRoleName,
  variant: MotionRoleVariant,
): string {
  return `var(--role-${role}-${variant})`;
}

/** The figure stage (the page ground) and its structure, resolved from the figure palette. */
export const MOTION_STAGE = {
  background: 'var(--paper, var(--color-paper))',
  axes: 'var(--ink)',
  axesOpacity: 1,
  grid: 'var(--line)',
  gridOpacity: 1,
  label: 'var(--ink)',
  labelSecondary: 'var(--muted)',
  labelFont: 'var(--font-sans)',
  labelMinPx: 11,
} as const;

/**
 * The stage type scale in painted CSS pixels. components/motion/stage.css
 * divides each size by the stage's current scale, so these hold on every
 * stage at least fullSizeMinStagePx wide; a narrower stage shrinks whole.
 */
export const MOTION_STAGE_TYPE = {
  labelFont: 'var(--font-sans)',
  readoutFont: 'var(--font-mono)',
  minPx: 11,
  labelPx: 12,
  axisPx: 12,
  tickPx: 11,
  readoutPx: 12,
  fullSizeMinStagePx: 299,
} as const;

/** Uncertainty is not its own colour: the object's hue at 22% with a dashed edge. */
export const MOTION_UNCERTAINTY = {
  fillAlpha: 0.22,
  edge: 'dashed',
} as const;

/** Beat durations in milliseconds. UI micro-transitions keep the brand's short timings and are not beats. */
export const MOTION_TIMING = {
  beat: 1000,
  beatShort: 500,
  beatLong: 2000,
  indicate: 800,
  create: 1000,
  createFillTail: 0.3,
  write: 1000,
  writePerGlyph: 100,
  writeMax: 2000,
  reducedMotionHold: 800,
} as const;

export const MOTION_LAG = {
  default: 0.1,
  dense: 0.05,
  denseThreshold: 12,
} as const;

export const MOTION_CAMERA = {
  focusMaxZoom: 2.5,
} as const;

export const MOTION_EASING = {
  smoothFormula: 't^3 * (10*(1-t)^2 + 5*t*(1-t) + t^2)',
  thereAndBackFormula: 'smooth(2t) for t < 0.5, smooth(2 - 2t) after',
  cssLinearStops: 24,
} as const;
