'use client';

import { useId, useMemo, useState } from 'react';
import {
  Badge,
  ChartDescription,
  ControlLabel,
  InstrumentFrame,
  InstrumentHeader,
  InstrumentReset,
  PlotStage,
} from '@/components/ui';
import {
  CREDIT_ASSIGNMENT,
  EPISODE_LENGTH_S,
  VALUE_TRACE,
  segmentAt,
  taggedSegments,
  valueAt,
  type TaggedSegment,
} from '@/lib/advantage-episode';
import { cx } from '@/lib/utils';

/**
 * Deterministic teaching toy inspired by the Recap companion blog's
 * portafilter illustration. The forty-second episode, twenty-second arc,
 * positive arbitrary score and stage-difference tags are invented here.
 * They are not recorded measurements or the paper's reward-inclusive
 * n-step estimator, task threshold, negative value scale or failure penalty.
 * Conditioning illustrates a requested distribution, not guaranteed removal
 * of a failure. Numeric calculations and interaction controls are unchanged.
 */
type View = 'episode' | 'training' | 'execution';

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'episode', label: 'Episode' },
  { id: 'training', label: 'Training data' },
  { id: 'execution', label: 'At execution' },
];

const WIDTH = 720;
const LEFT = 44;
const RIGHT_PAD = 12;
const STAGE_TOP = 30;
const STAGE_HEIGHT = 24;
const PLOT_TOP = 72;
const PLOT_BOTTOM = 184;
const AXIS_Y = 200;
const HEIGHT = 208;
const V_MIN = 5;
const V_MAX = 45;

const TAG_FILL: Record<TaggedSegment['tag'], string> = {
  high: 'color-mix(in srgb, var(--color-ok) 12%, transparent)',
  low: 'color-mix(in srgb, var(--color-err) 12%, transparent)',
};
const TAG_STROKE: Record<TaggedSegment['tag'], string> = {
  high: 'var(--color-ok)',
  low: 'var(--color-err)',
};

/**
 * The tag is an outline style before it is a colour: a stage whose value
 * rises is boxed with a closed line, a stage whose value falls is boxed with
 * a broken one. The legend below the chart names the styles, not the hues.
 */
const TAG_DASH: Record<TaggedSegment['tag'], string | undefined> = {
  high: undefined,
  low: '4 2.5',
};

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function x(tS: number): number {
  const span = WIDTH - LEFT - RIGHT_PAD;
  return f(LEFT + (tS / EPISODE_LENGTH_S) * span);
}

function y(v: number): number {
  const frac = (v - V_MIN) / (V_MAX - V_MIN);
  return f(PLOT_BOTTOM - frac * (PLOT_BOTTOM - PLOT_TOP));
}

function tracePoints(upToS: number): string {
  const points: string[] = [];
  for (const point of VALUE_TRACE) {
    if (point.t > upToS) break;
    points.push(`${x(point.t)},${y(point.v)}`);
  }
  points.push(`${x(upToS)},${y(valueAt(upToS))}`);
  return points.join(' ');
}

function formatDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
}

