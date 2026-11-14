'use client';

import { useId, useMemo, useState } from 'react';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, DirectLabel, roleColour } from '@/components/motion/chart';
import { useChartWidth } from '@/components/market-map/use-chart-width';
import { FX_RATES_DATE, FX_RATES_SOURCE_URL } from '@/data/fx-rates';
import { formatLongDate } from '@/lib/dates';
import { formatUsd, type MarketMapSegment } from '@/lib/market-map';
import { MOTION_STAGE } from '@/lib/motion-tokens';
import {
  CHART_WIDTH,
  DOT_R,
  RING_STROKE,
  drawOrder,
  figureRounds,
  leadingSegment,
  methodParagraphs,
  monthRows,
  percentOf,
  readoutText,
  roundsFigureCaption,
  roundsFigureDescription,
  roundsFigureFacts,
  roundsFigureHeadline,
  roundsFigureLayout,
  segmentTotals,
} from '@/lib/rounds-figure';
import { cx } from '@/lib/utils';

const FACTS = roundsFigureFacts();
const DRAWN = figureRounds().drawn;
const TOTALS = segmentTotals();
const LEAD = leadingSegment(TOTALS);
const LARGEST_SEGMENT_USD = LEAD.usd;
const MONTHS = monthRows();
const HEADLINE = roundsFigureHeadline();
const CAPTION = roundsFigureCaption(FACTS);
const DESCRIPTION = roundsFigureDescription(FACTS);

/**
 * The recent-rounds figure: one dot per round in the window, date across
 * and US dollars up on a log scale, solid for closed rounds and hollow for
 * the rest, the largest labeled where a label fits cleanly. The list beside
 * it totals the closed rounds by market-map segment; choosing a segment
 * marks its dots in the accent. Every number is computed in
 * lib/rounds-figure.ts from data/rounds.ts. Nothing animates.
 */
