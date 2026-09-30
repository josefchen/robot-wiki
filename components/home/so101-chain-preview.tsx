import {
  FIGURE_TEXT_CLASS,
  FigureFrame,
  FigureStage,
  StageNumber,
} from '@/components/motion/figure-frame';
import { ChartDescription } from '@/components/ui/chart-description';
import type { So101Preview } from '@/lib/so101-kinematics';
import { cx } from '@/lib/utils';

/**
 * The home entry point's preview of the shipped SO-101 (`VAL-DESIGN-013`).
 *
 * Everything drawn here is derived from `public/models/so101/so101.urdf` by
 * `lib/so101-kinematics.ts`: the polyline is the model's own zero
 * configuration projected onto its sagittal plane, and the list beside it
 * is the model's revolute joints in chain order with their declared travel.
 * Nothing is placed by eye, so a model change moves the drawing instead of
 * leaving a decorative arm that once resembled it.
 *
 * It sits in the shared figure frame, and the stage alone is the `figure`
 * element: the playground card's evidence reads the figure's registered
 * surface and the numbers printed on it. The chart description (the
 * derived sentence and the joint-limit table) follows the frame rather
 * than joining its one caption line. The stage marks stay
 * concrete/white/lime: signal blue measures 2.7:1 against graphite, below
 * the 3:1 essential-boundary floor `VAL-B2-A11Y-014` names.
 */

type So101ChainPreviewProps = {
  preview: So101Preview;
  /** Shared with the drawing's `aria-describedby`. */
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
  const muted = 'var(--color-instrument-muted)';

  const frame = (
    <FigureFrame
      as="div"
      figureId="preview:so101-arm"
      heading="SO-101 arm at its zero pose"
      caption="Drawn from the model file the playground loads, with each joint's travel."
      stage={
        <FigureStage as="figure" className="p-3">
          {/* Stacked until there is room for both: side by side, the
              drawing's fixed aspect and the list's shortest joint name
              together set a minimum width wider than a 320px viewport. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="shrink-0">
              <svg
                viewBox={geometry.viewBox}
                role="img"
                aria-label={`Side view of the shipped SO-101 arm at its zero configuration, ${chain.length} revolute joints from the base to the gripper`}
                aria-describedby={descriptionId}
                className="block h-36 w-auto text-on-instrument"
              >
                <line
                  x1={base.x - 10}
                  x2={geometry.width - 12}
                  y1={geometry.groundY}
                  y2={geometry.groundY}
                  stroke={muted}
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
                  fill={muted}
                />
                {joints.map((joint) => (
                  <circle
                    key={joint.name}
                    cx={joint.x}
                    cy={joint.y}
                    r={3.5}
                    fill="var(--color-instrument)"
                    stroke={muted}
                    strokeWidth={1.5}
                  />
                ))}
                {/* The end effector. Ringed in the stage ink as well as
                    filled, so forced colours, which leave SVG fills alone,
                    still leave a marked tip rather than a lime dot. */}
                <circle
                  cx={tip.x}
                  cy={tip.y}
                  r={4}
                  fill="var(--role-highlight-stage)"
                  stroke="currentColor"
                  strokeWidth={1.5}
                />
                <line
                  x1={geometry.scaleBar.x1}
                  x2={geometry.scaleBar.x2}
                  y1={geometry.scaleBar.y}
                  y2={geometry.scaleBar.y}
                  stroke={muted}
                  strokeWidth={1}
                />
                {[geometry.scaleBar.x1, geometry.scaleBar.x2].map((x) => (
                  <line
                    key={x}
                    x1={x}
                    x2={x}
                    y1={geometry.scaleBar.y - 3}
                    y2={geometry.scaleBar.y + 3}
                    stroke={muted}
                    strokeWidth={1}
                  />
                ))}
              </svg>
              <p className={cx(FIGURE_TEXT_CLASS.stage, 'mt-1 text-instrument-muted')}>
                Scale bar <StageNumber>{geometry.scaleBar.labelMm} mm</StageNumber>
              </p>
            </div>
            <ul className={cx(FIGURE_TEXT_CLASS.stage, 'min-w-0 flex-1 leading-[1.7] text-instrument-muted')}>
              {chain.map((joint, index) => (
                <li
                  key={joint.name}
                  className={cx(
                    'flex items-baseline justify-between gap-2',
                    index === chain.length - 1 && 'text-on-instrument',
                  )}
                >
                  <span className="min-w-0 truncate">{joint.name}</span>
                  <StageNumber>{joint.travelDeg}&deg;</StageNumber>
                </li>
              ))}
            </ul>
          </div>
        </FigureStage>
      }
    />
  );

  return (
    <div className={className}>
      {frame}
      <ChartDescription
        id={descriptionId}
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
