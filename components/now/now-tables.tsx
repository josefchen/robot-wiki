import type { ReactNode } from 'react';
import { TableScroll } from '@/components/ui/table-scroll';
import type { DeliveryGap, Development } from '@/data/now';
import type { NowArgument, OpenQuestion, Position } from '@/data/now-debates';
import type { SourcedEvidence } from '@/data/schemas/now-debate';
import { formatShortDate } from '@/lib/market-map';
import { formatGapValue } from '@/lib/now';
import { isSourced, positionsBySide } from '@/lib/now-debates';
import {
  developmentReported,
  formatStatedDate,
  gapReported,
  questionReported,
  stated,
} from '@/lib/now-page';
import { cx } from '@/lib/utils';
import { SourceLink, SourceTypeMark } from './source-mark';

/** The pinned first column: it stays in view while the rest scrolls on a phone. */
const PINNED = 'sticky left-0 z-[1] bg-bg';
const ROW = 'border-b border-border last:border-b-0';
const DIM = 'text-[13px] leading-[1.45] text-text-dim';
const HEAD = 'text-left text-[13px] font-semibold';
/**
 * On a phone a three-column table scrolls in its own box: the pinned first
 * column (7.5rem) and the second (13.5rem) fit a 342 px column together, so
 * the first two read without scrolling.
 */
const PHONE_COLUMN = 'w-[13.5rem] sm:w-auto';
const PHONE_MIN_WIDTH = 'min-w-[34.5rem] sm:min-w-full';

function DateText({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} className={cx('whitespace-nowrap font-mono text-[13px] tabular-nums text-text', className)}>
      {formatShortDate(iso)}
    </time>
  );
}

function Reported({ when }: { when: boolean }) {
  return when ? (
    <>
      {' '}
      <SourceTypeMark type="reported" />
    </>
  ) : null;
}

/**
 * One table in its own scroll region, named by the section heading, with
 * the note on the reported mark when a row carries it.
 */
function NowTable({
  labelledBy,
  minWidth,
  note,
  children,
}: {
  labelledBy: string;
  minWidth: string;
  note: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {/* relative: the visually hidden source titles are absolutely
          positioned, and without a containing block inside the scroll box
          they would widen the page on a phone. */}
      <TableScroll labelledBy={labelledBy} className="relative mt-6 [container-type:inline-size]">
        <table className={cx('booktabs', minWidth)}>{children}</table>
      </TableScroll>
      {note ? (
        <p data-reported-note="" className={cx(DIM, 'mt-3')}>
          <SourceTypeMark type="reported" /> marks a row whose figure or quote comes from a report of the
          source, not from the measurer&apos;s or speaker&apos;s own page.
        </p>
      ) : null}
    </>
  );
}

/** "What changed": newest first, what happened, what it means and does not mean, the source. */
export function WhatChangedTable({ rows, labelledBy }: { rows: readonly Development[]; labelledBy: string }) {
  const sources = (row: Development) => (
    <>
      <SourceLink url={row.sourceUrl} title={row.sourceTitle} />
      {(row.alsoCited ?? []).map((cited) => (
        <span key={cited.sourceUrl}>
          , <SourceLink url={cited.sourceUrl} title={cited.sourceTitle} />
        </span>
      ))}
    </>
  );
  return (
    <NowTable labelledBy={labelledBy} minWidth="min-w-full" note={rows.some(developmentReported)}>
      <thead>
        <tr>
          <th scope="col" className={cx(HEAD, 'hidden w-[7.5rem] sm:table-cell')}>Date</th>
          <th scope="col" className={HEAD}>What happened</th>
          <th scope="col" className={HEAD}>What it means</th>
          <th scope="col" className={cx(HEAD, 'hidden w-[10rem] sm:table-cell')}>Source</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} data-now-row={row.id} className={ROW}>
            <td className="hidden sm:table-cell">
              <DateText iso={row.date} />
            </td>
            <td>
              <DateText iso={row.date} className="mb-1 block sm:hidden" />
              {row.what}
              <Reported when={developmentReported(row)} />
            </td>
            <td className={DIM}>
              <span className="block">{row.means}.</span>
              <span className="mt-1 block">Does not mean: {row.doesNotMean}.</span>
              <span className="mt-1 block sm:hidden">{sources(row)}</span>
            </td>
            <td className="hidden text-[13px] sm:table-cell">{sources(row)}</td>
          </tr>
        ))}
      </tbody>
    </NowTable>
  );
}

