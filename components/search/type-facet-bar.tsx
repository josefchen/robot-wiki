'use client';

import { cx } from '@/lib/utils';
import type { EntityType } from '@/lib/structured-search';

const OPTIONS: Array<{ type: EntityType | 'all'; label: string }> = [
  { type: 'all', label: 'All types' },
  { type: 'company', label: 'Companies' },
  { type: 'method', label: 'Methods' },
  { type: 'dataset', label: 'Datasets' },
];

type TypeFacetBarProps = {
  value: EntityType | 'all';
  onChange: (value: EntityType | 'all') => void;
};

/**
 * Entity-type facets for the structured search group. Hairline buttons in
 * open space: they are not nested inside a bordered container (VAL-DESIGN-019).
 */
export function TypeFacetBar({ value, onChange }: TypeFacetBarProps) {
  return (
    <div
      role="group"
      aria-label="Filter by type"
      className="mb-4 flex flex-wrap gap-1.5"
    >
      {OPTIONS.map((option) => {
        const active = value === option.type;
        return (
          <button
            key={option.type}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.type)}
            className={cx(
              'cursor-pointer rounded-sm border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]',
              active
                ? 'border-accent text-text'
                : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
