'use client';

import { useId } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';

/**
 * ExpoFtResults: the EXPO-FT paper's four-task comparison (verified against
 * arXiv:2605.25477v2, cited as expo-ft-2026). Each method is one row: its
 * name and a plain description of how it learns on one line, and under it
 * one bar per task, with the task names once across the top. EXPO-FT, the
 * lead series, is drawn at full strength on a shaded row; the others are
 * paler. Every plotted number is a successful-trials count out of 30 from
 * that paper's own comparison table; no value is derived or interpolated.
 * The chart is fully static: no controls, no state, no motion.
 *
 * The HIL-SERL caveat (the suite randomizes a substantially larger
 * initial-state space, and the standard budget was too small for learning to
 * start on Cube Pick and Pool Shot) stays in the description and in the
 * article paragraph that follows the chart, so the 5.5/30 average does not
 * read as a refutation of human-in-the-loop RL.
 */

export const WIDTH = CHART_VIEW_WIDTH;
export const GROUPS = ['Egg Flip', 'Cube Pick', 'Pool Shot', 'Flower Insertion'] as const;
export const MAX_TRIALS = 30;

/** Verified successes out of 30 per method and task (arXiv:2605.25477v2). */
export const METHODS = [
  { id: 'sft', label: 'SFT on π0.5', plain: 'copying demos only', values: [16, 22, 23, 14] },
  { id: 'hg-dagger', label: 'HG-DAgger', plain: 'human steps in to correct', values: [18, 26, 14, 24] },
  { id: 'dsrl', label: 'DSRL', plain: 'practice by trial and error', values: [15, 24, 25, 12] },
  { id: 'hil-serl', label: 'HIL-SERL', plain: 'practice by trial and error', values: [13, 0, 1, 8] },
  { id: 'expo-ft', label: 'EXPO-FT', plain: 'practice by trial and error', values: [30, 30, 30, 30] },
] as const;

const LEAD_ID = 'expo-ft';

/** The bars' outer bounds; each method's name sits on the line above its bars. */
export const PLOT = { left: 2, right: 338, top: 58, bottom: 278 } as const;
const PANEL_GAP = 8;
/** Room right of a full-length bar for its count label. */
const COUNT_ROOM = 20;
export const ROW_PITCH = 44;
export const BAR_THICKNESS = 12;
/** A row's name line, then its bars below it. */
const NAME_BASELINE = 14;
const BAR_OFFSET = 21;
export const HEIGHT = PLOT.bottom + 40;

/** SSR-stable to 2 decimals. */
const f = (v: number) => Number(v.toFixed(2));

export const PANEL_WIDTH = f(
  (PLOT.right - PLOT.left - PANEL_GAP * (GROUPS.length - 1)) / GROUPS.length,
);
/** The bar length of a 30/30 result. */
export const BAR_MAX = f(PANEL_WIDTH - COUNT_ROOM);

/** The left edge of one task column, where every bar in it starts. */
export function panelLeft(groupIndex: number): number {
  return f(PLOT.left + groupIndex * (PANEL_WIDTH + PANEL_GAP));
}

function rowTop(methodIndex: number): number {
  return PLOT.top + methodIndex * ROW_PITCH;
}

/** The top edge of one method's bars; the same row in every task column. */
export function barTop(methodIndex: number): number {
  return f(rowTop(methodIndex) + BAR_OFFSET);
}

/** A bar's length for a trials count, on the shared 0 to 30 scale. */
export function barLength(trials: number): number {
  return f((trials / MAX_TRIALS) * BAR_MAX);
}

/** Column titles, bottom-aligned on one baseline; the long name breaks in two. */
const GROUP_LINES: Record<(typeof GROUPS)[number], readonly string[]> = {
  'Egg Flip': ['Egg Flip'],
  'Cube Pick': ['Cube Pick'],
  'Pool Shot': ['Pool Shot'],
  'Flower Insertion': ['Flower', 'Insertion'],
};
const SCALE_BASELINE = 14;
const TITLE_BASELINE = 50;
const TITLE_LEADING_EM = 1.2;

const NOTE_LINES = ['Perfect score: 30 of 30 on every task'] as const;

