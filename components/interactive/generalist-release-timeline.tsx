'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { TableScroll } from '@/components/ui';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReset,
  LegendItem,
  PlotStage,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  StageAnnotation,
  roleColour,
} from '@/components/motion/chart';
import {
  GENERALIST_RELEASES,
  PROVENANCE_TIERS,
  filterReleases,
  isVendorReported,
  provenanceLabel,
  releaseWeightLabel,
  releaseWeightState,
  type GeneralistRelease,
  type OpenFilter,
  type ProvenanceTier,
} from '@/lib/generalist-policies';
import { cx } from '@/lib/utils';

/**
 * GeneralistReleaseTimeline: every selected generalist policy on one
 * calendar, Feb 2025 to Jul 2026, one row per release with its name in a
 * left column. One shape and one colour: a filled circle has a reported
 * download, a hollow one is either not offered or not stated. Tapping a row
 * opens its card below. One toggle keeps only the downloadable releases;
 * "Adjust more" holds the full availability filter, the source-type shapes
 * and a button per release for keyboard selection.
 *
 * Interactive contract: deterministic render, keyboard-accessible selection
 * with arrow keys between the release buttons, a polite live card, filter
 * and reset controls, no auto-playing motion.
 */
type GeneralistReleaseTimelineProps = {
  /** Initially selected release id. Default 'helix' (first chronologically). */
  defaultSelected?: string;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
/** The names column; the calendar track starts to its right. */
const NAME_X = 2;
const AXIS_LEFT = 146;
const AXIS_RIGHT = WIDTH - 10;
/** Room above the first row for the two-line note. */
const NOTE_BAND = 46;
const ROWS_TOP = NOTE_BAND;
const ROW_H = 22;
/** Room below the last row for the tick marks and month labels. */
const AXIS_BAND = 30;
const NODE_SIZE = 4.5;

/** Time axis bounds (month precision), slightly padded past the data. */
const AXIS_MIN = '2025-01';
const AXIS_MAX = '2026-08';
const AXIS_TICKS = ['2025-01', '2026-01'];

function monthIndex(ym: string): number {
  const [year, month] = ym.split('-').map(Number);
  return (year - 2025) * 12 + (month - 1);
}

/** Round to 2 decimals so SSR HTML and client hydration serialize identically. */
const f = (v: number) => Number(v.toFixed(2));

function monthToX(index: number): number {
  const span = monthIndex(AXIS_MAX) - monthIndex(AXIS_MIN);
  return f(AXIS_LEFT + ((index - monthIndex(AXIS_MIN)) / span) * (AXIS_RIGHT - AXIS_LEFT));
}

const FILTERS: readonly { id: OpenFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Downloadable' },
  { id: 'closed', label: 'Not downloadable' },
  { id: 'undisclosed', label: 'Not disclosed' },
];

/** The card's plain availability line, one per weight state. */
const AVAILABILITY: Record<ReturnType<typeof releaseWeightState>, string> = {
  open: 'Downloadable: yes',
  closed: 'Downloadable: no, not offered',
  undisclosed: 'Downloadable: not stated',
};

const NOTE_LINES = ['Filled: you can download it.', 'Hollow: not offered, or not stated'] as const;

const STAGE_LINK = 'underline-offset-2';
const TABLE_HEADER_CELL = 'px-3 py-2 text-left font-sans text-sm font-medium text-text-dim';
const TABLE_CELL = 'px-3 py-2 align-top';

/** Node glyph per provenance tier: circle, square, triangle, diamond. */
function TierGlyph({
  tier,
  x,
  y,
  size,
  open,
}: {
  tier: ProvenanceTier;
  x: number;
  y: number;
  size: number;
  open: boolean | null;
}) {
  const measurement = roleColour('measurement');
  const common = {
    fill: open ? measurement : 'none',
    stroke: measurement,
    strokeWidth: 1.5,
  } as const;
  if (tier === 'paper') {
    return <circle cx={x} cy={y} r={size} {...common} />;
  }
  if (tier === 'docs') {
    return (
      <rect x={f(x - size)} y={f(y - size)} width={size * 2} height={size * 2} {...common} />
    );
  }
  if (tier === 'blog') {
    return (
      <polygon
        points={`${f(x)},${f(y - size - 1)} ${f(x + size + 1)},${f(y + size)} ${f(x - size - 1)},${f(y + size)}`}
        {...common}
      />
    );
  }
  return (
    <polygon
      points={`${f(x)},${f(y - size - 1)} ${f(x + size + 1)},${f(y)} ${f(x)},${f(y + size + 1)} ${f(x - size - 1)},${f(y)}`}
      {...common}
    />
  );
}

/** A legend-sized hollow glyph for one provenance tier. */
function TierSwatch({ tier }: { tier: ProvenanceTier }) {
  const h = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={h} height={h} viewBox={`0 0 ${h} ${h}`} className="shrink-0">
      <TierGlyph tier={tier} x={h / 2} y={h / 2} size={3.5} open={false} />
    </svg>
  );
}

