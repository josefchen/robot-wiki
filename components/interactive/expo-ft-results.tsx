'use client';

import { useId } from 'react';
import {
  InstrumentFrame,
  InstrumentHeader,
  InstrumentLegend,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { ChartDescription } from '@/components/ui/chart-description';

/**
 * ExpoFtResults: grouped bar chart of the EXPO-FT paper's four-task
 * comparison (verified against arXiv:2605.25477v2, cited as
 * expo-ft-2026). Every plotted number is a successful-trials count out of
 * 30 from that paper's own comparison table; no value is derived or
 * interpolated. The chart is fully static: no controls, no state, no
 * motion, so it is deterministic and reduced-motion safe by construction.
 *
 * The HIL-SERL (M) footnote is data, not decoration: the same paper states
 * HIL-SERL is highly reliable in its original evaluations, that this suite
 * randomizes a substantially larger initial-state space, and that the
 * standard budget was too small for HIL-SERL to begin learning on Cube
 * Pick and Pool Shot, so the 5.5/30 average must not read as a refutation
 * of human-in-the-loop RL.
 */

export const WIDTH = 640;
export const HEIGHT = 340;
export const PLOT = { left: 40, right: 632, top: 44, bottom: 292 } as const;
export const GROUPS = ['Egg Flip', 'Cube Pick', 'Pool Shot', 'Flower Insertion'] as const;
export const MAX_TRIALS = 30;

/** Verified successes out of 30 per method and task (arXiv:2605.25477v2). */
export const METHODS = [
  { id: 'sft', label: 'SFT on π0.5', values: [16, 22, 23, 14] },
  { id: 'hg-dagger', label: 'HG-DAgger', values: [18, 26, 14, 24] },
  { id: 'dsrl', label: 'DSRL', values: [15, 24, 25, 12] },
  { id: 'hil-serl', label: 'HIL-SERL', values: [13, 0, 1, 8] },
  { id: 'expo-ft', label: 'EXPO-FT', values: [30, 30, 30, 30] },
] as const;

const BAR_WIDTH = 20;
const BAR_GAP = 4;
const GROUP_WIDTH = (PLOT.right - PLOT.left) / GROUPS.length; // 148
const BARS_WIDTH = METHODS.length * BAR_WIDTH + (METHODS.length - 1) * BAR_GAP; // 116

/** Bar bottom y for a trials count; SSR-stable to 2 decimals. */
const f = (v: number) => Number(v.toFixed(2));

/** The x origin of one method's bar inside one task group. */
export function barX(groupIndex: number, methodIndex: number): number {
  const groupX =
    PLOT.left + groupIndex * GROUP_WIDTH + (GROUP_WIDTH - BARS_WIDTH) / 2;
  return f(groupX + methodIndex * (BAR_WIDTH + BAR_GAP));
}

export function yFor(trials: number): number {
  const t = trials / MAX_TRIALS;
  return f(PLOT.bottom - t * (PLOT.bottom - PLOT.top));
}

const Y_TICKS = [0, 10, 20, 30] as const;

export function ExpoFtResults({ className }: { className?: string }) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const dotTileId = `${uid}-dot-tile`;
  const hatchTileId = `${uid}-hatch-tile`;

  return (
    <InstrumentFrame className={className}>
      <InstrumentHeader label="EXPO-FT four-task comparison, successes out of 30 trials" />
      <PlotStage
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        aria-label="Successful trials out of 30 for five methods across four manipulation tasks"
        aria-describedby={descriptionId}
        className="mt-3"
      >
        <defs>
          <pattern
            id={dotTileId}
            width={4}
            height={4}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={2} cy={2} r={1.1} fill="var(--color-text-dim)" />
          </pattern>
          <pattern
            id={hatchTileId}
            width={5}
            height={5}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1={2.5}
              y1={0}
              x2={2.5}
              y2={5}
              stroke="var(--color-text-dim)"
              strokeWidth={1.6}
            />
          </pattern>
        </defs>

        {/* Gridlines and y tick labels. */}
        {Y_TICKS.map((t) => (
          <g key={t}>
            <line
              x1={PLOT.left}
              x2={PLOT.right}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={PLOT.left - 8}
              y={f(yFor(t) + 3)}
              textAnchor="end"
              fill="var(--color-text-dim)"
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Grouped bars; one testid per method and task for the e2e spec. */}
        {GROUPS.map((task, gi) => {
          const groupX = PLOT.left + gi * GROUP_WIDTH + (GROUP_WIDTH - BARS_WIDTH) / 2;
          return (
            <g key={task}>
              {METHODS.map((method, mi) => {
                const trials = method.values[gi];
                const x = groupX + mi * (BAR_WIDTH + BAR_GAP);
                const y = yFor(trials);
                const height = f(PLOT.bottom - y);
                const fill =
                  method.id === 'dsrl'
                    ? `url(#${dotTileId})`
                    : method.id === 'hil-serl'
                      ? `url(#${hatchTileId})`
                      : method.id === 'expo-ft'
                        ? 'var(--color-accent)'
                        : method.id === 'hg-dagger'
                          ? 'var(--color-border-strong)'
                          : 'var(--color-text-dim)';
                return (
                  <g
                    key={method.id}
                    data-series={method.id}
                    data-testid={`expo-ft-bar-${method.id}-${gi}`}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={BAR_WIDTH}
                      height={height}
                      fill={fill}
                      stroke="var(--color-border)"
                      strokeWidth={0.5}
                    />
                    <text
                      x={f(x + BAR_WIDTH / 2)}
                      y={f(y - 5)}
                      textAnchor="middle"
                      fill={method.id === 'expo-ft' ? 'var(--color-accent)' : 'var(--color-text-dim)'}
                      fontSize={9}
                      fontFamily="var(--font-mono)"
                    >
                      {trials}
                    </text>
                  </g>
                );
              })}
              <text
                x={f(PLOT.left + gi * GROUP_WIDTH + GROUP_WIDTH / 2)}
                y={f(PLOT.bottom + 16)}
                textAnchor="middle"
                fill="var(--color-text-dim)"
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {task}
              </text>
            </g>
          );
        })}
      </PlotStage>

      {/* Legend; swatches repeat the exact bar fills and tiles so the
          mapping survives desaturation. */}
      <InstrumentLegend className="mt-2">
        {METHODS.map((method) => (
          <LegendItem
            key={method.id}
            series={method.id}
            swatch={
              <svg width={10} height={10} aria-hidden className="shrink-0">
                <rect
                  width={10}
                  height={10}
                  fill={
                    method.id === 'dsrl'
                      ? `url(#${dotTileId})`
                      : method.id === 'hil-serl'
                        ? `url(#${hatchTileId})`
                        : method.id === 'expo-ft'
                          ? 'var(--color-accent)'
                          : method.id === 'hg-dagger'
                            ? 'var(--color-border-strong)'
                            : 'var(--color-text-dim)'
                  }
                  stroke="var(--color-border)"
                  strokeWidth={0.5}
                />
              </svg>
            }
          >
            {method.label}
          </LegendItem>
        ))}
      </InstrumentLegend>
      <p className="mt-2 font-sans text-xs leading-relaxed text-text-dim">
        HIL-SERL (M), trained with additional samples on the two tasks where the
        standard budget was too small for learning to start, reaches 27/30 on
        Cube Pick and 13/30 on Pool Shot. The same paper notes HIL-SERL is
        highly reliable in its original evaluations and that this suite
        randomizes a substantially larger initial-state space.
      </p>

      <ChartDescription
        id={descriptionId}
        className="mt-3"
        form="table"
        summary="Per-task successes out of 30"
        rowHeader="task"
        columns={[
          { header: 'SFT on π0.5', numeric: true },
          { header: 'HG-DAgger', numeric: true },
          { header: 'DSRL', numeric: true },
          { header: 'HIL-SERL', numeric: true },
          { header: 'EXPO-FT', numeric: true },
        ]}
        rows={GROUPS.map((task, gi) => ({
          label: task,
          values: METHODS.map((method) => `${method.values[gi]}/30`),
        }))}
        description="On the four shared comparison tasks EXPO-FT completes 30 of 30 trials on every task, against average successes of 18.8 for supervised finetuning, 20.5 for HG-DAgger, 19 for DSRL and 5.5 for HIL-SERL; the same paper notes HIL-SERL is highly reliable in its original evaluations and that this suite randomizes a substantially larger initial-state space, and with extra training samples HIL-SERL reaches 27 of 30 on Cube Pick and 13 of 30 on Pool Shot."
      />
    </InstrumentFrame>
  );
}
