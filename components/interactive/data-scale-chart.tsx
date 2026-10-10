'use client';

import { useId, useState } from 'react';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  DirectLabel,
  LegendSwatch,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import { FigureStage, StageNumber, StageReadout, StageStatus } from '@/components/motion/figure-frame';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReset,
  LegendItem,
  PlotStage,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import {
  COLLECTION_RATES,
  DEFAULT_RIGS,
  FRONTIER_HOURS,
  LLM_POINTS,
  MAX_RIGS,
  MIN_RIGS,
  OXE_SCALE_HOURS,
  OXE_DURATION,
  ROBOT_POINTS,
  formatDuration,
  formatHours,
  formatRigs,
  hoursPerYear,
  rateById,
  yearsToTarget,
  type CollectionRateId,
  type DataScalePoint,
} from '@/lib/data-scaling';
import { MOTION_STAGE, MOTION_STAGE_TYPE } from '@/lib/motion-tokens';

/**
 * DataScaleChart: how small robot training data is next to chatbot
 * training text, and how long a robot farm would take to close any of it.
 *
 * The stage has two panels with separate units, because no honest exchange
 * rate between an hour of robot practice and a token of text exists. Panel
 * A is two rulers: chatbot corpora in tokens, and robot and human-video
 * datasets in hours, each dataset on its own row, its marker filled or open for its kind.
 * Panel B is the farm projection: the hours a year the chosen number of
 * robots would collect, against the goal, with the years to reach it named
 * on the stage.
 *
 * The two collection rates (7 and 1,000 productive hours per robot-year)
 * and both goals (10,000 and 1,000,000 hours) are authored hypothetical
 * inputs; neither rate is a measured DROID rate and neither goal is an OXE
 * duration. OXE stays on the source line as a source-scoped unknown, never
 * on a ruler.
 */

const WIDTH = CHART_VIEW_WIDTH;
/** Stage units per CSS pixel of text on the narrowest full-size stage. */
const TEXT_UNITS = CHART_VIEW_WIDTH / MOTION_STAGE_TYPE.fullSizeMinStagePx;
const TEXT_H = CHART_TYPE.labelPx * TEXT_UNITS;
const LINE = TEXT_H * 1.25;
/** Shifts a baseline so the text's middle sits on a row line. */
const MIDDLE = TEXT_H * 0.35;
const LEFT = 14;
const RIGHT = WIDTH - 14;
const TICK = CHART_STROKE.tickLength;
const MARKER_R = CHART_STROKE.markerRadius;
const f = (v: number) => Number(v.toFixed(2));

const AXIS_STROKE = {
  stroke: CHART_STRUCTURE.axes,
  strokeWidth: CHART_STROKE.structure,
  opacity: CHART_STRUCTURE.axesOpacity,
};

const MEASUREMENT = roleColour('measurement');
const VALUE = roleColour('value');
const REFERENCE = roleColour('reference');

/** A log ruler over [lo, hi] decades between two x positions. */
function logRuler(lo: number, hi: number, x0: number, x1: number) {
  return (v: number) => f(x0 + ((Math.log10(v) - lo) / (hi - lo)) * (x1 - x0));
}

/* Panel A, top ruler: chatbot text in tokens, 100 billion to 100 trillion. */
const TOKEN_X = logRuler(11, 14, LEFT, RIGHT);
const TOKEN_TITLE_Y = f(TEXT_H);
const TOKEN_ROWS = [TOKEN_TITLE_Y + LINE + 6, TOKEN_TITLE_Y + LINE * 2 + 10].map(f);
const TOKEN_AXIS_Y = f(TOKEN_ROWS[1] + 14);
const TOKEN_TICKS = [
  { exp: 11, label: '100 billion', anchor: 'start' as const },
  { exp: 13, label: '10 trillion', anchor: 'middle' as const },
];

/* Panel A, bottom ruler: practice data in hours, 100 to 100,000. */
const NAME_X = LEFT;
const HOURS_X0 = 142;
const HOURS_X = logRuler(2, 5, HOURS_X0, RIGHT);
const HOURS_TITLE_Y = f(TOKEN_AXIS_Y + TICK + LINE + 28);
const ROW_PITCH = f(LINE + 3);
const ROWS = [...ROBOT_POINTS].sort((a, b) => a.magnitude - b.magnitude);
const rowY = (index: number) => f(HOURS_TITLE_Y + LINE + 8 + index * ROW_PITCH);
const HOURS_AXIS_Y = f(rowY(ROWS.length - 1) + 14);
const HOURS_TICKS = [
  { exp: 2, label: '100' },
  { exp: 3, label: '1,000' },
  { exp: 4, label: '10,000' },
  // Unlabelled: on a phone the label would run into 10,000.
  { exp: 5, label: '' },
];

