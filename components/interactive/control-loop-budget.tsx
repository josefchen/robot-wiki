'use client';

import { useId, useState } from 'react';
import {
  Badge,
  ChartDescription,
  ControlLabel,
  InstrumentFrame,
  InstrumentReadout,
  InstrumentReset,
  PlotStage,
} from '@/components/ui';
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
import { EDGE_DASH } from '@/lib/semantic-mark-cues';

/**
 * One synchronous toy inference against a 20 ms budget.
 * VLA-Perf numbers are analytical predictions, not measurements; its pi0
 * is 2.7B and pi0-L is hypothetical. This instrument deliberately keeps
 * the original 3.0B teaching coordinate and deterministic scaling rule.
 * Preserve keyboard, reset, two mounts, readouts and all calculations.
 */

const WINDOW_MS = 280;
const CHART = {
  width: 640,
  height: 150,
  pad: { top: 26, right: 14, bottom: 28, left: 44 },
};

const DEFAULT_PARAMS_B = PI0_ANCHOR.paramsB;

type ControlLoopBudgetProps = {
  /**
   * Initial teaching coordinate in billions. Defaults to the chosen
   * 3.0B coordinate (not paper pi0 size). A prediction step mounts at the size that
   * answers its prompt; existing mounts pass nothing and are unchanged.
   */
  defaultParamsB?: number;
  className?: string;
};

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function formatMs(ms: number): string {
  return `${ms.toFixed(1)} ms`;
}

/** Reference figures: whole ms when the source value is whole. */
function formatRefMs(ms: number): string {
  return Number.isInteger(ms) ? `${ms} ms` : `${ms.toFixed(2)} ms`;
}

