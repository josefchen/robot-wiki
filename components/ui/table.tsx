'use client';

import { useMemo, useState, type ReactNode } from 'react';
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
};

type SortState = { key: string; direction: 'asc' | 'desc' };

function formatValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-text-dim">n/a</span>;
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
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);

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
      className={cx(
        'overflow-x-auto rounded-md border border-border',
        className,
      )}
    >
      <table className="w-full border-collapse text-sm">
        <caption className="border-b border-border bg-surface-2 px-3 py-2 text-left font-sans text-xs text-text-dim">
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
          {sortedRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-border bg-surface">
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