export function RoundsFigure({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const listLabelId = `${useId()}-segments`;
  const [segment, setSegment] = useState<MarketMapSegment>(LEAD.segment);
  const [chartRef, width] = useChartWidth(CHART_WIDTH.fallback, CHART_WIDTH.minimum);
  const layout = useMemo(() => roundsFigureLayout(width, DRAWN), [width]);
  const dots = useMemo(() => drawOrder(layout.dots, segment), [layout, segment]);
  const chosen = TOTALS.find((t) => t.segment === segment) ?? LEAD;
  const accent = roleColour('highlight');
  const ink = roleColour('measurement');

  return (
    <InstrumentFigure
      figureId="recent-rounds"
      className={className}
      heading={HEADLINE}
      stage={
        <FigureStage>
          <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            {/* Its own size container: stage.css sizes stage text against 100cqw, which must be this column. */}
            <div ref={chartRef} className="@container min-w-0">
              <PlotStage
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                aria-label="Funding rounds by date and amount in US dollars"
                aria-describedby={descriptionId}
                data-testid="rounds-figure-plot"
              >
                <text
                  data-scene-axis=""
                  x={layout.title.x}
                  y={layout.title.y}
                  fill={CHART_STRUCTURE.labelSecondary}
                >
                  {layout.title.text}
                </text>
                <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
                  {layout.yTicks.slice(1).map((t) => (
                    <line key={t.value} x1={layout.plot.left} x2={layout.width} y1={t.gridY} y2={t.gridY} />
                  ))}
                  {layout.monthLines.map((x) => (
                    <line key={x} x1={x} x2={x} y1={layout.plot.top} y2={layout.plot.axisY} />
                  ))}
                </g>
                <line
                  data-chart-axes=""
                  x1={layout.plot.left}
                  x2={layout.width}
                  y1={layout.plot.axisY}
                  y2={layout.plot.axisY}
                  stroke={CHART_STRUCTURE.axes}
                  strokeWidth={CHART_STROKE.structure}
                />
                {[...layout.yTicks, ...layout.months].map((t) => (
                  <text
                    key={t.text}
                    data-scene-tick=""
                    x={t.x}
                    y={t.y}
                    textAnchor={t.anchor}
                    fill={CHART_STRUCTURE.labelSecondary}
                  >
                    {t.text}
                  </text>
                ))}
                <g data-rounds-dots="">
                  {dots.map(({ round, cx: x, cy: y }) => {
                    const on = round.segment === segment;
                    const colour = on ? accent : ink;
                    return (
                      <circle
                        key={round.key}
                        data-round={round.key}
                        data-hollow={round.hollow ? '' : undefined}
                        data-chosen={on ? '' : undefined}
                        cx={x}
                        cy={y}
                        r={DOT_R}
                        fill={round.hollow ? MOTION_STAGE.background : colour}
                        stroke={round.hollow ? colour : undefined}
                        strokeWidth={round.hollow ? RING_STROKE : undefined}
                      />
                    );
                  })}
                </g>
                <g data-rounds-labels="">
                  {layout.labels.map((label) => (
                    <g key={label.key} data-round-label={label.key}>
                      {label.leader ? (
                        <line
                          x1={label.leader.x1}
                          y1={label.leader.y1}
                          x2={label.leader.x2}
                          y2={label.leader.y2}
                          stroke={CHART_STRUCTURE.labelSecondary}
                          strokeWidth={CHART_STROKE.structure}
                        />
                      ) : null}
                      <DirectLabel x={label.x} y={label.y}>
                        {label.text}
                      </DirectLabel>
                    </g>
                  ))}
                </g>
              </PlotStage>
            </div>
            <div className="max-sm:px-3">
              <div id={listLabelId} className="font-sans text-[12px] leading-normal text-text-dim">
                Raised by segment; choose one to mark its dots
              </div>
              <ul aria-labelledby={listLabelId} className="mt-2 border-t border-border">
                {TOTALS.map((total) => {
                  const on = total.segment === segment;
                  return (
                    <li key={total.segment} className="border-b border-border">
                      <button
                        type="button"
                        data-brand-control-id="control:secondary-action"
                        data-segment={total.segment}
                        aria-pressed={on}
                        onClick={() => setSegment(total.segment)}
                        className={cx(
                          'grid min-h-11 w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 py-2.5 text-left font-sans text-[13px] leading-5',
                          'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink',
                        )}
                      >
                        <span
                          className={cx(
                            on
                              ? 'text-text underline decoration-1 underline-offset-4'
                              : 'text-text-dim hover:text-text',
                          )}
                        >
                          {total.label}
                        </span>
                        <span className="font-mono tabular-nums text-text">{formatUsd(total.usd)}</span>
                        <span
                          aria-hidden="true"
                          className="col-span-2 block h-[3px]"
                          style={{
                            width: `${percentOf(total.usd, LARGEST_SEGMENT_USD)}%`,
                            background: on ? accent : roleColour('value'),
                          }}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div
                aria-live="polite"
                data-testid="rounds-figure-readout"
                className="mt-3 font-sans text-[13px] leading-normal text-text"
              >
                {readoutText(chosen)}
              </div>
            </div>
          </div>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          {methodParagraphs(FACTS, layout).map((text) => (
            <div key={text.slice(0, 24)}>{text}</div>
          ))}
          <ChartDescription
            id={descriptionId}
            open
            form="table"
            summary="Closed rounds by month"
            description={DESCRIPTION}
            rowHeader="month"
            columns={[
              { header: 'closed rounds', numeric: true },
              { header: 'raised', numeric: true },
            ]}
            rows={MONTHS.map((m) => ({ label: m.label, values: [m.rounds, formatUsd(m.usd)] }))}
          />
        </>
      }
      source={
        <span>
          Each round&apos;s source is linked in its table row. Exchange rates:{' '}
          <a
            data-brand-control-id="control:link-focus"
            href={FX_RATES_SOURCE_URL}
            target="_blank"
            rel="noopener"
            className="underline-offset-2"
          >
            European Central Bank
          </a>
          , {formatLongDate(FX_RATES_DATE)}.
        </span>
      }
    />
  );
}