export function ControlLoopBudget({
  defaultParamsB = DEFAULT_PARAMS_B,
  className,
}: ControlLoopBudgetProps) {
  // useId-derived input id: this component legitimately renders twice on
  // one page (a standalone mount plus a wrapped prediction figure), and a
  // hardcoded id would duplicate and cross-bind the label.
  const modelSizeId = `${useId()}-clb-model-size`;
  const descriptionId = `${useId()}-clb-description`;
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

  const plotW = CHART.width - CHART.pad.left - CHART.pad.right;
  const x = (ms: number) => f(CHART.pad.left + (ms / WINDOW_MS) * plotW);
  const barY = CHART.pad.top + 34;
  const barH = 26;
  const budgetX = x(CONTROL_PERIOD_MS);
  const barW = Math.max(2, x(Math.min(inferenceMs, WINDOW_MS)) - CHART.pad.left);
  const overflowMs = Math.max(0, inferenceMs - WINDOW_MS);

  function reset() {
    setParamsB(defaultParamsB);
  }

  return (
    <InstrumentFrame className={className}>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <ControlLabel
            htmlFor={modelSizeId}
            value={
              <span>
                <span data-testid="params-readout">
                  {paramsB.toFixed(1)}B params
                </span>
                {'  '}
                <span data-testid="latency-readout" className="text-accent">
                  {formatMs(inferenceMs)}
                </span>
              </span>
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
            className="mt-2 w-full accent-accent"
          />
        </div>
        <InstrumentReset onClick={reset} />
      </div>

      <PlotStage
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        aria-label={`Control-loop timeline at ${paramsB.toFixed(1)}B parameters`}
        aria-describedby={descriptionId}
        className="mt-4"
      >
        {/* Tick gridlines, one per 20 ms control period. */}
        {Array.from({ length: WINDOW_MS / CONTROL_PERIOD_MS + 1 }, (_, i) => {
          const ms = i * CONTROL_PERIOD_MS;
          return (
            <g key={ms}>
              <line
                x1={x(ms)}
                x2={x(ms)}
                y1={CHART.pad.top}
                y2={CHART.height - CHART.pad.bottom}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              {i % 2 === 0 && (
                <text
                  x={x(ms)}
                  y={CHART.height - 8}
                  textAnchor={ms === 0 ? 'start' : ms === WINDOW_MS ? 'end' : 'middle'}
                  fill="var(--color-text-dim)"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                >
                  {ms}
                </text>
              )}
            </g>
          );
        })}
        <text
          x={CHART.width - CHART.pad.right}
          y={CHART.height + 4 - 12}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          time (ms)
        </text>

        {/* The 20 ms budget line. */}
        <line
          x1={budgetX}
          x2={budgetX}
          y1={CHART.pad.top}
          y2={CHART.height - CHART.pad.bottom}
          stroke="var(--color-err)"
          strokeWidth={1.5}
          strokeDasharray="5 3"
        />
        <text
          data-testid="budget-line-label"
          x={budgetX + 5}
          y={CHART.pad.top + 10}
          fill="var(--color-err)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          20 ms budget (50 Hz)
        </text>

        {/* Reference latencies from analytical predictions; not measured anchors. */}
        {[PI0_ANCHOR, PI0L_ANCHOR].map((anchor) => (
          <g key={anchor.paramsB}>
            <line
              x1={x(anchor.inferenceMs)}
              x2={x(anchor.inferenceMs)}
              y1={CHART.pad.top + 16}
              y2={barY + barH + 10}
              stroke="var(--color-text-dim)"
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.7}
            />
            <text
              x={x(anchor.inferenceMs)}
              y={barY + barH + 22}
              textAnchor={anchor === PI0L_ANCHOR ? 'end' : 'middle'}
              fill="var(--color-text-dim)"
              fontSize={9}
              fontFamily="var(--font-mono)"
            >
              {anchor === PI0_ANCHOR ? 'pi0 reference (modeled)' : 'pi0-L hypothetical'}
            </text>
          </g>
        ))}

        {/* The inference bar. Its outline is closed while the loop closes and
            broken once inference overruns the budget, so the verdict is
            readable from the bar and not only from its hue. */}
        <rect
          data-testid="inference-bar"
          x={CHART.pad.left}
          y={barY}
          width={f(barW)}
          height={barH}
          fill={closes ? 'var(--color-ok)' : 'var(--color-err)'}
          fillOpacity={0.22}
          stroke={closes ? 'var(--color-ok)' : 'var(--color-err)'}
          strokeWidth={1.5}
          strokeDasharray={closes ? undefined : EDGE_DASH.error}
        />
        {overflowMs > 0 && (
          <text
            x={CHART.width - CHART.pad.right - 4}
            y={barY + barH / 2 + 3}
            textAnchor="end"
            fill="var(--color-err)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            +{Math.round(overflowMs)} ms
          </text>
        )}

        {/* Lane label. */}
        <text
          x={CHART.pad.left - 8}
          y={barY + barH / 2 + 3}
          textAnchor="end"
          fill="var(--color-text-dim)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          inference
        </text>
      </PlotStage>

      <InstrumentReadout>
        <span className="text-text-dim">Synchronous toy: </span>
        <span data-testid="verdict-readout" className={closes ? 'text-ok' : 'text-err'}>
          {closes ? 'closes at 50 Hz' : 'does not close at 50 Hz'}
        </span>
        <span className="text-text-dim">: </span>
        <span data-testid="hz-readout" className="text-accent">
          {Math.round(hz)} Hz
        </span>
        <span className="text-text-dim"> reciprocal inference rate, not robot Hz; </span>
        <span data-testid="missed-readout" className="text-accent">
          {missed}
        </span>
        <span className="text-text-dim">
          {' '}
          {missed === 1 ? 'deadline' : 'deadlines'} missed
        </span>
      </InstrumentReadout>

      <p data-testid="model-assumption-note" className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        Illustrative teaching model, not hardware profiling. VLA-Perf v1
        predicts 52.57 ms for 2.7B pi0 and 3.9 Hz for hypothetical 9.1B pi0-L.
        This plot deliberately places the first reference at 3.0B; its
        linear and power-law scaling are not the paper’s roofline model.
        A 20 ms inference budget is not a measured robot-control guarantee.
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
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

      <ul className="mt-4 divide-y divide-border">
        {LATENCY_REFERENCES.map((ref) => {
          const refCloses = loopCloses(ref.ms);
          return (
            <li
              key={ref.id}
              data-testid={`ref-${ref.id}`}
              className="flex flex-wrap items-baseline gap-x-3 py-2"
            >
              <span className="font-mono text-xs text-text">{ref.label}</span>
              <span className="font-mono text-xs text-accent">
                {formatRefMs(ref.ms)}
              </span>
              <span className="font-mono text-[10px] text-text-dim">
                {ref.detail}
              </span>
              <span className="ml-auto">
                {ref.absorbed ? (
                  <Badge variant="warn">training-delay setting</Badge>
                ) : refCloses ? (
                  <Badge variant="ok">closes at 50 Hz</Badge>
                ) : (
                  <Badge variant="err">over budget</Badge>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </InstrumentFrame>
  );
}
