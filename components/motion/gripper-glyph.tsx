import { roleColour, type ChartRole } from './chart/chart-tokens';

/**
 * A two-finger robot gripper seen from above, drawn on a stage so a reader
 * recognises the robot in a diagram rather than a dot. It points along
 * `angle` (degrees, 0 = towards +x, clockwise on screen) with its fingertips
 * at (x, y). No hooks, so server-rendered schematics can draw it too.
 */
export function GripperGlyph({
  x,
  y,
  angle = 0,
  size = 14,
  role = 'state',
  opacity,
  testId,
}: {
  x: number;
  y: number;
  angle?: number;
  size?: number;
  role?: ChartRole;
  opacity?: number;
  testId?: string;
}) {
  const s = size;
  const colour = roleColour(role);
  const r = (value: number) => Number(value.toFixed(2));
  return (
    <g
      data-chart-mark="gripper"
      data-chart-role={role}
      data-testid={testId}
      transform={`translate(${r(x)} ${r(y)}) rotate(${r(angle)})`}
      fill={colour}
      opacity={opacity}
    >
      <rect x={r(-s * 1.15)} y={r(-s * 0.09)} width={r(s * 0.5)} height={r(s * 0.18)} rx={r(s * 0.05)} />
      <rect x={r(-s * 0.7)} y={r(-s * 0.5)} width={r(s * 0.22)} height={r(s)} rx={r(s * 0.06)} />
      <rect x={r(-s * 0.5)} y={r(-s * 0.5)} width={r(s * 0.5)} height={r(s * 0.17)} rx={r(s * 0.06)} />
      <rect x={r(-s * 0.5)} y={r(s * 0.33)} width={r(s * 0.5)} height={r(s * 0.17)} rx={r(s * 0.06)} />
    </g>
  );
}
