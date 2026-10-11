'use client';

import { Check } from '@phosphor-icons/react';
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
 * open space: they are not nested inside a bordered container.
 *
 * A selected facet is ink on a 1px ink rule plus a check marker and
 * `aria-pressed`, so selection never rides on colour alone
 * (VAL-B2-DISC-003). The same ink/rule/marker treatment the tabs and chips
 * primitives use, because a facet is a selection control, not a link.
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
        'mb-4 flex flex-wrap gap-x-5 gap-y-1 border-b border-border',
        pending ? 'opacity-60' : undefined,
      )}
    >
      {OPTIONS.map((option) => {
        const active = value === option.type;
        return (
          <button
            data-brand-control-id="control:selection"
            data-facet-option={option.type}
            key={option.type}
            type="button"
            aria-pressed={active}
            disabled={pending}
            onClick={() => onChange(option.type)}
            className={cx(
              // Text tabs: the pressed one in ink on a 1px ink underline,
              // the rest muted. No boxes, no fills.
              '-mb-px inline-flex items-center gap-1 border-b py-2 font-sans text-[14px]',
              pending
                ? 'cursor-not-allowed border-transparent text-text-dim'
                : cx(
                    'cursor-pointer transition-colors',
                    active
                      ? 'border-ink font-medium text-ink'
                      : 'border-transparent text-text-dim hover:text-text',
                  ),
            )}
          >
            {/* The non-colour half of the selected state: the marker is
                present exactly when the facet is pressed, so the check and
                the ARIA state can never disagree. */}
            {active ? (
              <Check
                aria-hidden="true"
                data-facet-check
                size={12}
                weight="bold"
              />
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
