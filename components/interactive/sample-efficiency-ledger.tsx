'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  ANCHORS,
  BUDGET_SPEC,
  DATA_SOURCES,
  DEFAULT_PARAMS,
  FLEET_SPEC,
  OFFLINE_ONLY_ABOVE_HOURS,
  ON_POLICY_MAX_HOURS,
  ROBOT_STEPS_PER_SECOND,
  SIM_STEPS_PER_SECOND,
  computeLedger,
  formatDuration,
  formatRate,
  formatSteps,
  timeFraction,
  type Ledger,
  type LedgerParams,
  type SourceId,
} from '@/lib/sample-efficiency';
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
  SliderEnds,
} from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  PointMarker,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import { CiteRef } from '@/components/article/citation-records';

/**
 * Constant-rate budget illustration: the same amount of practice, timed in
 * simulation, on one real robot and on a small fleet. The lanes are toy
 * outputs, not measured campaign times; the "real examples" row places
 * paper-reported durations, which keep their own units, bounds and setup
 * qualifiers in the method notes.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PAD_L = 12;
const PAD_R = 16;
const PLOT_W = WIDTH - PAD_L - PAD_R;
const BRACKET_Y = 46;
const LANE_TOP = 66;
const LANE_STEP = 34;
/** From a lane label's baseline to the top of its bar, clear of descenders. */
const BAR_DY = 6;
const BAR_H = 2;
const EXAMPLES_LABEL_Y = 172;
const EXAMPLES_Y = 184;
const AXIS_Y = 198;
const HEIGHT = 222;

/** Round every rendered geometry value so SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));
const x = (seconds: number) => f(PAD_L + timeFraction(seconds) * PLOT_W);
const laneBaseline = (i: number) => LANE_TOP + i * LANE_STEP;

const DAY = 86_400;
const MONTH = 30.44 * DAY;
const YEAR = 365.25 * DAY;

/** Four word ticks on the log timeline, far enough apart to read at 375 px. */
const TICKS: ReadonlyArray<{ seconds: number; label: string }> = [
  { seconds: 60, label: '1 minute' },
  { seconds: 3600, label: '1 hour' },
  { seconds: DAY, label: '1 day' },
  { seconds: YEAR, label: '1 year' },
];

/** A duration in words: "21 minutes", "2.7 months". */
export function durationWords(seconds: number): string {
  const amount = (value: number, unit: string) => {
    const shown = value >= 10 ? Math.round(value).toLocaleString('en-US') : String(Number(value.toFixed(1)));
    return `${shown} ${unit}${shown === '1' ? '' : 's'}`;
  };
  if (seconds < 60) return amount(seconds, 'second');
  if (seconds < 3600) return amount(seconds / 60, 'minute');
  if (seconds < 2 * DAY) return amount(seconds / 3600, 'hour');
  if (seconds < 2 * MONTH) return amount(seconds / DAY, 'day');
  if (seconds < YEAR) return amount(seconds / MONTH, 'month');
  return amount(seconds / YEAR, 'year');
}

/** A step count in words: "158 million steps". */
export function stepWords(steps: number): string {
  if (steps >= 1e9) return `${(steps / 1e9).toFixed(1)} billion steps`;
  if (steps >= 1e6) return `${Math.round(steps / 1e6)} million steps`;
  return `${Math.round(steps / 1e3)} thousand steps`;
}

/** Visible option text; each is part of the option's accessible name. */
const SOURCE_TEXT: Record<SourceId, string> = {
  sim: 'Parallel simulation',
  robot: 'Single real robot',
  fleet: 'Fleet of real robots',
};

const laneWords = (id: SourceId, fleetSize: number) =>
  id === 'sim' ? 'In simulation' : id === 'robot' ? 'One real robot' : `${fleetSize} real robots`;

const anchorsByTime = [...ANCHORS].sort((a, b) => a.seconds - b.seconds);

