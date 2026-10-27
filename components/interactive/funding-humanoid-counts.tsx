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
} from '@/components/motion/chart';
import {
  FUNDING_BY_YEAR,
  FUNDING_CITATION_ID,
  FUNDING_HUMANOID_SOURCES,
  FUNDING_PARTIAL_UNTIL,
  HUMANOID_COUNTS,
  fundingIn,
  humanoidCount,
} from '@/lib/funding-humanoid-counts';

/**
 * FundingHumanoidCounts: two panels on one stage. The upper panel is the
 * venture funding robotics startups raised each year by Crunchbase's count,
 * 2026 to the article's date in the accent; the lower panel is the humanoid
 * counts two trackers publish, each row named by its counter, because one
 * counts full-size units sold and the other every humanoid shipped. The
 * panels keep their own axes and no ratio joins them: the funding covers
 * every robotics startup. The chart is static: no controls, no state, no
 * motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const f = (v: number) => Number(v.toFixed(2));

const YEAR_X = 2;
// The rulers stop at 200 of 340 so the partial-year readout fits on a phone,
// where stage text keeps its CSS size while the viewBox shrinks.
const FUND = { left: 40, right: 200, max: 20, ticks: [0, 10, 20] as const };
const FUND_TITLE_Y = 12;
const FUND_TOP = 22;
const FUND_PITCH = 19;
const FUND_BAR = 11;
const FUND_AXIS_Y = FUND_TOP + FUNDING_BY_YEAR.length * FUND_PITCH;
const sxFund = linearScale([0, FUND.max], [FUND.left, FUND.right]);

const UNITS = { left: 2, right: 200, max: 20_000, ticks: [0, 10_000, 20_000] as const };
const UNITS_TITLE_Y = FUND_AXIS_Y + 58;
const UNITS_TOP = UNITS_TITLE_Y + 8;
const UNITS_PITCH = 42;
const UNITS_NAME = 14;
const UNITS_BAR_OFFSET = 22;
const UNITS_BAR = 11;
const UNITS_AXIS_Y = UNITS_TOP + HUMANOID_COUNTS.length * UNITS_PITCH;
const HEIGHT = UNITS_AXIS_Y + 40;
const sxUnits = linearScale([0, UNITS.max], [UNITS.left, UNITS.right]);

/** The rows whose value is printed on the stage; the rest read off the ticks and the table. */
const READOUT_COUNTS = new Set(['ifr-2025', 'sag-first-half-2026']);

const LAST = FUNDING_BY_YEAR[FUNDING_BY_YEAR.length - 1];
const IFR = humanoidCount('ifr-2025');
const SAG_2025 = humanoidCount('sag-first-half-2025');
const SAG_2026 = humanoidCount('sag-first-half-2026');
const units = (n: number) => n.toLocaleString('en-US');
const billions = (n: number) => `$${n} billion`;

const CAPTION = `Crunchbase counts all robotics startups, and ${LAST.year} runs to ${FUNDING_PARTIAL_UNTIL}. IFR counts full-size humanoids sold; SAG counts humanoids shipped.`;
const BEFORE_RECORD = FUNDING_BY_YEAR.filter((r) => r.year < 2025);
const DESCRIPTION = `Venture funding raised by robotics startups, by Crunchbase's count, in billions of US dollars: ${BEFORE_RECORD.map((r) => `${r.billionsUsd} in ${r.year}`).join(', ')}, a record ${fundingIn(2025)} in 2025, then ${LAST.billionsUsd} in ${LAST.year} to ${FUNDING_PARTIAL_UNTIL}. Humanoids counted: about ${units(IFR.units)} full-size humanoids sold in 2025 (IFR), and about ${units(SAG_2025.units)} shipped in the first half of 2025 and ${units(SAG_2026.units)} in the first half of 2026 (SAG). The funding covers every robotics startup, not only humanoid makers.`;

function Ticks({
  ticks,
  sx,
  y,
  format,
  testId,
}: {
  ticks: readonly number[];
  sx: (v: number) => number;
  y: number;
  format: (v: number) => string;
  testId: string;
}) {
  return (
    <>
      {ticks.map((t, i) => (
        <text
          key={t}
          data-scene-tick=""
          data-testid={`${testId}-${t}`}
          x={f(sx(t))}
          y={y + 16}
          textAnchor={i === 0 ? 'start' : 'middle'}
          fontSize={CHART_TYPE.tickPx}
          fill={CHART_STRUCTURE.labelSecondary}
        >
          {format(t)}
        </text>
      ))}
    </>
  );
}

