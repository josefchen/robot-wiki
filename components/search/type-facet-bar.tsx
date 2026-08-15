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
  /**
   * True while a new query is resolving. The rows below still belong to
   * the previous query until the new results replace them atomically, so
   * the facets are dimmed and inert rather than clickable over stale
   * results. Deliberately not a spinner: the status line already says
   * the search is running.
   */
  pending?: boolean;
};

/**
 * Entity-type facets for the structured search group. Hairline buttons in
 * open space: they are not nested inside a bordered container (VAL-DESIGN-019).
 */
export function TypeFacetBar({
  value,
  onChange,
  pending = false,
}: TypeFacetBarProps) {
  return (
    <div
      role="group"
      aria-label="Filter by type"
      data-facet-pending={pending ? 'true' : undefined}
      className={cx(
        'mb-4 flex flex-wrap gap-1.5',
        pending ? 'opacity-60' : undefined,
      )}
    >
      {OPTIONS.map((option) => {
        const active = value === option.type;
        return (
          <button
            key={option.type}
            type="button"
            aria-pressed={active}
            disabled={pending}
            onClick={() => onChange(option.type)}
            className={cx(
              'rounded-sm border px-2.5 py-1.5 font-mono text-xs',
              pending
                ? 'cursor-not-allowed border-border bg-surface-2 text-text-dim'
                : cx(
                    'cursor-pointer transition-colors active:translate-y-[1px]',
                    active
                      ? 'border-accent text-text'
                      : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
                  ),
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
