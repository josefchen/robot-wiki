import { MarketTableMark } from '@/components/ui/market-table-mark';
import { ipoTableLogoId } from '@/lib/market-table-logos';
import { ListedTable } from './listed-table';
import { NumberText } from '@/components/ui/number-text';
import { ANNUAL_REVENUE, type AnnualRevenue } from '@/data/public-company-annual-revenue';
import { PUBLIC_COMPANIES_AS_OF } from '@/data/public-companies';
import { COMPANY_PROFILES, companyProfilePath } from '@/lib/company-profile-page';
import { formatShortDate } from '@/lib/market-map';
import { marketValueSourceLine } from '@/lib/public-companies';
import {
  closeSource,
  closesCaption,
  conversionNote,
  formatMoney,
  debutRows,
  ipoRows,
  leftOutCaption,
  leftOutRows,
  listedRows,
} from '@/lib/public-companies-page';
import { cx } from '@/lib/utils';
import { Figure, Mark, SecondLine, SourceCell, SourceLines, StaticTable } from './cells';

/**
 * The public companies page's tables and source-linked rows. Rows
 * come from data/public-companies.ts through lib/public-companies-page.ts;
 * no count or amount is typed here.
 */

const REPORTED_NOTE =
  'reported: the row rests on a press report or a quote service, not on the company, the exchange or a filing.';

const NUMBER_CELL = 'text-right tabular-nums';
const DATE_CELL = 'whitespace-nowrap font-mono text-[13px] tabular-nums text-text';

const profileByName = new Map(
  COMPANY_PROFILES.map((profile) => [profile.company.name, companyProfilePath(profile.slug)]),
);

function FiscalRevenue({ revenue }: { revenue: AnnualRevenue | undefined }) {
  if (!revenue) return <span className="text-text-dim">No figure</span>;
  return (
    <>
      <Figure>{formatMoney(revenue.amount, revenue.currency)}</Figure>
      <SecondLine>Year to {formatShortDate(revenue.yearEnd)}</SecondLine>
      {revenue.scope && <SecondLine>{revenue.scope}</SecondLine>}
    </>
  );
}

/** Render each sourced row on the server; the reader can filter and order them in place. */
export function ListedCompaniesTable() {
  const entries = listedRows().map(({ company, segment, country, value, valueUsd, exposure, usd }) => {
    const revenue = ANNUAL_REVENUE[company.id];
    return {
      id: company.id,
      name: company.name,
      exposure: company.exposure,
      segment,
      country,
      usd,
      row: (
        <tr key={company.id} data-listed-row={company.id}>
          <td className="w-[12rem] min-w-[10rem] text-text">
            {profileByName.has(company.name) ? (
              <a className="ink-link" href={profileByName.get(company.name)}>{company.name}</a>
            ) : company.name}
            <SecondLine>
              <span className="font-mono">{company.ticker}</span> {company.exchange}
            </SecondLine>
          </td>
          <td data-market-value="" className={NUMBER_CELL}>
            <Figure>{value}</Figure>
            {valueUsd ? (
              <SecondLine>
                <NumberText>{valueUsd}</NumberText>
              </SecondLine>
            ) : null}
          </td>
          <td className="min-w-[11rem] text-text">
            <span className="whitespace-nowrap">
              {exposure.label}
              {exposure.reported ? <Mark>reported</Mark> : null}
            </span>
            <SecondLine>
              <NumberText>{exposure.detail}</NumberText>
            </SecondLine>
          </td>
          <td data-fiscal-revenue="" className="min-w-[9rem] text-right"><FiscalRevenue revenue={revenue} /></td>
          <td className="min-w-[7rem] text-text">{segment}</td>
          <td className="whitespace-nowrap text-text">{country}</td>
          <td className="min-w-[9rem] text-[13px] leading-[1.5] text-text">{company.note ?? null}</td>
          <SourceCell
            sources={[
              { label: 'Value', url: company.marketCapSource.url, title: company.marketCapSource.title },
              ...(company.exposureSource
                ? [{ label: 'Exposure', url: company.exposureSource.url, title: company.exposureSource.title }]
                : []),
              ...(revenue ? [{ label: 'Revenue', url: revenue.sourceUrl, title: revenue.sourceTitle }] : []),
            ]}
          />
        </tr>
      ),
    };
  });
  return (
    <ListedTable
      entries={entries}
      caption={`${marketValueSourceLine()} ${conversionNote()} An exposure class marked reported rests on the quote service’s company profile or a press report, not on a filing. Revenue is the issuer’s annual figure in its reporting currency. “No figure” means the annual amount is missing from this table.`}
      columns={[
        { label: 'Company', sub: 'ticker, exchange' },
        { label: 'Market value', sub: formatShortDate(PUBLIC_COMPANIES_AS_OF), numeric: true },
        { label: 'Exposure' },
        { label: 'Fiscal-year revenue', sub: 'whole company', numeric: true },
        { label: 'Segment' },
        { label: 'Country' },
        { label: 'Note' },
        { label: 'Source' },
      ]}
    />
  );
}

/** Listed companies kept off the list, with the reason for each. */
export function LeftOutTable() {
  return (
    <StaticTable
      captionId="left-out-caption"
      caption={leftOutCaption()}
      columns={[{ label: 'Company', sub: 'ticker, exchange' }, { label: 'Why it is left out', sub: 'source' }]}
      // Two columns, so the list fits a phone without scrolling.
      minWidth="w-full"
      className="max-w-[48rem]"
    >
      {leftOutRows().map((row) => (
        <tr key={row.id} data-left-out-row={row.id}>
          <td className="w-[40%] text-text">
            {row.name}
            <SecondLine>
              <span className="font-mono">{row.ticker}</span> {row.exchange}
            </SecondLine>
          </td>
          <td className="text-text">
            {row.reason}
            <span className="mt-0.5 block text-[13px]">
              <SourceLines sources={[{ url: row.source.url, title: row.source.title }]} />
            </span>
          </td>
        </tr>
      ))}
    </StaticTable>
  );
}