export function FundingHumanoidCounts({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();

  return (
    <InstrumentFigure
      figureId="funding-humanoid-counts"
      className={className}
      kicker="Robotics funding and humanoid counts"
      heading="Startups raised a record while humanoids shipped in the thousands"
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Robotics startup funding by year, and humanoids sold or shipped"
            aria-describedby={descriptionId}
            data-testid="funding-humanoid-counts-stage"
          >
            <g data-testid="funding-panel">
              <DirectLabel x={YEAR_X} y={FUND_TITLE_Y} seriesFor="funding funding-partial-year">
                <tspan fontWeight={600}>Raised by robotics startups</tspan>
              </DirectLabel>
              <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
                {FUND.ticks.slice(1).map((t) => (
                  <line key={t} x1={f(sxFund(t))} x2={f(sxFund(t))} y1={FUND_TOP} y2={FUND_AXIS_Y} />
                ))}
              </g>
              <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
                <line x1={FUND.left} x2={FUND.right} y1={FUND_AXIS_Y} y2={FUND_AXIS_Y} />
                <line x1={FUND.left} x2={FUND.left} y1={FUND_TOP} y2={FUND_AXIS_Y} />
              </g>
              {FUNDING_BY_YEAR.map((row, i) => {
                const top = FUND_TOP + i * FUND_PITCH + (FUND_PITCH - FUND_BAR) / 2;
                const end = f(sxFund(row.billionsUsd));
                return (
                  <g
                    key={row.year}
                    data-testid={`funding-${row.year}`}
                    data-series={row.partial ? 'funding-partial-year' : 'funding'}
                    data-billions-usd={row.billionsUsd}
                  >
                    <text
                      x={YEAR_X}
                      y={f(top + FUND_BAR - 1)}
                      fontSize={CHART_TYPE.labelPx}
                      fontWeight={row.partial ? 700 : 400}
                      fill={CHART_STRUCTURE.label}
                    >
                      {row.year}
                    </text>
                    <Bar
                      x={FUND.left}
                      y={f(top)}
                      width={f(end - FUND.left)}
                      height={FUND_BAR}
                      role={row.partial ? 'highlight' : 'measurement'}
                    />
                    {row.partial ? (
                      <text
                        data-scene-readout=""
                        data-series-label-for="funding-partial-year"
                        x={f(end + 6)}
                        y={f(top + FUND_BAR - 1)}
                        fontSize={CHART_TYPE.readoutPx}
                        fontWeight={700}
                        fill={CHART_STRUCTURE.label}
                      >
                        {`$${row.billionsUsd}B to ${FUNDING_PARTIAL_UNTIL}`}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              <Ticks ticks={FUND.ticks} sx={sxFund} y={FUND_AXIS_Y} format={(t) => `$${t}`} testId="funding-tick" />
              <text
                data-scene-axis=""
                x={FUND.right}
                y={FUND_AXIS_Y + 34}
                textAnchor="end"
                fontSize={CHART_TYPE.axisPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                billions of US dollars a year
              </text>
            </g>
            <g data-testid="humanoid-panel">
              <DirectLabel x={UNITS.left} y={UNITS_TITLE_Y}>
                <tspan fontWeight={600}>Humanoids counted</tspan>
              </DirectLabel>
              <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
                {UNITS.ticks.slice(1).map((t) => (
                  <line key={t} x1={f(sxUnits(t))} x2={f(sxUnits(t))} y1={UNITS_TOP} y2={UNITS_AXIS_Y} />
                ))}
              </g>
              <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
                <line x1={UNITS.left} x2={UNITS.right} y1={UNITS_AXIS_Y} y2={UNITS_AXIS_Y} />
                <line x1={UNITS.left} x2={UNITS.left} y1={UNITS_TOP} y2={UNITS_AXIS_Y} />
              </g>
              {HUMANOID_COUNTS.map((row, i) => {
                const top = UNITS_TOP + i * UNITS_PITCH;
                const end = f(sxUnits(row.units));
                return (
                  <g key={row.id} data-testid={`humanoids-${row.id}`} data-series={row.counter.toLowerCase()} data-units={row.units}>
                    <DirectLabel x={f(UNITS.left + 6)} y={top + UNITS_NAME} seriesFor={row.counter.toLowerCase()}>
                      {row.label}
                    </DirectLabel>
                    <Bar
                      x={UNITS.left}
                      y={top + UNITS_BAR_OFFSET}
                      width={f(end - UNITS.left)}
                      height={UNITS_BAR}
                      role="measurement"
                    />
                    {READOUT_COUNTS.has(row.id) ? (
                      <text
                        data-scene-readout=""
                        x={f(end + 6)}
                        y={f(top + UNITS_BAR_OFFSET + UNITS_BAR - 1)}
                        fontSize={CHART_TYPE.readoutPx}
                        fill={CHART_STRUCTURE.label}
                      >
                        {`about ${units(row.units)}`}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              <Ticks ticks={UNITS.ticks} sx={sxUnits} y={UNITS_AXIS_Y} format={units} testId="humanoid-tick" />
              <text
                data-scene-axis=""
                x={UNITS.right}
                y={UNITS_AXIS_Y + 34}
                textAnchor="end"
                fontSize={CHART_TYPE.axisPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                humanoids
              </text>
            </g>
          </PlotStage>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <div>
            The funding bars are the yearly totals in Crunchbase News&apos;s chart of 22 June 2026; the {LAST.year}{' '}
            bar is the year to that date. The humanoid counts come from two trackers with different rules: the IFR
            counts full-size humanoids, above 140 cm, sold in 2025, and SAG counts every humanoid shipped, by
            half-year. The panels share no scale and no ratio joins them, because the funding goes to every kind of
            robotics startup.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            summary="Funding by year and the humanoid counts"
            description={DESCRIPTION}
            rowHeader="series and period"
            columns={[{ header: 'value' }, { header: 'counted by' }]}
            rows={[
              ...FUNDING_BY_YEAR.map((r) => ({
                label: `Robotics startup funding, ${r.year}${r.partial ? ` to ${FUNDING_PARTIAL_UNTIL}` : ''}`,
                values: [billions(r.billionsUsd), 'Crunchbase'],
              })),
              ...HUMANOID_COUNTS.map((c) => ({ label: c.row, values: [`about ${units(c.units)}`, c.counter] })),
            ]}
          />
        </>
      }
      source={
        <span data-testid="funding-humanoid-counts-source">
          {FUNDING_HUMANOID_SOURCES.map((id, i) => {
            const record = citationFor(id);
            return (
              <span key={id}>
                {i > 0 ? ', ' : null}
                {record ? (
                  <a data-brand-control-id="control:link-focus" href={record.url} target="_blank" rel="noopener" className="underline-offset-2">
                    {record.label}
                  </a>
                ) : (
                  id === FUNDING_CITATION_ID ? 'Crunchbase News' : id
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
