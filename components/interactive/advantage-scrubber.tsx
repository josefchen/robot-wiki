'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  roleColour,
} from '@/components/motion/chart';
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

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 8, right: 332 };
const NOTE_BASELINE = 17;
const ARC_APEX_CONTROL = 20;
const STAGE_TOP = 42;
const STAGE_HEIGHT = 18;
/** Segment labels stagger over two rows under the stage band; at 340 wide they cannot sit inside it. */
const LABEL_ROW = [76, 94];
const PLOT_TOP = 106;
const PLOT_BOTTOM = 196;
const AXIS_Y = 200;
const TICK_BASELINE = AXIS_Y + CHART_STROKE.tickLength + CHART_TYPE.tickPx + 2;
const HEIGHT = TICK_BASELINE + 8;
const V_MIN = 5;
const V_MAX = 45;

/**
 * The tag is an outline style before it is a colour: a stage whose value
 * rises is a value-tinted block with a closed line, a stage whose value
 * falls is an untinted block with a broken one. The legend names the
 * styles, not the hues.
 */
const TAG_DASH: Record<TaggedSegment['tag'], string | undefined> = {
  high: undefined,
  low: '4 2.5',
};
const TAG_FILL_OPACITY: Record<TaggedSegment['tag'], number> = {
  high: 0.3,
  low: 0,
};

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function x(tS: number): number {
  return f(PLOT.left + (tS / EPISODE_LENGTH_S) * (PLOT.right - PLOT.left));
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

/** A stage block in miniature, for the legend and the rows. */
function TagSwatch({ tag }: { tag: TaggedSegment['tag'] }) {
  const h = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={h} height={h} viewBox={`0 0 ${h} ${h}`} className="shrink-0">
      <rect
        x={0.5}
        y={0.5}
        width={h - 1}
        height={h - 1}
        fill={roleColour('value')}
        fillOpacity={TAG_FILL_OPACITY[tag]}
        stroke={CHART_STRUCTURE.axes}
        strokeWidth={CHART_STROKE.structure}
        strokeDasharray={tag === 'low' ? '2 1.5' : undefined}
      />
    </svg>
  );
}

function PlayheadSwatch() {
  const h = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={h} height={h} viewBox={`0 0 ${h} ${h}`} className="shrink-0">
      <circle cx={h / 2} cy={h / 2} r={CHART_STROKE.markerRadius} fill={roleColour('highlight')} />
    </svg>
  );
}

// Each row draws its own top rule: a bordered list between the rows and the
// stage would turn the rows' rules into page dividers (VAL-DESIGN-018).
const ROW_LIST =
  'm-0! basis-full list-none p-0! font-sans text-[13px] *:border-t *:border-t-border-strong';