function LedgerPlot({ ledger, source, fleetSize }: { ledger: Ledger; source: SourceId; fleetSize: number }) {
  const right = WIDTH - PAD_R;
  const sim = ledger.rows.find((row) => row.id === 'sim')!;
  const robot = ledger.rows.find((row) => row.id === 'robot')!;
  const bracketFrom = Math.max(x(sim.seconds), PAD_L + 2);
  const bracketTo = x(robot.seconds);
  const structure = {
    stroke: CHART_STRUCTURE.axes,
    strokeWidth: CHART_STROKE.structure,
    fill: 'none',
  };

  return (
    <>
      <StageAnnotation
        x={8}
        y={16}
        lines={[`Same practice: about ${durationWords(sim.seconds)} in simulation,`, `about ${durationWords(robot.seconds)} on one robot`]}
      />
      <g data-scene-structure="" stroke={CHART_STRUCTURE.label} strokeWidth={CHART_STROKE.structure} fill="none">
        <path d={`M ${f(bracketFrom)} ${BRACKET_Y + 5} V ${BRACKET_Y} H ${f(bracketTo)} V ${BRACKET_Y + 5}`} />
      </g>

      <g data-scene-structure="" opacity={CHART_STRUCTURE.axesOpacity}>
        <line x1={PAD_L} x2={right} y1={AXIS_Y} y2={AXIS_Y} {...structure} />
        {TICKS.map((tick) => (
          <line
            key={tick.label}
            x1={x(tick.seconds)}
            x2={x(tick.seconds)}
            y1={AXIS_Y}
            y2={AXIS_Y + CHART_STROKE.tickLength}
            {...structure}
          />
        ))}
      </g>

      {/* One lane per source: a bar from 1 s to the converted wall clock,
          its label above the bar. */}
      <g data-series="modelled-lanes">
        {ledger.rows.map((row, i) => {
          const selected = row.id === source;
          return (
            <g key={row.id}>
              <text
                data-scene-note=""
                x={PAD_L}
                y={laneBaseline(i)}
                fontSize={CHART_TYPE.axisPx}
                fontWeight={selected ? 600 : undefined}
                fill={selected ? CHART_STRUCTURE.label : CHART_STRUCTURE.labelSecondary}
              >
                {`${laneWords(row.id, fleetSize)}: ${durationWords(row.seconds)}`}
              </text>
              <rect
                data-testid={`sample-lane-${row.id}`}
                data-chart-mark="bar"
                data-chart-role={selected ? 'highlight' : 'state'}
                x={PAD_L}
                y={laneBaseline(i) + BAR_DY}
                width={f(Math.max(x(row.seconds) - PAD_L, 2))}
                height={BAR_H}
                fill={roleColour(selected ? 'highlight' : 'state')}
              />
            </g>
          );
        })}
      </g>

      {/* Paper-reported durations on one row; the method notes list them. */}
      <text
        data-scene-note=""
        x={PAD_L}
        y={EXAMPLES_LABEL_Y}
        fontSize={CHART_TYPE.tickPx}
        fill={CHART_STRUCTURE.labelSecondary}
      >
        real examples from papers
      </text>
      <g data-series="paper-anchors">
        {anchorsByTime.map((anchor) => (
          <PointMarker key={anchor.id} x={x(anchor.seconds)} y={EXAMPLES_Y} role="measurement" />
        ))}
      </g>

      {TICKS.map((tick) => (
        <text
          key={tick.label}
          data-scene-tick=""
          x={x(tick.seconds)}
          y={AXIS_Y + CHART_STROKE.tickLength + 15}
          textAnchor="middle"
          fontSize={CHART_TYPE.tickPx}
          fill={CHART_STRUCTURE.labelSecondary}
        >
          {tick.label}
        </text>
      ))}
    </>
  );
}

