'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { cx } from '@/lib/utils';

export type Column<T> = {
  /** Key into the row record. */
  key: Extract<keyof T, string>;
  header: string;
  sortable?: boolean;
  /** Right-aligns the column and renders values in tabular mono. */
  numeric?: boolean;
  /** Custom cell renderer. Defaults to the raw value formatted as text. */
  render?: (row: T) => ReactNode;
  /** Custom sort accessor. Defaults to the raw value. */
  sortValue?: (row: T) => string | number | null;
};

type TableProps<T> = {
  /** Visible caption; also the accessible name of the table. */
  caption: string;
  columns: Column<T>[];
  rows: T[];
  initialSort?: { key: Extract<keyof T, string>; direction: 'asc' | 'desc' };
  className?: string;
  /** Stable row id used as the destination anchor (`method-act`, `dataset-droid`). */
  rowAnchor?: (row: T) => string;
  /** Currently highlighted destination row, if any. */
  highlightedAnchor?: string | null;
};

type SortState = { key: string; direction: 'asc' | 'desc' };

function formatValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') {
    // The wiki-wide default for a missing cell: the value exists but its
    // owner has not published it. A column whose empty cells mean "not
    // applicable" instead (a live readout before the first solve, a
    // genuinely inapplicable field) must pass an explicit render with its
    // own placeholder — see PolicyChunkingTable's deliberately mixed
    // column for the worked example.
    return <span className="text-text-dim">not disclosed</span>;
  }
  // No locale grouping by default: it mangles years (2023 -> 2,023).
  // Callers that want grouping pass a custom render.
  return String(value);
}

/**
 * Dense, sortable data table. Sortable column headers are real buttons with
 * aria-sort on the column header, so the table is fully keyboard operable.
 * The wrapper scrolls horizontally on narrow viewports instead of breaking
 * the page layout.
 */
export function Table<T extends Record<string, unknown>>({
  caption,
  columns,
  rows,
  initialSort,
  className,
  rowAnchor,
  highlightedAnchor,
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);
  const captionId = useId();

  useEffect(() => {
    if (!highlightedAnchor) return;
    const target = document.getElementById(highlightedAnchor);
    if (!target || typeof target.scrollIntoView !== 'function') return;
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [highlightedAnchor]);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return rows;
    const accessor =
      column.sortValue ??
      ((row: T) => row[column.key] as string | number | null);
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av === null || av === undefined) {
        return bv === null || bv === undefined ? 0 : 1;
      }
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * factor;
      }
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [rows, columns, sort]);

  function toggleSort(key: string) {
    setSort((current) => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
  }

  return (
    <div
      // The overflow-x-auto wrapper is a scrollable region on narrow
      // viewports and needs keyboard access (axe scrollable-region-focusable);
      // same convention as the bespoke MDX tables and .katex-display.
      // Because it is focusable it must also be named: without the region
      // role and the caption reference a keyboard or screen-reader user
      // lands on an anonymous scrollable box (VAL-B2-COMP-009).
      tabIndex={0}
      role="region"
      aria-labelledby={captionId}
      data-brand-surface-id="surface:flat"
      data-brand-frame-depth="1"
      data-brand-frame-interior-registered="table"
      className={cx(
        'overflow-x-auto rounded-sm border border-border',
        className,
      )}
    >
      <table className="w-full border-collapse text-sm">
        <caption
          id={captionId}
          className="border-b border-border bg-surface-2 px-3 py-2 text-left font-sans text-xs text-text-dim"
        >
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-border bg-surface-2">
            {columns.map((column) => {
              const isSorted = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    isSorted
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className={cx(
                    'px-3 py-2 font-sans text-xs font-medium text-text-dim',
                    column.numeric ? 'text-right' : 'text-left',
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      aria-label={`Sort by ${column.header}`}
                      data-brand-control-id="control:secondary-action"
                      className="inline-flex cursor-pointer items-center gap-1 hover:text-text"
                    >
                      {column.header}
                      <span aria-hidden="true" className="font-mono text-[10px]">
                        {isSorted ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rowIndex) => {
            const anchor = rowAnchor?.(row);
            const highlighted = Boolean(
              anchor && highlightedAnchor && anchor === highlightedAnchor,
            );
            return (
            <tr
              key={anchor ?? rowIndex}
              id={anchor}
              data-entity-id={anchor}
              className={cx(
                'scroll-mt-24 border-t border-border bg-surface',
                // Flat functional 2px left rule (a real border, not an
                // inset box-shadow): selected-row chrome must be shadow-
                // free per VAL-DSSURFACE-022, and the quiet surface
                // change keeps the state legible without colour alone.
                highlighted && 'border-l-2 border-l-accent bg-surface-2',
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cx(
                    'px-3 py-2 text-text',
                    column.numeric && 'text-right font-mono tabular-nums',
                  )}
                >
                  {column.render
                    ? column.render(row)
                    : formatValue(row[column.key])}
                </td>
              ))}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