export function AdvantageScrubber({ className }: { className?: string }) {
  const descriptionId = `${useId()}-adv-description`;
  const [view, setView] = useState<View>('episode');
  const [playhead, setPlayhead] = useState(0);

  const tagged = taggedSegments();
  const current = tagged.find((s) => s.id === segmentAt(playhead).id)!;
  const value = valueAt(playhead);
  const highCount = tagged.filter((s) => s.tag === 'high').length;
  const lowCount = tagged.length - highCount;
  const valueColour = roleColour('value');
  const highlight = roleColour('highlight');

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

  // Declared ahead of the plot: the accessible-name baseline seals
  // aria-label expressions by their order in this file.
  const controls = (
    <>
      <div
        role="group"
        aria-label="Select a view"
        className="flex flex-wrap items-center gap-1"
      >
        {VIEWS.map((v) => (
          <button
            data-brand-control-id="control:selection"
            key={v.id}
            type="button"
            aria-pressed={v.id === view}
            onClick={() => setView(v.id)}
            className={INSTRUMENT_TOGGLE_CLASS}
          >
            {v.label}
          </button>
        ))}
        <InstrumentReset onClick={reset} />
      </div>
      {/* The slider stays mounted in every view, disabled outside the
          episode, so switching views never reflows the header and moves
          the view buttons out from under the pointer. */}
      <ControlField>
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
          disabled={view !== 'episode'}
          onChange={(e) => setPlayhead(Number(e.target.value))}
          className={cx(INSTRUMENT_SLIDER_CLASS, 'disabled:cursor-not-allowed disabled:opacity-40')}
        />
      </ControlField>
    </>
  );

  const tagLegend = (
    <>
      <LegendItem series="high" swatch={<TagSwatch tag="high" />}>
        value rises: high advantage
      </LegendItem>
      <LegendItem series="low" swatch={<TagSwatch tag="low" />}>
        value falls: low advantage
      </LegendItem>
    </>
  );

  const description = (
    <ChartDescription
      id={descriptionId}
      form="table"
      summary={viewTable.summary}
      rowHeader={viewTable.rowHeader}
      columns={viewTable.columns}
      rows={viewTable.rows}
      description={descriptionText}
    />
  );

  const episodePlot = (
    <PlotStage
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-label={`Value-function trace over a 40 second espresso episode. Playhead at ${playhead.toFixed(1)} seconds in the ${current.label} segment, tagged ${current.tag} advantage.`}
      aria-describedby={descriptionId}
    >
      {/* Credit-assignment arc: failure at insertion blamed on the grasp. */}
      <path
        d={`M ${x(CREDIT_ASSIGNMENT.failureAtS)} ${STAGE_TOP - 2} C ${x(CREDIT_ASSIGNMENT.failureAtS)} ${ARC_APEX_CONTROL}, ${x(CREDIT_ASSIGNMENT.blamedAtS)} ${ARC_APEX_CONTROL}, ${x(CREDIT_ASSIGNMENT.blamedAtS)} ${STAGE_TOP - 2}`}
        fill="none"
        stroke={CHART_STRUCTURE.label}
        strokeWidth={CHART_STROKE.reference}
        strokeDasharray={CHART_STROKE.dash}
      />
      <text
        data-testid="credit-annotation"
        data-scene-tick=""
        x={f((x(CREDIT_ASSIGNMENT.blamedAtS) + x(CREDIT_ASSIGNMENT.failureAtS)) / 2)}
        y={NOTE_BASELINE}
        textAnchor="middle"
        fontSize={CHART_TYPE.tickPx}
        fill={CHART_STRUCTURE.label}
      >
        failure blamed on the grasp, 20 s earlier
      </text>

      {/* Stage blocks: value-tinted and closed when the score rises, broken when it falls. */}
      {tagged.map((segment, i) => {
        const left = x(segment.start);
        const right = x(segment.end);
        const centre = f((left + right) / 2);
        const row = i % 2;
        const last = i === tagged.length - 1;
        return (
          <g key={segment.id} data-series={segment.tag}>
            <rect
              x={f(left + 1)}
              y={STAGE_TOP}
              width={f(right - left - 2)}
              height={STAGE_HEIGHT}
              fill={valueColour}
              fillOpacity={TAG_FILL_OPACITY[segment.tag]}
              stroke={CHART_STRUCTURE.axes}
              strokeWidth={CHART_STROKE.structure}
              strokeDasharray={TAG_DASH[segment.tag]}
            />
            {row === 1 ? (
              <line
                x1={centre}
                x2={centre}
                y1={STAGE_TOP + STAGE_HEIGHT + 1}
                y2={LABEL_ROW[1] - CHART_TYPE.tickPx - 3}
                fill="none"
                stroke={CHART_STRUCTURE.axes}
                strokeOpacity={CHART_STRUCTURE.axesOpacity}
                strokeWidth={CHART_STROKE.structure}
              />
            ) : null}
            <text
              data-scene-tick=""
              x={last ? PLOT.right : centre}
              y={LABEL_ROW[row]}
              textAnchor={last ? 'end' : 'middle'}
              fontSize={CHART_TYPE.tickPx}
              fill={CHART_STRUCTURE.label}
            >
              {segment.label}
            </text>
          </g>
        );
      })}

      {/* Value trace: the full episode faint, the elapsed part at trace weight. */}
      <polyline
        data-series="value"
        points={tracePoints(EPISODE_LENGTH_S)}
        fill="none"
        stroke={valueColour}
        strokeOpacity={0.45}
        strokeWidth={CHART_STROKE.structure}
      />
      {playhead > 0 && (
        <polyline
          data-series="value"
          points={tracePoints(playhead)}
          fill="none"
          stroke={valueColour}
          strokeWidth={CHART_STROKE.trace}
          strokeLinejoin="round"
        />
      )}

      {/* Time axis. The end labels anchor inward so they never clip. */}
      <line
        x1={PLOT.left}
        x2={PLOT.right}
        y1={AXIS_Y}
        y2={AXIS_Y}
        stroke={CHART_STRUCTURE.axes}
        strokeOpacity={CHART_STRUCTURE.axesOpacity}
        strokeWidth={CHART_STROKE.structure}
      />
      {[0, 10, 20, 30, EPISODE_LENGTH_S].map((t) => (
        <g key={t}>
          <line
            x1={x(t)}
            x2={x(t)}
            y1={AXIS_Y}
            y2={AXIS_Y + CHART_STROKE.tickLength}
            stroke={CHART_STRUCTURE.axes}
            strokeOpacity={CHART_STRUCTURE.axesOpacity}
            strokeWidth={CHART_STROKE.structure}
          />
          <text
            data-scene-tick=""
            x={x(t)}
            y={TICK_BASELINE}
            textAnchor={t === EPISODE_LENGTH_S ? 'end' : t === 0 ? 'start' : 'middle'}
            fontSize={CHART_TYPE.tickPx}
            fill={CHART_STRUCTURE.labelSecondary}
          >
            {`${t} s`}
          </text>
        </g>
      ))}

      {/* Playhead: a mark on the stage band, the current value on the
          trace and a tick on the time axis, so it never runs through a label. */}
      <g data-chart-mark="playhead" data-chart-role="highlight">
        <line
          x1={x(playhead)}
          x2={x(playhead)}
          y1={STAGE_TOP - 1}
          y2={STAGE_TOP + STAGE_HEIGHT + 1}
          stroke={highlight}
          strokeWidth={CHART_STROKE.trace}
        />
        <circle cx={x(playhead)} cy={y(value)} r={CHART_STROKE.markerRadius} fill={highlight} />
        <line
          x1={x(playhead)}
          x2={x(playhead)}
          y1={AXIS_Y - 4}
          y2={AXIS_Y + CHART_STROKE.tickLength}
          stroke={highlight}
          strokeWidth={CHART_STROKE.trace}
        />
      </g>
    </PlotStage>
  );

  const trainingView = (
    <div data-testid="training-view" className="px-3 pt-3 font-sans text-[13px]">
      <p className="m-0 text-sm text-text">
        {tagged.length} transitions kept: {highCount} high advantage,{' '}
        {lowCount} low advantage
      </p>
      <p className="mt-1 max-w-[65ch] leading-relaxed text-text-dim">
        This toy keeps each stage and labels the sign of its score change.
        Recap’s estimator also counts rewards, applies a task-dependent
        threshold, forces human corrections positive and sometimes drops the
        indicator during training.
      </p>
      <ul className={cx(ROW_LIST, 'mt-2!')}>
        {tagged.map((segment) => (
          <li
            key={segment.id}
            data-testid={`training-row-${segment.id}`}
            className="my-0! flex flex-wrap items-center gap-x-3 py-2"
          >
            <TagSwatch tag={segment.tag} />
            <span className="font-medium text-text">{segment.label}</span>
            <span className="text-text-dim">
              {segment.start}-{segment.end} s
            </span>
            <span className="text-text-dim">delta V {formatDelta(segment.delta)}</span>
            <span className="ml-auto text-text">tag: {segment.tag} advantage</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const executionView = (
    <div data-testid="execution-view" className="px-3 pt-3 font-sans text-[13px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-text-dim">Conditioning</span>
        <span className="rounded-sm border border-border-strong px-1.5 py-0.5 text-text">
          task: make espresso
        </span>
        <span className="rounded-sm border border-border-strong px-1.5 py-0.5 text-text">
          advantage: high
        </span>
      </div>
      <p className="mt-2 max-w-[65ch] leading-relaxed text-text-dim">
        The default Recap evaluation samples the positive-conditioned policy.
        The rows below are toy training examples; they predict no stage
        outcome.
      </p>
      <ul className={cx(ROW_LIST, 'mt-2!')}>
        {tagged.map((segment) => {
          const active = segment.tag === 'high';
          return (
            <li
              key={segment.id}
              data-testid={`execution-row-${segment.id}`}
              data-active={active}
              className="my-0! flex flex-wrap items-center gap-x-3 py-2"
            >
              <TagSwatch tag={segment.tag} />
              <span className={active ? 'font-medium text-text' : 'text-text-dim'}>
                {segment.label}
              </span>
              <span className={cx('ml-auto', active ? 'text-text' : 'text-text-dim')}>
                {active ? 'high-tag example' : 'low-tag example'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const episodeFooter = (
    <>
      <InstrumentLegend>
        {tagLegend}
        <LegendItem series="value" swatch={<LegendSwatch role="value" mark="line" />}>
          value score, heavier up to the playhead
        </LegendItem>
        <LegendItem swatch={<PlayheadSwatch />}>playhead, current time</LegendItem>
      </InstrumentLegend>
      <InstrumentReadout className="basis-full">
        <span className="text-text-dim">Current segment:</span>{' '}
        <span data-testid="segment-readout">
          {current.label}: {current.tag} advantage ({formatDelta(current.delta)})
        </span>
      </InstrumentReadout>
      <ul className={ROW_LIST}>
        {tagged.map((segment) => {
          const isCurrent = segment.id === current.id;
          return (
            <li
              key={segment.id}
              data-testid={`segment-row-${segment.id}`}
              data-current={isCurrent ? 'true' : 'false'}
              className={cx(
                'my-0! border-l-2 py-2 pl-2',
                isCurrent ? 'border-l-highlight' : 'border-l-transparent',
              )}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <TagSwatch tag={segment.tag} />
                <span className="font-medium text-text">{segment.label}</span>
                <span className="text-text-dim">
                  {segment.start}-{segment.end} s
                </span>
                <span className="text-text">{formatDelta(segment.delta)}</span>
                <span className="ml-auto text-text-dim">{segment.tag} advantage</span>
              </div>
              <p className="mt-0.5 max-w-[65ch] leading-relaxed text-text-dim">{segment.note}</p>
            </li>
          );
        })}
      </ul>
      {description}
    </>
  );

  return (
    <InstrumentFigure
      figureId="advantage-scrubber"
      className={className}
      heading="Advantage tags on one episode"
      controls={controls}
      stage={
        <FigureStage
          footer={
            view === 'episode' ? (
              episodeFooter
            ) : (
              <>
                <InstrumentLegend>{tagLegend}</InstrumentLegend>
                {description}
              </>
            )
          }
        >
          {view === 'episode' ? episodePlot : view === 'training' ? trainingView : executionView}
        </FigureStage>
      }
      caption="The value score falls at the grasp, 20 s before the insertion failure it sets up."
      source="Teaching toy after the Recap portafilter example; timings, scores and tags are illustrative."
    />
  );
}
