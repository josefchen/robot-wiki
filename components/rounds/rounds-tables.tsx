import { FX_RATES_DATE } from '@/data/fx-rates';
import {
  CORPORATE_EVENTS,
  EUROPE_INVESTORS,
  LISTINGS,
  ROUNDS_AS_OF,
  type FundingEvent,
  type InvestorNote,
} from '@/data/rounds';
import { formatLongDate } from '@/lib/dates';
import { cx } from '@/lib/utils';
import { monthUnconfirmedRounds, roundsInWindow, ukAndEuropeRounds } from '@/lib/rounds';
import {
  byDateDesc,
  corporateEventText,
  eventDateText,
  investorRows,
  leadsText,
  roundAnchor,
} from '@/lib/rounds-page';
import {
  AmountCell,
  DateCell,
  EventCell,
  Mark,
  SecondLine,
  SourceCell,
  StaticTable,
  TextCell,
  type ColumnHead,
} from './rounds-cells';

/**
 * The rounds page's tables, all static and server-rendered. Rows come from
 * data/rounds.ts through lib/rounds.ts and lib/rounds-page.ts; no count or
 * amount is typed here.
 */

const REPORTED_NOTE =
  'reported: the row rests on a press or newsletter report, not on the company, an investor or a filing.';

const FX_NOTE =
  `Amounts are as announced; other currencies are converted to US dollars at the European Central Bank's ` +
  `reference rates of ${formatLongDate(FX_RATES_DATE)}.`;

const EVENT_HEAD: ColumnHead = { label: 'Date and company' };

const ROUND_COLUMNS: readonly ColumnHead[] = [
  EVENT_HEAD,
  { label: 'Amount', numeric: true },
  { label: 'Round' },
  { label: 'Valuation' },
  { label: 'Lead investors' },
  { label: 'What they build' },
  { label: 'Source' },
];

/**
 * Under 1280 px the round tables scroll in their frame, so the leads and
 * notes columns get room enough that a long note or a list of six leads
 * leaves no blank band under the company. From 1280 px the table fits the
 * frame and the columns share its width.
 */
const ROUND_TABLE_WIDTH = 'min-w-[100rem] xl:min-w-[72rem]';
const LEADS_WIDTH = 'min-w-[19rem] xl:min-w-0';
const NOTES_WIDTH = 'min-w-[32rem] xl:min-w-[12rem]';

/** The notes a round carries: why it is borderline, and its own note. */
function RoundNotes({ round }: { round: FundingEvent }) {
  return (
    <>
      {round.borderline ? <SecondLine>Borderline robotics: {round.borderline}.</SecondLine> : null}
      {round.note ? <SecondLine>{round.note}</SecondLine> : null}
    </>
  );
}

function RoundRow({ round, anchored }: { round: FundingEvent; anchored: boolean }) {
  return (
    <tr
      id={anchored ? roundAnchor(round.key) : undefined}
      data-round-row={round.key}
      className={anchored ? 'scroll-mt-24 target:font-semibold' : undefined}
    >
      <EventCell
        date={eventDateText(round)}
        company={round.company}
        city={round.city}
        country={round.country}
        sourceType={round.sourceType}
        status={round.status}
      />
      <AmountCell event={round} />
      <TextCell>{round.round}</TextCell>
      <TextCell>{round.valuation}</TextCell>
      <td className={cx(LEADS_WIDTH, round.leadInvestors.length > 0 ? 'text-text' : 'text-[13px] text-text-dim')}>
        {round.leadUnconfirmed && round.leadInvestors.length === 0 ? (
          // No named lead and an unconfirmed one: say so once, not "none named" beside it.
          <span data-mark="lead unconfirmed" className="whitespace-nowrap font-mono text-[12px]">
            lead unconfirmed
          </span>
        ) : (
          <>
            {leadsText(round)}
            {round.leadUnconfirmed ? <Mark>lead unconfirmed</Mark> : null}
          </>
        )}
      </td>
      <td className={cx(NOTES_WIDTH, 'text-text')}>
        {round.whatTheyBuild === 'not disclosed' ? (
          <span className="text-[13px] text-text-dim">not disclosed</span>
        ) : (
          round.whatTheyBuild
        )}
        <RoundNotes round={round} />
      </td>
      <SourceCell url={round.sourceUrl} title={round.sourceTitle} />
    </tr>
  );
}

