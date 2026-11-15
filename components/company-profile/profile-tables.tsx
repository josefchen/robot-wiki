import type { ReactNode } from 'react';
import { SourceTypeMark } from '@/components/now/source-mark';
import type { CompanyProfile, Product, TimelineRow } from '@/data/schemas/company-profile';
import {
  NOT_APPLICABLE,
  formatCny,
  formatDof,
  formatProductPrice,
  formatQuantity,
  productLaunch,
} from '@/lib/company-profile';
import {
  absentWithNoun,
  formatCount,
  formatStoredPct,
  LINES_COMPUTED_NOTE,
  groupLines,
  holderName,
  holdersInFilingOrder,
  lineYearRows,
  listingComputedNote,
  listingFacts,
  REGION_COLUMNS,
  regionYearRows,
  resultsComputedNote,
  resultsRows,
  timelineKindLabel,
  type LineYearRow,
  type ResultsRow,
} from '@/lib/company-profile-page';
import { cx } from '@/lib/utils';
import {
  DIM,
  FIGURE,
  HEAD,
  HEAD_NUM,
  NUM,
  Note,
  ProfileDate,
  ProfileTable,
  ROW,
  Reply,
  Source,
  SpecSource,
} from './profile-parts';

// ── Products ──────────────────────────────────────────────────────────────

function launchText(profile: CompanyProfile, product: Product) {
  const launch = productLaunch(profile, product);
  return launch === 'not disclosed' ? (
    <span className="text-text-dim">{absentWithNoun('not disclosed', 'launch')}</span>
  ) : (
    <ProfileDate value={launch} />
  );
}

function price(product: Product) {
  return product.priceUsd !== null ? (
    <span className={FIGURE}>{formatProductPrice(product)}</span>
  ) : (
    <span className="text-text-dim">
      {product.priceAbsent === 'contact sales' ? 'contact sales' : absentWithNoun('not disclosed', 'price')}
    </span>
  );
}

function mass(product: Product) {
  return product.mass === 'not disclosed' ? (
    <span className="text-text-dim">{absentWithNoun('not disclosed', 'mass')}</span>
  ) : (
    <span className={FIGURE}>{formatQuantity(product.mass)}</span>
  );
}

function dof(product: Product, withNoun: boolean) {
  if (typeof product.dof === 'string') {
    return <span className="text-text-dim">{absentWithNoun(product.dof, 'DoF')}</span>;
  }
  return (
    <>
      <span className={FIGURE}>
        {formatDof(product.dof)}
        {withNoun ? ' DoF' : ''}
      </span>
      {product.dofBasis ? <span className="text-text-dim">, {product.dofBasis}</span> : null}
    </>
  );
}

function payload(product: Product, withNoun: boolean) {
  if (typeof product.payload === 'string') {
    return <span className="text-text-dim">{absentWithNoun(product.payload, 'payload')}</span>;
  }
  return (
    <>
      {withNoun ? <span className="text-text-dim">payload </span> : null}
      <span className={FIGURE}>{formatQuantity(product.payload)}</span>
      {product.payloadBasis ? <span className="text-text-dim">, {product.payloadBasis}</span> : null}
    </>
  );
}

function ProductSources({ product }: { product: Product }) {
  return (
    <>
      <Source source={product} className="block" />
      {product.specSourceUrl && product.specSourceTitle ? (
        <SpecSource url={product.specSourceUrl} title={product.specSourceTitle} pageRef={product.specPageRef} />
      ) : null}
    </>
  );
}

/**
 * Every product, one per row, in the maker's own grouping. From lg up each
 * field has its column; below it the specification stacks under the price
 * and the launch, notes and sources under the name, so a phone reads two
 * columns without scrolling sideways.
 */
