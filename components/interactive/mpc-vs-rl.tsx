'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
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
  CHART_VIEW_WIDTH,
  ChartAxes,
  LegendSwatch,
  roleColour,
  type PlotRect,
} from '@/components/motion/chart';
import {
  APPLY_STEP,
  CONTROLLERS,
  DEFAULT_PERTURBATION,
  PERTURBATIONS,
  STATUS_META,
  TRACE_STEPS,
  type ControllerId,
} from '@/lib/mpc-vs-rl';
import { cx } from '@/lib/utils';

/**
 * MpcVsRl: one quadruped, two controllers, four perturbations. The
 * model-based controller (iLQR whole-body MPC) and the learned sim-RL
 * policy answer the same disturbance differently, and the difference is
 * the argument: MPC rejects modeled disturbances cleanly and fails when
 * the model is wrong; the policy absorbs what it was randomized over and
 * fails ungracefully outside it. A compute-per-step readout contrasts
 * online re-solving with a single forward pass.
 *
 * Traces are base-height deviation in centimeters, an illustrative
 * teaching model rather than measured hardware data, labeled as such.
 *
 * Interactive contract: deterministic initial render (lateral push),
 * native buttons (keyboard-accessible), visible readouts, reset control,
 * fixed SVG viewport (no layout shift), no JS-driven motion
 * (selection-only, reduced-motion safe by construction).
 */

const WIDTH = CHART_VIEW_WIDTH;
const HEIGHT = 180;
const PLOT: PlotRect = { left: 30, right: 326, top: 28, bottom: 132 };
const X_TICKS = [0, 10, 20, 30, TRACE_STEPS - 1];

const f = (v: number) => Number(v.toFixed(2));

/**
 * Both traces plot the same quantity, so they share the state role and
 * differ by line: solid for MPC, dashed for the policy.
 */
const TRACE_DASH: Record<ControllerId, string | undefined> = {
  mpc: undefined,
  rl: CHART_STROKE.dash,
};

/**
 * The status hues are reserved for page-ground badges and fall below
 * contrast on the graphite stage, so the status is the word in the stage
 * text colour and the chip's border repeats it: dashed when it recovers,
 * solid when degraded, heavy when it falls.
 */
const STATUS_LINE: Record<'ok' | 'warn' | 'err', string> = {
  ok: 'border border-dashed border-text-dim',
  warn: 'border border-solid border-text',
  err: 'border border-solid border-text font-semibold',
};

function xFor(step: number): number {
  return f(PLOT.left + (step / (TRACE_STEPS - 1)) * (PLOT.right - PLOT.left));
}

/**
 * The deviation axis spans every sample of both traces, below zero too:
 * an oscillating recovery overshoots the nominal height.
 */
function deviationDomain(traces: number[][]): { lo: number; hi: number; ticks: number[] } {
  const values = traces.flat();
  const min = Math.min(0, ...values);
  const max = Math.max(4, ...values);
  const span = max - min;
  const step = span <= 8 ? 2 : span <= 16 ? 4 : 8;
  const hi = Math.ceil(max / step) * step;
  const lo = min < 0 ? Math.floor(min / 2) * 2 : 0;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t === 0 ? 0 : t);
  return { lo, hi, ticks };
}

/** One controller's verdict on the selected perturbation, and its compute. */
function ControllerPanel({
  id,
  perturbation,
}: {
  id: ControllerId;
  perturbation: (typeof PERTURBATIONS)[number];
}) {
  const controller = CONTROLLERS[id];
  const response = perturbation[id];
  const status = STATUS_META[response.status];
  return (
    <div className="grid content-start gap-1.5 border-t border-border-strong pt-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-text-dim">{controller.name}</span>
        <span
          data-testid={`${id}-status`}
          data-status={response.status}
          data-brand-surface-id="surface:flat"
          className={cx(
            'inline-flex shrink-0 items-center rounded-xs px-1.5 py-0.5 text-xs leading-none',
            STATUS_LINE[status.tone],
          )}
        >
          {status.label}
        </span>
      </div>
      <div data-testid={`${id}-annotation`} className="leading-relaxed">
        {response.annotation}
      </div>
      <div className="text-text-dim">
        Compute per step:{' '}
        <span data-testid={`${id}-compute`} className="text-text">
          {controller.compute}
        </span>
      </div>
    </div>
  );
}