/** Every round in the window, newest first, each row anchored for the investor links. */
export function RoundsTable() {
  return (
    <StaticTable
      captionId="rounds-table-caption"
      caption={`Rounds in the window, newest first. ${REPORTED_NOTE} ${FX_NOTE}`}
      columns={ROUND_COLUMNS}
      minWidth={ROUND_TABLE_WIDTH}
    >
      {roundsInWindow().map((round) => (
        <RoundRow key={round.key} round={round} anchored />
      ))}
    </StaticTable>
  );
}

/** The month-only rows that may predate the window: listed, never totaled. */
export function MonthUnconfirmedTable() {
  return (
    <StaticTable
      captionId="month-unconfirmed-caption"
      caption={`Rounds dated only to a month that may predate the window; not in the figure or any total. ${REPORTED_NOTE}`}
      columns={ROUND_COLUMNS}
      minWidth={ROUND_TABLE_WIDTH}
    >
      {monthUnconfirmedRounds().map((round) => (
        <RoundRow key={round.key} round={round} anchored={false} />
      ))}
    </StaticTable>
  );
}

export function ListingsTable() {
  return (
    <StaticTable
      captionId="listings-caption"
      caption={`Listings, newest first. Not venture rounds; never in the totals. ${REPORTED_NOTE}`}
      columns={[
        EVENT_HEAD,
        { label: 'Amount', numeric: true },
        { label: 'Listing' },
        { label: 'Valuation' },
        { label: 'What they build' },
        { label: 'Source' },
      ]}
      minWidth="min-w-[64rem]"
    >
      {byDateDesc(LISTINGS).map((listing) => (
        <tr key={listing.key} data-listing-row={listing.key}>
          <EventCell
            date={eventDateText(listing)}
            company={listing.company}
            city={listing.city}
            country={listing.country}
            sourceType={listing.sourceType}
            status={listing.status}
          />
          <AmountCell event={listing} />
          <td className="text-text">
            {listing.round}
            {listing.note ? <SecondLine>{listing.note}</SecondLine> : null}
          </td>
          <TextCell>{listing.valuation}</TextCell>
          <TextCell>{listing.whatTheyBuild}</TextCell>
          <SourceCell url={listing.sourceUrl} title={listing.sourceTitle} />
        </tr>
      ))}
    </StaticTable>
  );
}

export function CorporateEventsTable() {
  return (
    <StaticTable
      captionId="corporate-caption"
      caption={`Acquisitions, a blocked deal and shutdowns, newest first. ${REPORTED_NOTE}`}
      columns={[
        EVENT_HEAD,
        { label: 'Amount', numeric: true },
        { label: 'What happened' },
        { label: 'What they build' },
        { label: 'Source' },
      ]}
      minWidth="min-w-[60rem]"
    >
      {byDateDesc(CORPORATE_EVENTS).map((event) => (
        <tr key={event.key} data-corporate-row={event.key} data-kind={event.kind}>
          <EventCell
            date={eventDateText(event)}
            company={event.company}
            city={event.city}
            country={event.country}
            sourceType={event.sourceType}
          />
          <AmountCell event={{ ...event, currency: event.currency ?? 'USD' }} />
          <td className="text-text">
            {corporateEventText(event)}
            {event.note ? <SecondLine>{event.note}</SecondLine> : null}
          </td>
          <TextCell>{event.whatTheyBuild}</TextCell>
          <SourceCell url={event.sourceUrl} title={event.sourceTitle} />
        </tr>
      ))}
    </StaticTable>
  );
}

