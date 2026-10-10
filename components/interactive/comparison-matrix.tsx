'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { Table, type Column } from '@/components/ui';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  INSTRUMENT_TOGGLE_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
} from '@/components/ui/instrument';
import { StageStatusChip } from '@/components/ui/stage-status-chip';
import { FigureStage } from '@/components/motion/figure-frame';
import { CHART_STRUCTURE, CHART_TYPE, roleColour } from '@/components/motion/chart';
import { METHODS, type Method } from '@/data/methods';
import {
  methodConditioningText,
  methodFrequencyFigure,
  methodHorizonFigure,
  methodRepresentationText,
  NOT_DISCLOSED_TEXT,
  REPRESENTATION_LABELS,
} from '@/lib/entity-cells';
import { entityAnchorId } from '@/lib/entity-anchor';
import { useEntityAnchor } from '@/lib/use-entity-anchor';
import {
  DEFAULT_FILTERS,
  filterMethods,
  type MethodFilters,
  type RepresentationFilter,
  type WeightsFilter,
} from '@/lib/methods';
import { MOTION_STAGE } from '@/lib/motion-tokens';
import { cx } from '@/lib/utils';

/**
 * ComparisonMatrix: every major manipulation policy, first as a year strip
 * (one dot per method, by year and by how it outputs motion) and one card
 * per method with four plain facts, then the full filterable, sortable
 * matrix across the eight architectural axes in "Adjust more".
 *
 * Honesty rules: cells the vendor has not
 * published render as "not disclosed", and null values always sort to the
 * end in both directions, never interleaved with numbers as if they were
 * zero. Unset scalar rates do not establish source-wide absence.
 *
 * Interactive contract: deterministic render, keyboard-operable filter
 * buttons and sort headers (aria-pressed / aria-sort), a visible row-count
 * readout, a reset control, an explicit empty state with a clear-filter
 * affordance, and horizontal scroll inside its own container at 375px. A
 * search result's #method-<id> anchor lands on that method's card.
 */

const STAGE_LINK = 'underline-offset-2';

const NOT_DISCLOSED: ReactNode = (
  <span className="text-text-dim">{NOT_DISCLOSED_TEXT}</span>
);

const CROSS_EMBODIMENT_RANK = { no: 0, limited: 1, yes: 2 } as const;
const HIERARCHY_RANK = { none: 0, external: 1, internal: 2 } as const;

function horizonCell(method: Method): ReactNode {
  const figure = methodHorizonFigure(method);
  const note = method.actionHorizon.note;
  if (figure === null) return <>{NOT_DISCLOSED}{note ? <span className="block font-sans text-xs text-text-dim">{note}</span> : null}</>;
  return (
    <span className="tabular-nums">
      {figure}
      {note ? (
        <span className="block font-sans text-xs text-text-dim">{note}</span>
      ) : null}
    </span>
  );
}

function frequencyCell(method: Method): ReactNode {
  const figure = methodFrequencyFigure(method);
  const note = method.controlFrequencyNote;
  if (figure === null) {
    return (
      <>
        {NOT_DISCLOSED}
        {note ? (
          <span className="block text-xs text-text-dim">{note}</span>
        ) : null}
      </>
    );
  }
  return (
    <span className="tabular-nums">
      {figure}
      {note ? (
        <span className="block font-sans text-xs text-text-dim">{note}</span>
      ) : null}
    </span>
  );
}

/**
 * A method's primary sources. The records come from the server through
 * CitationRecordsProvider (lib/widget-citations.ts), so the table never
 * imports the citation registry into the browser.
 */