export function ProductsTable({ profile, labelledBy }: { profile: CompanyProfile; labelledBy: string }) {
  const wide = 'hidden lg:table-cell';
  const narrow = 'lg:hidden';
  return (
    <ProfileTable labelledBy={labelledBy}>
      <thead>
        <tr>
          <th scope="col" className={cx(HEAD, 'lg:w-[11rem]')}>Product</th>
          <th scope="col" className={cx(HEAD, wide)}>Launch</th>
          <th scope="col" className={cx(HEAD_NUM, 'max-lg:text-left!')}>
            Price<span className={narrow}> and specification</span>
          </th>
          <th scope="col" className={cx(HEAD, wide)}>Mass</th>
          <th scope="col" className={cx(HEAD, wide)}>DoF</th>
          <th scope="col" className={cx(HEAD, wide)}>Payload</th>
          <th scope="col" className={cx(HEAD, wide)}>Notable</th>
          <th scope="col" className={cx(HEAD, wide, 'w-[11rem]')}>Source</th>
        </tr>
      </thead>
      <tbody>
        {profile.products.map((product) => (
          <tr key={product.id} data-profile-row={product.id} className={ROW}>
            <th scope="row" className="text-left font-medium">
              {product.name}
              <span className={cx(DIM, 'block font-normal')}>{product.type}</span>
              <span className={cx(DIM, narrow, 'mt-1 block font-normal')}>
                {productLaunch(profile, product) === 'not disclosed' ? null : 'Launch '}
                {launchText(profile, product)}
              </span>
              {product.notable ? <span className={cx(narrow, 'mt-1 block font-normal')}>{product.notable}</span> : null}
              {product.note ? <Note className={cx(narrow, 'font-normal')}>{product.note}</Note> : null}
              <span className={cx(narrow, 'mt-1 block font-normal')}>
                <ProductSources product={product} />
              </span>
            </th>
            <td className={cx(wide)}>{launchText(profile, product)}</td>
            <td className="lg:whitespace-nowrap lg:text-right">
              {price(product)}
              <span className={cx(narrow, 'mt-1 block text-[13px]')}>{mass(product)}</span>
              <span className={cx(narrow, 'block text-[13px]')}>{dof(product, true)}</span>
              <span className={cx(narrow, 'block text-[13px]')}>{payload(product, true)}</span>
            </td>
            <td className={cx(wide, 'whitespace-nowrap')}>{mass(product)}</td>
            <td className={cx(wide, 'text-[13px]')}>{dof(product, false)}</td>
            <td className={cx(wide, 'text-[13px]')}>{payload(product, false)}</td>
            <td className={wide}>
              {product.notable ?? null}
              {product.note ? <Note className={product.notable ? undefined : 'mt-0'}>{product.note}</Note> : null}
            </td>
            <td className={wide}>
              <ProductSources product={product} />
            </td>
          </tr>
        ))}
      </tbody>
    </ProfileTable>
  );
}

// ── Money ─────────────────────────────────────────────────────────────────

/** A label and its figure on one line, for the phone layout. */
function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex items-baseline justify-between gap-4">
      <span className="text-[13px] text-text-dim">{label}</span>
      <span className="whitespace-nowrap text-right">{children}</span>
    </span>
  );
}

function LineNotes({ row }: { row: LineYearRow }) {
  return (
    <>
      <span className="font-mono tabular-nums">{row.year}</span> {row.line}s
      {row.note ? <Note className="font-normal">{row.note}</Note> : null}
      <span className="mt-1 block font-normal md:hidden">
        <Source source={row.source} />
      </span>
    </>
  );
}

function PeriodNotes({ row }: { row: ResultsRow }) {
  return (
    <>
      {row.period.label}
      <span className={cx(DIM, 'block font-normal')}>{row.period.assurance}</span>
      {row.notes.map((note) => (
        <Note key={note} className="font-normal">
          {note}
        </Note>
      ))}
      <span className="mt-1 block font-normal md:hidden">
        <Source source={row.period} />
      </span>
    </>
  );
}