/**
 * Lead investors with two or more rounds; each company links to its row in
 * the rounds table. The companies sit under the investor's name, so the
 * table is two columns wide and fits a phone without scrolling.
 */
export function InvestorsTable() {
  return (
    <StaticTable
      captionId="investors-caption"
      caption="Lead investors: rounds led or co-led, closed rounds in the window only. Spellings of one firm are counted together."
      columns={[{ label: 'Investor and companies' }, { label: 'Rounds', numeric: true }]}
      minWidth="w-full"
      className="max-w-[40rem]"
    >
      {investorRows().map((row) => (
        <tr key={row.investor} data-investor-row={row.investor}>
          <td className="text-text">
            {row.investor}
            <span className="mt-0.5 block font-sans text-[13px] leading-[1.5] text-text-dim">
              {row.companies.map((c, i) => (
                <span key={c.key}>
                  {i > 0 ? ', ' : null}
                  <a
                    data-investor-link={c.key}
                    data-brand-control-id="control:link-focus"
                    href={`#${roundAnchor(c.key)}`}
                    className="underline decoration-1 underline-offset-2 hover:text-text"
                  >
                    {c.company}
                  </a>
                </span>
              ))}
            </span>
          </td>
          <td className="w-[5rem] text-right font-mono tabular-nums text-text">{row.rounds}</td>
        </tr>
      ))}
    </StaticTable>
  );
}

function noteDate(note: InvestorNote): string {
  if (note.datePrecision === 'not disclosed') return 'not disclosed';
  return eventDateText({ date: note.date, datePrecision: note.datePrecision });
}

export function EuropeInvestorsTable() {
  return (
    <StaticTable
      captionId="europe-investors-caption"
      caption={`European investors: what each firm did in robotics in ${ROUNDS_AS_OF.slice(0, 4)}, as its source words it. ${REPORTED_NOTE}`}
      columns={[{ label: 'Investor' }, { label: 'In robotics' }, { label: 'Date' }, { label: 'Source' }]}
      minWidth="min-w-[44rem]"
    >
      {EUROPE_INVESTORS.map((note) => (
        <tr key={note.key} data-europe-investor-row={note.key}>
          <td className="min-w-[9rem] text-text">
            {note.investor}
            {note.sourceType === 'reported' ? <Mark>reported</Mark> : null}
          </td>
          <td className="min-w-[16rem] text-text">{note.summary}</td>
          <DateCell>{noteDate(note)}</DateCell>
          <SourceCell url={note.sourceUrl} title={note.sourceTitle} />
        </tr>
      ))}
    </StaticTable>
  );
}

export function UkEuropeTable() {
  return (
    <StaticTable
      captionId="uk-europe-caption"
      caption={`United Kingdom and Europe rounds, newest first. ${REPORTED_NOTE} ${FX_NOTE}`}
      columns={[
        EVENT_HEAD,
        { label: 'Amount', numeric: true },
        { label: 'Round' },
        { label: 'Lead investors' },
        { label: 'What they build' },
        { label: 'Source' },
      ]}
      minWidth="min-w-[60rem]"
    >
      {ukAndEuropeRounds().map((round) => (
        <tr key={round.key} data-uk-europe-row={round.key}>
          <EventCell
            date={eventDateText(round)}
            company={round.company}
            city={round.city}
            country={round.country}
            sourceType={round.sourceType}
          />
          <AmountCell event={round} />
          <TextCell>{round.round}</TextCell>
          <td className={round.leadInvestors.length > 0 ? 'text-text' : 'text-[13px] text-text-dim'}>
            {leadsText(round)}
          </td>
          <TextCell>{round.whatTheyBuild}</TextCell>
          <SourceCell url={round.sourceUrl} title={round.sourceTitle} />
        </tr>
      ))}
    </StaticTable>
  );
}
