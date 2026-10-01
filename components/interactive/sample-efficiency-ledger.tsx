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
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  PointMarker,
  roleColour,
} from '@/components/motion/chart';
import { CiteRef } from '@/components/article/citation-records';

/**
 * Constant-rate budget illustration. The lanes and family bands are toy
 * outputs, not measured campaign times or algorithm-eligibility rules.
 * Paper anchors retain their original units, bounds and setup qualifiers.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PAD_L = 12;
const PAD_R = 16;
const PLOT_W = WIDTH - PAD_L - PAD_R;
const BAND_LABEL_Y = 18;
const LANE_TOP = 26;
const LANE_STEP = 32;
/** From a lane label's baseline to the top of its bar, clear of descenders. */
const BAR_DY = 6;
const BAR_H = 8;
const ANCHOR_TOP = 130;
const ANCHOR_STEP = 14;
const AXIS_Y = 216;
const HEIGHT = 244;

/** Round every rendered geometry value so SSR HTML and hydration agree. */
const f = (v: number) => Number(v.toFixed(2));
const x = (seconds: number) => f(PAD_L + timeFraction(seconds) * PLOT_W);
const laneBaseline = (i: number) => LANE_TOP + i * LANE_STEP + 13;
const anchorY = (i: number) => ANCHOR_TOP + i * ANCHOR_STEP;

/**
 * Log-timeline ticks. A one-week tick would collide with the 30-day tick at
 * 375px, and 30 days is the offline band boundary, so the week goes.
 */
const TICKS: ReadonlyArray<{ seconds: number; label: string }> = [
  { seconds: 1, label: '1 s' },
  { seconds: 60, label: '1 min' },
  { seconds: 3600, label: '1 h' },
  { seconds: 86_400, label: '1 d' },
  { seconds: 2_592_000, label: '30 d' },
  { seconds: 31_557_600, label: '1 yr' },
  { seconds: 315_576_000, label: '10 yr' },
];

/** Visible option text; each is part of the option's accessible name. */
const SOURCE_TEXT: Record<SourceId, string> = {
  sim: 'Parallel simulation',
  robot: 'Single real robot',
  fleet: 'Fleet of real robots',
};

const anchorsByTime = [...ANCHORS].sort((a, b) => a.seconds - b.seconds);

function LedgerPlot({ ledger, source }: { ledger: Ledger; source: SourceId }) {
  const hourX = x(ON_POLICY_MAX_HOURS * 3600);
  const offlineX = x(OFFLINE_ONLY_ABOVE_HOURS * 3600);
  const right = WIDTH - PAD_R;
  const bands = [
    { label: 'toy on-policy', from: PAD_L, to: hourX },
    { label: 'toy off-policy', from: hourX, to: offlineX },
    { label: 'toy offline', from: offlineX, to: right },
  ];
  // The band boundaries stop short of each lane label so no line runs
  // through the text.
  const segments: Array<[number, number]> = [];
  let top = 4;
  ledger.rows.forEach((_, i) => {
    segments.push([top, laneBaseline(i) - 15]);
    top = laneBaseline(i) + 4;
  });
  segments.push([top, AXIS_Y]);
  const structure = {
    stroke: CHART_STRUCTURE.axes,
    strokeWidth: CHART_STROKE.structure,
    fill: 'none',
  };

  return (
    <>
      <g data-scene-structure="" opacity={CHART_STRUCTURE.axesOpacity}>
        {[hourX, offlineX].map((bx) =>
          segments.map(([y1, y2]) => (
            <line
              key={`${bx}-${y1}`}
              x1={bx}
              x2={bx}
              y1={f(y1)}
              y2={f(y2)}
              strokeDasharray={CHART_STROKE.dash}
              {...structure}
            />
          )),
        )}
        {anchorsByTime.map((anchor, i) => (
          <line
            key={anchor.id}
            x1={x(anchor.seconds)}
            x2={x(anchor.seconds)}
            y1={anchorY(i) + CHART_STROKE.markerRadius}
            y2={AXIS_Y}
            strokeDasharray="1 3"
            {...structure}
          />
        ))}
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

      {bands.map((band) => (
        <text
          key={band.label}
          data-scene-tick=""
          x={f((band.from + band.to) / 2)}
          y={BAND_LABEL_Y}
          textAnchor="middle"
          fontSize={CHART_TYPE.tickPx}
          fill={CHART_STRUCTURE.labelSecondary}
        >
          {band.label}
        </text>
      ))}

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
                fill={selected ? CHART_STRUCTURE.label : CHART_STRUCTURE.labelSecondary}
              >
                {`${formatDuration(row.seconds)} ${row.label}`}
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

      {/* Paper anchors, one row each in time order, numbered for the key
          under the stage. */}
      <g data-series="paper-anchors">
        {anchorsByTime.map((anchor, i) => (
          <g key={anchor.id}>
            <PointMarker x={x(anchor.seconds)} y={anchorY(i)} role="measurement" />
            <text
              data-scene-tick=""
              x={f(x(anchor.seconds) + CHART_STROKE.markerRadius + 3)}
              y={anchorY(i) + 4}
              fontSize={CHART_TYPE.tickPx}
              fill={CHART_STRUCTURE.label}
            >
              {i + 1}
            </text>
          </g>
        ))}
      </g>

      {TICKS.map((tick, i) => (
        <text
          key={tick.label}
          data-scene-tick=""
          x={x(tick.seconds)}
          y={AXIS_Y + CHART_STROKE.tickLength + 13}
          textAnchor={i === 0 ? 'start' : 'middle'}
          fontSize={CHART_TYPE.tickPx}
          fill={CHART_STRUCTURE.labelSecondary}
        >
          {tick.label}
        </text>
      ))}
    </>
  );
}