function Evidence({ evidence, label, defaultLabel }: { evidence: OpenQuestion['evidenceFor']; label: string; defaultLabel: string }) {
  if (!isSourced(evidence)) {
    return <span className="text-text-dim">{evidence}</span>;
  }
  const side: SourcedEvidence = evidence;
  const when = stated(side.published);
  return (
    <>
      {label !== defaultLabel ? <span className={cx(DIM, 'block')}>{label}</span> : null}
      {side.text}
      <span className={cx(DIM, 'mt-1 block')}>
        <SourceLink url={side.sourceUrl} title={side.sourceTitle} label={side.publisher} />
        {', '}
        {when ? (
          <time dateTime={when} className="font-mono tabular-nums">{formatStatedDate(side.published)}</time>
        ) : (
          side.published
        )}
        <Reported when={side.sourceType === 'reported'} />
      </span>
    </>
  );
}

/** Who said it, where, and when: "@handle" for a post, the publisher for a press quote. */
function PositionSource({ position }: { position: Position }) {
  const label = position.channel === 'x' ? `@${position.handle}` : (position.article?.publisher ?? position.person);
  const title = position.article ? `${position.article.title} (${position.article.publisher})` : `${position.person} on X`;
  return (
    <span className={cx(DIM, 'mt-1 block')}>
      <SourceLink url={position.postUrl} title={title} label={label} />
      {', '}
      <time dateTime={position.postedDate} className="font-mono tabular-nums">
        {formatShortDate(position.postedDate)}
      </time>
      <Reported when={position.sourceType === 'reported'} />
    </span>
  );
}

function Speaker({ position }: { position: Position }) {
  return (
    <>
      <span className="block font-medium text-text">{position.person}</span>
      <span className={cx(DIM, 'block')}>{position.role}</span>
    </>
  );
}

function Quote({ position }: { position: Position }) {
  return (
    <>
      <q cite={position.postUrl}>{position.quote}</q>
      {position.context ? <span className={cx(DIM, 'mt-1 block')}>{position.context}</span> : null}
      <PositionSource position={position} />
    </>
  );
}