/** Companies heading to market, nearest first, and the ABB Robotics sale as context. */
export function IpoWatchTable() {
  const rows = ipoRows();
  return (
    <StaticTable
      captionId="ipo-watch-caption"
      caption={REPORTED_NOTE}
      columns={[
        { label: 'Company', sub: 'exchange' },
        { label: 'Status', sub: 'filing' },
        { label: 'Date' },
        { label: 'Amount', numeric: true },
        { label: 'Valuation', numeric: true },
        { label: 'Source' },
      ]}
      minWidth="min-w-[60rem]"
    >
      {rows.map(({ row, date, dateKind, amount, amountKind, price, valuation, reported }, index) => {
        // The sale is context, not a listing: a rule sets it apart from the companies above.
        const context = row.status === 'not an IPO';
        const ruled = context && index > 0 && rows[index - 1].row.status !== 'not an IPO';
        return (
          <tr
            key={row.id}
            data-ipo-row={row.id}
            data-status={row.status}
            className={cx(ruled && '[&>td]:border-t [&>td]:border-border')}
          >
            <td className="w-[15rem] min-w-[11rem] text-text">
              <span>{row.name}{reported ? <Mark>reported</Mark> : null}</span>
              <SecondLine>
                <span className="flex flex-wrap items-center gap-x-2">
                  <span>{row.ticker ? <span className="font-mono">{row.ticker} </span> : null}{row.exchange}</span>
                  <MarketTableMark id={ipoTableLogoId(row)} />
                </span>
              </SecondLine>
              {row.note ? <SecondLine>{row.note}</SecondLine> : null}
            </td>
            <td className="min-w-[10rem] text-text">
              <span className={cx('whitespace-nowrap', context && 'font-semibold')}>{row.status}</span>
              <SecondLine>{row.filingType}</SecondLine>
            </td>
            <td>
              {date === 'not disclosed' ? (
                <Figure>{date}</Figure>
              ) : (
                <span className={DATE_CELL}>{date}</span>
              )}
              {dateKind ? <SecondLine>{dateKind}</SecondLine> : null}
            </td>
            <td data-amount="" className={NUMBER_CELL}>
              <Figure>{amount}</Figure>
              {amountKind ? <SecondLine>{amountKind}</SecondLine> : null}
              {price ? (
                <SecondLine>
                  <NumberText>{price}</NumberText>
                </SecondLine>
              ) : null}
            </td>
            <td className={NUMBER_CELL}>
              <Figure>{valuation}</Figure>
            </td>
            <SourceCell sources={[{ url: row.source.url, title: row.source.title }]} />
          </tr>
        );
      })}
    </StaticTable>
  );
}

/** The 2026 debuts against their offer price, best first; "n/a" for a merger, which has no offer price. */
export function SinceListingTable() {
  return (
    <StaticTable
      captionId="since-listing-caption"
      caption={
        `${closesCaption()} HKEX, both lines: the sum of the two amounts ` +
        `HKEX's New Listing Report gives for each issue. ${REPORTED_NOTE}`
      }
      // The change sits beside the company, so a phone shows it before the frame scrolls.
      columns={[
        { label: 'Company', sub: 'ticker, exchange' },
        { label: 'Change', sub: 'offer to close', numeric: true },
        { label: 'Offer price', numeric: true },
        { label: 'Close', sub: formatShortDate(PUBLIC_COMPANIES_AS_OF), numeric: true },
        { label: 'Raised', numeric: true },
        { label: 'Listed' },
        { label: 'Source' },
      ]}
      minWidth="min-w-[58rem]"
    >
      {debutRows().map(({ debut, listed, offer, close, change, changeText, raised, raisedKind, reported }) => (
        <tr key={debut.id} data-debut-row={debut.id}>
          <td className="w-[15rem] min-w-[10.5rem] text-text">
            {debut.name}
            {reported ? <Mark>reported</Mark> : null}
            <SecondLine>
              <span className="font-mono">{debut.ticker}</span> {debut.exchange}
            </SecondLine>
            {debut.note ? <SecondLine>{debut.note}</SecondLine> : null}
          </td>
          <td data-change={change === null ? undefined : change} className={NUMBER_CELL}>
            <Figure>{changeText}</Figure>
          </td>
          <td className={NUMBER_CELL}>
            <Figure>{offer}</Figure>
          </td>
          <td className={NUMBER_CELL}>
            <Figure>{close}</Figure>
          </td>
          <td className={NUMBER_CELL}>
            <Figure>{raised}</Figure>
            {raisedKind ? <SecondLine>{raisedKind}</SecondLine> : null}
          </td>
          <td>{listed === 'not disclosed' ? <Figure>{listed}</Figure> : <span className={DATE_CELL}>{listed}</span>}</td>
          <SourceCell
            sources={[
              // A merger has no offer price: its source backs the listing itself.
              { label: debut.offerPrice === null ? 'Listing' : 'Offer', url: debut.source.url, title: debut.source.title },
              ...(debut.proceeds?.kind === 'stated' && debut.proceeds.sourceUrl
                ? [{ label: 'Raised', url: debut.proceeds.sourceUrl, title: `${debut.name}, amount raised` }]
                : []),
              ...(debut.close
                ? [{ label: 'Close', url: debut.close.url, title: `${debut.name}, ${closeSource(debut.close).name}` }]
                : []),
            ]}
          />
        </tr>
      ))}
    </StaticTable>
  );
}
