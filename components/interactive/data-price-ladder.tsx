'use client';

import { useId, type CSSProperties } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, roleColour, type ChartRole } from '@/components/motion/chart';
import { MOTION_STAGE } from '@/lib/motion-tokens';
import {
  DATA_PRICE_LADDER_CAPTION,
  DATA_PRICE_LADDER_DESCRIPTION,
  DATA_PRICE_LADDER_SOURCES,
  ECB_REFERENCE_RATES,
  LADDER_AXIS,
  LADDER_GROUPS,
  LADDER_LEAD_GROUP,
  PLOTTED_ROWS,
  PRICE_ROWS,
  axisFraction,
  groupRows,
  plottedUsdText,
  usdText,
  type PlottedRow,
} from '@/lib/data-price-ladder';

/**
 * DataPriceLadder: every price, cost and wage in the robot data market
 * article's four tables, one row per table row, on one log axis of US
 * dollars an hour. Each row names its value and who stated it in text
 * beside its mark, so no label sits on a mark. A bar is a stated range, a
 * dot a single value, and a dashed line the open side of a lower bound or
 * a ceiling. The prices in China take the accent. On a phone each row
 * stacks its text above its track. The chart is static: no controls, no
 * state, no motion.
 */

const f = (v: number) => Number(v.toFixed(2));
const at = (usd: number) => `${f(axisFraction(usd) * 100)}%`;
const span = (from: number, to: number) => `${f((axisFraction(to) - axisFraction(from)) * 100)}%`;

/** Text column, then track column, from the small breakpoint up; stacked below it. */
const ROW_GRID = 'grid gap-x-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]';
const BAR_PX = 6;
const DOT_PX = 2 * (CHART_STROKE.markerRadius + 1);

const MID: CSSProperties = { top: '50%', transform: 'translateY(-50%)' };

function Gridlines() {
  return (
    <>
      {LADDER_AXIS.ticks.map((tick) => (
        <span
          key={tick}
          aria-hidden
          className="absolute inset-y-0 w-px"
          style={{ left: at(tick), background: CHART_STRUCTURE.grid }}
        />
      ))}
    </>
  );
}

function Dot({ usd, role }: { usd: number; role: ChartRole }) {
  return (
    <span
      data-chart-mark="dot"
      data-chart-role={role}
      data-usd={f(usd)}
      className="absolute rounded-full border-solid"
      style={{
        left: at(usd),
        top: '50%',
        width: DOT_PX + 2,
        height: DOT_PX + 2,
        transform: 'translate(-50%, -50%)',
        background: roleColour(role),
        borderWidth: 1,
        borderColor: MOTION_STAGE.background,
      }}
    />
  );
}

function Track({ row, role }: { row: PlottedRow; role: ChartRole }) {
  const top = Math.max(row.usdLow, row.usdHigh ?? row.usdLow);
  return (
    <div aria-hidden className="relative h-4 sm:h-auto" data-testid={`price-track-${row.id}`}>
      <Gridlines />
      {row.open === 'above' ? (
        <span
          data-chart-mark="open-end"
          data-chart-role={role}
          className="absolute border-0 border-t border-dashed"
          style={{ ...MID, left: at(top), right: 0, borderTopWidth: CHART_STROKE.trace, borderColor: roleColour(role) }}
        />
      ) : null}
      {row.open === 'below' ? (
        <span
          data-chart-mark="open-end"
          data-chart-role={role}
          className="absolute border-0 border-t border-dashed"
          style={{ ...MID, left: 0, width: at(row.usdLow), borderTopWidth: CHART_STROKE.trace, borderColor: roleColour(role) }}
        />
      ) : null}
      {row.usdHigh !== undefined ? (
        <span
          data-chart-mark="bar"
          data-chart-role={role}
          data-usd-low={f(row.usdLow)}
          data-usd-high={f(row.usdHigh)}
          className="absolute"
          style={{ ...MID, left: at(row.usdLow), width: span(row.usdLow, row.usdHigh), height: BAR_PX, background: roleColour(role) }}
        />
      ) : (
        <Dot usd={row.usdLow} role={role} />
      )}
      {row.usdMid !== undefined ? <Dot usd={row.usdMid} role={role} /> : null}
      {row.usdAlso !== undefined ? <Dot usd={row.usdAlso} role={role} /> : null}
    </div>
  );
}