export function MpcVsRl({ className }: { className?: string }) {
  const descriptionId = `${useId()}-mpc-description`;
  const [selected, setSelected] = useState(DEFAULT_PERTURBATION);
  const perturbation =
    PERTURBATIONS.find((p) => p.id === selected) ?? PERTURBATIONS[0];

  const domain = deviationDomain([perturbation.mpc.trace, perturbation.rl.trace]);

  const sampleRows = useMemo(
    () =>
      [0, APPLY_STEP, 10, 20, 30, TRACE_STEPS - 1].map((step) => ({
        label: `${step}`,
        values: [
          perturbation.mpc.trace[step].toFixed(2),
          perturbation.rl.trace[step].toFixed(2),
        ],
      })),
    [perturbation],
  );

  const mpcEnd = perturbation.mpc.trace[TRACE_STEPS - 1];
  const rlEnd = perturbation.rl.trace[TRACE_STEPS - 1];
  const mpcPeak = Math.max(...perturbation.mpc.trace);
  const rlPeak = Math.max(...perturbation.rl.trace);
  const descriptionText = `After a ${perturbation.label} at step ${APPLY_STEP} the MPC base-height deviation peaks at ${mpcPeak.toFixed(2)} cm and ends at ${mpcEnd.toFixed(2)} cm while the RL policy peaks at ${rlPeak.toFixed(2)} cm and ends at ${rlEnd.toFixed(2)} cm; MPC compute per step ${CONTROLLERS.mpc.compute}, the RL policy is ${CONTROLLERS.rl.compute}, and the dashed RL trace is an illustrative teaching model rather than measured hardware data.`;

  function yFor(deviation: number): number {
    return f(
      PLOT.bottom -
        ((deviation - domain.lo) / (domain.hi - domain.lo)) * (PLOT.bottom - PLOT.top),
    );
  }

  function points(trace: number[]): string {
    return trace.map((d, s) => `${xFor(s)},${yFor(d)}`).join(' ');
  }

  const stateColour = roleColour('state');
  const markerX = xFor(APPLY_STEP);

  return (
    <InstrumentFigure
      figureId="mpc-vs-rl"
      className={className}
      heading="MPC and RL after a perturbation"
      controls={
        <>
          <div role="group" aria-label="Perturbation" className="flex flex-wrap items-center gap-1">
            {PERTURBATIONS.map((p) => (
              <button
                data-brand-control-id="control:selection"
                key={p.id}
                type="button"
                aria-pressed={selected === p.id}
                onClick={() => setSelected(p.id)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {p.label}
              </button>
            ))}
          </div>
          <InstrumentReset onClick={() => setSelected(DEFAULT_PERTURBATION)} />
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem series="mpc" swatch={<LegendSwatch role="state" mark="line" />}>
                  {CONTROLLERS.mpc.short}
                </LegendItem>
                <LegendItem series="rl" swatch={<LegendSwatch role="state" mark="dash" />}>
                  {CONTROLLERS.rl.short}
                </LegendItem>
                <LegendItem series="perturbation" swatch={<LegendSwatch role="reference" mark="dash" />}>
                  {perturbation.label} at step {APPLY_STEP}
                </LegendItem>
              </InstrumentLegend>
              <InstrumentReadout>
                Peak deviation: {CONTROLLERS.mpc.short}{' '}
                <span style={{ color: stateColour }}>{mpcPeak.toFixed(2)} cm</span>,{' '}
                {CONTROLLERS.rl.short}{' '}
                <span style={{ color: stateColour }}>{rlPeak.toFixed(2)} cm</span>
              </InstrumentReadout>
              <div className="grid basis-full gap-x-6 gap-y-3 pt-1.5 pb-1 font-sans text-[13px] leading-snug text-text sm:grid-cols-2">
                {(['mpc', 'rl'] as ControllerId[]).map((id) => (
                  <ControllerPanel key={id} id={id} perturbation={perturbation} />
                ))}
              </div>
              <ChartDescription
                id={descriptionId}
                form="table"
                summary="Sampled base-height deviation for both controllers"
                rowHeader="step"
                columns={[
                  { header: 'MPC (cm)', numeric: true },
                  { header: 'RL (cm)', numeric: true },
                ]}
                rows={sampleRows}
                description={descriptionText}
              />
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            data-testid="perturbation-chart"
            aria-label={`Base-height deviation after a ${perturbation.label}. MPC: ${STATUS_META[perturbation.mpc.status].label}. RL policy: ${STATUS_META[perturbation.rl.status].label}.`}
            aria-describedby={descriptionId}
          >
            <ChartAxes
              plot={PLOT}
              x={xFor}
              y={yFor}
              xTicks={X_TICKS}
              yTicks={domain.ticks}
              xLabel="control steps after perturbation"
              yLabel="base-height deviation (cm)"
            />
            <line
              data-series="perturbation"
              x1={markerX}
              x2={markerX}
              y1={PLOT.top}
              y2={PLOT.bottom}
              stroke={roleColour('reference')}
              strokeWidth={CHART_STROKE.reference}
              strokeDasharray={CHART_STROKE.dash}
            />
            {(['rl', 'mpc'] as ControllerId[]).map((id) => (
              <polyline
                key={id}
                data-testid={`${id}-trace`}
                data-series={id}
                points={points(perturbation[id].trace)}
                fill="none"
                stroke={stateColour}
                strokeWidth={CHART_STROKE.trace}
                strokeDasharray={TRACE_DASH[id]}
                strokeLinejoin="round"
              />
            ))}
          </PlotStage>
        </FigureStage>
      }
      caption="Same robot, same perturbation, two controllers; each trace is the base-height deviation after the disturbance."
      source="The traces are an illustrative model of the failure modes the literature reports, not measured hardware data."
    />
  );
}
