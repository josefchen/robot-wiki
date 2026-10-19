'use client';

import type { ReactNode } from 'react';
import type { Company } from '@/data/schemas/company.ts';
import {
  SEGMENT_LABELS,
  companyStatusLabel,
  formatApproach,
  formatShortDate,
  formatSubSegment,
  formatUsd,
  roundSource,
  unknownFigure,
} from '@/lib/market-map';
import { withheldMark } from '@/lib/market-map-marks';
import { CompanyLogo } from './company-logo';

function Missing({ children }: { children: ReactNode }) {
  return <span className="text-text-dim">{children}</span>;
}

/**
 * A money figure. An unknown figure reads as undisclosed (it exists but no
 * fetched source states it), never as zero; the inapplicable state is kept
 * for lists a company simply does not have.
 */
function Money({ value }: { value: number | null }) {
  if (value === null) return <Missing>{unknownFigure()}</Missing>;
  return <span className="tabular-nums">{formatUsd(value)}</span>;
}

function Row({ term, field, children }: { term: string; field: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-4 py-[7px]">
      <dt className="text-text-dim">{term}</dt>
      <dd data-field={field} className="min-w-0 text-text">
        {children}
      </dd>
    </div>
  );
}

function List({ items }: { items: readonly string[] }) {
  return items.length > 0 ? <>{items.join(', ')}</> : <Missing>n/a</Missing>;
}

const linkClass =
  'text-text underline decoration-border-strong underline-offset-[3px] transition-colors hover:decoration-ink';

/**
 * Everything the market map knows about one company, with each figure next
 * to the source it rests on. The latest round's figures cite the round's
 * own source (lib/market-map.ts roundSource), dated the day that source was
 * last read; every other source follows with its own date.
 */
export function CompanyDetail({
  company,
  headingId,
  onClose,
}: {
  company: Company;
  headingId: string;
  onClose: () => void;
}) {
  const round = company.latestRound;
  const source = roundSource(company);
  const withheld = withheldMark(company.logo);
  const place = [company.hq.city, company.hq.country].filter(Boolean).join(', ');
  const context = [
    SEGMENT_LABELS[company.segment],
    company.subSegment ? formatSubSegment(company.subSegment) : null,
    place,
  ].filter(Boolean);

  return (
    <article data-company-detail={company.id} aria-labelledby={headingId}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <CompanyLogo company={company} preset="sheet" fallback="none" />
          <h2
            id={headingId}
            tabIndex={-1}
            className="mt-4 font-display text-[26px] leading-[1.08] font-normal tracking-[-0.02em] text-text outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {company.name}
          </h2>
          <p className="mt-2 font-sans text-[13px] leading-5 text-text-dim">
            {context.join(' · ')}
          </p>
        </div>
        <button
          type="button"
          data-brand-control-id="control:secondary-action"
          aria-label={`Close ${company.name} details`}
          onClick={onClose}
          className="-mt-1.5 -mr-1 shrink-0 cursor-pointer px-1 py-1.5 font-sans text-[14px] leading-5 text-text transition-colors hover:text-text-dim focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Close
        </button>
      </div>

      <p className="mt-5 font-sans text-[15px] leading-[1.6] text-text">{company.description}</p>

      <section aria-labelledby={`${headingId}-round`} className="mt-7">
        <h3
          id={`${headingId}-round`}
          className="border-b border-border-strong pb-2 font-display text-[14px] leading-5 font-semibold text-text"
        >
          Latest round
        </h3>
        <dl className="font-sans text-[14px] leading-5">
          <Row term="Status" field="status">
            {companyStatusLabel(company)}
          </Row>
          <Row term="Round" field="round-type">
            {round?.type ?? <Missing>{unknownFigure()}</Missing>}
          </Row>
          <Row term="Amount" field="amount">
            <Money value={round?.amountUsd ?? null} />
          </Row>
          <Row term="Date" field="date">
            {round?.date ? formatShortDate(round.date) : <Missing>{unknownFigure()}</Missing>}
          </Row>
          <Row term="Valuation" field="valuation">
            <Money value={round?.valuationUsd ?? null} />
          </Row>
          <Row term="Lead investors" field="leads">
            {round && round.leadInvestors.length > 0 ? (
              round.leadInvestors.join(', ')
            ) : (
              <Missing>{unknownFigure()}</Missing>
            )}
          </Row>
        </dl>
        {source ? (
          <p
            data-round-source
            className="mt-2 font-sans text-[13px] leading-5 text-text-dim"
          >
            Source:{' '}
            <a
              data-brand-control-id="control:link-focus"
              href={source.url}
              target="_blank"
              rel="noopener"
              className={linkClass}
            >
              {source.title}
            </a>
            , as of <span data-field="as-of">{formatShortDate(source.asOf)}</span>.
          </p>
        ) : null}
      </section>

      <section aria-labelledby={`${headingId}-company`} className="mt-7">
        <h3
          id={`${headingId}-company`}
          className="border-b border-border-strong pb-2 font-display text-[14px] leading-5 font-semibold text-text"
        >
          Company
        </h3>
        <dl className="font-sans text-[14px] leading-5">
          <Row term="Total raised" field="total-raised">
            <Money value={company.totalRaisedUsd} />
          </Row>
          <Row term="Founded" field="founded">
            {company.founded ?? <Missing>{unknownFigure()}</Missing>}
          </Row>
          <Row term="Headquarters" field="hq">
            {place}
          </Row>
          <Row term="Approach" field="approach">
            <List items={company.approach.map(formatApproach)} />
          </Row>
          <Row term="Deployments" field="deployments">
            <List items={company.deployments} />
          </Row>
          <Row term="Open source" field="open-source">
            <List items={company.openSource} />
          </Row>
          <Row term="Also known as" field="aka">
            <List items={company.aka} />
          </Row>
          <Row term="Website" field="website">
            {company.website ? (
              <a
                data-brand-control-id="control:link-focus"
                href={company.website}
                target="_blank"
                rel="noopener"
                className={linkClass}
              >
                {company.website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </a>
            ) : (
              <Missing>n/a</Missing>
            )}
          </Row>
          <Row term="Confidence" field="confidence">
            {company.confidence}
          </Row>
        </dl>
      </section>

      <section aria-labelledby={`${headingId}-sources`} className="mt-7">
        <h3
          id={`${headingId}-sources`}
          className="border-b border-border-strong pb-2 font-display text-[14px] leading-5 font-semibold text-text"
        >
          Sources
        </h3>
        <ol className="font-sans text-[14px] leading-5">
          {company.sources.map((entry) => (
            <li key={entry.url} className="py-[7px]">
              <a
                data-brand-control-id="control:link-focus"
                href={entry.url}
                target="_blank"
                rel="noopener"
                className={linkClass}
              >
                {entry.title}
              </a>
              <span className="mt-0.5 block text-[13px] text-text-dim">
                As of {formatShortDate(entry.asOf)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p data-logo-credit className="mt-6 font-sans text-[13px] leading-5 text-text-dim">
        {withheld ? (
          <>Logo not shown. {withheld.reason}</>
        ) : company.logo ? (
          <>
            Logo: official company mark,{' '}
            <a
              data-brand-control-id="control:link-focus"
              href={`/credits/#${company.logo}`}
              className={linkClass}
            >
              source and licence
            </a>
            .
          </>
        ) : null}
      </p>
    </article>
  );
}