/**
 * The model's assumptions and the anchors' sources, collapsed under the
 * source line. The citation chips sit on the page ground here, where their
 * link colour keeps its contrast; on the graphite stage it would not.
 */
function LedgerNotes({ ledger }: { ledger: Ledger }) {
  return (
    <details className="mt-1">
      <summary
        data-brand-control-id="control:secondary-action"
        className="inline-flex min-h-6 cursor-pointer select-none items-center font-sans text-xs text-text-dim underline decoration-border-strong decoration-1 underline-offset-4 transition-colors hover:text-text">
        Model assumptions and paper sources
      </summary>
      <div className="mt-1 grid gap-2 font-sans text-xs leading-relaxed text-text-dim">
        <div data-testid="sample-provenance-note">
          In this toy, {formatSteps(ledger.budgetSteps)} steps through{' '}
          {ledger.selected.label} at{' '}
          {formatRate(ledger.selected.stepsPerSecond)} takes{' '}
          {formatDuration(ledger.selected.seconds)}. Illustration:{' '}
          {ledger.selected.verdict.exemplars}.
        </div>
        <div data-testid="sample-simplification-label">
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
        </div>
        <div>
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
        </div>
      </div>
    </details>
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
      heading="Wall-clock cost of a step budget"
      controls={
        <>
          <ControlField>
            <ControlLabel
              htmlFor={`${uid}-budget`}
              value={
                <span data-testid="sample-budget-value">
                  {formatSteps(ledger.budgetSteps)} steps
                </span>
              }
            >
              Environment-step budget
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
              aria-label={`Environment-step budget, currently ${formatSteps(ledger.budgetSteps)} steps`}
              data-testid="sample-budget-slider"
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <fieldset role="radiogroup" className="m-0 min-w-0 border-0 p-0">
            <legend className="font-sans text-[13px] text-text-dim">Data source</legend>
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
          <ControlField>
            <ControlLabel
              htmlFor={`${uid}-fleet`}
              value={<span data-testid="sample-fleet-value">{params.fleetSize}</span>}
            >
              Robots in the fleet
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
              aria-label={`Robots in the fleet, currently ${params.fleetSize}`}
              data-testid="sample-fleet-slider"
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
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
                    modelled conversions at a constant rate, not measured
                  </span>
                </LegendItem>
                <LegendItem swatch={<LegendSwatch role="highlight" mark="bar" />}>
                  selected source
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
              <div
                role="list"
                className="grid basis-full gap-x-4 gap-y-0.5 font-sans text-[13px] leading-snug text-text-dim sm:grid-cols-2"
              >
                {anchorsByTime.map((anchor, i) => (
                  <div role="listitem" key={anchor.id} className="flex gap-2">
                    <span className="tabular-nums text-text">{i + 1}</span>
                    <span data-testid={`sample-anchor-${anchor.id}`}>{anchor.label}</span>
                  </div>
                ))}
              </div>
              <InstrumentReadout>
                Model wall clock{' '}
                <span
                  data-testid="sample-wallclock-readout"
                  style={{ color: roleColour('highlight') }}
                >
                  {formatDuration(ledger.selected.seconds)}
                </span>{' '}
                at {formatRate(ledger.selected.stepsPerSecond)},{' '}
                <span data-testid="sample-slowdown-readout">{slowdown}</span> slower than
                sim,{' '}
                <span data-testid="sample-verdict-readout">
                  {ledger.selected.verdict.label}
                </span>
              </InstrumentReadout>
              <ChartDescription
                id={descriptionId}
                form="table"
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
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Modelled wall-clock time for ${formatSteps(ledger.budgetSteps)} environment steps under constant-rate assumptions. Paper anchors include different units, bounds and approximate durations, not matched benchmark runs. Selected model: ${ledger.selected.label} at ${formatDuration(ledger.selected.seconds)}.`}
            aria-describedby={descriptionId}
            data-testid="sample-chart"
          >
            <LedgerPlot ledger={ledger} source={params.source} />
          </PlotStage>
        </FigureStage>
      }
      caption="In this constant-rate model, the same step budget takes thousands of times longer on one robot than in simulation."
      source={
        <>
          Lanes use constant illustrative rates and the bands are editorial
          thresholds; anchors keep each paper&apos;s own units and bounds.
          <LedgerNotes ledger={ledger} />
        </>
      }
    />
  );
}
