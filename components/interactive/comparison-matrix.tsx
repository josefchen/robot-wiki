'use client';

import { useMemo, useState, type ReactNode } from 'react';
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

/**
 * ComparisonMatrix: every major manipulation policy across the eight
 * architectural axes, as a filterable, sortable table.
 *
 * Honesty rules: cells the vendor has not
 * published render as "not disclosed", and null values always sort to the
 * end in both directions, never interleaved with numbers as if they were
 * zero. Unset scalar rates do not establish source-wide absence.
 *
 * Interactive contract: deterministic render, keyboard-operable filter
 * buttons and sort headers (aria-pressed / aria-sort), a visible row-count
 * readout, a reset control, an explicit empty state with a clear-filter
 * affordance, and horizontal scroll inside its own container at 375px.
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

  return (
    <InstrumentFigure
      figureId="comparison-matrix"
      className={className}
      heading="Policy comparison matrix"
      controls={
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
              className="h-9 w-full rounded-sm border border-border bg-surface-2 px-2.5 font-sans text-[13px] text-text placeholder:text-text-dim"
            />
          </ControlField>
          <InstrumentReset onClick={reset} className="self-end" />
          <div
            role="group"
            aria-label="Filter by weights"
            className="grid basis-full gap-1"
          >
            <span className="font-sans text-[13px] text-text-dim">Weights</span>
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
            <span className="font-sans text-[13px] text-text-dim">
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
          {rows.length === 0 ? (
            <div
              role="status"
              className="mx-3 mt-3 mb-2 rounded-sm border border-dashed border-border px-4 py-6 text-center"
            >
              <p className="font-sans text-sm text-text">
                No methods match these filters.
              </p>
              <p className="mt-1 font-sans text-[13px] text-text-dim">
                Undisclosed rows only match the Not disclosed representation
                filter; try widening the weights or representation selection.
              </p>
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
            <Table
              key={resetCount}
              // The shared table marks an anchored row in signal blue and sets
              // numeric columns in mono; on the stage signal is reserved for
              // links and mono for readouts, so the anchored row takes the
              // selection lime and every cell stays in the sans face.
              className="mx-3 mt-3 mb-2 [&_tbody_tr]:border-l-highlight [&_td]:font-sans"
              caption={`${METHODS.length} policies across the eight architectural axes. Horizon shows planned / executed steps (n.d. = not disclosed). Weights describe download availability, not license openness. Unknown availability is separate from not released. Cells the vendor has not published are marked not disclosed and always sort last, in both directions. Unset scalar rates do not prove that a source reports no setup-specific rate. Read the setting notes and linked sources before comparing cells.`}
              columns={COLUMNS}
              rows={rows}
              initialSort={{ key: 'year', direction: 'asc' }}
              rowAnchor={(row) => entityAnchorId('method', row.id)}
              highlightedAnchor={highlightedAnchor}
            />
          )}
        </FigureStage>
      }
      caption={`${METHODS.length} manipulation policies on eight architectural axes; unpublished cells read not disclosed and sort last.`}
      source="Compiled from the primary sources linked in each row's Sources column."
    />
  );
}
