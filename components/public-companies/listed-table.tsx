'use client';

import { Fragment, useRef, useState, type ReactNode } from 'react';
import type { ExposureClass } from '@/data/schemas/public-company';
import { StaticTable, type ColumnHead } from './cells';

export interface ListedEntry {
  id: string;
  name: string;
  exposure: ExposureClass;
  segment: string;
  country: string;
  usd: number;
  row: ReactNode;
}

const groups: Record<ExposureClass, number> = { 'pure play': 0, 'major part': 1, 'minor part': 2 };
const sorts = {
  exposure: 'Pure plays first',
  largest: 'Market value, largest first',
  smallest: 'Market value, smallest first',
  name: 'Company, A to Z',
} as const;
type Sort = keyof typeof sorts;

function compare(a: ListedEntry, b: ListedEntry, order: Sort): number {
  const name = a.name.localeCompare(b.name);
  if (order === 'name') return name;
  if (order === 'smallest') return a.usd - b.usd || name;
  const byValue = b.usd - a.usd || name;
  return order === 'exposure' ? groups[a.exposure] - groups[b.exposure] || byValue : byValue;
}

export function ListedTable({ entries, columns, caption }: {
  entries: ListedEntry[];
  columns: readonly ColumnHead[];
  caption: string;
}) {
  const [filters, setFilters] = useState({ exposure: '', segment: '', country: '' });
  const [order, setOrder] = useState<Sort>('exposure');
  const exposureControl = useRef<HTMLSelectElement>(null);
  const fields = [
    { key: 'exposure', label: 'Exposure', all: 'All exposures', options: Object.keys(groups) },
    { key: 'segment', label: 'Segment', all: 'All segments', options: [...new Set(entries.map((entry) => entry.segment))].sort() },
    { key: 'country', label: 'Country', all: 'All countries', options: [...new Set(entries.map((entry) => entry.country))].sort() },
  ] as const;
  const visible = entries.filter((entry) => fields.every(({ key }) => !filters[key] || entry[key] === filters[key]))
    .sort((a, b) => compare(a, b, order));
  const selectStyle = 'h-10 w-full min-w-0 cursor-pointer border-b border-text-dim bg-transparent pr-1 text-[15px] text-text';
  function clear() {
    setFilters({ exposure: '', segment: '', country: '' });
    exposureControl.current?.focus();
  }

  return (
    <>
      <div role="group" aria-label="Listed company filters and order" data-ui="" className="mb-3 grid max-w-[64rem] grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {fields.map(({ key, label, all, options }) => (
          <label key={key} className="min-w-0 text-[14px] leading-5 text-text-dim">
            {label}
            <select
              ref={key === 'exposure' ? exposureControl : undefined}
              value={filters[key]}
              className={selectStyle}
              onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
            >
              <option value="">{all}</option>
              {options.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        ))}
        <label className="min-w-0 text-[14px] leading-5 text-text-dim">
          Sort by
          <select className={selectStyle} value={order} onChange={(event) => setOrder(event.target.value as Sort)}>
            {Object.entries(sorts).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="mb-4 flex min-h-7 items-center gap-5 text-[14px] leading-5">
        <p role="status" aria-live="polite" className="text-text-dim">
          {visible.length} of {entries.length} companies
        </p>
        {fields.some(({ key }) => filters[key]) && (
          <button type="button" onClick={clear} className="ink-link cursor-pointer">Clear filters</button>
        )}
      </div>
      <StaticTable captionId="listed-companies-caption" caption={caption} columns={columns} minWidth="min-w-[76rem]">
        {visible.length ? visible.map((entry) => <Fragment key={entry.id}>{entry.row}</Fragment>) : (
          <tr><td colSpan={columns.length} className="py-5 text-text">No companies match these filters.</td></tr>
        )}
      </StaticTable>
    </>
  );
}