function MethodSources({ sources }: { sources: readonly string[] }) {
  const citationFor = useCitationLookup();
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {sources.map((id) => {
        const citation = citationFor(id);
        if (!citation) throw new Error(`Missing method source: ${id}`);
        return (
          <li key={id}>
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              data-brand-control-id="control:link-focus"
              data-method-source-id={id}
              className={`font-sans text-xs ${STAGE_LINK}`}
            >
              {citation.label}: {citation.title}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

const COLUMNS: Column<Method>[] = [
  { key: 'name', header: 'Method', sortable: true },
  { key: 'year', header: 'Year', sortable: true, numeric: true },
  {
    key: 'actionRepresentation',
    header: 'Action repr.',
    sortable: true,
    sortValue: (row) =>
      row.actionRepresentation === null
        ? null
        : REPRESENTATION_LABELS[row.actionRepresentation],
    render: (row) =>
      row.actionRepresentation === null
        ? NOT_DISCLOSED
        : methodRepresentationText(row),
  },
  {
    key: 'actionHorizon',
    header: 'Horizon H/Ĥ',
    sortable: true,
    sortValue: (row) => row.actionHorizon.planned,
    render: horizonCell,
  },
  {
    key: 'controlFrequencyHz',
    header: 'Control Hz',
    sortable: true,
    sortValue: (row) => row.controlFrequencyHz,
    render: frequencyCell,
  },
  {
    key: 'backbone',
    header: 'Backbone',
    render: (row) => row.backbone ?? NOT_DISCLOSED,
  },
  {
    key: 'conditioning',
    header: 'Conditioning',
    render: (row) =>
      row.conditioning.length > 0 ? methodConditioningText(row) : NOT_DISCLOSED,
  },
  {
    key: 'crossEmbodiment',
    header: 'Cross-embodiment',
    sortable: true,
    sortValue: (row) =>
      row.crossEmbodiment === null
        ? null
        : CROSS_EMBODIMENT_RANK[row.crossEmbodiment],
    render: (row) => row.crossEmbodiment ?? NOT_DISCLOSED,
  },
  {
    key: 'hierarchy',
    header: 'Hierarchy',
    sortable: true,
    sortValue: (row) =>
      row.hierarchy === null ? null : HIERARCHY_RANK[row.hierarchy],
    render: (row) => row.hierarchy ?? NOT_DISCLOSED,
  },
  {
    key: 'openWeights',
    header: 'Weights',
    sortable: true,
    sortValue: (row) => row.openWeights === null ? null : (row.openWeights ? 1 : 0),
    render: (row) => <>
      {row.openWeights === null ? NOT_DISCLOSED : row.openWeights
        ? <StageStatusChip variant="ok" line="solid">downloadable</StageStatusChip>
        : <StageStatusChip variant="default" line="dashed">not released</StageStatusChip>}
      {row.weightsNote ? <span className="block font-sans text-xs text-text-dim">{row.weightsNote}</span> : null}
    </>,
  },
  {
    key: 'sources',
    header: 'Sources',
    render: (row) => <MethodSources sources={row.sources} />,
  },
];

const WEIGHT_OPTIONS: Array<{ value: WeightsFilter; label: string }> = [
  { value: 'all', label: 'All weights' },
  { value: 'open', label: 'Downloadable' },
  { value: 'closed', label: 'Not released' },
  { value: 'undisclosed', label: 'Not disclosed' },
];

const REPRESENTATION_OPTIONS: Array<{
  value: RepresentationFilter;
  label: string;
}> = [
  { value: 'all', label: 'All representations' },
  { value: 'continuous', label: 'Continuous' },
  { value: 'discrete', label: 'Discrete' },
  { value: 'diffusion', label: 'Diffusion' },
  { value: 'flow', label: 'Flow' },
  { value: 'undisclosed', label: 'Not disclosed' },
];

/**
 * How a method turns what it sees into motion, in plain words. Diffusion
 * and flow matching both start from random noise and refine it into a
 * move, so the main view groups them; the full matrix keeps them apart.
 */
type OutputStyle = 'codes' | 'numbers' | 'noise' | 'undisclosed';

const OUTPUT_STYLES: Array<{ id: OutputStyle; label: string }> = [
  { id: 'codes', label: 'word-like codes' },
  { id: 'numbers', label: 'plain numbers' },
  { id: 'noise', label: 'refined from noise' },
  { id: 'undisclosed', label: NOT_DISCLOSED_TEXT },
];

function outputStyle(method: Method): OutputStyle {
  switch (method.actionRepresentation) {
    case 'discrete':
      return 'codes';
    case 'continuous':
      return 'numbers';
    case 'diffusion':
    case 'flow':
      return 'noise';
    default:
      return 'undisclosed';
  }
}

const STYLE_LABEL = Object.fromEntries(
  OUTPUT_STYLES.map(({ id, label }) => [id, label]),
) as Record<OutputStyle, string>;

/** Year order; ties keep the data order. Undated rows go last. */
const BY_YEAR: Method[] = [...METHODS].sort(
  (a, b) => (a.year ?? Infinity) - (b.year ?? Infinity),
);

const YEARS: number[] = (() => {
  const years = METHODS.flatMap((m) => (m.year === null ? [] : [m.year]));
  const out: number[] = [];
  for (let y = Math.min(...years); y <= Math.max(...years); y += 1) out.push(y);
  return out;
})();

/** The year every undisclosed output style falls in, when there is one. */
const UNDISCLOSED_YEAR: number | null = (() => {
  const years = new Set(
    METHODS.filter((m) => outputStyle(m) === 'undisclosed').map((m) => m.year),
  );
  return years.size === 1 ? ([...years][0] ?? null) : null;
})();

function plansAhead(method: Method): string {
  const planned = method.actionHorizon.planned;
  if (planned === null) return NOT_DISCLOSED_TEXT;
  return planned === 1 ? '1 move' : `${planned} moves`;
}

function speed(method: Method): string {
  const hz = method.controlFrequencyHz;
  return hz === null ? NOT_DISCLOSED_TEXT : `${hz} commands a second`;
}

function download(method: Method): string {
  return method.openWeights === null ? NOT_DISCLOSED_TEXT : method.openWeights ? 'yes' : 'no';
}

const STRIP = {
  width: 340,
  labelX: 0,
  colX0: 132,
  headerY: 14,
  rowY0: 36,
  rowStep: 22,
  dotR: 3,
  dotStep: 10,
} as const;
const STRIP_COL_W = (STRIP.width - STRIP.colX0) / YEARS.length;
const STRIP_HEIGHT = STRIP.rowY0 + STRIP.rowStep * (OUTPUT_STYLES.length - 1) + 10;
const fx = (v: number) => Number(v.toFixed(2));

/**
 * Every method as one dot, by year across and by output style down. The
 * cards below carry the same facts as text, so the drawing is hidden from
 * assistive technology rather than named twice.
 */
function YearStrip({ shown }: { shown: ReadonlySet<string> }) {
  const measurement = roleColour('measurement');
  const colCenter = (year: number) =>
    fx(STRIP.colX0 + (YEARS.indexOf(year) + 0.5) * STRIP_COL_W);
  return (
    <svg
      viewBox={`0 0 ${STRIP.width} ${STRIP_HEIGHT}`}
      aria-hidden="true"
      focusable="false"
      data-chart=""
      data-testid="method-year-strip"
      className="motion-stage-svg block h-auto w-full"
      fontFamily={CHART_TYPE.font}
      style={{ '--motion-stage-view-width': `${STRIP.width}px` } as CSSProperties}
    >
      {YEARS.map((year) => (
        <text
          key={year}
          data-scene-tick=""
          x={colCenter(year)}
          y={STRIP.headerY}
          textAnchor="middle"
          fontSize={CHART_TYPE.tickPx}
          fill={CHART_STRUCTURE.labelSecondary}
        >
          {year}
        </text>
      ))}
      {OUTPUT_STYLES.map((style, row) => {
        const y = STRIP.rowY0 + row * STRIP.rowStep;
        const undisclosed = style.id === 'undisclosed';
        return (
          <g key={style.id} data-output-style={style.id}>
            <text
              x={STRIP.labelX}
              y={y + CHART_TYPE.labelPx * 0.35}
              fontSize={CHART_TYPE.labelPx}
              fill={CHART_STRUCTURE.label}
            >
              {style.label}
            </text>
            {YEARS.map((year) => {
              const members = BY_YEAR.filter(
                (m) => m.year === year && outputStyle(m) === style.id,
              );
              return members.map((m, j) => (
                <circle
                  key={m.id}
                  data-method-dot={m.id}
                  cx={fx(colCenter(year) + (j - (members.length - 1) / 2) * STRIP.dotStep)}
                  cy={y}
                  r={STRIP.dotR}
                  fill={undisclosed ? MOTION_STAGE.background : measurement}
                  stroke={undisclosed ? CHART_STRUCTURE.labelSecondary : measurement}
                  strokeWidth={1.5}
                  opacity={shown.has(m.id) ? 1 : 0.2}
                />
              ));
            })}
            {undisclosed && UNDISCLOSED_YEAR !== null ? (
              <text
                data-scene-note=""
                data-testid="method-strip-note"
                x={fx(colCenter(UNDISCLOSED_YEAR) - STRIP_COL_W / 2 - 4)}
                y={y + CHART_TYPE.labelPx * 0.35}
                textAnchor="end"
                fontSize={CHART_TYPE.axisPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                none before {UNDISCLOSED_YEAR}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function MethodCard({ method, highlighted }: { method: Method; highlighted: boolean }) {
  const anchor = entityAnchorId('method', method.id);
  const facts: Array<[string, string]> = [
    ['Output', STYLE_LABEL[outputStyle(method)]],
    ['Plans ahead', plansAhead(method)],
    ['Speed', speed(method)],
    ['Download', download(method)],
  ];
  return (
    <li
      id={anchor}
      data-entity-id={anchor}
      data-method-card={method.id}
      data-highlighted={highlighted || undefined}
      className={cx(
        'm-0! scroll-mt-24 border-l pl-3',
        highlighted ? '[border-color:var(--accent)]' : 'border-transparent',
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-text">{method.name}</span>
        <span className="text-text-dim">{method.year ?? NOT_DISCLOSED_TEXT}</span>
      </div>
      <dl className="m-0 mt-0.5 grid grid-cols-[auto_1fr] gap-x-2">
        {facts.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-text-dim">{term}</dt>
            <dd className="m-0 text-text">{value}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

type ComparisonMatrixProps = {
  className?: string;
};

export function ComparisonMatrix({ className }: ComparisonMatrixProps) {
  const [filters, setFilters] = useState<MethodFilters>(DEFAULT_FILTERS);
  // Remounting the table restores its internal initial sort on reset.
  const [resetCount, setResetCount] = useState(0);
  const highlightedId = useEntityAnchor('method');
  const highlightedAnchor = highlightedId
    ? entityAnchorId('method', highlightedId)
    : null;

  const rows = useMemo(() => filterMethods(METHODS, filters), [filters]);
  const shown = useMemo(() => new Set(rows.map((m) => m.id)), [rows]);
  const cards = BY_YEAR.filter((m) => shown.has(m.id));

  // A search result links to a method's card; bring it into view once the
  // hash is read after mount.
  useEffect(() => {
    if (!highlightedAnchor) return;
    const target = document.getElementById(highlightedAnchor);
    if (!target || typeof target.scrollIntoView !== 'function') return;
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [highlightedAnchor]);

  function patchFilters(patch: Partial<MethodFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function reset() {
    setFilters(DEFAULT_FILTERS);
    setResetCount((count) => count + 1);
  }

  const downloadableOnly = filters.weights === 'open';

  return (
    <InstrumentFigure
      figureId="comparison-matrix"
      className={className}
      kicker="Policy comparison"
      heading="Most 2026 robot brains don't disclose how they move"
      controls={
        <button
          data-brand-control-id="control:selection"
          data-testid="matrix-downloadable-only"
          type="button"
          aria-pressed={downloadableOnly}
          onClick={() => patchFilters({ weights: downloadableOnly ? 'all' : 'open' })}
          className={INSTRUMENT_TOGGLE_CLASS}
        >
          Downloadable only
        </button>
      }
      adjust={
        <>
          <ControlField>
            <ControlLabel htmlFor="matrix-filter">Filter methods</ControlLabel>
            <input
              data-brand-control-id="control:input"
              id="matrix-filter"
              type="search"
              value={filters.query}
              onChange={(event) => patchFilters({ query: event.target.value })}
              placeholder="name, backbone, conditioning"
              className="h-9 w-full rounded-none border-0 border-b bg-transparent px-0 font-sans text-[13px] text-text [border-color:var(--line-strong)] placeholder:text-text-dim"
            />
          </ControlField>
          <InstrumentReset onClick={reset} className="self-end" />
          <div
            role="group"
            aria-label="Filter by weights"
            className="grid basis-full gap-1"
          >
            <span className="font-sans text-sm text-text-dim">Weights</span>
            <div className="flex flex-wrap gap-1">
              {WEIGHT_OPTIONS.map((option) => (
                <button
                  data-brand-control-id="control:selection"
                  key={option.value}
                  type="button"
                  aria-pressed={filters.weights === option.value}
                  onClick={() => patchFilters({ weights: option.value })}
                  className={INSTRUMENT_TOGGLE_CLASS}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div
            role="group"
            aria-label="Filter by action representation"
            className="grid basis-full gap-1"
          >
            <span className="font-sans text-sm text-text-dim">
              Action representation
            </span>
            <div className="flex flex-wrap gap-1">
              {REPRESENTATION_OPTIONS.map((option) => (
                <button
                  data-brand-control-id="control:selection"
                  key={option.value}
                  type="button"
                  aria-pressed={filters.representation === option.value}
                  onClick={() => patchFilters({ representation: option.value })}
                  className={INSTRUMENT_TOGGLE_CLASS}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {rows.length > 0 ? (
            <div className="min-w-0 basis-full">
              <Table
                key={resetCount}
                // The shared table sets numeric columns in mono; in a figure
                // mono is reserved for readouts, so every cell stays in the sans.
                className="mt-1 [&_td]:font-sans"
                caption={`${METHODS.length} policies across the eight architectural axes. Horizon shows planned / executed steps (n.d. = not disclosed). Weights describe download availability, not license openness. Unknown availability is separate from not released. Cells the vendor has not published are marked not disclosed and always sort last, in both directions. Unset scalar rates do not prove that a source reports no setup-specific rate. Read the setting notes and linked sources before comparing cells.`}
                columns={COLUMNS}
                rows={rows}
                initialSort={{ key: 'year', direction: 'asc' }}
              />
            </div>
          ) : null}
        </>
      }
      stage={
        <FigureStage
          footer={
            <InstrumentReadout>
              {rows.length} of {METHODS.length} methods
            </InstrumentReadout>
          }
        >
          <div className="font-sans text-sm leading-snug">
            <div className="text-text-dim">
              Each dot is one robot brain, placed by year and by how it outputs motion.
            </div>
            <div className="@container mt-2 max-w-[520px]">
              <YearStrip shown={shown} />
            </div>
            {rows.length === 0 ? (
              <div role="status" className="mt-4">
                <div className="text-text">No methods match these filters.</div>
                <div className="mt-1 text-text-dim">
                  Undisclosed rows only match the Not disclosed representation
                  filter; try widening the weights or representation selection.
                </div>
                <button
                  data-brand-control-id="control:secondary-action"
                  data-pagefind-ignore
                  type="button"
                  onClick={clearFilters}
                  className={`mt-3 ${INSTRUMENT_SECONDARY_CONTROL_CLASS}`}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="mt-4 text-text-dim">
                  Figures as each source reports them, often for one test setup.
                </div>
                <ul
                  data-testid="method-cards"
                  className="m-0! mt-2 grid list-none grid-cols-1 gap-x-6 gap-y-3 p-0! sm:grid-cols-2"
                >
                  {cards.map((method) => (
                    <MethodCard
                      key={method.id}
                      method={method}
                      highlighted={entityAnchorId('method', method.id) === highlightedAnchor}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        </FigureStage>
      }
      caption="Through 2025 every system here published how it outputs motion; four of the six 2026 entries are company announcements that leave it out."
      method={
        <>
          <div>
            Compiled from the primary sources linked in each row of the full matrix under
            &ldquo;Adjust more&rdquo;. The cards and dots group the action representations into
            plain words: discrete tokens are &ldquo;word-like codes&rdquo;, continuous outputs are
            &ldquo;plain numbers&rdquo;, and diffusion and flow matching, which both refine random
            noise into a move, are &ldquo;refined from noise&rdquo;.
          </div>
          <div>
            &ldquo;Plans ahead&rdquo; is the planned action horizon and &ldquo;speed&rdquo; the
            reported control frequency, each for the setting the source names; the matrix keeps
            the executed steps and the setting notes. &ldquo;Download&rdquo; describes download
            availability, not licence openness. Cells the vendor has not published read{' '}
            {NOT_DISCLOSED_TEXT} and sort last in both directions.
          </div>
        </>
      }
      source="Compiled from the primary sources linked in each row's Sources column."
    />
  );
}
