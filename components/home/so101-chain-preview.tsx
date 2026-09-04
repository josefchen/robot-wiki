import { ChartDescription } from '@/components/ui/chart-description';
import { Surface } from '@/components/ui/surface';
import type { So101Preview } from '@/lib/so101-kinematics';

/**
 * The home entry point's preview of the shipped SO-101 (`VAL-DESIGN-013`).
 *
 * Everything drawn here is derived from `public/models/so101/so101.urdf` by
 * `lib/so101-kinematics.ts`: the polyline is the model's own zero
 * configuration projected onto its sagittal plane, the legend is the model's
 * revolute joints in chain order with their declared travel, and the
 * disclosure table is those same limits in degrees. Nothing is placed by
 * eye, so a model change moves the drawing instead of leaving a decorative
 * arm that once resembled it.
 *
 * The instrument is graphite because the playground it opens is graphite
 * (design-system §17), and its marks stay concrete/white/lime: signal blue
 * measures 2.7:1 against graphite, below the 3:1 essential-boundary floor
 * `VAL-B2-A11Y-014` names, so the active-path role is carried by geometry
 * and by the legend rather than by a blue that a reader could not resolve.
 */

type So101ChainPreviewProps = {
  preview: So101Preview;
  /** Shared with the figure's `aria-describedby`. */
  descriptionId: string;
  className?: string;
};

export function So101ChainPreview({
  preview,
  descriptionId,
  className,
}: So101ChainPreviewProps) {
  const { chain, geometry, description } = preview;
  const polyline = geometry.points
    .map((point) => `${point.x},${point.y}`)
    .join(' ');
  const tip = geometry.points[geometry.points.length - 1];
  const joints = geometry.points.slice(1, -1);
  const base = geometry.points[0];

  return (
    <div className={className}>
      <Surface as="figure" level="bounded-dark" className="p-3">
        {/* Stacked until there is room for both: side by side, the drawing's
            fixed aspect and the legend's shortest joint name together set a
            minimum content width wider than a 320px reflow viewport. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <svg
            viewBox={geometry.viewBox}
            role="img"
            aria-label={`Side view of the shipped SO-101 arm at its zero configuration, ${chain.length} revolute joints from the base to the gripper`}
            aria-describedby={descriptionId}
            className="block h-36 w-auto shrink-0 text-on-instrument"
          >
            <line
              x1={base.x - 10}
              x2={geometry.width - 12}
              y1={geometry.groundY}
              y2={geometry.groundY}
              stroke="var(--color-instrument-muted)"
              strokeWidth={1}
            />
            <polyline
              points={polyline}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <rect
              x={base.x - 7}
              y={geometry.groundY - 5}
              width={14}
              height={5}
              fill="var(--color-instrument-muted)"
            />
            {joints.map((joint) => (
              <circle
                key={joint.name}
                cx={joint.x}
                cy={joint.y}
                r={3.5}
                fill="var(--color-instrument)"
                stroke="var(--color-instrument-muted)"
                strokeWidth={1.5}
              />
            ))}
            {/* The end effector. Ringed in the instrument's own ink as well
                as filled, so forced colours, which leave SVG fills alone,
                still leave a marked tip rather than a lime dot on canvas. */}
            <circle
              cx={tip.x}
              cy={tip.y}
              r={4}
              fill="var(--color-highlight)"
              stroke="currentColor"
              strokeWidth={1.5}
            />
            <g>
              <line
                x1={geometry.scaleBar.x1}
                x2={geometry.scaleBar.x2}
                y1={geometry.scaleBar.y}
                y2={geometry.scaleBar.y}
                stroke="var(--color-instrument-muted)"
                strokeWidth={1}
              />
              {[geometry.scaleBar.x1, geometry.scaleBar.x2].map((x) => (
                <line
                  key={x}
                  x1={x}
                  x2={x}
                  y1={geometry.scaleBar.y - 3}
                  y2={geometry.scaleBar.y + 3}
                  stroke="var(--color-instrument-muted)"
                  strokeWidth={1}
                />
              ))}
              <text
                x={geometry.scaleBar.x2 + 6}
                y={geometry.scaleBar.y + 3}
                fill="var(--color-instrument-muted)"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {geometry.scaleBar.labelMm} mm
              </text>
            </g>
          </svg>
          <ul className="min-w-0 flex-1 font-mono text-[10px] leading-[1.7] text-instrument-muted">
            {chain.map((joint, index) => (
              <li
                key={joint.name}
                className={
                  index === chain.length - 1
                    ? 'flex items-baseline justify-between gap-2 text-on-instrument'
                    : 'flex items-baseline justify-between gap-2'
                }
              >
                <span className="min-w-0 truncate">{joint.name}</span>
                <span className="tabular-nums">{joint.travelDeg}&deg;</span>
              </li>
            ))}
          </ul>
        </div>
      </Surface>
      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="table"
        summary="Joint travel declared by the shipped URDF"
        rowHeader="joint"
        columns={[
          { header: 'lower', numeric: true },
          { header: 'upper', numeric: true },
        ]}
        rows={chain.map((joint) => ({
          label: joint.name,
          values: [`${joint.lowerDeg}\u00B0`, `${joint.upperDeg}\u00B0`],
        }))}
        description={description}
      />
    </div>
  );
}
