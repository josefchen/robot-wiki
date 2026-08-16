'use client';

import type { Company } from '@/data/schemas/company.ts';
import { Badge } from '@/components/ui';
import {
  companyStatusLabel,
  formatApproach,
  formatShortDate,
  formatUsd,
  unknownFigure,
} from '@/lib/market-map';
import { cx } from '@/lib/utils';

const CONFIDENCE_VARIANT = {
  high: 'ok',
  medium: 'warn',
  low: 'err',
} as const;

function Money({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-text-dim">{unknownFigure()}</span>;
  }
  return <span className="font-mono tabular-nums">{formatUsd(value)}</span>;
}

type CompanyCardProps = {
  company: Company;
  expanded: boolean;
  onToggle: () => void;
  highlighted?: boolean;
};

export function CompanyCard({
  company,
  expanded,
  onToggle,
  highlighted = false,
}: CompanyCardProps) {
  const round = company.latestRound;
  const asOf = company.sources[0]?.asOf ?? null;
  const headingId = `company-${company.id}`;

  return (
    <article
      id={headingId}
      data-company-id={company.id}
      aria-labelledby={`${headingId}-name`}
      className={cx(
        'scroll-mt-24 border-t border-border py-4',
        highlighted &&
          'bg-surface-2 shadow-[inset_2px_0_0_0_var(--color-accent)]',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3
          id={`${headingId}-name`}
          className="font-sans text-base font-medium text-text"
        >
          {company.name}
        </h3>
        <Badge variant={CONFIDENCE_VARIANT[company.confidence]}>
          {company.confidence}
        </Badge>
      </div>

      <p className="mt-1 text-sm leading-relaxed text-text-dim">
        {company.description}
      </p>

      {company.approach.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Approach tags">
          {company.approach.map((tag) => (
            <li
              key={tag}
              className="rounded-xs bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-text-dim"
            >
              {formatApproach(tag)}
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-text-dim">Status</dt>
        <dd data-field="status">{companyStatusLabel(company)}</dd>
        <dt className="text-text-dim">Latest round</dt>
        <dd data-field="round-type">
          {round?.type ?? (
            <span className="text-text-dim">{unknownFigure()}</span>
          )}
        </dd>
        <dt className="text-text-dim">Amount</dt>
        <dd data-field="amount">
          <Money value={round?.amountUsd ?? null} />
        </dd>
        <dt className="text-text-dim">Date</dt>
        <dd data-field="date">
          {round?.date ? (
            formatShortDate(round.date)
          ) : (
            <span className="text-text-dim">{unknownFigure()}</span>
          )}
        </dd>
        <dt className="text-text-dim">Valuation</dt>
        <dd data-field="valuation">
          <Money value={round?.valuationUsd ?? null} />
        </dd>
        {asOf ? (
          <>
            <dt className="text-text-dim">As of</dt>
            <dd data-field="as-of">{formatShortDate(asOf)}</dd>
          </>
        ) : null}
      </dl>

      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1" aria-label="Sources">
        {company.sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener"
              className="text-sm text-text underline decoration-border underline-offset-2 transition-colors hover:decoration-accent"
            >
              {source.title}
            </a>
          </li>
        ))}
      </ul>

      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${headingId}-detail`}
        onClick={onToggle}
        className="mt-3 cursor-pointer font-mono text-xs text-text-dim transition-colors hover:text-text active:translate-y-[1px]"
      >
        {expanded ? 'Collapse' : 'Expand'}
      </button>

      {expanded ? (
        <div
          id={`${headingId}-detail`}
          className="mt-3 border-t border-border pt-3"
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-text-dim">Also known as</dt>
            <dd data-field="aka">
              {company.aka.length > 0 ? (
                company.aka.join(', ')
              ) : (
                <span className="text-text-dim">n/a</span>
              )}
            </dd>
            <dt className="text-text-dim">Headquarters</dt>
            <dd data-field="hq">
              {[company.hq.city, company.hq.country].filter(Boolean).join(', ')}
            </dd>
            <dt className="text-text-dim">Founded</dt>
            <dd data-field="founded">
              {company.founded ?? (
                <span className="text-text-dim">{unknownFigure()}</span>
              )}
            </dd>
            <dt className="text-text-dim">Total raised</dt>
            <dd data-field="total-raised">
              <Money value={company.totalRaisedUsd} />
            </dd>
            <dt className="text-text-dim">Lead investors</dt>
            <dd data-field="leads">
              {round && round.leadInvestors.length > 0 ? (
                round.leadInvestors.join(', ')
              ) : (
                <span className="text-text-dim">{unknownFigure()}</span>
              )}
            </dd>
            <dt className="text-text-dim">Deployments</dt>
            <dd data-field="deployments">
              {company.deployments.length > 0 ? (
                company.deployments.join(', ')
              ) : (
                <span className="text-text-dim">n/a</span>
              )}
            </dd>
            <dt className="text-text-dim">Open source</dt>
            <dd data-field="open-source">
              {company.openSource.length > 0 ? (
                company.openSource.join(', ')
              ) : (
                <span className="text-text-dim">n/a</span>
              )}
            </dd>
          </dl>
        </div>
      ) : null}
    </article>
  );
}

export function CompanyCardList({
  companies,
  expandedId,
  onToggle,
  highlightedId,
  className,
}: {
  companies: readonly Company[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  highlightedId?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      {companies.map((company) => (
        <CompanyCard
          key={company.id}
          company={company}
          expanded={expandedId === company.id}
          highlighted={highlightedId === company.id}
          onToggle={() => onToggle(company.id)}
        />
      ))}
    </div>
  );
}
