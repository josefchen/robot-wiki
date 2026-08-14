'use client';

import { useMemo, useState } from 'react';
import { getCitation } from '@/data/citations';
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
 * horizontal scroll inside its own container at 375px. Column headers are
 * mono and dim but deliberately NOT uppercase: the page's uppercase
 * micro-label budget (VAL-DESIGN-010) is spent on the prose Stat grid.
 */

const HEADER_CELL =
  'px-2 py-2.5 text-left font-mono text-[11px] font-medium tracking-[0.14em] text-text-dim';

const CELL = 'px-2 py-2.5 align-top';

/** Small-print second line under a spec figure, e.g. a unit conversion. */
function CellNote({ children }: { children: string }) {
  return (
    <span className="mt-0.5 block font-sans text-[11px] text-text-dim">
      {children}
    </span>
  );
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
  const citation = getCitation(id);
  if (!citation) {
    return <span className="text-text-dim">{label}</span>;
  }
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener"
      className="text-text-dim underline decoration-border underline-offset-2 transition-colors hover:text-text"
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
    <div
      data-testid="hand-comparison"
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <p
          data-testid="hand-comparison-readout"
          aria-live="polite"
          className="font-mono text-xs text-text-dim"
        >
          {readout}
        </p>
        <button
          data-pagefind-ignore
          type="button"
          onClick={reset}
          className="ml-auto rounded-sm bg-surface-2 px-3 py-1.5 font-mono text-xs text-text-dim transition-colors hover:text-text active:translate-y-[1px]"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
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
                      type="button"
                      aria-label={column.ariaLabel}
                      onClick={() => handleSort(column.key)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-text"
                    >
                      {column.label}
                      <span
                        aria-hidden="true"
                        className={cx(
                          'text-[9px]',
                          active ? 'text-accent' : 'text-text-dim/50',
                        )}
                      >
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
                  className={cx(
                    'border-b border-border transition-colors last:border-b-0',
                    isSelected && 'bg-surface-2/60',
                  )}
                >
                  <th scope="row" className={cx(CELL, 'min-w-[140px]')}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`Select ${hand.name} for comparison`}
                      onClick={() => toggleSelect(hand.id)}
                      className={cx(
                        'text-left font-mono text-xs font-medium transition-colors',
                        isSelected ? 'text-accent' : 'text-text hover:text-accent',
                      )}
                    >
                      {hand.name}
                    </button>
                    <p className="mt-1 max-w-[24ch] font-sans text-[11px] leading-snug text-text-dim">
                      {hand.maker} · {hand.actuation}
                    </p>
                  </th>
                  <td
                    className={cx(
                      CELL,
                      'whitespace-nowrap font-mono text-sm text-text',
                    )}
                  >
                    {hand.dofDisplay}
                  </td>
                  <td className={cx(CELL, 'whitespace-nowrap font-mono text-sm')}>
                    {hand.tactileDisplay ? (
                      <>
                        <span className="text-accent">{hand.tactileDisplay}</span>
                        {hand.tactileNote ? (
                          <CellNote>{hand.tactileNote}</CellNote>
                        ) : null}
                      </>
                    ) : (
                      <span className="font-sans text-xs text-text-dim">
                        not disclosed
                      </span>
                    )}
                  </td>
                  <td className={cx(CELL, 'whitespace-nowrap font-mono text-sm')}>
                    {hand.costDisplay ? (
                      <>
                        <span className="text-text">{hand.costDisplay}</span>
                        {hand.costNote ? (
                          <CellNote>{hand.costNote}</CellNote>
                        ) : null}
                      </>
                    ) : (
                      <span className="font-sans text-xs text-text-dim">
                        not disclosed
                      </span>
                    )}
                  </td>
                  <td className={cx(CELL, 'font-sans text-[11px] text-text-dim')}>
                    {TRAINING_BET_LABEL[hand.bet]}
                  </td>
                  <td className={cx(CELL, 'font-mono text-[11px]')}>
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
      </div>

      <div
        data-testid="hand-comparison-selection"
        className="mt-4 border-t border-border pt-3"
      >
        {selected.length === 0 ? (
          <p className="font-sans text-xs text-text-dim">
            Select hands to compare their trade-offs.
          </p>
        ) : (
          <ul className="space-y-2">
            {selected.map((hand) => (
              <li
                key={hand.id}
                className="font-sans text-xs leading-relaxed text-text-dim"
              >
                <span className="font-mono font-medium text-text">
                  {hand.name}.
                </span>{' '}
                {hand.tradeoff}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