/** Revenue, profit and margin per stored period, as the filings give them, in CNY millions. */
export function ResultsTable({ profile, labelledBy }: { profile: CompanyProfile; labelledBy: string }) {
  const rows = resultsRows(profile);
  const wide = 'hidden sm:table-cell';
  return (
    <ProfileTable labelledBy={labelledBy} computed={resultsComputedNote(profile)}>
      <thead>
        <tr>
          <th scope="col" className={cx(HEAD, wide)}>Period</th>
          <th scope="col" className={cx(HEAD_NUM, wide)}>Revenue</th>
          <th scope="col" className={cx(HEAD_NUM, wide)}>Net profit</th>
          <th scope="col" className={cx(HEAD_NUM, wide)}>Adjusted net profit</th>
          <th scope="col" className={cx(HEAD_NUM, wide)}>Gross margin</th>
          <th scope="col" className={cx(HEAD, 'sm:hidden')}>Period and figures</th>
          <th scope="col" className={cx(HEAD, 'hidden md:table-cell md:w-[13rem]')}>Source</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const margin = (
            <>
              {row.margin.computed ? (
                <>
                  <SourceTypeMark type="computed" />{' '}
                </>
              ) : null}
              <span className={row.margin.text.endsWith('%') ? FIGURE : 'text-[13px] text-text-dim'}>
                {row.margin.text}
              </span>
            </>
          );
          const basis = row.margin.basis ? <span className="text-[12px] text-text-dim">{row.margin.basis}</span> : null;
          return (
            <tr key={row.period.id} data-profile-row={row.period.id} className={ROW}>
              <th scope="row" className={cx('text-left font-medium', wide)}>
                <PeriodNotes row={row} />
              </th>
              <td className={cx(NUM, wide)}>{row.revenue}</td>
              <td className={cx(NUM, wide)}>{row.netProfit}</td>
              <td className={cx(NUM, wide)}>{row.adjustedNetProfit}</td>
              <td className={cx('whitespace-nowrap text-right', wide)}>
                {margin}
                {basis ? <span className="block">{basis}</span> : null}
              </td>
              <td className="sm:hidden">
                <span className="block font-medium">
                  <PeriodNotes row={row} />
                </span>
                <span className="mt-2 block">
                  <Labelled label="Revenue"><span className={FIGURE}>{row.revenue}</span></Labelled>
                  <Labelled label="Net profit"><span className={FIGURE}>{row.netProfit}</span></Labelled>
                  <Labelled label="Adjusted net profit"><span className={FIGURE}>{row.adjustedNetProfit}</span></Labelled>
                  <Labelled label={row.margin.basis ? `Gross margin ${row.margin.basis}` : 'Gross margin'}>
                    {margin}
                  </Labelled>
                </span>
              </td>
              <td className="hidden md:table-cell">
                <Source source={row.period} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </ProfileTable>
  );
}

/** Units sold and shipped, revenue and the average price per unit sold, per line and year. */
export function LinesTable({ profile, labelledBy }: { profile: CompanyProfile; labelledBy: string }) {
  const rows = lineYearRows(profile);
  const wide = 'hidden sm:table-cell';
  return (
    <ProfileTable labelledBy={labelledBy} computed={LINES_COMPUTED_NOTE}>
      <thead>
        <tr>
          <th scope="col" className={cx(HEAD, wide)}>Year and line</th>
          <th scope="col" className={cx(HEAD_NUM, wide)}>Sold</th>
          <th scope="col" className={cx(HEAD_NUM, wide)}>Shipped</th>
          <th scope="col" className={cx(HEAD_NUM, wide)}>Revenue</th>
          <th scope="col" className={cx(HEAD_NUM, wide)}>Share of main business</th>
          <th scope="col" className={cx(HEAD_NUM, wide)}>Average per unit sold</th>
          <th scope="col" className={cx(HEAD, 'sm:hidden')}>Year, line and figures</th>
          <th scope="col" className={cx(HEAD, 'hidden md:table-cell md:w-[13rem]')}>Source</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const shipped =
            row.shipped === 'not disclosed' ? (
              <span className="text-[13px] text-text-dim">{absentWithNoun('not disclosed', 'shipped')}</span>
            ) : (
              <span className={FIGURE}>{formatCount(row.shipped)}</span>
            );
          const average = (
            <>
              <SourceTypeMark type="computed" /> <span className={FIGURE}>{row.averagePrice}</span>
            </>
          );
          return (
            <tr key={`${row.year}-${row.line}`} data-profile-row={`${row.year}-${row.line}`} className={ROW}>
              <th scope="row" className={cx('text-left font-medium', wide)}>
                <LineNotes row={row} />
              </th>
              <td className={cx(NUM, wide)}>{formatCount(row.sold)}</td>
              <td className={cx('whitespace-nowrap text-right', wide)}>{shipped}</td>
              <td className={cx(NUM, wide)}>{row.revenue}</td>
              <td className={cx(NUM, wide)}>{formatStoredPct(row.sharePct, 'share')}</td>
              <td className={cx('whitespace-nowrap text-right', wide)}>{average}</td>
              <td className="sm:hidden">
                <span className="block font-medium">
                  <LineNotes row={row} />
                </span>
                <span className="mt-2 block">
                  <Labelled label="Sold"><span className={FIGURE}>{formatCount(row.sold)}</span></Labelled>
                  <Labelled label="Shipped">{shipped}</Labelled>
                  <Labelled label="Revenue"><span className={FIGURE}>{row.revenue}</span></Labelled>
                  <Labelled label="Share of main business">
                    <span className={FIGURE}>{formatStoredPct(row.sharePct, 'share')}</span>
                  </Labelled>
                  <Labelled label="Average per unit sold">{average}</Labelled>
                </span>
              </td>
              <td className="hidden md:table-cell">
                <Source source={row.source} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </ProfileTable>
  );
}

/** Domestic and overseas shares of main-business revenue and the United States share, per year. */
export function RegionsTable({ profile, labelledBy }: { profile: CompanyProfile; labelledBy: string }) {
  const rows = regionYearRows(profile);
  const usNotes = [...new Set(profile.marketShares.map((row) => row.note).filter(Boolean))];
  return (
    <>
      <ProfileTable labelledBy={labelledBy} narrow>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>Year</th>
            <th scope="col" className={HEAD_NUM}>{REGION_COLUMNS.domestic}</th>
            <th scope="col" className={HEAD_NUM}>{REGION_COLUMNS.overseas}</th>
            <th scope="col" className={HEAD_NUM}>{REGION_COLUMNS.us}</th>
            <th scope="col" className={cx(HEAD, 'hidden sm:table-cell sm:w-[16rem]')}>Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year} data-profile-row={`regions-${row.year}`} className={ROW}>
              <th scope="row" className="text-left font-mono text-[13px] font-medium tabular-nums">{row.year}</th>
              <td className={NUM}>{formatStoredPct(row.domesticPct, 'share')}</td>
              <td className={NUM}>{formatStoredPct(row.overseasPct, 'share')}</td>
              <td className={NUM}>
                {row.usPct === null ? absentWithNoun('not disclosed', 'share') : formatStoredPct(row.usPct, 'share')}
              </td>
              <td className="hidden sm:table-cell">
                {row.sources.map((source) => (
                  <Source key={`${source.sourceUrl}${source.pageRef}`} source={source} className="block" />
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </ProfileTable>
      {/* On a phone the sources leave the table for one line under it. */}
      <p className={cx(DIM, 'mt-3 sm:hidden')}>
        Sources:{' '}
        {rows[0]?.sources.map((source, index) => (
          <span key={`${source.sourceUrl}${source.pageRef}`}>
            {index > 0 ? '; ' : null}
            <Source source={source} />
          </span>
        ))}
      </p>
      {usNotes.map((note) => (
        <p key={note} className={cx(DIM, 'mt-2 max-w-[44rem]')}>
          United States: {note}
        </p>
      ))}
    </>
  );
}

/** The listing's terms, proceeds, first and latest prices and control, one fact per row. */
export function ListingTable({ profile, labelledBy }: { profile: CompanyProfile; labelledBy: string }) {
  const facts = listingFacts(profile);
  return (
    <ProfileTable
      labelledBy={labelledBy}
      narrow
      reported={facts.some((fact) => fact.source.sourceType === 'reported')}
      computed={facts.some((fact) => fact.computed) ? listingComputedNote(profile) : null}
    >
      <thead>
        <tr>
          <th scope="col" className={HEAD}>Fact</th>
          <th scope="col" className={HEAD}>Value</th>
          <th scope="col" className={cx(HEAD, 'hidden sm:table-cell sm:w-[16rem]')}>Source</th>
        </tr>
      </thead>
      <tbody>
        {facts.map((fact) => (
          <tr key={fact.id} data-profile-row={fact.id} className={ROW}>
            <th scope="row" className="text-left font-normal text-text">
              {fact.label}
              {fact.date ? (
                <>
                  <span className="sr-only">, </span>
                  <ProfileDate value={fact.date} className="block text-text-dim" />
                </>
              ) : null}
              <span className="mt-1 block sm:hidden">
                <Source source={fact.source} />
              </span>
            </th>
            <td>
              {fact.computed ? (
                <>
                  <SourceTypeMark type="computed" />{' '}
                </>
              ) : null}
              <span className={fact.text ? undefined : FIGURE}>{fact.value}</span>
            </td>
            <td className="hidden sm:table-cell">
              {fact.computed ? <span className="text-[13px] text-text-dim">from </span> : null}
              <Source source={fact.source} />
            </td>
          </tr>
        ))}
      </tbody>
    </ProfileTable>
  );
}

/**
 * The holders the profile keeps, in the filing's row order. The holder and
 * the stake after the listing lead; on a phone the stake before and the
 * votes stack under the stake.
 */
export function HoldersTable({ profile, labelledBy }: { profile: CompanyProfile; labelledBy: string }) {
  const holders = holdersInFilingOrder(profile.holders);
  const groups = groupLines(profile.holders);
  const wide = 'hidden sm:table-cell';
  const before = (value: number | 'n/a') =>
    value === NOT_APPLICABLE ? <span className="text-text-dim">none</span> : formatStoredPct(value, 'stake');
  const votes = (value: number | 'not disclosed') =>
    value === 'not disclosed' ? absentWithNoun('not disclosed', 'votes') : formatStoredPct(value, 'votes');
  return (
    <>
      <ProfileTable labelledBy={labelledBy}>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>Holder</th>
            <th scope="col" className={HEAD_NUM}>Stake after</th>
            <th scope="col" className={cx(HEAD_NUM, wide)}>Stake before</th>
            <th scope="col" className={cx(HEAD_NUM, wide)}>Votes after</th>
            <th scope="col" className={cx(HEAD, 'hidden md:table-cell md:w-[13rem]')}>Source</th>
          </tr>
        </thead>
        <tbody>
          {holders.map((holder) => (
            <tr key={holder.id} data-profile-row={holder.id} className={ROW}>
              <th scope="row" className="text-left font-medium">
                {holderName(holder.nameEn)}
                <span className={cx(DIM, 'block font-normal')}>
                  {holder.name}, row <span className="font-mono tabular-nums">{holder.filingRow}</span>
                  {holder.group ? `, ${holder.group}` : null}
                </span>
                {holder.note ? <Note className="font-normal">{holder.note}</Note> : null}
                <span className="mt-1 block font-normal md:hidden">
                  <Source source={holder} />
                </span>
              </th>
              <td className={NUM}>
                {formatStoredPct(holder.stakeAfterPct, 'stake')}
                <span className={cx(DIM, 'mt-1 block sm:hidden')}>before {before(holder.stakeBeforePct)}</span>
                <span className={cx(DIM, 'block sm:hidden')}>votes {votes(holder.votesAfterPct)}</span>
              </td>
              <td className={cx(NUM, wide)}>{before(holder.stakeBeforePct)}</td>
              <td className={cx(NUM, wide)}>{votes(holder.votesAfterPct)}</td>
              <td className="hidden md:table-cell">
                <Source source={holder} />
              </td>
            </tr>
          ))}
        </tbody>
      </ProfileTable>
      {groups.length > 0 ? (
        <p className={cx(DIM, 'mt-3 max-w-[44rem]')}>
          {groups.map((group, index) => (
            <span key={group.group}>
              {index > 0 ? ' ' : null}
              {group.group}&apos;s {group.members} vehicles hold{' '}
              <span className="font-mono tabular-nums">{formatStoredPct(group.stakeAfterPct, 'stake')}</span> together.
            </span>
          ))}
        </p>
      ) : null}
    </>
  );
}

// ── Timeline and security ─────────────────────────────────────────────────

function EventBody({ row, company }: { row: TimelineRow; company: string }) {
  return (
    <>
      <span className="block">{row.title}</span>
      {row.amount ? (
        <span className={cx(DIM, 'mt-1 block')}>
          <span className={FIGURE}>{formatCny(row.amount)}</span>
          {row.postMoneyValuation ? (
            <>
              , valued at <span className={FIGURE}>{formatCny(row.postMoneyValuation)}</span> after the round
            </>
          ) : null}
        </span>
      ) : null}
      {row.note ? <Note>{row.note}</Note> : null}
      {row.companyReply !== 'n/a' ? (
        <span className="mt-2 block text-[13px]">
          <Reply reply={row.companyReply} company={company} labelled />
        </span>
      ) : null}
    </>
  );
}

/** Dated events newest first, with the company's reply where one applies. */
export function TimelineTable({
  profile,
  rows,
  labelledBy,
}: {
  profile: CompanyProfile;
  rows: readonly TimelineRow[];
  labelledBy: string;
}) {
  const reported = rows.some(
    (row) =>
      row.sourceType === 'reported' ||
      (typeof row.companyReply === 'object' && row.companyReply.sourceType === 'reported'),
  );
  return (
    <ProfileTable labelledBy={labelledBy} reported={reported}>
      <thead>
        <tr>
          <th scope="col" className={cx(HEAD, 'hidden w-[7.5rem] sm:table-cell')}>Date</th>
          <th scope="col" className={cx(HEAD, 'hidden w-[8rem] md:table-cell')}>Kind</th>
          <th scope="col" className={HEAD}>Event</th>
          <th scope="col" className={cx(HEAD, 'hidden w-[13rem] sm:table-cell')}>Source</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} data-profile-row={row.id} className={ROW}>
            <td className="hidden sm:table-cell">
              <ProfileDate value={row.date} />
            </td>
            <td className="hidden text-[13px] text-text-dim md:table-cell">{timelineKindLabel(row.kind)}</td>
            <td>
              <span className={cx(DIM, 'mb-1 block md:hidden')}>
                <ProfileDate value={row.date} className="sm:hidden" />
                <span className="sm:hidden">, </span>
                {timelineKindLabel(row.kind)}
              </span>
              <EventBody row={row} company={profile.company.name} />
              <span className="mt-1 block sm:hidden">
                <Source source={row} />
              </span>
            </td>
            <td className="hidden sm:table-cell">
              <Source source={row} />
            </td>
          </tr>
        ))}
      </tbody>
    </ProfileTable>
  );
}

