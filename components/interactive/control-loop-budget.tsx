'use client';

import { useId, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  Bar,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  ChartAxes,
  ConstraintHatch,
  DirectLabel,
  LegendSwatch,
  LineTrace,
  roleColour,
} from '@/components/motion/chart';
import {
  CONTROL_HZ,
  CONTROL_PERIOD_MS,
  LATENCY_REFERENCES,
  MAX_PARAMS_B,
  MIN_PARAMS_B,
  PI0L_ANCHOR,
  PI0_ANCHOR,
  effectiveHz,
  inferenceMsOnThor,
  loopCloses,
  missedTicks,
} from '@/lib/control-loop';

/**
 * One synchronous toy inference against a 20 ms budget.
 * VLA-Perf numbers are analytical predictions, not measurements; its pi0
 * is 2.7B and pi0-L is hypothetical. This instrument deliberately keeps
 * the original 3.0B teaching coordinate and deterministic scaling rule.
 * Preserve keyboard, reset, readouts and all calculations.
 */

const WINDOW_MS = 280;
const WIDTH = CHART_VIEW_WIDTH;
const LEFT = 14;
const RIGHT = WIDTH - 18;
const GAP = 5;
const LABEL_ASCENT = CHART_TYPE.labelPx * CHART_TYPE.ascent;
const LABEL_DESCENT = CHART_TYPE.labelPx * CHART_TYPE.descent;

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

// Rows from the top: the budget and pi0-L labels, the inference lane, the
// pi0 label, then the time axis with its ticks and title. The 6-unit edge
// margins leave labels 4 px clear of the svg edge at 375 px, where one unit
// is slightly less than one pixel.
const TOP_LABEL_Y = f(6 + LABEL_ASCENT);
const LANE_TOP = f(TOP_LABEL_Y + LABEL_DESCENT + GAP);
const LANE_H = 24;
const LANE_BOTTOM = LANE_TOP + LANE_H;
const BAR_INSET = 4;
const BOTTOM_LABEL_Y = f(LANE_BOTTOM + GAP + LABEL_ASCENT);
const AXIS_Y = f(BOTTOM_LABEL_Y + LABEL_DESCENT + GAP);
const HEIGHT = Math.ceil(
  AXIS_Y +
    CHART_STROKE.tickLength * 1.25 +
    CHART_TYPE.tickPx * (1 + CHART_TYPE.descent) +
    CHART_TYPE.axisPx * (CHART_TYPE.ascent + CHART_TYPE.descent) +
    6,
);
const PLOT = { left: LEFT, right: RIGHT, top: LANE_TOP, bottom: AXIS_Y };

const x = (ms: number) => f(LEFT + (ms / WINDOW_MS) * (RIGHT - LEFT));

const DEFAULT_PARAMS_B = PI0_ANCHOR.paramsB;

type ControlLoopBudgetProps = {
  /**
   * Initial teaching coordinate in billions. Defaults to the chosen 3.0B
   * coordinate (not paper pi0 size); Reset returns to this value.
   */
  defaultParamsB?: number;
  className?: string;
};

function formatMs(ms: number): string {
  return `${ms.toFixed(1)} ms`;
}

/** Reference figures: whole ms when the source value is whole. */
function formatRefMs(ms: number): string {
  return Number.isInteger(ms) ? `${ms} ms` : `${ms.toFixed(2)} ms`;
}

/**
 * The cited latencies, kept apart from the toy curve: each keeps its own
 * protocol detail and its reading against the 20 ms budget, in plain text.
 * A training-delay setting is not read against the budget; its label says
 * what it is. Divs with list roles, because the article's unlayered prose
 * list rules would indent and space a real list on the stage.
 */
