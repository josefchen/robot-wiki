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
    stage: '#007A91',
    stageContrast: 4.6,
    lightText: '#007A91',
    lightGraphic: '#007A91',
    encoding: "solid 2 px stroke",
  },
  measurement: {
    means: "observation, sensor reading, data point",
    stage: '#8E6A00',
    stageContrast: 4.6,
    lightText: '#8E6A00',
    lightGraphic: '#8E6A00',
    encoding: "cross or dot markers",
  },
  action: {
    means: "policy output, control input, command",
    stage: '#866299',
    stageContrast: 4.6,
    lightText: '#866299',
    lightGraphic: '#866299',
    encoding: "arrows, arrowheads",
  },
  value: {
    means: "reward, return, value, cost, score",
    stage: '#56793D',
    stageContrast: 4.6,
    lightText: '#56793D',
    lightGraphic: '#56793D',
    encoding: "filled bars or areas",
  },
  constraint: {
    means: "obstacle, collision, error, limit, failure",
    stage: '#CB3B32',
    stageContrast: 4.6,
    lightText: '#CB3B32',
    lightGraphic: '#CB3B32',
    encoding: "45 degree hatch fill",
  },
  reference: {
    means: "ground truth, target, baseline",
    stage: '#6E6F70',
    stageContrast: 4.6,
    lightText: '#6E6F70',
    lightGraphic: '#6E6F70',
    encoding: "dashed 1.5 px",
  },
  highlight: {
    means: "Indicate, selection, the thing to look at now",
    stage: '#507C00',
    stageContrast: 4.6,
    lightText: '#507C00',
    lightGraphic: '#C6FF19',
    lightGraphicTreatment: 'lime halo or underlay behind the one highlighted mark',
    encoding: "dark-green note and leader line; a lime halo marks at most one point, never a control fill",
  },
};

/** CSS custom property reference for a role variant, e.g. var(--role-state-stage). */
export function motionRoleVar(
  role: MotionRoleName,
  variant: MotionRoleVariant,
): string {
  return `var(--role-${role}-${variant})`;
}

/** The figure stage (the page ground) and its structure, resolved from the brand tokens. */
export const MOTION_STAGE = {
  background: 'var(--color-paper)',
  axes: 'var(--color-graphite)',
  axesOpacity: 0.6,
  grid: 'var(--color-concrete)',
  gridOpacity: 0.7,
  label: 'var(--color-ink)',
  labelSecondary: 'var(--color-graphite)',
  labelFont: 'var(--font-sans)',
  labelMinPx: 14,
} as const;

/**
 * The stage type scale in painted CSS pixels. components/motion/stage.css
 * divides each size by the stage's current scale, so these hold on every
 * stage at least fullSizeMinStagePx wide; a narrower stage shrinks whole.
 */
export const MOTION_STAGE_TYPE = {
  labelFont: 'var(--font-sans)',
  readoutFont: 'var(--font-sans)',
  minPx: 14,
  labelPx: 14,
  axisPx: 14,
  tickPx: 14,
  readoutPx: 14,
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

export const MOTION_EASING = {
  smoothFormula: 't^3 * (10*(1-t)^2 + 5*t*(1-t) + t^2)',
  thereAndBackFormula: 'smooth(2t) for t < 0.5, smooth(2 - 2t) after',
  cssLinearStops: 24,
} as const;
