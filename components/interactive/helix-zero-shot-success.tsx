'use client';

import { useId } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  Bar,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  DirectLabel,
  linearScale,
  roleColour,
} from '@/components/motion/chart';
import {
  HELIX_ID,
  HELIX_ZERO_SHOT,
  HELIX_ZERO_SHOT_CITATION_ID,
  SOLVED_BAR_PERCENT,
  zeroShotOf,
} from '@/lib/helix-zero-shot';

/**
 * HelixZeroShotSuccess: Figure's two zero-shot success rates in 30 unseen
 * homes, a policy trained from scratch and Helix 2.5 pretrained on Index,
 * on one percent ruler with the article's 90 percent bar for solved as a
 * dashed reference. Helix 2.5 takes the accent, and the one note names its
 * distance to the bar. The chart is static: no controls, no state, no
 * motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 6, right: 330 } as const;
const TICKS = [0, 50, 100] as const;
const BAR_LABEL_Y = 14;
const TOP = 24;
const ROW_PITCH = 44;
const NAME_BASELINE = 14;
const BAR_OFFSET = 21;
const BAR_THICKNESS = 12;
const AXIS_Y = TOP + HELIX_ZERO_SHOT.length * ROW_PITCH + 14;
const HEIGHT = AXIS_Y + 40;
const sx = linearScale([0, 100], [PLOT.left, PLOT.right]);
const f = (v: number) => Number(v.toFixed(2));

const SCRATCH = zeroShotOf('from-scratch');
const HELIX = zeroShotOf(HELIX_ID);
const SHORT_BY = SOLVED_BAR_PERCENT - HELIX;
const BAR_X = f(sx(SOLVED_BAR_PERCENT));

const CAPTION = `Figure's blind trials on three whole-body tasks, no partial credit. The ${SOLVED_BAR_PERCENT}% line is this article's bar for solved.`;
const DESCRIPTION = `Zero-shot success on three whole-body tasks in 30 unseen homes, as Figure reports it: ${SCRATCH}% for a policy trained from scratch and ${HELIX}% for Helix 2.5, pretrained on Figure's Index human data, both trained on the same task data. Helix 2.5 sits ${SHORT_BY} points below the ${SOLVED_BAR_PERCENT}% bar this article sets for solved. Figure published no trial counts.`;

export function HelixZeroShotSuccess({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();
  const record = citationFor(HELIX_ZERO_SHOT_CITATION_ID);
  const helixTop = TOP + HELIX_ZERO_SHOT.findIndex((r) => r.id === HELIX_ID) * ROW_PITCH;
  const helixEnd = f(sx(HELIX));

  return (
    <InstrumentFigure
      figureId="helix-zero-shot-success"
      className={className}
      kicker="Zero-shot success in 30 homes"
      heading={`Helix 2.5 reached ${HELIX}% in unseen homes, short of ${SOLVED_BAR_PERCENT}%`}
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Zero-shot success in unseen homes, from scratch and with pretraining"
            aria-describedby={descriptionId}
            data-testid="helix-zero-shot-success-stage"
          >
            <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
              {TICKS.slice(1).map((t) => (
                <line key={t} x1={f(sx(t))} x2={f(sx(t))} y1={TOP} y2={AXIS_Y} />
              ))}
            </g>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={PLOT.left} x2={PLOT.right} y1={AXIS_Y} y2={AXIS_Y} />
              <line x1={PLOT.left} x2={PLOT.left} y1={TOP} y2={AXIS_Y} />
            </g>
            <g data-testid="helix-solved-bar" data-percent={SOLVED_BAR_PERCENT}>
              {/* The label ends left of the line rather than straddling it: stage
                  text keeps its CSS size as the viewBox narrows, so on a phone a
                  straddling label sinks into the line's top. */}
              <line
                data-chart-role="reference"
                x1={BAR_X}
                x2={BAR_X}
                y1={BAR_LABEL_Y - 10}
                y2={AXIS_Y}
                stroke={roleColour('reference')}
                strokeWidth={CHART_STROKE.reference}
                strokeDasharray={CHART_STROKE.dash}
              />
              <DirectLabel x={f(BAR_X - 5)} y={BAR_LABEL_Y} anchor="end" role="reference">
                {`bar for solved, ${SOLVED_BAR_PERCENT}%`}
              </DirectLabel>
            </g>
            {HELIX_ZERO_SHOT.map((result, i) => {
              const top = TOP + i * ROW_PITCH;
              const lead = result.id === HELIX_ID;
              const end = f(sx(result.successPercent));
              return (
                <g
                  key={result.id}
                  data-testid={`helix-zero-shot-${result.id}`}
                  data-series={result.id}
                  data-success-percent={result.successPercent}
                >
                  <DirectLabel x={f(PLOT.left + 6)} y={top + NAME_BASELINE} seriesFor={result.id}>
                    <tspan fontWeight={lead ? 700 : 600}>{result.label}</tspan>
                  </DirectLabel>
                  <Bar
                    x={PLOT.left}
                    y={top + BAR_OFFSET}
                    width={f(end - PLOT.left)}
                    height={BAR_THICKNESS}
                    role={lead ? 'highlight' : 'measurement'}
                  />
                  <text
                    data-scene-readout=""
                    x={f(end + 6)}
                    y={f(top + BAR_OFFSET + BAR_THICKNESS - 2)}
                    fontSize={CHART_TYPE.readoutPx}
                    fontWeight={lead ? 700 : 400}
                    fill={CHART_STRUCTURE.label}
                  >
                    {`${result.successPercent}%`}
                  </text>
                </g>
              );
            })}
            <g data-figure-annotation="" data-testid="helix-zero-shot-gap">
              <text
                data-series-label-for={HELIX_ID}
                x={f(helixEnd + 6)}
                y={f(helixTop + BAR_OFFSET + BAR_THICKNESS + 15)}
                fontSize={CHART_TYPE.labelPx}
                fill={roleColour('highlight')}
              >
                {`${SHORT_BY} points short`}
              </text>
            </g>
            {TICKS.map((t, i) => (
              <text
                key={t}
                data-scene-tick=""
                x={f(sx(t))}
                y={AXIS_Y + 16}
                textAnchor={i === 0 ? 'start' : i === TICKS.length - 1 ? 'end' : 'middle'}
                fontSize={CHART_TYPE.tickPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                {`${t}%`}
              </text>
            ))}
            <text
              data-scene-axis=""
              x={PLOT.right}
              y={AXIS_Y + 34}
              textAnchor="end"
              fontSize={CHART_TYPE.axisPx}
              fill={CHART_STRUCTURE.labelSecondary}
            >
              trials with the whole task done
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <div>
            Figure trained two policies on the same task data, one from random weights and one from the
            Index-pretrained Helix 2.5 model, and ran both in 30 Bay Area homes where it had collected no data.
            Figure reports one success rate for the three tasks together (tidying a living room, folding towels,
            making a bed) and publishes no trial counts and no per-task rates. The {SOLVED_BAR_PERCENT} percent
            line is the bar for solved that this article sets.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            summary="Zero-shot success, with and without pretraining"
            description={DESCRIPTION}
            rowHeader="policy"
            columns={[{ header: 'zero-shot success (percent)', numeric: true }]}
            rows={[
              ...HELIX_ZERO_SHOT.map((r) => ({ label: r.row, values: [String(r.successPercent)] })),
              { label: 'Bar for solved, this article', values: [String(SOLVED_BAR_PERCENT)] },
            ]}
          />
        </>
      }
      source={
        <span data-testid="helix-zero-shot-success-source">
          {record ? (
            <a data-brand-control-id="control:link-focus" href={record.url} target="_blank" rel="noopener" className="underline-offset-2">
              {record.label}
            </a>
          ) : (
            'Figure, Helix 2.5'
          )}
          .
        </span>
      }
    />
  );
}
