'use client';

import { useId, useRef, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { TableScroll } from '@/components/ui';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, InstrumentReset, PlotStage } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  roleColour,
} from '@/components/motion/chart';
import {
  PI_GENERATIONS,
  generationsBehind,
  openWeightsFrontier,
  type PiGeneration,
} from '@/lib/pi-generations';
import { MOTION_STAGE } from '@/lib/motion-tokens';
import { cx } from '@/lib/utils';

/**
 * PiGenerationTimeline: Physical Intelligence's models on a light calendar
 * timeline. Each name sits above the month its source was published; the
 * models listed in the pinned openpi checkpoint catalogue have filled dots
 * and a "downloadable" bracket. Tapping a name shows one plain sentence on
 * what changed below the timeline. The undated MEM report is selectable
 * beside the timeline but never plotted at an invented month. Architecture,
 * the catalogue pin and every source sit in "How this was made".
 *
 * Interactive contract: deterministic render, names are buttons with arrow
 * keys between them, a polite live detail, a reset in "Adjust more", no
 * layout shift and no auto-playing motion.
 */
type PiGenerationTimelineProps = {
  /** Initially selected generation id. Default 'pi0'. */
  defaultSelected?: string;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const AXIS_LEFT = 12;
const AXIS_RIGHT = WIDTH - 12;
const AXIS_Y = 8;
const MONTH_Y = AXIS_Y + 22;
const YEAR_Y = MONTH_Y + 19;
const BRACKET_Y = YEAR_Y + 12;
const BRACKET_LABEL_Y = BRACKET_Y + 18;
const HEIGHT = BRACKET_LABEL_Y + 6;
const NODE_R = 4.5;

/** Time axis bounds (month precision), one month past the data each side. */
const AXIS_MIN = '2024-09';
const AXIS_MAX = '2026-06';
const YEARS = ['2024', '2025', '2026'] as const;

function monthIndex(ym: string): number {
  const [year, month] = ym.split('-').map(Number);
  return (year - 2024) * 12 + (month - 1);
}

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function dateToX(ym: string): number {
  const span = monthIndex(AXIS_MAX) - monthIndex(AXIS_MIN);
  return f(AXIS_LEFT + ((monthIndex(ym) - monthIndex(AXIS_MIN)) / span) * (AXIS_RIGHT - AXIS_LEFT));
}

/** The year band's left and right edges: January 1st, clamped to the axis. */
function yearBand(year: string): { from: number; to: number } {
  const from = Math.max(AXIS_LEFT, dateToX(`${year}-01`));
  const to = Math.min(AXIS_RIGHT, dateToX(`${Number(year) + 1}-01`));
  return { from: f(from), to: f(to) };
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthShort = (ym: string) => MONTH_SHORT[Number(ym.split('-')[1]) - 1];

function weightsLabel(g: PiGeneration): string {
  return g.openWeights === true ? 'downloadable'
    : g.openWeights === false ? 'unavailable' : 'unverified';
}

type Column = { released: string; members: PiGeneration[] };

/** One column per dated month; π0.6 and π*0.6 share November 2025. */
const COLUMNS: Column[] = PI_GENERATIONS.reduce<Column[]>((columns, g) => {
  if (g.released === null) return columns;
  const existing = columns.find((c) => c.released === g.released);
  if (existing) existing.members.push(g);
  else columns.push({ released: g.released, members: [g] });
  return columns;
}, []);

/**
 * At a phone width π0-FAST sits one row up so its name clears π0 and
 * π0.5, three months away on either side; from the sm breakpoint every
 * single name sits on the lower row.
 */
const NARROW_RAISED = new Set(['pi0-fast']);

const NAME_CLASS =
  'inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-xs border border-transparent px-1.5 font-sans text-sm text-text-dim transition-colors hover:text-text aria-pressed:border-border-strong aria-pressed:bg-surface-2 aria-pressed:font-semibold aria-pressed:text-ink';
const TABLE_HEADER_CELL = 'px-3 py-2 text-left font-sans text-sm font-medium text-text-dim';
const TABLE_CELL = 'px-3 py-2 align-top';

function RowSource({
  id,
  lookup,
}: {
  id: string;
  lookup: ReturnType<typeof useCitationLookup>;
}) {
  const record = lookup(id);
  if (!record) return <span className="text-text-dim">not listed</span>;
  return (
    <a
      data-brand-control-id="control:link-focus"
      href={record.url}
      target="_blank"
      rel="noopener"
      className="underline-offset-2"
    >
      {record.label}
    </a>
  );
}

export function PiGenerationTimeline({
  defaultSelected = 'pi0',
  className,
}: PiGenerationTimelineProps) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const tableCaptionId = `${uid}-table`;
  const [selectedId, setSelectedId] = useState(defaultSelected);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selected: PiGeneration =
    PI_GENERATIONS.find((g) => g.id === selectedId) ?? PI_GENERATIONS[0];
  const citationFor = useCitationLookup();
  const citation = citationFor(selected.citationId);
  const frontier = openWeightsFrontier();
  const behind = generationsBehind();
  const dated = PI_GENERATIONS.filter((g) => g.released !== null);
  const undated = PI_GENERATIONS.filter((g) => g.released === null);
  const openColumns = COLUMNS.filter((c) => c.members.some((g) => g.openWeights === true));
  const bracket = {
    from: dateToX(openColumns[0].released),
    to: dateToX(openColumns[openColumns.length - 1].released),
  };

  function select(index: number) {
    const clamped = Math.min(PI_GENERATIONS.length - 1, Math.max(0, index));
    setSelectedId(PI_GENERATIONS[clamped].id);
    buttonRefs.current[clamped]?.focus();
  }

  // The one place a model button is written, so every name keeps the same
  // label, pressed state and arrow-key order wherever it sits.
  const nameButton = (g: PiGeneration) => {
    const i = PI_GENERATIONS.indexOf(g);
    return (
      <button
        data-brand-control-id="control:selection"
        key={g.id}
        ref={(el) => {
          buttonRefs.current[i] = el;
        }}
        type="button"
        data-status={g.openWeights === true ? 'open' : g.openWeights === false ? 'unavailable' : 'unknown'}
        aria-label={g.name}
        aria-pressed={g.id === selected.id}
        onClick={() => select(i)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            select(i + 1);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            select(i - 1);
          }
        }}
        className={NAME_CLASS}
      >
        {g.name}
      </button>
    );
  };

  const measurement = roleColour('measurement');
  const highlight = roleColour('highlight');

  return (
    <InstrumentFigure
      figureId="pi-generation-timeline"
      className={className}
      kicker="Physical Intelligence's models"
      heading="A new robot model every few months; first three downloadable"
      adjust={
        <InstrumentReset
          onClick={() => select(PI_GENERATIONS.findIndex((g) => g.id === defaultSelected))}
        />
      }
      stage={
        <FigureStage
          footer={
            <div
              data-testid="generation-detail"
              aria-live="polite"
              className="basis-full font-sans text-sm leading-relaxed"
            >
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="font-semibold text-text">{selected.name}</span>
                <span className="text-text-dim">{selected.dateLabel}</span>
                <span className="whitespace-nowrap text-text-dim">
                  weights {weightsLabel(selected)}
                </span>
              </div>
              <div className="mt-1 max-w-[65ch] text-text">{selected.plain}</div>
            </div>
          }
        >
          <div
            data-testid="generation-track"
            role="group"
            aria-label="Select a generation"
            className="@container max-w-[520px]"
          >
            <div className="relative h-18">
              {COLUMNS.map((column) => {
                const raised =
                  column.members.length === 1 && NARROW_RAISED.has(column.members[0].id);
                return (
                  <div
                    key={column.released}
                    data-generation-column={column.released}
                    className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
                    style={{ left: `${f((dateToX(column.released) / WIDTH) * 100)}%` }}
                  >
                    {column.members.map(nameButton)}
                    <span
                      aria-hidden="true"
                      className={cx('w-px bg-border-strong', raised ? 'h-10 sm:h-2' : 'h-2')}
                    />
                  </div>
                );
              })}
            </div>
            <PlotStage
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              aria-label={`Timeline of dated Physical Intelligence sources from ${PI_GENERATIONS[0].dateLabel} to ${PI_GENERATIONS[PI_GENERATIONS.length - 1].dateLabel}. The pinned checkpoint catalogue ends at ${frontier.name}; ${behind} other model entries have unverified weight availability. MEM has no established month and is not plotted.`}
              aria-describedby={descriptionId}
            >
              {YEARS.map((year, index) => {
                const band = yearBand(year);
                return (
                  <g key={year} data-year-band={year}>
                    {index % 2 === 1 ? (
                      <rect
                        x={band.from}
                        y={0}
                        width={f(band.to - band.from)}
                        height={YEAR_Y + 6}
                        fill={CHART_STRUCTURE.grid}
                        fillOpacity={0.35}
                      />
                    ) : null}
                    <text
                      data-scene-tick=""
                      x={f((band.from + band.to) / 2)}
                      y={YEAR_Y}
                      textAnchor="middle"
                      fontSize={CHART_TYPE.tickPx}
                      fill={CHART_STRUCTURE.label}
                    >
                      {year}
                    </text>
                  </g>
                );
              })}
              <line
                x1={AXIS_LEFT}
                x2={AXIS_RIGHT}
                y1={AXIS_Y}
                y2={AXIS_Y}
                stroke={CHART_STRUCTURE.axes}
                strokeWidth={CHART_STROKE.structure}
                opacity={CHART_STRUCTURE.axesOpacity}
              />
              {COLUMNS.map((column) => {
                const cx = dateToX(column.released);
                const open = column.members.some((g) => g.openWeights === true);
                const isSelected = column.members.some((g) => g.id === selected.id);
                return (
                  <g key={column.released} data-generation-dot={column.released}>
                    <circle
                      cx={cx}
                      cy={AXIS_Y}
                      r={NODE_R}
                      fill={open ? measurement : MOTION_STAGE.background}
                      stroke={measurement}
                      strokeWidth={1.5}
                    />
                    {isSelected ? (
                      <circle
                        data-generation-selected=""
                        cx={cx}
                        cy={AXIS_Y}
                        r={NODE_R + 3}
                        fill="none"
                        stroke={highlight}
                        strokeWidth={CHART_STROKE.trace}
                      />
                    ) : null}
                    <text
                      data-scene-tick=""
                      x={cx}
                      y={MONTH_Y}
                      textAnchor="middle"
                      fontSize={CHART_TYPE.tickPx}
                      fill={CHART_STRUCTURE.labelSecondary}
                    >
                      {monthShort(column.released)}
                    </text>
                  </g>
                );
              })}
              <g data-series="downloadable" data-chart-role="measurement">
                <path
                  d={`M${bracket.from} ${BRACKET_Y - 4} V${BRACKET_Y} H${bracket.to} V${BRACKET_Y - 4}`}
                  fill="none"
                  stroke={measurement}
                  strokeWidth={CHART_STROKE.structure * 2}
                />
                <text
                  data-scene-note=""
                  x={f((bracket.from + bracket.to) / 2)}
                  y={BRACKET_LABEL_Y}
                  textAnchor="middle"
                  fontSize={CHART_TYPE.axisPx}
                  fill={measurement}
                >
                  downloadable
                </text>
              </g>
            </PlotStage>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 font-sans text-sm text-text-dim">
              <span>Month not known:</span>
              {undated.map(nameButton)}
            </div>
          </div>
        </FigureStage>
      }
      caption={`Physical Intelligence released a new robot model every few months; only the first three are confirmed downloadable.`}
      method={
        <>
          <div>
            Each name sits above the month its source was published, which is not always the month
            a checkpoint was released. The {undated[0]?.name} report does not establish its month,
            so it is listed beside the timeline and not plotted. Shaded bands mark calendar years
            and change at January.
          </div>
          <div>
            &ldquo;Downloadable&rdquo; means listed in the openpi checkpoint catalogue as pinned at
            commit 215abfb; it says nothing about the licence. The pinned catalogue ends at{' '}
            {frontier.name}.
          </div>
          <div>
            {behind} model entries not in the pinned catalogue have unverified weight availability:
            missing from that list is not evidence of closed weights.
          </div>
          <TableScroll labelledBy={tableCaptionId} className="pt-1">
            <table className="w-full min-w-[640px] border-collapse text-left font-sans text-sm text-text">
              <caption id={tableCaptionId} className="text-left text-text-dim">
                The {PI_GENERATIONS.length} Physical Intelligence model entries, {dated.length} with
                a source month, with architecture, contribution and source.
              </caption>
              <thead>
                <tr className="border-b border-border-strong">
                  <th scope="col" className={TABLE_HEADER_CELL}>Model</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Source month</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Weights</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Architecture</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Contribution</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Source</th>
                </tr>
              </thead>
              <tbody>
                {PI_GENERATIONS.map((g) => (
                  <tr key={g.id} data-testid={`generation-row-${g.id}`}>
                    <th scope="row" className={cx(TABLE_CELL, 'font-medium whitespace-nowrap')}>
                      {g.name}
                    </th>
                    <td className={cx(TABLE_CELL, 'whitespace-nowrap')}>{g.dateLabel}</td>
                    <td className={TABLE_CELL}>{weightsLabel(g)}</td>
                    <td className={cx(TABLE_CELL, 'min-w-[160px] text-text-dim')}>{g.backbone}</td>
                    <td className={cx(TABLE_CELL, 'min-w-[220px] text-text-dim')}>
                      {g.contribution}
                    </td>
                    <td className={cx(TABLE_CELL, 'min-w-[140px]')}>
                      <RowSource id={g.citationId} lookup={citationFor} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Current π generation"
            description={`The π line contains ${PI_GENERATIONS.length} generations, with established source months from ${PI_GENERATIONS[0].dateLabel} to ${PI_GENERATIONS[PI_GENERATIONS.length - 1].dateLabel}. MEM has no established month and is not plotted. The downloadable bracket ends at ${frontier.name} and marks the pinned checkpoint catalogue, not licensing; selected now is ${selected.name} (${selected.backbone}, weights ${weightsLabel(selected)}) and ${behind} other entries have unverified availability.`}
            states={[
              { label: 'selected', value: selected.name },
              { label: 'source month', value: selected.dateLabel },
              { label: 'weights', value: weightsLabel(selected) },
              { label: 'generations', value: String(PI_GENERATIONS.length) },
              { label: 'not in pinned catalogue', value: String(behind) },
            ]}
          />
        </>
      }
      source={
        citation ? (
          <span data-testid="generation-source">
            Source for {selected.name}:{' '}
            <a
              data-brand-control-id="control:link-focus"
              href={citation.url}
              target="_blank"
              rel="noopener"
              className="underline-offset-2"
            >
              {citation.label}
            </a>
            ; download status from the openpi checkpoint catalogue.
          </span>
        ) : (
          'Download status from the openpi checkpoint catalogue.'
        )
      }
    />
  );
}