/** Security findings newest first: what was found, by whom, and what the company did. */
export function SecurityTable({
  profile,
  rows,
  labelledBy,
}: {
  profile: CompanyProfile;
  rows: readonly TimelineRow[];
  labelledBy: string;
}) {
  const company = profile.company.name;
  const reported = rows.some(
    (row) =>
      row.sourceType === 'reported' ||
      (typeof row.companyReply === 'object' && row.companyReply.sourceType === 'reported'),
  );
  return (
    <ProfileTable labelledBy={labelledBy} reported={reported}>
      <thead>
        <tr>
          <th scope="col" className={cx(HEAD, 'hidden w-[7.5rem] sm:table-cell')}>Date</th>
          <th scope="col" className={HEAD}>Finding</th>
          <th scope="col" className={HEAD}>Company reply</th>
          <th scope="col" className={cx(HEAD, 'hidden w-[12rem] md:table-cell')}>Source</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} data-profile-row={row.id} className={ROW}>
            <td className="hidden sm:table-cell">
              <ProfileDate value={row.date} />
            </td>
            <td>
              <ProfileDate value={row.date} className="mb-1 block text-text-dim sm:hidden" />
              <span className="block">{row.title}</span>
              {row.cves && row.cves.length > 0 ? (
                <span className="mt-1 block font-mono text-[12px] leading-[1.5] text-text-dim">
                  {row.cves.join(', ')}
                </span>
              ) : null}
              {Array.isArray(row.credits) ? (
                <span className={cx(DIM, 'mt-1 block')}>Found by {row.credits.join(', ')}</span>
              ) : null}
              {row.note ? <Note>{row.note}</Note> : null}
              <span className="mt-1 block md:hidden">
                <Source source={row} />
              </span>
            </td>
            <td className="text-[13px]">
              {row.companyReply === 'n/a' ? (
                <span className="text-text-dim">n/a</span>
              ) : (
                <Reply reply={row.companyReply} company={company} />
              )}
            </td>
            <td className="hidden md:table-cell">
              <Source source={row} />
            </td>
          </tr>
        ))}
      </tbody>
    </ProfileTable>
  );
}