/** The model's assumptions and the anchors' sources, in the "How this was made" fold. */
function LedgerNotes({ ledger }: { ledger: Ledger }) {
  return (
    <>
      <p data-testid="sample-provenance-note">
        In this toy, {formatSteps(ledger.budgetSteps)} steps through{' '}
        {ledger.selected.label} at{' '}
        {formatRate(ledger.selected.stepsPerSecond)} takes{' '}
        {formatDuration(ledger.selected.seconds)}. Illustration:{' '}
        {ledger.selected.verdict.exemplars}.
      </p>
      <p data-testid="sample-simplification-label">
        What is modelled rather than measured: the three lanes use constant
        illustrative rates. The simulation constant is 122,880 steps/s,
        computed at Rudin&apos;s 1,200-second boundary; the reported run
        implies a strictly greater end-to-end average, not an exact measured
        rate of 122,880. The single-robot constant is approximately 22.2
        steps/s from Minitaur&apos;s whole training process, not its rollout
        control rate. Neither constant predicts arbitrary tasks or robots.
        Fleet scaling assumes perfect parallelism. QT-Opt&apos;s evaluation
        protocol allows up to 20 steps per grasp attempt; that cap is not a
        measured mean and does not establish a campaign step rate from
        grasp totals and robot-hours. No QT-Opt steps-per-robot-second value
        is presented here as measured. Robot-hours are not parallel wall time.
        The one-hour and {OFFLINE_ONLY_ABOVE_HOURS}-hour boundaries are
        editorial thresholds for this toy, not scientific algorithm-eligibility
        limits. The bands do not rule algorithms in or out.
      </p>
      <p>
        The bands: a run under {ON_POLICY_MAX_HOURS} hour sits in the toy on-policy band (PPO is an example), up to{' '}
        {OFFLINE_ONLY_ABOVE_HOURS} hours in the toy off-policy band (SAC, TD3 and RLPD are examples), and longer in the
        toy offline band (CQL, IQL and TD3+BC are examples). The time axis is logarithmic: each tick is a much longer
        time than the last.
      </p>
      <p>
        The real examples from papers, in time order:
      </p>
      <ol className="m-0! grid list-none gap-0.5 p-0!">
        {anchorsByTime.map((anchor, i) => (
          <li key={anchor.id} className="flex gap-2">
            <span className="tabular-nums text-text">{i + 1}</span>
            <span data-testid={`sample-anchor-${anchor.id}`}>{anchor.label}</span>
          </li>
        ))}
      </ol>
      <p>
        Paper-reported durations, with different settings and units: Rudin
        reports ANYmal flat-terrain training in under four minutes and uneven
        terrain in twenty minutes on one workstation GPU. The separately
        described simulation/deployment policy used 4,096 environments,
        98,304 samples per update and 1,500 updates in under twenty minutes
        on an i9-11900k CPU and RTX A6000 GPU <CiteRef id="rudin-2021" />;
        DayDreamer reports one A1 run learning to roll over, stand and walk
        in one hour without a simulator, with physical interventions at the
        training-area boundary that preserved joint configuration and
        orientation <CiteRef id="daydreamer-2022" />; Minitaur walking
        required 160,000 control steps over about two hours of whole-process
        training time <CiteRef id="haarnoja-walk-2019" />; QT-Opt reports
        a 580,000-grasp off-policy dataset from seven robots over about
        800 robot hours, separate from approximately 28,000 additional
        on-policy fine-tuning grasps <CiteRef id="qt-opt-2018" />; and
        section 5.2 of Levine&apos;s 2016 preprint reports about 800,000
        grasp attempts over two months using 6-14 robots. Its abstract says
        “over 800,000” and its introduction says “several months”
        <CiteRef id="levine-hand-eye-2016" />. Robot-hours are not parallel
        wall time. Bounds and approximate durations are plotted at their
        stated numeric anchors; two months is drawn as 60 days for placement,
        not as a measured elapsed-time conversion. These are not matched
        benchmarks. Keep the modelled budget fixed while switching sources
        or changing fleet size to inspect the toy assumptions.
      </p>
    </>
  );
}

