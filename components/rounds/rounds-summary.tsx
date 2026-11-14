import {
  contextSentence,
  coverageText,
  formatTotalUsd,
  headlineFacts,
  headlineText,
  monthCells,
  pageContext,
} from '@/lib/rounds-page';
import { formatUsd } from '@/lib/market-map';
import { Mark, SourceLink } from './rounds-cells';

/**
 * The rounds page's totals: the strict total it leads with, the full total
 * beside it, the counts and coverage under them, the month row, and the two
 * tracker counts. All computed in lib/rounds-page.ts.
 */

export function RoundsHeadline() {
  const facts = headlineFacts();
  const text = headlineText(facts);
  return (
    <div data-testid="rounds-headline" className="mt-10 max-w-[48rem]">
      <dl className="grid gap-x-12 gap-y-5 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div>
          <dt className="sr-only">Raised, borderline rows left out</dt>
          <dd data-total="strict" className="font-mono text-[40px] leading-none tabular-nums text-text">
            {formatTotalUsd(facts.strictUsd)}
          </dd>
          <dd className="mt-2 max-w-[22rem] font-sans text-[14px] leading-[1.5] text-text-dim">{text.strict}</dd>
        </div>
        <div>
          <dt className="sr-only">Raised, all closed rounds</dt>
          <dd data-total="full" className="font-mono text-[24px] leading-[40px] tabular-nums text-text">
            {formatTotalUsd(facts.fullUsd)}
          </dd>
          <dd className="mt-2 max-w-[22rem] font-sans text-[14px] leading-[1.5] text-text-dim">{text.full}</dd>
        </div>
      </dl>
      <p className="mt-6 max-w-[40rem] font-sans text-[15px] leading-[1.6] text-text">
        {text.reported} {coverageText()}
      </p>
    </div>
  );
}

export function MonthRow() {
  const cells = monthCells();
  return (
    <ol className="mt-6 grid max-w-[48rem] grid-cols-3 gap-x-4 gap-y-5 border-t border-border sm:grid-cols-5">
      {cells.map((cell) => (
        <li key={cell.month} data-month={cell.month} className="min-w-0 pt-3">
          <div className="font-sans text-[13px] leading-5 text-text">{cell.name.replace(/ \d{4}$/, '')}</div>
          <div className="font-sans text-[12px] leading-4 text-text-dim">{cell.span ?? ' '}</div>
          <div data-month-usd="" className="mt-2 font-mono text-[16px] leading-6 tabular-nums text-text">
            {formatUsd(cell.usd)}
          </div>
          <div className="font-sans text-[12px] leading-4 text-text-dim">
            {`${cell.rounds} ${cell.rounds === 1 ? 'round' : 'rounds'}`}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ContextLines() {
  return (
    <div className="mt-8 max-w-[40rem]">
      <p className="font-sans text-[14px] leading-[1.6] text-text-dim">Trackers that count more widely, for scale:</p>
      <ul className="mt-2 space-y-2">
        {pageContext().map((context) => (
          <li key={context.key} data-context={context.key} className="font-sans text-[14px] leading-[1.6] text-text">
            {contextSentence(context)}{' '}
            <span className="whitespace-nowrap text-[13px]">
              <SourceLink url={context.sourceUrl} title={context.sourceTitle} />
              {context.sourceType === 'reported' ? <Mark>reported</Mark> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