function ReferenceList() {
  return (
    <div className="min-w-0 basis-full">
      <div className="font-sans text-xs text-text-dim">Cited latencies</div>
      <div role="list">
        {LATENCY_REFERENCES.map((ref) => (
          <div
            key={ref.id}
            role="listitem"
            data-testid={`ref-${ref.id}`}
            className="flex flex-wrap items-baseline gap-x-2 py-0.5 font-sans text-[13px] leading-snug"
          >
            <span className="text-text">{ref.label}</span>
            <span className="tabular-nums text-text">{formatRefMs(ref.ms)}</span>
            {ref.absorbed ? null : (
              <span className="text-text-dim">
                {loopCloses(ref.ms) ? 'closes at 50 Hz' : 'over budget'}
              </span>
            )}
            <span className="basis-full text-xs text-text-dim">{ref.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ControlLoopBudget({
  defaultParamsB = DEFAULT_PARAMS_B,
  className,
}: ControlLoopBudgetProps) {
  // useId-derived ids keep the label binding and the hatch pattern unique
  // if the figure is mounted more than once on a page.
  const uid = useId();
  const modelSizeId = `${uid}-clb-model-size`;
  const descriptionId = `${uid}-clb-description`;
  const [paramsB, setParamsB] = useState<number>(defaultParamsB);
  // Derive state during render when the initial prop changes (the repo
  // pattern, never useEffect): compare against the previous prop value
  // and resync before painting.
  const [prevDefaultParamsB, setPrevDefaultParamsB] = useState(defaultParamsB);
  if (defaultParamsB !== prevDefaultParamsB) {
    setPrevDefaultParamsB(defaultParamsB);
    setParamsB(defaultParamsB);
  }

  const inferenceMs = inferenceMsOnThor(paramsB);
  const closes = loopCloses(inferenceMs);
  const missed = missedTicks(inferenceMs);
  const hz = effectiveHz(inferenceMs);

  const budgetX = x(CONTROL_PERIOD_MS);
  const overflowMs = Math.max(0, inferenceMs - WINDOW_MS);
  const pi0X = x(PI0_ANCHOR.inferenceMs);
  const pi0LX = x(PI0L_ANCHOR.inferenceMs);
  const periods = Array.from(
    { length: WINDOW_MS / CONTROL_PERIOD_MS + 1 },
    (_, i) => i * CONTROL_PERIOD_MS,
  );

  function reset() {
    setParamsB(defaultParamsB);
  }

  const constraint = roleColour('constraint');
  const hatchId = `clb-overrun-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  // The bar fills the budget in the value role; any inference past the
  // 20 ms deadline continues as the constraint hatch, so the verdict reads
  // from the mark pattern as well as from the readout.
  const withinW = f(Math.max(2, x(Math.min(inferenceMs, CONTROL_PERIOD_MS)) - LEFT));
  const overrunEndMs = Math.min(inferenceMs, WINDOW_MS);
  const labelTop = f(TOP_LABEL_Y - LABEL_ASCENT);

  return (
    <InstrumentFigure
      figureId="control-loop-budget"
      className={className}
      heading="Control-loop budget"
      controls={
        <>
          <ControlField>
            <ControlLabel
              htmlFor={modelSizeId}
              value={
                <>
                  <span data-testid="params-readout">{paramsB.toFixed(1)}B params</span>
                  {', '}
                  <span data-testid="latency-readout">{formatMs(inferenceMs)}</span>
                </>
              }
            >
              Model size
            </ControlLabel>
            <input
              id={modelSizeId}
              type="range"
              data-brand-control-id="control:input"
              min={MIN_PARAMS_B}
              max={MAX_PARAMS_B}
              step={0.1}
              value={paramsB}
              onChange={(e) => setParamsB(Number(e.target.value))}
              aria-label={`Model size in billions of parameters, currently ${paramsB.toFixed(1)}`}
              aria-valuetext={`${paramsB.toFixed(1)} billion parameters`}
              className={INSTRUMENT_SLIDER_CLASS}
            />
          </ControlField>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="clb-inference" swatch={<LegendSwatch role="value" mark="bar" />}>
                  inference inside the budget
                </LegendItem>
                <LegendItem series="clb-overrun" swatch={<LegendSwatch role="constraint" mark="hatch" />}>
                  overrun past the budget
                </LegendItem>
                <LegendItem series="clb-references" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  VLA-Perf modeled latency
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                Synchronous toy:{' '}
                <span data-testid="verdict-readout">
                  {closes ? 'closes at 50 Hz' : 'does not close at 50 Hz'}
                </span>
                :{' '}
                <span data-testid="hz-readout">{Math.round(hz)} Hz</span>
                {' '}reciprocal inference rate, not robot Hz;{' '}
                <span data-testid="missed-readout">{missed}</span>
                {' '}
                {missed === 1 ? 'deadline' : 'deadlines'} missed
              </InstrumentReadout>
              <ReferenceList />
              <ChartDescription
                id={descriptionId}
                form="table"
                summary="Teaching-model inference by toy size, against the 20 ms budget"
                rowHeader="model size"
                columns={[
                  { header: 'inference', numeric: true },
                  { header: 'effective rate', numeric: true },
                  { header: 'loop', numeric: false },
                ]}
                rows={[0.5, 1.0, 2.0, 3.0, 6.0, 9.1].map((b) => {
                  const ms = inferenceMsOnThor(b);
                  return {
                    label: `${b.toFixed(1)}B`,
                    values: [
                      formatMs(ms),
                      `${Math.round(effectiveHz(ms))} Hz`,
                      loopCloses(ms) ? 'closes' : 'does not close',
                    ],
                  };
                })}
                description={
                  <>
                    In this toy, the {paramsB.toFixed(1)}B coordinate gives {formatMs(inferenceMs)} of
                    inference against the {Math.round(CONTROL_PERIOD_MS)} ms budget of a{' '}
                    {CONTROL_HZ} Hz loop, {closes ? 'closing the loop' : `missing ${missed} ${missed === 1 ? 'deadline' : 'deadlines'} and running at ${Math.round(hz)} Hz`};
                    inference stays under budget only below about{' '}
                    {(PI0_ANCHOR.paramsB * CONTROL_PERIOD_MS / PI0_ANCHOR.inferenceMs).toFixed(1)}B
                    toy parameters. The 3.0B coordinate is deliberately chosen; VLA-Perf
                    models pi0 at 2.7B and pi0-L as hypothetical. All displayed rates are
                    reciprocal toy inference rates, not robot/controller frequencies.
                  </>
                }
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Control-loop timeline at ${paramsB.toFixed(1)}B parameters`}
            aria-describedby={descriptionId}
          >
            <ChartAxes
              plot={PLOT}
              x={x}
              y={() => PLOT.bottom}
              xTicks={periods.filter((ms) => ms % (2 * CONTROL_PERIOD_MS) === 0)}
              grid={false}
              yAxis={false}
              xLabel="time (ms)"
            />
            {/* One gridline per 20 ms control deadline, inside the lane only. */}
            {periods.map((ms) => (
              <line
                key={ms}
                data-chart-grid=""
                x1={x(ms)}
                x2={x(ms)}
                y1={LANE_TOP}
                y2={LANE_BOTTOM}
                stroke={CHART_STRUCTURE.axes}
                strokeWidth={CHART_STROKE.structure}
                opacity={CHART_STRUCTURE.axesOpacity}
              />
            ))}
            <g data-series="clb-inference" data-testid="inference-bar">
              <Bar x={LEFT} y={LANE_TOP + BAR_INSET} width={withinW} height={LANE_H - 2 * BAR_INSET} />
            </g>
            {inferenceMs > CONTROL_PERIOD_MS ? (
              <g data-series="clb-overrun">
                <ConstraintHatch
                  id={hatchId}
                  x={budgetX}
                  y={LANE_TOP + BAR_INSET}
                  width={f(x(overrunEndMs) - budgetX)}
                  height={LANE_H - 2 * BAR_INSET}
                />
              </g>
            ) : null}
            <line
              data-chart-mark="rule"
              data-chart-role="constraint"
              x1={budgetX}
              x2={budgetX}
              y1={labelTop}
              y2={LANE_BOTTOM}
              stroke={constraint}
              strokeWidth={CHART_STROKE.reference}
            />
            <g data-testid="budget-line-label">
              <DirectLabel x={budgetX + 4} y={TOP_LABEL_Y} role="constraint">
                20 ms budget
              </DirectLabel>
            </g>
            <g data-series="clb-references">
              <LineTrace
                role="reference"
                points={[
                  [pi0X, LANE_TOP],
                  [pi0X, f(BOTTOM_LABEL_Y + LABEL_DESCENT)],
                ]}
              />
              <DirectLabel x={pi0X + 4} y={BOTTOM_LABEL_Y} role="reference">
                pi0 reference (modeled)
              </DirectLabel>
              <LineTrace
                role="reference"
                points={[
                  [pi0LX, labelTop],
                  [pi0LX, LANE_BOTTOM],
                ]}
              />
              <DirectLabel x={pi0LX - 4} y={TOP_LABEL_Y} role="reference" anchor="end">
                pi0-L hypothetical
              </DirectLabel>
            </g>
            {overflowMs > 0 ? (
              <DirectLabel x={RIGHT} y={BOTTOM_LABEL_Y} role="constraint" anchor="end">
                +{Math.round(overflowMs)} ms
              </DirectLabel>
            ) : null}
          </PlotStage>
        </FigureStage>
      }
      caption="One synchronous inference call against the 20 ms budget; each deadline under the hatched overrun is missed."
      source={
        <span data-testid="model-assumption-note">
          Illustrative teaching model, not hardware profiling. VLA-Perf v1 models 2.7B pi0 at 52.57 ms
          and hypothetical 9.1B pi0-L at 3.9 Hz; this plot deliberately places the first reference at 3.0B.
        </span>
      }
    />
  );
}
