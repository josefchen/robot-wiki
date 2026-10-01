'use client';

import { useId, useMemo, useState } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { TableScroll } from '@/components/ui';
import {
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
} from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  DEFAULT_HAND_SORT,
  DEXTEROUS_HANDS,
  TRAINING_BET_LABEL,
  defaultDirectionFor,
  sortHands,
  type HandSortKey,
  type SortDirection,
} from '@/lib/dexterous-hands';
import { cx } from '@/lib/utils';

/**
 * HandComparison: the dexterous-hand table for the dexterity module. Five
 * hands, five different bets on how manipulation gets solved, with the
 * specs the makers disclose and "not disclosed" where they do not. The
 * table opens sorted by tactile threshold because that is the module's
 * thesis: the gap between what hands can feel and what they can do.
 *
 * Interactive contract: deterministic render, keyboard-operable sort
 * headers (aria-sort) and row selection (aria-pressed), a visible readout
 * that narrates the current sort and selection, a reset control, and
 * horizontal scroll inside its own container at 375px.
 */

const HEADER_CELL = 'px-3 py-2 text-left font-sans text-xs font-medium text-text-dim';

const CELL = 'px-3 py-2.5 align-top';

/** Small-print second line under a spec figure, e.g. a unit conversion. */
function CellNote({ children }: { children: string }) {
  return <span className="mt-0.5 block text-xs text-text-dim">{children}</span>;
}

function NotDisclosed() {
  return <span className="text-xs text-text-dim">not disclosed</span>;
}

const SORT_COLUMNS: Array<{ key: HandSortKey; label: string; ariaLabel: string }> =
  [
    { key: 'dof', label: 'DoF', ariaLabel: 'Sort by DoF' },
    {
      key: 'tactile',
      label: 'Tactile threshold',
      ariaLabel: 'Sort by tactile threshold',
    },
    { key: 'cost', label: 'Cost', ariaLabel: 'Sort by cost' },
  ];

const SORT_DESCRIPTION: Record<HandSortKey, Record<SortDirection, string>> = {
  dof: {
    desc: 'degrees of freedom, most first',
    asc: 'degrees of freedom, fewest first',
  },
  tactile: {
    asc: 'tactile threshold, most sensitive first',
    desc: 'tactile threshold, least sensitive first',
  },
  cost: { asc: 'cost, lowest first', desc: 'cost, highest first' },
};

function SourceLink({ id, label }: { id: string; label: string }) {
  const citationFor = useCitationLookup();
  const citation = citationFor(id);
  if (!citation) {
    return <span className="text-text-dim">{label}</span>;
  }
  return (
    <a
      data-brand-control-id="control:link-focus"
      href={citation.url}
      target="_blank"
      rel="noopener"
      /* The link stands alone in its cell, so the anchor itself carries the
          24px minimum target. */
      className="inline-flex min-h-6 items-center whitespace-nowrap underline-offset-2"
    >
      {label}
    </a>
  );
}