export function GeneralistReleaseTimeline({
  defaultSelected = 'helix',
  className,
}: GeneralistReleaseTimelineProps) {
  const uid = useId();
  const descriptionId = `${uid}-description`;
  const tableCaptionId = `${uid}-table`;
  const [filter, setFilter] = useState<OpenFilter>('all');
  const [showSourceType, setShowSourceType] = useState(false);
  const [selectedId, setSelectedId] = useState(defaultSelected);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const visible = filterReleases(filter);
  const selected: GeneralistRelease =
    visible.find((r) => r.id === selectedId) ?? visible[0];
  const citationFor = useCitationLookup();
  const citation = citationFor(selected.citationId);
  const downloadableOnly = filter === 'open';

  const rowsBottom = ROWS_TOP + visible.length * ROW_H;
  const height = rowsBottom + AXIS_BAND;
  const rowY = (i: number) => f(ROWS_TOP + i * ROW_H + ROW_H / 2);

  // The note names the fill rule and points at the first row's mark.
  const firstX = monthToX(monthIndex(visible[0].released));
  const noteX = Math.min(Math.max(firstX, 118), WIDTH - 118);

  function applyFilter(next: OpenFilter) {
    setFilter(next);
    const nextVisible = filterReleases(next);
    if (!nextVisible.some((r) => r.id === selectedId)) {
      setSelectedId(nextVisible[0].id);
    }
  }

  function select(index: number) {
    const clamped = Math.min(visible.length - 1, Math.max(0, index));
    setSelectedId(visible[clamped].id);
    buttonRefs.current[clamped]?.focus();
  }

  function reset() {
    setFilter('all');
    setShowSourceType(false);
    setSelectedId(defaultSelected);
  }

  return (
    <InstrumentFigure
      figureId="generalist-release-timeline"
      className={className}
      kicker="Generalist policies"
      heading="Thirteen robot brains since 2025; four you can download"
      controls={
        <button
          data-brand-control-id="control:selection"
          data-testid="generalist-downloadable-only"
          type="button"
          aria-pressed={downloadableOnly}
          onClick={() => applyFilter(downloadableOnly ? 'all' : 'open')}
          className={INSTRUMENT_TOGGLE_CLASS}
        >
          Downloadable only
        </button>
      }
      adjust={
        <>
          <div
            role="group"
            aria-label="Filter by weight availability"
            className="flex flex-wrap items-center gap-1"
          >
            {FILTERS.map(({ id, label }) => (
              <button
                data-brand-control-id="control:selection"
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => applyFilter(id)}
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button
              data-brand-control-id="control:selection"
              data-testid="generalist-source-type"
              type="button"
              aria-pressed={showSourceType}
              onClick={() => setShowSourceType((v) => !v)}
              className={INSTRUMENT_TOGGLE_CLASS}
            >
              Show source type
            </button>
            {showSourceType ? (
              <InstrumentLegend data-testid="provenance-legend">
                {PROVENANCE_TIERS.map((tier) => (
                  <LegendItem key={tier} swatch={<TierSwatch tier={tier} />}>
                    {provenanceLabel(tier)}
                  </LegendItem>
                ))}
              </InstrumentLegend>
            ) : null}
          </div>
          <div
            data-testid="release-track"
            role="group"
            aria-label="Select a release"
            className="flex flex-wrap items-center gap-1"
          >
            {visible.map((r, i) => (
              <button
                data-brand-control-id="control:selection"
                key={r.id}
                ref={(el) => {
                  buttonRefs.current[i] = el;
                }}
                type="button"
                data-status={releaseWeightState(r)}
                data-provenance={r.provenance}
                aria-label={r.name}
                aria-pressed={r.id === selected.id}
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
                className={INSTRUMENT_TOGGLE_CLASS}
              >
                {r.name}
              </button>
            ))}
            <span className="ml-1 font-sans text-[13px] text-text-dim">
              {`${visible.length} of ${GENERALIST_RELEASES.length} shown`}
            </span>
          </div>
          <div>
            <InstrumentReset onClick={reset} />
          </div>
        </>
      }
      stage={
        <FigureStage
          footer={
            <div
              data-testid="release-detail"
              aria-live="polite"
              className="basis-full font-sans text-[13px]"
            >
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="text-sm font-medium text-text">{selected.name}</span>
                <span className="text-text-dim">{selected.org}</span>
                <span className="text-text-dim">{selected.dateLabel}</span>
              </div>
              <div data-testid="release-availability" className="mt-1 text-text">
                {AVAILABILITY[releaseWeightState(selected)]}
              </div>
              {selected.weightsNote && (
                <p className="mt-1 max-w-[65ch] leading-relaxed text-text-dim">
                  {selected.weightsNote}
                </p>
              )}
              <p className="mt-1.5 max-w-[65ch] leading-relaxed text-text">
                {selected.capability}
              </p>
              {selected.context && (
                <p className="mt-1.5 text-text-dim">
                  Full treatment in{' '}
                  <Link
                    data-brand-control-id="control:link-focus"
                    href="/manipulation/pi-line"
                    className={STAGE_LINK}
                  >
                    The Pi Line
                  </Link>
                  .
                </p>
              )}
              {citation && (
                <div className="mt-1.5">
                  <a
                    data-brand-control-id="control:link-focus"
                    href={citation.url}
                    target="_blank"
                    rel="noopener"
                    className={STAGE_LINK}
                  >
                    Source: {citation.label}
                  </a>
                  {isVendorReported(selected) && (
                    <span className="text-text-dim"> (the maker&apos;s own report)</span>
                  )}
                </div>
              )}
            </div>
          }
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${height}`}
            aria-label={`Selected generalist robot policy records. One row per release at its release month. Filled circles have a reported download of the trained model; hollow circles are either not offered or not disclosed. Currently showing ${visible.length} of ${GENERALIST_RELEASES.length} releases.`}
            aria-describedby={descriptionId}
          >
            {AXIS_TICKS.map((tick) => {
              const x = monthToX(monthIndex(tick));
              return (
                <g key={tick}>
                  <line
                    x1={x}
                    x2={x}
                    y1={ROWS_TOP}
                    y2={rowsBottom + 4}
                    stroke={CHART_STRUCTURE.grid}
                    strokeWidth={CHART_STROKE.structure}
                  />
                  <text
                    data-scene-tick=""
                    x={x}
                    y={rowsBottom + 20}
                    textAnchor="start"
                    fontSize={CHART_TYPE.tickPx}
                    fill={CHART_STRUCTURE.labelSecondary}
                  >
                    {tick.slice(0, 4)}
                  </text>
                </g>
              );
            })}
            {visible.map((r, i) => {
              const cy = rowY(i);
              const x = monthToX(monthIndex(r.released));
              const isSelected = r.id === selected.id;
              return (
                <g
                  key={r.id}
                  data-release={r.id}
                  data-filled={r.openWeights ? '' : undefined}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(r.id)}
                >
                  <rect
                    x={0}
                    y={f(cy - ROW_H / 2)}
                    width={WIDTH}
                    height={ROW_H}
                    fill={isSelected ? CHART_STRUCTURE.grid : 'transparent'}
                    opacity={isSelected ? 0.35 : undefined}
                  />
                  <line
                    x1={AXIS_LEFT}
                    x2={AXIS_RIGHT}
                    y1={cy}
                    y2={cy}
                    stroke={CHART_STRUCTURE.grid}
                    strokeWidth={CHART_STROKE.structure}
                    opacity={CHART_STRUCTURE.gridOpacity}
                  />
                  <TierGlyph
                    tier={showSourceType ? r.provenance : 'paper'}
                    x={x}
                    y={cy}
                    size={NODE_SIZE}
                    open={r.openWeights}
                  />
                  <text
                    x={NAME_X}
                    y={cy}
                    dominantBaseline="middle"
                    fontSize={CHART_TYPE.tickPx}
                    fontWeight={isSelected ? 600 : undefined}
                    fill={isSelected ? CHART_STRUCTURE.label : CHART_STRUCTURE.labelSecondary}
                  >
                    {r.name}
                  </text>
                </g>
              );
            })}
            <StageAnnotation
              x={noteX}
              y={16}
              anchor="middle"
              lines={NOTE_LINES}
              target={[firstX, f(rowY(0) - NODE_SIZE - 1.5)]}
              from={[firstX, 38]}
            />
          </PlotStage>
        </FigureStage>
      }
      caption="General-purpose robot brains arrived quickly from early 2025, but most makers don't offer the trained model or haven't said."
      method={
        <>
          <div>
            A robot brain&apos;s trained model, often called its weights, is the file you would need
            to run it yourself. A filled circle means the maker reports a download of that trained
            model. A hollow circle is either not offered or not disclosed, and the two are kept
            apart in each card and in the table below; hollow does not mean closed licensing.
          </div>
          <div>
            This is an authored selection of {GENERALIST_RELEASES.length} records, not every
            generalist policy. Each sits at the month of its primary source; no days are invented.
            Source types: a paper (arXiv), repository release notes, a lab blog, or a press
            release. Blog and press entries are vendor-reported: the maker&apos;s own claims, with
            no outside check. Show source type in &ldquo;Adjust more&rdquo; draws each as its own
            shape.
          </div>
          <TableScroll labelledBy={tableCaptionId} className="pt-1">
            <table className="w-full min-w-[560px] border-collapse text-left font-sans text-sm text-text">
              <caption id={tableCaptionId} className="text-left text-text-dim">
                The {GENERALIST_RELEASES.length} records with maker, month, download status and
                source type.
              </caption>
              <thead>
                <tr className="border-b border-border-strong">
                  <th scope="col" className={TABLE_HEADER_CELL}>Model</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Maker</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Month</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Weights</th>
                  <th scope="col" className={TABLE_HEADER_CELL}>Source type</th>
                </tr>
              </thead>
              <tbody>
                {GENERALIST_RELEASES.map((r) => (
                  <tr key={r.id} data-testid={`release-row-${r.id}`}>
                    <th scope="row" className={cx(TABLE_CELL, 'font-medium whitespace-nowrap')}>
                      {r.name}
                    </th>
                    <td className={TABLE_CELL}>{r.org}</td>
                    <td className={cx(TABLE_CELL, 'whitespace-nowrap')}>{r.dateLabel}</td>
                    <td className={TABLE_CELL}>{releaseWeightLabel(r)}</td>
                    <td className={cx(TABLE_CELL, 'text-text-dim')}>{provenanceLabel(r.provenance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <ChartDescription
            id={descriptionId}
            form="state"
            summary="Current generalist release"
            description={`${visible.length} of ${GENERALIST_RELEASES.length} selected generalist policy records are shown; selected is ${selected.name} from ${selected.org} (${releaseWeightLabel(selected)}, ${provenanceLabel(selected.provenance)}). Filled nodes have a reported download; hollow, dim nodes include unavailable and not-disclosed records, and dim nodes do not establish closed licensing.`}
            states={[
              { label: 'selected', value: selected.name },
              { label: 'org', value: selected.org },
              { label: 'released', value: selected.dateLabel },
              { label: 'weights', value: releaseWeightLabel(selected) },
              { label: 'shown', value: `${visible.length} of ${GENERALIST_RELEASES.length}` },
            ]}
          />
        </>
      }
      source={`Authored selection of ${GENERALIST_RELEASES.length} records; dates and download status follow each record's primary source.`}
    />
  );
}
