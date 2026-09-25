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
 * A selected facet is lime with ink text plus a check marker and
 * `aria-pressed`, so selection never rides on colour alone
 * (VAL-B2-DISC-003). The same lime/ink/marker treatment the tabs and chips
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
        'mb-4 flex flex-wrap gap-1.5',
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
              'inline-flex items-center gap-1 rounded-sm border px-2.5 py-1.5 font-mono text-xs',
              pending
                ? 'cursor-not-allowed border-border bg-surface-2 text-text-dim'
                : cx(
                    'cursor-pointer transition-colors active:translate-y-[1px]',
                    active
                      ? 'border-highlight bg-selection font-semibold text-ink'
                      : 'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text',
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