export function ExpoFtResults({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const value = roleColour('value');
  const leadIndex = METHODS.findIndex((m) => m.id === LEAD_ID);
  const leadBand = rowTop(leadIndex);
  const noteY = PLOT.bottom + 30;

  return (
    <InstrumentFigure
      figureId="expo-ft-results"
      className={className}
      kicker="EXPO-FT vs four other methods"
      heading="One method succeeded every time on all four tasks"
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Successful trials out of 30 for five methods across four manipulation tasks"
            aria-describedby={descriptionId}
          >
            <text
              x={PLOT.left}
              y={SCALE_BASELINE}
              fontSize={CHART_TYPE.tickPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              Successes out of 30 tries, per task
            </text>
            {GROUPS.map((task, gi) => {
              const left = panelLeft(gi);
              const lines = GROUP_LINES[task];
              return (
                <text
                  key={task}
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
              );
            })}

            {/* The lead row's shading sits behind its name and bars. */}
            <rect
              data-expo-lead-row=""
              x={0}
              y={f(leadBand + 1)}
              width={WIDTH}
              height={ROW_PITCH - 4}
              fill={CHART_STRUCTURE.grid}
              opacity={0.45}
            />

            {METHODS.map((method, mi) => {
              const lead = method.id === LEAD_ID;
              return (
                <g key={method.id} data-expo-row={method.id}>
                  <text
                    data-scene-tick=""
                    x={PLOT.left}
                    y={rowTop(mi) + NAME_BASELINE}
                    fontSize={CHART_TYPE.tickPx}
                    fill={CHART_STRUCTURE.label}
                  >
                    <tspan fontWeight={lead ? 700 : 600}>{method.label}</tspan>
                    <tspan dx={8} fill={CHART_STRUCTURE.labelSecondary}>
                      {method.plain}
                    </tspan>
                  </text>
                  {/* One testid per method and task for the e2e spec. */}
                  {GROUPS.map((task, gi) => {
                    const trials = method.values[gi];
                    const left = panelLeft(gi);
                    const length = barLength(trials);
                    const top = barTop(mi);
                    return (
                      <g
                        key={task}
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
                          fillOpacity={lead ? 1 : 0.4}
                        />
                        <text
                          data-scene-tick=""
                          x={f(left + length + 3)}
                          y={f(top + BAR_THICKNESS / 2)}
                          dominantBaseline="middle"
                          fontSize={CHART_TYPE.tickPx}
                          fontWeight={lead ? 700 : undefined}
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

            {/* Each task column's zero line, so a 0 reads as a bar with no length. */}
            {METHODS.flatMap((method, mi) =>
              GROUPS.map((task, gi) => (
                <line
                  key={`${method.id}-${task}`}
                  x1={panelLeft(gi)}
                  x2={panelLeft(gi)}
                  y1={barTop(mi) - 2}
                  y2={barTop(mi) + BAR_THICKNESS + 2}
                  stroke={CHART_STRUCTURE.axes}
                  strokeOpacity={CHART_STRUCTURE.axesOpacity}
                  strokeWidth={CHART_STROKE.structure}
                />
              )),
            )}

            <StageAnnotation
              x={PLOT.left}
              y={noteY}
              lines={NOTE_LINES}
              target={[f(panelLeft(0) + BAR_MAX / 2), f(barTop(leadIndex) + BAR_THICKNESS + 7)]}
              from={[f(panelLeft(0) + BAR_MAX / 2), noteY - CHART_TYPE.labelPx + 1]}
            />
          </PlotStage>
        </FigureStage>
      }
      caption="After practising with EXPO-FT, the robot succeeded on every try across four tasks; copying demonstrations alone managed 14 to 23 of 30."
      method={
        <>
          <div>
            Each bar counts successful trials out of 30 on one task, from the comparison table in
            the EXPO-FT paper (Dong et al., 2026). No value is derived or interpolated.
          </div>
          <ul className="m-0! grid list-none gap-1.5 p-0!" data-testid="expo-ft-methods">
            <li className="my-0!">
              <span className="font-medium text-text">SFT on π0.5</span>: supervised finetuning,
              which copies demonstrations; it is the starting checkpoint EXPO-FT itself begins from.
            </li>
            <li className="my-0!">
              <span className="font-medium text-text">HG-DAgger</span>: a person takes over when the
              robot goes wrong, and the robot learns to copy those corrections.
            </li>
            <li className="my-0!">
              <span className="font-medium text-text">DSRL</span>: keeps the base policy frozen and
              runs reinforcement learning over the noise it starts from.
            </li>
            <li className="my-0!">
              <span className="font-medium text-text">HIL-SERL</span>: reinforcement learning on the
              robot from demonstrations, its own tries and human corrections.
            </li>
            <li className="my-0!">
              <span className="font-medium text-text">EXPO-FT</span>: reinforcement learning on
              π0.5 action chunks, where a small edit policy nudges sampled actions toward higher
              value, with human teleoperation corrections during online training.
            </li>
          </ul>
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
      source="Counts from the EXPO-FT paper's four-task comparison (Dong 2026)."
    />
  );
}
