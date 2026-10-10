import { CHART_STROKE, roleColour, type ChartRole } from './chart/chart-tokens';

/**
 * A two-finger robot gripper as a line drawing: a short wrist stem, the
 * palm bar and two parallel fingers, stroked in its role at the trace
 * width with no fill, so it reads as a technical illustration beside the
 * thin arm links rather than as an icon. It points along `angle`
 * (degrees, 0 = towards +x, clockwise on screen) with its fingertips at
 * (x, y). No hooks, so server-rendered schematics can draw it too.
 */
export function GripperGlyph({
  x,
  y,
  angle = 0,
  size = 14,
  role = 'state',
  opacity,
  dashed = false,
  testId,
}: {
  x: number;
  y: number;
  angle?: number;
  size?: number;
  role?: ChartRole;
  opacity?: number;
  /** Draw the outline dashed, for a ghost pose. */
  dashed?: boolean;
  testId?: string;
}) {
  const s = size;
  const r = (value: number) => Number(value.toFixed(2));
  const palm = -s * 0.62;
  const spread = s * 0.42;
  return (
    <g
      data-chart-mark="gripper"
      data-chart-role={role}
      data-testid={testId}
      transform={`translate(${r(x)} ${r(y)}) rotate(${r(angle)})`}
      fill="none"
      stroke={roleColour(role)}
      strokeWidth={dashed ? CHART_STROKE.reference : CHART_STROKE.trace}
      strokeDasharray={dashed ? CHART_STROKE.dash : undefined}
      strokeLinecap="square"
      strokeLinejoin="miter"
      opacity={opacity}
    >
      <path d={`M${r(-s * 1.15)} 0 H${r(palm)}`} />
      <path d={`M0 ${r(-spread)} H${r(palm)} V${r(spread)} H0`} />
    </g>
  );
}
