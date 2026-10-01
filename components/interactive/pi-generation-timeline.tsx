'use client';

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
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  LegendSwatch,
  roleColour,
} from '@/components/motion/chart';
import {
  PI_GENERATIONS,
  generationsBehind,
  openWeightsFrontier,
  type PiGeneration,
} from '@/lib/pi-generations';

/**
 * PiGenerationTimeline: source publication months and the pinned openpi
 * checkpoint catalogue, not a licensing classification. An undated entry is
 * selectable but not plotted at an invented month. Selecting an entry (click
 * or arrow keys) shows its backbone, contribution, and primary source below.
 *
 * Interactive contract: deterministic render, keyboard-accessible selection
 * with arrow keys, visible detail readout, reset control, fixed-height SVG
 * (no layout shift), no auto-playing motion.
 */
type PiGenerationTimelineProps = {
  /** Initially selected generation id. Default 'pi0'. */
  defaultSelected?: string;
  className?: string;
};

const WIDTH = CHART_VIEW_WIDTH;
const AXIS_Y = 50;
const AXIS_LEFT = 24;
const AXIS_RIGHT = WIDTH - 14;
const HEIGHT = AXIS_Y + 70;
const NODE_R = 4.5;

/** Time axis bounds (month precision), slightly padded past the data. */
const AXIS_MIN = '2024-09';
const AXIS_MAX = '2026-07';

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

function weightsLabel(g: PiGeneration): string {
  return g.openWeights === true ? 'downloadable'
    : g.openWeights === false ? 'unavailable' : 'unverified';
}

/** A hollow ring, the unverified-availability mark, for the legend. */
function RingSwatch({ role }: { role: 'measurement' | 'highlight' }) {
  const h = CHART_TYPE.tickPx;
  return (
    <svg aria-hidden="true" focusable="false" width={h * 2} height={h} viewBox={`0 0 ${h * 2} ${h}`} className="shrink-0">
      <circle cx={h} cy={h / 2} r={role === 'highlight' ? 5 : 3.5} fill="none" stroke={roleColour(role)} strokeWidth={role === 'highlight' ? CHART_STROKE.trace : 1.5} />
    </svg>
  );
}

const STAGE_LINK = 'underline-offset-2';

