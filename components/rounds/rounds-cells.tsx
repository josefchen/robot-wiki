import { MarketTableMark } from '@/components/ui/market-table-mark';
import type { ReactNode } from 'react';
import { NumberText } from '@/components/ui/number-text';
import { TableScroll } from '@/components/ui/table-scroll';
import type { SourceType } from '@/data/rounds';
import { amountText, placeText, sourceHost, type AmountText } from '@/lib/rounds-page';
import { cx } from '@/lib/utils';

/**
 * The cells and frame the rounds page's static tables share: booktabs rules,
 * mono dates and amounts, a second line in the dim 12 px step, and a source
 * link on every row. Server-rendered; nothing here holds state.
 */

export interface ColumnHead {
  label: string;
  numeric?: boolean;
}

const SECOND_LINE = 'mt-0.5 block font-sans text-[12px] leading-[1.45] text-text-dim';

/**
 * A static booktabs table in its own scroll frame, named by its caption. The
 * caption sits under the table (booktabs) and carries the table's note; its
 * text is pinned to the frame's visible width so it never scrolls away.
 */
export function StaticTable({
  captionId,
  caption,
  columns,
  minWidth,
  className,
  children,
  after,
}: {
  captionId: string;
  caption: ReactNode;
  columns: readonly ColumnHead[];
  /** A Tailwind min-width class: the width under which the frame scrolls. */
  minWidth: string;
  className?: string;
  children: ReactNode;
  /** Further table bodies after the first, such as a fold. */
  after?: ReactNode;
}) {
  return (
    <TableScroll labelledBy={captionId} className={cx('[container-type:inline-size]', className)}>
      <table className={cx('booktabs', minWidth)}>
        {/* First in the DOM but drawn under the rows: kept out of scroll anchoring, or opening a fold pins the caption and throws the reader down past the new rows. */}
        <caption id={captionId} className="[overflow-anchor:none]">
          <span className="sticky left-0 block max-w-[100cqw]">{caption}</span>
        </caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={cx('font-sans text-[13px]', column.numeric ? 'text-right' : 'text-left')}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
        {after}
      </table>
    </TableScroll>
  );
}

/** A small mono word after a name: "reported", or a status that is not "closed". */
export function Mark({ children }: { children: string }) {
  return (
    <span data-mark={children} className="ml-1.5 whitespace-nowrap font-mono text-[12px] text-text-dim">
      {children}
    </span>
  );
}

export function SecondLine({ children }: { children: ReactNode }) {
  return <span className={SECOND_LINE}>{children}</span>;
}

export function DateCell({ children }: { children: string }) {
  return <td className="whitespace-nowrap font-mono text-[13px] tabular-nums text-text">{children}</td>;
}

/**
 * The first column of every event table: the date, then the company with its
 * marks, then where it is based. One narrow column, so on a phone the amount
 * beside it is on screen too.
 */
export function EventCell({
  date,
  company,
  city,
  country,
  sourceType,
  status,
  logo = null,
}: {
  date: string;
  company: string;
  city: string;
  country: string;
  sourceType: SourceType;
  /** Shown in the data's own word when it is not "closed". */
  status?: string;
  logo?: string | null;
}) {
  return (
    <td className="w-[11rem] min-w-[9.5rem] text-text">
      <span className="flex items-center gap-2">
        <span data-date="" className="whitespace-nowrap font-mono text-[13px] leading-5 tabular-nums">{date}</span>
        <MarketTableMark id={logo} />
      </span>
      <span className="mt-1 block">
        {company}
        {status && status !== 'closed' ? <Mark>{status}</Mark> : null}
        {sourceType === 'reported' ? <Mark>reported</Mark> : null}
      </span>
      <SecondLine>{placeText(city, country)}</SecondLine>
    </td>
  );
}

function AmountLines({ text }: { text: AmountText }) {
  const unknown = text.own === 'not disclosed' || text.own === 'n/a';
  return (
    <>
      <span className={cx('whitespace-nowrap', unknown ? 'font-sans text-[13px] text-text-dim' : 'text-text')}>
        {unknown ? text.own : <NumberText>{text.own}</NumberText>}
      </span>
      {text.usd ? (
        <SecondLine>
          <NumberText>{text.usd}</NumberText>
        </SecondLine>
      ) : null}
    </>
  );
}

export function AmountCell({ event }: { event: Parameters<typeof amountText>[0] }) {
  return (
    <td data-amount="" className="text-right tabular-nums">
      <AmountLines text={amountText(event)} />
    </td>
  );
}

/** Plain text, dim and unbroken when the data says the value is not known. */
export function TextCell({ children, className }: { children: string; className?: string }) {
  const unknown = children === 'not disclosed' || children === 'n/a' || children === 'none named';
  return (
    <td className={cx(unknown ? 'whitespace-nowrap text-[13px] text-text-dim' : 'text-text', className)}>
      {children}
    </td>
  );
}

export function SourceLink({ url, title }: { url: string; title: string }) {
  return (
    <a
      data-source-link=""
      data-brand-control-id="control:link-focus"
      href={url}
      title={title}
      target="_blank"
      rel="noopener"
      className="whitespace-nowrap text-text underline decoration-1 underline-offset-2"
    >
      {sourceHost(url)}
    </a>
  );
}

export function SourceCell({ url, title }: { url: string; title: string }) {
  return (
    <td className="text-[13px]">
      <SourceLink url={url} title={title} />
    </td>
  );
}