export function AdvantageScrubber({ className }: { className?: string }) {
  const descriptionId = `${useId()}-adv-description`;
  const [view, setView] = useState<View>('episode');
  const [playhead, setPlayhead] = useState(0);

  const tagged = taggedSegments();
  const current = tagged.find((s) => s.id === segmentAt(playhead).id)!;
  const value = valueAt(playhead);
  const highCount = tagged.filter((s) => s.tag === 'high').length;
  const lowCount = tagged.length - highCount;

  const sampleRows = useMemo(() => {
    const times = [...new Set([0, 8, 16, 26, 32, EPISODE_LENGTH_S, playhead])].sort(
      (a, b) => a - b,
    );
    return times.map((t) => ({
      label: `${t}`,
      values: [
        valueAt(t).toFixed(1),
        segmentAt(t).label,
        t === playhead ? 'playhead' : 'off',
      ],
    }));
  }, [playhead]);

  // One description per view: the episode sentence names the dashed arc,
  // the tinted stage blocks and the playhead, and those elements render
  // only in the episode view. The training and execution views get
  // sentences (and disclosure samples) naming what they actually render.
  const descriptionText =
    view === 'episode'
      ? `At t = ${playhead.toFixed(1)} s this teaching toy shows an arbitrary value score of ${value.toFixed(1)} in the ${current.label} segment, tagged ${current.tag} advantage because its score changes by ${formatDelta(current.delta)}. The dashed arc links a fictional insertion failure at ${CREDIT_ASSIGNMENT.failureAtS} s to a grasp ${CREDIT_ASSIGNMENT.failureAtS - CREDIT_ASSIGNMENT.blamedAtS} s earlier. The tinted stage blocks show these fictional stage tags. Its timings, values and stage-difference tags are illustrative, not a measured Recap episode or its reward-inclusive, task-thresholded advantage estimator.`
      : view === 'training'
        ? `The toy training-data view keeps all ${tagged.length} transitions between fictional stage endpoints, ${highCount} tagged high advantage and ${lowCount} low advantage; every stage stays in the dataset with a tag derived from endpoint scores, not Recap’s reward-inclusive, task-thresholded estimator.`
        : `At execution the policy is asked for the high-advantage tag: this toy displays ${highCount} high-tag examples and ${lowCount} low-tag examples among ${tagged.length} stages. These labels show requested conditioning, not predicted outcomes or guaranteed failure removal.`;

  const viewTable =
    view === 'episode'
      ? {
          summary: 'Toy value along the fictional espresso episode',
          rowHeader: 'time (s)',
          columns: [
            { header: 'value', numeric: true },
            { header: 'segment', numeric: false },
            { header: 'playhead', numeric: false },
          ],
          rows: sampleRows,
        }
      : view === 'training'
        ? {
            summary: 'Training transitions kept with their advantage tags',
            rowHeader: 'stage',
            columns: [
              { header: 'delta V', numeric: true },
              { header: 'tag', numeric: false },
            ],
            rows: tagged.map((segment) => ({
              label: segment.label,
              values: [
                formatDelta(segment.delta),
                `${segment.tag} advantage`,
              ] as Array<string | number>,
            })),
          }
        : {
            summary: 'Execution treatment of each stage',
            rowHeader: 'stage',
            columns: [
              { header: 'tag', numeric: false },
              { header: 'treatment', numeric: false },
            ],
            rows: tagged.map((segment) => ({
              label: segment.label,
              values: [
                `${segment.tag} advantage`,
                segment.tag === 'high'
                  ? 'high-tag example'
                  : 'low-tag example',
              ] as Array<string | number>,
            })),
          };

  function reset() {
    setView('episode');
    setPlayhead(0);
  }

  return (
    <InstrumentFrame className={className}>
      <InstrumentHeader
        role="group"
        aria-label="Select a view"
        className="gap-1.5"
        meta="espresso episode, one failed attempt"
      >
        {VIEWS.map((v) => (
          <button
            data-brand-control-id="control:selection"
            key={v.id}
            type="button"
            aria-pressed={v.id === view}
            onClick={() => setView(v.id)}
            className={cx(
              'rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
              v.id === view
                ? 'border-accent text-text'
                : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
            )}
          >
            {v.label}
          </button>
        ))}
        <InstrumentReset onClick={reset} />
      </InstrumentHeader>

      <p className="mt-3 font-sans text-xs leading-relaxed text-text-dim">
        Teaching toy, not a measured Recap episode: the 40 s timeline,
        20 s arc, positive arbitrary values and stage-difference tags are
        illustrative. Real Recap uses reward-inclusive estimates, a
        task-dependent threshold and a failure penalty. Conditioning does
        not guarantee that low-tag behavior is eliminated.
      </p>

      {view === 'episode' && (
        <>
          <div className="mt-3">
            <ControlLabel
              htmlFor="advantage-playhead"
              value={
                <span aria-live="polite">
                  <span data-testid="time-readout">
                    t = {playhead.toFixed(1)} s
                  </span>
                  {'  '}
                  <span data-testid="value-readout">
                    V = {value.toFixed(1)}
                  </span>
                </span>
              }
            >
              Episode time
            </ControlLabel>
            <input
              id="advantage-playhead"
              type="range"
              data-brand-control-id="control:input"
              min={0}
              max={EPISODE_LENGTH_S}
              step={0.5}
              value={playhead}
              aria-label={`Episode time in seconds, currently ${playhead.toFixed(1)}`}
              aria-valuetext={`${playhead.toFixed(1)} seconds`}
              onChange={(e) => setPlayhead(Number(e.target.value))}
              className="mt-2 w-full accent-accent"
            />
          </div>

          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Value-function trace over a 40 second espresso episode. Playhead at ${playhead.toFixed(1)} seconds in the ${current.label} segment, tagged ${current.tag} advantage.`}
            aria-describedby={descriptionId}
            className="mt-2"
          >
            {/* Credit-assignment arc: failure at insertion blamed on the grasp. */}
            <path
              d={`M ${x(CREDIT_ASSIGNMENT.failureAtS)} ${STAGE_TOP - 2} C ${x(CREDIT_ASSIGNMENT.failureAtS)} 14, ${x(CREDIT_ASSIGNMENT.blamedAtS)} 14, ${x(CREDIT_ASSIGNMENT.blamedAtS)} ${STAGE_TOP - 6}`}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1.25}
              strokeDasharray="4 3"
            />
            <text
              data-testid="credit-annotation"
              x={(x(CREDIT_ASSIGNMENT.blamedAtS) + x(CREDIT_ASSIGNMENT.failureAtS)) / 2}
              y={8}
              textAnchor="middle"
              fill="var(--color-accent)"
              fontSize={9}
              fontFamily="var(--font-mono)"
            >
              failure blamed on the grasp, 20 s earlier
            </text>

            {/* Stage blocks, tinted by advantage tag. */}
            {tagged.map((segment) => (
              <g key={segment.id}>
                <rect
                  x={x(segment.start)}
                  y={STAGE_TOP}
                  width={f(x(segment.end) - x(segment.start))}
                  height={STAGE_HEIGHT}
                  fill={TAG_FILL[segment.tag]}
                  stroke={TAG_STROKE[segment.tag]}
                  strokeWidth={1}
                  strokeDasharray={TAG_DASH[segment.tag]}
                />
                <text
                  x={(x(segment.start) + x(segment.end)) / 2}
                  y={STAGE_TOP + STAGE_HEIGHT / 2 + 3}
                  textAnchor="middle"
                  fill="var(--color-text)"
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                >
                  {segment.label}
                </text>
              </g>
            ))}

            {/* Value trace: full trace dim, elapsed portion in signal blue. */}
            <line
              x1={LEFT}
              x2={WIDTH - RIGHT_PAD}
              y1={PLOT_BOTTOM}
              y2={PLOT_BOTTOM}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <polyline
              points={tracePoints(EPISODE_LENGTH_S)}
              fill="none"
              stroke="var(--color-border-strong)"
              strokeWidth={1.25}
            />
            {playhead > 0 && (
              <polyline
                points={tracePoints(playhead)}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
              />
            )}
            <text
              x={LEFT - 6}
              y={PLOT_TOP + 3}
              textAnchor="end"
              fill="var(--color-text-dim)"
              fontSize={9}
              fontFamily="var(--font-mono)"
            >
              V(s)
            </text>

            {/* Playhead. */}
            <line
              x1={x(playhead)}
              x2={x(playhead)}
              y1={STAGE_TOP}
              y2={PLOT_BOTTOM}
              stroke="var(--color-accent)"
              strokeWidth={1.5}
            />
            <circle
              cx={x(playhead)}
              cy={y(value)}
              r={3.5}
              fill="var(--color-accent)"
            />

            {/* Time axis. Rightmost label anchors end so it never clips. */}
            {[0, 10, 20, 30, EPISODE_LENGTH_S].map((t) => (
              <text
                key={t}
                x={x(t)}
                y={AXIS_Y}
                textAnchor={
                  t === EPISODE_LENGTH_S
                    ? 'end'
                    : t === 0
                      ? 'start'
                      : 'middle'
                }
                fill="var(--color-text-dim)"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {`${t} s`}
              </text>
            ))}
          </PlotStage>

          <p className="mt-1 font-mono text-[10px] text-text-dim">
            solid outline: value rises, high advantage. dashed outline: value
            falls, low advantage. the elapsed value trace is the heavier line
            from the left. trace shape is illustrative, after the Recap
            portafilter example.
          </p>

          <p className="mt-3 font-mono text-xs text-text">
            Current segment:{' '}
            <span data-testid="segment-readout">
              {current.label}: {current.tag} advantage (
              {formatDelta(current.delta)})
            </span>
          </p>

          <ul className="mt-2 divide-y divide-border">
            {tagged.map((segment) => (
              <li
                key={segment.id}
                data-testid={`segment-row-${segment.id}`}
                className={cx(
                  'py-2',
                  segment.id === current.id && 'bg-surface-2',
                )}
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-xs text-text">
                    {segment.label}
                  </span>
                  <span className="font-mono text-[10px] text-text-dim">
                    {segment.start}-{segment.end} s
                  </span>
                  <span
                    className={cx(
                      'font-mono text-xs',
                      segment.tag === 'high' ? 'text-ok' : 'text-err',
                    )}
                  >
                    {formatDelta(segment.delta)}
                  </span>
                  <span className="ml-auto">
                    <Badge variant={segment.tag === 'high' ? 'ok' : 'err'}>
                      {segment.tag} advantage
                    </Badge>
                  </span>
                </div>
                <p className="mt-0.5 font-sans text-xs leading-relaxed text-text-dim">
                  {segment.note}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="table"
        summary={viewTable.summary}
        rowHeader={viewTable.rowHeader}
        columns={viewTable.columns}
        rows={viewTable.rows}
        description={descriptionText}
      />

      {view === 'training' && (
        <div data-testid="training-view" className="mt-3">
          <p className="font-mono text-xs text-text">
            {tagged.length} transitions kept: {highCount} high advantage,{' '}
            {lowCount} low advantage
          </p>
          <p className="mt-1 font-sans text-xs leading-relaxed text-text-dim">
            This toy keeps each stage and labels the sign of its score
            change. That illustrates retaining good and bad data, but it is
            not Recap’s estimator: the report includes rewards and a
            task-dependent threshold, forces human corrections positive,
            and sometimes drops the indicator during training.
          </p>
          <ul className="mt-3 divide-y divide-border">
            {tagged.map((segment) => (
              <li
                key={segment.id}
                data-testid={`training-row-${segment.id}`}
                className="flex flex-wrap items-center gap-x-3 py-2"
              >
                <span className="font-mono text-xs text-text">
                  {segment.label}
                </span>
                <span className="font-mono text-[10px] text-text-dim">
                  {segment.start}-{segment.end} s
                </span>
                <span className="font-mono text-[10px] text-text-dim">
                  delta V {formatDelta(segment.delta)}
                </span>
                <span className="ml-auto">
                  <Badge variant={segment.tag === 'high' ? 'ok' : 'err'}>
                    tag: {segment.tag} advantage
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === 'execution' && (
        <div data-testid="execution-view" className="mt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim">
              Conditioning
            </span>
            <Badge>task: make espresso</Badge>
            <Badge variant="accent">advantage: high</Badge>
          </div>
          <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
            The default Recap evaluation samples the positive-conditioned
            policy. The labels below are toy training examples, not a
            prediction that each high-tag stage will occur or each low-tag
            stage will disappear.
          </p>
          <ul className="mt-3 divide-y divide-border">
            {tagged.map((segment) => {
              const active = segment.tag === 'high';
              return (
                <li
                  key={segment.id}
                  data-testid={`execution-row-${segment.id}`}
                  data-active={active}
                  className={cx(
                    'flex flex-wrap items-center gap-x-3 py-2',
                    !active && 'opacity-40',
                  )}
                >
                  <span className="font-mono text-xs text-text">
                    {segment.label}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-text-dim">
                    {active ? 'high-tag example' : 'low-tag example'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </InstrumentFrame>
  );
}