function Axis({ titled }: { titled: boolean }) {
  return (
    <div aria-hidden className={`${ROW_GRID} text-xs text-text-dim`} data-testid={titled ? 'price-axis' : undefined}>
      <div className="pb-1 sm:pb-0">
        {titled ? `US dollars per hour, log scale from a ${usdText(LADDER_AXIS.floor)} floor` : null}
      </div>
      <div className="relative h-5 tabular-nums">
        <span data-axis-floor="" className="absolute left-0 top-0">
          {usdText(LADDER_AXIS.floor)}
        </span>
        {LADDER_AXIS.ticks.map((tick) => (
          <span
            key={tick}
            data-axis-tick=""
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
            style={{ left: at(tick) }}
          >
            {usdText(tick)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DataPriceLadder({ className }: { className?: string }) {
  const baseId = useId();
  const descriptionId = `${baseId}-description`;
  const citationFor = useCitationLookup();

  return (
    <InstrumentFigure
      figureId="data-price-ladder"
      className={className}
      kicker="Robot data prices and pay"
      heading="What an hour of robot data costs"
      stage={
        <FigureStage>
          <div className="pb-4 font-sans text-sm text-text-dim" data-testid="price-ladder-key">
            A bar is a stated range and a dot a single value. A dashed line runs on above a lower bound and below a ceiling.
          </div>
          <div
            role="group"
            aria-label="Hourly prices, costs and pay in robot data, in US dollars"
            aria-describedby={descriptionId}
            data-testid="data-price-ladder-stage"
            className="grid gap-5 font-sans"
          >
            <Axis titled />
            {LADDER_GROUPS.map((group) => {
              const role: ChartRole = group.id === LADDER_LEAD_GROUP ? 'highlight' : 'measurement';
              const headingId = `${baseId}-${group.id}`;
              return (
                <section
                  key={group.id}
                  aria-labelledby={headingId}
                  data-series={group.id}
                  data-testid={`price-group-${group.id}`}
                >
                  <div
                    id={headingId}
                    data-series-label-for={group.id}
                    className="border-0 border-b border-solid pb-1 text-sm font-semibold"
                    style={{
                      borderColor: CHART_STRUCTURE.grid,
                      color: role === 'highlight' ? roleColour('highlight') : undefined,
                    }}
                  >
                    {group.label}
                  </div>
                  <div role="list">
                    {groupRows(group.id).map((row) => (
                      <div
                        role="listitem"
                        key={row.id}
                        data-testid={`price-row-${row.id}`}
                        data-usd-low={f(row.usdLow)}
                        className={`${ROW_GRID} py-1.5 sm:py-0`}
                      >
                        <div className="min-w-0 pb-1 leading-snug sm:py-1">
                          <div className="text-sm text-text">{row.what}</div>
                          <div className="text-xs text-text-dim" data-testid={`price-label-${row.id}`}>
                            {row.valueText}; {row.who}
                          </div>
                        </div>
                        <Track row={row} role={role} />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
            <Axis titled={false} />
          </div>
        </FigureStage>
      }
      caption={DATA_PRICE_LADDER_CAPTION}
      method={
        <>
          <p data-testid="price-ladder-method">
            Each row is one row of the article&apos;s four tables, in its words, with its source. Yuan and euros are
            converted at the ECB reference rates of {ECB_REFERENCE_RATES.dateText}, ${ECB_REFERENCE_RATES.usdPerEur} and
            RMB {ECB_REFERENCE_RATES.cnyPerEur} to the euro; the PyRUA-DataFarm quote keeps its authors&apos; $117. The
            axis runs from {usdText(LADDER_AXIS.floor)} to {usdText(LADDER_AXIS.ceiling)}; each gridline is ten times
            the last.
          </p>
          <ChartDescription
            open
            id={descriptionId}
            form="table"
            summary={`All ${PRICE_ROWS.length} rows`}
            description={DATA_PRICE_LADDER_DESCRIPTION}
            rowHeader="row"
            columns={[
              { header: 'group' },
              { header: 'as stated' },
              { header: 'US dollars per hour', numeric: true },
              { header: 'stated by' },
            ]}
            rows={PLOTTED_ROWS.map((row) => ({
              label: row.what,
              values: [
                LADDER_GROUPS.find((g) => g.id === row.group)!.label,
                row.stated,
                plottedUsdText(row),
                row.who,
              ],
            }))}
          />
        </>
      }
      source={
        <span data-testid="data-price-ladder-source">
          {DATA_PRICE_LADDER_SOURCES.map((id, i) => {
            const record = citationFor(id);
            return (
              <span key={id}>
                {i > 0 ? ', ' : null}
                {record ? (
                  <a data-brand-control-id="control:link-focus" href={record.url} target="_blank" rel="noopener" className="underline-offset-2">
                    {record.label}
                  </a>
                ) : (
                  id
                )}
              </span>
            );
          })}
          .
        </span>
      }
    />
  );
}
