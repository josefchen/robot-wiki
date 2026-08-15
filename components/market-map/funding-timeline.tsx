'use client';

import { useMemo, useState } from 'react';
import type { Company } from '@/data/schemas/company.ts';
import {
  formatShortDate,
  formatUsd,
  timelineEvents,
  unknownFigure,
  type TimelineEvent,
} from '@/lib/market-map';
import { cx } from '@/lib/utils';

type FundingTimelineProps = {
  companies: readonly Company[];
  /** Company id from a #company-<id> deep link, if any. */
  highlightedId?: string | null;
};

export function FundingTimeline({
  companies,
  highlightedId = null,
}: FundingTimelineProps) {
  const events = useMemo(() => timelineEvents(companies), [companies]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <p className="mt-6 font-sans text-sm text-text-dim">
        No 2023-2026 rounds in the current set.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <p className="font-sans text-sm text-text-dim">
        Funding and listing events from 2023 to 2026. Each amount carries the
        source date it was recorded against.
      </p>
      <ol className="mt-4 space-y-0">
        {events.map((event) => {
          const active = selectedId === event.id;
          const highlighted = highlightedId === event.companyId;
          return (
            <li
              key={event.id}
              data-timeline-id={event.id}
              data-company-id={event.companyId}
              id={`company-${event.companyId}`}
              className={cx(
                'border-t border-border',
                highlighted && !active
                  ? 'bg-surface-2 shadow-[inset_2px_0_0_0_var(--color-accent)]'
                  : '',
              )}
            >
              <button
                type="button"
                aria-expanded={active}
                onClick={() =>
                  setSelectedId((current) =>
                    current === event.id ? null : event.id,
                  )
                }
                className={cx(
                  'flex w-full cursor-pointer flex-col gap-1 py-3 text-left sm:flex-row sm:items-baseline sm:justify-between sm:gap-6',
                  active ? 'text-text' : 'text-text-dim hover:text-text',
                )}
              >
                <span className="font-mono text-xs text-text-dim">
                  {formatShortDate(event.date)}
                </span>
                <span className="min-w-0 flex-1 font-sans text-sm text-text">
                  {event.companyName}
                  {event.type ? (
                    <span className="ml-2 text-text-dim">{event.type}</span>
                  ) : null}
                </span>
                <span className="font-mono text-xs tabular-nums">
                  {event.amountUsd === null
                    ? unknownFigure()
                    : formatUsd(event.amountUsd)}
                  {event.valuationUsd !== null
                    ? ` at ${formatUsd(event.valuationUsd)}`
                    : ''}
                </span>
              </button>
              {active ? <EventDetail event={event} /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
function EventDetail({ event }: { event: TimelineEvent }) {
  return (
    <div
      data-timeline-detail
      className="pb-3 pl-0 text-sm sm:pl-[7.5rem]"
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-text-dim">Amount</dt>
        <dd>
          {event.amountUsd === null ? (
            <span className="text-text-dim">{unknownFigure()}</span>
          ) : (
            <span className="font-mono tabular-nums">
              {formatUsd(event.amountUsd)}
            </span>
          )}
        </dd>
        <dt className="text-text-dim">Valuation</dt>
        <dd>
          {event.valuationUsd === null ? (
            <span className="text-text-dim">{unknownFigure()}</span>
          ) : (
            <span className="font-mono tabular-nums">
              {formatUsd(event.valuationUsd)}
            </span>
          )}
        </dd>
        <dt className="text-text-dim">Investors</dt>
        <dd>
          {event.leadInvestors.length > 0 ? (
            event.leadInvestors.join(', ')
          ) : (
            <span className="text-text-dim">{unknownFigure()}</span>
          )}
        </dd>
        <dt className="text-text-dim">As of</dt>
        <dd>{formatShortDate(event.asOf)}</dd>
        <dt className="text-text-dim">Source</dt>
        <dd>
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener"
            className="text-text underline decoration-border underline-offset-2 hover:decoration-accent"
          >
            {event.sourceTitle}
          </a>
        </dd>
      </dl>
    </div>
  );
}
