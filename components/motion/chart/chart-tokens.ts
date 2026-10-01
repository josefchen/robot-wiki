/**
 * Chart sizes and colours, read from the generated motion tokens. The
 * encodings in motion-tokens.json name the stroke widths in words ("solid
 * 2 px stroke", "dashed 1.5 px", "45 degree hatch fill"); they are parsed
 * here once, so a token change moves every chart and a missing number fails
 * at import instead of falling back to a guess.
 */
import {
  MOTION_ROLES,
  MOTION_STAGE,
  MOTION_STAGE_TYPE,
  MOTION_UNCERTAINTY,
  motionRoleVar,
  type MotionRoleName,
} from '@/lib/motion-tokens';

function encodedNumber(encoding: string, unit: string): number {
  const match = encoding.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}`));
  if (!match) throw new Error(`motion token encoding "${encoding}" names no ${unit}`);
  return Number(match[1]);
}

/** Painted text sizes in CSS px; stage.css holds them at every width. */
export const CHART_TYPE = {
  font: MOTION_STAGE_TYPE.labelFont,
  readoutFont: MOTION_STAGE_TYPE.readoutFont,
  minPx: MOTION_STAGE_TYPE.minPx,
  labelPx: MOTION_STAGE_TYPE.labelPx,
  axisPx: MOTION_STAGE_TYPE.axisPx,
  tickPx: MOTION_STAGE_TYPE.tickPx,
  readoutPx: MOTION_STAGE_TYPE.readoutPx,
  /**
   * The brand sans's box around the baseline, in ems. A text element's
   * bounding box spans ascent plus descent, so labels stacked by these
   * never touch, and the probes that compare boxes agree.
   */
  ascent: 1.03,
  descent: 0.28,
} as const;

/**
 * Chart geometry is authored in the stage's own units at 340 wide, the
 * stage width at a 375px viewport, so one unit is about one CSS pixel
 * where the type is largest relative to the drawing.
 */
export const CHART_VIEW_WIDTH = 340;

const trace = encodedNumber(MOTION_ROLES.state.encoding, 'px');
const reference = encodedNumber(MOTION_ROLES.reference.encoding, 'px');

/**
 * Stroke geometry. The trace and reference widths are the token encodings;
 * structural lines (axes, grid, ticks) take half the trace width so they sit
 * under every data mark, and dashes and tick lengths scale from the widths
 * and the tick type size.
 */
export const CHART_STROKE = {
  trace,
  reference,
  structure: trace / 2,
  dash: `${reference * 4} ${reference * 2}`,
  tickLength: MOTION_STAGE_TYPE.tickPx / 2,
  markerRadius: trace * 2,
} as const;

/** The constraint hatch: its angle from the token, spaced by the tick size. */
export const CHART_HATCH = {
  angle: encodedNumber(MOTION_ROLES.constraint.encoding, 'degree'),
  spacing: MOTION_STAGE_TYPE.tickPx / 2,
  width: trace / 2,
} as const;

export const CHART_UNCERTAINTY = {
  fillAlpha: MOTION_UNCERTAINTY.fillAlpha,
} as const;

/** The stage structure colours: axes, grid and secondary labels. */
export const CHART_STRUCTURE = {
  axes: MOTION_STAGE.axes,
  axesOpacity: MOTION_STAGE.axesOpacity,
  grid: MOTION_STAGE.grid,
  gridOpacity: MOTION_STAGE.gridOpacity,
  label: MOTION_STAGE.label,
  labelSecondary: MOTION_STAGE.labelSecondary,
} as const;

export type ChartRole = MotionRoleName;

/** A role's stage colour. Charts only ever paint data in these. */
export function roleColour(role: ChartRole): string {
  return motionRoleVar(role, 'stage');
}

/** Maps a data domain onto a pixel range. */
export function linearScale(
  [d0, d1]: readonly [number, number],
  [r0, r1]: readonly [number, number],
): (value: number) => number {
  const span = d1 - d0;
  return (value) => (span === 0 ? r0 : r0 + ((value - d0) / span) * (r1 - r0));
}
