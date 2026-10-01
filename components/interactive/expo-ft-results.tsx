'use client';

import { useId } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  InstrumentFigure,
  InstrumentLegend,
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

/**
 * ExpoFtResults: the EXPO-FT paper's four-task comparison (verified against
 * arXiv:2605.25477v2, cited as expo-ft-2026) as small multiples. Each task
 * is one panel of horizontal bars; the methods are rows that share one
 * labelled column, so a method is told apart by its row and its direct
 * label, never by a second colour. Every plotted number is a
 * successful-trials count out of 30 from that paper's own comparison table;
 * no value is derived or interpolated. The chart is fully static: no
 * controls, no state, no motion.
 *
 * The HIL-SERL caveat (the suite randomizes a substantially larger
 * initial-state space, and the standard budget was too small for learning to
 * start on Cube Pick and Pool Shot) stays in the description and in the
 * article paragraph that follows the chart, so the 5.5/30 average does not
 * read as a refutation of human-in-the-loop RL.
 */

export const WIDTH = CHART_VIEW_WIDTH;
export const HEIGHT = 182;
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

/** The panels' outer bounds; the method labels sit left of PLOT.left. */
export const PLOT = { left: 84, right: 336, top: 46, bottom: 156 } as const;
const LABEL_RIGHT = 78;
const PANEL_GAP = 8;
/** Room right of a full-length bar for its count label. */
const COUNT_ROOM = 18;
export const ROW_PITCH = 22;
export const BAR_THICKNESS = 12;

/** SSR-stable to 2 decimals. */
const f = (v: number) => Number(v.toFixed(2));

export const PANEL_WIDTH = f(
  (PLOT.right - PLOT.left - PANEL_GAP * (GROUPS.length - 1)) / GROUPS.length,
);
/** The bar length of a 30/30 result. */
export const BAR_MAX = f(PANEL_WIDTH - COUNT_ROOM);

/** The left edge of one task panel, where every bar in it starts. */
export function panelLeft(groupIndex: number): number {
  return f(PLOT.left + groupIndex * (PANEL_WIDTH + PANEL_GAP));
}

/** The top edge of one method's bar; the same row in every panel. */
export function barTop(methodIndex: number): number {
  return f(PLOT.top + methodIndex * ROW_PITCH + (ROW_PITCH - BAR_THICKNESS) / 2);
}

/** A bar's length for a trials count, on the shared 0 to 30 scale. */
export function barLength(trials: number): number {
  return f((trials / MAX_TRIALS) * BAR_MAX);
}

/**
 * Panel titles, bottom-aligned on one baseline. The long task name breaks
 * onto two lines; the break is set in em, so its leading follows the painted
 * type size, which stage.css holds constant while the drawing scales.
 */
const GROUP_LINES: Record<(typeof GROUPS)[number], readonly string[]> = {
  'Egg Flip': ['Egg Flip'],
  'Cube Pick': ['Cube Pick'],
  'Pool Shot': ['Pool Shot'],
  'Flower Insertion': ['Flower', 'Insertion'],
};
const TITLE_BASELINE = 37;
const TITLE_LEADING_EM = 1.3;
const TICK_Y = f(PLOT.bottom + CHART_STROKE.tickLength + CHART_TYPE.tickPx);

export function ExpoFtResults({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const value = roleColour('value');
  const structure = {
    stroke: CHART_STRUCTURE.axes,
    strokeWidth: CHART_STROKE.structure,
    opacity: CHART_STRUCTURE.axesOpacity,
  };

  return (
    <InstrumentFigure
      figureId="expo-ft-results"
      className={className}
      heading="EXPO-FT four-task comparison"
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem swatch={<LegendSwatch role="value" mark="bar" />}>
                  successful trials out of 30
                </LegendItem>
              </InstrumentLegend>
              <ChartDescription
                id={descriptionId}
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
            </>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Successful trials out of 30 for five methods across four manipulation tasks"
            aria-describedby={descriptionId}
          >
            {/* One method label per row, shared by the four panels. */}
            {METHODS.map((method, mi) => (
              <text
                key={method.id}
                data-scene-tick=""
                x={LABEL_RIGHT}
                y={f(barTop(mi) + BAR_THICKNESS / 2)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={CHART_TYPE.tickPx}
                fill={CHART_STRUCTURE.label}
              >
                {method.label}
              </text>
            ))}

            {GROUPS.map((task, gi) => {
              const left = panelLeft(gi);
              const lines = GROUP_LINES[task];
              return (
                <g key={task} data-chart-panel={gi}>
                  <text
                    data-scene-axis=""
                    x={left}
                    y={TITLE_BASELINE}
                    fontSize={CHART_TYPE.axisPx}
                    fill={CHART_STRUCTURE.label}
                  >
                    {lines.map((line, li) => (
                      <tspan
                        key={line}
                        x={left}
                        dy={
                          li === 0
                            ? `${-(lines.length - 1) * TITLE_LEADING_EM}em`
                            : `${TITLE_LEADING_EM}em`
                        }
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                  <g data-chart-axes="">
                    <line x1={left} x2={left} y1={PLOT.top} y2={PLOT.bottom} {...structure} />
                    <line x1={left} x2={f(left + BAR_MAX)} y1={PLOT.bottom} y2={PLOT.bottom} {...structure} />
                    {[0, MAX_TRIALS].map((t) => (
                      <g key={t}>
                        <line
                          x1={f(left + barLength(t))}
                          x2={f(left + barLength(t))}
                          y1={PLOT.bottom}
                          y2={f(PLOT.bottom + CHART_STROKE.tickLength)}
                          {...structure}
                        />
                        <text
                          data-scene-tick=""
                          x={f(left + barLength(t))}
                          y={TICK_Y}
                          textAnchor="middle"
                          fontSize={CHART_TYPE.tickPx}
                          fill={CHART_STRUCTURE.labelSecondary}
                        >
                          {t}
                        </text>
                      </g>
                    ))}
                  </g>
                  {/* One testid per method and task for the e2e spec. */}
                  {METHODS.map((method, mi) => {
                    const trials = method.values[gi];
                    const length = barLength(trials);
                    const top = barTop(mi);
                    return (
                      <g
                        key={method.id}
                        data-series={method.id}
                        data-testid={`expo-ft-bar-${method.id}-${gi}`}
                      >
                        <rect
                          data-chart-mark="bar"
                          data-chart-role="value"
                          x={left}
                          y={top}
                          width={length}
                          height={BAR_THICKNESS}
                          fill={value}
                        />
                        <text
                          data-scene-tick=""
                          x={f(left + length + 3)}
                          y={f(top + BAR_THICKNESS / 2)}
                          dominantBaseline="middle"
                          fontSize={CHART_TYPE.tickPx}
                          fill={CHART_STRUCTURE.label}
                        >
                          {trials}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </PlotStage>
        </FigureStage>
      }
      caption="EXPO-FT finishes 30 of 30 trials on all four tasks; the four other methods range from 0 to 26."
      source="Counts from the EXPO-FT paper's four-task comparison (Dong 2026)."
    />
  );
}