export function PiGenerationTimeline({
  defaultSelected = 'pi0',
  className,
}: PiGenerationTimelineProps) {
  const descriptionId = `${useId()}-description`;
  const [selectedId, setSelectedId] = useState(defaultSelected);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selected: PiGeneration =
    PI_GENERATIONS.find((g) => g.id === selectedId) ?? PI_GENERATIONS[0];
  const citationFor = useCitationLookup();
  const citation = citationFor(selected.citationId);
  const frontier = openWeightsFrontier();
  const behind = generationsBehind();

  // A catalogue boundary, not evidence of closed licensing.
  const firstUnlisted = PI_GENERATIONS.find((g) => g.openWeights !== true && g.released !== null);
  const dividerX = f(
    (dateToX(frontier.released ?? AXIS_MIN) + dateToX(firstUnlisted?.released ?? AXIS_MAX)) / 2,
  );

  // pi0.6 and pi*0.6 share a release month; nudge the second node right by
  // about a month so both circles stay visible (labels stay honest).
  const nodeX = (g: PiGeneration, index: number): number | null => {
    if (g.released === null) return null;
    const base = dateToX(g.released);
    const collision = PI_GENERATIONS.findIndex(
      (other) => other.released === g.released,
    );
    return collision === index ? base : f(base + 13);
  };

  function select(index: number) {
    const clamped = Math.min(PI_GENERATIONS.length - 1, Math.max(0, index));
    setSelectedId(PI_GENERATIONS[clamped].id);
    buttonRefs.current[clamped]?.focus();
  }

  const measurement = roleColour('measurement');
  const highlight = roleColour('highlight');
  const reference = roleColour('reference');

  return (
    <InstrumentFigure
      figureId="pi-generation-timeline"
      className={className}
      heading="π line by source month"
      controls={
        <div
          data-testid="generation-track"
          role="group"
          aria-label="Select a generation"
          className="flex flex-wrap items-center gap-1"
        >
          {PI_GENERATIONS.map((g, i) => (
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
              className={INSTRUMENT_TOGGLE_CLASS}
            >
              {g.name}
            </button>
          ))}
          <InstrumentReset
            onClick={() =>
              select(PI_GENERATIONS.findIndex((g) => g.id === defaultSelected))
            }
          />
        </div>
      }
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentLegend>
                <LegendItem swatch={<LegendSwatch role="measurement" mark="dot" />}>downloadable</LegendItem>
                <LegendItem swatch={<RingSwatch role="measurement" />}>availability unverified</LegendItem>
                <LegendItem swatch={<RingSwatch role="highlight" />}>selected</LegendItem>
                <LegendItem swatch={<LegendSwatch role="reference" mark="dash" />}>
                  pinned catalogue ends at {frontier.name}
                </LegendItem>
              </InstrumentLegend>
              <div className="basis-full font-sans text-[13px] text-text-dim">
                {behind} model entries not in the pinned catalogue
              </div>
              <div
                data-testid="generation-detail"
                aria-live="polite"
                className="basis-full border-t border-border-strong pt-3 font-sans text-[13px]"
              >
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-sm font-medium text-text">{selected.name}</span>
                  <span className="text-text-dim">{selected.dateLabel}</span>
                  <span className="whitespace-nowrap text-text-dim">
                    weights {weightsLabel(selected)}
                  </span>
                </div>
                <div className="mt-1 text-text-dim">{selected.backbone}</div>
                <p className="mt-1.5 max-w-[65ch] leading-relaxed text-text">
                  {selected.contribution}
                </p>
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
                  </div>
                )}
              </div>
              <ChartDescription
                id={descriptionId}
                form="state"
                summary="Current π generation"
                description={`The π line contains ${PI_GENERATIONS.length} generations, with established source months from ${PI_GENERATIONS[0].dateLabel} to ${PI_GENERATIONS[PI_GENERATIONS.length - 1].dateLabel}. MEM has no established month and is not plotted. The divider after ${frontier.name} marks the pinned checkpoint catalogue, not licensing; selected now is ${selected.name} (${selected.backbone}, weights ${weightsLabel(selected)}) and ${behind} other entries have unverified availability.`}
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
        >
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Timeline of dated Physical Intelligence sources from ${PI_GENERATIONS[0].dateLabel} to ${PI_GENERATIONS[PI_GENERATIONS.length - 1].dateLabel}. The pinned checkpoint catalogue ends at ${frontier.name}; ${behind} other model entries have unverified weight availability. MEM has no established month and is not plotted.`}
            aria-describedby={descriptionId}
          >
            {/* Divider: pinned catalogue boundary */}
            <line
              x1={dividerX}
              x2={dividerX}
              y1={2}
              y2={AXIS_Y + 46}
              stroke={reference}
              strokeWidth={CHART_STROKE.reference}
              strokeDasharray={CHART_STROKE.dash}
            />
            {/* Time axis */}
            <line
              x1={AXIS_LEFT}
              x2={AXIS_RIGHT}
              y1={AXIS_Y}
              y2={AXIS_Y}
              stroke={CHART_STRUCTURE.axes}
              strokeWidth={CHART_STROKE.structure}
              opacity={CHART_STRUCTURE.axesOpacity}
            />
            {['2025', '2026'].map((year) => (
              <g key={year}>
                <line
                  x1={dateToX(`${year}-01`)}
                  x2={dateToX(`${year}-01`)}
                  y1={AXIS_Y - CHART_STROKE.tickLength / 2}
                  y2={AXIS_Y + CHART_STROKE.tickLength / 2}
                  stroke={CHART_STRUCTURE.axes}
                  strokeWidth={CHART_STROKE.structure}
                  opacity={CHART_STRUCTURE.axesOpacity}
                />
                <text
                  data-scene-tick=""
                  x={dateToX(`${year}-01`)}
                  y={AXIS_Y + 60}
                  textAnchor="middle"
                  fontSize={CHART_TYPE.tickPx}
                  fill={CHART_STRUCTURE.labelSecondary}
                >
                  {year}
                </text>
              </g>
            ))}
            {/* Generation nodes; labels alternate above and below the axis */}
            {PI_GENERATIONS.map((g, i) => {
              const cx = nodeX(g, i);
              if (cx === null) return null;
              const above = i % 2 === 0;
              const isSelected = g.id === selected.id;
              return (
                <g key={g.id}>
                  <circle
                    cx={cx}
                    cy={AXIS_Y}
                    r={NODE_R}
                    fill={g.openWeights ? measurement : 'none'}
                    stroke={measurement}
                    strokeWidth={1.5}
                  />
                  {isSelected ? (
                    <circle
                      cx={cx}
                      cy={AXIS_Y}
                      r={NODE_R + 3}
                      fill="none"
                      stroke={highlight}
                      strokeWidth={CHART_STROKE.trace}
                    />
                  ) : null}
                  <text
                    x={cx}
                    y={above ? AXIS_Y - 30 : AXIS_Y + 24}
                    textAnchor="middle"
                    fontSize={CHART_TYPE.labelPx}
                    fill={isSelected ? highlight : CHART_STRUCTURE.label}
                  >
                    {g.name}
                  </text>
                  <text
                    data-scene-tick=""
                    x={cx}
                    y={above ? AXIS_Y - 13 : AXIS_Y + 42}
                    textAnchor="middle"
                    fontSize={CHART_TYPE.tickPx}
                    fill={CHART_STRUCTURE.labelSecondary}
                  >
                    {g.dateLabel}
                  </text>
                </g>
              );
            })}
          </PlotStage>
        </FigureStage>
      }
      caption="Source months of the π line; filled nodes are listed in the pinned openpi checkpoint catalogue."
      source="Downloadable means listed in the inspected openpi catalogue and says nothing about the licence; MEM has no verified month and stays unplotted."
    />
  );
}