/** The named people on one argument, side by side group, inside its question's row. */
function Positions({ argument }: { argument: NowArgument }) {
  return (
    <div data-linked-argument={argument.id} className="sticky left-0 max-w-[100cqw]">
      <div className={cx(DIM, 'mb-2')}>{argument.title}: who argues it, in their own words</div>
      <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {positionsBySide(argument).flatMap((group) =>
          group.positions.map((position) => (
            <li key={position.id} data-position={position.id} className="min-w-0">
              <span className={cx(DIM, 'block')}>{group.side}</span>
              <Speaker position={position} />
              <span className="mt-1 block">
                <Quote position={position} />
              </span>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

/**
 * "Open questions": the best published evidence each way. Where an argument
 * is on the same subject its people sit in a row under the question, so the
 * subject appears once on the page.
 */
export function OpenQuestionsTable({
  rows,
  labelledBy,
}: {
  rows: readonly { question: OpenQuestion; argument: NowArgument | null }[];
  labelledBy: string;
}) {
  return (
    <NowTable
      labelledBy={labelledBy}
      minWidth={PHONE_MIN_WIDTH}
      note={rows.some(({ question, argument }) => questionReported(question, argument))}
    >
      <thead>
        <tr>
          <th scope="col" className={cx(HEAD, PINNED, 'w-[7.5rem] sm:w-[13rem]')}>Question</th>
          <th scope="col" className={cx(HEAD, PHONE_COLUMN)}>Best evidence for</th>
          <th scope="col" className={cx(HEAD, PHONE_COLUMN)}>Best evidence against</th>
        </tr>
      </thead>
      {rows.map(({ question, argument }) => (
        <tbody key={question.id} data-now-row={question.id} className={ROW}>
          <tr>
            <th scope="row" className={cx(PINNED, 'text-left font-medium')}>
              {question.question}
            </th>
            <td>
              <Evidence evidence={question.evidenceFor} label={question.labels.for} defaultLabel="for" />
            </td>
            <td>
              <Evidence evidence={question.evidenceAgainst} label={question.labels.against} defaultLabel="against" />
            </td>
          </tr>
          {argument ? (
            <tr>
              <td colSpan={3} className="pt-0!">
                <Positions argument={argument} />
              </td>
            </tr>
          ) : null}
        </tbody>
      ))}
    </NowTable>
  );
}

/** "What people argue about": each named person, their sentence, where they said it. */
export function ArgumentsTable({ rows, labelledBy }: { rows: readonly NowArgument[]; labelledBy: string }) {
  return (
    <NowTable
      labelledBy={labelledBy}
      minWidth="min-w-full"
      note={rows.some((argument) => argument.positions.some((position) => position.sourceType === 'reported'))}
    >
      <thead>
        <tr>
          <th scope="col" className={cx(HEAD, 'w-[8.5rem] sm:w-[13rem]')}>Argument</th>
          <th scope="col" className={cx(HEAD, 'hidden w-[12rem] sm:table-cell')}>Who</th>
          <th scope="col" className={HEAD}>What they said</th>
        </tr>
      </thead>
      {rows.map((argument) => {
        const groups = positionsBySide(argument);
        const count = groups.reduce((total, group) => total + group.positions.length, 0);
        return (
          <tbody key={argument.id} data-now-row={argument.id} className={ROW}>
            {groups.flatMap((group, groupIndex) =>
              group.positions.map((position, index) => (
                <tr key={position.id} data-position={position.id}>
                  {groupIndex === 0 && index === 0 ? (
                    <th scope="rowgroup" rowSpan={count} className="text-left font-medium">
                      {argument.title}
                      <span className={cx(DIM, 'mt-1 block font-normal')}>{argument.question}</span>
                    </th>
                  ) : null}
                  {/* pl-3!: in a group's later rows this cell is the row's first
                      child, which booktabs would otherwise pull to the edge. */}
                  <td className="hidden pl-3! sm:table-cell">
                    <Speaker position={position} />
                    <span className={cx(DIM, 'mt-1 block')}>{group.side}</span>
                  </td>
                  <td>
                    <span className="mb-1 block sm:hidden">
                      <span className="font-medium">{position.person}</span>
                      <span className="text-text-dim">, {group.side}</span>
                    </span>
                    <Quote position={position} />
                  </td>
                </tr>
              )),
            )}
          </tbody>
        );
      })}
    </NowTable>
  );
}

function GapSide({ gap, side }: { gap: DeliveryGap; side: 'promised' | 'delivered' }) {
  const entry = gap[side];
  const date = side === 'promised' ? gap.promised.said : gap.delivered.asOf;
  const showValue = entry.value !== null || entry.countKind !== 'milestone';
  return (
    <>
      {showValue ? (
        <span className="block">
          <span className="text-text-dim">{entry.countKind}: </span>
          <span className={cx('font-mono tabular-nums', entry.value === null ? 'text-text-dim' : 'text-text')}>
            {formatGapValue(gap, side)}
          </span>
        </span>
      ) : null}
      <span className="block">{entry.what}</span>
      <span className={cx(DIM, 'mt-1 block')}>
        <SourceLink url={entry.sourceUrl} title={entry.sourceTitle} />
        {', '}
        <DateText iso={date} className="text-text-dim" />
        <Reported when={entry.sourceType === 'reported'} />
      </span>
    </>
  );
}

/** "Announced against delivered": who, the promise, what is delivered and as of when, each with its source. */
export function GapsTable({ rows, labelledBy }: { rows: readonly DeliveryGap[]; labelledBy: string }) {
  return (
    <NowTable labelledBy={labelledBy} minWidth={PHONE_MIN_WIDTH} note={rows.some(gapReported)}>
      <thead>
        <tr>
          <th scope="col" className={cx(HEAD, PINNED, 'w-[7.5rem] sm:w-[11rem]')}>Who</th>
          <th scope="col" className={cx(HEAD, PHONE_COLUMN)}>Announced</th>
          <th scope="col" className={cx(HEAD, PHONE_COLUMN)}>Delivered</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((gap) => (
          <tr key={gap.id} data-now-row={gap.id} className={ROW}>
            <th scope="row" className={cx(PINNED, 'text-left font-medium')}>
              {gap.who}
              <span className={cx(DIM, 'mt-1 block font-normal')}>{gap.unit}</span>
            </th>
            <td>
              <GapSide gap={gap} side="promised" />
            </td>
            <td>
              <GapSide gap={gap} side="delivered" />
            </td>
          </tr>
        ))}
      </tbody>
    </NowTable>
  );
}
