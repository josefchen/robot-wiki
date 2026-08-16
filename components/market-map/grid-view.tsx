'use client';

import type { Company } from '@/data/schemas/company.ts';
import { SEGMENT_LABELS, SEGMENT_ORDER } from '@/lib/market-map';
import { CompanyCardList } from './company-card';

type GridViewProps = {
  companies: readonly Company[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  highlightedId?: string | null;
};

export function GridView({
  companies,
  expandedId,
  onToggle,
  highlightedId,
}: GridViewProps) {
  return (
    <div className="mt-6 space-y-10">
      {SEGMENT_ORDER.map((segment) => {
        const group = companies.filter(
          (company) => company.segment === segment,
        );
        if (group.length === 0) return null;
        return (
          <section
            key={segment}
            aria-labelledby={`segment-${segment}`}
            data-segment={segment}
          >
            <h2
              id={`segment-${segment}`}
              className="font-sans text-lg font-semibold tracking-tight text-text"
            >
              {SEGMENT_LABELS[segment]}
              <span className="ml-2 font-mono text-sm font-normal text-text-dim">
                {group.length}
              </span>
            </h2>
            <CompanyCardList
              companies={group}
              expandedId={expandedId}
              highlightedId={highlightedId}
              onToggle={onToggle}
              className="mt-2"
            />
          </section>
        );
      })}
    </div>
  );
}