export function SampleEfficiencyLedger({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const [params, setParams] = useState<LedgerParams>(DEFAULT_PARAMS);
  const sourceRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const ledger = computeLedger(params);

  const setParam = <K extends keyof LedgerParams>(key: K, value: LedgerParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));
  const reset = () => setParams(DEFAULT_PARAMS);

  // The options form one radio group: arrow keys move the choice and the
  // focus together, and only the chosen option sits in the tab order.
  const onSourceKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (!forward && !back) return;
    event.preventDefault();
    const next = (index + (forward ? 1 : -1) + DATA_SOURCES.length) % DATA_SOURCES.length;
    setParam('source', DATA_SOURCES[next]!.id);
    sourceRefs.current[next]?.focus();
  };

  const slowdown =
    ledger.slowdownVsSim < 10
      ? `${ledger.slowdownVsSim.toFixed(1)}x`
      : `${Math.round(ledger.slowdownVsSim).toLocaleString('en-US')}x`;

  return (
    <InstrumentFigure
      figureId="sample-efficiency-ledger"
      data-testid="sample-efficiency"
      className={className}
      kicker="Sample efficiency"
      heading="A simulator does in minutes what takes a robot months"
      controls={
        <>
          <ControlField>
            <ControlLabel
              htmlFor={`${uid}-budget`}
              value={<span data-testid="sample-budget-value">{stepWords(ledger.budgetSteps)}</span>}
            >
              How much practice
            </ControlLabel>
            <input
              id={`${uid}-budget`}
              type="range"
              data-brand-control-id="control:input"
              min={BUDGET_SPEC.min}
              max={BUDGET_SPEC.max}
              step={BUDGET_SPEC.step}
              value={params.budgetExponent}
              onChange={(e) => setParam('budgetExponent', Number(e.target.value))}
              aria-label={`How much practice: the environment-step budget, currently ${formatSteps(ledger.budgetSteps)} steps`}
              data-testid="sample-budget-slider"
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low="less practice" high="more practice" />
          </ControlField>
          <ControlField>
            <ControlLabel
              htmlFor={`${uid}-fleet`}
              value={<span data-testid="sample-fleet-value">{params.fleetSize}</span>}
            >
              Real robots sharing the work
            </ControlLabel>
            <input
              id={`${uid}-fleet`}
              type="range"
              data-brand-control-id="control:input"
              min={FLEET_SPEC.min}
              max={FLEET_SPEC.max}
              step={FLEET_SPEC.step}
              value={params.fleetSize}
              onChange={(e) => setParam('fleetSize', Number(e.target.value))}
              aria-label={`Real robots sharing the work, currently ${params.fleetSize}`}
              data-testid="sample-fleet-slider"
              className={INSTRUMENT_SLIDER_CLASS}
            />
            <SliderEnds low={`${FLEET_SPEC.min} robots`} high={`${FLEET_SPEC.max} robots`} />
          </ControlField>
        </>
      }
      adjust={
        <>
          <fieldset role="radiogroup" className="m-0 min-w-0 border-0 p-0">
            <legend className="font-sans text-sm text-text-dim">Highlight one lane</legend>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {DATA_SOURCES.map((option, i) => (
                <button
                  key={option.id}
                  ref={(el) => {
                    sourceRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  data-brand-control-id="control:selection"
                  aria-checked={params.source === option.id}
                  tabIndex={params.source === option.id ? 0 : -1}
                  onClick={() => setParam('source', option.id)}
                  onKeyDown={(event) => onSourceKey(event, i)}
                  aria-label={option.label}
                  data-testid={`sample-source-${option.id}`}
                  className={INSTRUMENT_TOGGLE_CLASS}
                >
                  {SOURCE_TEXT[option.id]}
                </button>
              ))}
            </div>
          </fieldset>
          <InstrumentReadout className="basis-full">
            Exact budget {formatSteps(ledger.budgetSteps)} steps; model wall clock{' '}
            <span data-testid="sample-wallclock-readout">{formatDuration(ledger.selected.seconds)}</span>{' '}
            at {formatRate(ledger.selected.stepsPerSecond)},{' '}
            <span data-testid="sample-slowdown-readout">{slowdown}</span> slower than
            sim,{' '}
            <span data-testid="sample-verdict-readout">
              {ledger.selected.verdict.label}
            </span>
          </InstrumentReadout>
          <InstrumentReset
            onClick={reset}
            aria-label="Reset the budget and data source to their opening values"
          />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem
                  series="modelled-lanes"
                  swatch={<LegendSwatch role="state" mark="bar" />}
                >
                  <span data-testid="sample-modelled-label">
                    modelled at a constant rate, not measured
                  </span>
                </LegendItem>
                <LegendItem
                  series="paper-anchors"
                  swatch={<LegendSwatch role="measurement" mark="dot" />}
                >
                  <span data-testid="sample-measured-label">
                    paper-reported durations and bounds
                  </span>
                </LegendItem>
              </InstrumentLegend>
              <StageStatus>Illustrative calculation, not measured training times</StageStatus>
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Modelled wall-clock time for ${formatSteps(ledger.budgetSteps)} environment steps under constant-rate assumptions. Paper anchors include different units, bounds and approximate durations, not matched benchmark runs. Selected model: ${ledger.selected.label} at ${formatDuration(ledger.selected.seconds)}.`}
            aria-describedby={descriptionId}
            data-testid="sample-chart"
          >
            <LedgerPlot ledger={ledger} source={params.source} fleetSize={params.fleetSize} />
          </PlotStage>
        </FigureStage>
      }
      caption="Robots learn by trial and error, which takes millions of tries; simulation turns months of real robot time into minutes."
      method={
        <>
          <LedgerNotes ledger={ledger} />
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Modelled wall-clock cost of this budget under each source"
            rowHeader="data source"
            columns={[
              { header: 'model steps/s', numeric: true },
              { header: 'model wall clock', numeric: true },
              { header: 'toy band' },
            ]}
            rows={ledger.rows.map((row) => ({
              label: row.label,
              values: [
                formatRate(row.stepsPerSecond),
                formatDuration(row.seconds),
                row.verdict.label,
              ],
            }))}
            description={`In the constant-rate toy, ${formatSteps(ledger.budgetSteps)} environment steps take ${formatDuration(ledger.rows[0]!.seconds)} of model wall clock in massively parallel simulation, ${formatDuration(ledger.rows[1]!.seconds)} on one robot and ${formatDuration(ledger.rows[2]!.seconds)} on a fleet of ${params.fleetSize}. The single-robot-to-simulation duration ratio is ${Math.round(SIM_STEPS_PER_SECOND / ROBOT_STEPS_PER_SECOND).toLocaleString('en-US')}. Their toy bands are ${ledger.rows[0]!.verdict.family}, ${ledger.rows[1]!.verdict.family} and ${ledger.rows[2]!.verdict.family}; these are editorial categories, not algorithm eligibility.`}
          />
        </>
      }
      source="Lanes use constant illustrative rates; real examples keep each paper's own units and bounds."
    />
  );
}
