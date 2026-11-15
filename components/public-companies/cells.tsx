import type { ReactNode } from 'react';
import { NumberText } from '@/components/ui/number-text';
import { TableScroll } from '@/components/ui/table-scroll';
import { sourceHost } from '@/lib/public-companies-page';
import { cx } from '@/lib/utils';

/**
 * The cells and frame the public companies tables share, in the rounds
 * tables' language: booktabs rules, mono figures, a dim 12 px second line,
 * and a source link on every row. Server-rendered; nothing here holds state.
 */

export interface ColumnHead {
  label: string;
  /** A dim second line under the label, such as the date a column is from. */
  sub?: string;
  numeric?: boolean;
}

const SECOND_LINE = 'mt-0.5 block font-sans text-[12px] leading-[1.45] text-text-dim';
const UNKNOWN = new Set(['not disclosed', 'n/a']);

/**
 * A static booktabs table in its own scroll frame, named by its caption. The
 * caption sits under the table and carries its note, pinned to the frame's
 * visible width so it never scrolls away.
 */
export function StaticTable({
  captionId,
  caption,
  columns,
  minWidth,
  className,
  children,
}: {
  captionId: string;
  caption: ReactNode;
  columns: readonly ColumnHead[];
  /** A Tailwind min-width class: the width under which the frame scrolls. */
  minWidth: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <TableScroll labelledBy={captionId} className={cx('relative [container-type:inline-size]', className)}>
      <table className={cx('booktabs', minWidth)}>
        <caption id={captionId}>
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
                <span className="whitespace-nowrap">{column.label}</span>
                {column.sub ? (
                  <span className="block whitespace-nowrap font-mono text-[12px] font-normal text-text-dim">
                    {column.sub}
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </TableScroll>
  );
}

/** A small mono word after a value: "reported". */
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

/** A value the data does not know, set dim and unbroken. */
export function Unknown({ children }: { children: string }) {
  return <span className="whitespace-nowrap font-sans text-[13px] text-text-dim">{children}</span>;
}

export function isUnknown(text: string): boolean {
  return UNKNOWN.has(text);
}

/** A figure in mono numerals, or the dim words for an unknown value. */
export function Figure({ children }: { children: string }) {
  return isUnknown(children) ? (
    <Unknown>{children}</Unknown>
  ) : (
    <span className="whitespace-nowrap text-text">
      <NumberText>{children}</NumberText>
    </span>
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

export interface CellSource {
  /** What the source backs, when a row has more than one. */
  label?: string;
  url: string;
  title: string;
}

/** One source per line, each named by what it backs. */
export function SourceLines({ sources }: { sources: readonly CellSource[] }) {
  return sources.map((source) => (
    <span key={`${source.label}-${source.url}`} className="block whitespace-nowrap leading-5">
      {source.label ? <span className="text-text-dim">{source.label} </span> : null}
      <SourceLink url={source.url} title={source.title} />
    </span>
  ));
}

export function SourceCell({ sources }: { sources: readonly CellSource[] }) {
  return (
    <td className="text-[13px]">
      <SourceLines sources={sources} />
    </td>
  );
}
