import type { ReactNode } from 'react';
import {
  CHART_HATCH,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_UNCERTAINTY,
  roleColour,
  type ChartRole,
} from './chart-tokens';

export type ChartPoint = readonly [number, number];

function pathOf(points: readonly ChartPoint[]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
}

/**
 * A series as a line. Several series of one quantity share a role and are
 * told apart by `dashed` or a direct label, never by a second colour. The
 * reference role is always dashed at its own width.
 */
export function LineTrace({
  points,
  role = 'state',
  dashed = false,
}: {
  points: readonly ChartPoint[];
  role?: ChartRole;
  dashed?: boolean;
}) {
  const reference = role === 'reference';
  return (
    <path
      data-chart-mark="line"
      data-chart-role={role}
      d={pathOf(points)}
      fill="none"
      stroke={roleColour(role)}
      strokeWidth={reference ? CHART_STROKE.reference : CHART_STROKE.trace}
      strokeDasharray={reference || dashed ? CHART_STROKE.dash : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** A filled bar; values and scores take the value role. */
export function Bar({
  x,
  y,
  width,
  height,
  role = 'value',
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  role?: ChartRole;
}) {
  return (
    <rect
      data-chart-mark="bar"
      data-chart-role={role}
      x={x}
      y={y}
      width={Math.max(0, width)}
      height={Math.max(0, height)}
      fill={roleColour(role)}
    />
  );
}

/** A data point: a dot, or a cross where dots would overlap a line. */
export function PointMarker({
  x,
  y,
  role = 'measurement',
  shape = 'dot',
}: {
  x: number;
  y: number;
  role?: ChartRole;
  shape?: 'dot' | 'cross';
}) {
  const r = CHART_STROKE.markerRadius;
  if (shape === 'cross') {
    return (
      <path
        data-chart-mark="cross"
        data-chart-role={role}
        d={`M${x - r} ${y - r} L${x + r} ${y + r} M${x - r} ${y + r} L${x + r} ${y - r}`}
        fill="none"
        stroke={roleColour(role)}
        strokeWidth={CHART_STROKE.trace}
        strokeLinecap="round"
      />
    );
  }
  return (
    <circle data-chart-mark="dot" data-chart-role={role} cx={x} cy={y} r={r} fill={roleColour(role)} />
  );
}

/**
 * A constraint region: the 45 degree hatch in the constraint role with an
 * outline, never a solid fill. `id` names the pattern and must be unique on
 * the page.
 */
export function ConstraintHatch({
  id,
  x,
  y,
  width,
  height,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const s = CHART_HATCH.spacing;
  return (
    <g data-chart-mark="hatch" data-chart-role="constraint">
      <defs>
        <pattern
          id={id}
          width={s}
          height={s}
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${CHART_HATCH.angle})`}
        >
          <line x1={0} y1={0} x2={0} y2={s} stroke={roleColour('constraint')} strokeWidth={CHART_HATCH.width} />
        </pattern>
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={`url(#${id})`}
        stroke={roleColour('constraint')}
        strokeWidth={CHART_HATCH.width}
      />
    </g>
  );
}

/**
 * Uncertainty in its owner's colour: the band at the token alpha between a
 * lower and an upper edge, each edge dashed.
 */
export function UncertaintyBand({
  upper,
  lower,
  role = 'state',
}: {
  upper: readonly ChartPoint[];
  lower: readonly ChartPoint[];
  role?: ChartRole;
}) {
  const outline = `${pathOf(upper)} ${pathOf([...lower].reverse()).replace(/^M/, 'L')} Z`;
  const edge = {
    fill: 'none',
    stroke: roleColour(role),
    strokeWidth: CHART_STROKE.reference,
    strokeDasharray: CHART_STROKE.dash,
  };
  return (
    <g data-chart-mark="band" data-chart-role={role}>
      <path d={outline} fill={roleColour(role)} fillOpacity={CHART_UNCERTAINTY.fillAlpha} stroke="none" />
      <path d={pathOf(upper)} {...edge} />
      <path d={pathOf(lower)} {...edge} />
    </g>
  );
}

/**
 * A label set beside the mark it names, in the mark's role colour. Leave the
 * role out for a plain stage label.
 */
export function DirectLabel({
  x,
  y,
  role,
  anchor = 'start',
  children,
}: {
  x: number;
  y: number;
  role?: ChartRole;
  anchor?: 'start' | 'middle' | 'end';
  children: ReactNode;
}) {
  return (
    <text
      data-chart-label=""
      data-chart-role={role}
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={CHART_TYPE.labelPx}
      fill={role ? roleColour(role) : CHART_STRUCTURE.label}
    >
      {children}
    </text>
  );
}

const LINE_STEP_EM = 1.25;

/** Arrowhead of an annotation pointer, in stage units. */
export const ANNOTATION_ARROW = { length: 9, halfWidth: 4.5, gap: 3 } as const;

/**
 * The leader of an arrow pointer: it stops `gap` short of the target so the
 * head never covers the mark it names, and the head's base sits `length`
 * back along the leader. Returns null when the leader is too short to carry
 * a head.
 */
export function annotationArrow(
  from: ChartPoint,
  target: ChartPoint,
): { end: ChartPoint; head: readonly [ChartPoint, ChartPoint, ChartPoint] } | null {
  const dx = target[0] - from[0];
  const dy = target[1] - from[1];
  const length = Math.hypot(dx, dy);
  const { length: headLength, halfWidth, gap } = ANNOTATION_ARROW;
  if (length <= headLength + gap) return null;
  const ux = dx / length;
  const uy = dy / length;
  const tip: ChartPoint = [target[0] - ux * gap, target[1] - uy * gap];
  const baseX = tip[0] - ux * headLength;
  const baseY = tip[1] - uy * headLength;
  return {
    end: [baseX, baseY],
    head: [tip, [baseX - uy * halfWidth, baseY + ux * halfWidth], [baseX + uy * halfWidth, baseY - ux * halfWidth]],
  };
}

/**
 * The plain-words note that points at what the figure shows: the label in
 * the highlight role (the figure's one accent), at the label weight, one line per entry of `lines`, with an optional
 * leader from the label to the point it names. The leader ends in a ring on
 * that point, or with `pointer="arrow"` in an arrowhead just short of it,
 * which first-time readers take for a pointer rather than for data.
 * A figure carries one, two at most, and shows it at settle.
 */
export function StageAnnotation({
  x,
  y,
  lines,
  anchor = 'start',
  target,
  from,
  pointer = 'ring',
  stack = 'down',
}: {
  x: number;
  y: number;
  lines: readonly string[];
  anchor?: 'start' | 'middle' | 'end';
  /** The point the note names. */
  target?: ChartPoint;
  /** Where the leader leaves the label; defaults to the label's anchor point. */
  from?: ChartPoint;
  /** How the leader marks its target. */
  pointer?: 'ring' | 'arrow';
  /** `up` keeps the last line's baseline on `y` and stacks earlier lines above it, at any stage width. */
  stack?: 'down' | 'up';
}) {
  const colour = roleColour('highlight');
  const block = CHART_TYPE.labelPx * LINE_STEP_EM * (lines.length - 1);
  const [fx, fy] = from ?? [x, y + block + CHART_TYPE.labelPx * 0.35];
  const arrow = target && pointer === 'arrow' ? annotationArrow([fx, fy], target) : null;
  // The stage holds its type at one CSS pixel size while the viewBox
  // stretches, so lines step in ems and a wide stage packs them tighter
  // than the stage units the layout was planned in. A leader that leaves
  // from under the note keeps the last line where it was planned and the
  // earlier lines stack up from it, so the note never drifts off its leader.
  const fromBelow = target !== undefined && lines.length > 1 && fy > y + block / 2;
  const firstDy = fromBelow || stack === 'up' ? `${-LINE_STEP_EM * (lines.length - 1)}em` : 0;
  return (
    <g data-figure-annotation="">
      {target && pointer === 'arrow' ? (
        arrow ? (
          <g data-annotation-pointer="arrow">
            <line x1={fx} y1={fy} x2={arrow.end[0]} y2={arrow.end[1]} stroke={colour} strokeWidth={CHART_STROKE.structure} />
            <polygon points={arrow.head.map(([px, py]) => `${px},${py}`).join(' ')} fill={colour} />
          </g>
        ) : null
      ) : target ? (
        <>
          <line x1={fx} y1={fy} x2={target[0]} y2={target[1]} stroke={colour} strokeWidth={CHART_STROKE.structure} />
          <circle cx={target[0]} cy={target[1]} r={CHART_STROKE.markerRadius + 1} fill="none" stroke={colour} strokeWidth={CHART_STROKE.structure} />
        </>
      ) : null}
      <text x={x} y={fromBelow ? y + block : y} textAnchor={anchor} fontSize={CHART_TYPE.labelPx} fill={colour}>
        {lines.map((line, i) => (
          <tspan key={line} x={x} dy={i === 0 ? firstDy : `${LINE_STEP_EM}em`}>{line}</tspan>
        ))}
      </text>
    </g>
  );
}
