import type { ReactNode } from 'react';
import { SourceLink, SourceTypeMark } from '@/components/now/source-mark';
import { TableScroll } from '@/components/ui/table-scroll';
import type { CompanyReply, ProfileSource } from '@/data/schemas/company-profile';
import { formatProfileDate } from '@/lib/company-profile';
import { REPORTED_NOTE, replyStatement, sourceLabel } from '@/lib/company-profile-page';
import { cx } from '@/lib/utils';

export const ROW = 'border-b border-border last:border-b-0';
export const DIM = 'text-[13px] leading-[1.45] text-text-dim';
export const HEAD = 'text-left text-[13px] font-semibold';
export const HEAD_NUM = 'text-right text-[13px] font-semibold';
export const NUM = 'whitespace-nowrap text-right font-mono text-[13px] tabular-nums';
export const FIGURE = 'font-mono text-[13px] tabular-nums';

/** A date as precise as its source: "19 Aug 2026", "Aug 2024", "2017". */
export function ProfileDate({ value, className }: { value: string; className?: string }) {
  return (
    <time dateTime={value} className={cx('whitespace-nowrap font-mono text-[13px] tabular-nums', className)}>
      {formatProfileDate(value)}
    </time>
  );
}

/** The row's source: its document, the page in the filing's own numbering, and the reported mark. */
export function Source({ source, className }: { source: ProfileSource; className?: string }) {
  return (
    <span className={cx('text-[13px] leading-[1.45]', className)}>
      <SourceLink url={source.sourceUrl} title={source.sourceTitle} label={sourceLabel(source)} />
      {source.pageRef ? (
        <>
          {/* The comma belongs to the name it follows, not to the mono reference. */}
          <span className="text-text-dim">,</span>{' '}
          <span className="font-mono text-[12px] text-text-dim">
            {/* Lines break between references, never inside "1-1-145" or "p. 12". */}
            {source.pageRef.split(/(?<=[,;]) /).map((token, index) => (
              <span key={index}>
                {index === 0 ? '' : ' '}
                <span className="whitespace-nowrap">{token}</span>
              </span>
            ))}
          </span>
        </>
      ) : null}
      {source.sourceType === 'reported' ? (
        <>
          {' '}
          <SourceTypeMark type="reported" />
        </>
      ) : null}
    </span>
  );
}

/** A second source for the specification, beside the price's own. */
export function SpecSource({ url, title, pageRef }: { url: string; title: string; pageRef?: string }) {
  return (
    <span className="block text-[13px] leading-[1.45]">
      <span className="text-text-dim">Specification: </span>
      <Source source={{ sourceType: 'primary', sourceUrl: url, sourceTitle: title, pageRef }} />
    </span>
  );
}

export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx(DIM, 'mt-1 block', className)}>{children}</span>;
}

/** The company's own word on an event: its statement with date and source, or that it made none. */
export function Reply({ reply, company, labelled = false }: { reply: CompanyReply; company: string; labelled?: boolean }) {
  if (reply === 'n/a') return null;
  const statement = replyStatement(reply);
  if (!statement) return <span className={cx(DIM, 'block')}>No statement from {company}</span>;
  return (
    <span className="block">
      {labelled ? <span className="text-text-dim">{company}: </span> : null}
      {statement.text}
      <span className={cx(DIM, 'mt-1 block')}>
        {statement.date ? (
          <>
            <ProfileDate value={statement.date} />
            {', '}
          </>
        ) : null}
        <Source source={statement} />
      </span>
    </span>
  );
}

/**
 * One table in its own scroll region, named by its heading, with the notes
 * on the marks its rows carry.
 */
export function ProfileTable({
  labelledBy,
  reported = false,
  computed = null,
  narrow = false,
  children,
}: {
  labelledBy: string;
  reported?: boolean;
  /** The note on the computed mark: what the table's computed figures are worked out from. */
  computed?: string | null;
  /** A table of few short columns keeps to the reading width. */
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {/* relative: the visually hidden source titles are absolutely
          positioned and would otherwise widen the page on a phone. */}
      <TableScroll labelledBy={labelledBy} className={cx('relative mt-5', narrow && 'max-w-[56rem]')}>
        <table className="booktabs min-w-full">{children}</table>
      </TableScroll>
      {reported || computed ? (
        <p className={cx(DIM, 'mt-3 max-w-[44rem]')}>
          {reported ? (
            <>
              <SourceTypeMark type="reported" /> {REPORTED_NOTE}{' '}
            </>
          ) : null}
          {computed ? (
            <>
              <SourceTypeMark type="computed" /> {computed}
            </>
          ) : null}
        </p>
      ) : null}
    </>
  );
}

export function SubHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mt-12 font-sans text-[16px] font-semibold leading-[1.4] text-text">
      {children}
    </h3>
  );
}