/* Panel B: hours a year the farm collects, 1 to 1,000,000, and the goal. */
const FARM_X = logRuler(0, 6, LEFT, RIGHT);
const FARM_TITLE_Y = f(HOURS_AXIS_Y + TICK + LINE + 34);
const NOTE_Y = f(FARM_TITLE_Y + LINE + 8);
const GOAL_LABEL_Y = f(NOTE_Y + LINE * 2 + 6);
const FARM_Y = f(GOAL_LABEL_Y + LINE);
const FARM_AXIS_Y = f(FARM_Y + 14);
const FARM_TICKS = [
  { exp: 1, label: '10' },
  { exp: 3, label: '1,000' },
  { exp: 5, label: '100,000' },
];
const FARM_NAME_Y = f(FARM_AXIS_Y + TICK + LINE * 2);
const HEIGHT = f(FARM_NAME_Y + 8);

/** Rough stage width of a label on the narrowest stage, to keep it inside. */
const textWidth = (text: string) => text.length * TEXT_H * 0.55;

/** The kind of a dataset in its marker: robot data a filled dot, human video an open ring. */
function KindSwatch({ kind }: { kind: 'robot' | 'camera' }) {
  const h = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={h} height={h} viewBox={`0 0 ${h} ${h}`} className="shrink-0">
      <circle
        cx={h / 2}
        cy={h / 2}
        r={MARKER_R}
        fill={kind === 'robot' ? MEASUREMENT : MOTION_STAGE.background}
        stroke={MEASUREMENT}
        strokeWidth={CHART_STROKE.structure}
      />
    </svg>
  );
}

/** A dataset's size as the stage writes it: the number, "about" for an estimate. */
function stageValue(p: DataScalePoint): string {
  return `${p.estimated ? 'about ' : ''}${p.magnitude.toLocaleString('en-US')}`;
}