export function HandComparison({ className }: { className?: string }) {
  const [sort, setSort] = useState<{
    key: HandSortKey;
    direction: SortDirection;
  }>(DEFAULT_HAND_SORT);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const captionId = useId();
  const rows = useMemo(
    () => sortHands(DEXTEROUS_HANDS, sort.key, sort.direction),
    [sort],
  );
  const selected = DEXTEROUS_HANDS.filter((hand) => selectedIds.has(hand.id));

  function handleSort(key: HandSortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: defaultDirectionFor(key) },
    );
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function reset() {
    setSort(DEFAULT_HAND_SORT);
    setSelectedIds(new Set());
  }

  const readout = `${rows.length} hands, sorted by ${
    SORT_DESCRIPTION[sort.key][sort.direction]
  }${selected.length > 0 ? `, ${selected.length} selected` : ''}`;

  return (
    <InstrumentFigure
      figureId="hand-comparison"
      data-testid="hand-comparison"
      className={className}
      heading="Dexterous hands by disclosed spec"
      controls={<InstrumentReset onClick={reset} />}
      stage={
        <FigureStage
          footer={
            <>
              <InstrumentReadout data-testid="hand-comparison-readout">
                {readout}
              </InstrumentReadout>
              <div
                data-testid="hand-comparison-selection"
                className="mt-1 basis-full border-t border-border-strong pt-3 font-sans"
              >
                {selected.length === 0 ? (
                  <p className="text-[13px] text-text-dim">
                    Select hands to compare their trade-offs.
                  </p>
                ) : (
                  // Important, because the unlayered `.prose ul` and `.prose li`
                  // rules otherwise indent the list off the readout's edge.
                  <ul className="m-0! flex flex-col gap-2 p-0!">
                    {selected.map((hand) => (
                      <li
                        key={hand.id}
                        className="m-0! max-w-[65ch] text-[13px] leading-relaxed text-text-dim"
                      >
                        <span className="font-medium text-text">{hand.name}.</span>{' '}
                        {hand.tradeoff}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          }
        >
          <TableScroll labelledBy={captionId} className="px-1 pt-1.5 pb-1">
            <table className="w-full min-w-[560px] border-collapse text-left font-sans text-[13px] text-text">
              <caption id={captionId} className="sr-only">
                Five dexterous hands with their degrees of freedom, tactile
                threshold, cost and training bet. Sort by any spec column, and
                select a row to compare it against the others.
              </caption>
              <thead>
                <tr className="border-b border-border-strong">
                  <th scope="col" className={HEADER_CELL}>
                    Hand
                  </th>
                  {SORT_COLUMNS.map((column) => {
                    const active = sort.key === column.key;
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        aria-sort={
                          active
                            ? sort.direction === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : undefined
                        }
                        className={HEADER_CELL}
                      >
                        <button
                          data-brand-control-id="control:secondary-action"
                          type="button"
                          aria-label={column.ariaLabel}
                          onClick={() => handleSort(column.key)}
                          className={cx(
                            'inline-flex min-h-6 items-center gap-1 text-left font-medium transition-colors hover:text-text',
                            active && 'text-text',
                          )}
                        >
                          {column.label}
                          <span aria-hidden="true">
                            {active ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  <th scope="col" className={HEADER_CELL}>
                    Training bet
                  </th>
                  <th scope="col" className={HEADER_CELL}>
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((hand) => {
                  const isSelected = selectedIds.has(hand.id);
                  return (
                    <tr
                      key={hand.id}
                      data-testid={`hand-row-${hand.id}`}
                      data-selected={isSelected || undefined}
                      className="border-b border-border-strong last:border-b-0"
                    >
                      {/* Selection is the lime bar on the row's edge. */}
                      <th
                        scope="row"
                        className={cx(
                          CELL,
                          'min-w-[150px] border-l-[3px] font-normal',
                          isSelected ? 'border-l-highlight' : 'border-l-transparent',
                        )}
                      >
                        <button
                          data-brand-control-id="control:selection"
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={`Select ${hand.name} for comparison`}
                          onClick={() => toggleSelect(hand.id)}
                          className="min-h-6 text-left font-medium text-text underline decoration-border-strong decoration-1 underline-offset-4 transition-colors hover:decoration-text aria-pressed:no-underline"
                        >
                          {hand.name}
                        </button>
                        <span className="mt-1 block max-w-[24ch] text-xs leading-snug text-text-dim">
                          {hand.maker} · {hand.actuation}
                        </span>
                      </th>
                      <td className={cx(CELL, 'whitespace-nowrap tabular-nums')}>
                        {hand.dofDisplay}
                      </td>
                      <td className={cx(CELL, 'whitespace-nowrap tabular-nums')}>
                        {hand.tactileDisplay ? (
                          <>
                            {hand.tactileDisplay}
                            {hand.tactileNote ? <CellNote>{hand.tactileNote}</CellNote> : null}
                          </>
                        ) : (
                          <NotDisclosed />
                        )}
                      </td>
                      <td className={cx(CELL, 'whitespace-nowrap tabular-nums')}>
                        {hand.costDisplay ? (
                          <>
                            {hand.costDisplay}
                            {hand.costNote ? <CellNote>{hand.costNote}</CellNote> : null}
                          </>
                        ) : (
                          <NotDisclosed />
                        )}
                      </td>
                      <td className={cx(CELL, 'text-xs leading-snug text-text-dim')}>
                        {TRAINING_BET_LABEL[hand.bet]}
                      </td>
                      <td className={cx(CELL, 'text-xs')}>
                        <span className="block">
                          <SourceLink id={hand.sourceId} label={hand.sourceLabel} />
                        </span>
                        {hand.secondarySourceId && hand.secondarySourceLabel ? (
                          <span className="block">
                            <SourceLink
                              id={hand.secondarySourceId}
                              label={hand.secondarySourceLabel}
                            />
                          </span>
                        ) : null}
                        <span className="mt-0.5 block whitespace-nowrap text-text-dim">
                          {hand.asOf}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        </FigureStage>
      }
      caption="Two rows list a tactile threshold, two list a cost, and no row lists both."
    />
  );
}
