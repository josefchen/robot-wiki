'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
  PresetGroup,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import { usePrefersReducedMotion } from '@/components/motion/use-reduced-motion';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
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
 * of a failure. Numeric calculations are unchanged.
 *
 * The stage draws one pictogram per step, the value score as "chance this
 * ends well" with worded ends, and one note: the arc from the failed lock
 * back to the crooked grip. It settles at the end of the episode; Play runs
 * it from the start. A two-way toggle swaps the attempt for what the robot
 * learns from it; the execution view and the time slider sit in
 * "Adjust more".
 */
type View = 'episode' | 'training' | 'execution';

const MAIN_VIEWS: Array<{ id: Exclude<View, 'execution'>; label: string }> = [
  { id: 'episode', label: 'The attempt' },
  { id: 'training', label: 'What it learns' },
];

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 8, right: 332 };
const NOTE_BASELINE = 16;
const ARC_APEX_CONTROL = 34;
const ICON_TOP = 58;
const ICON = 22;
const LABEL_ROW = [ICON_TOP + ICON + 16, ICON_TOP + ICON + 32];
const TITLE_BASELINE = 140;
const PLOT_TOP = 150;
const PLOT_BOTTOM = 236;
const AXIS_Y = 240;
const TICK_BASELINE = AXIS_Y + CHART_STROKE.tickLength + CHART_TYPE.tickPx + 2;
const HEIGHT = TICK_BASELINE + 8;
const V_MIN = 5;
const V_MAX = 45;
const PLAY_MS = 4000;

/** Plain step names, drawn under each pictogram (one or two lines). */
const STEP_LINES: Record<string, readonly string[]> = {
  reach: ['Reach'],
  grasp: ['Crooked', 'grip'],
  tamp: ['Tamp'],
  insert: ['Handle', "won't lock"],
  outcome: ['No', 'coffee'],
};

const STEP_NAME: Record<string, string> = {
  reach: 'Reach',
  grasp: 'Crooked grip',
  tamp: 'Tamp',
  insert: "Handle won't lock",
  outcome: 'No coffee',
};

const NOTE_LINES = ['The failure shows up here, but', 'the cause was this crooked grip'] as const;

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

/**
 * Where a step's pictogram and name sit: the grip sits at the moment it is
 * blamed on; the failed lock sits a little before its middle so its
 * two-line name clears "No coffee" on a phone.
 */
function stepCentre(segment: TaggedSegment): number {
  if (segment.id === CREDIT_ASSIGNMENT.failureSegmentId) return x(29.5);
  if (segment.id === CREDIT_ASSIGNMENT.blamedSegmentId) return x(CREDIT_ASSIGNMENT.blamedAtS);
  return x((segment.start + segment.end) / 2);
}

/**
 * One line pictogram per step, drawn in a 24-unit box. The portafilter is
 * a basket with a handle; the bad steps tilt it or cross it out.
 */