/** formatDuration in words: the same rounding, no unit abbreviations. */
function durationInWords(years: number): string {
  if (years >= 100) return `${Math.round(years).toLocaleString('en-US')} years`;
  if (years >= 1) {
    const value = years.toFixed(1);
    return `${value} ${value === '1.0' ? 'year' : 'years'}`;
  }
  const months = Math.max(1, Math.round(years * 12));
  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

/** formatHours in words. */
function hoursInWords(hours: number): string {
  if (hours >= 1e6) return `${(hours / 1e6).toFixed(1)} million hours`;
  return `${Math.round(hours).toLocaleString('en-US')} hours`;
}

const RATE_PRESETS: { id: CollectionRateId; label: string; word: string }[] = [
  { id: 'droid-measured', label: 'Part-time: 7 hours a year each', word: 'part-time' },
  { id: 'dedicated', label: 'Full-time farm: about 4 hours a day each', word: 'full-time' },
];

type GoalId = 'ten-thousand' | 'one-million';
const GOALS: Record<GoalId, number> = { 'ten-thousand': OXE_SCALE_HOURS, 'one-million': FRONTIER_HOURS };

type KindFilter = 'all' | 'robot' | 'human-video';

const CAPTION =
  'Text piles up online for free; every hour of robot data needs a real machine, usually driven by a paid person.';

export function DataScaleChart({
  defaultRigs = DEFAULT_RIGS,
  defaultRate = 'dedicated',
  className,
}: {
  defaultRigs?: number;
  /** Initial collection-rate assumption; a prediction step mounts the
   *  chart at the rate that answers its prompt. */
  defaultRate?: CollectionRateId;
  className?: string;
}) {
  // useId-derived ids: a hardcoded id would duplicate and cross-bind the
  // labels whenever the chart mounts more than once on a page.
  const baseId = useId();
  const rigsId = `${baseId}-rigs`;
  const descriptionId = `${baseId}-description`;
  const [rigs, setRigs] = useState(defaultRigs);
  const [rateId, setRateId] = useState<CollectionRateId>(defaultRate);
  const [goalId, setGoalId] = useState<GoalId>('ten-thousand');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  // Derive state during render when the initial prop changes (the repo
  // pattern, never useEffect): compare against the previous prop value
  // and resync before painting.
  const [prevDefaultRate, setPrevDefaultRate] = useState(defaultRate);
  if (defaultRate !== prevDefaultRate) {
    setPrevDefaultRate(defaultRate);
    setRateId(defaultRate);
  }

  const rate = rateById(rateId);
  const rateWord = RATE_PRESETS.find((preset) => preset.id === rateId)!.word;
  const perYear = hoursPerYear(rigs, rateId);
  const targetYears = yearsToTarget(rigs, rateId, OXE_SCALE_HOURS);
  const largerTargetYears = yearsToTarget(rigs, rateId, FRONTIER_HOURS);
  const goal = GOALS[goalId];
  const goalYears = goalId === 'one-million' ? largerTargetYears : targetYears;
  const robotsWord = `${formatRigs(rigs)} ${rateWord} ${rigs === 1 ? 'robot' : 'robots'}`;

  function reset() {
    setRigs(defaultRigs);
    setRateId(defaultRate);
    setGoalId('ten-thousand');
    setKindFilter('all');
  }

  // Panel B geometry.
  const farmX = FARM_X(Math.max(perYear, 1));
  const goalX = FARM_X(goal);
  const farmLabel = `${hoursInWords(perYear)} a year`;
  const farmLabelRight = farmX + MARKER_R + 6 + textWidth(farmLabel) <= RIGHT;
  const farmLabelSpan = farmLabelRight
    ? [farmX, farmX + MARKER_R + 6 + textWidth(farmLabel)]
    : [farmX - MARKER_R - 6 - textWidth(farmLabel), farmX];
  // The dashed goal line breaks around the farm's label rather than crossing it.
  const goalCrossesLabel = goalX >= farmLabelSpan[0] - 2 && goalX <= farmLabelSpan[1] + 2;
  const goalSegments: [number, number][] = goalCrossesLabel
    ? [[f(GOAL_LABEL_Y + 6), f(FARM_Y - TEXT_H * 0.6)], [f(FARM_Y + TEXT_H * 0.5), FARM_AXIS_Y]]
    : [[f(GOAL_LABEL_Y + 6), FARM_AXIS_Y]];
  const goalLabel = `goal: ${goal.toLocaleString('en-US')} hours`;
  const goalAnchor = goalX + textWidth(goalLabel) / 2 > RIGHT ? 'end' : 'middle';
  const annotationLines = [
    `${robotsWord}: ${durationInWords(goalYears)}`,
    `to reach ${goal.toLocaleString('en-US')} hours`,
  ];

  return (
    <InstrumentFigure
      figureId="data-scale-chart"
      className={className}
      kicker="The data bottleneck"
      heading="Robot training data is tiny next to chatbot training text"
      controls={
        <>
          <ControlField className="content-start">
            <ControlLabel htmlFor={rigsId} value={`${formatRigs(rigs)} ${rigs === 1 ? 'robot' : 'robots'}`}>
              Robots collecting
            </ControlLabel>
            <input
              id={rigsId}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_RIGS}
              max={MAX_RIGS}
              step={1}
              value={rigs}
              onChange={(e) => setRigs(Number(e.target.value))}
              aria-label={`Robots collecting (teleoperation rigs), currently ${formatRigs(rigs)}`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="one robot" high="big fleet" />
          </ControlField>
          <PresetGroup<CollectionRateId>
            label="How much each robot collects"
            presets={RATE_PRESETS.map(({ id, label }) => ({ id, label }))}
            value={rateId}
            onChange={setRateId}
            testId="collection-rate"
          />
        </>
      }
      adjust={
        <>
          <PresetGroup<GoalId>
            label="Hours to collect"
            presets={[
              { id: 'ten-thousand', label: '10,000 hours' },
              { id: 'one-million', label: '1,000,000 hours' },
            ]}
            value={goalId}
            onChange={setGoalId}
            testId="collection-goal"
          />
          <PresetGroup<KindFilter>
            label="Datasets to pick out"
            presets={[
              { id: 'all', label: 'All' },
              { id: 'robot', label: 'Robot data' },
              { id: 'human-video', label: 'Human video' },
            ]}
            value={kindFilter}
            onChange={setKindFilter}
            testId="dataset-kind"
          />
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <StageReadout data-testid="projection-summary">
                <span data-testid="rigs-readout">{formatRigs(rigs)}</span>{' '}
                {rateWord} {rigs === 1 ? 'robot collects' : 'robots collect'}{' '}
                <StageNumber data-testid="hours-readout" style={{ color: VALUE }}>
                  {`${hoursInWords(perYear)} a year`}
                </StageNumber>
                : 10,000 hours takes{' '}
                <span data-testid="oxe-years-readout">{durationInWords(targetYears)}</span>,
                1,000,000 hours takes{' '}
                <span data-testid="frontier-years-readout">{durationInWords(largerTargetYears)}</span>
              </StageReadout>
              <InstrumentLegend className="basis-full">
                <LegendItem series="robot-data" swatch={<KindSwatch kind="robot" />}>
                  robot data
                </LegendItem>
                <LegendItem series="human-video" swatch={<KindSwatch kind="camera" />}>
                  human video
                </LegendItem>
                <LegendItem series="farm-projection" swatch={<LegendSwatch role="value" mark="dot" />}>
                  your robots, one year
                </LegendItem>
              </InstrumentLegend>
              <StageStatus>Illustrative: chosen collection rates, not a measured farm.</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Chatbot training text in tokens and robot practice data in hours, on separate rulers, and ${robotsWord} collecting ${hoursInWords(perYear)} a year`}
            aria-describedby={descriptionId}
          >
            {/* Panel A, top: chatbot text, in tokens. */}
            <g data-testid="token-ruler" data-series="llm-corpus">
              <DirectLabel x={LEFT} y={TOKEN_TITLE_Y}>
                <tspan fontWeight={600}>Chatbot training text, in word pieces</tspan>
              </DirectLabel>
              {LLM_POINTS.map((p, index) => {
                const x = TOKEN_X(p.magnitude);
                const y = TOKEN_ROWS[index];
                const label = `${p.label}: ${p.id === 'gpt3' ? '300 billion' : '15 trillion'}`;
                const right = x + MARKER_R + 6 + textWidth(label) <= RIGHT;
                return (
                  <g key={p.id} data-testid={`llm-marker-${p.id}`}>
                    <circle data-chart-mark="dot" data-chart-role="measurement" cx={x} cy={y} r={MARKER_R} fill={MEASUREMENT} />
                    <DirectLabel x={right ? f(x + MARKER_R + 6) : f(x - MARKER_R - 6)} y={f(y + MIDDLE)} anchor={right ? 'start' : 'end'}>
                      {label}
                    </DirectLabel>
                  </g>
                );
              })}
              <g data-chart-axes="">
                <line x1={LEFT} x2={RIGHT} y1={TOKEN_AXIS_Y} y2={TOKEN_AXIS_Y} {...AXIS_STROKE} />
                {[11, 12, 13, 14].map((exp) => (
                  <line key={exp} x1={TOKEN_X(10 ** exp)} x2={TOKEN_X(10 ** exp)} y1={TOKEN_AXIS_Y} y2={TOKEN_AXIS_Y + TICK} {...AXIS_STROKE} />
                ))}
              </g>
              {TOKEN_TICKS.map((tick) => (
                <text
                  key={tick.exp}
                  data-scene-tick=""
                  data-testid={`token-tick-${tick.exp}`}
                  x={TOKEN_X(10 ** tick.exp)}
                  y={f(TOKEN_AXIS_Y + TICK + TEXT_H)}
                  textAnchor={tick.anchor}
                  fontSize={CHART_TYPE.tickPx}
                  fill={CHART_STRUCTURE.labelSecondary}
                >
                  {tick.label}
                </text>
              ))}
            </g>

            {/* Panel A, bottom: robot and human-video practice, in hours. */}
            <g data-testid="hours-ruler">
              <DirectLabel x={LEFT} y={HOURS_TITLE_Y}>
                <tspan fontWeight={600}>Robot practice data, in hours</tspan>
              </DirectLabel>
              {ROWS.map((p, index) => {
                const x = HOURS_X(p.magnitude);
                const y = rowY(index);
                const human = p.kind === 'human-video';
                const picked = kindFilter === 'all' || (kindFilter === 'robot') !== human;
                const value = stageValue(p);
                const right = x + MARKER_R + 6 + textWidth(value) <= RIGHT;
                return (
                  <g
                    key={p.id}
                    data-testid={`robot-marker-${p.id}`}
                    data-series={human ? 'human-video' : 'robot-data'}
                    data-picked={picked ? 'true' : 'false'}
                    opacity={picked ? 1 : 0.3}
                  >
                    <DirectLabel x={NAME_X} y={f(y + MIDDLE)}>
                      {p.label}
                    </DirectLabel>
                    <circle
                      data-chart-mark="dot"
                      data-chart-role="measurement"
                      cx={x}
                      cy={y}
                      r={MARKER_R}
                      fill={human ? MOTION_STAGE.background : MEASUREMENT}
                      stroke={MEASUREMENT}
                      strokeWidth={CHART_STROKE.structure}
                    />
                    <DirectLabel x={right ? f(x + MARKER_R + 6) : f(x - MARKER_R - 6)} y={f(y + MIDDLE)} anchor={right ? 'start' : 'end'}>
                      {value}
                    </DirectLabel>
                  </g>
                );
              })}
              <g data-chart-axes="">
                <line x1={HOURS_X0} x2={RIGHT} y1={HOURS_AXIS_Y} y2={HOURS_AXIS_Y} {...AXIS_STROKE} />
                {HOURS_TICKS.map((tick) => (
                  <line key={tick.exp} x1={HOURS_X(10 ** tick.exp)} x2={HOURS_X(10 ** tick.exp)} y1={HOURS_AXIS_Y} y2={HOURS_AXIS_Y + TICK} {...AXIS_STROKE} />
                ))}
              </g>
              {HOURS_TICKS.filter((tick) => tick.label).map((tick) => (
                <text
                  key={tick.exp}
                  data-scene-tick=""
                  data-testid={`hours-tick-${tick.exp}`}
                  x={HOURS_X(10 ** tick.exp)}
                  y={f(HOURS_AXIS_Y + TICK + TEXT_H)}
                  textAnchor="middle"
                  fontSize={CHART_TYPE.tickPx}
                  fill={CHART_STRUCTURE.labelSecondary}
                >
                  {tick.label}
                </text>
              ))}
            </g>

            {/* Panel B: the farm projection. */}
            <g data-testid="farm-panel">
              <line
                x1={LEFT}
                x2={RIGHT}
                y1={f(FARM_TITLE_Y - TEXT_H - 12)}
                y2={f(FARM_TITLE_Y - TEXT_H - 12)}
                stroke={CHART_STRUCTURE.grid}
                strokeWidth={CHART_STROKE.structure}
              />
              <DirectLabel x={LEFT} y={FARM_TITLE_Y}>
                <tspan fontWeight={600}>{`How long to collect ${goal.toLocaleString('en-US')} hours?`}</tspan>
              </DirectLabel>
              <path
                data-testid="goal-line"
                data-chart-role="reference"
                d={goalSegments.map(([y1, y2]) => `M${goalX} ${y1} V${y2}`).join(' ')}
                fill="none"
                stroke={REFERENCE}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
              <DirectLabel x={goalAnchor === 'end' ? RIGHT : goalX} y={GOAL_LABEL_Y} anchor={goalAnchor}>
                {goalLabel}
              </DirectLabel>
              <g data-chart-axes="">
                <line x1={LEFT} x2={RIGHT} y1={FARM_AXIS_Y} y2={FARM_AXIS_Y} {...AXIS_STROKE} />
                {FARM_TICKS.map((tick) => (
                  <line key={tick.exp} x1={FARM_X(10 ** tick.exp)} x2={FARM_X(10 ** tick.exp)} y1={FARM_AXIS_Y} y2={FARM_AXIS_Y + TICK} {...AXIS_STROKE} />
                ))}
              </g>
              {FARM_TICKS.map((tick) => (
                <text
                  key={tick.exp}
                  data-scene-tick=""
                  data-testid={`farm-tick-${tick.exp}`}
                  x={FARM_X(10 ** tick.exp)}
                  y={f(FARM_AXIS_Y + TICK + TEXT_H)}
                  textAnchor="middle"
                  fontSize={CHART_TYPE.tickPx}
                  fill={CHART_STRUCTURE.labelSecondary}
                >
                  {tick.label}
                </text>
              ))}
              <text
                data-scene-axis=""
                x={LEFT}
                y={FARM_NAME_Y}
                fontSize={CHART_TYPE.axisPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                hours collected in one year
              </text>
              {/* The farm label must follow its marker: the role probes read it as the marker's next sibling. */}
              <circle
                data-testid="projection-marker"
                data-series="farm-projection"
                data-chart-mark="dot"
                data-chart-role="value"
                cx={farmX}
                cy={FARM_Y}
                r={MARKER_R + 1}
                fill={VALUE}
              />
              <text
                data-chart-label=""
                data-chart-role="value"
                x={farmLabelRight ? f(farmX + MARKER_R + 6) : f(farmX - MARKER_R - 6)}
                y={f(FARM_Y + MIDDLE)}
                textAnchor={farmLabelRight ? 'start' : 'end'}
                fontSize={CHART_TYPE.labelPx}
                fill={VALUE}
              >
                {farmLabel}
              </text>
              <StageAnnotation
                x={LEFT}
                y={NOTE_Y}
                lines={annotationLines}
                from={[f(Math.min(farmX, LEFT + 40)), f(NOTE_Y + LINE + 6)]}
                target={[farmX, FARM_Y]}
              />
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <p>
            The two panels use separate rulers because there is no honest exchange rate between an
            hour of robot practice and a token of text, so none is drawn. A token is a piece of a
            word: GPT-3 trained on {LLM_POINTS[0].value} and Llama 3 on{' '}
            {LLM_POINTS[1].value}. Both rulers are logarithmic: each labelled step is ten times the
            one before.
          </p>
          <div data-testid="rate-explanation">
            <p>
              {rate.note} The 10,000-hour and 1,000,000-hour targets are authored hypothetical
              inputs, not OXE totals or measured frontier requirements. Hours marked &ldquo;about&rdquo; on
              dataset points are estimates.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {COLLECTION_RATES.map((r) => (
                <li key={r.id}>
                  {RATE_PRESETS.find((preset) => preset.id === r.id)!.label} ({r.label},{' '}
                  {r.hoursPerRigYear.toLocaleString('en-US')} h/rig/yr): {r.note}
                </li>
              ))}
            </ul>
          </div>
          <p>
            Current projection: {formatRigs(rigs)} rigs at {formatHours(perYear)}/yr, 10,000 h in{' '}
            {formatDuration(targetYears)} and 1,000,000 h in {formatDuration(largerTargetYears)}. No
            OXE hour estimate is supplied or plotted here.
          </p>
          <p>
            Sources for each count:{' '}
            {[...ROBOT_POINTS, ...LLM_POINTS].map((p, index, all) => (
              <span key={p.id}>
                <a data-brand-control-id="control:link-focus" href={`#ref-${p.cite}`} className="text-link underline">
                  {p.label}
                </a>
                {index < all.length - 1 ? ', ' : '.'}
              </span>
            ))}
          </p>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Datasets and corpora by scale, with the farm projection"
            rowHeader="dataset"
            columns={[
              { header: 'demonstration hours', numeric: true },
              { header: 'pretraining tokens', numeric: true },
            ]}
            rows={[
              // A dataset has no token count and a corpus no demonstration
              // hours: the house "n/a" (inapplicable), not "not disclosed".
              ...ROBOT_POINTS.map((p) => ({ label: p.label, values: [p.value, 'n/a'] })),
              { label: OXE_DURATION.label, values: [OXE_DURATION.value, 'n/a'] },
              ...LLM_POINTS.map((p) => ({ label: p.label, values: ['n/a', p.value] })),
              {
                label: `your hypothetical farm (${formatRigs(rigs)} rigs)`,
                values: [`${formatHours(perYear)}/yr`, 'n/a'],
              },
            ]}
            description={
              <>
                Demonstration hours span {ROBOT_POINTS[0].value} (DROID) to{' '}
                {ROBOT_POINTS[ROBOT_POINTS.length - 1].value} (EgoScale) across{' '}
                {ROBOT_POINTS.length} robot and human datasets, while pretraining tokens span{' '}
                {LLM_POINTS[0].value.replace(' tokens', '')} (GPT-3) to{' '}
                {LLM_POINTS[LLM_POINTS.length - 1].value.replace(' tokens', '')} (Llama 3), on
                separate rulers with no honest hour-to-token exchange rate between them; your{' '}
                {formatRigs(rigs)}-rig farm at the {rate.label.toLowerCase()} rate projects{' '}
                {formatHours(perYear)} per year, reaching the authored 10,000-hour target in{' '}
                {formatDuration(targetYears)} and the authored 1,000,000-hour target in{' '}
                {formatDuration(largerTargetYears)}. No OXE hour estimate is supplied or plotted
                here.
              </>
            }
          />
        </>
      }
      source={
        <span data-testid="oxe-duration-note">
          <a
            data-brand-control-id="control:link-focus"
            href={OXE_DURATION.sourceUrl}
            rel="noopener noreferrer"
            className="text-link underline"
          >
            OXE
          </a>
          : over 1 million recorded robot runs on 22 kinds of robot, with no total hours. This chart
          supplies no hour estimate and does not plot OXE on the hours axis.
        </span>
      }
    />
  );
}
