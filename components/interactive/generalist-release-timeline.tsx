'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
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
  ChartAxes,
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
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

/**
 * GeneralistReleaseTimeline: every current generalist policy on one time
 * axis, Feb 2025 to Jul 2026, one row per release so no label collides.
 * A filled node marks a reported download; each row's text label separates
 * unavailable and not-disclosed weights. Shape records provenance (circle
 * paper, square repo notes, triangle lab blog, diamond press release). A
 * segmented filter hides the non-matching side. Selecting a release (click
 * or arrow keys) shows its capability annotation, provenance tier, and
 * primary source below.
 *
 * Interactive contract: deterministic render, keyboard-accessible selection
 * with arrow keys, visible detail readout, filter + reset controls, no
 * auto-playing motion.
 */
type GeneralistReleaseTimelineProps = {
  /** Initially selected release id. Default 'helix' (first chronologically). */
  defaultSelected?: string;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const AXIS_LEFT = 32;
const AXIS_RIGHT = WIDTH - 14;
const ROWS_TOP = 6;
const ROW_H = 20;
/** Room below the last row for the tick marks and month labels. */
const AXIS_BAND = 30;
const NODE_SIZE = 4.5;
const LABEL_GAP = 12;
/** Conservative advance width of a 12 px label character, for side choice. */
const CHAR_W = 7.4;
/** Clear space a label keeps from the plot edge. */
const EDGE = 6;

/** Time axis bounds (month precision), slightly padded past the data. */
const AXIS_MIN = '2025-01';
const AXIS_MAX = '2026-09';
const AXIS_TICKS = ['2025-01', '2025-07', '2026-01', '2026-07'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

const monthLabel = (index: number) => `${MONTH_NAMES[index % 12]} ${2025 + Math.floor(index / 12)}`;

/** Short row labels; the detail readout and buttons carry the full names. */
const SHORT_NAME: Record<string, string> = {
  'Gemini Robotics 1.0': 'GR 1.0',
  'Gemini Robotics 1.5': 'GR 1.5',
  'Gemini Robotics 2': 'GR 2',
  'AgiBot GO-1': 'GO-1',
  'AgiBot GO-2': 'GO-2',
  'Skild Brain': 'Skild',
};

const FILTERS: readonly { id: OpenFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Downloadable' },
  { id: 'closed', label: 'Not downloadable' },
  { id: 'undisclosed', label: 'Not disclosed' },
];

const STAGE_LINK = 'underline-offset-2';

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

/** The selection ring drawn around the selected node. */
function RingSwatch() {
  const h = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={h * 2} height={h} viewBox={`0 0 ${h * 2} ${h}`} className="shrink-0">
      <circle cx={h} cy={h / 2} r={5} fill="none" stroke={roleColour('highlight')} strokeWidth={CHART_STROKE.trace} />
    </svg>
  );
}

export function GeneralistReleaseTimeline({
  defaultSelected = 'helix',
  className,
}: GeneralistReleaseTimelineProps) {
  const descriptionId = `${useId()}-description`;
  const [filter, setFilter] = useState<OpenFilter>('all');
  const [selectedId, setSelectedId] = useState(defaultSelected);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const visible = filterReleases(filter);
  const selected: GeneralistRelease =
    visible.find((r) => r.id === selectedId) ?? visible[0];
  const citationFor = useCitationLookup();
  const citation = citationFor(selected.citationId);

  const rowsBottom = ROWS_TOP + visible.length * ROW_H;
  const height = rowsBottom + AXIS_BAND;
  const highlight = roleColour('highlight');

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
    setSelectedId(defaultSelected);
  }

  return (
    <InstrumentFigure
      figureId="generalist-release-timeline"
      className={className}
      heading="Generalist policy releases by month"
      controls={
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
            <InstrumentReset onClick={reset} />
          </div>
          <div
            data-testid="release-track"
            role="group"
            aria-label="Select a release"
            className="flex basis-full flex-wrap items-center gap-1"
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
        </>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend data-testid="provenance-legend">
                {PROVENANCE_TIERS.map((tier) => (
                  <LegendItem key={tier} swatch={<TierSwatch tier={tier} />}>
                    {provenanceLabel(tier)}
                  </LegendItem>
                ))}
                <LegendItem swatch={<LegendSwatch role="measurement" mark="dot" />}>filled: downloadable</LegendItem>
                <LegendItem swatch={<RingSwatch />}>selected</LegendItem>
              </InstrumentLegend>
              <div
                data-testid="release-detail"
                aria-live="polite"
                className="basis-full border-t border-border-strong pt-3 font-sans text-[13px]"
              >
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-sm font-medium text-text">{selected.name}</span>
                  <span className="text-text-dim">{selected.org}</span>
                  <span className="text-text-dim">{selected.dateLabel}</span>
                  <span className="whitespace-nowrap text-text-dim">
                    weights: {releaseWeightLabel(selected)}
                  </span>
                </div>
                <div className="mt-1 text-text-dim">
                  Provenance: {provenanceLabel(selected.provenance)}
                </div>
                <p className="mt-1.5 max-w-[65ch] leading-relaxed text-text">
                  {selected.capability}
                </p>
                {selected.weightsNote && (
                  <p className="mt-1.5 max-w-[65ch] leading-relaxed text-text">
                    {selected.weightsNote}
                  </p>
                )}
                {selected.context && (
                  <p className="mt-1.5 text-text-dim">
                    Cross-reference: full treatment in{' '}
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
                      <span className="text-text-dim"> (vendor-reported)</span>
                    )}
                  </div>
                )}
              </div>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current generalist release"
                description={`${visible.length} of ${GENERALIST_RELEASES.length} selected generalist policy records are shown; selected is ${selected.name} from ${selected.org} (${releaseWeightLabel(selected)}, ${provenanceLabel(selected.provenance)}) and weight availability is stated by each node label; dim nodes do not establish closed licensing.`}
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
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${height}`}
            aria-label={`Selected generalist robot policy records. Highlighted nodes have a reported weight download; dim nodes include unavailable and not-disclosed records, distinguished by their text labels. Node shape encodes provenance: circle for papers, square for repo release notes, triangle for lab blogs, diamond for press releases. Currently showing ${visible.length} of ${GENERALIST_RELEASES.length} releases.`}
            aria-describedby={descriptionId}
          >
            <ChartAxes
              plot={{ left: AXIS_LEFT, right: AXIS_RIGHT, top: ROWS_TOP, bottom: rowsBottom }}
              x={monthToX}
              y={(v) => v}
              xTicks={AXIS_TICKS.map(monthIndex)}
              formatX={monthLabel}
              grid={false}
              yAxis={false}
            />
            {/* One row per release; a label sits on whichever side of its
                node has room, so same-month releases never collide. */}
            {visible.map((r, i) => {
              const cy = f(ROWS_TOP + i * ROW_H + ROW_H / 2);
              const x = monthToX(monthIndex(r.released));
              const name = SHORT_NAME[r.name] ?? r.name;
              const weight = releaseWeightLabel(r);
              const labelWidth = (name.length + weight.length + 1) * CHAR_W;
              const right = x + LABEL_GAP + labelWidth <= WIDTH - EDGE;
              const isSelected = r.id === selected.id;
              return (
                <g key={r.id} data-release={r.id}>
                  <line
                    x1={AXIS_LEFT}
                    x2={AXIS_RIGHT}
                    y1={cy}
                    y2={cy}
                    stroke={CHART_STRUCTURE.grid}
                    strokeWidth={CHART_STROKE.structure}
                    opacity={CHART_STRUCTURE.gridOpacity}
                  />
                  <TierGlyph tier={r.provenance} x={x} y={cy} size={NODE_SIZE} open={r.openWeights} />
                  {isSelected ? (
                    <circle
                      cx={x}
                      cy={cy}
                      r={NODE_SIZE + 3.5}
                      fill="none"
                      stroke={highlight}
                      strokeWidth={CHART_STROKE.trace}
                    />
                  ) : null}
                  <text
                    x={right ? f(x + LABEL_GAP) : f(x - LABEL_GAP)}
                    y={cy}
                    dominantBaseline="middle"
                    textAnchor={right ? 'start' : 'end'}
                    fontSize={CHART_TYPE.tickPx}
                    fill={CHART_STRUCTURE.label}
                  >
                    <tspan fill={isSelected ? highlight : CHART_STRUCTURE.label}>{name}</tspan>
                    <tspan dx={6} fill={CHART_STRUCTURE.labelSecondary}>
                      {weight}
                    </tspan>
                  </text>
                </g>
              );
            })}
          </PlotStage>
        </FigureStage>
      }
      caption="Release months of selected generalist policies; filled marks have a reported weight download, and shape gives the source type."
      source={`Authored selection of ${GENERALIST_RELEASES.length} records; dates and weight availability follow each record's primary source.`}
    />
  );
}