function StepIcon({ id, colour }: { id: string; colour: string }): ReactNode {
  const common = {
    fill: 'none',
    stroke: colour,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (id) {
    case 'reach':
      return (
        <g {...common}>
          <polyline points="3,21 10,13 18,13" />
          <polyline points="15,9.5 19.5,13 15,16.5" />
        </g>
      );
    case 'grasp':
      return (
        <g {...common}>
          <g transform="rotate(-28 12 13)">
            <path d="M3 11 h9 v4 a4.5 4.5 0 0 1 -9 0 z" />
            <line x1="12" y1="13" x2="22" y2="13" />
          </g>
          <path d="M16 3 v4 M20 3 v4 M16 3 h4" />
        </g>
      );
    case 'tamp':
      return (
        <g {...common}>
          <line x1="12" y1="2" x2="12" y2="11" />
          <rect x="7" y="11" width="10" height="3" />
          <path d="M4 15 v5 h16 v-5" />
        </g>
      );
    case 'insert':
      return (
        <g {...common}>
          <rect x="3" y="2" width="18" height="5" />
          <g transform="rotate(-18 12 14)">
            <path d="M4 11 h8 v3 a4 4 0 0 1 -8 0 z" />
            <line x1="12" y1="12.5" x2="21" y2="12.5" />
          </g>
          <path d="M16 18 l4 4 M20 18 l-4 4" />
        </g>
      );
    default:
      return (
        <g {...common}>
          <path d="M5 9 l1.5 12 h9 l1.5 -12 z" />
          <path d="M17 12 h2.5 a2.5 2.5 0 0 1 0 5 h-2" />
          <path d="M8 2 l5 5 M13 2 l-5 5" />
        </g>
      );
  }
}

/** A step pictogram as a small inline image for the HTML views. */
function InlineStepIcon({ id, bad }: { id: string; bad: boolean }) {
  return (
    <svg aria-hidden="true" focusable="false" width={22} height={22} viewBox="0 0 24 24" className="shrink-0">
      <StepIcon id={id} colour={bad ? roleColour('constraint') : CHART_STRUCTURE.label} />
    </svg>
  );
}

export function AdvantageScrubber({ className }: { className?: string }) {
  const descriptionId = `${useId()}-adv-description`;
  const [view, setView] = useState<View>('episode');
  const [playhead, setPlayhead] = useState(EPISODE_LENGTH_S);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const frame = useRef<number | null>(null);

  const tagged = taggedSegments();
  const current = tagged.find((s) => s.id === segmentAt(playhead).id)!;
  const value = valueAt(playhead);
  const highCount = tagged.filter((s) => s.tag === 'high').length;
  const lowCount = tagged.length - highCount;
  const valueColour = roleColour('value');
  const warning = roleColour('constraint');
  const highlight = roleColour('highlight');
  const failureSeen = playhead >= CREDIT_ASSIGNMENT.failureAtS;
  const settled = playhead >= EPISODE_LENGTH_S;

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  function stop() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setPlaying(false);
  }

  function play() {
    stop();
    setView('episode');
    if (reducedMotion) {
      setPlayhead(EPISODE_LENGTH_S);
      return;
    }
    setPlaying(true);
    setPlayhead(0);
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / PLAY_MS);
      setPlayhead(Math.round(progress * EPISODE_LENGTH_S * 2) / 2);
      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        frame.current = null;
        setPlaying(false);
      }
    };
    frame.current = requestAnimationFrame(step);
  }

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
  // the tinted stage columns and the playhead, and those elements render
  // only in the episode view. The training and execution views get
  // sentences (and disclosure samples) naming what they actually render.
  const descriptionText =
    view === 'episode'
      ? `At t = ${playhead.toFixed(1)} s this teaching toy shows an arbitrary value score of ${value.toFixed(1)} in the ${current.label} segment, tagged ${current.tag} advantage because its score changes by ${formatDelta(current.delta)}. The dashed arc links a fictional insertion failure at ${CREDIT_ASSIGNMENT.failureAtS} s to a grasp ${CREDIT_ASSIGNMENT.failureAtS - CREDIT_ASSIGNMENT.blamedAtS} s earlier. The tinted stage blocks are the steps tagged low advantage. Its timings, values and stage-difference tags are illustrative, not a measured Recap episode or its reward-inclusive, task-thresholded advantage estimator.`
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
    stop();
    setView('episode');
    setPlayhead(EPISODE_LENGTH_S);
  }

  // Declared ahead of the plot: the accessible-name baseline seals
  // aria-label expressions by their order in this file.
  const controls = (
    <>
      <button
        data-brand-control-id="control:selection"
        data-testid="advantage-play"
        type="button"
        onClick={playing ? stop : play}
        className={INSTRUMENT_TOGGLE_CLASS}
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <PresetGroup<string>
        label="Show"
        presets={MAIN_VIEWS}
        value={view}
        onChange={(next) => {
          stop();
          setView(next as View);
        }}
      />
    </>
  );

  const adjust = (
    <>
      <div
        role="group"
        aria-label="Select a view"
        className="flex flex-wrap items-center gap-1"
      >
        <button
          data-brand-control-id="control:selection"
          type="button"
          aria-pressed={view === 'execution'}
          onClick={() => {
            stop();
            setView(view === 'execution' ? 'episode' : 'execution');
          }}
          className={INSTRUMENT_TOGGLE_CLASS}
        >
          At execution
        </button>
      </div>
      {/* The slider stays mounted in every view, disabled outside the
          episode, so switching views never reflows the fold. */}
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
          onChange={(e) => {
            stop();
            setPlayhead(Number(e.target.value));
          }}
          className={cx(INSTRUMENT_SLIDER_CLASS, 'disabled:cursor-not-allowed disabled:opacity-40')}
        />
      </ControlField>
      <InstrumentReadout className="basis-full">
        <span className="text-text-dim">Current step:</span>{' '}
        <span data-testid="segment-readout">
          {current.label}: {current.tag} advantage ({formatDelta(current.delta)})
        </span>
      </InstrumentReadout>
      <div>
        <InstrumentReset onClick={reset} />
      </div>
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

  const arcLeft = x(CREDIT_ASSIGNMENT.blamedAtS);
  const arcRight = stepCentre(tagged.find((s) => s.id === CREDIT_ASSIGNMENT.failureSegmentId)!);
  const arcEndY = ICON_TOP - 4;

  const episodePlot = (
    <PlotStage
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-label={`Value-function trace over a 40 second espresso episode. Playhead at ${playhead.toFixed(1)} seconds in the ${current.label} segment, tagged ${current.tag} advantage.`}
      aria-describedby={descriptionId}
    >
      {/* The note and its arc appear once the failure has shown. */}
      {failureSeen ? (
        <g data-figure-annotation="">
          <path
            d={`M ${arcRight} ${arcEndY} C ${arcRight} ${ARC_APEX_CONTROL}, ${arcLeft} ${ARC_APEX_CONTROL}, ${arcLeft} ${arcEndY}`}
            fill="none"
            stroke={highlight}
            strokeWidth={CHART_STROKE.structure * 2}
            strokeDasharray={CHART_STROKE.dash}
          />
          <polyline
            points={`${f(arcLeft - 3.5)},${arcEndY - 5} ${arcLeft},${arcEndY} ${f(arcLeft + 3.5)},${arcEndY - 5}`}
            fill="none"
            stroke={highlight}
            strokeWidth={CHART_STROKE.structure * 2}
          />
          <text
            data-testid="credit-annotation"
            x={f((arcLeft + arcRight) / 2)}
            y={NOTE_BASELINE}
            textAnchor="middle"
            fontSize={CHART_TYPE.labelPx}
            fontWeight={600}
            fill={highlight}
          >
            {NOTE_LINES.map((line, i) => (
              <tspan key={line} x={f((arcLeft + arcRight) / 2)} dy={i === 0 ? 0 : '1.2em'}>
                {line}
              </tspan>
            ))}
          </text>
        </g>
      ) : null}

      {/* One pictogram per step; the steps that hurt take the warning colour
          and tint their stretch of the plot. */}
      {tagged.map((segment, i) => {
        const centre = stepCentre(segment);
        const bad = segment.tag === 'low';
        const reached = playhead >= segment.start || settled;
        const lines = STEP_LINES[segment.id] ?? [segment.label];
        const last = i === tagged.length - 1;
        const labelX = last ? PLOT.right : centre;
        return (
          <g
            key={segment.id}
            data-series={segment.tag}
            data-step={segment.id}
            opacity={reached ? 1 : 0.35}
          >
            {bad ? (
              <rect
                x={f(x(segment.start) + 1)}
                y={PLOT_TOP}
                width={f(x(segment.end) - x(segment.start) - 2)}
                height={PLOT_BOTTOM - PLOT_TOP}
                fill={warning}
                fillOpacity={0.1}
              />
            ) : null}
            <g transform={`translate(${f(centre - ICON / 2)} ${ICON_TOP}) scale(${ICON / 24})`}>
              <StepIcon id={segment.id} colour={bad ? warning : CHART_STRUCTURE.label} />
            </g>
            <text
              data-scene-tick=""
              x={labelX}
              y={LABEL_ROW[0]}
              textAnchor={last ? 'end' : 'middle'}
              fontSize={CHART_TYPE.tickPx}
              fill={CHART_STRUCTURE.label}
            >
              {lines.map((line, j) => (
                <tspan key={line} x={labelX} dy={j === 0 ? 0 : '1.15em'}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}

      {/* The value score as the chance this ends well, ends in words. */}
      <text
        x={PLOT.left}
        y={TITLE_BASELINE}
        fontSize={CHART_TYPE.labelPx}
        fill={valueColour}
        fontWeight={600}
      >
        Chance this ends well
      </text>
      {[V_MAX, V_MIN].map((v) => (
        <line
          key={v}
          x1={PLOT.left}
          x2={PLOT.right}
          y1={y(v)}
          y2={y(v)}
          stroke={CHART_STRUCTURE.grid}
          strokeWidth={CHART_STROKE.structure}
          strokeDasharray="2 3"
        />
      ))}
      <text
        x={PLOT.left + 2}
        y={y(V_MAX) + CHART_TYPE.tickPx + 1}
        fontSize={CHART_TYPE.tickPx}
        fill={CHART_STRUCTURE.labelSecondary}
      >
        likely
      </text>
      <text
        x={PLOT.left + 2}
        y={y(V_MIN) - 5}
        fontSize={CHART_TYPE.tickPx}
        fill={CHART_STRUCTURE.labelSecondary}
      >
        unlikely
      </text>

      {/* Value trace: the full episode faint, the elapsed part at trace weight. */}
      <polyline
        data-series="value"
        points={tracePoints(EPISODE_LENGTH_S)}
        fill="none"
        stroke={valueColour}
        strokeOpacity={0.35}
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

      {/* Time axis in seconds; the end label carries the unit in words. */}
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
          {t % 20 === 0 ? (
            <text
              data-scene-tick=""
              x={x(t)}
              y={TICK_BASELINE}
              textAnchor={t === EPISODE_LENGTH_S ? 'end' : t === 0 ? 'start' : 'middle'}
              fontSize={CHART_TYPE.tickPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              {t === EPISODE_LENGTH_S ? `${t} seconds` : String(t)}
            </text>
          ) : null}
        </g>
      ))}

      {/* Playhead, only while the episode is still running. */}
      {settled ? null : (
        <g data-chart-mark="playhead" data-chart-role="highlight">
          <line
            x1={x(playhead)}
            x2={x(playhead)}
            y1={PLOT_TOP}
            y2={AXIS_Y + CHART_STROKE.tickLength}
            stroke={highlight}
            strokeWidth={CHART_STROKE.structure * 2}
          />
          <circle cx={x(playhead)} cy={y(value)} r={CHART_STROKE.markerRadius} fill={highlight} />
        </g>
      )}
    </PlotStage>
  );

  const trainingView = (
    <div data-testid="training-view" className="px-1 pt-2 pb-3 font-sans text-sm">
      <p className="m-0 text-text">
        All {tagged.length} steps stay in the training data, each tagged by whether the chance of a
        good ending rose or fell.
      </p>
      <ul className="m-0! mt-3! grid list-none gap-2.5 p-0!">
        {tagged.map((segment) => {
          const bad = segment.tag === 'low';
          return (
            <li
              key={segment.id}
              data-testid={`training-row-${segment.id}`}
              data-tag={segment.tag}
              className="my-0! flex flex-wrap items-center gap-x-3 gap-y-0.5"
            >
              <InlineStepIcon id={segment.id} bad={bad} />
              <span className="min-w-[8.5rem] font-medium text-text">{STEP_NAME[segment.id]}</span>
              <span className={bad ? 'text-text' : 'text-text-dim'}>
                {bad ? 'Hurt: do less of this' : 'Helped: do more of this'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const executionView = (
    <div data-testid="execution-view" className="px-1 pt-2 pb-3 font-sans text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-text-dim">Asked for</span>
        <span className="rounded-sm border border-border-strong px-1.5 py-0.5 text-text">
          task: make espresso
        </span>
        <span className="rounded-sm border border-border-strong px-1.5 py-0.5 text-text">
          advantage: high
        </span>
      </div>
      <p className="mt-2 max-w-[65ch] leading-relaxed text-text-dim">
        When it runs, the robot is asked to act like its &ldquo;helped&rdquo; examples. The default
        Recap evaluation samples the positive-conditioned policy. The rows below are toy training
        examples; they predict no step&apos;s outcome.
      </p>
      <ul className="m-0! mt-2! grid list-none gap-2 p-0!">
        {tagged.map((segment) => {
          const active = segment.tag === 'high';
          return (
            <li
              key={segment.id}
              data-testid={`execution-row-${segment.id}`}
              data-active={active}
              className="my-0! flex flex-wrap items-center gap-x-3"
            >
              <InlineStepIcon id={segment.id} bad={!active} />
              <span className={cx('min-w-[8.5rem]', active ? 'font-medium text-text' : 'text-text-dim')}>
                {STEP_NAME[segment.id]}
              </span>
              <span className={active ? 'text-text' : 'text-text-dim'}>
                {active ? 'high-tag example' : 'low-tag example'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <InstrumentFigure
      figureId="advantage-scrubber"
      className={className}
      kicker="Advantage tags"
      heading="The robot learns its real mistake came 20 seconds earlier"
      controls={controls}
      adjust={adjust}
      stage={
        <FigureStage>
          {view === 'episode' ? episodePlot : view === 'training' ? trainingView : executionView}
        </FigureStage>
      }
      caption="Tagging each step as helping or hurting lets the robot learn from its own failures, even when the cause came long before the failure."
      method={
        <>
          <div>
            Advantage is the change in the value score across a step: the score at its end minus the
            score at its start. A step whose score rises is tagged high advantage (&ldquo;helped&rdquo;);
            one whose score falls is tagged low advantage (&ldquo;hurt&rdquo;). The value score is drawn
            as the chance the attempt ends well; this toy starts it at V = 30 on an arbitrary scale.
          </div>
          <ul className="m-0! grid list-none gap-1.5 p-0!" data-testid="advantage-steps">
            {tagged.map((segment) => (
              <li key={segment.id} data-testid={`segment-row-${segment.id}`} className="my-0!">
                <span className="font-medium text-text">{segment.label}</span>{' '}
                <span className="text-text-dim">
                  ({segment.start}-{segment.end} s, score change {formatDelta(segment.delta)},{' '}
                  {segment.tag} advantage):
                </span>{' '}
                {segment.note}
              </li>
            ))}
          </ul>
          <div>
            The episode follows the portafilter example in the Recap companion blog. The step scores,
            the forty-second length and the twenty-second gap are illustrative, not a recorded
            episode. Recap&apos;s own estimator also counts rewards, applies a task-dependent
            threshold, forces human corrections positive and sometimes drops the indicator during
            training. A value score is not the only possible signal for finding the cause.
          </div>
          {description}
        </>
      }
      source="Teaching toy after the Recap portafilter example; timings, scores and tags are illustrative."
    />
  );
}
