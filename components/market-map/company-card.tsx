'use client';

import type { ReactNode } from 'react';
import type { AbsentField, Company } from '@/data/schemas/company.ts';
import {
  SEGMENT_LABELS,
  absentState,
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

/**
 * An empty field, printed as the disposition the registry records for it
 * (Company.absent), never as zero or a blank. The literal stays in this file
 * because the value-state census measures the card as a render site.
 */
function Absent({ company, field }: { company: Company; field: AbsentField }) {
  return (
    <span className="text-text-dim">
      {absentState(company, field) === 'not-applicable' ? 'n/a' : unknownFigure()}
    </span>
  );
}

function Money({
  company,
  field,
  value,
}: {
  company: Company;
  field: AbsentField;
  value: number | null;
}) {
  if (value === null) return <Absent company={company} field={field} />;
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

function List({
  company,
  field,
  items,
}: {
  company: Company;
  field: AbsentField;
  items: readonly string[];
}) {
  return items.length > 0 ? <>{items.join(', ')}</> : <Absent company={company} field={field} />;
}

const linkClass =
  'text-text underline decoration-border-strong underline-offset-[3px] transition-colors hover:decoration-ink';

/**
 * Where a page sits in the company's numbered Sources list (1-based), or 0.
 * Pages are compared as the browser resolves them, so a homepage written
 * without its trailing slash is still the listed page.
 */
function sourceNumber(company: Company, url: string): number {
  const page = new URL(url).href;
  return company.sources.findIndex((entry) => new URL(entry.url).href === page) + 1;
}

function websiteLabel(url: string): string {
  return url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '');
}

/** A listed source named in plain text by its title and number. */
function SourceName({ company, url }: { company: Company; url: string }) {
  const number = sourceNumber(company, url);
  return (
    <>
      {company.sources[number - 1]?.title ?? url}, source {number} below
    </>
  );
}

/**
 * Everything the market map knows about one company, with each figure next
 * to the source it rests on. Each source is linked once, in the numbered
 * Sources list, with the date it was last read. The latest round's figures
 * name the round's own source (lib/market-map.ts roundSource) and its date,
 * and a round caveat or a homepage that is also a listed source names it by
 * number in plain text. They do not link to it again, and they do not jump
 * to it with an in-page anchor, since the URL hash holds the sheet open.
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
  const websiteSource = company.website ? sourceNumber(company, company.website) : 0;
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
            {round?.type ?? <Absent company={company} field="round.type" />}
          </Row>
          <Row term="Amount" field="amount">
            <Money company={company} field="round.amountUsd" value={round?.amountUsd ?? null} />
          </Row>
          <Row term="Date" field="date">
            {round?.date ? (
              formatShortDate(round.date)
            ) : (
              <Absent company={company} field="round.date" />
            )}
          </Row>
          <Row term="Valuation" field="valuation">
            <Money
              company={company}
              field="round.valuationUsd"
              value={round?.valuationUsd ?? null}
            />
          </Row>
          <Row term="Lead investors" field="leads">
            <List
              company={company}
              field="round.leadInvestors"
              items={round?.leadInvestors ?? []}
            />
          </Row>
        </dl>
        {source ? (
          <p
            data-round-source
            className="mt-2 font-sans text-[13px] leading-5 text-text-dim"
          >
            Source: <SourceName company={company} url={source.url} />, as of{' '}
            <span data-field="as-of">{formatShortDate(source.asOf)}</span>.
          </p>
        ) : null}
        {round?.caveat ? (
          <p
            data-round-caveat
            className="mt-2 font-sans text-[13px] leading-5 text-text-dim"
          >
            <span className="font-medium text-text">Caveat:</span> {round.caveat.text}{' '}
            {round.caveat.sourceUrls.length > 1 ? 'Sources: ' : 'Source: '}
            {round.caveat.sourceUrls.map((url, index) => (
              <span key={url}>
                {index > 0 ? '; ' : ''}
                <SourceName company={company} url={url} />
              </span>
            ))}
            .
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
            <Money company={company} field="totalRaisedUsd" value={company.totalRaisedUsd} />
          </Row>
          <Row term="Founded" field="founded">
            {company.founded ?? <Absent company={company} field="founded" />}
          </Row>
          <Row term="Headquarters" field="hq">
            {company.hq.city === null ? (
              <>
                {company.hq.country}, city <Absent company={company} field="hq.city" />
              </>
            ) : (
              place
            )}
          </Row>
          <Row term="Approach" field="approach">
            {company.approach.map(formatApproach).join(', ')}
          </Row>
          <Row term="Deployments" field="deployments">
            <List company={company} field="deployments" items={company.deployments} />
          </Row>
          <Row term="Open source" field="open-source">
            <List company={company} field="openSource" items={company.openSource} />
          </Row>
          <Row term="Also known as" field="aka">
            <List company={company} field="aka" items={company.aka} />
          </Row>
          <Row term="Website" field="website">
            {company.website && websiteSource > 0 ? (
              <>
                {websiteLabel(company.website)}, source {websiteSource} below
              </>
            ) : company.website ? (
              <a
                data-brand-control-id="control:link-focus"
                href={company.website}
                target="_blank"
                rel="noopener"
                className={linkClass}
              >
                {websiteLabel(company.website)}
              </a>
            ) : (
              <Absent company={company} field="website" />
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
          {company.sources.map((entry, index) => (
            <li key={entry.url} className="grid grid-cols-[1.5rem_minmax(0,1fr)] py-[7px]">
              <span data-source-number className="font-mono text-[13px] tabular-nums text-text-dim">
                {index + 1}
              </span>
              <span className="min-w-0">
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