// ── Software and data ─────────────────────────────────────────────────────

/** What the company publishes, each item linked, with the license its host reports. */
export function SoftwareTable({ profile, labelledBy }: { profile: CompanyProfile; labelledBy: string }) {
  return (
    <ProfileTable labelledBy={labelledBy}>
      <thead>
        <tr>
          <th scope="col" className={HEAD}>Name</th>
          <th scope="col" className={cx(HEAD, 'hidden md:table-cell')}>What it is</th>
          <th scope="col" className={HEAD}>License</th>
          <th scope="col" className={cx(HEAD, 'hidden w-[7rem] sm:table-cell')}>Created</th>
          <th scope="col" className={cx(HEAD, 'hidden w-[12rem] lg:table-cell')}>Source</th>
        </tr>
      </thead>
      <tbody>
        {profile.software.map((item) => (
          <tr key={item.id} data-profile-row={item.id} className={ROW}>
            <th scope="row" className="text-left font-normal">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                data-brand-control-id="control:link-focus"
                className="ink-link break-words font-medium"
              >
                {item.name}
              </a>
              <span className={cx(DIM, 'block')}>
                {item.kind}
                {item.count !== undefined ? (
                  <>
                    , <span className="font-mono tabular-nums">{formatCount(item.count)}</span>
                    {item.countIsFloor ? ' or more' : ''} items
                  </>
                ) : null}
                {item.publisher ? `, published by ${item.publisher}` : null}
              </span>
              <span className="mt-1 block md:hidden">{item.description}</span>
              {item.note ? <Note>{item.note}</Note> : null}
              {item.created ? <ProfileDate value={item.created} className="mt-1 block text-text-dim sm:hidden" /> : null}
              <span className="mt-1 block lg:hidden">
                <Source source={item} />
              </span>
            </th>
            <td className="hidden md:table-cell">{item.description}</td>
            {/* A one-word license ("BSD-3-Clause") never breaks at its hyphens. */}
            <td className={cx('text-[13px]', !item.license.includes(' ') && 'whitespace-nowrap')}>{item.license}</td>
            <td className="hidden sm:table-cell">
              {item.created ? (
                <ProfileDate value={item.created} />
              ) : (
                <span className="text-[13px] text-text-dim">
                  {item.kind === 'collection' ? NOT_APPLICABLE : absentWithNoun('not disclosed', 'date')}
                </span>
              )}
            </td>
            <td className="hidden lg:table-cell">
              <Source source={item} />
            </td>
          </tr>
        ))}
      </tbody>
    </ProfileTable>
  );
}
