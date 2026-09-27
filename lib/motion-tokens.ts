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
    stage: '#58C4DD',
    stageContrast: 6.9,
    lightText: '#00829A',
    lightGraphic: '#2EA1B9',
    encoding: "solid 2 px stroke",
  },
  measurement: {
    means: "observation, sensor reading, data point",
    stage: '#E8C11C',
    stageContrast: 8.1,
    lightText: '#956F00',
    lightGraphic: '#B69000',
    encoding: "cross or dot markers",
  },
  action: {
    means: "policy output, control input, command",
    stage: '#B189C6',
    stageContrast: 4.9,
    lightText: '#8D67A1',
    lightGraphic: '#AE86C3',
    encoding: "arrows, arrowheads",
  },
  value: {
    means: "reward, return, value, cost, score",
    stage: '#A6CF8C',
    stageContrast: 8,
    lightText: '#5B8141',
    lightGraphic: '#789F5F',
    encoding: "filled bars or areas",
  },
  constraint: {
    means: "obstacle, collision, error, limit, failure",
    stage: '#FC6255',
    stageContrast: 4.7,
    lightText: '#D63E35',
    lightGraphic: '#FA6053',
    encoding: "45 degree hatch fill",
  },
  reference: {
    means: "ground truth, target, baseline",
    stage: '#D9DADB',
    stageContrast: 10,
    lightText: '#767778',
    lightGraphic: '#949595',
    encoding: "dashed 1.5 px",
  },
  highlight: {
    means: "Indicate, selection, the thing to look at now",
    stage: '#C6FF19',
    stageContrast: 11.8,
    lightText: '#548200',
    lightGraphic: '#C6FF19',
    lightGraphicTreatment: 'lime underlay behind ink',
    encoding: "underlay or halo, never a stroke on light",
  },
};

/** CSS custom property reference for a role variant, e.g. var(--role-state-stage). */
export function motionRoleVar(
  role: MotionRoleName,
  variant: MotionRoleVariant,
): string {
  return `var(--role-${role}-${variant})`;
}

/** The graphite stage and its structure, resolved from the brand tokens. */
export const MOTION_STAGE = {
  background: 'var(--color-instrument)',
  axes: 'var(--color-concrete)',
  axesOpacity: 0.45,
  grid: 'var(--color-concrete)',
  gridOpacity: 0.08,
  label: 'var(--color-white)',
  labelSecondary: 'var(--color-concrete)',
  labelFont: 'var(--font-sans)',
  labelMinPx: 12,
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
